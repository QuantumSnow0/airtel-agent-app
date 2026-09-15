/** Our 20 operational areas shown as Installation Town in the UI. */
export const OPERATIONAL_AREAS = [
  "Bungoma",
  "Garissa",
  "Kajiado",
  "Kakamega",
  "Kiambu",
  "Kilifi",
  "Kisii",
  "Kisumu",
  "Kwale",
  "Machakos",
  "Meru",
  "Migori",
  "Mombasa",
  "Nairobi",
  "Nakuru",
  "Nyamira",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Uasin Gishu",
  "West Pokot",
] as const;

export type OperationalArea = (typeof OPERATIONAL_AREAS)[number];
