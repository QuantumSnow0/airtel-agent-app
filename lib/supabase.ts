import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
  console.warn(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — check airtel-agent-app/.env and restart Metro with --clear",
  );
}

// Custom storage adapter for React Native using AsyncStorage
const AsyncStorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error("Error reading from AsyncStorage:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Error writing to AsyncStorage:", error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error removing from AsyncStorage:", error);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // URL session detection is for web only — breaks Expo Go / native auth.
    detectSessionInUrl: Platform.OS === "web",
  },
});

/** Ensure a fresh access token for edge functions (verify_jwt = true). */
export async function getFunctionsAuthHeaders(): Promise<
  { Authorization: string } | { error: string }
> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return { error: error.message || "Could not read session" };
  }

  let accessToken = session?.access_token;

  if (!accessToken || (session?.expires_at && session.expires_at * 1000 < Date.now() + 30_000)) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session?.access_token) {
      return {
        error:
          refreshError?.message ||
          "Session expired. Sign out and sign in again.",
      };
    }
    accessToken = refreshed.session.access_token;
  }

  if (!accessToken) {
    return { error: "Not signed in. Sign out and sign in again." };
  }

  return { Authorization: `Bearer ${accessToken}` };
}
