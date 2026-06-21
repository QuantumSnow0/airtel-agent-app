import { supabase } from "../supabase";
import { fetchCommissionRates } from "../services/commissionRatesService";
import { getSafaricomCommissionKesForRegistration } from "./safaricomAgentCommission";
import { computeAirtelInstalledCommissionKsh } from "./airtelWalletCommission";

/** Full wallet total: Airtel installed + Safaricom installed (agent share). */
export function computeCombinedWalletCommissionKsh(
  airtelInstalledCommissionKsh: number,
  safaricomInstalledCommissionKsh: number
): number {
  return airtelInstalledCommissionKsh + safaricomInstalledCommissionKsh;
}

/**
 * Load combined commission KSh for an agent (used where dashboard cache is unavailable).
 */
export async function fetchWalletCommissionKsh(agentId: string): Promise<number> {
  const rates = await fetchCommissionRates();

  const { data: installedAirtel, error: airtelErr } = await supabase
    .from("customer_registrations")
    .select(
      "preferred_package, units_required, commission_package, commission_units"
    )
    .eq("agent_id", agentId)
    .eq("status", "installed");

  if (airtelErr) {
    console.warn("fetchWalletCommissionKsh airtel:", airtelErr);
  }

  const airtelKsh = computeAirtelInstalledCommissionKsh(
    installedAirtel ?? [],
    rates
  );

  const { data: safRows, error: safErr } = await supabase
    .from("safaricom_registrations")
    .select(
      "service_package, fiber_deal_id, portable_deal_id, dedicated_wifi_deal_id"
    )
    .eq("agent_id", agentId)
    .eq("status", "installed");

  let safKsh = 0;
  const msg = String(safErr?.message || "").toLowerCase();
  if (!safErr && safRows?.length) {
    safKsh = safRows.reduce(
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
  } else if (safErr && !msg.includes("does not exist")) {
    console.warn("fetchWalletCommissionKsh safaricom:", safErr);
  }

  return computeCombinedWalletCommissionKsh(airtelKsh, safKsh);
}
