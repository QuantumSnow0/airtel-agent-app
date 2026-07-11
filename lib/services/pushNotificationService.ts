/**
 * Lead-offer alert delivery (v1).
 *
 * Three layers — do not rely on push alone:
 *   1. Supabase Realtime (`lead_offers` INSERT) → modal + in-app sound (primary, app open)
 *   2. Supabase Realtime (`notifications` INSERT) → backup OS banner + sound (app background)
 *   3. Expo push webhook → backup when realtime socket is down / app killed
 *
 * Foreground: modal + playLeadOfferAlert() — no duplicate OS banner.
 * Background: dedicated Android channel `wam_lead_offers` with custom sound.
 */

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AppState, Linking, Platform } from "react-native";
import { supabase } from "../supabase";
import {
  extractOfferIdFromPushData,
  isLeadOfferNotificationData,
  promptLeadOfferModal,
} from "../dispatch/leadOfferBridge";
import { LEAD_OFFER_SOUND_FILENAME } from "../config/leadAlertConfig";
import {
  formatNotificationDisplay,
  mapDbNotification,
} from "../notifications/presentation";

/** Bundled via expo-notifications plugin `sounds` in app.json. */
export const LEAD_OFFER_SOUND = LEAD_OFFER_SOUND_FILENAME;

/** True when running inside Expo Go (push token fetch often hangs or is unsupported). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export type NotificationPermissionState = "granted" | "denied" | "undetermined";

/** General alerts: payments, registrations, account updates. */
export const ANDROID_NOTIFICATION_CHANNEL_ID = "wam_alerts";

/** Urgent lead offers — custom sound, max importance. */
export const ANDROID_LEAD_OFFER_CHANNEL_ID = "wam_lead_offers";

const presentedNotificationIds = new Set<string>();
const PRESENTED_NOTIFICATION_TTL_MS = 120_000;

function rememberPresentedNotification(id: string): void {
  presentedNotificationIds.add(id);
  setTimeout(() => presentedNotificationIds.delete(id), PRESENTED_NOTIFICATION_TTL_MS);
}

export function markNotificationAsPresented(id: string): void {
  rememberPresentedNotification(id);
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as
      | Record<string, unknown>
      | undefined;
    const isLeadOffer = isLeadOfferNotificationData(data);

    return {
      shouldShowAlert: !isLeadOffer,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: !isLeadOffer,
      shouldShowList: !isLeadOffer,
    };
  },
});

export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
    name: "Alerts",
    description: "Payments, registrations, and account updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0066CC",
    sound: "default",
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureAndroidLeadOfferChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_LEAD_OFFER_CHANNEL_ID, {
    name: "Lead offers",
    description: "Urgent new customer lead alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400, 200, 600],
    lightColor: "#E53935",
    sound: LEAD_OFFER_SOUND,
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });
}

export async function ensureAllNotificationChannels(): Promise<void> {
  await ensureAndroidNotificationChannel();
  await ensureAndroidLeadOfferChannel();
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

export async function enableNotificationsForAgent(
  agentId?: string,
): Promise<"granted" | "denied" | "settings_opened"> {
  await ensureAllNotificationChannels();

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

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await ensureAllNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

export async function getDeviceToken(timeoutMs = 12_000): Promise<string | null> {
  if (isExpoGo()) {
    return null;
  }

  try {
    await ensureAllNotificationChannels();

    const projectId = "79ca40ff-774f-4322-bf65-0adc31b78223";
    const tokenPromise = Notifications.getExpoPushTokenAsync({ projectId });
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const tokenData = await Promise.race([tokenPromise, timeoutPromise]);
    if (!tokenData) return null;
    return tokenData.data;
  } catch (error) {
    console.error("Error getting device token:", error);
    return null;
  }
}

export async function registerDeviceToken(
  agentId: string,
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceType = Platform.OS === "ios" ? "ios" : "android";

    const { data: existingToken, error: fetchError } = await supabase
      .from("device_tokens")
      .select("id, agent_id")
      .eq("token", token)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking existing token:", fetchError);
    }

    if (existingToken) {
      if (existingToken.agent_id !== agentId) {
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
          return { success: false, error: updateError.message };
        }
      } else {
        const { error: updateError } = await supabase
          .from("device_tokens")
          .update({
            last_used_at: new Date().toISOString(),
            is_active: true,
          })
          .eq("id", existingToken.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }
      }
    } else {
      const { error: insertError } = await supabase
        .from("device_tokens")
        .insert({
          agent_id: agentId,
          token,
          device_type: deviceType,
          is_active: true,
        });

      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function unregisterDeviceToken(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("device_tokens")
      .update({ is_active: false })
      .eq("token", token);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

export type AgentNotificationRecord = {
  id: string;
  title: string;
  message: string;
  type?: string;
  related_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function isLeadOfferRecord(record: AgentNotificationRecord): boolean {
  return record.type === "LEAD_OFFER";
}

async function scheduleOsNotification(
  record: AgentNotificationRecord,
  options: { channelId: string; sound: string },
): Promise<void> {
  if (!record.id || presentedNotificationIds.has(record.id)) return;

  const permission = await getNotificationPermissionState();
  if (permission !== "granted") return;

  rememberPresentedNotification(record.id);
  await ensureAllNotificationChannels();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: record.title,
      body: record.message,
      sound: options.sound,
      data: {
        type: record.type,
        notificationId: record.id,
        relatedId: record.related_id ?? undefined,
        metadata: record.metadata ?? {},
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === "android" ? { channelId: options.channelId } : {}),
    },
    trigger:
      Platform.OS === "android"
        ? { channelId: options.channelId }
        : null,
  });
}

export async function presentLeadOfferNotification(
  record: AgentNotificationRecord,
): Promise<void> {
  const mapped = mapDbNotification({
    id: record.id,
    type: record.type ?? "LEAD_OFFER",
    title: record.title,
    message: record.message,
    is_read: true,
    created_at: new Date().toISOString(),
    related_id: record.related_id,
    metadata: record.metadata,
  });
  const display = formatNotificationDisplay(mapped);

  await scheduleOsNotification(
    {
      ...record,
      title: display.title,
      message: display.message,
    },
    {
      channelId: ANDROID_LEAD_OFFER_CHANNEL_ID,
      sound: LEAD_OFFER_SOUND,
    },
  );
}

/** Re-ping while offer is pending and app is in background (not deduped). */
export async function presentLeadOfferReminder(offerId: string): Promise<void> {
  const permission = await getNotificationPermissionState();
  if (permission !== "granted") return;

  await ensureAllNotificationChannels();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Lead offer waiting",
      body: "Still waiting for your response — accept or decline before it expires.",
      sound: LEAD_OFFER_SOUND,
      data: {
        type: "LEAD_OFFER",
        metadata: { offerId },
      },
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === "android"
        ? { channelId: ANDROID_LEAD_OFFER_CHANNEL_ID }
        : {}),
    },
    trigger:
      Platform.OS === "android"
        ? { channelId: ANDROID_LEAD_OFFER_CHANNEL_ID }
        : null,
  });
}

