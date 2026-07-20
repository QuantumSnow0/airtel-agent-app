import { supabase } from "../supabase";
import { fetchCommissionRates } from "../services/commissionRatesService";
import { getSafaricomCommissionKesForRegistration } from "./safaricomAgentCommission";
import { computeAirtelInstalledCommissionKsh } from "./airtelWalletCommission";
import { getLeadInstallCommissionKes } from "./leadInstallCommission";

/** Full wallet total: Airtel + Safaricom + inbound-lead installs. */
export function computeCombinedWalletCommissionKsh(
  airtelInstalledCommissionKsh: number,
  safaricomInstalledCommissionKsh: number,
  leadInstallCommissionKsh = 0
): number {
  return (
    airtelInstalledCommissionKsh +
    safaricomInstalledCommissionKsh +
    leadInstallCommissionKsh
  );
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
    .eq("status", "installed")
    .eq("commission_exempt", false);

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

  const { data: leadRows, error: leadErr } = await supabase
    .from("inbound_leads")
    .select("commission_earned_ksh, status")
    .eq("assigned_agent_id", agentId)
    .eq("status", "installed");

  let leadKsh = 0;
  const leadMsg = String(leadErr?.message || "").toLowerCase();
  if (!leadErr && leadRows?.length) {
    leadKsh = leadRows.reduce(
      (sum, row) => sum + getLeadInstallCommissionKes(row),
      0
    );
  } else if (
    leadErr &&
    !leadMsg.includes("does not exist") &&
    !leadMsg.includes("commission_earned")
  ) {
    console.warn("fetchWalletCommissionKsh leads:", leadErr);
  }

  return computeCombinedWalletCommissionKsh(airtelKsh, safKsh, leadKsh);
}
