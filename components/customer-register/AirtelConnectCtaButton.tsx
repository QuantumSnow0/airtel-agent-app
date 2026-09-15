import { useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/constants/legal";
import { scaleFont, scaleHeight, scaleWidth } from "../../lib/utils/responsive";
import { AC } from "./airtelConnectRegisterStyles";

export type AirtelConnectCtaPhase = "idle" | "saving" | "disabled";

type Props = {
  phase: AirtelConnectCtaPhase;
  onPress: () => void;
  errorMessage?: string | null;
  /** Hides the support line to free vertical space while the keyboard is open. */
  compact?: boolean;
};

export function AirtelConnectCtaButton({
  phase,
  onPress,
  errorMessage,
  compact = false,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (phase === "disabled" || phase === "saving") return;
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const label = phase === "saving" ? "Saving…" : "Save & continue";

  const disabled = phase === "disabled" || phase === "saving";

  return (
    <View style={styles.wrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          style={({ pressed }) => [
            styles.button,
            disabled && styles.buttonDisabled,
            pressed && !disabled && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {phase === "saving" ? (
            <ActivityIndicator color="#FFFFFF" style={styles.spinner} />
          ) : (
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color="#FFFFFF"
              style={styles.icon}
            />
          )}
          <Text style={styles.label}>{label}</Text>
        </Pressable>
      </Animated.View>
      {compact ? null : (
        <Pressable
          onPress={() => void Linking.openURL(SUPPORT_PHONE_TEL)}
          style={styles.helpRow}
          accessibilityRole="link"
          accessibilityLabel={`Need help with Airtel Connect? Call ${SUPPORT_PHONE}`}
        >
          <MaterialIcons name="support-agent" size={16} color={AC.inkMuted} />
          <Text style={styles.helpText}>
            Need help with Airtel Connect?{" "}
            <Text style={styles.helpPhone}>Call {SUPPORT_PHONE}</Text>
          </Text>
        </Pressable>
      )}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <MaterialIcons name="error-outline" size={16} color="#DC2626" />
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {errorMessage}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: scaleHeight(4),
  },
  button: {
    backgroundColor: AC.red,
    borderRadius: scaleWidth(14),
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(20),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: AC.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonPressed: {
    opacity: 0.94,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  spinner: {
    marginRight: scaleWidth(10),
  },
  icon: {
    marginRight: scaleWidth(8),
  },
  label: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    letterSpacing: 0.2,
  },
  helpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(6),
    marginTop: scaleHeight(12),
    paddingVertical: scaleHeight(4),
  },
  helpText: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
    textAlign: "center",
    lineHeight: scaleFont(17),
  },
  helpPhone: {
    fontFamily: "Inter_600SemiBold",
    color: AC.red,
    textDecorationLine: "underline",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(6),
    marginTop: scaleHeight(10),
    backgroundColor: "#FEF2F2",
    borderRadius: scaleWidth(10),
    padding: scaleWidth(10),
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  error: {
    flex: 1,
    color: "#DC2626",
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
  },
});
