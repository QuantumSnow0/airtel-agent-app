import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AppNotification } from "../lib/notifications/types";
import {
  formatNotificationDisplay,
  formatTimeAgo,
  getNotificationVisual,
} from "../lib/notifications/presentation";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

type NotificationCardProps = {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
};

export function NotificationCard({
  notification,
  onPress,
}: NotificationCardProps) {
  const visual = getNotificationVisual(notification);
  const display = formatNotificationDisplay(notification);
  const isUnread = !notification.isRead;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isUnread ? styles.cardUnread : styles.cardRead,
        visual.urgent && isUnread && styles.cardUrgent,
        { borderLeftColor: isUnread ? visual.accent : "#E4E8EC" },
      ]}
      onPress={() => onPress(notification)}
      activeOpacity={0.82}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: visual.softBg }]}
      >
        <MaterialIcons
          name={visual.icon}
          size={scaleWidth(22)}
          color={visual.accent}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={2}>
              {display.title}
            </Text>
            {display.subtitle ? (
              <Text style={[styles.subtitle, { color: visual.accent }]} numberOfLines={1}>
                {display.subtitle}
              </Text>
            ) : null}
          </View>
          {isUnread ? (
            <View style={[styles.unreadDot, { backgroundColor: visual.accent }]} />
          ) : null}
        </View>

        <Text style={styles.message} numberOfLines={3}>
          {display.message}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>
          <View style={[styles.badge, { backgroundColor: visual.softBg }]}>
            {visual.urgent ? (
              <MaterialIcons
                name="priority-high"
                size={scaleWidth(12)}
                color={visual.accent}
                style={styles.badgeIcon}
              />
            ) : null}
            <Text style={[styles.badgeText, { color: visual.accent }]}>
              {visual.label}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(12),
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(14),
    padding: scaleWidth(14),
    marginBottom: scaleHeight(10),
    borderWidth: 1,
    borderColor: "#EEF1F4",
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: {
    backgroundColor: "#FAFCFF",
  },
  cardRead: {
    opacity: 0.92,
  },
  cardUrgent: {
    borderColor: "#FFE0B2",
    shadowOpacity: 0.08,
  },
  iconWrap: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(14),
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(8),
    marginBottom: scaleHeight(4),
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: scaleFont(15),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A2233",
    lineHeight: scaleFont(21),
  },
  subtitle: {
    marginTop: scaleHeight(2),
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
  },
  unreadDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
    marginTop: scaleHeight(6),
  },
  message: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#5C6678",
    lineHeight: scaleFont(19),
    marginBottom: scaleHeight(10),
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scaleWidth(8),
  },
  time: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_400Regular",
    color: "#8B95A5",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: scaleWidth(20),
    maxWidth: "55%",
  },
  badgeIcon: {
    marginRight: scaleWidth(2),
  },
  badgeText: {
    fontSize: scaleFont(10),
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
