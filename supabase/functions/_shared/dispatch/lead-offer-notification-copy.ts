/**
 * Material Design 3 push / OS notification copy for blind lead offers.
 * Collapsed: provider · headline · location · package · CTA.
 * Expanded: adds response deadline (BigTextStyle on Android).
 */

export const LEAD_OFFER_CATEGORY_ID = "LEAD_OFFER";
export const LEAD_OFFER_ANDROID_TAG = "wam_lead_offers";
export const LEAD_OFFER_RESPONSE_SECONDS = 30;

export type LeadOfferPreview = {
  product?: string;
  installationTown?: string | null;
  roughArea?: string | null;
  packageLabel?: string | null;
  distanceKm?: number | null;
};

export function capitalizeBrand(product: string): string {
  if (product === "safaricom") return "Safaricom";
  if (product === "airtel") return "Airtel";
  return product.charAt(0).toUpperCase() + product.slice(1);
}

export function formatLeadLocation(preview: LeadOfferPreview): string {
  const town = String(preview.installationTown ?? "").trim();
  const area = preview.roughArea ? String(preview.roughArea).trim() : "";
  if (area && town) return `${area}, ${town}`;
  return area || town || "Nearby";
}

/** Split "Home Internet • 15 Mbps" into name + speed when possible. */
export function splitPackageLabel(
  packageLabel: string | null | undefined,
): { primary: string; secondary: string | null } {
  if (!packageLabel?.trim()) {
    return { primary: "Package details on accept", secondary: null };
  }

  const normalized = packageLabel.trim();
  const parts = normalized
    .split(/\s*[•·|]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { primary: parts[0], secondary: parts.slice(1).join(" • ") };
  }

  const speedMatch = normalized.match(
    /^(.+?)\s+(\d+\s*(?:Mbps|mbps|GB|gb).*)$/i,
  );
  if (speedMatch) {
    return {
      primary: speedMatch[1].trim(),
      secondary: speedMatch[2].trim(),
    };
  }

  return { primary: normalized, secondary: null };
}

export function providerAccentColor(product: string): string {
  if (product === "safaricom") return "#59B848";
  if (product === "airtel") return "#E60000";
  return "#E53935";
}

export type LeadOfferNotificationCopy = {
  title: string;
  subtitle: string;
  message: string;
  accentColor: string;
  product: string;
  leadCount: number;
};

export function formatSingleLeadOfferCopy(
  preview: LeadOfferPreview,
): LeadOfferNotificationCopy {
  const product = String(preview.product ?? "lead");
  const brand = capitalizeBrand(product);
  const location = formatLeadLocation(preview);
  const pkg = splitPackageLabel(preview.packageLabel);
  const packageLine = pkg.secondary
    ? `${pkg.primary} • ${pkg.secondary}`
    : pkg.primary;

  const message = [
    location,
    packageLine,
    "",
    "Tap to respond",
    "",
    pkg.primary,
    ...(pkg.secondary ? [pkg.secondary] : []),
    "",
    `Respond within ${LEAD_OFFER_RESPONSE_SECONDS} seconds`,
  ].join("\n");

  return {
    title: brand,
    subtitle: "New Lead Available",
    message,
    accentColor: providerAccentColor(product),
    product,
    leadCount: 1,
  };
}

function formatLeadBlock(preview: LeadOfferPreview): string {
  const brand = capitalizeBrand(String(preview.product ?? "lead"));
  const location = formatLeadLocation(preview);
  const pkg = splitPackageLabel(preview.packageLabel);
  const packageLine = pkg.secondary
    ? `${pkg.primary} • ${pkg.secondary}`
    : pkg.primary;

  return [brand, location, packageLine].join("\n");
}

export function formatGroupedLeadOfferCopy(
  previews: LeadOfferPreview[],
): LeadOfferNotificationCopy {
  const count = previews.length;
  const blocks = previews.map(formatLeadBlock).join("\n\n—\n\n");

  return {
    title: `${count} New Leads Available`,
    subtitle: "Tap to review",
    message: `${blocks}\n\nTap a lead in the app to respond`,
    accentColor: "#E53935",
    product: String(previews[0]?.product ?? "lead"),
    leadCount: count,
  };
}

/** Back-compat for DB `notifications.title` / `message` columns. */
export function formatLeadOfferNotificationCopy(
  preview: Record<string, unknown>,
): { title: string; message: string } {
  const copy = formatSingleLeadOfferCopy(preview as LeadOfferPreview);
  return { title: copy.title, message: copy.message };
}