export async function presentLocalNotification(
  record: AgentNotificationRecord,
): Promise<void> {
  await scheduleOsNotification(record, {
    channelId: ANDROID_NOTIFICATION_CHANNEL_ID,
    sound: "default",
  });
}

let notificationAlertsChannel: ReturnType<typeof supabase.channel> | null = null;

export function subscribeToNotificationAlerts(agentId: string): void {
  if (notificationAlertsChannel) {
    supabase.removeChannel(notificationAlertsChannel);
    notificationAlertsChannel = null;
  }

  notificationAlertsChannel = supabase
    .channel(`agent-notification-alerts-${agentId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `agent_id=eq.${agentId}`,
      },
      (payload) => {
        const record = payload.new as AgentNotificationRecord | null;
        if (!record?.id) return;

        if (isLeadOfferRecord(record)) {
          const offerId =
            record.metadata && typeof record.metadata === "object"
              ? String((record.metadata as { offerId?: string }).offerId ?? "")
              : "";

          promptLeadOfferModal(offerId || null);

          if (AppState.currentState === "active") {
            return;
          }

          void presentLeadOfferNotification(record);
          return;
        }

        void presentLocalNotification(record);
      },
    )
    .subscribe();
}

export function unsubscribeFromNotificationAlerts(): void {
  if (notificationAlertsChannel) {
    supabase.removeChannel(notificationAlertsChannel);
    notificationAlertsChannel = null;
  }
}

export async function activateAgentNotifications(agentId: string): Promise<void> {
  subscribeToNotificationAlerts(agentId);

  const permission = await getNotificationPermissionState();
  if (permission !== "granted" || isExpoGo()) return;

  const token = await getDeviceToken();
  if (token) {
    await registerDeviceToken(agentId, token);
  }
}

let notificationListenersCleanup: (() => void) | null = null;

export function ensureNotificationListeners(
  onNotificationTapped: (response: Notifications.NotificationResponse) => void,
): void {
  if (notificationListenersCleanup) return;

  notificationListenersCleanup = setupNotificationListeners(
    (notification) => {
      const data = notification.request.content.data as
        | Record<string, unknown>
        | undefined;

      if (isLeadOfferNotificationData(data)) {
        promptLeadOfferModal(extractOfferIdFromPushData(data));
      }

      const notificationId = data?.notificationId;
      if (typeof notificationId === "string") {
        markNotificationAsPresented(notificationId);
      }
    },
    onNotificationTapped,
  );
}

export function teardownNotificationListeners(): void {
  notificationListenersCleanup?.();
  notificationListenersCleanup = null;
}

export function setupNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationTapped: (response: Notifications.NotificationResponse) => void,
) {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      onNotificationReceived(notification);
    },
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      onNotificationTapped(response);
    });

  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.error("Error getting last notification response:", error);
    return null;
  }
}
