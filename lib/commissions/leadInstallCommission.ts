/**
 * Flat commission for inbound-lead installations (KSh).
 * Accrues only after admin confirms install (same idea as registration installed).
 * Keep in sync with admin-dashboard/lib/lead-install-commission.ts
 *
 * Website / marketing leads: show LEAD_INSTALL_COMMISSION_KES.
 * Agent-submitted (non-installer) leads: package-specific receiver fee when > 0.
 */

export const LEAD_INSTALL_COMMISSION_KES = 200;

export type LeadPackageFeeKey = "standard" | "premium";

export type LeadPackageFees = {
  standard: number;
  premium: number;
};

export function normalizeLeadPackage(
  raw?: string | null,
): LeadPackageFeeKey {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  return value === "premium" || value.includes("premium")
    ? "premium"
    : "standard";
}

export function pickPackageFee(
  fees: LeadPackageFees | null | undefined,
  preferredPackage?: string | null,
): number {
  const key = normalizeLeadPackage(preferredPackage);
  const n = Number(fees?.[key] ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export function isAgentSubmittedLead(row: {
  source?: string | null;
  submitted_by_agent_id?: string | null;
}): boolean {
  return (
    row.source === "agent_own" ||
    (row.submitted_by_agent_id != null &&
      String(row.submitted_by_agent_id).length > 0)
  );
}

/**
 * Amount to display for an install earn UI, or null to hide.
 */
export function resolveLeadInstallDisplayKes(opts: {
  source?: string | null;
  submitted_by_agent_id?: string | null;
  preferredPackage?: string | null;
  receiverFees?: LeadPackageFees | null;
  /** @deprecated prefer receiverFees + preferredPackage */
  receiverCommissionKes?: number | null;
}): number | null {
  if (isAgentSubmittedLead(opts)) {
    const fromPackage =
      opts.receiverFees != null
        ? pickPackageFee(opts.receiverFees, opts.preferredPackage)
        : 0;
    const legacy = Number(opts.receiverCommissionKes);
    const n =
      fromPackage > 0
        ? fromPackage
        : Number.isFinite(legacy) && legacy > 0
          ? Math.round(legacy)
          : 0;
    if (n <= 0) return null;
    return n;
  }
  return LEAD_INSTALL_COMMISSION_KES;
}

export function getLeadInstallCommissionKes(
  row: { commission_earned_ksh?: number | string | null; status?: string | null },
): number {
  if (row.status != null && row.status !== "installed") return 0;
  const stored = Number(row.commission_earned_ksh);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
  return 0;
}
