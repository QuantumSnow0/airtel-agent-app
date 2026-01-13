import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../supabase";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and return status
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Get the device push notification token
 */
export async function getDeviceToken(): Promise<string | null> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "4de293ef-2f4e-4ac6-8b8a-ae84514dc103", // From app.json
    });
    return tokenData.data;
  } catch (error) {
    console.error("Error getting device token:", error);
    return null;
  }
}

/**
 * Register or update device token in database
 */
export async function registerDeviceToken(
  agentId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get device type
    const deviceType = Platform.OS === "ios" ? "ios" : "android";

    // Check if token already exists
    const { data: existingToken, error: fetchError } = await supabase
      .from("device_tokens")
      .select("id, agent_id")
      .eq("token", token)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error checking existing token:", fetchError);
    }

    if (existingToken) {
      // Token exists - update it
      if (existingToken.agent_id !== agentId) {
        // Token belongs to different agent - update agent_id
        const { error: updateError } = await supabase
          .from("device_tokens")
          .update({
            agent_id: agentId,
            device_type: deviceType,
            is_active: true,
            last_used_at: new Date().toISOString(),
          })
          .eq("id", existingToken.id);

        if (updateError) {
          console.error("Error updating device token:", updateError);
          return { success: false, error: updateError.message };
        }
      } else {
        // Token belongs to same agent - just update last_used_at
        const { error: updateError } = await supabase
          .from("device_tokens")
          .update({
            last_used_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", existingToken.id);

        if (updateError) {
          console.error("Error updating device token:", updateError);
          return { success: false, error: updateError.message };
        }
      }
    } else {
      // Token doesn't exist - insert new
      const { error: insertError } = await supabase
        .from("device_tokens")
        .insert({
          agent_id: agentId,
          token,
          device_type: deviceType,
          is_active: true,
        });

      if (insertError) {
        console.error("Error inserting device token:", insertError);
        return { success: false, error: insertError.message };
      }
    }

    console.log("✅ Device token registered successfully");
    return { success: true };
  } catch (error: any) {
    console.error("Error registering device token:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Unregister device token (when user logs out)
 */
export async function unregisterDeviceToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("device_tokens")
      .update({ is_active: false })
      .eq("token", token);

    if (error) {
      console.error("Error unregistering device token:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Error unregistering device token:", error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Setup notification listeners for foreground and background notifications
 */
export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (notification: Notifications.NotificationResponse) => void
) {
  // Listener for notifications received while app is in foreground
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("📬 Foreground notification received:", notification);
      onNotificationReceived(notification);
    }
  );

  // Listener for when user taps on a notification
  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("👆 Notification tapped:", response);
      onNotificationTapped(response);
    });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the last notification response (when app opened from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.error("Error getting last notification response:", error);
    return null;
  }
}

