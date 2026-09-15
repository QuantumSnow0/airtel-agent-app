export type HomePromoCtaAction =
  | "register_safaricom"
  | "register_airtel"
  | "leads";

export type HomePromoSlide = {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  ctaLabel: string;
  ctaAction: HomePromoCtaAction;
};
