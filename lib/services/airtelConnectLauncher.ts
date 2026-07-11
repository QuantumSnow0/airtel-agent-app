/**
 * Open Airtel Connect for KYC (v1).
 * Android: launch app if installed, else Play Store.
 * iOS: Play Store link (Airtel Connect is Android-first).
 *
 * Future: pass lead id via deeplink when Airtel documents URL scheme.
 */

import { Linking, Platform } from "react-native";

export const AIRTEL_CONNECT_PACKAGE = "com.airtel.airtelwork.africa";
export const AIRTEL_CONNECT_PLAY_STORE =
  `https://play.google.com/store/apps/details?id=${AIRTEL_CONNECT_PACKAGE}`;

export type AirtelConnectOpenResult = {
  launched: boolean;
  usedPlayStore: boolean;
};

export async function openAirtelConnectForKyc(
  _leadId?: string,
): Promise<AirtelConnectOpenResult> {
  // v2: append lead ref to intent when deeplink spec is available
  if (Platform.OS === "android") {
    const intentUrl =
      `intent://#Intent;package=${AIRTEL_CONNECT_PACKAGE};` +
      `action=android.intent.action.MAIN;` +
      `category=android.intent.category.LAUNCHER;end`;

    try {
      await Linking.openURL(intentUrl);
      return { launched: true, usedPlayStore: false };
    } catch {
      await Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
      return { launched: false, usedPlayStore: true };
    }
  }

  await Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
  return { launched: false, usedPlayStore: true };
}
