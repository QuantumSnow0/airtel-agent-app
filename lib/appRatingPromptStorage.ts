import AsyncStorage from "@react-native-async-storage/async-storage";

const DISMISS_KEY = "app_rating_prompt_dismissed_at";
const SUBMITTED_KEY = "app_rating_submitted_at";
const SUBMITTED_SCORE_KEY = "app_rating_submitted_score";

/** Re-prompt after this many days if the agent has not rated yet. */
const REMIND_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export async function hasSubmittedAppRating(): Promise<boolean> {
  try {
    const submitted = await AsyncStorage.getItem(SUBMITTED_KEY);
    return Boolean(submitted);
  } catch {
    return false;
  }
}

export async function getSubmittedAppRatingScore(): Promise<number | null> {
  try {
    const score = await AsyncStorage.getItem(SUBMITTED_SCORE_KEY);
    if (!score) return null;
    const parsed = Number.parseInt(score, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function shouldShowAppRatingPrompt(): Promise<boolean> {
  try {
    if (await hasSubmittedAppRating()) return false;

    const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
    if (!dismissed) return true;

    const dismissedAt = Number.parseInt(dismissed, 10);
    if (!Number.isFinite(dismissedAt)) return true;

    return Date.now() - dismissedAt > REMIND_AFTER_MS;
  } catch {
    return true;
  }
}

export async function dismissAppRatingPrompt(): Promise<void> {
  try {
    await AsyncStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Non-critical
  }
}

export async function markAppRatingSubmitted(score: number): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [SUBMITTED_KEY, String(Date.now())],
      [SUBMITTED_SCORE_KEY, String(score)],
    ]);
  } catch {
    // Non-critical
  }
}
