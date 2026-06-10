/**
 * Agent commission on Safaricom sales: fixed share of the package monthly price (KSh).
 * Prices are parsed from `constants/safaricom*Deals.ts` priceLabel — single source of truth.
 * UI shows only the computed KSh amount, not the rate.
 */

import { HOME_BUSINESS_FIBER_DEALS } from "../../constants/safaricomFiberDeals";
import { SAFARICOM_PORTABLE_5G_DEALS } from "../../constants/safaricomPortable5gDeals";
import { SAFARICOM_DEDICATED_WIFI_DEALS } from "../../constants/safaricomDedicatedWifiDeals";

/** Agent share of each package’s listed monthly price (business rule). */
const AGENT_COMMISSION_SHARE = 0.3;
/** Minimum payout per installed Safaricom package (business floor). */
const MIN_COMMISSION_KES = 1000;

/** Parse "Ksh 2,999", "Ksh 76,304.80", etc. from deal `priceLabel`. */
export function parseKesFromSafaricomPriceLabel(label: string): number {
  const match = label.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return 0;
  const n = parseFloat(match[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildSafaricomDealPriceKes(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const d of HOME_BUSINESS_FIBER_DEALS) {
    map[d.id] = parseKesFromSafaricomPriceLabel(d.priceLabel);
  }
  for (const d of SAFARICOM_PORTABLE_5G_DEALS) {
    map[d.id] = parseKesFromSafaricomPriceLabel(d.priceLabel);
  }
  for (const d of SAFARICOM_DEDICATED_WIFI_DEALS) {
    map[d.id] = parseKesFromSafaricomPriceLabel(d.priceLabel);
  }
  return map;
}

/** Monthly plan price in KSh per deal id (from deal constants). */
export const SAFARICOM_DEAL_PRICE_KES: Record<string, number> =
  buildSafaricomDealPriceKes();

export function getSafaricomDealPriceKes(dealId: string | null | undefined): number {
  if (!dealId) return 0;
  return SAFARICOM_DEAL_PRICE_KES[dealId] ?? 0;
}

export function getSafaricomCommissionKesForRegistration(row: {
  service_package: string;
  fiber_deal_id?: string | null;
  portable_deal_id?: string | null;
  dedicated_wifi_deal_id?: string | null;
}): number {
  let dealId: string | null = null;
  if (row.service_package === "home_business_fiber") {
    dealId = row.fiber_deal_id ?? null;
  } else if (row.service_package === "safaricom_portable_5g") {
    dealId = row.portable_deal_id ?? null;
  } else if (row.service_package === "safaricom_dedicated_wifi") {
    dealId = row.dedicated_wifi_deal_id ?? null;
  }
  const price = getSafaricomDealPriceKes(dealId);
  if (price <= 0) return 0;
  const percentCommission = Math.round(price * AGENT_COMMISSION_SHARE);
  return Math.max(MIN_COMMISSION_KES, percentCommission);
}
