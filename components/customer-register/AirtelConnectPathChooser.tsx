import { Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AirtelConnectEntryPath } from "@/lib/validation/airtelConnectRegistrationSchemas";
import { AC } from "./airtelConnectRegisterStyles";
import { scaleFont, scaleHeight, scaleWidth } from "@/lib/utils/responsive";

type Props = {
  variant?: "connect" | "legacy";
  onSelect: (path: AirtelConnectEntryPath) => void;
  onLegacyRegister?: () => void;
  onSubmitLead?: () => void;
  onBack: () => void;
};

export function AirtelConnectPathChooser({
  variant = "connect",
  onSelect,
  onLegacyRegister,
  onSubmitLead,
  onBack,
}: Props) {
  const isLegacy = variant === "legacy";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={AC.ink} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Airtel</Text>
          <Text style={styles.headerSub}>
            {isLegacy
              ? "Register to install, or submit a lead only"
              : "How are you registering this customer?"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        {isLegacy ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => onLegacyRegister?.()}
            activeOpacity={0.88}
          >
            <View style={[styles.iconWrap, { backgroundColor: AC.redSoft }]}>
              <MaterialIcons name="person-add" size={22} color={AC.red} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Full registration</Text>
              <Text style={styles.cardDesc}>
                You will install this customer. Enter details and complete the
                normal registration flow.
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={AC.inkMuted} />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelect("wam_first")}
              activeOpacity={0.88}
            >
              <View style={[styles.iconWrap, { backgroundColor: AC.redSoft }]}>
                <MaterialIcons name="smartphone" size={22} color={AC.red} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>WAM → Airtel Connect</Text>
                <Text style={styles.cardDesc}>
                  Enter customer details here, then open Airtel Connect for KYC.
                  Add the Airtel Connect Order ID afterward. It is required for
                  payment.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={AC.inkMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => onSelect("connect_first")}
              activeOpacity={0.88}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#ECFDF5" }]}>
                <MaterialIcons
                  name="assignment-turned-in"
                  size={22}
                  color={AC.success}
                />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Airtel Connect → WAM</Text>
                <Text style={styles.cardDesc}>
                  You already started in Airtel Connect. Enter the same customer
                  details here plus the Airtel Connect Order ID (needed for
                  payment).
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={AC.inkMuted} />
            </TouchableOpacity>
          </>
        )}

        {onSubmitLead ? (
          <>
            <View style={styles.separator} accessibilityRole="header">
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>Not an installer?</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity
              style={styles.card}
              onPress={onSubmitLead}
              activeOpacity={0.88}
            >
              <View style={[styles.iconWrap, { backgroundColor: "#EFF6FF" }]}>
                <MaterialIcons name="campaign" size={22} color="#2563EB" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Submit lead only</Text>
                <Text style={styles.cardDesc}>
                  Pass on a customer's interest. Nearby available agents will
                  get the offer to follow up and install.
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={AC.inkMuted} />
            </TouchableOpacity>
          </>
        ) : null}

        {!isLegacy ? (
          <Text style={styles.footNote}>
            Airtel Connect Order ID is the order reference from the Connect app.
            You need it for payment.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AC.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: AC.surface,
    borderBottomWidth: 1,
    borderBottomColor: AC.border,
  },
  backBtn: {
    width: scaleWidth(38),
    height: scaleWidth(38),
    borderRadius: scaleWidth(19),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AC.canvas,
    marginRight: scaleWidth(10),
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(18),
    color: AC.ink,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
    marginTop: scaleHeight(1),
  },
  body: {
    padding: scaleWidth(16),
    gap: scaleHeight(12),
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(12),
    backgroundColor: AC.surface,
    borderRadius: scaleWidth(14),
    borderWidth: 1,
    borderColor: AC.border,
    padding: scaleWidth(14),
  },
  iconWrap: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    color: AC.ink,
    marginBottom: scaleHeight(4),
  },
  cardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
    lineHeight: scaleFont(18),
  },
  footNote: {
    marginTop: scaleHeight(8),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: AC.inkFaint,
    lineHeight: scaleFont(18),
    paddingHorizontal: scaleWidth(4),
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(10),
    marginTop: scaleHeight(4),
    marginBottom: scaleHeight(2),
    paddingHorizontal: scaleWidth(2),
  },
  separatorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AC.border,
  },
  separatorText: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(12),
    color: AC.inkMuted,
  },
});
