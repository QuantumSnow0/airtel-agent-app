import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISS_KEY = "notification_enable_prompt_dismissed_at";

/** Re-prompt after this many days if notifications are still off. */
const REMIND_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export async function shouldShowNotificationPrompt(): Promise<boolean> {
  try {
    const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
    if (!dismissed) return true;
    const dismissedAt = Number.parseInt(dismissed, 10);
    if (!Number.isFinite(dismissedAt)) return true;
    return Date.now() - dismissedAt > REMIND_AFTER_MS;
  } catch {
    return true;
  }
}

export async function dismissNotificationPrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Non-critical
  }
}
