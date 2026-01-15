import AsyncStorage from "@react-native-async-storage/async-storage";

const REGISTRATIONS_CACHE_KEY = "cached_registrations";
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

export interface CachedRegistration {
  id: string;
  customer_name: string;
  preferred_package?: string;
  installation_town?: string;
  status: string;
  created_at: string;
  ms_forms_response_id?: string;
  ms_forms_submitted_at?: string;
  syncStatus?: "synced" | "pending" | "not_synced";
}

export interface CachedRegistrationsData {
  registrations: CachedRegistration[];
  timestamp: number;
}

/**
 * Save registrations to cache
 */
export async function saveRegistrationsToCache(
  registrations: CachedRegistration[]
): Promise<void> {
  try {
    const cacheData: CachedRegistrationsData = {
      registrations,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      REGISTRATIONS_CACHE_KEY,
      JSON.stringify(cacheData)
    );
    console.log("✅ Registrations cached successfully");
  } catch (error) {
    console.error("Error saving registrations to cache:", error);
  }
}

/**
 * Get cached registrations
 */
export async function getCachedRegistrations(): Promise<CachedRegistration[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(REGISTRATIONS_CACHE_KEY);
    if (!cachedData) {
      return null;
    }

    const data: CachedRegistrationsData = JSON.parse(cachedData);
    const now = Date.now();

    // Check if cache is expired
    if (now - data.timestamp > CACHE_EXPIRY_TIME) {
      console.log("⚠️ Registrations cache expired");
      return null;
    }

    console.log("✅ Loaded registrations from cache");
    return data.registrations;
  } catch (error) {
    console.error("Error getting cached registrations:", error);
    return null;
  }
}

/**
 * Clear registrations cache
 */
export async function clearRegistrationsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(REGISTRATIONS_CACHE_KEY);
    console.log("✅ Registrations cache cleared");
  } catch (error) {
    console.error("Error clearing registrations cache:", error);
  }
}


