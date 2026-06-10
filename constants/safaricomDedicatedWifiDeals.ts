/** Safaricom Dedicated WiFi — selectable speeds (step 1). */
export const SAFARICOM_DEDICATED_WIFI_DEALS = [
  { id: "dedicated_100", speedLabel: "100 Mbps", priceLabel: "Ksh 26,680" },
  { id: "dedicated_155", speedLabel: "155 Mbps", priceLabel: "Ksh 48,024" },
  { id: "dedicated_200", speedLabel: "200 Mbps", priceLabel: "Ksh 61,364" },
  { id: "dedicated_250", speedLabel: "250 Mbps", priceLabel: "Ksh 76,304.80" },
  { id: "dedicated_300", speedLabel: "300 Mbps", priceLabel: "Ksh 90,712" },
  { id: "dedicated_350", speedLabel: "350 Mbps", priceLabel: "Ksh 105,386" },
] as const;

export type DedicatedWifiDealId =
  (typeof SAFARICOM_DEDICATED_WIFI_DEALS)[number]["id"];

export const DEDICATED_WIFI_DEAL_IDS =
  SAFARICOM_DEDICATED_WIFI_DEALS.map((d) => d.id);
