import { supabase } from "../supabase";
import {
  getEffectiveCommissionPackage,
  getEffectiveCommissionUnits,
} from "../commissions/airtelCommissionEffective";
import {
  fetchCommissionRates,
  getCachedCommissionRates,
  type AirtelCommissionRates,
} from "../services/commissionRatesService";
import { getSafaricomCommissionKesForRegistration } from "../commissions/safaricomAgentCommission";
import type { RegistrationSource } from "./unifiedListRegistration";

export type RegistrationTimelineStep = {
  key: string;
  label: string;
  description: string;
  date?: string;
  active: boolean;
  completed: boolean;
};

export type RegistrationDetail = {
  id: string;
  source: RegistrationSource;
  customer_name: string;
  status: string;
  created_at: string;
  updated_at?: string;
  preferred_package?: string;
  installation_town?: string;
  installation_location?: string;
  delivery_landmark?: string;
  visit_date?: string;
  visit_time?: string;
  airtel_number?: string;
  alternate_number?: string;
  email?: string;
  units_required?: number;
  commission_package?: string | null;
  commission_units?: number | null;
  ms_forms_response_id?: string | null;
  ms_forms_submitted_at?: string | null;
  service_package?: string;
  syncStatus?: "synced" | "pending" | "not_synced";
  estimated_commission_ksh?: number;
  timeline: RegistrationTimelineStep[];
};

function computeAirtelCommission(
  row: {
    preferred_package?: string;
    units_required?: number;
    commission_package?: string | null;
    commission_units?: number | null;
    status: string;
  },
  rates: AirtelCommissionRates = getCachedCommissionRates()
): number {
  if (row.status !== "installed") return 0;
  const units = getEffectiveCommissionUnits(row);
  const pkg = getEffectiveCommissionPackage(row);
  return pkg === "premium" ? rates.premium * units : rates.standard * units;
}

function buildTimeline(
  status: string,
  createdAt: string,
  updatedAt?: string
): RegistrationTimelineStep[] {
  const terminal = ["rejected", "duplicate", "cancelled"];
  const isInstalled = status === "installed";
  const isPending = status === "pending" || status === "approved";
  const isTerminal = terminal.includes(status);

  const steps: RegistrationTimelineStep[] = [
    {
      key: "registered",
      label: "Registered",
      description: "Customer registration submitted",
      date: createdAt,
      active: isPending,
      completed: true,
    },
    {
      key: "pending",
      label: "Awaiting installation",
      description: "Registration is being processed",
      date: isPending ? createdAt : undefined,
      active: isPending,
      completed: isInstalled || isTerminal,
    },
  ];

  if (isInstalled) {
    steps.push({
      key: "installed",
      label: "Installed",
      description: "Installation completed — commission earned",
      date: updatedAt ?? createdAt,
      active: true,
      completed: true,
    });
  } else if (isTerminal) {
    const labels: Record<string, string> = {
      rejected: "Rejected",
      duplicate: "Duplicate",
      cancelled: "Cancelled",
    };
    steps.push({
      key: status,
      label: labels[status] ?? status,
      description: "This registration will not be installed",
      date: updatedAt ?? createdAt,
      active: true,
      completed: true,
    });
  }

  return steps;
}

export async function fetchRegistrationDetail(
  agentId: string,
  registrationId: string,
  source: RegistrationSource
): Promise<{ detail: RegistrationDetail | null; error?: string }> {
  try {
    await fetchCommissionRates();

    if (source === "safaricom") {
      const { data, error } = await supabase
        .from("safaricom_registrations")
        .select(
          "id, customer_name, email, safaricom_number, alternate_number, service_package, fiber_region_name, fiber_cluster_name, install_county, install_town, install_landmark, status, created_at, updated_at, fiber_deal_id, portable_deal_id, dedicated_wifi_deal_id"
        )
        .eq("id", registrationId)
        .eq("agent_id", agentId)
        .maybeSingle();

      if (error) return { detail: null, error: error.message };
      if (!data) return { detail: null, error: "Registration not found" };

      const installationTown =
        [data.fiber_region_name, data.fiber_cluster_name].filter(Boolean).join(" · ") ||
        [data.install_county, data.install_town].filter(Boolean).join(" · ");

      const commission =
        data.status === "installed"
          ? getSafaricomCommissionKesForRegistration(data)
          : 0;

      return {
        detail: {
          id: data.id,
          source: "safaricom",
          customer_name: data.customer_name,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
          preferred_package: data.service_package,
          installation_town: installationTown || undefined,
          installation_location: data.install_landmark ?? data.install_town ?? undefined,
          delivery_landmark: data.install_landmark ?? undefined,
          airtel_number: data.safaricom_number ?? undefined,
          alternate_number: data.alternate_number ?? undefined,
          email: data.email ?? undefined,
          syncStatus: "synced",
          estimated_commission_ksh: commission,
          timeline: buildTimeline(data.status, data.created_at, data.updated_at),
        },
      };
    }

    const { data, error } = await supabase
      .from("customer_registrations")
      .select(
        "id, customer_name, email, airtel_number, alternate_number, preferred_package, units_required, commission_package, commission_units, installation_town, installation_location, delivery_landmark, visit_date, visit_time, status, created_at, updated_at, ms_forms_response_id, ms_forms_submitted_at"
      )
      .eq("id", registrationId)
      .eq("agent_id", agentId)
      .maybeSingle();

    if (error) return { detail: null, error: error.message };
    if (!data) return { detail: null, error: "Registration not found" };

    return {
      detail: {
        id: data.id,
        source: "airtel",
        customer_name: data.customer_name,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        preferred_package: data.preferred_package,
        installation_town: data.installation_town,
        installation_location: data.installation_location,
        delivery_landmark: data.delivery_landmark,
        visit_date: data.visit_date,
        visit_time: data.visit_time,
        airtel_number: data.airtel_number,
        alternate_number: data.alternate_number,
        email: data.email,
        units_required: data.units_required ?? 1,
        commission_package: data.commission_package,
        commission_units: data.commission_units,
        ms_forms_response_id: data.ms_forms_response_id,
        ms_forms_submitted_at: data.ms_forms_submitted_at,
        syncStatus: "synced",
        estimated_commission_ksh: computeAirtelCommission(data),
        timeline: buildTimeline(data.status, data.created_at, data.updated_at),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { detail: null, error: message };
  }
}
