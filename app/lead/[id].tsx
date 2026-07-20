import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { supabase } from "../../lib/supabase";
import { fetchInboundLeadById } from "../../lib/dispatch/leadDetailService";
import type {
  InboundLead,
  LeadOutcomeAction,
} from "../../lib/dispatch/types";
import {
  LEAD_STATUS_COLORS,
  formatLeadStatusLabel,
} from "../../constants/leadStatuses";
import {
  releaseReasonLabel,
  submitLeadOutcome,
} from "../../lib/services/leadOutcomeService";
import {
  sendLeadContactOtp,
  verifyLeadContactOtp,
} from "../../lib/services/leadContactOtpService";
import {
  LEAD_INSTALL_COMMISSION_KES,
  getLeadInstallCommissionKes,
} from "../../lib/commissions/leadInstallCommission";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../../lib/utils/responsive";

const RELEASE_REASONS: {
  action: Extract<LeadOutcomeAction, "unreachable" | "declined" | "kyc_failed" | "release">;
  title: string;
  description: string;
}[] = [
  {
    action: "unreachable",
    title: "Customer unreachable",
    description: "No answer / wrong number / cannot reach customer",
  },
  {
    action: "declined",
    title: "Customer declined",
    description: "Customer no longer wants the service",
  },
  {
    action: "kyc_failed",
    title: "KYC / registration failed",
    description: "Could not complete KYC or signup",
  },
  {
    action: "release",
    title: "Cannot complete",
    description: "Other reason — add a short note below",
  },
];

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function InboundLeadDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<InboundLead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [srNumber, setSrNumber] = useState("");
  const [imei, setImei] = useState("");
  const [callInitiated, setCallInitiated] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpMaskedPhone, setOtpMaskedPhone] = useState("");
  const [otpLoading, setOtpLoading] = useState<"send" | "verify" | null>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState<
    (typeof RELEASE_REASONS)[number]["action"] | null
  >(null);
  const [releaseNotes, setReleaseNotes] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const applyLead = useCallback((next: InboundLead) => {
    setError(null);
    setLead(next);
    setSrNumber(next.airtel_sr_number ?? "");
    setImei(next.safaricom_imei ?? "");
    setCallInitiated(Boolean(next.call_initiated_at));
  }, []);

  const loadLead = useCallback(async () => {
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login" as any);
      return;
    }
    const result = await fetchInboundLeadById(id);
    if (result.error || !result.lead) {
      setError(result.error ?? "Lead not found");
      setLead(null);
    } else {
      applyLead(result.lead);
    }
  }, [applyLead, id, router]);

  useEffect(() => {
    loadLead().finally(() => setLoading(false));
  }, [loadLead]);

  // Live status / field updates while this screen is open.
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`inbound-lead-detail-${id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inbound_leads",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          // Release / unassign appears as DELETE under RLS — keep UI until navigate.
          if (payload.eventType === "DELETE") return;
          const row = payload.new as InboundLead | null;
          if (row?.id) applyLead(row);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyLead, id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLead();
    setRefreshing(false);
  };

  const runOutcome = async (
    action: LeadOutcomeAction,
    extra?: { airtelSrNumber?: string; safaricomImei?: string; notes?: string },
  ) => {
    if (!lead) return;
    setActionLoading(action);
    const result = await submitLeadOutcome({
      leadId: lead.id,
      action,
      ...extra,
    });
    setActionLoading(null);
    if (!result.success) {
      Alert.alert("Error", result.error ?? "Action failed");
      return;
    }

    const isRelease =
      action === "release" ||
      action === "unreachable" ||
      action === "declined" ||
      action === "kyc_failed";

    if (isRelease) {
      setReleaseOpen(false);
      setReleaseReason(null);
      setReleaseNotes("");
      // Do not re-fetch: release clears assigned_agent_id so RLS returns "not found".
      const reasonText = releaseReasonLabel(result.releaseReason ?? action);
      Alert.alert("Lead released", reasonText, [
        { text: "OK", onPress: () => router.back() },
      ]);
      return;
    }

    if (result.status) {
      setLead((prev) =>
        prev
          ? {
              ...prev,
              status: result.status as InboundLead["status"],
              ...(extra?.airtelSrNumber
                ? { airtel_sr_number: extra.airtelSrNumber }
                : {}),
              ...(extra?.safaricomImei
                ? { safaricom_imei: extra.safaricomImei }
                : {}),
              ...(result.commissionKes != null
                ? { commission_earned_ksh: result.commissionKes }
                : {}),
            }
          : prev,
      );
    }
    await loadLead();

    if (action === "installed") {
      Alert.alert(
        "Install submitted",
        "Admin will review the proof and confirm. Commission is paid with your other payouts.",
      );
      return;
    }
  };

  const confirmRelease = () => {
    if (!releaseReason) {
      Alert.alert("Choose a reason", "Select why you are releasing this lead.");
      return;
    }
    if (releaseReason === "release" && !releaseNotes.trim()) {
      Alert.alert("Add a note", "Please briefly explain why you cannot complete this lead.");
      return;
    }
    void runOutcome(releaseReason, { notes: releaseNotes.trim() || undefined });
  };

  const formatDialablePhone = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("254")) return `+${digits}`;
    if (digits.startsWith("0")) return `+254${digits.slice(1)}`;
    if (digits.startsWith("7") || digits.startsWith("1")) return `+254${digits}`;
    return value.startsWith("+") ? value : `+${digits}`;
  };

  const handleCallCustomer = async () => {
    if (!lead) return;
    // Mark call intent first so OTP unlocks even if the dialer check fails
    // (Android 11+ canOpenURL is unreliable for tel: without package queries).
    setCallInitiated(true);
    void runOutcome("call_started");

    const dialPhone = formatDialablePhone(lead.primary_phone);
    try {
      await Linking.openURL(`tel:${dialPhone}`);
    } catch {
      Alert.alert(
        "Call customer",
        `Open your phone app and dial ${dialPhone}`,
      );
    }
  };

  const handleSendOtp = async () => {
    if (!lead) return;
    if (!callInitiated) {
    Alert.alert(
      "Call the customer first",
      "Use Call customer, speak to them, then send the confirmation code.",
    );
      return;
    }

    setOtpLoading("send");
    const result = await sendLeadContactOtp(lead.id);
    setOtpLoading(null);
    if (!result.success) {
      Alert.alert("Code not sent", result.error);
      return;
    }
    if (result.alreadyVerified) {
      await loadLead();
      return;
    }

    setOtpSent(true);
    setOtpMaskedPhone(result.maskedPhone ?? "");
    setOtpCode("");
    Alert.alert(
      "Confirmation code sent",
      `Ask the customer for the 6-digit code sent to ${
        result.maskedPhone || "their phone"
      }.`,
    );
  };

  const handleVerifyOtp = async () => {
    if (!lead) return;
    if (!/^\d{6}$/.test(otpCode)) {
      Alert.alert(
        "Enter the code",
        "Enter the 6-digit contact confirmation code from the customer.",
      );
      return;
    }

    setOtpLoading("verify");
    const result = await verifyLeadContactOtp(lead.id, otpCode);
    setOtpLoading(null);
    if (!result.success) {
      Alert.alert("Verification failed", result.error);
      return;
    }

    setOtpCode("");
    setOtpSent(false);
    await loadLead();
    Alert.alert(
      "Contact confirmed",
      "You can now review and submit the prefilled registration.",
    );
  };

  const handleOpenLeadRegistration = () => {
    if (!lead?.contact_verified_at) {
      Alert.alert(
        "Confirm contact first",
        "Call the customer and enter their contact confirmation code.",
      );
      return;
    }
    router.push({
      pathname: "/register-customer",
      params: { leadId: lead.id },
    } as any);
  };

  const handleMarkInstalled = () => {
    if (!lead) return;
    if (lead.product === "airtel") {
      const sr = srNumber.trim();
      if (!sr) {
        Alert.alert("SR number required", "Enter the Airtel SR number for this install.");
        return;
      }
      void runOutcome("installed", { airtelSrNumber: sr });
      return;
    }
    const deviceImei = imei.trim();
    if (!deviceImei) {
      Alert.alert("IMEI required", "Enter the device IMEI for this install.");
      return;
    }
    void runOutcome("installed", { safaricomImei: deviceImei });
  };

  if (!fontsLoaded) return null;

  const statusStyle =
    LEAD_STATUS_COLORS[lead?.status ?? "assigned"] ??
    LEAD_STATUS_COLORS.assigned;

  const isTerminal =
    lead?.status === "installed" || lead?.status === "pending_install";
  const awaitingAdminConfirm = lead?.status === "pending_install";
  const airtelRegistrationComplete =
    lead?.product === "airtel" &&
    (lead.status === "kyc_completed" ||
      lead.status === "pending_install" ||
      lead.status === "installed");

  const scrollProofFieldIntoView = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbound lead</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
      >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#0066CC" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : lead ? (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.customerName}>{lead.customer_name}</Text>
              <View
                style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}
              >
                <Text style={[styles.statusChipText, { color: statusStyle.text }]}>
                  {formatLeadStatusLabel(lead.status)}
                </Text>
              </View>
              <Text style={styles.productBadge}>
                {lead.product === "safaricom" ? "Safaricom" : "Airtel"}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact</Text>
              <DetailRow label="Primary phone" value={lead.primary_phone} />
              <DetailRow label="Alternate" value={lead.alternate_phone} />
              <DetailRow label="Email" value={lead.email} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <DetailRow label="County" value={lead.county} />
              <DetailRow label="Town" value={lead.installation_town} />
              <DetailRow label="Area" value={lead.installation_area} />
              <DetailRow label="Landmark" value={lead.delivery_landmark} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan</Text>
              <DetailRow
                label="Package"
                value={lead.plan_label ?? lead.preferred_package}
              />
              <DetailRow label="Visit date" value={lead.visit_date} />
              <DetailRow label="Visit time" value={lead.visit_time} />
            </View>

            {lead.product === "safaricom" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Safaricom details</Text>
                <DetailRow label="National ID" value={lead.national_id} />
                <DetailRow label="Date of birth" value={lead.date_of_birth} />
              </View>
            )}

            {!isTerminal && (
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>Actions</Text>

                {lead.product === "airtel" && (
                  <>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleCallCustomer}
                      disabled={!!actionLoading || !!otpLoading}
                    >
                      <Text style={styles.primaryBtnText}>
                        Call customer
                      </Text>
                    </TouchableOpacity>

                    {lead.contact_verified_at ? (
                      <View style={styles.verifiedCard}>
                        <Text style={styles.verifiedTitle}>
                          ✓ Customer contact confirmed
                        </Text>
                        <Text style={styles.verifiedText}>
                          Verified by SMS code{" "}
                          {new Date(lead.contact_verified_at).toLocaleString()}.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.otpCard}>
                        <Text style={styles.otpTitle}>
                          Confirm customer contact
                        </Text>
                        <Text style={styles.otpHelp}>
                          While speaking to the customer, send a confirmation
                          code and enter the 6 digits they give you.
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.secondaryBtn,
                            (!callInitiated || !!otpLoading) && styles.disabledBtn,
                          ]}
                          onPress={handleSendOtp}
                          disabled={!callInitiated || !!otpLoading}
                        >
                          {otpLoading === "send" ? (
                            <ActivityIndicator color="#0066CC" />
                          ) : (
                            <Text style={styles.secondaryBtnText}>
                              {otpSent
                                ? "Resend confirmation code"
                                : "Send confirmation code"}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {otpSent ? (
                          <>
                            <Text style={styles.otpSentText}>
                              Confirmation code sent to{" "}
                              {otpMaskedPhone || "customer"}
                            </Text>
                            <TextInput
                              style={styles.otpInput}
                              value={otpCode}
                              onChangeText={(value) =>
                                setOtpCode(value.replace(/\D/g, "").slice(0, 6))
                              }
                              placeholder="6-digit confirmation code"
                              placeholderTextColor="#999"
                              keyboardType="number-pad"
                              maxLength={6}
                              textAlign="center"
                            />
                            <TouchableOpacity
                              style={[
                                styles.verifyBtn,
                                (otpCode.length !== 6 || !!otpLoading) &&
                                  styles.disabledBtn,
                              ]}
                              onPress={handleVerifyOtp}
                              disabled={otpCode.length !== 6 || !!otpLoading}
                            >
                              {otpLoading === "verify" ? (
                                <ActivityIndicator color="#FFFFFF" />
                              ) : (
                                <Text style={styles.verifyBtnText}>
                                  Confirm code
                                </Text>
                              )}
                            </TouchableOpacity>
                          </>
                        ) : null}
                      </View>
                    )}

                    {!airtelRegistrationComplete ? (
                      <TouchableOpacity
                        style={[
                          styles.registrationBtn,
                          !lead.contact_verified_at && styles.disabledBtn,
                        ]}
                        onPress={handleOpenLeadRegistration}
                        disabled={!lead.contact_verified_at || !!actionLoading}
                      >
                        <Text style={styles.registrationBtnText}>
                          {lead.registration_id
                            ? "Resubmit registration"
                            : "Review and submit registration"}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.registrationDoneCard}>
                        <Text style={styles.registrationDoneTitle}>
                          ✓ Registration submitted
                        </Text>
                        <Text style={styles.verifiedText}>
                          Customer registration completed successfully.
                        </Text>
                      </View>
                    )}
                  </>
                )}

                {lead.product === "safaricom" && (
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={() => runOutcome("kyc_completed")}
                    disabled={!!actionLoading}
                  >
                    <Text style={styles.secondaryBtnText}>Mark as contacted</Text>
                  </TouchableOpacity>
                )}

                {lead.product === "airtel" && airtelRegistrationComplete ? (
                  <View style={styles.proofField}>
                    <Text style={styles.proofLabel}>Airtel SR number (for install)</Text>
                    <TextInput
                      style={styles.proofInput}
                      value={srNumber}
                      onChangeText={setSrNumber}
                      placeholder="Enter SR number"
                      placeholderTextColor="#999"
                      onFocus={scrollProofFieldIntoView}
                      returnKeyType="done"
                      autoCapitalize="characters"
                      blurOnSubmit
                    />
                  </View>
                ) : lead.product === "safaricom" ? (
                  <View style={styles.proofField}>
                    <Text style={styles.proofLabel}>Device IMEI (for install)</Text>
                    <TextInput
                      style={styles.proofInput}
                      value={imei}
                      onChangeText={setImei}
                      placeholder="Enter IMEI"
                      placeholderTextColor="#999"
                      onFocus={scrollProofFieldIntoView}
                      returnKeyType="done"
                      keyboardType="number-pad"
                      blurOnSubmit
                    />
                  </View>
                ) : null}

                {(lead.product === "safaricom" || airtelRegistrationComplete) && (
                  <TouchableOpacity
                    style={styles.installBtn}
                    onPress={handleMarkInstalled}
                    disabled={!!actionLoading}
                  >
                    <Text style={styles.installBtnText}>
                      Submit install for review
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() => {
                    setReleaseReason(null);
                    setReleaseNotes("");
                    setReleaseOpen(true);
                  }}
                  disabled={!!actionLoading}
                >
                  <Text style={styles.dangerBtnText}>Release / report issue</Text>
                </TouchableOpacity>
              </View>
            )}

            {awaitingAdminConfirm && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Install submitted</Text>
                <DetailRow label="SR number" value={lead.airtel_sr_number} />
                <DetailRow label="IMEI" value={lead.safaricom_imei} />
                <Text style={styles.awaitingText}>
                  Waiting for admin to confirm. If approved, KSh{" "}
                  {LEAD_INSTALL_COMMISSION_KES} will be added to your earnings
                  and paid with your normal payouts.
                </Text>
              </View>
            )}

            {lead.status === "installed" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Install confirmed</Text>
                <DetailRow label="SR number" value={lead.airtel_sr_number} />
                <DetailRow label="IMEI" value={lead.safaricom_imei} />
                <DetailRow
                  label="Commission"
                  value={`KSh ${getLeadInstallCommissionKes(lead).toLocaleString()} (via admin payouts)`}
                />
                <DetailRow
                  label="Installed at"
                  value={
                    lead.installed_at
                      ? new Date(lead.installed_at).toLocaleString()
                      : null
                  }
                />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={releaseOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setReleaseOpen(false)}
      >
        <Pressable
          style={styles.releaseBackdrop}
          onPress={() => setReleaseOpen(false)}
        >
          <Pressable
            style={[
              styles.releaseSheet,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.releaseHandle} />
            <Text style={styles.releaseTitle}>Release this lead</Text>
            <Text style={styles.releaseSubtitle}>
              Choose why you cannot complete it. The lead will leave your list
              and go to another agent or admin.
            </Text>

            {RELEASE_REASONS.map((option) => {
              const selected = releaseReason === option.action;
              return (
                <TouchableOpacity
                  key={option.action}
                  style={[
                    styles.releaseOption,
                    selected && styles.releaseOptionSelected,
                  ]}
                  onPress={() => setReleaseReason(option.action)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.releaseRadio,
                      selected && styles.releaseRadioSelected,
                    ]}
                  >
                    {selected ? <View style={styles.releaseRadioDot} /> : null}
                  </View>
                  <View style={styles.releaseOptionText}>
                    <Text style={styles.releaseOptionTitle}>{option.title}</Text>
                    <Text style={styles.releaseOptionDesc}>
                      {option.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.releaseNotesLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.releaseNotesInput}
              value={releaseNotes}
              onChangeText={setReleaseNotes}
              placeholder={
                releaseReason === "release"
                  ? "Required — briefly say what went wrong"
                  : "Optional detail for admin"
              }
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.releaseConfirmBtn,
                (!releaseReason || !!actionLoading) &&
                  styles.releaseConfirmBtnDisabled,
              ]}
              onPress={confirmRelease}
              disabled={!releaseReason || !!actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.releaseConfirmText}>Confirm release</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.releaseCancelBtn}
              onPress={() => setReleaseOpen(false)}
              disabled={!!actionLoading}
            >
              <Text style={styles.releaseCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: { padding: scaleWidth(8) },
  backBtnText: { fontSize: scaleFont(24), color: "#0066CC" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  headerSpacer: { width: scaleWidth(40) },
  content: { padding: scaleWidth(16) },
  errorText: {
    color: "#C62828",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: scaleHeight(24),
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(16),
    padding: scaleWidth(18),
    marginBottom: scaleHeight(16),
    alignItems: "center",
  },
  customerName: {
    fontSize: scaleFont(22),
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
    marginBottom: scaleHeight(10),
    textAlign: "center",
  },
  statusChip: {
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(4),
    borderRadius: scaleWidth(20),
    marginBottom: scaleHeight(8),
  },
  statusChipText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
  },
  productBadge: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(12),
  },
  sectionTitle: {
    fontSize: scaleFont(15),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: scaleHeight(12),
  },
  awaitingText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(18),
    marginTop: scaleHeight(4),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: scaleHeight(10),
  },
  detailLabel: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    flex: 1,
  },
  detailValue: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    flex: 1.2,
    textAlign: "right",
  },
  actionsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    marginBottom: scaleHeight(12),
  },
  primaryBtn: {
    backgroundColor: "#E60012",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    alignItems: "center",
    marginBottom: scaleHeight(10),
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#0066CC",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(12),
    alignItems: "center",
    marginBottom: scaleHeight(10),
  },
  secondaryBtnText: {
    color: "#0066CC",
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
  },
  disabledBtn: {
    opacity: 0.45,
  },
  otpCard: {
    backgroundColor: "#F5F9FF",
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: "#D7E8FA",
    padding: scaleWidth(12),
    marginBottom: scaleHeight(10),
  },
  otpTitle: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    marginBottom: scaleHeight(4),
  },
  otpHelp: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(18),
    marginBottom: scaleHeight(10),
  },
  otpSentText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    textAlign: "center",
    marginBottom: scaleHeight(8),
  },
  otpInput: {
    borderWidth: 1,
    borderColor: "#B8D2EC",
    borderRadius: scaleWidth(10),
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(20),
    letterSpacing: scaleWidth(5),
    paddingVertical: scaleHeight(10),
    marginBottom: scaleHeight(8),
  },
  verifyBtn: {
    backgroundColor: "#0066CC",
    borderRadius: scaleWidth(10),
    paddingVertical: scaleHeight(12),
    alignItems: "center",
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
  },
  verifiedCard: {
    backgroundColor: "#EAF7ED",
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: "#B9E1C2",
    padding: scaleWidth(12),
    marginBottom: scaleHeight(10),
  },
  verifiedTitle: {
    color: "#1B5E20",
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
    marginBottom: scaleHeight(3),
  },
  verifiedText: {
    color: "#4E6652",
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(12),
    lineHeight: scaleFont(17),
  },
  registrationBtn: {
    backgroundColor: "#7B1FA2",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    alignItems: "center",
    marginBottom: scaleHeight(10),
  },
  registrationBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(14),
  },
  registrationDoneCard: {
    backgroundColor: "#F2EAF8",
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    borderColor: "#D7BDE5",
    padding: scaleWidth(12),
    marginBottom: scaleHeight(10),
  },
  registrationDoneTitle: {
    color: "#6A1B9A",
    fontFamily: "Inter_600SemiBold",
    fontSize: scaleFont(14),
    marginBottom: scaleHeight(3),
  },
  proofField: { marginBottom: scaleHeight(12) },
  proofLabel: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#444444",
    marginBottom: scaleHeight(6),
  },
  proofInput: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(14),
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
  },
  installBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    alignItems: "center",
    marginBottom: scaleHeight(10),
  },
  installBtnText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
  },
  dangerBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(10),
  },
  dangerBtnText: {
    color: "#C62828",
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(14),
  },
  releaseBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  releaseSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    paddingHorizontal: scaleWidth(18),
    paddingTop: scaleHeight(10),
  },
  releaseHandle: {
    alignSelf: "center",
    width: scaleWidth(40),
    height: scaleHeight(4),
    borderRadius: 2,
    backgroundColor: "#DDDDDD",
    marginBottom: scaleHeight(12),
  },
  releaseTitle: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    marginBottom: scaleHeight(4),
  },
  releaseSubtitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: scaleFont(18),
    marginBottom: scaleHeight(14),
  },
  releaseOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scaleWidth(12),
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: scaleWidth(12),
    padding: scaleWidth(12),
    marginBottom: scaleHeight(8),
    backgroundColor: "#FAFAFA",
  },
  releaseOptionSelected: {
    borderColor: "#C62828",
    backgroundColor: "#FFF5F5",
  },
  releaseRadio: {
    width: scaleWidth(20),
    height: scaleWidth(20),
    borderRadius: scaleWidth(10),
    borderWidth: 2,
    borderColor: "#BBBBBB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  releaseRadioSelected: {
    borderColor: "#C62828",
  },
  releaseRadioDot: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
    backgroundColor: "#C62828",
  },
  releaseOptionText: { flex: 1 },
  releaseOptionTitle: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
  },
  releaseOptionDesc: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginTop: 2,
  },
  releaseNotesLabel: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#444444",
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(6),
  },
  releaseNotesInput: {
    minHeight: scaleHeight(72),
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: scaleWidth(10),
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(10),
    fontFamily: "Inter_400Regular",
    fontSize: scaleFont(14),
    color: "#1A1A1A",
    backgroundColor: "#FAFAFA",
    marginBottom: scaleHeight(14),
  },
  releaseConfirmBtn: {
    backgroundColor: "#C62828",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    alignItems: "center",
    marginBottom: scaleHeight(8),
  },
  releaseConfirmBtnDisabled: {
    opacity: 0.5,
  },
  releaseConfirmText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
  },
  releaseCancelBtn: {
    alignItems: "center",
    paddingVertical: scaleHeight(10),
  },
  releaseCancelText: {
    color: "#666666",
    fontFamily: "Inter_500Medium",
    fontSize: scaleFont(14),
  },
});
