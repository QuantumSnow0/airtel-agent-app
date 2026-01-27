/**
 * Commission rates (KSh per installation).
 * Source of truth is `commission_rates_config` in Supabase;
 * use these as fallbacks for UI when not fetching from the API.
 *
 * To change rates: run UPDATE_COMMISSION_RATES_AND_RECALC.sql in Supabase,
 * then update this file to match.
 */

export const STANDARD_COMMISSION = 300;
export const PREMIUM_COMMISSION = 500;

export const COMMISSION_RATES = {
  standard: STANDARD_COMMISSION,
  premium: PREMIUM_COMMISSION,
} as const;

export type PackageType = keyof typeof COMMISSION_RATES;

export function getCommissionForPackage(packageType: PackageType): number {
  return COMMISSION_RATES[packageType];
}
