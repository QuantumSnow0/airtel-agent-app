/**
 * Material Design 3 push / OS notification copy for blind lead offers.
 */

export const LEAD_OFFER_CATEGORY_ID = "LEAD_OFFER";
export const LEAD_OFFER_ANDROID_TAG_PREFIX = "wam_lead_";
export const LEAD_OFFER_RESPONSE_SECONDS = 30;

export type LeadOfferPreview = {
  product?: string;
  installationTown?: string | null;
  roughArea?: string | null;
  packageLabel?: string | null;
  distanceKm?: number | null;
  isCallbackReminder?: boolean;
  googlePlace?: { name?: string; lat?: number; lng?: number } | null;
};

export type LeadOfferNotificationCopy = {
  title: string;
  subtitle: string;
  message: string;
  accentColor: string;
  product: string;
  leadCount: number;
};

export function capitalizeBrand(product: string): string {
  if (product === "safaricom") return "Safaricom";
  if (product === "airtel") return "Airtel";
  return product.charAt(0).toUpperCase() + product.slice(1);
}

export function formatLeadLocation(preview: LeadOfferPreview): string {
  const placeName =
    preview.googlePlace && typeof preview.googlePlace === "object"
      ? String(
          (preview.googlePlace as { name?: string }).name ?? "",
        ).trim()
      : "";
  const town = String(preview.installationTown ?? "").trim();
  const area = preview.roughArea ? String(preview.roughArea).trim() : "";
  const landmark = placeName || area;
  if (landmark && town) return `${landmark}, ${town}`;
  return landmark || town || "Nearby";
}

export function humanizePackageLabel(
  packageLabel: string | null | undefined,
): string {
  if (!packageLabel?.trim()) return "Internet package";

  let s = packageLabel
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/\s+at\s+ksh\.?\s*[\d,]+.*/i, "")
    .replace(/\s+at\s+.*/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const airtelStyle = s.match(
    /^(5G|4G|LTE)?\s*(\d+)\s*Mbps\s*(\d+\s*days?)?/i,
  );
  if (airtelStyle) {
    const tech = airtelStyle[1]?.toUpperCase();
    const speed = `${airtelStyle[2]} Mbps`;
    return tech ? `${tech} · ${speed}` : speed;
  }

  const speedOnly = s.match(/(\d+)\s*Mbps/i);
  if (speedOnly) {
    const prefix = s
      .replace(/\d+\s*Mbps/i, "")
      .replace(/\d+\s*days?/i, "")
      .trim();
    const speed = `${speedOnly[1]} Mbps`;
    if (/fibre|fiber|home|internet|5g|4g/i.test(prefix)) {
      const cleaned = prefix
        .replace(/\s+/g, " ")
        .replace(/\b(\d+\s*days?)\b/i, "")
        .trim();
      return cleaned ? `${cleaned} · ${speed}` : speed;
    }
    return speed;
  }

  return s.length > 48 ? `${s.slice(0, 45).trim()}…` : s;
}

export function providerAccentColor(product: string): string {
  if (product === "safaricom") return "#59B848";
  if (product === "airtel") return "#E60000";
  return "#E53935";
}

/** Under 1 km → meters. Short enough for a collapsed Android body. */
export function formatPushDistance(
  km: number | null | undefined,
): string {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1) {
    const meters = Math.round(n * 1000);
    return meters < 1 ? "< 1 m from you" : `${meters} m from you`;
  }
  return `${Math.round(n * 10) / 10} km from you`;
}

function joinCopyParts(...parts: Array<string | null | undefined>): string {
  return parts.map((p) => String(p ?? "").trim()).filter(Boolean).join(" · ");
}

export function formatSingleLeadOfferCopy(
  preview: LeadOfferPreview,
): LeadOfferNotificationCopy {
  const product = String(preview.product ?? "lead");
  const brand = capitalizeBrand(product);
  const location = formatLeadLocation(preview);
  const pkg = humanizePackageLabel(preview.packageLabel);
  const distance = formatPushDistance(preview.distanceKm);
  const isReminder = Boolean(preview.isCallbackReminder);

  return {
    title: location,
    subtitle: isReminder
      ? `${brand} · Callback reminder`
      : `${brand} · New lead`,
    message: isReminder
      ? joinCopyParts("Call back", distance, pkg)
      : joinCopyParts(distance, pkg),
    accentColor: providerAccentColor(product),
    product,
    leadCount: 1,
  };
}

export function formatLeadQueueLine(preview: LeadOfferPreview): string {
  const brand = capitalizeBrand(String(preview.product ?? "lead"));
  return joinCopyParts(
    brand,
    formatLeadLocation(preview),
    formatPushDistance(preview.distanceKm),
    humanizePackageLabel(preview.packageLabel),
  );
}

export function formatGroupedLeadOfferCopy(
  previews: LeadOfferPreview[],
): LeadOfferNotificationCopy {
  const count = previews.length;
  const lines = previews.slice(0, 4).map(formatLeadQueueLine);
  if (count > 4) lines.push(`+ ${count - 4} more`);

  const first = previews[0] ?? {};
  return {
    title: `${count} new leads`,
    subtitle: "Tap to review",
    message: lines.join("\n"),
    accentColor: providerAccentColor(String(first.product ?? "lead")),
    product: String(first.product ?? "lead"),
    leadCount: count,
  };
}

export function formatLeadOfferPushDisplay(
  preview: LeadOfferPreview,
): { title: string; message: string; subtitle?: string } {
  const copy = formatSingleLeadOfferCopy(preview);
  return {
    title: copy.title,
    subtitle: copy.subtitle,
    message: copy.message,
  };
}

export function leadOfferNotificationTag(offerId: string): string {
  return `${LEAD_OFFER_ANDROID_TAG_PREFIX}${offerId}`;
}
