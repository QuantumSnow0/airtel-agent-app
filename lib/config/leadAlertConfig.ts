/**
 * Lead-offer alert settings.
 *
 * To use a different sound:
 *   1. Add your file under assets/sounds/ (`.wav` recommended for Android)
 *   2. Set LEAD_OFFER_SOUND_FILENAME to match exactly (e.g. "my_alert.wav")
 *   3. Point LEAD_OFFER_SOUND_ASSET at the same file
 *   4. Update app.json → expo-notifications plugin → sounds array
 *   5. Rebuild the native app (custom OS notification sounds are bundled at build time)
 */

/** How often to re-ping while offer is pending (accept / decline / expiry). */
export const LEAD_OFFER_ALERT_INTERVAL_MS = 10_000;

/**
 * Filename bundled via app.json `expo-notifications.sounds`.
 * Must match the actual file name in assets/sounds/.
 */
export const LEAD_OFFER_SOUND_FILENAME = "lead_offer.wav";

/** In-app playback (expo-av) while the app is open. */
export const LEAD_OFFER_SOUND_ASSET = require("../../assets/sounds/lead_offer.wav");

/**
 * OS / push notification sound (background, killed app).
 * Must match app.json expo-notifications `sounds` and send-push-notification edge function.
 */
export const PUSH_LEAD_OFFER_SOUND_FILENAME = "lead_push_alert";

/** Android notification channel — bump suffix when sound/importance was poisoned on devices. */
export const ANDROID_LEAD_OFFER_CHANNEL_ID = "wam_lead_offers_v9";

export const LEGACY_LEAD_OFFER_CHANNEL_IDS = [
  "wam_lead_offers_v3",
  "wam_lead_offers_v5",
  "wam_lead_offers_v6",
  "wam_lead_offers_v7",
  "wam_lead_offers_v8",
] as const;
