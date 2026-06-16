import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
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
import { supabase } from "../lib/supabase";
import {
  fetchAgentPaymentHistory,
  type AgentPaymentRow,
} from "../lib/services/paymentHistoryService";
import { fetchWalletCommissionKsh } from "../lib/commissions/walletCommission";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

export default function EarningsHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState<AgentPaymentRow[]>([]);
  const [totalEarnedKsh, setTotalEarnedKsh] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login" as any);
      return;
    }

    const [history, earned] = await Promise.all([
      fetchAgentPaymentHistory(user.id),
      fetchWalletCommissionKsh(user.id),
    ]);

    if (history.error) {
      setError(history.error);
    } else {
      setError(null);
      setPayments(history.payments);
    }
    setTotalEarnedKsh(earned);
  }, [router]);

  useEffect(() => {
    loadData().finally(() => setIsLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalPaidKsh = payments.reduce((sum, p) => sum + p.amount_ksh, 0);
  const balanceKsh = Math.max(0, totalEarnedKsh - totalPaidKsh);

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
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
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total earned</Text>
              <Text style={styles.summaryValue}>
                KSh {totalEarnedKsh.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Paid to you</Text>
              <Text style={styles.summaryValue}>
                KSh {totalPaidKsh.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Outstanding balance</Text>
            <Text style={styles.balanceValue}>
              KSh {balanceKsh.toLocaleString()}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Payouts</Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#0066CC"
            style={{ marginTop: 32 }}
          />
        ) : error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Could not load payments</Text>
            <Text style={styles.emptySubtext}>{error}</Text>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>No payouts yet</Text>
            <Text style={styles.emptySubtext}>
              When admin records a payment, it will appear here and you'll get
              a notification.
            </Text>
          </View>
        ) : (
          payments.map((payment) => (
            <View key={payment.id} style={styles.paymentCard}>
              <View style={styles.paymentTop}>
                <Text style={styles.paymentAmount}>
                  KSh {payment.amount_ksh.toLocaleString()}
                </Text>
                <Text style={styles.paymentDate}>
                  {new Date(payment.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
              {payment.reference ? (
                <Text style={styles.paymentMeta}>
                  Ref: {payment.reference}
                </Text>
              ) : null}
              {payment.notes ? (
                <Text style={styles.paymentNotes}>{payment.notes}</Text>
              ) : null}
            </View>
          ))
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
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  summaryRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  summaryItem: { flex: 1 },
  summaryLabel: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#777777",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  balanceRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#555555",
  },
  balanceValue: {
    fontSize: scaleFont(16),
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
  },
  sectionTitle: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  paymentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentAmount: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  paymentDate: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#888888",
  },
  paymentMeta: {
    marginTop: 6,
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  paymentNotes: {
    marginTop: 4,
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#444444",
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: scaleHeight(40),
    paddingHorizontal: 24,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    lineHeight: scaleFont(20),
  },
});
