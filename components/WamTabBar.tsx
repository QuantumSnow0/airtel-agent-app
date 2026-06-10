import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useFonts } from "expo-font";
import {
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scaleFont, scaleHeight, scaleWidth } from "../lib/utils/responsive";

const GOLD = "#F5A623";
const BAR_BG = "#FFFFFF";
const LABEL_INACTIVE = "#94A3B8";
const ICON_INACTIVE = "#64748B";

type TabKey = "dashboard" | "registrations" | "profile";

const TAB_CONFIG: Record<
  TabKey,
  { title: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  dashboard: { title: "Home", icon: "home" },
  registrations: { title: "Registrations", icon: "receipt-long" },
  profile: { title: "Profile", icon: "person" },
};

/** Approximate total height above safe area — for FAB / scroll padding */
export function getWamTabBarOffset(insetsBottom: number): number {
  return scaleHeight(76) + Math.max(insetsBottom, scaleHeight(10));
}

export function WamTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [fontsLoaded] = useFonts({
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? scaleHeight(10) : scaleHeight(6)
  );

  return (
    <View
      style={[styles.outer, { paddingBottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const key = route.name as TabKey;
          const config = TAB_CONFIG[key] ?? {
            title: route.name,
            icon: "circle" as const,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={config.title}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              <View style={styles.tabInner}>
                <View
                  style={[styles.iconWrap, focused && styles.iconWrapActive]}
                >
                  <MaterialIcons
                    name={config.icon}
                    size={scaleWidth(focused ? 23 : 22)}
                    color={focused ? GOLD : ICON_INACTIVE}
                  />
                </View>
                <Text
                  style={[
                    styles.label,
                    fontsLoaded && styles.labelFont,
                    focused && styles.labelActive,
                    fontsLoaded && focused && styles.labelActiveFont,
                  ]}
                  numberOfLines={1}
                >
                  {config.title}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(6),
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BAR_BG,
    borderRadius: scaleWidth(28),
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(6),
    borderWidth: 1,
    borderColor: "rgba(232, 236, 240, 0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#1A1A1A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
      default: {},
    }),
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleHeight(8),
    paddingHorizontal: scaleWidth(4),
    borderRadius: scaleWidth(22),
    minHeight: scaleHeight(56),
  },
  iconWrap: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(20),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(2),
  },
  iconWrapActive: {
    backgroundColor: "rgba(245, 166, 35, 0.18)",
  },
  label: {
    fontSize: scaleFont(9),
    color: LABEL_INACTIVE,
    letterSpacing: 0.2,
  },
  labelFont: {
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    color: GOLD,
  },
  labelActiveFont: {
    fontFamily: "Inter_600SemiBold",
  },
});
