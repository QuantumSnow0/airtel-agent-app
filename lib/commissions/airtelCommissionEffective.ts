/** Upper bound for admin commission_units override (read-only in agent app). */
export const MAX_ADMIN_COMMISSION_UNITS = 20;

export type AirtelCommissionBasisRow = {
  preferred_package?: string | null;
  units_required?: number | null;
  commission_package?: string | null;
  commission_units?: number | null;
};

/** Commission units from stored registration/override values (no cap on units_required). */
export function normalizeCommissionUnits(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

export function getEffectiveCommissionPackage(
  row: AirtelCommissionBasisRow
): "standard" | "premium" {
  const pkg = (row.commission_package ?? row.preferred_package ?? "standard")
    .toString()
    .trim()
    .toLowerCase();
  return pkg === "premium" ? "premium" : "standard";
}

export function getEffectiveCommissionUnits(row: AirtelCommissionBasisRow): number {
  const raw =
    row.commission_units != null ? row.commission_units : row.units_required;
  return normalizeCommissionUnits(raw);
}

export function hasCommissionOverride(row: AirtelCommissionBasisRow): boolean {
  return row.commission_package != null || row.commission_units != null;
}
