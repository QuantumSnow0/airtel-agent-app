import { useCallback, useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";
import { promptNotificationDetail } from "../lib/notifications/notificationDetailBridge";
import { openExternalNotificationUrl } from "../lib/notifications/openNotificationAction";
import {
  fetchHomeSpotlightItem,
  markNotificationRead,
  themeFromAccent,
  type HomeActionKind,
  type HomeSpotlightItem,
} from "../lib/notifications/homeSpotlight";

const KIND_THEME: Record<
  HomeActionKind,
  {
    label: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    accent: string;
    ink: string;
    iconTile: string;
    iconColor: string;
  }
> = {
  meeting: {
    label: "Meeting",
    icon: "videocam",
    accent: "#2F80ED",
    ink: "#0B2C4A",
    iconTile: "#E8F1FF",
    iconColor: "#5B8DEF",
  },
  urgent: {
    label: "Urgent",
    icon: "warning-amber",
    accent: "#E67E22",
    ink: "#7C2D12",
    iconTile: "#FEF3C7",
    iconColor: "#D97706",
  },
  announcement: {
    label: "Update",
    icon: "campaign",
    accent: "#334155",
    ink: "#0F172A",
    iconTile: "#F1F5F9",
    iconColor: "#475569",
  },
};

function WaveWash({ color, gradId }: { color: string; gradId: string }) {
  return (
    <View style={styles.waveWrap} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 220 160"
        preserveAspectRatio="xMaxYMax slice"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="0.4" stopColor={color} stopOpacity="0.22" />
            <Stop offset="1" stopColor={color} stopOpacity="0.42" />
          </LinearGradient>
        </Defs>
        <Path
          d="M40 160 C90 120 130 150 170 110 C200 85 210 60 220 40 L220 160 Z"
          fill={`url(#${gradId})`}
        />
        <Path
          d="M80 160 C120 135 160 155 190 125 C210 108 218 90 220 70 L220 160 Z"
          fill={color}
          opacity={0.16}
        />
      </Svg>
    </View>
  );
}

function TeamsWatermark() {
  const size = scaleWidth(92);
  return (
    <View style={styles.watermark} pointerEvents="none">
      <Svg width={size} height={size * 0.92} viewBox="0 0 96 88">
        <Ellipse cx="72" cy="28" rx="18" ry="16" fill="#7B83EB" opacity={0.95} />
        <Ellipse cx="84" cy="42" rx="10" ry="9" fill="#5059C9" opacity={0.9} />
        <Rect x="18" y="14" width="52" height="52" rx="10" fill="#4B53BC" />
        <Rect x="22" y="18" width="44" height="44" rx="8" fill="#5B5FC7" />
        <Path
          d="M38 28 h8 c7 0 12 4 12 11 0 6-4 10-10 11 l10 14 h-9 l-9-13 h-2 v13 h-8 V28 z m8 15 c3.2 0 5-1.8 5-4.5S49.2 34 46 34 h-8 v9 h8 z"
          fill="#FFFFFF"
        />
        <Circle cx="12" cy="48" r="11" fill="#7B83EB" />
        <Ellipse cx="12" cy="68" rx="14" ry="9" fill="#7B83EB" />
      </Svg>
    </View>
  );
}

function MetaRow({
  icon,
  label,
  tileBg,
  iconColor,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tileBg: string;
  iconColor: string;
}) {
  return (
    <View style={styles.metaRow}>
      <View style={[styles.metaIcon, { backgroundColor: tileBg }]}>
        <MaterialIcons name={icon} size={scaleWidth(15)} color={iconColor} />
      </View>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

type HomeActionSpotlightProps = {
  agentId?: string | null;
  refreshKey?: number;
  onResolved?: () => void;
};

export function HomeActionSpotlight({
  agentId,
  refreshKey = 0,
  onResolved,
}: HomeActionSpotlightProps) {
  const [item, setItem] = useState<HomeSpotlightItem | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!agentId) {
      setItem(null);
      return;
    }
    const next = await fetchHomeSpotlightItem(agentId);
    setItem(next);
  }, [agentId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshKey]);

  const clearItem = useCallback(
    async (notificationId: string) => {
      setItem(null);
      try {
        await markNotificationRead(notificationId);
        onResolved?.();
      } catch (e) {
        console.warn("HomeActionSpotlight mark read failed:", e);
        void reload();
      }
    },
    [onResolved, reload],
  );

  if (!item) return null;

  const theme = themeFromAccent(item.accentColor, KIND_THEME[item.kind]);
  const hasCustomAccent = Boolean(item.accentColor);
  const placeIcon = item.placeIcon;
  const showTeamsFallback =
    !item.logoUrl &&
    item.kind === "meeting" &&
    (item.placeLabel.toLowerCase().includes("teams") ||
      (item.actionUrl?.toLowerCase().includes("teams") ?? false));
  const washId = `wave-${item.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}-${theme.accent.replace("#", "")}`;
  const dismissCta = ["got it", "dismiss", "ok", "close"].includes(
    item.cta.trim().toLowerCase(),
  );

  const openDetail = () => {
    promptNotificationDetail({
      title: item.title,
      message: item.message,
      typeLabel: theme.label,
      accent: theme.accent,
      softBg: theme.iconTile,
      actionUrl: item.actionUrl,
      createdAt: item.createdAt,
    });
  };

  const onPrimary = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (item.actionUrl) {
        const result = await openExternalNotificationUrl(item.actionUrl);
        if (!result.ok) {
          openDetail();
          return;
        }
        await clearItem(item.id);
        return;
      }

      if (dismissCta) {
        await clearItem(item.id);
        return;
      }

      openDetail();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: hasCustomAccent ? theme.iconTile : "#FFFFFF",
          },
          hasCustomAccent
            ? {
                borderColor: theme.accent,
                borderWidth: 1.5,
              }
            : null,
        ]}
        key={`${item.id}-${theme.accent}`}
      >
        <View style={[styles.accent, { backgroundColor: theme.accent }]} />

        <View style={styles.inner}>
          <WaveWash color={theme.accent} gradId={washId} />
          {item.logoUrl ? (
            <Image
              source={{ uri: item.logoUrl }}
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={0}
            />
          ) : showTeamsFallback ? (
            <TeamsWatermark />
          ) : null}

          <View style={styles.header}>
            <View style={styles.kindRow}>
              <View
                style={[styles.kindDot, { backgroundColor: theme.accent }]}
              />
              <Text style={[styles.kindLabel, { color: theme.accent }]}>
                {theme.label.toUpperCase()}
              </Text>
              {item.extraCount > 0 ? (
                <Text style={styles.extraCount}>+{item.extraCount} more</Text>
              ) : null}
            </View>

            <TouchableOpacity
              onPress={() => void clearItem(item.id)}
              hitSlop={12}
              accessibilityLabel="Dismiss"
              disabled={busy}
            >
              <MaterialIcons name="close" size={scaleWidth(18)} color="#A0AEC0" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.ink }]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaBlock}>
            <MetaRow
              icon="schedule"
              label={item.whenLabel}
              tileBg="#FFFFFF"
              iconColor={theme.accent}
            />
            <MetaRow
              icon={placeIcon}
              label={item.placeLabel}
              tileBg="#FFFFFF"
              iconColor={theme.accent}
            />
          </View>

          <TouchableOpacity
            style={[styles.cta, { backgroundColor: theme.accent }]}
            onPress={() => void onPrimary()}
            activeOpacity={0.9}
            disabled={busy}
          >
            <MaterialIcons
              name={placeIcon}
              size={scaleWidth(18)}
              color="#FFFFFF"
            />
            <Text style={styles.ctaText}>{item.cta}</Text>
            <View style={styles.ctaSpacer} />
            <MaterialIcons
              name="arrow-forward"
              size={scaleWidth(18)}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: scaleWidth(8),
    marginBottom: scaleHeight(14),
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(18),
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: {
        elevation: 3,
      },
      default: {},
    }),
  },
  accent: {
    width: scaleWidth(8),
  },
  inner: {
    flex: 1,
    paddingHorizontal: scaleWidth(14),
    paddingTop: scaleHeight(12),
    paddingBottom: scaleHeight(12),
    overflow: "hidden",
  },
  waveWrap: {
    ...StyleSheet.absoluteFillObject,
    left: scaleWidth(40),
  },
  watermark: {
    position: "absolute",
    right: scaleWidth(-4),
    top: scaleHeight(28),
    opacity: 0.92,
  },
  logoImage: {
    position: "absolute",
    right: scaleWidth(8),
    top: scaleHeight(36),
    width: scaleWidth(78),
    height: scaleWidth(78),
    opacity: 0.95,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleHeight(8),
    zIndex: 1,
  },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(6),
  },
  kindDot: {
    width: scaleWidth(7),
    height: scaleWidth(7),
    borderRadius: scaleWidth(4),
  },
  kindLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(10),
    letterSpacing: 0.9,
  },
  extraCount: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(10),
    color: "#94A3B8",
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(18),
    lineHeight: scaleFont(26),
    marginBottom: scaleHeight(12),
    paddingRight: scaleWidth(72),
    zIndex: 1,
  },
  metaBlock: {
    gap: scaleHeight(8),
    marginBottom: scaleHeight(14),
    zIndex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(10),
  },
  metaIcon: {
    width: scaleWidth(28),
    height: scaleWidth(28),
    borderRadius: scaleWidth(8),
    alignItems: "center",
    justifyContent: "center",
  },
  metaText: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(13),
    color: "#6B7C8F",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(8),
    borderRadius: scaleWidth(14),
    paddingVertical: scaleHeight(13),
    paddingHorizontal: scaleWidth(14),
    zIndex: 1,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
    color: "#FFFFFF",
  },
  ctaSpacer: {
    flex: 1,
  },
});
