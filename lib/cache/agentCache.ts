import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEYS = {
  AGENT_DATA: "cached_agent_data",
  CACHE_TIMESTAMP: "cached_agent_data_timestamp",
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface CachedAgentData {
  id: string;
  email: string;
  name: string;
  airtel_phone: string | null;
  safaricom_phone: string | null;
  town: string | null;
  area: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save agent data to cache
 */
export const saveAgentDataToCache = async (
  agentData: CachedAgentData
): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEYS.AGENT_DATA, JSON.stringify(agentData)],
      [CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString()],
    ]);
  } catch (error) {
    console.error("Error saving agent data to cache:", error);
    // Don't throw - caching is not critical
  }
};

/**
 * Get cached agent data if it exists and is not expired
 */
export const getCachedAgentData = async (): Promise<CachedAgentData | null> => {
  try {
    const [cachedData, timestamp] = await AsyncStorage.multiGet([
      CACHE_KEYS.AGENT_DATA,
      CACHE_KEYS.CACHE_TIMESTAMP,
    ]);

    const dataString = cachedData[1];
    const timestampString = timestamp[1];

    if (!dataString || !timestampString) {
      return null;
    }

    const cacheAge = Date.now() - parseInt(timestampString, 10);

    // Check if cache is expired
    if (cacheAge > CACHE_DURATION) {
      // Cache expired - clear it
      await clearAgentDataCache();
      return null;
    }

    const agentData: CachedAgentData = JSON.parse(dataString);
    return agentData;
  } catch (error) {
    console.error("Error reading cached agent data:", error);
    return null;
  }
};

/**
 * Clear cached agent data
 */
export const clearAgentDataCache = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      CACHE_KEYS.AGENT_DATA,
      CACHE_KEYS.CACHE_TIMESTAMP,
    ]);
  } catch (error) {
    console.error("Error clearing agent data cache:", error);
    // Don't throw - cache clearing is not critical
  }
};

/**
 * Check if cached data exists and is valid
 */
export const hasValidCache = async (): Promise<boolean> => {
  const cachedData = await getCachedAgentData();
  return cachedData !== null;
};

