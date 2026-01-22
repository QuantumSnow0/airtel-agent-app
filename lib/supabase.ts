import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase configuration - Replace with your actual Supabase URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Custom storage adapter for React Native using AsyncStorage
// Includes error handling to prevent session loss on force close
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error("Error reading from AsyncStorage:", error);
      // Return null on error to prevent app crash, but session might be lost
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Error writing to AsyncStorage:", error);
      // Don't throw - session persistence failure shouldn't crash app
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from AsyncStorage:", error);
      // Don't throw - cleanup failure shouldn't crash app
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Enable to auto-process password reset links from URL
  },
});

