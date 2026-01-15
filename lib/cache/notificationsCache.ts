import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATIONS_CACHE_KEY = "cached_notifications";
const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes

export interface CachedNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  metadata?: any;
}

export interface CachedNotificationsData {
  notifications: CachedNotification[];
  timestamp: number;
}

/**
 * Save notifications to cache
 */
export async function saveNotificationsToCache(
  notifications: CachedNotification[]
): Promise<void> {
  try {
    const cacheData: CachedNotificationsData = {
      notifications,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      NOTIFICATIONS_CACHE_KEY,
      JSON.stringify(cacheData)
    );
    console.log("✅ Notifications cached successfully");
  } catch (error) {
    console.error("Error saving notifications to cache:", error);
  }
}

/**
 * Get cached notifications
 */
export async function getCachedNotifications(): Promise<CachedNotification[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(NOTIFICATIONS_CACHE_KEY);
    if (!cachedData) {
      return null;
    }

    const data: CachedNotificationsData = JSON.parse(cachedData);
    const now = Date.now();

    // Check if cache is expired
    if (now - data.timestamp > CACHE_EXPIRY_TIME) {
      console.log("⚠️ Notifications cache expired");
      return null;
    }

    console.log("✅ Loaded notifications from cache");
    return data.notifications;
  } catch (error) {
    console.error("Error getting cached notifications:", error);
    return null;
  }
}

/**
 * Clear notifications cache
 */
export async function clearNotificationsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATIONS_CACHE_KEY);
    console.log("✅ Notifications cache cleared");
  } catch (error) {
    console.error("Error clearing notifications cache:", error);
  }
}


