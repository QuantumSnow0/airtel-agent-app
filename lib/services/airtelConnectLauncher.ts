/**
 * Open Airtel Connect for KYC (v1).
 * Android: launch installed app via IntentLauncher (+ package visibility query).
 * iOS: Airtel Connect is Android-only — offer Play Store link.
 *
 * Future: pass lead id via deeplink when Airtel documents a URL scheme.
 */

import Constants from "expo-constants";
import * as IntentLauncher from "expo-intent-launcher";
import { Alert, Linking, Platform } from "react-native";

export const AIRTEL_CONNECT_PACKAGE = "com.airtel.airtelwork.africa";
export const AIRTEL_CONNECT_PLAY_STORE =
  `https://play.google.com/store/apps/details?id=${AIRTEL_CONNECT_PACKAGE}`;

export type AirtelConnectOpenResult = {
  launched: boolean;
  usedPlayStore: boolean;
};

async function openPlayStoreFallback(reason: "not_installed" | "expo_go") {
  if (reason === "expo_go") {
    Alert.alert(
      "Open Airtel Connect manually",
      "This shortcut only works in the installed WAM Apps APK (not Expo Go). Open Airtel Connect from your home screen to continue KYC.",
    );
    return;
  }
  Alert.alert(
    "Airtel Connect not installed",
    "Install Airtel Connect from the Play Store, then try again.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Play Store",
        onPress: () => {
          void Linking.openURL(AIRTEL_CONNECT_PLAY_STORE);
        },
      },
    ],
  );
}

export async function openAirtelConnectForKyc(
  _leadId?: string,
): Promise<AirtelConnectOpenResult> {
  if (Platform.OS !== "android") {
    await openPlayStoreFallback("not_installed");
    return { launched: false, usedPlayStore: true };
  }

  // Expo Go cannot declare package visibility for Airtel Connect.
  if (Constants.appOwnership === "expo") {
    await openPlayStoreFallback("expo_go");
    return { launched: false, usedPlayStore: true };
  }

  try {
    await IntentLauncher.startActivityAsync("android.intent.action.MAIN", {
      category: "android.intent.category.LAUNCHER",
      packageName: AIRTEL_CONNECT_PACKAGE,
    });
    return { launched: true, usedPlayStore: false };
  } catch {
    await openPlayStoreFallback("not_installed");
    return { launched: false, usedPlayStore: true };
  }
}
