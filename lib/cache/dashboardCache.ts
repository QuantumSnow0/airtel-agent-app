import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEYS = {
  DASHBOARD_DATA: "cached_dashboard_data",
  CACHE_TIMESTAMP: "cached_dashboard_data_timestamp",
};

export interface CachedDashboardData {
  agentData: any;
  balance: number;
  totalRegistered: number;
  totalInstalled: number;
  premiumRegistered?: number;
  standardRegistered?: number;
  premiumInstalled?: number;
  standardInstalled?: number;
  recentRegistrations: any[];
  timestamp: number;
}

/**
 * Save dashboard data to cache
 */
export const saveDashboardDataToCache = async (
  data: Omit<CachedDashboardData, "timestamp">
): Promise<void> => {
  try {
    const cacheData: CachedDashboardData = {
      ...data,
      timestamp: Date.now(),
    };
    await AsyncStorage.multiSet([
      [CACHE_KEYS.DASHBOARD_DATA, JSON.stringify(cacheData)],
      [CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString()],
    ]);
  } catch (error) {
    console.error("Error saving dashboard data to cache:", error);
    // Don't throw - caching is not critical
  }
};

/**
 * Get cached dashboard data
 */
export const getCachedDashboardData = async (): Promise<CachedDashboardData | null> => {
  try {
    const [cachedData] = await AsyncStorage.multiGet([
      CACHE_KEYS.DASHBOARD_DATA,
    ]);

    const dataString = cachedData[1];

    if (!dataString) {
      return null;
    }

    const dashboardData: CachedDashboardData = JSON.parse(dataString);
    return dashboardData;
  } catch (error) {
    console.error("Error reading cached dashboard data:", error);
    return null;
  }
};

/**
 * Clear cached dashboard data
 */
export const clearDashboardDataCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.DASHBOARD_DATA,
      CACHE_KEYS.CACHE_TIMESTAMP,
    ]);
  } catch (error) {
    console.error("Error clearing dashboard data cache:", error);
    // Don't throw - cache clearing is not critical
  }
};

