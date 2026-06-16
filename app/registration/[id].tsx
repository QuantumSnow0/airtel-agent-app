import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
import {
  fetchRegistrationDetail,
  type RegistrationDetail,
} from "../../lib/registrations/registrationDetailService";
import {
  REGISTRATION_STATUS_COLORS,
  formatRegistrationStatusLabel,
} from "../../constants/registrationStatuses";
import type { RegistrationSource } from "../../lib/registrations/unifiedListRegistration";
import { syncRegistrationFromSupabase } from "../../lib/services/syncService";
import { isOnline } from "../../lib/services/syncService";
import {
  scaleFont,
  scaleHeight,
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

export default function RegistrationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const registrationSource = (source === "safaricom" ? "safaricom" : "airtel") as RegistrationSource;

  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const loadDetail = useCallback(async () => {
    if (!id) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login" as any);
      return;
    }

    const result = await fetchRegistrationDetail(user.id, id, registrationSource);
    if (result.error || !result.detail) {
      setError(result.error ?? "Registration not found");
      setDetail(null);
    } else {
      setError(null);
      setDetail(result.detail);
    }
  }, [id, registrationSource, router]);

  useEffect(() => {
    loadDetail().finally(() => setIsLoading(false));
  }, [loadDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDetail();
    setRefreshing(false);
  };

  const handleSync = async () => {
    if (!id || registrationSource === "safaricom") return;
    const online = await isOnline();
    if (!online) {
      Alert.alert("Offline", "Connect to the internet to sync.");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncRegistrationFromSupabase(id);
      if (result.success) {
        Alert.alert("Synced", "Registration synced successfully.");
        await loadDetail();
      } else {
        Alert.alert("Sync failed", result.error ?? "Please try again.");
      }
    } finally {
      setSyncing(false);
    }
  };

  if (!fontsLoaded) return null;

  const statusColors =
    REGISTRATION_STATUS_COLORS[detail?.status ?? "pending"] ??
    REGISTRATION_STATUS_COLORS.pending;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registration</Text>
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
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#0066CC"
            style={{ marginTop: 40 }}
          />
        ) : error || !detail ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{error ?? "Not found"}</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.customerName}>{detail.customer_name}</Text>
                  <Text style={styles.carrierLabel}>
                    {detail.source === "safaricom" ? "Safaricom" : "Airtel"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColors.bg },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {formatRegistrationStatusLabel(detail.status)}
                  </Text>
                </View>
              </View>
              {detail.status === "installed" &&
              detail.estimated_commission_ksh != null &&
              detail.estimated_commission_ksh > 0 ? (
                <Text style={styles.commissionText}>
                  Commission: KSh{" "}
                  {detail.estimated_commission_ksh.toLocaleString()}
                </Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Status timeline</Text>
            <View style={styles.timelineCard}>
              {detail.timeline.map((step, index) => (
                <View key={step.key} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        step.completed && styles.timelineDotDone,
                        step.active && styles.timelineDotActive,
                      ]}
                    />
                    {index < detail.timeline.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          step.completed && styles.timelineLineDone,
                        ]}
                      />
                    ) : null}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>{step.label}</Text>
                    <Text style={styles.timelineDesc}>{step.description}</Text>
                    {step.date ? (
                      <Text style={styles.timelineDate}>
                        {new Date(step.date).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Customer details</Text>
            <View style={styles.infoCard}>
              <DetailRow
                label={detail.source === "safaricom" ? "Safaricom no." : "Airtel no."}
                value={detail.airtel_number}
              />
              <DetailRow label="Alternate" value={detail.alternate_number} />
              <DetailRow label="Email" value={detail.email} />
              <DetailRow
                label="Package"
                value={
                  detail.source === "airtel" && detail.preferred_package
                    ? detail.preferred_package === "premium"
                      ? "Premium"
                      : "Standard"
                    : detail.preferred_package
                }
              />
              {detail.units_required && detail.source === "airtel" ? (
                <DetailRow
                  label="Units"
                  value={String(detail.units_required)}
                />
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Installation</Text>
            <View style={styles.infoCard}>
              <DetailRow label="Town" value={detail.installation_town} />
              <DetailRow label="Location" value={detail.installation_location} />
              <DetailRow label="Landmark" value={detail.delivery_landmark} />
              {detail.visit_date ? (
                <DetailRow
                  label="Visit"
                  value={[detail.visit_date, detail.visit_time]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ) : null}
            </View>

            {detail.source === "airtel" ? (
              <>
                <Text style={styles.sectionTitle}>Sync</Text>
                <View style={styles.infoCard}>
                  <DetailRow
                    label="MS Forms"
                    value={
                      detail.syncStatus === "synced"
                        ? "Synced"
                        : detail.syncStatus === "pending"
                          ? "Pending"
                          : "Not synced"
                    }
                  />
                  {detail.syncStatus !== "synced" ? (
                    <TouchableOpacity
                      style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                      onPress={handleSync}
                      disabled={syncing}
                    >
                      <Text style={styles.syncBtnText}>
                        {syncing ? "Syncing…" : "Sync now"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backBtn: { padding: 8, marginRight: 8 },
  backBtnText: { fontSize: 24, color: "#0066CC" },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  content: { padding: 16 },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  customerName: {
    fontSize: scaleFont(20),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  carrierLabel: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_500Medium",
    color: "#888888",
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
  },
  commissionText: {
    marginTop: 12,
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
  },
  sectionTitle: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  timelineRow: { flexDirection: "row", minHeight: scaleHeight(56) },
  timelineRail: { width: 24, alignItems: "center" },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
    marginTop: 4,
  },
  timelineDotDone: { backgroundColor: "#4CAF50" },
  timelineDotActive: { backgroundColor: "#0066CC" },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E8E8E8",
    marginVertical: 4,
  },
  timelineLineDone: { backgroundColor: "#A5D6A7" },
  timelineContent: { flex: 1, paddingBottom: 16, paddingLeft: 8 },
  timelineLabel: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#333333",
  },
  timelineDesc: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#777777",
    marginTop: 2,
  },
  timelineDate: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_400Regular",
    color: "#AAAAAA",
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  detailRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLabel: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_500Medium",
    color: "#999999",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_400Regular",
    color: "#333333",
  },
  syncBtn: {
    marginTop: 12,
    backgroundColor: "#0066CC",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  syncBtnDisabled: { opacity: 0.6 },
  syncBtnText: {
    fontSize: scaleFont(14),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  emptyBox: { alignItems: "center", paddingTop: 40 },
  emptyText: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
});
