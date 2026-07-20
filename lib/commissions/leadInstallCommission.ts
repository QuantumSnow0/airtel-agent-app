/**
 * Flat commission for inbound-lead installations (KSh).
 * Accrues only after admin confirms install (same idea as registration installed).
 * Keep in sync with admin-dashboard/lib/lead-install-commission.ts
 */

export const LEAD_INSTALL_COMMISSION_KES = 200;

export function getLeadInstallCommissionKes(
  row: { commission_earned_ksh?: number | string | null; status?: string | null },
): number {
  if (row.status != null && row.status !== "installed") return 0;
  const stored = Number(row.commission_earned_ksh);
  if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
  return 0;
}
