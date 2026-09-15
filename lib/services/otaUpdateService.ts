import { useEffect } from "react";
import * as Updates from "expo-updates";

function canApplyOta(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

async function reloadIfPending(): Promise<boolean> {
  if (Updates.latestContext.isUpdatePending) {
    await Updates.reloadAsync();
    return true;
  }
  return false;
}

/**
 * Apply a published EAS Update if one is waiting.
 * No-op in Expo Go, dev client without updates, and when the native
 * binary does not include expo-updates.
 */
export async function applyOtaUpdateIfAvailable(): Promise<boolean> {
  if (!canApplyOta()) return false;

  try {
    if (await reloadIfPending()) return true;

    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }

    // ON_LOAD may already have downloaded it; apply on this launch.
    return await reloadIfPending();
  } catch (error) {
    console.error("OTA update check failed:", error);
    try {
      return await reloadIfPending();
    } catch {
      return false;
    }
  }
}

/** Reload as soon as Expo finishes downloading an update in the background. */
export function useApplyPendingOtaUpdate(enabled: boolean) {
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (!enabled || !canApplyOta() || !isUpdatePending) return;
    void Updates.reloadAsync();
  }, [enabled, isUpdatePending]);
}
