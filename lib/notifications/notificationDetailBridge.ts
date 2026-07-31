/**
 * Bridges notification opens → NotificationDetailModal (custom sheet).
 */

import type { AppNotification } from "./types";

export type NotificationDetailPayload = {
  title: string;
  message: string;
  typeLabel?: string;
  accent?: string;
  softBg?: string;
  actionUrl?: string | null;
  createdAt?: string;
};

export type NotificationDetailHandler = (
  payload: NotificationDetailPayload,
) => void;

const handlers = new Set<NotificationDetailHandler>();
let pending: NotificationDetailPayload | null = null;

export function subscribeToNotificationDetail(
  handler: NotificationDetailHandler,
): () => void {
  handlers.add(handler);
  if (pending) {
    const payload = pending;
    pending = null;
    try {
      handler(payload);
    } catch (e) {
      console.warn("notificationDetailBridge pending error:", e);
    }
  }
  return () => handlers.delete(handler);
}

export function promptNotificationDetail(
  payload: NotificationDetailPayload,
): void {
  if (handlers.size === 0) {
    pending = payload;
    return;
  }
  for (const handler of handlers) {
    try {
      handler(payload);
    } catch (e) {
      console.warn("notificationDetailBridge handler error:", e);
    }
  }
}

export function promptNotificationDetailFromApp(
  notification: AppNotification,
  extras?: {
    typeLabel?: string;
    accent?: string;
    softBg?: string;
    actionUrl?: string | null;
  },
): void {
  promptNotificationDetail({
    title: notification.title || "Notification",
    message: notification.message || "",
    typeLabel: extras?.typeLabel,
    accent: extras?.accent,
    softBg: extras?.softBg,
    actionUrl: extras?.actionUrl ?? null,
    createdAt: notification.createdAt,
  });
}
