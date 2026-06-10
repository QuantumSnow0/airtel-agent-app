/** Home and Business Fibre — selectable plans (step 1). */
export const HOME_BUSINESS_FIBER_DEALS = [
  { id: "fiber_40", speedLabel: "40 Mbps", priceLabel: "Ksh 2,999" },
  { id: "fiber_60", speedLabel: "60 Mbps", priceLabel: "Ksh 4,100" },
  { id: "fiber_150", speedLabel: "150 Mbps", priceLabel: "Ksh 6,299" },
  { id: "fiber_500", speedLabel: "500 Mbps", priceLabel: "Ksh 12,499" },
  { id: "fiber_1000", speedLabel: "1,000 Mbps", priceLabel: "Ksh 20,000" },
] as const;

export type FiberDealId = (typeof HOME_BUSINESS_FIBER_DEALS)[number]["id"];

export const FIBER_DEAL_IDS = HOME_BUSINESS_FIBER_DEALS.map((d) => d.id);
