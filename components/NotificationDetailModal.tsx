import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";
import { openExternalNotificationUrl } from "../lib/notifications/openNotificationAction";
import {
  subscribeToNotificationDetail,
  type NotificationDetailPayload,
} from "../lib/notifications/notificationDetailBridge";
import { formatTimeAgo } from "../lib/notifications/presentation";

/**
 * Global host for the custom notification detail sheet.
 * Mount once in root layout.
 */
export function NotificationDetailHost() {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<NotificationDetailPayload | null>(
    null,
  );
  const [opening, setOpening] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToNotificationDetail((next) => {
      setLinkError(null);
      setOpening(false);
      setPayload(next);
    });
  }, []);

  const visible = payload != null;
  const accent = payload?.accent ?? "#6A1B9A";
  const softBg = payload?.softBg ?? "#F3E5F5";

  const close = () => {
    setPayload(null);
    setLinkError(null);
    setOpening(false);
  };

  const openLink = async () => {
    if (!payload?.actionUrl) return;
    setOpening(true);
    setLinkError(null);
    const result = await openExternalNotificationUrl(payload.actionUrl);
    setOpening(false);
    if (!result.ok) {
      setLinkError(result.error ?? "Could not open this link.");
      return;
    }
    close();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={close} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, scaleHeight(16)) },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={[styles.typeChip, { backgroundColor: softBg }]}>
              <MaterialIcons
                name="campaign"
                size={scaleWidth(16)}
                color={accent}
              />
              <Text style={[styles.typeChipText, { color: accent }]}>
                {payload?.typeLabel ?? "Notification"}
              </Text>
            </View>
            {payload?.createdAt ? (
              <Text style={styles.time}>
                {formatTimeAgo(payload.createdAt)}
              </Text>
            ) : null}
          </View>

          <Text style={styles.title}>{payload?.title}</Text>

          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator
            bounces
          >
            <Text style={styles.message}>{payload?.message}</Text>
          </ScrollView>

          {payload?.actionUrl ? (
            <View style={styles.linkBox}>
              <MaterialIcons
                name="link"
                size={scaleWidth(16)}
                color="#0066CC"
              />
              <Text style={styles.linkText} numberOfLines={2}>
                {payload.actionUrl}
              </Text>
            </View>
          ) : null}

          {linkError ? (
            <Text style={styles.errorText}>{linkError}</Text>
          ) : null}

          {payload?.actionUrl ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => void openLink()}
              disabled={opening}
              activeOpacity={0.88}
            >
              {opening ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons
                    name="open-in-new"
                    size={scaleWidth(18)}
                    color="#FFFFFF"
                  />
                  <Text style={styles.primaryBtnText}>Open link</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={close}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdropDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(10),
    maxHeight: "88%",
  },
  handle: {
    alignSelf: "center",
    width: scaleWidth(40),
    height: scaleHeight(4),
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginBottom: scaleHeight(14),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scaleWidth(12),
    marginBottom: scaleHeight(12),
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(6),
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(5),
    borderRadius: scaleWidth(20),
  },
  typeChipText: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  time: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#8B95A5",
  },
  title: {
    fontSize: scaleFont(20),
    fontFamily: "Poppins_600SemiBold",
    color: "#0F172A",
    lineHeight: scaleFont(28),
    marginBottom: scaleHeight(12),
  },
  messageScroll: {
    maxHeight: scaleHeight(320),
    marginBottom: scaleHeight(14),
  },
  messageContent: {
    paddingBottom: scaleHeight(8),
  },
  message: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_400Regular",
    color: "#334155",
    lineHeight: scaleFont(24),
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(8),
    backgroundColor: "#F0F7FF",
    borderRadius: scaleWidth(12),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(12),
    borderWidth: 1,
    borderColor: "#D6E8FF",
  },
  linkText: {
    flex: 1,
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#0066CC",
    lineHeight: scaleFont(18),
  },
  errorText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#C62828",
    marginBottom: scaleHeight(10),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    backgroundColor: "#0066CC",
    borderRadius: scaleWidth(14),
    paddingVertical: scaleHeight(15),
    marginBottom: scaleHeight(8),
  },
  primaryBtnText: {
    fontSize: scaleFont(16),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(12),
  },
  secondaryBtnText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
    color: "#64748B",
  },
});
