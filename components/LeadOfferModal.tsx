import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";
import type { LeadOffer, LeadOfferPreview } from "../lib/dispatch/types";
import { humanizePackageLabel } from "../lib/notifications/leadOfferCopy";
import { resolveLeadInstallDisplayKes } from "../lib/commissions/leadInstallCommission";
import {
  acceptLeadOffer,
  declineLeadOffer,
} from "../lib/services/leadOfferActionService";
import { PlaceMapPreview } from "./PlaceMapPreview";
import { getCachedAgentData } from "../lib/cache/agentCache";
import {
  formatDistanceFromYou,
  parseGooglePlace,
  pinDistanceKm,
} from "../lib/google-places/parseGooglePlace";
import { fetchDispatchConfig } from "../lib/services/leadDispatchService";

function offerDistanceLabel(km: number): string {
  const n = Number(km);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1) {
    const meters = Math.round(n * 1000);
    return meters < 1
      ? "About < 1 m from you"
      : `About ${meters} m from you`;
  }
  return formatDistanceFromYou(n);
}

const AIRTEL = "#E60012";
const SAFARICOM = "#00A651";
const INK = "#0F172A";
const MUTED = "#64748B";
const TRACK_H = scaleHeight(58);
const KNOB = scaleWidth(52);
const TRACK_PAD = scaleWidth(3);
const COMPLETE_RATIO = 0.82;

type LeadOfferModalProps = {
  visible: boolean;
  offer: LeadOffer | null;
  queueIndex?: number;
  queueTotal?: number;
  /** Tap outside / back — hides sheet; alert loop keeps pinging until accept or decline. */
  onDismiss: () => void;
  onExpired: () => void;
  onDeclined: () => void;
  onAccepted: (leadId: string) => void;
};

