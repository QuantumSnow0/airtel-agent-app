import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { scaleFont, scaleHeight, scaleWidth } from "@/lib/utils/responsive";
import { AC } from "./airtelConnectRegisterStyles";

export type HandoffModalPhase =
  | "hidden"
  | "saving"
  | "saved"
  | "launching"
  | "save_error"
  | "launch_error";

type Props = {
  phase: HandoffModalPhase;
  saveError?: string | null;
  launchError?: string | null;
  onRetryLaunch: () => void;
  onDismissError: () => void;
};

const SAVED_HOLD_MS = 1000;
const LAUNCH_DISPLAY_MS = 2000;

export function AirtelConnectHandoffModal({
  phase,
  saveError,
  launchError,
  onRetryLaunch,
  onDismissError,
}: Props) {
  const visible = phase !== "hidden";
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "saved") {
      checkScale.setValue(0);
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [phase, checkScale]);

  const checkScaleStyle = {
    transform: [
      {
        scale: checkScale.interpolate({
          inputRange: [0, 1],
          outputRange: [0.4, 1],
        }),
      },
    ],
    opacity: checkScale,
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (phase === "save_error" || phase === "launch_error") {
          onDismissError();
        }
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {phase === "saving" ? (
            <View style={styles.content}>
              <ActivityIndicator size="large" color={AC.red} />
              <Text style={styles.title}>Saving customer…</Text>
              <Text style={styles.subtitle}>
                Securing the registration before handoff
              </Text>
            </View>
          ) : null}

          {phase === "saved" ? (
            <View style={styles.content}>
              <Animated.View style={[styles.successIcon, checkScaleStyle]}>
                <MaterialIcons name="check" size={36} color="#FFFFFF" />
              </Animated.View>
              <Text style={styles.title}>Customer saved successfully</Text>
              <Text style={styles.subtitle}>
                Registration recorded in WAM Apps
              </Text>
            </View>
          ) : null}

          {phase === "launching" ? (
            <View style={styles.content}>
              <Image
                source={require("@/assets/images/airtelConnect.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Airtel Connect"
              />
              <Text style={styles.title}>Opening Airtel Connect…</Text>
              <Text style={styles.subtitle}>
                Complete KYC in the Airtel Connect app
              </Text>
              <ActivityIndicator
                size="small"
                color={AC.red}
                style={styles.launchLoader}
              />
            </View>
          ) : null}

          {phase === "save_error" ? (
            <View style={styles.content}>
              <View style={styles.errorIcon}>
                <MaterialIcons name="error-outline" size={32} color={AC.danger} />
              </View>
              <Text style={styles.title}>Could not save customer</Text>
              <Text style={styles.subtitle}>
                {saveError ?? "Please check your connection and try again."}
              </Text>
              <Pressable onPress={onDismissError} style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>Try again</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === "launch_error" ? (
            <View style={styles.content}>
              <Image
                source={require("@/assets/images/airtelConnect.png")}
                style={styles.logo}
                resizeMode="contain"
                accessibilityLabel="Airtel Connect"
              />
              <Text style={styles.title}>Customer saved</Text>
              <Text style={styles.subtitle}>
                {launchError ??
                  "Could not open Airtel Connect. You can retry or open it manually."}
              </Text>
              <Pressable onPress={onRetryLaunch} style={styles.primaryBtn}>
                <MaterialIcons name="open-in-new" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>Open Airtel Connect</Text>
              </Pressable>
              <Pressable onPress={onDismissError} style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>Close</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/** Delay before transitioning from saved → launching (exported for orchestration). */
export const HANDOFF_SAVED_HOLD_MS = SAVED_HOLD_MS;

/** Minimum time to show the Airtel Connect logo before opening the app. */
export const HANDOFF_LAUNCH_DISPLAY_MS = LAUNCH_DISPLAY_MS;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(28),
  },
  card: {
    width: "100%",
    maxWidth: scaleWidth(320),
    backgroundColor: AC.surface,
    borderRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(24),
    paddingVertical: scaleHeight(28),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  content: {
    alignItems: "center",
  },
  successIcon: {
    width: scaleWidth(64),
    height: scaleWidth(64),
    borderRadius: scaleWidth(32),
    backgroundColor: AC.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(16),
  },
  errorIcon: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(28),
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(14),
  },
  logo: {
    width: scaleWidth(88),
    height: scaleWidth(88),
    marginBottom: scaleHeight(16),
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(17),
    color: AC.ink,
    textAlign: "center",
    marginTop: scaleHeight(4),
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(13),
    color: AC.inkMuted,
    textAlign: "center",
    lineHeight: scaleFont(19),
    marginTop: scaleHeight(8),
    paddingHorizontal: scaleWidth(4),
  },
  launchLoader: {
    marginTop: scaleHeight(16),
  },
  actionBtn: {
    marginTop: scaleHeight(20),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(24),
    borderRadius: scaleWidth(10),
    borderWidth: 1,
    borderColor: AC.border,
  },
  actionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
    color: AC.ink,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    marginTop: scaleHeight(20),
    backgroundColor: AC.red,
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(13),
    paddingHorizontal: scaleWidth(20),
    alignSelf: "stretch",
  },
  primaryBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: "#FFFFFF",
  },
  textBtn: {
    marginTop: scaleHeight(12),
    paddingVertical: scaleHeight(8),
  },
  textBtnLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(13),
    color: AC.inkMuted,
  },
});
