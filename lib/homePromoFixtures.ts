export type HomePromoCtaAction =
  | "register_safaricom"
  | "register_airtel"
  | "leads";

export type HomePromoSlide = {
  id: string;
  /** Local require() asset (fixtures). */
  image?: number;
  /** Remote URL from admin-managed promos. */
  imageUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel: string;
  ctaAction: HomePromoCtaAction;
};

/** Fallback when no active admin promos. */
export const HOME_PROMO_FIXTURES: HomePromoSlide[] = [
  {
    id: "1",
    image: require("../assets/images/carousel1.jpg"),
    title: "Grow with Safaricom",
    subtitle: "Earn more when you register new customers.",
    ctaLabel: "Onboard",
    ctaAction: "register_safaricom",
  },
  {
    id: "2",
    image: require("../assets/images/carousel2.jpg"),
    title: "Airtel registrations",
    subtitle: "Submit customers in minutes from the app.",
    ctaLabel: "Onboard",
    ctaAction: "register_airtel",
  },
  {
    id: "3",
    image: require("../assets/images/carousel3.webp"),
    title: "Inbound leads",
    subtitle: "Website customers routed straight to you.",
    ctaLabel: "View leads",
    ctaAction: "leads",
  },
];
