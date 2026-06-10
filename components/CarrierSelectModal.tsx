import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

type CarrierSelectModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectAirtel: () => void;
  onSelectSafaricom: () => void;
};

export function CarrierSelectModal({
  visible,
  onClose,
  onSelectAirtel,
  onSelectSafaricom,
}: CarrierSelectModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />
          <Text style={styles.title}>Register a customer</Text>
          <Text style={styles.subtitle}>
            Choose the network you are registering for
          </Text>

          <TouchableOpacity
            style={[styles.option, styles.optionAirtel]}
            activeOpacity={0.85}
            onPress={onSelectAirtel}
          >
            <View style={[styles.optionBadge, styles.badgeAirtel]}>
              <Text style={styles.badgeLetter}>A</Text>
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Airtel</Text>
              <Text style={styles.optionDesc}>SmartConnect registration</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, styles.optionSaf]}
            activeOpacity={0.85}
            onPress={onSelectSafaricom}
          >
            <View style={[styles.optionBadge, styles.badgeSaf]}>
              <Text style={styles.badgeLetter}>S</Text>
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Safaricom</Text>
              <Text style={styles.optionDesc}>Customer registration flow</Text>
            </View>
            <Text style={styles.chevronSaf}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const AIRTEL = "#E60012";
const SAF_GREEN = "#00A651";

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(24),
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: {
    alignSelf: "center",
    width: scaleWidth(40),
    height: scaleHeight(4),
    borderRadius: 2,
    backgroundColor: "#E8E8E8",
    marginBottom: scaleHeight(16),
  },
  title: {
    fontSize: scaleFont(22),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: scaleHeight(6),
  },
  subtitle: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: scaleFont(20),
    marginBottom: scaleHeight(22),
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: scaleWidth(14),
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(14),
    marginBottom: scaleHeight(12),
    borderWidth: 1,
  },
  optionAirtel: {
    backgroundColor: "#FFF5F5",
    borderColor: "rgba(230, 0, 18, 0.25)",
  },
  optionSaf: {
    backgroundColor: "#F4FBF7",
    borderColor: "rgba(0, 166, 81, 0.22)",
  },
  optionBadge: {
    width: scaleWidth(48),
    height: scaleWidth(48),
    borderRadius: scaleWidth(12),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(14),
  },
  badgeAirtel: {
    backgroundColor: AIRTEL,
  },
  badgeSaf: {
    backgroundColor: SAF_GREEN,
  },
  badgeLetter: {
    fontSize: scaleFont(20),
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: scaleFont(17),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#555555",
  },
  chevron: {
    fontSize: scaleFont(26),
    color: AIRTEL,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  chevronSaf: {
    fontSize: scaleFont(26),
    color: SAF_GREEN,
    fontFamily: "Inter_400Regular",
    marginTop: -2,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(12),
    marginTop: scaleHeight(4),
  },
  cancelText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
});
