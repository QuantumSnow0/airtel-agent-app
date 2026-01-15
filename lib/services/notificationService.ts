import { supabase } from "../supabase";

/**
 * Create a SYNC_FAILURE notification for an agent
 * This function creates a notification when a registration fails to sync to Microsoft Forms
 */
export async function createSyncFailureNotification(
  agentId: string,
  customerName: string,
  registrationId?: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create notification using the client
    // Note: This requires the RLS policy "Service role can insert notifications" to work
    // For now, we'll use the regular client - if this fails due to RLS, we'll need an Edge Function
    const { error } = await supabase.from("notifications").insert({
      agent_id: agentId,
      type: "SYNC_FAILURE",
      title: "Sync Failed",
      message: `Failed to sync registration for '${customerName}' to Microsoft Forms. ${errorMessage ? `Error: ${errorMessage}` : "Please try again."}`,
      related_id: registrationId || null,
      metadata: {
        customerName,
        error: errorMessage || "Unknown error",
        registrationId: registrationId || null,
      },
    });

    if (error) {
      console.error("Error creating sync failure notification:", error);
      // Don't throw - notification creation failure shouldn't break sync
      return { success: false, error: error.message };
    }

    console.log(`✅ Created SYNC_FAILURE notification for agent ${agentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error creating sync failure notification:", error);
    // Don't throw - notification creation failure shouldn't break sync
    return { success: false, error: error.message || "Unknown error" };
  }
}





