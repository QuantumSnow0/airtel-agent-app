import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

type InboundLeadsHubCardProps = {
  offerCount: number;
  assignedCount: number;
  isReceivingLeads: boolean;
  onPress: () => void;
  onToggleReceiving?: () => void;
};

export function InboundLeadsHubCard({
  offerCount,
  assignedCount,
  isReceivingLeads,
  onPress,
  onToggleReceiving,
}: InboundLeadsHubCardProps) {
  const hasOffers = offerCount > 0;

  return (
    <TouchableOpacity
      style={[styles.card, hasOffers && styles.cardUrgent]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, hasOffers && styles.iconWrapUrgent]}>
          <MaterialIcons
            name="campaign"
            size={scaleWidth(26)}
            color={hasOffers ? "#FFFFFF" : "#0066CC"}
          />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Inbound leads</Text>
          <Text style={styles.subtitle}>
            {hasOffers
              ? `${offerCount} new offer${offerCount > 1 ? "s" : ""} — respond now`
              : "Website customers routed to you"}
          </Text>
        </View>
        {hasOffers ? (
          <View style={styles.pulseBadge}>
            <Text style={styles.pulseBadgeText}>{offerCount}</Text>
          </View>
        ) : (
          <MaterialIcons name="chevron-right" size={scaleWidth(28)} color="#0066CC" />
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <MaterialIcons name="inbox" size={scaleWidth(16)} color="#E65100" />
          <Text style={styles.statText}>
            {offerCount} pending offer{offerCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statPill}>
          <MaterialIcons name="assignment-ind" size={scaleWidth(16)} color="#2E7D32" />
          <Text style={styles.statText}>
            {assignedCount} in progress
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.availabilityRow,
          isReceivingLeads ? styles.availabilityOn : styles.availabilityOff,
        ]}
        onPress={onToggleReceiving}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.availDot,
            isReceivingLeads ? styles.availDotOn : styles.availDotOff,
          ]}
        />
        <Text
          style={[
            styles.availabilityText,
            isReceivingLeads ? styles.availabilityTextOn : styles.availabilityTextOff,
          ]}
        >
          {isReceivingLeads
            ? "You are receiving leads"
            : "Not receiving — tap Profile to turn on"}
        </Text>
        <MaterialIcons
          name="settings"
          size={scaleWidth(16)}
          color={isReceivingLeads ? "#2E7D32" : "#888888"}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: scaleWidth(16),
    marginBottom: scaleHeight(16),
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    borderWidth: 1,
    borderColor: "#E3F2FD",
    shadowColor: "#0066CC",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUrgent: {
    borderColor: "#FFCC80",
    backgroundColor: "#FFFBF5",
    shadowColor: "#E65100",
    shadowOpacity: 0.12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(14),
  },
  iconWrap: {
    width: scaleWidth(48),
    height: scaleWidth(48),
    borderRadius: scaleWidth(14),
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(12),
  },
  iconWrapUrgent: {
    backgroundColor: "#E65100",
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: scaleFont(17),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginTop: scaleHeight(3),
    lineHeight: scaleFont(18),
  },
  pulseBadge: {
    minWidth: scaleWidth(32),
    height: scaleWidth(32),
    borderRadius: scaleWidth(16),
    backgroundColor: "#E65100",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(8),
  },
  pulseBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(15),
  },
  statsRow: {
    flexDirection: "row",
    gap: scaleWidth(8),
    marginBottom: scaleHeight(12),
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(6),
    backgroundColor: "#F5F7FA",
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(10),
  },
  statText: {
    flex: 1,
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    color: "#444444",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(8),
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(12),
  },
  availabilityOn: {
    backgroundColor: "#E8F5E9",
  },
  availabilityOff: {
    backgroundColor: "#F5F5F5",
  },
  availDot: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
  },
  availDotOn: {
    backgroundColor: "#2E7D32",
  },
  availDotOff: {
    backgroundColor: "#9E9E9E",
  },
  availabilityText: {
    flex: 1,
    fontSize: scaleFont(12),
    fontFamily: "Inter_500Medium",
  },
  availabilityTextOn: {
    color: "#2E7D32",
  },
  availabilityTextOff: {
    color: "#666666",
  },
});
