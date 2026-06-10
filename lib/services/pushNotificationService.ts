import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { supabase } from "../supabase";

/** True when running inside Expo Go (push token fetch often hangs or is unsupported). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

/** Must match `defaultChannel` in app.json and channelId in push payloads. */
export const ANDROID_NOTIFICATION_CHANNEL_ID = "default";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Android 8+ requires a high-importance channel for heads-up banners when the app is closed.
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: "General",
    description: "Payments, registrations, and account updates",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0066CC",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "granted";
    if (status === "denied") return "denied";
    return "undetermined";
  } catch {
    return "undetermined";
  }
}

/** Short steps for the device settings screen (shown in the enable prompt). */
export function getNotificationSettingsInstructions(): string {
  if (Platform.OS === "ios") {
    return "Go to Settings → WAM Apps → Notifications, then turn on Allow Notifications.";
  }
  return "Go to Settings → Apps → WAM Apps → Notifications, then allow notifications.";
}

async function registerDeviceTokenInBackground(agentId: string): Promise<void> {
  try {
    const token = await getDeviceToken();
    if (token) await registerDeviceToken(agentId, token);
  } catch (error) {
    console.warn("Background device token registration failed:", error);
  }
}

/**
 * Try the system permission dialog, or open app settings if already denied.
 * Registers the device token when permission is granted and agentId is provided.
 */
export async function enableNotificationsForAgent(
  agentId?: string
): Promise<"granted" | "denied" | "settings_opened"> {
  await ensureAndroidNotificationChannel();

  const state = await getNotificationPermissionState();
  if (state === "granted") {
    if (agentId && !isExpoGo()) {
      void registerDeviceTokenInBackground(agentId);
    }
    return "granted";
  }

  if (state === "undetermined") {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    if (status === "granted") {
      if (agentId && !isExpoGo()) {
        void registerDeviceTokenInBackground(agentId);
      }
      return "granted";
    }
    if (status === "denied") {
      await Linking.openSettings();
      return "settings_opened";
    }
    return "denied";
  }

  await Linking.openSettings();
  return "settings_opened";
}

/**
 * Request notification permissions and return status
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await ensureAndroidNotificationChannel();

    console.log("🔐 Checking existing notification permissions...");
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log("📊 Existing permission status:", existingStatus);
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("🔐 Requesting notification permissions...");
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      console.log("📊 New permission status:", status);
      finalStatus = status;
    }

    const granted = finalStatus === "granted";
    console.log("✅ Permission granted:", granted);
    return granted;
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
}

/**
 * Get the device push notification token
 */
export async function getDeviceToken(timeoutMs = 12_000): Promise<string | null> {
  if (isExpoGo()) {
    console.log("⚠️ Skipping push token in Expo Go — use a dev/production build to test push");
    return null;
  }

  try {
    await ensureAndroidNotificationChannel();

    console.log("📱 Getting Expo push token...");
    const projectId = "79ca40ff-774f-4322-bf65-0adc31b78223";
    const tokenPromise = Notifications.getExpoPushTokenAsync({ projectId });
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const tokenData = await Promise.race([tokenPromise, timeoutPromise]);
    if (!tokenData) {
      console.warn("⚠️ getExpoPushTokenAsync timed out or returned nothing");
      return null;
    }

    console.log("✅ Token obtained, length:", tokenData.data?.length || 0);
    return tokenData.data;
  } catch (error) {
    console.error("❌ Error getting device token:", error);
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



