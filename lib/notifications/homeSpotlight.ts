import { supabase } from "../supabase";
import { resolveNotificationActionUrl } from "./openNotificationAction";
import type { AppNotification } from "./types";
import { mapDbNotification } from "./presentation";

export type HomeActionKind = "meeting" | "urgent" | "announcement";

export type SpotlightPlaceIcon =
  | "videocam"
  | "chat"
  | "link"
  | "language"
  | "phone"
  | "groups"
  | "assignment"
  | "campaign"
  | "place"
  | "notifications";

export const SPOTLIGHT_PLACE_ICONS: SpotlightPlaceIcon[] = [
  "videocam",
  "chat",
  "link",
  "language",
  "phone",
  "groups",
  "assignment",
  "campaign",
  "place",
  "notifications",
];

export type HomeSpotlightItem = {
  id: string;
  kind: HomeActionKind;
  title: string;
  message: string;
  whenLabel: string;
  placeLabel: string;
  placeIcon: SpotlightPlaceIcon;
  actionUrl: string | null;
  logoUrl: string | null;
  /** Optional admin override, e.g. #2F80ED */
  accentColor: string | null;
  cta: string;
  createdAt: string;
  extraCount: number;
};

const SPOTLIGHT_KINDS: HomeActionKind[] = ["meeting", "urgent"];

export function parseAnnouncementKind(
  metadata?: Record<string, unknown> | null,
): HomeActionKind {
  const raw = String(metadata?.kind ?? "").toLowerCase();
  if (raw === "meeting" || raw === "urgent" || raw === "announcement") {
    return raw;
  }
  return "announcement";
}

export function isHomeSpotlightKind(kind: HomeActionKind): boolean {
  return kind === "meeting" || kind === "urgent";
}

export function isSpotlightExpired(
  metadata?: Record<string, unknown> | null,
): boolean {
  const raw = metadata?.expiresAt;
  if (typeof raw !== "string" || !raw.trim()) return false;
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return false;
  return ts <= Date.now();
}

function inferPlatformLabel(actionUrl: string | null): string | null {
  if (!actionUrl) return null;
  const lower = actionUrl.toLowerCase();
  if (
    lower.includes("teams.microsoft.com") ||
    lower.startsWith("msteams:") ||
    lower.includes("microsoft.com/l/meetup")
  ) {
    return "Microsoft Teams";
  }
  if (
    lower.includes("wa.me") ||
    lower.includes("whatsapp.com") ||
    lower.startsWith("whatsapp:")
  ) {
    return "WhatsApp";
  }
  try {
    return new URL(actionUrl).hostname.replace(/^www\./, "");
  } catch {
    return "Open link";
  }
}

function formatWhenLabel(
  startsAt: string | null,
  kind: HomeActionKind,
): string {
  if (!startsAt) {
    return kind === "urgent" ? "Action needed" : "Scheduled";
  }
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) {
    return kind === "urgent" ? "Action needed" : "Scheduled";
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate();

  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) return `Today · ${time}`;
  if (isTomorrow) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${time}`;
}

function ctaFor(
  kind: HomeActionKind,
  actionUrl: string | null,
  override: string | null,
): string {
  if (override) return override;
  if (kind === "meeting") return actionUrl ? "Join now" : "View details";
  if (kind === "urgent") return actionUrl ? "Open" : "Got it";
  return actionUrl ? "Open link" : "Got it";
}

function parsePlaceIcon(raw: string | null): SpotlightPlaceIcon | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return (SPOTLIGHT_PLACE_ICONS as string[]).includes(value)
    ? (value as SpotlightPlaceIcon)
    : null;
}

function placeIconKind(
  kind: HomeActionKind,
  placeLabel: string,
  actionUrl: string | null,
): SpotlightPlaceIcon {
  const label = placeLabel.toLowerCase();
  const url = (actionUrl ?? "").toLowerCase();
  if (
    label.includes("whatsapp") ||
    url.includes("wa.me") ||
    url.includes("whatsapp") ||
    url.startsWith("whatsapp:")
  ) {
    return "chat";
  }
  if (
    label.includes("teams") ||
    url.includes("teams.microsoft.com") ||
    url.includes("microsoft.com/l/meetup") ||
    url.startsWith("msteams:")
  ) {
    return "videocam";
  }
  if (label.includes("phone") || label.includes("call")) return "phone";
  if (url.startsWith("http")) return "link";
  if (kind === "meeting") return "groups";
  if (kind === "urgent") return "assignment";
  return "campaign";
}

export function placeIconForSpotlight(
  kind: HomeActionKind,
  placeLabel: string,
  actionUrl: string | null = null,
  override: string | null = null,
): SpotlightPlaceIcon {
  return (
    parsePlaceIcon(override) ?? placeIconKind(kind, placeLabel, actionUrl)
  );
}

/** Normalize #RGB / #RRGGBB (optional leading #). */
export function parseAccentColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  const match = value.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return `#${hex.toUpperCase()}`;
}

