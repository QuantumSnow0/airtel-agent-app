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
