/**
 * Open Airtel Connect for KYC / registration handoff.
 * Matches the former dashboard test button: android-app:// URL via Linking,
 * Play Store fallback when the app is not installed.
 */

import * as Linking from "expo-linking";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const AIRTEL_CONNECT_PACKAGE = "com.airtel.airtelwork.africa";
export const AIRTEL_CONNECT_APP_URL = `android-app://${AIRTEL_CONNECT_PACKAGE}`;
export const AIRTEL_CONNECT_PLAY_STORE =
  `https://play.google.com/store/apps/details?id=${AIRTEL_CONNECT_PACKAGE}`;

export type AirtelConnectOpenResult = {
  launched: boolean;
  usedPlayStore: boolean;
};

/**
 * Attempt Airtel Connect launch; on failure open Play Store immediately.
 */
export async function openAirtelConnectOrPlayStore(): Promise<AirtelConnectOpenResult> {
  if (Platform.OS !== "android") {
    await Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
    return { launched: false, usedPlayStore: true };
  }

  if (Constants.appOwnership === "expo") {
    await Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
    return { launched: false, usedPlayStore: true };
  }

  try {
    const canOpen = await Linking.canOpenURL(AIRTEL_CONNECT_APP_URL);
    await Linking.openURL(
      canOpen ? AIRTEL_CONNECT_APP_URL : AIRTEL_CONNECT_PLAY_STORE,
    );
    return { launched: canOpen, usedPlayStore: !canOpen };
  } catch {
    await Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
    return { launched: false, usedPlayStore: true };
  }
}

/** @deprecated Use openAirtelConnectOrPlayStore — kept for dashboard test button. */
export async function openAirtelConnectForKyc(
  _leadId?: string,
): Promise<AirtelConnectOpenResult> {
  return openAirtelConnectOrPlayStore();
}
