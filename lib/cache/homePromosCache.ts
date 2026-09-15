import AsyncStorage from "@react-native-async-storage/async-storage";
import type { HomePromoSlide } from "../homePromoFixtures";

const CACHE_KEY = "cached_home_promos";

function isCacheable(slide: HomePromoSlide): boolean {
  return typeof slide.imageUrl === "string" && slide.imageUrl.length > 0;
}

export async function saveHomePromosToCache(
  slides: HomePromoSlide[],
): Promise<void> {
  try {
    const remote = slides.filter(isCacheable);
    if (remote.length === 0) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return;
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
  } catch (error) {
    console.error("Error saving home promos cache:", error);
  }
}

export async function clearHomePromosCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error("Error clearing home promos cache:", error);
  }
}

export async function getCachedHomePromos(): Promise<HomePromoSlide[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomePromoSlide[];
    const remote = parsed.filter(isCacheable);
    return remote.length > 0 ? remote : null;
  } catch (error) {
    console.error("Error reading home promos cache:", error);
    return null;
  }
}
