/**
 * Open notification actions: in-app routes or external links
 * (Teams, WhatsApp, https, etc.).
 */

import { Linking } from "react-native";
import type { Router } from "expo-router";
import { promptLeadOfferModal } from "../dispatch/leadOfferBridge";
import {
  promptNotificationDetail,
  promptNotificationDetailFromApp,
} from "./notificationDetailBridge";
import {
  getNotificationVisual,
  getNotificationVisualForType,
} from "./presentation";
import type { AppNotification, NotificationType } from "./types";

const URL_IN_TEXT =
  /(https?:\/\/[^\s<>"'）\]}]+|whatsapp:\/\/[^\s<>"']+|msteams:\/\/[^\s<>"']+)/i;

export function isAllowedExternalUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") return true;
    if (protocol === "whatsapp:" || protocol === "msteams:") return true;
    return false;
  } catch {
    return false;
  }
}

/** Prefer explicit metadata.actionUrl / url / link; else first URL in message. */
export function resolveNotificationActionUrl(
  metadata?: Record<string, unknown> | null,
  message?: string | null,
  options?: { allowMessageScan?: boolean },
): string | null {
  const candidates = [
    metadata?.actionUrl,
    metadata?.url,
    metadata?.link,
    metadata?.meetingUrl,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && isAllowedExternalUrl(value)) {
      return value.trim();
    }
  }

  if (options?.allowMessageScan !== false && message) {
    const match = message.match(URL_IN_TEXT);
    if (match?.[1] && isAllowedExternalUrl(match[1])) {
      return match[1].replace(/[.,;:!?)]+$/, "");
    }
  }

  return null;
}

export async function openExternalNotificationUrl(
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = url.trim();
  if (!isAllowedExternalUrl(trimmed)) {
    return { ok: false, error: "This link cannot be opened." };
  }

  try {
    await Linking.openURL(trimmed);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Could not open the link. Install Teams or WhatsApp if needed.",
    };
  }
}

type PushLike = {
  type?: string;
  title?: string | null;
  relatedId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  message?: string | null;
  carrier?: string | null;
  createdAt?: string;
};

function toPushLike(notification: AppNotification): PushLike {
  const isAnnouncement = notification.type === "SYSTEM_ANNOUNCEMENT";
  return {
    type: notification.type,
    title: notification.title,
    relatedId: notification.relatedId,
    actionUrl: resolveNotificationActionUrl(
      notification.metadata,
      notification.message,
      { allowMessageScan: isAnnouncement },
    ),
    metadata: notification.metadata,
    message: notification.message,
    createdAt: notification.createdAt,
  };
}

function showNotificationDetailSheet(
  data: PushLike,
  appNotification?: AppNotification,
  actionUrl?: string | null,
): void {
  if (appNotification) {
    const visual = getNotificationVisual(appNotification);
    promptNotificationDetailFromApp(appNotification, {
      typeLabel: visual.label,
      accent: visual.accent,
      softBg: visual.softBg,
      actionUrl: actionUrl ?? null,
    });
    return;
  }

  const visual = getNotificationVisualForType(String(data.type ?? ""));
  promptNotificationDetail({
    title: String(data.title || visual.label || "Notification"),
    message: String(data.message || "No additional details."),
    typeLabel: visual.label,
    accent: visual.accent,
    softBg: visual.softBg,
    actionUrl: actionUrl ?? null,
    createdAt: data.createdAt,
  });
}

/**
 * Handle a notification tap (list or push).
 * From the list, long copy opens in a custom sheet (with Open link when present).
 * From push, explicit action URLs still open immediately.
 */
export async function handleNotificationOpen(
  router: Router,
  input: AppNotification | PushLike,
  options?: { preferExternalLink?: boolean },
): Promise<void> {
  const preferExternal = options?.preferExternalLink !== false;
  const isAppNotification = "id" in input && "createdAt" in input;
  const appNotification = isAppNotification
    ? (input as AppNotification)
    : undefined;
  const data: PushLike = isAppNotification
    ? toPushLike(input as AppNotification)
    : (input as PushLike);

  const type = String(data.type ?? "") as NotificationType | string;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const actionUrl =
    (typeof data.actionUrl === "string" && data.actionUrl) ||
    resolveNotificationActionUrl(
      metadata,
      typeof data.message === "string" ? data.message : null,
      { allowMessageScan: type === "SYSTEM_ANNOUNCEMENT" },
    );

  // Push / shade: jump straight to external link when present.
  // List taps pass preferExternalLink: false so agents can read the full body first.
  if (preferExternal && actionUrl && type !== "SYSTEM_ANNOUNCEMENT") {
    const result = await openExternalNotificationUrl(actionUrl);
    if (!result.ok) {
      showNotificationDetailSheet(data, appNotification, actionUrl);
    }
    return;
  }

  // Announcements: leads-enabled activation → home (toggle), otherwise detail sheet.
  if (type === "SYSTEM_ANNOUNCEMENT") {
    const kind = String(metadata.kind ?? "").toLowerCase();
    if (kind === "leads_enabled" || metadata.deepLink === "dashboard") {
      router.push("/dashboard" as any);
      return;
    }
    showNotificationDetailSheet(data, appNotification, actionUrl);
    return;
  }

  switch (type) {
    case "REGISTRATION_STATUS_CHANGE":
      if (data.relatedId) {
        const carrier =
          data.carrier === "safaricom" || metadata.carrier === "safaricom"
            ? "safaricom"
            : "airtel";
        router.push(
          `/registration/${data.relatedId}?source=${carrier}` as any,
        );
      } else {
        router.push("/registrations" as any);
      }
      break;
    case "EARNINGS_UPDATE":
    case "PAYOUT_RECEIVED":
      router.push("/earnings-history" as any);
      break;
    case "ACCOUNT_STATUS_CHANGE":
      router.push("/dashboard" as any);
      break;
    case "SYNC_FAILURE":
      router.push("/registrations" as any);
      break;
    case "LEAD_OFFER": {
      const offerId = metadata.offerId ?? (data as { offerId?: string }).offerId;
      promptLeadOfferModal(offerId ? String(offerId) : null);
      break;
    }
    case "LEAD_OVERDUE":
    case "LEAD_INSTALLED":
    case "LEAD_SUBMITTED_STATUS":
      if (type === "LEAD_SUBMITTED_STATUS") {
        router.push("/leads" as any);
        break;
      }
      if (data.relatedId) {
        router.push(`/lead/${data.relatedId}` as any);
      } else {
        router.push("/leads" as any);
      }
      break;
    default:
      if (preferExternal && actionUrl) {
        const result = await openExternalNotificationUrl(actionUrl);
        if (!result.ok) {
          showNotificationDetailSheet(data, appNotification, actionUrl);
        }
      } else if (data.relatedId) {
        router.push(`/lead/${data.relatedId}` as any);
      } else if (isAppNotification || data.message || data.title) {
        showNotificationDetailSheet(data, appNotification, actionUrl);
      } else {
        router.push("/notifications" as any);
      }
  }
}