function formatCountdown(expiresAt: string): {
  label: string;
  urgent: boolean;
  expired: boolean;
} {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return { label: "0:00", urgent: true, expired: true };
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return {
    label: `${mins}:${secs.toString().padStart(2, "0")}`,
    urgent: mins < 5,
    expired: false,
  };
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function SwipeToAccept({
  brandColor,
  disabled,
  loading,
  expired,
  swipeLabel,
  onAccept,
}: {
  brandColor: string;
  disabled: boolean;
  loading: boolean;
  expired: boolean;
  swipeLabel: string;
  onAccept: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const dragX = useRef(new Animated.Value(0)).current;
  const completedRef = useRef(false);
  const maxXRef = useRef(0);
  const startXRef = useRef(0);
  const onAcceptRef = useRef(onAccept);
  const lockedRef = useRef(disabled || loading || expired);

  onAcceptRef.current = onAccept;
  lockedRef.current = disabled || loading || expired;

  const maxX = Math.max(0, trackWidth - KNOB - TRACK_PAD * 2);
  maxXRef.current = maxX;

  useEffect(() => {
    completedRef.current = false;
    dragX.setValue(0);
  }, [dragX, expired, disabled, loading]);

  const fillWidth = dragX.interpolate({
    inputRange: [0, Math.max(maxX, 1)],
    outputRange: [KNOB + TRACK_PAD * 2, Math.max(trackWidth, KNOB)],
    extrapolate: "clamp",
  });

  const labelOpacity = dragX.interpolate({
    inputRange: [0, Math.max(maxX * 0.45, 1)],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const chevronOpacity = dragX.interpolate({
    inputRange: [0, Math.max(maxX * 0.2, 1), Math.max(maxX * 0.55, 1)],
    outputRange: [0.55, 0.85, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !lockedRef.current,
      onMoveShouldSetPanResponder: (_, g) =>
        !lockedRef.current && Math.abs(g.dx) > 4,
      onPanResponderGrant: () => {
        dragX.stopAnimation((value) => {
          startXRef.current = typeof value === "number" ? value : 0;
        });
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderMove: (_, g) => {
        if (completedRef.current || lockedRef.current) return;
        const next = Math.min(
          maxXRef.current,
          Math.max(0, startXRef.current + g.dx),
        );
        dragX.setValue(next);
        if (maxXRef.current > 0 && next >= maxXRef.current * COMPLETE_RATIO) {
          if (completedRef.current) return;
          completedRef.current = true;
          Animated.timing(dragX, {
            toValue: maxXRef.current,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            if (Platform.OS !== "web") {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
            onAcceptRef.current();
          });
        }
      },
      onPanResponderRelease: (_, g) => {
        if (completedRef.current) return;
        const next = Math.min(
          maxXRef.current,
          Math.max(0, startXRef.current + g.dx),
        );
        if (maxXRef.current > 0 && next >= maxXRef.current * COMPLETE_RATIO) {
          completedRef.current = true;
          Animated.timing(dragX, {
            toValue: maxXRef.current,
            duration: 120,
            useNativeDriver: false,
          }).start(() => {
            if (Platform.OS !== "web") {
              void Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
            onAcceptRef.current();
          });
          return;
        }
        if (Platform.OS !== "web") {
          void Haptics.selectionAsync();
        }
        Animated.spring(dragX, {
          toValue: 0,
          friction: 7,
          tension: 80,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        if (!completedRef.current) {
          Animated.spring(dragX, {
            toValue: 0,
            friction: 7,
            tension: 80,
            useNativeDriver: false,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <View
      style={[styles.swipeTrack, (disabled || expired) && styles.swipeDisabled]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[
          styles.swipeFill,
          { backgroundColor: brandColor, width: fillWidth },
        ]}
      />

      <Animated.Text style={[styles.swipeLabel, { opacity: labelOpacity }]}>
        {expired
          ? "Offer expired"
          : loading
            ? "Accepting…"
            : swipeLabel}
      </Animated.Text>

      <Animated.View style={[styles.swipeChevrons, { opacity: chevronOpacity }]}>
        <MaterialIcons name="chevron-right" size={scaleWidth(18)} color={MUTED} />
        <MaterialIcons
          name="chevron-right"
          size={scaleWidth(18)}
          color={MUTED}
          style={{ marginLeft: -scaleWidth(10) }}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.swipeKnob,
          { backgroundColor: brandColor, transform: [{ translateX: dragX }] },
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <MaterialIcons
            name={expired ? "timer-off" : "arrow-forward"}
            size={scaleWidth(22)}
            color="#FFFFFF"
          />
        )}
      </Animated.View>
    </View>
  );
}

export function LeadOfferModal({
  visible,
  offer,
  queueIndex = 0,
  queueTotal = 0,
  onDismiss,
  onExpired,
  onDeclined,
  onAccepted,
}: LeadOfferModalProps) {
  const [countdown, setCountdown] = useState(formatCountdown(""));
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentWorkingPlace, setAgentWorkingPlace] = useState<unknown>(null);
  const [earnKes, setEarnKes] = useState<number | null>(null);
  const expiredHandledRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const preview = (offer?.preview_payload ?? {}) as LeadOfferPreview;
  const isSafaricom = preview.product === "safaricom";
  const isReminder = Boolean(preview.isCallbackReminder);
  const brandColor = isReminder ? "#3949AB" : isSafaricom ? SAFARICOM : AIRTEL;
  const brandLabel = isSafaricom ? "Safaricom" : "Airtel";
  const swipeLabel =
    earnKes != null && earnKes > 0
      ? `Swipe · pocket KSh ${earnKes.toLocaleString()}`
      : "Swipe to accept";

  useEffect(() => {
    let cancelled = false;
    setEarnKes(
      resolveLeadInstallDisplayKes({
        source: preview.source,
        preferredPackage: preview.preferredPackage ?? preview.packageLabel,
        receiverFees: { standard: 0, premium: 0 },
      }),
    );
    void (async () => {
      const cfg = await fetchDispatchConfig();
      if (cancelled) return;
      setEarnKes(
        resolveLeadInstallDisplayKes({
          source: preview.source,
          preferredPackage: preview.preferredPackage ?? preview.packageLabel,
          receiverFees: cfg.receiverFees,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [offer?.id, preview.source, preview.preferredPackage, preview.packageLabel]);

  useEffect(() => {
    void getCachedAgentData().then((cached) => {
      if (cached?.working_place) setAgentWorkingPlace(cached.working_place);
    });
  }, []);

  useEffect(() => {
    if (!visible || !offer) {
      expiredHandledRef.current = false;
      slideAnim.setValue(40);
      fadeAnim.setValue(0);
      setLoading(null);
      setError(null);
      return;
    }
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, offer, slideAnim, fadeAnim]);

  useEffect(() => {
    if (!visible || !offer) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, offer, pulseAnim]);

  useEffect(() => {
    if (!visible || !offer) {
      expiredHandledRef.current = false;
      return;
    }
    const tick = () => {
      const next = formatCountdown(offer.expires_at);
      setCountdown(next);
      if (next.expired && !expiredHandledRef.current) {
        expiredHandledRef.current = true;
        onExpired();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, offer, onExpired]);

  const customerPlace = useMemo(
    () => parseGooglePlace(preview.googlePlace),
    [preview.googlePlace],
  );

  const locationLine = useMemo(() => {
    if (customerPlace?.name) {
      const town = preview.installationTown?.trim();
      return town ? `${customerPlace.name}, ${town}` : customerPlace.name;
    }
    const parts = [preview.roughArea, preview.installationTown].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return preview.county || "Nearby area";
  }, [customerPlace, preview]);

  const distanceKm = useMemo(() => {
    const pinKm = pinDistanceKm(customerPlace, agentWorkingPlace);
    if (pinKm != null) return pinKm;
    return preview.distanceKm ?? null;
  }, [customerPlace, agentWorkingPlace, preview.distanceKm]);

  const handleAccept = async () => {
    if (!offer || loading) return;
    setLoading("accept");
    setError(null);
    const result = await acceptLeadOffer(offer.id);
    setLoading(null);
    if (!result.success) {
      setError(result.error ?? "Could not accept offer");
      return;
    }
    onAccepted(offer.lead_id);
  };

  const handleDecline = async () => {
    if (!offer) return;
    setLoading("decline");
    setError(null);
    const result = await declineLeadOffer(offer.id);
    setLoading(null);
    if (!result.success) {
      setError(result.error ?? "Could not decline offer");
      return;
    }
    onDeclined();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.brandBar, { backgroundColor: brandColor }]} />

          <View style={styles.handle} />

          <View style={styles.topRow}>
            <View style={styles.topCopy}>
              <Text style={[styles.brandTag, { color: brandColor }]}>
                {queueTotal > 1
                  ? `${brandLabel} · ${queueIndex}/${queueTotal}`
                  : isReminder
                    ? `${brandLabel} · Callback reminder`
                    : `${brandLabel} lead`}
              </Text>
              <Text style={styles.headline}>
                {isReminder
                  ? "Time to call them back"
                  : "New customer nearby"}
              </Text>
            </View>

            <Animated.View
              style={[
                styles.timerRing,
                countdown.urgent && styles.timerRingUrgent,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Text
                style={[
                  styles.timerValue,
                  countdown.urgent && styles.timerValueUrgent,
                ]}
              >
                {countdown.label}
              </Text>
              <Text style={styles.timerHint}>left</Text>
            </Animated.View>
          </View>

          <Text style={styles.location}>{locationLine}</Text>
          {customerPlace ? (
            <View style={styles.mapWrap}>
              <PlaceMapPreview
                lat={customerPlace.lat}
                lng={customerPlace.lng}
                label={customerPlace.name}
              />
            </View>
          ) : null}
          <Text style={styles.unlockHint}>
            {isReminder
              ? "You deferred this order — accept to continue the call & install"
              : "Accept to unlock name, phone & full address"}
          </Text>

          {earnKes != null && earnKes > 0 ? (
            <View style={styles.earnBanner}>
              <View style={styles.earnShine} />
              <View style={styles.earnLeft}>
                <Text style={styles.earnEyebrow}>Yours on install</Text>
                <View style={styles.earnAmountRow}>
                  <Text style={styles.earnCurrency}>KSh</Text>
                  <Text style={styles.earnAmount}>
                    {earnKes.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.earnBadge}>
                <MaterialIcons
                  name="trending-up"
                  size={scaleWidth(16)}
                  color="#92400E"
                />
                <Text style={styles.earnBadgeText}>Earn</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.details}>
            {preview.packageLabel ? (
              <DetailRow
                label="Package"
                value={humanizePackageLabel(preview.packageLabel)}
              />
            ) : null}
            {distanceKm != null ? (
              <DetailRow
                label="Distance"
                value={
                  Number(distanceKm) < 1
                    ? `About ${Math.max(1, Math.round(Number(distanceKm) * 1000))} m from you`
                    : `About ${Math.round(Number(distanceKm) * 10) / 10} km from you`
                }
              />
            ) : null}
            {preview.submittedAgoMinutes != null ? (
              <DetailRow
                label="Requested"
                value={
                  preview.submittedAgoMinutes < 1
                    ? "Just now"
                    : `${preview.submittedAgoMinutes} min ago`
                }
              />
            ) : null}
            {preview.county ? (
              <DetailRow label="County" value={String(preview.county)} />
            ) : null}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <SwipeToAccept
            brandColor={brandColor}
            disabled={!!loading || countdown.expired}
            loading={loading === "accept"}
            expired={countdown.expired}
            swipeLabel={swipeLabel}
            onAccept={() => void handleAccept()}
          />

          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            disabled={!!loading}
            activeOpacity={0.7}
          >
            {loading === "decline" ? (
              <ActivityIndicator color={MUTED} />
            ) : (
              <Text style={styles.declineBtnText}>Decline</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scaleWidth(28),
    borderTopRightRadius: scaleWidth(28),
    paddingHorizontal: scaleWidth(22),
    paddingBottom: scaleHeight(30),
    overflow: "hidden",
  },
  brandBar: {
    height: scaleHeight(5),
    marginHorizontal: -scaleWidth(22),
  },
  handle: {
    alignSelf: "center",
    width: scaleWidth(36),
    height: scaleHeight(4),
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    marginTop: scaleHeight(10),
    marginBottom: scaleHeight(18),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: scaleWidth(12),
    marginBottom: scaleHeight(14),
  },
  topCopy: {
    flex: 1,
    paddingTop: scaleHeight(4),
  },
  brandTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(12),
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: scaleHeight(4),
  },
  headline: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(24),
    color: INK,
    lineHeight: scaleFont(30),
  },
  timerRing: {
    width: scaleWidth(76),
    height: scaleWidth(76),
    borderRadius: scaleWidth(38),
    borderWidth: 3,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  timerRingUrgent: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  timerValue: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(18),
    color: INK,
  },
  timerValueUrgent: {
    color: "#DC2626",
  },
  timerHint: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(10),
    color: MUTED,
    marginTop: -2,
  },
  location: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(17),
    color: INK,
    lineHeight: scaleFont(24),
    marginBottom: scaleHeight(4),
  },
  mapWrap: {
    marginBottom: scaleHeight(10),
  },
  unlockHint: {
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(13),
    color: MUTED,
    lineHeight: scaleFont(18),
    marginBottom: scaleHeight(14),
  },
  earnBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    paddingHorizontal: scaleWidth(16),
    marginBottom: scaleHeight(16),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  earnShine: {
    position: "absolute",
    top: -scaleHeight(20),
    right: -scaleWidth(10),
    width: scaleWidth(100),
    height: scaleWidth(100),
    borderRadius: scaleWidth(50),
    backgroundColor: "rgba(251, 191, 36, 0.22)",
  },
  earnLeft: {
    flex: 1,
  },
  earnEyebrow: {
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(12),
    color: "#B45309",
    marginBottom: scaleHeight(2),
  },
  earnAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: scaleWidth(6),
  },
  earnCurrency: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(16),
    color: "#92400E",
  },
  earnAmount: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(32),
    color: "#78350F",
    lineHeight: scaleFont(38),
  },
  earnBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(4),
    backgroundColor: "#FDE68A",
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    borderRadius: scaleWidth(10),
  },
  earnBadgeText: {
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(13),
    color: "#92400E",
  },
  details: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
    paddingTop: scaleHeight(4),
    marginBottom: scaleHeight(20),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: scaleWidth(16),
    paddingVertical: scaleHeight(11),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F1F5F9",
  },
  detailLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(13),
    color: MUTED,
    width: scaleWidth(88),
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
    color: INK,
    lineHeight: scaleFont(20),
  },
  errorText: {
    color: "#C62828",
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: scaleHeight(10),
  },
  swipeTrack: {
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: scaleHeight(6),
  },
  swipeDisabled: {
    opacity: 0.55,
  },
  swipeFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
    opacity: 0.18,
  },
  swipeLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    color: MUTED,
    paddingLeft: KNOB * 0.35,
  },
  swipeChevrons: {
    position: "absolute",
    right: scaleWidth(18),
    flexDirection: "row",
    alignItems: "center",
  },
  swipeKnob: {
    position: "absolute",
    left: TRACK_PAD,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  declineBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(12),
  },
  declineBtnText: {
    color: MUTED,
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
  },
});
