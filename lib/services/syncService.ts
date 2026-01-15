import { supabase } from "../supabase";
import {
  getPendingRegistrations,
  updatePendingRegistrationStatus,
  deletePendingRegistration,
  PendingRegistration,
} from "./offlineStorage";
import { registerCustomerToMSForms } from "./msFormsService";
import { createSyncFailureNotification } from "./notificationService";

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Check if device is online
 * Uses timeout to prevent hanging when offline
 */
export async function isOnline(): Promise<boolean> {
  try {
    // Create a timeout promise (2 seconds max)
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 2000);
    });

    // Try a simple query to Supabase to check connectivity
    const queryPromise = supabase
      .from("agents")
      .select("id")
      .limit(1)
      .then(({ error }) => !error)
      .catch(() => false);

    // Race between query and timeout
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    return false;
  }
}

/**
 * Sync a single pending registration
 */
async function syncSingleRegistration(
  registration: PendingRegistration
): Promise<boolean> {
  try {
    console.log(`🔄 Syncing registration: ${registration.id}`);

    // Update status to syncing
    await updatePendingRegistrationStatus(registration.id, "syncing");

    // Step 1: Save to Supabase database
    const { data: dbRegistration, error: dbError } = await supabase
      .from("customer_registrations")
      .insert({
        agent_id: registration.agent_id,
        customer_name: registration.customerData.customerName,
        airtel_number: registration.customerData.airtelNumber,
        alternate_number: registration.customerData.alternateNumber,
        email: registration.customerData.email,
        preferred_package: registration.customerData.preferredPackage,
        installation_town: registration.customerData.installationTown,
        delivery_landmark: registration.customerData.deliveryLandmark,
        installation_location: registration.customerData.installationLocation,
        visit_date: registration.customerData.visitDate,
        visit_time: registration.customerData.visitTime,
        status: "pending",
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Step 2: Submit to Microsoft Forms
    const msFormsResult = await registerCustomerToMSForms(
      registration.customerData,
      registration.agentData
    );

    if (msFormsResult.success && msFormsResult.responseId) {
      // Update database with MS Forms response ID
      const responseIdString = String(msFormsResult.responseId);
      const submittedAt = new Date().toISOString();
      
      console.log(`🔄 Updating Supabase for registration ${dbRegistration.id}`);
      console.log(`   Response ID: ${responseIdString}`);
      console.log(`   Submitted At: ${submittedAt}`);
      
      const { data: updatedData, error: updateError } = await supabase
        .from("customer_registrations")
        .update({
          ms_forms_response_id: responseIdString,
          ms_forms_submitted_at: submittedAt,
        })
        .eq("id", dbRegistration.id)
        .select(); // Return updated data to verify

      if (updateError) {
        console.error("❌ Error updating MS Forms response ID:", updateError);
        console.error("   Error code:", updateError.code);
        console.error("   Error message:", updateError.message);
        throw new Error(`Failed to update database: ${updateError.message}`);
      }

      if (!updatedData || updatedData.length === 0) {
        console.error("❌ No rows updated - check RLS policies or registration ID");
        throw new Error("Failed to update registration - no rows affected. Check RLS policies.");
      }

      console.log("✅ Successfully updated database:");
      console.log(`   ms_forms_response_id: ${updatedData[0].ms_forms_response_id}`);
      console.log(`   ms_forms_submitted_at: ${updatedData[0].ms_forms_submitted_at}`);

      // Mark as synced and delete from pending
      await deletePendingRegistration(registration.id);
      console.log(`✅ Successfully synced registration: ${registration.id}`);
      return true;
    } else {
      throw new Error(
        msFormsResult.error || "Microsoft Forms submission failed"
      );
    }
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error";
    console.error(`❌ Failed to sync registration ${registration.id}:`, errorMessage);

    // Create SYNC_FAILURE notification
    // Only create notification if this is a final failure (after retries) or first failure
    if (registration.retry_count >= 2) {
      // Final failure - create notification
      await createSyncFailureNotification(
        registration.agent_id,
        registration.customerData.customerName,
        dbRegistration?.id,
        errorMessage
      );
    }

    // Update status to failed if retry count < 3
    if (registration.retry_count < 3) {
      await updatePendingRegistrationStatus(
        registration.id,
        "failed",
        errorMessage
      );
    } else {
      // After 3 retries, keep it as failed but don't retry automatically
      await updatePendingRegistrationStatus(
        registration.id,
        "failed",
        `Max retries reached: ${errorMessage}`
      );
    }

    return false;
  }
}

/**
 * Sync all pending registrations
 */
export async function syncPendingRegistrations(
  agentId?: string,
  onProgress?: (current: number, total: number) => void,
  onComplete?: (result: SyncResult) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Check if online
    const online = await isOnline();
    if (!online) {
      console.log("📴 Device is offline, skipping sync");
      result.success = false;
      result.errors.push("Device is offline");
      return result;
    }

    // Get pending registrations (with error handling for database issues)
    let pending: PendingRegistration[] = [];
    try {
      pending = await getPendingRegistrations(agentId);
    } catch (error) {
      console.warn("⚠️ Could not get pending registrations:", error);
      // Return empty result if we can't access offline storage
      return result;
    }
    console.log(`🔄 Found ${pending.length} pending registrations to sync`);

    if (pending.length === 0) {
      return result;
    }

    const total = pending.length;

    // Sync each registration sequentially (to avoid overwhelming the server)
    for (let i = 0; i < pending.length; i++) {
      const registration = pending[i];
      onProgress?.(i + 1, total);
      
      const success = await syncSingleRegistration(registration);
      if (success) {
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(
          `Registration ${registration.id}: ${registration.error || "Unknown error"}`
        );
      }

      // Small delay between syncs to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `✅ Sync complete: ${result.synced} synced, ${result.failed} failed`
    );

    // Call onComplete callback if provided
    if (onComplete) {
      onComplete(result);
    }

    return result;
  } catch (error: any) {
    console.error("❌ Error during sync:", error);
    result.success = false;
    result.errors.push(error.message || "Unknown error");
    // Call onComplete even on error
    if (onComplete) {
      onComplete(result);
    }
    return result;
  }
}

/**
 * Sync a single registration from Supabase to MS Forms
 * Used for manual sync of registrations that are already in Supabase
 */
export async function syncRegistrationFromSupabase(
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Syncing registration from Supabase: ${registrationId}`);

    // Check if online
    const online = await isOnline();
    if (!online) {
      return { success: false, error: "Device is offline" };
    }

    // Fetch registration from Supabase
    const { data: registration, error: fetchError } = await supabase
      .from("customer_registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (fetchError || !registration) {
      return { success: false, error: fetchError?.message || "Registration not found" };
    }

    // Check if already synced
    if (registration.ms_forms_response_id) {
      return { success: true }; // Already synced
    }

    // Fetch agent data
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("name, airtel_phone, safaricom_phone")
      .eq("id", registration.agent_id)
      .single();

    if (agentError || !agent) {
      console.error("Agent fetch error:", agentError);
      return { success: false, error: `Agent data not found: ${agentError?.message || "Unknown error"}` };
    }

    // Prepare customer data for MS Forms
    const customerData = {
      customerName: registration.customer_name,
      airtelNumber: registration.airtel_number,
      alternateNumber: registration.alternate_number || "",
      email: registration.email || "",
      preferredPackage: registration.preferred_package || "",
      installationTown: registration.installation_town || "",
      deliveryLandmark: registration.delivery_landmark || "",
      installationLocation: registration.installation_location || "",
      visitDate: registration.visit_date || "",
      visitTime: registration.visit_time || "",
    };

    // Use airtel_phone or safaricom_phone as mobile (same as register-customer.tsx)
    const agentData = {
      name: agent.name,
      mobile: agent.airtel_phone || agent.safaricom_phone || "",
    };

    if (!agentData.mobile) {
      return { success: false, error: "Agent phone number not found" };
    }

    // Submit to MS Forms
    const { registerCustomerToMSForms } = await import("./msFormsService");
    const msFormsResult = await registerCustomerToMSForms(customerData, agentData);

    console.log("📋 MS Forms Result:", {
      success: msFormsResult.success,
      responseId: msFormsResult.responseId,
      error: msFormsResult.error,
    });

    if (msFormsResult.success && msFormsResult.responseId) {
      // Update Supabase with MS Forms response ID
      console.log(`🔄 Updating Supabase for registration ${registrationId} with response ID: ${msFormsResult.responseId}`);
      
      const { data: updatedData, error: updateError } = await supabase
        .from("customer_registrations")
        .update({
          ms_forms_response_id: msFormsResult.responseId.toString(), // Ensure it's a string
          ms_forms_submitted_at: new Date().toISOString(),
        })
        .eq("id", registrationId)
        .select(); // Return updated data to verify

      if (updateError) {
        console.error("❌ Error updating MS Forms response ID:", updateError);
        console.error("Update error details:", JSON.stringify(updateError, null, 2));
        return { success: false, error: updateError.message };
      }

      if (!updatedData || updatedData.length === 0) {
        console.error("❌ No rows updated - registration might not exist or RLS policy blocking");
        return { success: false, error: "Failed to update registration - no rows affected" };
      }

      console.log(`✅ Successfully synced registration: ${registrationId}`);
      console.log("✅ Updated data:", updatedData[0]);
      return { success: true };
    } else {
      console.error("❌ MS Forms submission failed:", msFormsResult.error);
      
      // Create SYNC_FAILURE notification
      await createSyncFailureNotification(
        registration.agent_id,
        registration.customer_name,
        registrationId,
        msFormsResult.error || "Microsoft Forms submission failed"
      );
      
      return {
        success: false,
        error: msFormsResult.error || "Microsoft Forms submission failed",
      };
    }
  } catch (error: any) {
    console.error(`❌ Failed to sync registration ${registrationId}:`, error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Sync all unsynced registrations for an agent
 */
export async function syncAllUnsyncedRegistrations(
  agentId: string,
  onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Check if online
    const online = await isOnline();
    if (!online) {
      result.success = false;
      result.errors.push("Device is offline");
      return result;
    }

    // Fetch all unsynced registrations
    const { data: registrations, error } = await supabase
      .from("customer_registrations")
      .select("id")
      .eq("agent_id", agentId)
      .is("ms_forms_response_id", null)
      .order("created_at", { ascending: false });

    if (error) {
      result.success = false;
      result.errors.push(error.message);
      return result;
    }

    if (!registrations || registrations.length === 0) {
      return result; // No unsynced registrations
    }

    console.log(`🔄 Found ${registrations.length} unsynced registrations`);

    const total = registrations.length;

    // Sync each registration
    for (let i = 0; i < registrations.length; i++) {
      const reg = registrations[i];
      onProgress?.(i + 1, total);
      
      const syncResult = await syncRegistrationFromSupabase(reg.id);
      if (syncResult.success) {
        result.synced++;
      } else {
        result.failed++;
        result.errors.push(`Registration ${reg.id}: ${syncResult.error || "Unknown error"}`);
      }

      // Small delay between syncs
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `✅ Sync complete: ${result.synced} synced, ${result.failed} failed`
    );

    return result;
  } catch (error: any) {
    console.error("❌ Error during sync:", error);
    result.success = false;
    result.errors.push(error.message || "Unknown error");
    return result;
  }
}

/**
 * Auto-sync when app comes online
 */
export function setupAutoSync(
  agentId?: string,
  onProgress?: (current: number, total: number) => void,
  onComplete?: (result: SyncResult) => void
): () => void {
  let syncInterval: NodeJS.Timeout | null = null;
  let isSyncing = false;

  const performSync = async () => {
    if (isSyncing) return;
    
    const online = await isOnline();
    if (!online) return;

    isSyncing = true;
    try {
      await syncPendingRegistrations(agentId, onProgress, onComplete);
    } catch (error) {
      console.error("Error in auto-sync:", error);
    } finally {
      isSyncing = false;
    }
  };

  // Sync immediately when setup
  performSync();

  // Then sync every 30 seconds when online
  syncInterval = setInterval(performSync, 30000);

  // Return cleanup function
  return () => {
    if (syncInterval) {
      clearInterval(syncInterval);
    }
  };
}

