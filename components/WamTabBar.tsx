import { MaterialIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useFonts } from "expo-font";
import {
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scaleFont, scaleHeight, scaleWidth } from "../lib/utils/responsive";
import { supabase } from "../lib/supabase";
import { fetchActiveOffers } from "../lib/services/leadDispatchService";

const GOLD = "#F5A623";
const BAR_BG = "#FFFFFF";
const LABEL_INACTIVE = "#64748B";
const ICON_INACTIVE = "#475569";
const BORDER = "#E8ECF0";

type TabKey = "dashboard" | "leads" | "registrations" | "profile";

const TAB_CONFIG: Record<
  TabKey,
  { title: string; icon: keyof typeof MaterialIcons.glyphMap }
> = {
  dashboard: { title: "Home", icon: "home" },
  leads: { title: "Leads", icon: "campaign" },
  registrations: { title: "Records", icon: "receipt-long" },
  profile: { title: "Profile", icon: "person" },
};

/** Approximate total height above safe area — for FAB / scroll padding */
export function getWamTabBarOffset(insetsBottom: number): number {
  return scaleHeight(72) + Math.max(insetsBottom, scaleHeight(10));
}

export function WamTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [offerCount, setOfferCount] = useState(0);
  const [fontsLoaded] = useFonts({
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? scaleHeight(12) : scaleHeight(8),
  );

  const refreshOfferCount = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setOfferCount(0);
      return;
    }
    const { offers } = await fetchActiveOffers(user.id);
    setOfferCount(offers.length);
  }, []);

  useEffect(() => {
    void refreshOfferCount();

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      channel = supabase
        .channel(`tab-bar-lead-offers-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "lead_offers",
            filter: `agent_id=eq.${user.id}`,
          },
          () => {
            void refreshOfferCount();
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refreshOfferCount]);

  // Refresh badge when switching tabs (e.g. after accepting an offer).
  useEffect(() => {
    void refreshOfferCount();
  }, [state.index, refreshOfferCount]);

  return (
    <View style={[styles.bar, { paddingBottom: bottomInset }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const key = route.name as TabKey;
        const config = TAB_CONFIG[key] ?? {
          title: route.name,
          icon: "circle" as const,
        };
        const showBadge = key === "leads" && offerCount > 0;

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
            accessibilityLabel={
              showBadge ? `${config.title}, ${offerCount} offers` : config.title
            }
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
          >
            <View style={styles.tabInner}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                <MaterialIcons
                  name={config.icon}
                  size={scaleWidth(focused ? 24 : 22)}
                  color={focused ? GOLD : ICON_INACTIVE}
                />
                {showBadge ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {offerCount > 9 ? "9+" : offerCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.label,
                  fontsLoaded && styles.labelFont,
                  focused && styles.labelActive,
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
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BAR_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingTop: scaleHeight(10),
    paddingHorizontal: scaleWidth(4),
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
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
    paddingVertical: scaleHeight(6),
    paddingHorizontal: scaleWidth(4),
    minHeight: scaleHeight(58),
  },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: scaleWidth(42),
    height: scaleWidth(42),
    borderRadius: scaleWidth(21),
    marginBottom: scaleHeight(2),
  },
  iconWrapActive: {
    backgroundColor: "rgba(245, 166, 35, 0.18)",
  },
  badge: {
    position: "absolute",
    top: scaleHeight(2),
    right: scaleWidth(0),
    minWidth: scaleWidth(16),
    height: scaleWidth(16),
    borderRadius: scaleWidth(8),
    backgroundColor: "#E60012",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scaleWidth(3),
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: scaleFont(9),
    fontFamily: "Inter_600SemiBold",
    lineHeight: scaleFont(11),
  },
  label: {
    fontSize: scaleFont(10),
    color: LABEL_INACTIVE,
    letterSpacing: 0.15,
  },
  labelFont: {
    fontFamily: "Inter_700Bold",
  },
  labelActive: {
    color: GOLD,
  },
});
