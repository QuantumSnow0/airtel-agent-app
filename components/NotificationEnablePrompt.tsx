import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  enableNotificationsForAgent,
  getNotificationPermissionState,
  getNotificationSettingsInstructions,
  isExpoGo,
  type NotificationPermissionState,
} from "../lib/services/pushNotificationService";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

type NotificationEnablePromptProps = {
  visible: boolean;
  agentId?: string;
  onDismiss: () => void;
  onEnabled: () => void;
};

export function NotificationEnablePrompt({
  visible,
  agentId,
  onDismiss,
  onEnabled,
}: NotificationEnablePromptProps) {
  const [permissionState, setPermissionState] =
    useState<NotificationPermissionState>("undetermined");
  const [isWorking, setIsWorking] = useState(false);
  const [awaitingSettings, setAwaitingSettings] = useState(false);

  const refreshPermission = async () => {
    const state = await getNotificationPermissionState();
    setPermissionState(state);
    if (state === "granted") {
      setAwaitingSettings(false);
      onEnabled();
    }
  };

  useEffect(() => {
    if (!visible) return;
    void refreshPermission();
  }, [visible]);

  useEffect(() => {
    if (!visible || !awaitingSettings) return;

    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        void refreshPermission();
      }
    });
    return () => sub.remove();
  }, [visible, awaitingSettings]);

  const handleEnable = async () => {
    if (permissionState === "granted") {
      onEnabled();
      return;
    }

    setIsWorking(true);
    try {
      const result = await enableNotificationsForAgent(agentId);
      if (result === "granted") {
        setPermissionState("granted");
        onEnabled();
        return;
      }
      if (result === "settings_opened") {
        setAwaitingSettings(true);
        setPermissionState("denied");
        return;
      }
      await refreshPermission();
    } finally {
      setIsWorking(false);
    }
  };

  const settingsSteps = getNotificationSettingsInstructions();
  const alreadyGranted = permissionState === "granted";
  const needsSettings =
    !alreadyGranted && (permissionState === "denied" || awaitingSettings);
  const primaryLabel = alreadyGranted
    ? "Done"
    : needsSettings
      ? "Open settings"
      : "Turn on notifications";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.icon}>🔔</Text>
          <Text style={styles.title}>Stay in the loop</Text>
          <Text style={styles.body}>
            Notifications are optional, but we recommend turning them on so you
            never miss payments, registration updates, or new earnings even
            when the app is closed.
          </Text>

          <View style={styles.benefits}>
            <Text style={styles.benefitItem}>💸 Payment receipts</Text>
            <Text style={styles.benefitItem}>✅ Install & status updates</Text>
            <Text style={styles.benefitItem}>💰 Commission alerts</Text>
          </View>

          {alreadyGranted ? (
            <View style={styles.grantedBox}>
              <Text style={styles.grantedTitle}>Already allowed</Text>
              <Text style={styles.grantedText}>
                This device has already granted notification permission.
                {isExpoGo()
                  ? " Expo Go can show in-app alerts. Lock-screen push when the app is closed needs the installed WAM Apps APK, not Expo Go."
                  : " You should receive payment and status alerts."}
              </Text>
            </View>
          ) : isExpoGo() ? (
            <View style={styles.expoGoBox}>
              <Text style={styles.expoGoText}>
                On Expo Go, tap below to allow notifications (first time) or open
                Expo Go settings. Background push needs the installed WAM Apps
                build, not Expo Go.
              </Text>
            </View>
          ) : null}

          {needsSettings ? (
            <View style={styles.settingsBox}>
              <Text style={styles.settingsTitle}>Turn on in your phone settings</Text>
              <Text style={styles.settingsSteps}>{settingsSteps}</Text>
              {Platform.OS === "android" ? (
                <Text style={styles.settingsHint}>
                  On some phones: long-press the app icon → App info →
                  Notifications.
                </Text>
              ) : null}
            </View>
          ) : !alreadyGranted ? (
            <Text style={styles.softNote}>
              Tap below and allow notifications when your phone asks.
            </Text>
          ) : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleEnable}
            disabled={isWorking}
            activeOpacity={0.85}
          >
            {isWorking ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onDismiss}
            disabled={isWorking}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(24),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: scaleFont(32),
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  title: {
    fontSize: scaleFont(20),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  body: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#555555",
    textAlign: "center",
    lineHeight: scaleFont(21),
    marginBottom: scaleHeight(16),
  },
  benefits: {
    backgroundColor: "#F5F8FC",
    borderRadius: 10,
    padding: scaleHeight(12),
    marginBottom: scaleHeight(14),
    gap: scaleHeight(6),
  },
  expoGoBox: {
    backgroundColor: "#E8F4FD",
    borderWidth: 1,
    borderColor: "#90CAF9",
    borderRadius: 10,
    padding: scaleHeight(12),
    marginBottom: scaleHeight(14),
  },
  expoGoText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#1565C0",
    lineHeight: scaleFont(18),
  },
  grantedBox: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#A5D6A7",
    borderRadius: 10,
    padding: scaleHeight(12),
    marginBottom: scaleHeight(14),
  },
  grantedTitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#2E7D32",
    marginBottom: scaleHeight(6),
  },
  grantedText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#33691E",
    lineHeight: scaleFont(18),
  },
  benefitItem: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
  settingsBox: {
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: "#FFE082",
    borderRadius: 10,
    padding: scaleHeight(12),
    marginBottom: scaleHeight(14),
  },
  settingsTitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#5D4037",
    marginBottom: scaleHeight(6),
  },
  settingsSteps: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#444444",
    lineHeight: scaleFont(20),
  },
  settingsHint: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginTop: scaleHeight(8),
    lineHeight: scaleFont(18),
  },
  softNote: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#777777",
    textAlign: "center",
    marginBottom: scaleHeight(14),
  },
  primaryBtn: {
    backgroundColor: "#0066CC",
    borderRadius: 10,
    minHeight: scaleHeight(48),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(10),
  },
  primaryBtnText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(8),
  },
  secondaryBtnText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_500Medium",
    color: "#888888",
  },
});
