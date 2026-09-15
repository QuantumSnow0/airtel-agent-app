import { supabase } from "../supabase";
import type { HomePromoCtaAction, HomePromoSlide } from "../homePromoFixtures";

type HomePromoRow = {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  cta_label: string;
  cta_action: string;
  sort_order: number;
};

function isCtaAction(value: string): value is HomePromoCtaAction {
  return (
    value === "register_safaricom" ||
    value === "register_airtel" ||
    value === "leads"
  );
}

export type HomePromosFetchResult = {
  slides: HomePromoSlide[];
  /** False when the request failed — empty then does not mean "no promos". */
  ok: boolean;
};

/** Active admin promos. `ok: true` and empty slides means the backend has none. */
export async function fetchHomePromos(): Promise<HomePromosFetchResult> {
  try {
    const { data, error } = await supabase
      .from("home_promos")
      .select(
        "id, title, subtitle, image_url, cta_label, cta_action, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      return { slides: [], ok: false };
    }

    const slides = ((data ?? []) as HomePromoRow[])
      .filter((row) => isCtaAction(row.cta_action) && !!row.image_url)
      .map((row) => ({
        id: row.id,
        imageUrl: row.image_url,
        title: row.title ?? undefined,
        subtitle: row.subtitle ?? undefined,
        ctaLabel: row.cta_label || "Learn more",
        ctaAction: row.cta_action as HomePromoCtaAction,
      }));

    return { slides, ok: true };
  } catch {
    return { slides: [], ok: false };
  }
}
