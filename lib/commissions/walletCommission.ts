import { supabase } from "../supabase";
import type { AirtelCommissionRates } from "../services/commissionRatesService";
import {
  fetchCommissionRates,
  getCachedCommissionRates,
} from "../services/commissionRatesService";
import { getSafaricomCommissionKesForRegistration } from "./safaricomAgentCommission";

/** Airtel installed commission from counts (matches dashboard logic). */
export function computeAirtelInstalledCommissionKsh(
  premiumInstalled: number,
  standardInstalled: number,
  rates: AirtelCommissionRates = getCachedCommissionRates()
): number {
  return (
    premiumInstalled * rates.premium + standardInstalled * rates.standard
  );
}

/** Full wallet total: Airtel installed + Safaricom installed (agent share). */
export function computeCombinedWalletCommissionKsh(
  premiumInstalled: number,
  standardInstalled: number,
  safaricomInstalledCommissionKsh: number,
  rates?: AirtelCommissionRates
): number {
  return (
    computeAirtelInstalledCommissionKsh(
      premiumInstalled,
      standardInstalled,
      rates
    ) + safaricomInstalledCommissionKsh
  );
}

/**
 * Load combined commission KSh for an agent (used where dashboard cache is unavailable).
 * Ignores DB `agents.total_earnings` — that value may omit Safaricom until triggers are extended.
 */
export async function fetchWalletCommissionKsh(agentId: string): Promise<number> {
  const rates = await fetchCommissionRates();

  const [premRes, stdRes, safRes] = await Promise.all([
    supabase
      .from("customer_registrations")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("status", "installed")
      .eq("preferred_package", "premium"),
    supabase
      .from("customer_registrations")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("status", "installed")
      .eq("preferred_package", "standard"),
    supabase
      .from("safaricom_registrations")
      .select("service_package, fiber_deal_id, portable_deal_id, dedicated_wifi_deal_id")
      .eq("agent_id", agentId)
      .eq("status", "installed"),
  ]);

  const p = premRes.count ?? 0;
  const s = stdRes.count ?? 0;
  let safKsh = 0;
  const msg = String(safRes.error?.message || "").toLowerCase();
  if (!safRes.error && safRes.data?.length) {
    safKsh = safRes.data.reduce(
      (sum, row) =>
        sum +
        getSafaricomCommissionKesForRegistration(
          row as {
            service_package?: string | null;
            fiber_deal_id?: string | null;
            portable_deal_id?: string | null;
            dedicated_wifi_deal_id?: string | null;
          }
        ),
      0
    );
  } else if (safRes.error && !msg.includes("does not exist")) {
    console.warn("fetchWalletCommissionKsh safaricom:", safRes.error);
  }

  return computeCombinedWalletCommissionKsh(p, s, safKsh, rates);
}
