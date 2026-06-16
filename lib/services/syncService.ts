import { supabase } from "../supabase";
import {
  getPendingRegistrations,
  updatePendingRegistrationStatus,
  deletePendingRegistration,
  PendingRegistration,
} from "./offlineStorage";
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
  let savedRegistrationId: string | undefined;

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
        units_required: registration.customerData.unitsRequired ?? 1,
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

    savedRegistrationId = dbRegistration?.id;

    await deletePendingRegistration(registration.id);
    console.log(`✅ Successfully synced registration to cloud: ${registration.id}`);
    return true;
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
        savedRegistrationId,
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
 * Confirm a registration is saved in Supabase (cloud sync).
 * MS Forms submission is handled by super admin — not from the agent app.
 */
export async function syncRegistrationFromSupabase(
  registrationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const online = await isOnline();
    if (!online) {
      return { success: false, error: "Device is offline" };
    }

    const { data: registration, error: fetchError } = await supabase
      .from("customer_registrations")
      .select("id")
      .eq("id", registrationId)
      .maybeSingle();

    if (fetchError || !registration) {
      return { success: false, error: fetchError?.message || "Registration not found" };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Sync all unsynced registrations for an agent
 */
/** MS Forms sync is super-admin only; agents only sync offline → cloud. */
export async function syncAllUnsyncedRegistrations(
  _agentId: string,
  _onProgress?: (current: number, total: number) => void
): Promise<SyncResult> {
  return { success: true, synced: 0, failed: 0, errors: [] };
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

