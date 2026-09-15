import type { MaterialIcons } from "@expo/vector-icons";
import type { AppNotification, NotificationType } from "./types";
import { formatLeadOfferPushDisplay as formatLeadOfferCopy } from "./leadOfferCopy";

type IconName = keyof typeof MaterialIcons.glyphMap;

export type NotificationVisual = {
  icon: IconName;
  accent: string;
  softBg: string;
  label: string;
  urgent?: boolean;
};

const DEFAULT_VISUAL: NotificationVisual = {
  icon: "notifications",
  accent: "#0066CC",
  softBg: "#E8F1FF",
  label: "Update",
};

const TYPE_VISUALS: Record<NotificationType, NotificationVisual> = {
  LEAD_OFFER: {
    icon: "campaign",
    accent: "#E65100",
    softBg: "#FFF3E0",
    label: "Lead offer",
    urgent: true,
  },
  LEAD_OVERDUE: {
    icon: "schedule",
    accent: "#C62828",
    softBg: "#FFEBEE",
    label: "Overdue lead",
    urgent: true,
  },
  REGISTRATION_STATUS_CHANGE: {
    icon: "assignment-turned-in",
    accent: "#2E7D32",
    softBg: "#E8F5E9",
    label: "Registration",
  },
  EARNINGS_UPDATE: {
    icon: "payments",
    accent: "#F57C00",
    softBg: "#FFF8E1",
    label: "Earnings",
  },
  PAYOUT_RECEIVED: {
    icon: "account-balance-wallet",
    accent: "#1B5E20",
    softBg: "#E8F5E9",
    label: "Payout",
  },
  ACCOUNT_STATUS_CHANGE: {
    icon: "verified-user",
    accent: "#1565C0",
    softBg: "#E3F2FD",
    label: "Account",
  },
  SYNC_FAILURE: {
    icon: "sync-problem",
    accent: "#C62828",
    softBg: "#FFEBEE",
    label: "Sync issue",
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: "info",
    accent: "#6A1B9A",
    softBg: "#F3E5F5",
    label: "Announcement",
  },
  LEAD_INSTALLED: {
    icon: "check-circle",
    accent: "#2E7D32",
    softBg: "#E8F5E9",
    label: "Install confirmed",
  },
  LEAD_SUBMITTED_STATUS: {
    icon: "campaign",
    accent: "#1565C0",
    softBg: "#E3F2FD",
    label: "Your lead update",
  },
};

const REGISTRATION_STATUS_VISUALS: Record<string, Partial<NotificationVisual>> = {
  installed: {
    icon: "check-circle",
    accent: "#2E7D32",
    softBg: "#E8F5E9",
    label: "Installed",
  },
  rejected: {
    icon: "cancel",
    accent: "#C62828",
    softBg: "#FFEBEE",
    label: "Rejected",
  },
  duplicate: {
    icon: "content-copy",
    accent: "#6A1B9A",
    softBg: "#F3E5F5",
    label: "Duplicate",
  },
  cancelled: {
    icon: "block",
    accent: "#616161",
    softBg: "#F5F5F5",
    label: "Cancelled",
  },
};

/** Enrich stored DB copy for lead-offer cards (older rows may have generic text). */
export function formatNotificationDisplay(
  notification: AppNotification,
): { title: string; message: string; subtitle?: string } {
  if (notification.type === "LEAD_OFFER") {
    const preview = (notification.metadata?.preview ?? {}) as Record<
      string,
      unknown
    >;
    const { title, message, subtitle } = formatLeadOfferCopy(
      preview as Record<string, unknown>,
    );

    return { title, message, subtitle };
  }

  if (notification.type === "LEAD_OVERDUE") {
    return {
      title: notification.title || "Lead overdue",
      message:
        notification.message ||
        "A assigned lead has passed the 24h SLA. Open it to update status or release.",
    };
  }

  return {
    title: notification.title,
    message: notification.message,
  };
}

export function getNotificationVisualForType(
  type: string,
): NotificationVisual {
  return TYPE_VISUALS[type as NotificationType] ?? DEFAULT_VISUAL;
}

export function getNotificationVisual(
  notification: AppNotification,
): NotificationVisual {
  if (notification.type === "REGISTRATION_STATUS_CHANGE") {
    const status = String(notification.metadata?.status ?? "");
    const override = REGISTRATION_STATUS_VISUALS[status];
    if (override) {
      return { ...TYPE_VISUALS.REGISTRATION_STATUS_CHANGE, ...override };
    }
    return {
      ...TYPE_VISUALS.REGISTRATION_STATUS_CHANGE,
      icon: "description",
      accent: "#EF6C00",
      softBg: "#FFF3E0",
    };
  }

  return getNotificationVisualForType(notification.type);
}

export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function mapDbNotification(record: {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string | null;
  metadata?: Record<string, unknown> | string | null;
}): AppNotification {
  let metadata: Record<string, unknown> = {};
  if (typeof record.metadata === "string") {
    try {
      const parsed = JSON.parse(record.metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, unknown>;
      }
    } catch {
      metadata = {};
    }
  } else if (record.metadata && typeof record.metadata === "object") {
    metadata = record.metadata;
  }

  return {
    id: record.id,
    type: record.type as NotificationType,
    title: record.title,
    message: record.message,
    isRead: record.is_read,
    createdAt: record.created_at,
    relatedId: record.related_id ?? undefined,
    metadata,
  };
}
