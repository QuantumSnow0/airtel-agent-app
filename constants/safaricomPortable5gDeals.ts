/** One-off device price (Portable 5G). */
export const PORTABLE_5G_DEVICE_PRICE_LABEL = "Ksh 2,999";

/** Monthly / plan speeds for Safaricom Portable 5G. */
export const SAFARICOM_PORTABLE_5G_DEALS = [
  { id: "portable_15", speedLabel: "15 Mbps", priceLabel: "Ksh 2,999" },
  { id: "portable_50", speedLabel: "50 Mbps", priceLabel: "Ksh 4,000" },
  { id: "portable_100", speedLabel: "100 Mbps", priceLabel: "Ksh 5,000" },
  { id: "portable_250", speedLabel: "250 Mbps", priceLabel: "Ksh 10,000" },
] as const;

export type Portable5gDealId = (typeof SAFARICOM_PORTABLE_5G_DEALS)[number]["id"];

export const PORTABLE_5G_DEAL_IDS = SAFARICOM_PORTABLE_5G_DEALS.map((d) => d.id);
