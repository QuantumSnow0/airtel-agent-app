import type { AirtelCommissionRates } from "../services/commissionRatesService";
import {
  getEffectiveCommissionPackage,
  getEffectiveCommissionUnits,
  type AirtelCommissionBasisRow,
} from "./airtelCommissionEffective";

export function computeAirtelInstalledCommissionKsh(
  rows: AirtelCommissionBasisRow[],
  rates: AirtelCommissionRates
): number {
  return rows.reduce((sum, row) => {
    const units = getEffectiveCommissionUnits(row);
    const pkg = getEffectiveCommissionPackage(row);
    return sum + units * (pkg === "premium" ? rates.premium : rates.standard);
  }, 0);
}
