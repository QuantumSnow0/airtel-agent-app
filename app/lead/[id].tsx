import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { InboundLead } from "../../lib/dispatch/types";
import {
  LEAD_STATUS_COLORS,
  formatLeadStatusLabel,
} from "../../constants/leadStatuses";
import { openAirtelConnectForKyc } from "../../lib/services/airtelConnectLauncher";
import { submitLeadOutcome } from "../../lib/services/leadOutcomeService";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../../lib/utils/responsive";

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

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

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
      setError(null);
      setLead(result.lead);
      setSrNumber(result.lead.airtel_sr_number ?? "");
      setImei(result.lead.safaricom_imei ?? "");
    }
  }, [id, router]);

  useEffect(() => {
    loadLead().finally(() => setLoading(false));
  }, [loadLead]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLead();
    setRefreshing(false);
  };

  const runOutcome = async (
    action: Parameters<typeof submitLeadOutcome>[0]["action"],
    extra?: { airtelSrNumber?: string; safaricomImei?: string },
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
    await loadLead();
    if (action === "release" || action === "unreachable" || action === "declined" || action === "kyc_failed") {
      Alert.alert("Lead released", "This lead will be offered to another agent.");
      router.back();
    }
  };

  const handleOpenAirtelConnect = async () => {
    if (!lead) return;
    await runOutcome("kyc_started");
    await openAirtelConnectForKyc(lead.id);
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

  const isTerminal = lead?.status === "installed";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbound lead</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
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
                      onPress={handleOpenAirtelConnect}
                      disabled={!!actionLoading}
                    >
                      <Text style={styles.primaryBtnText}>
                        Open Airtel Connect for KYC
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => runOutcome("kyc_completed")}
                      disabled={!!actionLoading}
                    >
                      <Text style={styles.secondaryBtnText}>
                        Mark KYC completed
                      </Text>
                    </TouchableOpacity>
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

                {lead.product === "airtel" ? (
                  <View style={styles.proofField}>
                    <Text style={styles.proofLabel}>Airtel SR number (for install)</Text>
                    <TextInput
                      style={styles.proofInput}
                      value={srNumber}
                      onChangeText={setSrNumber}
                      placeholder="Enter SR number"
                      placeholderTextColor="#999"
                    />
                  </View>
                ) : (
                  <View style={styles.proofField}>
                    <Text style={styles.proofLabel}>Device IMEI (for install)</Text>
                    <TextInput
                      style={styles.proofInput}
                      value={imei}
                      onChangeText={setImei}
                      placeholder="Enter IMEI"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.installBtn}
                  onPress={handleMarkInstalled}
                  disabled={!!actionLoading}
                >
                  <Text style={styles.installBtnText}>Mark installed</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() =>
                    Alert.alert(
                      "Release lead",
                      "Customer unreachable or KYC failed?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Unreachable",
                          onPress: () => runOutcome("unreachable"),
                        },
                        {
                          text: "Customer declined",
                          onPress: () => runOutcome("declined"),
                        },
                        {
                          text: "KYC failed",
                          onPress: () => runOutcome("kyc_failed"),
                        },
                      ],
                    )
                  }
                  disabled={!!actionLoading}
                >
                  <Text style={styles.dangerBtnText}>Release / report issue</Text>
                </TouchableOpacity>
              </View>
            )}

            {lead.status === "installed" && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Install proof</Text>
                <DetailRow label="SR number" value={lead.airtel_sr_number} />
                <DetailRow label="IMEI" value={lead.safaricom_imei} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
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
});
