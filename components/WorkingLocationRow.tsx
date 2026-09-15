import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  formatWorkingPlaceUpdatedAgo,
  parseGooglePlace,
} from "../lib/google-places/parseGooglePlace";
import { scaleFont, scaleHeight, scaleWidth } from "../lib/utils/responsive";

type WorkingLocationRowProps = {
  workingPlace: unknown;
  updatedAt: string | null | undefined;
  onUpdate: () => void;
};

export function WorkingLocationRow({
  workingPlace,
  updatedAt,
  onUpdate,
}: WorkingLocationRowProps) {
  const place = parseGooglePlace(workingPlace);

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.label}>Working location</Text>
        <Text style={styles.name} numberOfLines={2}>
          {place?.name ?? "Not set"}
        </Text>
        <Text style={styles.updated}>
          {formatWorkingPlaceUpdatedAgo(updatedAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={onUpdate}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>{place ? "Update" : "Set"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(12),
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(12),
    marginBottom: scaleHeight(16),
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  copy: {
    flex: 1,
    marginRight: scaleWidth(12),
  },
  label: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_500Medium",
    color: "#64748B",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: scaleHeight(2),
  },
  name: {
    fontSize: scaleFont(15),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  updated: {
    marginTop: scaleHeight(2),
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  button: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(8),
    borderRadius: scaleWidth(8),
    backgroundColor: "#E8F1FC",
  },
  buttonText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
  },
});