function metaString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  const lowerEntries = Object.entries(metadata).map(
    ([k, v]) => [k.toLowerCase(), v] as const,
  );
  const lowerMap = Object.fromEntries(lowerEntries);
  for (const key of keys) {
    const value = lowerMap[key.toLowerCase()];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function mixWithWhite(hex: string, whiteRatio: number): string {
  const normalized = parseAccentColor(hex);
  if (!normalized) return "#F1F5F9";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const mix = (channel: number) =>
    Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`.toUpperCase();
}

function darkenHex(hex: string, amount: number): string {
  const normalized = parseAccentColor(hex);
  if (!normalized) return "#0F172A";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const shade = (channel: number) =>
    Math.max(0, Math.round(channel * (1 - amount)));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(shade(r))}${toHex(shade(g))}${toHex(shade(b))}`.toUpperCase();
}

export function themeFromAccent<T extends { accent: string; ink: string; iconTile: string; iconColor: string }>(
  accent: string | null | undefined,
  fallback: T,
): T {
  const parsed = parseAccentColor(accent);
  if (!parsed) return fallback;
  return {
    ...fallback,
    accent: parsed,
    ink: darkenHex(parsed, 0.45),
    iconTile: mixWithWhite(parsed, 0.88),
    iconColor: mixWithWhite(parsed, 0.25),
  };
}

export function toHomeSpotlightItem(
  notification: AppNotification,
  extraCount = 0,
): HomeSpotlightItem | null {
  if (notification.type !== "SYSTEM_ANNOUNCEMENT") return null;
  const kind = parseAnnouncementKind(notification.metadata);
  if (!isHomeSpotlightKind(kind)) return null;

  const actionUrl = resolveNotificationActionUrl(
    notification.metadata,
    notification.message,
    { allowMessageScan: true },
  );

  const logoUrl = metaString(notification.metadata, ["logoUrl", "logo_url"]);

  const platformLabel =
    metaString(notification.metadata, ["platformLabel", "platform_label"]) ||
    inferPlatformLabel(actionUrl) ||
    (kind === "meeting" ? "Meeting" : "Important update");

  const startsAt = metaString(notification.metadata, ["startsAt", "starts_at"]);

  const accentColor =
    parseAccentColor(
      metaString(notification.metadata, [
        "accentColor",
        "accent_color",
        "accent",
      ]),
    ) ?? null;

  const ctaOverride = metaString(notification.metadata, [
    "ctaLabel",
    "cta_label",
    "cta",
  ]);
  const platformIconOverride = metaString(notification.metadata, [
    "platformIcon",
    "platform_icon",
    "placeIcon",
    "place_icon",
  ]);

  return {
    id: notification.id,
    kind,
    title: notification.title || (kind === "meeting" ? "Meeting" : "Urgent update"),
    message: notification.message || "",
    whenLabel: formatWhenLabel(startsAt, kind),
    placeLabel: platformLabel,
    placeIcon: placeIconForSpotlight(
      kind,
      platformLabel,
      actionUrl,
      platformIconOverride,
    ),
    actionUrl,
    logoUrl,
    accentColor,
    cta: ctaFor(kind, actionUrl, ctaOverride),
    createdAt: notification.createdAt,
    extraCount,
  };
}

function spotlightSortScore(n: AppNotification): number {
  const kind = parseAnnouncementKind(n.metadata);
  // Urgent first, then newest first so a freshly sent themed card isn't buried.
  const urgentBoost = kind === "urgent" ? 0 : 1_000_000_000_000;
  const created = Date.parse(n.createdAt) || 0;
  return urgentBoost - created;
}

/**
 * Latest unread meeting / urgent announcement for the home spotlight.
 */
export async function fetchHomeSpotlightItem(
  agentId: string,
): Promise<HomeSpotlightItem | null> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("agent_id", agentId)
    .eq("type", "SYSTEM_ANNOUNCEMENT")
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("fetchHomeSpotlightItem:", error);
    return null;
  }

  const mapped = (data ?? []).map(mapDbNotification);
  const spotlightCandidates = mapped.filter((n) =>
    isHomeSpotlightKind(parseAnnouncementKind(n.metadata)),
  );

  const expired = spotlightCandidates.filter((n) =>
    isSpotlightExpired(n.metadata),
  );
  if (expired.length > 0) {
    void supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in(
        "id",
        expired.map((n) => n.id),
      );
  }

  const spotlight = spotlightCandidates
    .filter((n) => !isSpotlightExpired(n.metadata))
    .sort((a, b) => spotlightSortScore(a) - spotlightSortScore(b));

  if (spotlight.length === 0) return null;
  return toHomeSpotlightItem(spotlight[0], Math.max(0, spotlight.length - 1));
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);
}

/** Auto-mark on Notifications tab should not clear home spotlight items. */
export const SPOTLIGHT_EXCLUDED_FROM_AUTO_READ = SPOTLIGHT_KINDS;
