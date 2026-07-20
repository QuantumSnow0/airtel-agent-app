import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PRIVACY_POLICY_URL } from "../constants/legal";

type Props = {
  checked: boolean;
  onToggle: () => void;
  carrierLabel?: string;
};

export function CustomerDataConsent({ checked, onToggle, carrierLabel }: Props) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      <Text style={styles.text}>
        The customer understands their details (name, phone, email, and installation
        address) will be collected to process a{" "}
        {carrierLabel ? `${carrierLabel} ` : ""}
        service request and may be shared with the relevant network partner. I have
        read the{" "}
        <Text
          style={styles.link}
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        >
          Privacy Policy
        </Text>
        .
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F0F6FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D6E4FF",
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#0066CC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  boxChecked: { backgroundColor: "#0066CC" },
  tick: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  text: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#444444",
    lineHeight: 20,
  },
  link: { color: "#0066CC", textDecorationLine: "underline" },
});
