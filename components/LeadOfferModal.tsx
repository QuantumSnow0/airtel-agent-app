import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";
import type { LeadOffer, LeadOfferPreview } from "../lib/dispatch/types";
import {
  acceptLeadOffer,
  declineLeadOffer,
} from "../lib/services/leadOfferActionService";

const AIRTEL = "#E60012";
const SAFARICOM = "#00A651";
const WAM_BLUE = "#0066CC";

type LeadOfferModalProps = {
  visible: boolean;
  offer: LeadOffer | null;
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
  if (ms <= 0) return { label: "Expired", urgent: true, expired: true };
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return {
    label: `${mins}:${secs.toString().padStart(2, "0")}`,
    urgent: mins < 5,
    expired: false,
  };
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.chip}>
      <MaterialIcons name={icon} size={scaleWidth(16)} color={WAM_BLUE} />
      <View style={styles.chipTextWrap}>
        <Text style={styles.chipLabel}>{label}</Text>
        <Text style={styles.chipValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export function LeadOfferModal({
  visible,
  offer,
  onDismiss,
  onExpired,
  onDeclined,
  onAccepted,
}: LeadOfferModalProps) {
  const [countdown, setCountdown] = useState(formatCountdown(""));
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expiredHandledRef = useRef(false);

  const preview = (offer?.preview_payload ?? {}) as LeadOfferPreview;
  const isSafaricom = preview.product === "safaricom";
  const brandColor = isSafaricom ? SAFARICOM : AIRTEL;
  const brandLabel = isSafaricom ? "Safaricom" : "Airtel";
  const brandLetter = isSafaricom ? "S" : "A";

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

  const locationLine = useMemo(() => {
    const parts = [
      preview.installationTown,
      preview.roughArea,
      preview.county,
    ].filter(Boolean);
    return parts.join(" · ") || "Location shared after accept";
  }, [preview]);

  const handleAccept = async () => {
    if (!offer) return;
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
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.handle} />

          {/* Branded header */}
          <View style={[styles.hero, { backgroundColor: brandColor }]}>
            <View style={styles.heroTop}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandLetter}>{brandLetter}</Text>
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroEyebrow}>Incoming lead</Text>
                <Text style={styles.heroTitle}>{brandLabel} customer nearby</Text>
              </View>
              <View
                style={[
                  styles.timerBadge,
                  countdown.urgent && styles.timerBadgeUrgent,
                ]}
              >
                <MaterialIcons
                  name="timer"
                  size={scaleWidth(14)}
                  color="#FFFFFF"
                />
                <Text style={styles.timerBadgeText}>{countdown.label}</Text>
              </View>
            </View>
            <Text style={styles.heroSub}>
              Accept to unlock name, phone & full address
            </Text>
          </View>

          <View style={styles.body}>
            <View style={styles.privacyRow}>
              <MaterialIcons name="lock-outline" size={scaleWidth(18)} color="#666" />
              <Text style={styles.privacyText}>
                Customer identity is hidden until you accept
              </Text>
            </View>

            <View style={styles.chipGrid}>
              <InfoChip icon="place" label="Area" value={locationLine} />
              {preview.packageLabel ? (
                <InfoChip
                  icon="inventory-2"
                  label="Package"
                  value={preview.packageLabel}
                />
              ) : null}
              {preview.distanceKm != null ? (
                <InfoChip
                  icon="near-me"
                  label="Distance"
                  value={`~${preview.distanceKm} km from you`}
                />
              ) : null}
              {preview.submittedAgoMinutes != null ? (
                <InfoChip
                  icon="schedule"
                  label="Submitted"
                  value={
                    preview.submittedAgoMinutes < 1
                      ? "Just now"
                      : `${preview.submittedAgoMinutes} min ago`
                  }
                />
              ) : null}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[
                styles.acceptBtn,
                { backgroundColor: brandColor },
                (loading || countdown.expired) && styles.acceptBtnDisabled,
              ]}
              onPress={handleAccept}
              disabled={!!loading || countdown.expired}
              activeOpacity={0.88}
            >
              {loading === "accept" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons
                    name="check-circle"
                    size={scaleWidth(22)}
                    color="#FFFFFF"
                  />
                  <Text style={styles.acceptBtnText}>
                    {countdown.expired ? "Offer expired" : "Accept & view details"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.declineBtn}
              onPress={handleDecline}
              disabled={!!loading}
              activeOpacity={0.7}
            >
              {loading === "decline" ? (
                <ActivityIndicator color={WAM_BLUE} />
              ) : (
                <Text style={styles.declineBtnText}>Decline offer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scaleWidth(24),
    borderTopRightRadius: scaleWidth(24),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handle: {
    alignSelf: "center",
    width: scaleWidth(44),
    height: scaleHeight(4),
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
    position: "absolute",
    top: scaleHeight(8),
    zIndex: 2,
  },
  hero: {
    paddingTop: scaleHeight(28),
    paddingHorizontal: scaleWidth(20),
    paddingBottom: scaleHeight(18),
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(12),
  },
  brandBadge: {
    width: scaleWidth(48),
    height: scaleWidth(48),
    borderRadius: scaleWidth(14),
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  brandLetter: {
    fontSize: scaleFont(22),
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
  },
  heroTextWrap: {
    flex: 1,
    paddingTop: scaleHeight(2),
  },
  heroEyebrow: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: scaleHeight(2),
  },
  heroTitle: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    lineHeight: scaleFont(24),
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(4),
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    borderRadius: scaleWidth(20),
  },
  timerBadgeUrgent: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  timerBadgeText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  heroSub: {
    marginTop: scaleHeight(12),
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.9)",
    lineHeight: scaleFont(18),
  },
  body: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(16),
    paddingBottom: scaleHeight(28),
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(8),
    backgroundColor: "#F5F7FA",
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    borderRadius: scaleWidth(10),
    marginBottom: scaleHeight(14),
  },
  privacyText: {
    flex: 1,
    fontSize: scaleFont(12),
    fontFamily: "Inter_500Medium",
    color: "#555555",
  },
  chipGrid: {
    gap: scaleHeight(10),
    marginBottom: scaleHeight(18),
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(10),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8ECF0",
    borderRadius: scaleWidth(12),
    padding: scaleWidth(12),
  },
  chipTextWrap: {
    flex: 1,
  },
  chipLabel: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_500Medium",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: scaleHeight(2),
  },
  chipValue: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    lineHeight: scaleFont(20),
  },
  errorText: {
    color: "#C62828",
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: scaleHeight(10),
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleWidth(8),
    borderRadius: scaleWidth(14),
    paddingVertical: scaleHeight(16),
    marginBottom: scaleHeight(8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnDisabled: {
    opacity: 0.55,
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
  },
  declineBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(12),
  },
  declineBtnText: {
    color: WAM_BLUE,
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
  },
});
