/**
 * Safaricom product packages (step 1 — selection only).
 * Extend or rename when product definitions are finalized.
 */
export const SAFARICOM_PACKAGE_IDS = [
  "home_business_fiber",
  "safaricom_portable_5g",
  "safaricom_dedicated_wifi",
] as const;

export type SafaricomServicePackage = (typeof SAFARICOM_PACKAGE_IDS)[number];
