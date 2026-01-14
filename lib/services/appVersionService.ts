import Constants from "expo-constants";
import { Platform, Linking } from "react-native";
import { supabase } from "../supabase";

interface VersionConfig {
  minimum_required_version: string;
  minimum_required_version_code: number | null;
  current_latest_version: string;
  current_latest_version_code: number | null;
  force_update: boolean;
  update_message: string | null;
  update_url_android: string | null;
  update_url_ios: string | null;
}

/**
 * Compare semantic versions (e.g., "1.0.0" vs "1.0.1")
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}

/**
 * Get current app version
 */
export function getCurrentAppVersion(): {
  version: string;
  versionCode: number | null;
} {
  const version = Constants.expoConfig?.version || "1.0.0";
  const versionCode =
    Platform.OS === "android"
      ? Constants.expoConfig?.android?.versionCode || null
      : null;

  return { version, versionCode };
}

/**
 * Check if app version meets minimum requirements
 */
export async function checkAppVersion(): Promise<{
  needsUpdate: boolean;
  isBlocked: boolean;
  config: VersionConfig | null;
  error?: string;
}> {
  try {
    // Get current app version
    const { version: currentVersion, versionCode: currentVersionCode } =
      getCurrentAppVersion();

    // Fetch version config from database
    const { data: configs, error } = await supabase
      .from("app_version_config")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching version config:", error);
      // If we can't fetch config, allow app to continue (don't block)
      return {
        needsUpdate: false,
        isBlocked: false,
        config: null,
        error: error.message,
      };
    }

    if (!configs) {
      // No config found, allow app to continue
      return {
        needsUpdate: false,
        isBlocked: false,
        config: null,
      };
    }

    const config = configs as VersionConfig;

    // If force_update is disabled, no blocking
    if (!config.force_update) {
      return {
        needsUpdate: false,
        isBlocked: false,
        config,
      };
    }

    // Compare versions
    const versionComparison = compareVersions(
      currentVersion,
      config.minimum_required_version
    );

    // Check if version is too old
    const isVersionOutdated = versionComparison < 0;

    // For Android, also check versionCode if available
    let isVersionCodeOutdated = false;
    if (
      Platform.OS === "android" &&
      currentVersionCode !== null &&
      config.minimum_required_version_code !== null
    ) {
      isVersionCodeOutdated =
        currentVersionCode < config.minimum_required_version_code;
    }

    const needsUpdate = isVersionOutdated || isVersionCodeOutdated;
    const isBlocked = needsUpdate && config.force_update;

    console.log("📱 Version check:", {
      currentVersion,
      currentVersionCode,
      minimumVersion: config.minimum_required_version,
      minimumVersionCode: config.minimum_required_version_code,
      needsUpdate,
      isBlocked,
    });

    return {
      needsUpdate,
      isBlocked,
      config,
    };
  } catch (error: any) {
    console.error("Error checking app version:", error);
    // On error, allow app to continue (don't block)
    return {
      needsUpdate: false,
      isBlocked: false,
      config: null,
      error: error.message,
    };
  }
}

/**
 * Open app store/play store for update
 */
export async function openAppStore(): Promise<void> {
  try {
    const { data: configs } = await supabase
      .from("app_version_config")
      .select("update_url_android, update_url_ios")
      .limit(1)
      .single();

    if (!configs) {
      console.error("No version config found");
      return;
    }

    const config = configs as {
      update_url_android: string | null;
      update_url_ios: string | null;
    };

    const url =
      Platform.OS === "ios"
        ? config.update_url_ios || "https://apps.apple.com"
        : config.update_url_android ||
          "https://play.google.com/store/apps/details?id=com.airtel.agents";

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      console.error("Cannot open URL:", url);
    }
  } catch (error) {
    console.error("Error opening app store:", error);
  }
}




