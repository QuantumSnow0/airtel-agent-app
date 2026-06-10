import { supabase } from "../supabase";
import type { SafaricomRegistrationFormData } from "../validation/safaricomRegistrationSchemas";

function emptyToNull(v: string | undefined): string | null {
  const t = (v ?? "").trim();
  return t.length ? t : null;
}

export type SafaricomRegistrationInsert = {
  agent_id: string;
  service_package: string;
  fiber_deal_id: string | null;
  portable_deal_id: string | null;
  dedicated_wifi_deal_id: string | null;
  fiber_region_name: string | null;
  fiber_cluster_name: string | null;
  fiber_estate_id: string | null;
  fiber_estate_name: string | null;
  install_county: string | null;
  install_town: string | null;
  install_landmark: string | null;
  customer_name: string;
  safaricom_number: string;
  alternate_number: string | null;
  email: string;
  identification_number: string;
  date_of_birth: string;
  status: "pending";
};

export function buildSafaricomRegistrationRow(
  agentId: string,
  data: SafaricomRegistrationFormData
): SafaricomRegistrationInsert {
  return {
    agent_id: agentId,
    service_package: data.servicePackage,
    fiber_deal_id: emptyToNull(data.fiberDealId),
    portable_deal_id: emptyToNull(data.portableDealId),
    dedicated_wifi_deal_id: emptyToNull(data.dedicatedWifiDealId),
    fiber_region_name: emptyToNull(data.fiberRegionName),
    fiber_cluster_name: emptyToNull(data.fiberClusterName),
    fiber_estate_id: emptyToNull(data.fiberEstateId),
    fiber_estate_name: emptyToNull(data.fiberEstateName),
    install_county: emptyToNull(data.installCounty),
    install_town: emptyToNull(data.installTown),
    install_landmark: emptyToNull(data.installLandmark),
    customer_name: data.customerName.trim(),
    safaricom_number: data.safaricomNumber.trim(),
    alternate_number: emptyToNull(data.alternateNumber),
    email: data.email.trim(),
    identification_number: data.identificationNumber.trim(),
    date_of_birth: data.dateOfBirth.trim(),
    status: "pending",
  };
}

export async function insertSafaricomRegistration(
  agentId: string,
  data: SafaricomRegistrationFormData
) {
  const row = buildSafaricomRegistrationRow(agentId, data);
  return supabase.from("safaricom_registrations").insert(row).select("id").single();
}
