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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { MaterialIcons } from "@expo/vector-icons";
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
  fetchActiveOffers,
  fetchAssignedLeads,
} from "../lib/services/leadDispatchService";
import type { InboundLead, LeadOffer, LeadOfferPreview } from "../lib/dispatch/types";
import { LeadOfferModal } from "../components/LeadOfferModal";
import {
  isLeadOfferAlertLoopActive,
  startLeadOfferAlertLoop,
  stopLeadOfferAlertLoop,
} from "../lib/services/leadAlertService";
import {
  LEAD_STATUS_COLORS,
  formatLeadStatusLabel,
} from "../constants/leadStatuses";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

function OfferCard({
  offer,
  onPress,
}: {
  offer: LeadOffer;
  onPress: () => void;
}) {
  const p = offer.preview_payload as LeadOfferPreview;
  const isSaf = p.product === "safaricom";
  const brand = isSaf ? "#00A651" : "#E60012";

  return (
    <TouchableOpacity style={styles.offerCard} onPress={onPress} activeOpacity={0.88}>
      <View style={[styles.offerBrandStrip, { backgroundColor: brand }]} />
      <View style={styles.offerBody}>
        <View style={styles.offerTop}>
          <View style={[styles.offerBadge, { backgroundColor: brand }]}>
            <Text style={styles.offerBadgeText}>{isSaf ? "S" : "A"}</Text>
          </View>
          <View style={styles.offerInfo}>
            <Text style={styles.offerTitle}>
              {isSaf ? "Safaricom" : "Airtel"} lead
            </Text>
            <Text style={styles.offerLocation} numberOfLines={2}>
              {[p.installationTown, p.roughArea].filter(Boolean).join(" · ") ||
                "Area hidden"}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={scaleWidth(24)} color="#0066CC" />
        </View>
        <Text style={styles.offerPackage} numberOfLines={1}>
          {p.packageLabel ?? "Package TBC"}
        </Text>
        <View style={styles.offerFooter}>
          <MaterialIcons name="timer" size={scaleWidth(14)} color="#E65100" />
          <Text style={styles.offerTimer}>Tap to respond before expiry</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function LeadsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openOffer } = useLocalSearchParams<{ openOffer?: string }>();
  const [offers, setOffers] = useState<LeadOffer[]>([]);
  const [leads, setLeads] = useState<InboundLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOffer, setModalOffer] = useState<LeadOffer | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openOfferModal = useCallback((offer: LeadOffer) => {
    setModalOffer(offer);
    setModalVisible(true);
    if (!isLeadOfferAlertLoopActive(offer.id)) {
      startLeadOfferAlertLoop(offer.id, offer.expires_at, () => {
        setModalOffer((current) => current ?? offer);
        setModalVisible(true);
      });
    }
  }, []);

  const clearOfferModal = useCallback(() => {
    stopLeadOfferAlertLoop();
    setModalVisible(false);
    setModalOffer(null);
  }, []);

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
    const [offersRes, leadsRes] = await Promise.all([
      fetchActiveOffers(user.id),
      fetchAssignedLeads(user.id),
    ]);
    setOffers(offersRes.offers);
    setLeads(leadsRes.leads);

    if (openOffer) {
      const match = offersRes.offers.find((o) => o.id === openOffer);
      if (match) {
        openOfferModal(match);
      }
    }
  }, [openOffer, openOfferModal, router]);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={scaleWidth(24)} color="#0066CC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inbound leads</Text>
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
          <ActivityIndicator size="large" color="#0066CC" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.sectionHead}>
              <MaterialIcons name="flash-on" size={scaleWidth(20)} color="#E65100" />
              <Text style={styles.sectionTitle}>Incoming offers</Text>
            </View>
            {offers.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="inbox" size={scaleWidth(36)} color="#CCCCCC" />
                <Text style={styles.emptyTitle}>No offers right now</Text>
                <Text style={styles.emptyText}>
                  Turn on &quot;Available for leads&quot; in Profile to receive website customers.
                </Text>
              </View>
            ) : (
              offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onPress={() => openOfferModal(offer)}
                />
              ))
            )}

            <View style={[styles.sectionHead, { marginTop: scaleHeight(24) }]}>
              <MaterialIcons name="assignment" size={scaleWidth(20)} color="#0066CC" />
              <Text style={styles.sectionTitle}>My assigned leads</Text>
            </View>
            {leads.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="person-search" size={scaleWidth(36)} color="#CCCCCC" />
                <Text style={styles.emptyTitle}>Nothing in progress</Text>
                <Text style={styles.emptyText}>
                  Accepted leads appear here until installed or released.
                </Text>
              </View>
            ) : (
              leads.map((lead) => {
                const st =
                  LEAD_STATUS_COLORS[lead.status] ?? LEAD_STATUS_COLORS.assigned;
                const isSaf = lead.product === "safaricom";
                return (
                  <TouchableOpacity
                    key={lead.id}
                    style={styles.leadCard}
                    onPress={() => router.push(`/lead/${lead.id}` as any)}
                    activeOpacity={0.88}
                  >
                    <View
                      style={[
                        styles.leadBrandDot,
                        { backgroundColor: isSaf ? "#00A651" : "#E60012" },
                      ]}
                    />
                    <View style={styles.leadCardBody}>
                      <View style={styles.leadCardTop}>
                        <Text style={styles.leadName}>{lead.customer_name}</Text>
                        <View style={[styles.chip, { backgroundColor: st.bg }]}>
                          <Text style={[styles.chipText, { color: st.text }]}>
                            {formatLeadStatusLabel(lead.status)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.leadMeta}>
                        {isSaf ? "Safaricom" : "Airtel"} · {lead.installation_town}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={scaleWidth(22)} color="#999" />
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      <LeadOfferModal
        visible={modalVisible}
        offer={modalOffer}
        onDismiss={() => setModalVisible(false)}
        onExpired={clearOfferModal}
        onDeclined={() => {
          clearOfferModal();
          void loadData();
        }}
        onAccepted={(leadId) => {
          stopLeadOfferAlertLoop();
          setModalVisible(false);
          setModalOffer(null);
          router.push(`/lead/${leadId}` as any);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(12),
    paddingVertical: scaleHeight(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: { padding: scaleWidth(8) },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  headerSpacer: { width: scaleWidth(40) },
  content: { padding: scaleWidth(16) },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(8),
    marginBottom: scaleHeight(12),
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(14),
    padding: scaleWidth(24),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  emptyTitle: {
    fontSize: scaleFont(15),
    fontFamily: "Poppins_600SemiBold",
    color: "#444444",
    marginTop: scaleHeight(10),
  },
  emptyText: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    marginTop: scaleHeight(6),
    lineHeight: scaleFont(19),
  },
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(14),
    marginBottom: scaleHeight(10),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  offerBrandStrip: {
    width: scaleWidth(5),
  },
  offerBody: {
    flex: 1,
    padding: scaleWidth(14),
  },
  offerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scaleHeight(6),
  },
  offerBadge: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(10),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scaleWidth(10),
  },
  offerBadgeText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_700Bold",
    fontSize: scaleFont(16),
  },
  offerInfo: { flex: 1 },
  offerTitle: {
    fontSize: scaleFont(15),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  offerLocation: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginTop: scaleHeight(2),
  },
  offerPackage: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
    marginBottom: scaleHeight(8),
  },
  offerFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(4),
  },
  offerTimer: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_500Medium",
    color: "#E65100",
  },
  leadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(14),
    padding: scaleWidth(14),
    marginBottom: scaleHeight(10),
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  leadBrandDot: {
    width: scaleWidth(10),
    height: scaleWidth(10),
    borderRadius: scaleWidth(5),
    marginRight: scaleWidth(12),
  },
  leadCardBody: { flex: 1 },
  leadCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleHeight(4),
  },
  leadName: {
    fontSize: scaleFont(15),
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    flex: 1,
    marginRight: scaleWidth(8),
  },
  leadMeta: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  chip: {
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(3),
    borderRadius: scaleWidth(10),
  },
  chipText: {
    fontSize: scaleFont(10),
    fontFamily: "Inter_600SemiBold",
  },
});
