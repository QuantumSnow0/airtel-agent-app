import { useEffect } from "react";
import { BackHandler, StatusBar, StyleSheet, Text, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  applyOtaUpdateIfAvailable,
  useApplyPendingOtaUpdate,
} from "../lib/services/otaUpdateService";

/** Full-screen pause. No other route, button, or deep link is mounted behind it. */
export function ServiceUnavailableScreen() {
  useApplyPendingOtaUpdate(true);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    void applyOtaUpdateIfAvailable();
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fafafa" />
      <Text style={styles.title}>503 Service temporarily unavailable</Text>
      <Text style={styles.detail}>Please try again later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafafa",
    paddingHorizontal: 32,
  },
  title: {
    color: "#171717",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  detail: {
    marginTop: 8,
    color: "#737373",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
