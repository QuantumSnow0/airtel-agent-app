/**
 * Normalise Airtel (`customer_registrations`) and Safaricom (`safaricom_registrations`)
 * rows for shared list UI (dashboard recent, registrations screen).
 */

export type RegistrationSource = "airtel" | "safaricom";

export type UnifiedListRegistration = {
  id: string;
  customer_name: string;
  /** Airtel: `standard` | `premium`. Safaricom: short product label for display. */
  preferred_package?: string;
  installation_town?: string;
  status: string;
  created_at: string;
  ms_forms_response_id?: string;
  ms_forms_submitted_at?: string;
  syncStatus?: "synced" | "pending" | "not_synced";
  source: RegistrationSource;
};

const SAF_PACKAGE_LABEL: Record<string, string> = {
  home_business_fiber: "Home & business fibre",
  safaricom_portable_5g: "Portable 5G",
  safaricom_dedicated_wifi: "Dedicated Wi-Fi",
};

export type SafaricomRegistrationListRow = {
  id: string;
  customer_name: string;
  service_package: string;
  status: string;
  created_at: string;
  fiber_region_name?: string | null;
  fiber_cluster_name?: string | null;
  install_town?: string | null;
  install_county?: string | null;
};

export function mapSafaricomRowToUnifiedList(
  row: SafaricomRegistrationListRow
): UnifiedListRegistration {
  let installationTown: string | undefined;
  if (row.service_package === "home_business_fiber") {
    const parts = [row.fiber_region_name, row.fiber_cluster_name].filter(
      (p): p is string => !!p && String(p).trim().length > 0
    );
    if (parts.length) installationTown = parts.join(" · ");
  }
  if (!installationTown?.trim()) {
    const t = [row.install_county, row.install_town].filter(Boolean).join(" · ");
    installationTown = t.trim() || undefined;
  }

  return {
    id: row.id,
    customer_name: row.customer_name,
    preferred_package:
      SAF_PACKAGE_LABEL[row.service_package] ?? row.service_package,
    installation_town: installationTown,
    status: row.status,
    created_at: row.created_at,
    syncStatus: "synced",
    source: "safaricom",
  };
}

export function mapCustomerRowToUnifiedList(reg: {
  id: string;
  customer_name: string;
  preferred_package?: string;
  installation_town?: string;
  status: string;
  created_at: string;
  ms_forms_response_id?: string;
  ms_forms_submitted_at?: string;
  syncStatus?: "synced" | "pending" | "not_synced";
}): UnifiedListRegistration {
  return {
    ...reg,
    source: "airtel",
  };
}
