import { isLeadOfferNotificationData } from "../dispatch/leadOfferBridge";

/** Pull LEAD_OFFER fields from FCM / TaskManager / notification payloads. */
export function extractLeadOfferPushData(
  taskData: unknown,
): Record<string, unknown> | null {
  if (!taskData || typeof taskData !== "object") return null;
  const root = taskData as Record<string, unknown>;
  if ("actionIdentifier" in root) return null;

  // TaskManager + RemoteMessage: { data: { type, title, message, ... }, notification, ... }
  const fcmData = root.data;
  if (fcmData && typeof fcmData === "object" && !Array.isArray(fcmData)) {
    const map = fcmData as Record<string, unknown>;
    if (isLeadOfferNotificationData(map)) return map;
    if (typeof map.dataString === "string") {
      try {
        const parsed = JSON.parse(map.dataString) as Record<string, unknown>;
        if (isLeadOfferNotificationData(parsed)) return parsed;
      } catch {
        // not JSON
      }
    }
  }

  if (isLeadOfferNotificationData(root)) return root;

  const notification = root.notification as Record<string, unknown> | undefined;
  const request = notification?.request as Record<string, unknown> | undefined;
  const content = request?.content as Record<string, unknown> | undefined;
  const contentData = content?.data as Record<string, unknown> | undefined;
  if (contentData && isLeadOfferNotificationData(contentData)) return contentData;

  return null;
}
