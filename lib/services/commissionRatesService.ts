import { supabase } from "../supabase";
import {
  PREMIUM_COMMISSION as FALLBACK_PREMIUM,
  STANDARD_COMMISSION as FALLBACK_STANDARD,
} from "../../constants/commissions";

export type AirtelCommissionRates = {
  standard: number;
  premium: number;
};

let cachedRates: AirtelCommissionRates | null = null;

const FALLBACK_RATES: AirtelCommissionRates = {
  standard: FALLBACK_STANDARD,
  premium: FALLBACK_PREMIUM,
};

/** Last fetched rates, or compile-time fallbacks before the first fetch. */
export function getCachedCommissionRates(): AirtelCommissionRates {
  return cachedRates ?? FALLBACK_RATES;
}

/**
 * Load Airtel commission rates from `commission_rates_config` (single row in Supabase).
 * Falls back to constants when offline or the table is unavailable.
 */
export async function fetchCommissionRates(
  forceRefresh = false
): Promise<AirtelCommissionRates> {
  if (cachedRates && !forceRefresh) {
    return cachedRates;
  }

  try {
    const { data, error } = await supabase
      .from("commission_rates_config")
      .select("standard_commission, premium_commission")
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn(
        "commission_rates_config unavailable, using fallbacks:",
        error?.message
      );
      return getCachedCommissionRates();
    }

    cachedRates = {
      standard: Number(data.standard_commission) || FALLBACK_STANDARD,
      premium: Number(data.premium_commission) || FALLBACK_PREMIUM,
    };
    return cachedRates;
  } catch (e) {
    console.warn("fetchCommissionRates failed:", e);
    return getCachedCommissionRates();
  }
}
