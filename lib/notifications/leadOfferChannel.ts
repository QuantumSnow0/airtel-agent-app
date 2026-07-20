import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  ANDROID_LEAD_OFFER_CHANNEL_ID,
  LEGACY_LEAD_OFFER_CHANNEL_IDS,
  PUSH_LEAD_OFFER_SOUND_FILENAME,
} from "../config/leadAlertConfig";

/** Create v9 lead-offer channel with bundled lead_push_alert sound (heads-up + custom tone). */
export async function ensureAndroidLeadOfferChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  for (const legacyId of LEGACY_LEAD_OFFER_CHANNEL_IDS) {
    try {
      await Notifications.deleteNotificationChannelAsync(legacyId);
    } catch {
      // Channel may not exist.
    }
  }

  // Android cannot change channel sound after creation — always recreate.
  try {
    await Notifications.deleteNotificationChannelAsync(ANDROID_LEAD_OFFER_CHANNEL_ID);
  } catch {
    // Channel may not exist.
  }

  await Notifications.setNotificationChannelAsync(ANDROID_LEAD_OFFER_CHANNEL_ID, {
    name: "Lead offers",
    description: "Urgent new customer lead alerts",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400, 200, 600],
    lightColor: "#E53935",
    sound: PUSH_LEAD_OFFER_SOUND_FILENAME,
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.NOTIFICATION,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}
