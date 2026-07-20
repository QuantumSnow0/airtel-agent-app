import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getWamTabBarOffset } from "./WamTabBar";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

function Bone({
  width,
  height,
  radius = 8,
  style,
  pulse,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: object;
  pulse: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: "#E2E8F0",
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Full Home screen placeholder while agent/dashboard data loads. */
export function HomeDashboardSkeleton() {
  const insets = useSafeAreaInsets();
  const tabBarClearance = getWamTabBarOffset(insets.bottom);
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.container} accessibilityLabel="Loading home">
      <View
        style={[
          styles.topHeader,
          {
            paddingTop: insets.top + scaleHeight(12),
            borderTopLeftRadius: scaleWidth(20),
            borderTopRightRadius: scaleWidth(20),
          },
        ]}
      >
        <View style={styles.topHeaderRow}>
          <View style={styles.brandRow}>
            <Text style={styles.brandWam}>WAM</Text>
            <Text style={styles.brandApps}>APPS</Text>
          </View>
          <View style={styles.headerBones}>
            <Bone width={scaleWidth(28)} height={scaleWidth(28)} radius={14} pulse={pulse} />
            <Bone width={scaleWidth(28)} height={scaleWidth(28)} radius={14} pulse={pulse} />
            <Bone width={scaleWidth(40)} height={scaleWidth(40)} radius={20} pulse={pulse} />
          </View>
        </View>
      </View>

      <View
        style={[
          styles.body,
          { paddingBottom: tabBarClearance + scaleHeight(16) },
        ]}
      >
        <View style={styles.welcomeRow}>
          <View style={{ flex: 1, gap: scaleHeight(8) }}>
            <Bone width="55%" height={scaleHeight(14)} pulse={pulse} />
            <Bone width="40%" height={scaleHeight(22)} pulse={pulse} />
          </View>
          <Bone width={scaleWidth(120)} height={scaleHeight(32)} radius={16} pulse={pulse} />
        </View>

        <Bone
          width="100%"
          height={scaleHeight(200)}
          radius={scaleWidth(16)}
          style={styles.carousel}
          pulse={pulse}
        />
        <View style={styles.dots}>
          <Bone width={scaleWidth(7)} height={scaleWidth(7)} radius={4} pulse={pulse} />
          <Bone width={scaleWidth(18)} height={scaleWidth(7)} radius={4} pulse={pulse} />
          <Bone width={scaleWidth(7)} height={scaleWidth(7)} radius={4} pulse={pulse} />
        </View>

        <Bone
          width="45%"
          height={scaleHeight(16)}
          style={{ marginBottom: scaleHeight(12) }}
          pulse={pulse}
        />
        <View style={styles.onboardRow}>
          <Bone
            width="48%"
            height={scaleHeight(88)}
            radius={scaleWidth(12)}
            pulse={pulse}
          />
          <Bone
            width="48%"
            height={scaleHeight(88)}
            radius={scaleWidth(12)}
            pulse={pulse}
          />
        </View>

        <Bone
          width="100%"
          height={scaleHeight(64)}
          radius={scaleWidth(4)}
          style={{ marginBottom: scaleHeight(18) }}
          pulse={pulse}
        />

        <View style={styles.activitiesHeader}>
          <Bone width="35%" height={scaleHeight(18)} pulse={pulse} />
          <Bone width={scaleWidth(56)} height={scaleHeight(14)} pulse={pulse} />
        </View>
        <View style={styles.chipRow}>
          {[64, 78, 56, 72].map((w, i) => (
            <Bone
              key={i}
              width={scaleWidth(w)}
              height={scaleHeight(28)}
              radius={scaleWidth(14)}
              pulse={pulse}
            />
          ))}
        </View>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.activityRow}>
            <Bone
              width={scaleWidth(36)}
              height={scaleWidth(36)}
              radius={18}
              pulse={pulse}
            />
            <View style={styles.activityCopy}>
              <Bone width="70%" height={scaleHeight(12)} pulse={pulse} />
              <Bone width="45%" height={scaleHeight(10)} pulse={pulse} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  topHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleHeight(12),
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: scaleWidth(4),
  },
  brandWam: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(20),
    color: "#E30613",
  },
  brandApps: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
    color: "#1A1A1A",
  },
  headerBones: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(12),
  },
  body: {
    paddingHorizontal: scaleWidth(8),
    paddingTop: scaleHeight(16),
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(16),
    paddingHorizontal: scaleWidth(8),
    gap: scaleWidth(12),
  },
  carousel: {
    marginBottom: scaleHeight(10),
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: scaleWidth(6),
    marginBottom: scaleHeight(18),
  },
  onboardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: scaleHeight(18),
  },
  activitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleHeight(12),
    paddingHorizontal: scaleWidth(2),
  },
  chipRow: {
    flexDirection: "row",
    gap: scaleWidth(8),
    marginBottom: scaleHeight(14),
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(12),
    marginBottom: scaleHeight(14),
  },
  activityCopy: {
    flex: 1,
    gap: scaleHeight(6),
  },
});
