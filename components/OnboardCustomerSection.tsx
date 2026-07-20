import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, Pattern, Rect } from "react-native-svg";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

function AirtelPattern() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="airtelDots"
            patternUnits="userSpaceOnUse"
            width={16}
            height={16}
          >
            <Circle cx={2} cy={2} r={1.6} fill="rgba(230,0,18,0.38)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="#160303" />
        <Rect width="100%" height="100%" fill="url(#airtelDots)" />
        <Circle cx="92%" cy="18%" r={56} fill="rgba(230,0,18,0.22)" />
        <Circle cx="78%" cy="88%" r={40} fill="rgba(255,60,60,0.12)" />
      </Svg>
    </View>
  );
}

function SafaricomPattern() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="safDots"
            patternUnits="userSpaceOnUse"
            width={16}
            height={16}
          >
            <Circle cx={2} cy={2} r={1.6} fill="rgba(0,166,81,0.35)" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="#03140A" />
        <Rect width="100%" height="100%" fill="url(#safDots)" />
        <Circle cx="8%" cy="20%" r={52} fill="rgba(0,166,81,0.2)" />
        <Circle cx="22%" cy="92%" r={36} fill="rgba(29,185,84,0.14)" />
      </Svg>
    </View>
  );
}

export function OnboardCustomerSection() {
  const router = useRouter();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Onboard customer</Text>

      <Pressable
        onPress={() => router.push("/register-customer" as any)}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        accessibilityRole="button"
        accessibilityLabel="Onboard Airtel customer"
      >
        <AirtelPattern />
        <View style={styles.tileRow}>
          <View style={styles.copyCol}>
            <Text style={styles.brandAirtel}>Airtel</Text>
            <Text style={styles.line}>5G home internet</Text>
            <Text style={styles.action}>
              Start registration
              <Text style={styles.arrow}> →</Text>
            </Text>
          </View>
          <Image
            source={require("../assets/images/routers/airtel-5g-router.png")}
            style={styles.router}
            resizeMode="contain"
          />
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.push("/register-safaricom-customer" as any)}
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        accessibilityRole="button"
        accessibilityLabel="Onboard Safaricom customer"
      >
        <SafaricomPattern />
        <View style={styles.tileRow}>
          <Image
            source={require("../assets/images/routers/safaricom-5g-router.png")}
            style={[styles.router, styles.routerLeft]}
            resizeMode="contain"
          />
          <View style={[styles.copyCol, styles.copyRight]}>
            <Text style={styles.brandSaf}>Safaricom</Text>
            <Text style={[styles.line, styles.lineRight]}>
              Fiber & portable 5G
            </Text>
            <Text style={[styles.action, styles.actionRight]}>
              Start registration
              <Text style={styles.arrow}> →</Text>
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(20),
    gap: scaleHeight(10),
  },
  sectionTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(18),
    color: "#111827",
    marginBottom: scaleHeight(2),
    paddingHorizontal: scaleWidth(2),
  },
  tile: {
    borderRadius: scaleWidth(4),
    overflow: "hidden",
    position: "relative",
  },
  tilePressed: {
    opacity: 0.94,
  },
  tileRow: {
    minHeight: scaleHeight(118),
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(14),
  },
  copyCol: {
    flex: 1,
    zIndex: 1,
    paddingRight: scaleWidth(4),
  },
  copyRight: {
    paddingRight: 0,
    paddingLeft: scaleWidth(4),
    alignItems: "flex-end",
  },
  brandAirtel: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(22),
    color: "#FF3B3B",
    letterSpacing: -0.3,
  },
  brandSaf: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(22),
    color: "#2EE06A",
    letterSpacing: -0.3,
    textAlign: "right",
  },
  line: {
    marginTop: scaleHeight(4),
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(13),
    color: "rgba(255,255,255,0.78)",
  },
  lineRight: {
    textAlign: "right",
  },
  action: {
    marginTop: scaleHeight(14),
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(13),
    color: "#FFFFFF",
  },
  actionRight: {
    textAlign: "right",
  },
  arrow: {
    color: "rgba(255,255,255,0.55)",
  },
  router: {
    width: scaleWidth(112),
    height: scaleHeight(96),
    zIndex: 1,
  },
  routerLeft: {
    marginRight: scaleWidth(2),
  },
});
