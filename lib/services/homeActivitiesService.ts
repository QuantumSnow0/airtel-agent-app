import { supabase } from "../supabase";

export type HomeActivityKind =
  | "payment"
  | "registration"
  | "installation"
  | "lead_accepted"
  | "lead_kyc"
  | "lead_install";

export type HomeActivity = {
  id: string;
  kind: HomeActivityKind;
  title: string;
  subtitle: string;
  at: string;
  href?: string;
};

function iso(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export async function fetchHomeActivities(
  agentId: string,
  limit = 30,
): Promise<HomeActivity[]> {
  const activities: HomeActivity[] = [];

  const [paymentsRes, airtelRes, safRes, leadsRes] = await Promise.all([
    supabase
      .from("agent_payments")
      .select("id, amount_ksh, notes, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("customer_registrations")
      .select(
        "id, customer_name, status, created_at, updated_at, preferred_package",
      )
      .eq("agent_id", agentId)
      .eq("commission_exempt", false)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("safaricom_registrations")
      .select("id, customer_name, status, created_at, service_package")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("inbound_leads")
      .select(
        "id, customer_name, status, product, accepted_at, kyc_completed_at, installed_at, updated_at",
      )
      .eq("assigned_agent_id", agentId)
      .order("updated_at", { ascending: false })
      .limit(20),
  ]);

  if (paymentsRes.error) {
    console.warn("homeActivities payments:", paymentsRes.error.message);
  }
  if (airtelRes.error) {
    console.warn("homeActivities airtel regs:", airtelRes.error.message);
  }
  if (safRes.error) {
    console.warn("homeActivities safaricom regs:", safRes.error.message);
  }
  if (leadsRes.error) {
    console.warn("homeActivities leads:", leadsRes.error.message);
  }

  for (const row of paymentsRes.data ?? []) {
    const at = iso(row.created_at);
    if (!at) continue;
    const amount = Number(row.amount_ksh) || 0;
    activities.push({
      id: `pay-${row.id}`,
      kind: "payment",
      title: "Payment received",
      subtitle: `KSh ${amount.toLocaleString()}${
        row.notes ? ` · ${String(row.notes).slice(0, 40)}` : ""
      }`,
      at,
      href: "/earnings-history",
    });
  }

  for (const row of airtelRes.data ?? []) {
    const created = iso(row.created_at);
    if (created) {
      activities.push({
        id: `airtel-reg-${row.id}`,
        kind: "registration",
        title: "Customer onboarded",
        subtitle: `${row.customer_name || "Customer"} · Airtel${
          row.preferred_package ? ` ${row.preferred_package}` : ""
        }`,
        at: created,
        href: `/registration/${row.id}?source=airtel`,
      });
    }
    if (row.status === "installed") {
      const installed = iso(row.updated_at) ?? created;
      if (installed) {
        activities.push({
          id: `airtel-inst-${row.id}`,
          kind: "installation",
          title: "Installation confirmed",
          subtitle: `${row.customer_name || "Customer"} · Airtel`,
          at: installed,
          href: `/registration/${row.id}?source=airtel`,
        });
      }
    }
  }

  for (const row of safRes.data ?? []) {
    const created = iso(row.created_at);
    if (created) {
      activities.push({
        id: `saf-reg-${row.id}`,
        kind: "registration",
        title: "Customer onboarded",
        subtitle: `${row.customer_name || "Customer"} · Safaricom`,
        at: created,
        href: `/registration/${row.id}?source=safaricom`,
      });
    }
    if (row.status === "installed") {
      const installed = created;
      if (installed) {
        activities.push({
          id: `saf-inst-${row.id}`,
          kind: "installation",
          title: "Installation confirmed",
          subtitle: `${row.customer_name || "Customer"} · Safaricom`,
          at: installed,
          href: `/registration/${row.id}?source=safaricom`,
        });
      }
    }
  }

  for (const row of leadsRes.data ?? []) {
    const product =
      row.product === "safaricom" ? "Safaricom lead" : "Airtel lead";
    const accepted = iso(row.accepted_at);
    if (accepted) {
      activities.push({
        id: `lead-acc-${row.id}`,
        kind: "lead_accepted",
        title: "Lead accepted",
        subtitle: `${row.customer_name || "Customer"} · ${product}`,
        at: accepted,
        href: `/lead/${row.id}`,
      });
    }
    const kyc = iso(row.kyc_completed_at);
    if (kyc || row.status === "kyc_completed") {
      activities.push({
        id: `lead-kyc-${row.id}`,
        kind: "lead_kyc",
        title: "KYC completed",
        subtitle: `${row.customer_name || "Customer"} · ${product}`,
        at: kyc ?? iso(row.updated_at) ?? new Date().toISOString(),
        href: `/lead/${row.id}`,
      });
    }
    if (
      row.status === "pending_install" ||
      row.status === "installed" ||
      row.installed_at
    ) {
      const installed = iso(row.installed_at) ?? iso(row.updated_at);
      if (installed) {
        activities.push({
          id: `lead-inst-${row.id}-${row.status}`,
          kind: "lead_install",
          title:
            row.status === "installed"
              ? "Lead installed"
              : "Install submitted",
          subtitle: `${row.customer_name || "Customer"} · ${product}`,
          at: installed,
          href: `/lead/${row.id}`,
        });
      }
    }
  }

  activities.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );

  return activities.slice(0, limit);
}

export type LastPaymentSummary = {
  amountKsh: number;
  at: string;
} | null;

/** Latest ledger payout for the wallet strip “Last paid …” line. */
export async function fetchLastPayment(
  agentId: string,
): Promise<LastPaymentSummary> {
  const { data, error } = await supabase
    .from("agent_payments")
    .select("amount_ksh, created_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const at = iso(data.created_at);
  if (!at) return null;
  return {
    amountKsh: Number(data.amount_ksh) || 0,
    at,
  };
}
