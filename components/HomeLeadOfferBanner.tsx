import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

type HomeLeadOfferBannerProps = {
  offerCount: number;
};

export function HomeLeadOfferBanner({ offerCount }: HomeLeadOfferBannerProps) {
  const router = useRouter();
  if (offerCount <= 0) return null;

  const label =
    offerCount === 1
      ? "1 offer waiting"
      : `${offerCount} offers waiting`;

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
      onPress={() => router.navigate("/leads" as any)}
      accessibilityRole="button"
      accessibilityLabel={`${label}. Open leads.`}
    >
      <View style={styles.iconWrap}>
        <MaterialIcons name="campaign" size={scaleWidth(18)} color="#C2410C" />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{label}</Text>
        <Text style={styles.sub}>Tap to review and accept</Text>
      </View>
      <MaterialIcons name="chevron-right" size={scaleWidth(22)} color="#FB923C" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(12),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FDBA74",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(12),
  },
  pressed: {
    opacity: 0.88,
  },
  iconWrap: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(10),
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: "#9A3412",
  },
  sub: {
    marginTop: scaleHeight(1),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    color: "#C2410C",
  },
});
