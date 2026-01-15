import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import {
  CachedAgentData,
  getCachedAgentData,
  clearAgentDataCache,
} from "../lib/cache/agentCache";
import {
  clearDashboardDataCache,
  getCachedDashboardData,
} from "../lib/cache/dashboardCache";
import { clearNotificationsCache } from "../lib/cache/notificationsCache";
import { clearRegistrationsCache } from "../lib/cache/registrationsCache";
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
  getCardPadding,
} from "../lib/utils/responsive";
import { isOnline } from "../lib/services/syncService";

// Helper function to get first letter of name
const getInitial = (name?: string, email?: string): string => {
  if (name && name.trim().length > 0) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim().length > 0) {
    return email.trim().charAt(0).toUpperCase();
  }
  return "?";
};

// Helper function to format date
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    return "N/A";
  }
};

// Helper function to get status display info
const getStatusInfo = (status: string) => {
  switch (status) {
    case "approved":
      return {
        label: "Account Active",
        color: "#2E7D32",
        bgColor: "#E8F5E9",
        icon: "✓",
      };
    case "pending":
      return {
        label: "Awaiting Approval",
        color: "#E65100",
        bgColor: "#FFF4E6",
        icon: "⏳",
      };
    case "banned":
      return {
        label: "Account Suspended",
        color: "#C62828",
        bgColor: "#FFEBEE",
        icon: "⚠",
      };
    case "rejected":
      return {
        label: "Application Rejected",
        color: "#616161",
        bgColor: "#F5F5F5",
        icon: "✗",
      };
    default:
      return {
        label: "Unknown",
        color: "#999999",
        bgColor: "#F5F5F5",
        icon: "?",
      };
  }
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<CachedAgentData | null>(null);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalInstalled, setTotalInstalled] = useState(0);
  const [balance, setBalance] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      // Check if online
      const online = await isOnline();
      setIsOffline(!online);

      // Get current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (!currentUser) {
        router.replace("/login" as any);
        return;
      }

      setUser(currentUser);

      // If offline, load from cache
      if (!online) {
        const cachedAgentData = await getCachedAgentData();
        const cachedDashboardData = await getCachedDashboardData();
        if (cachedAgentData) {
          setAgentData(cachedAgentData);
          setBalance(cachedAgentData.available_balance || 0);
        }
        if (cachedDashboardData) {
          setTotalRegistered(cachedDashboardData.totalRegistered || 0);
          setTotalInstalled(cachedDashboardData.totalInstalled || 0);
        }
        setIsLoading(false);
        return;
      }

      // Online - load from cache first for fast display
      const cachedAgentData = await getCachedAgentData();
      const cachedDashboardData = await getCachedDashboardData();
      if (cachedAgentData) {
        setAgentData(cachedAgentData);
        setBalance(cachedAgentData.available_balance || 0);
      }
      if (cachedDashboardData) {
        setTotalRegistered(cachedDashboardData.totalRegistered || 0);
        setTotalInstalled(cachedDashboardData.totalInstalled || 0);
      }

      // Fetch fresh data from database
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (agentError) {
        console.error("Error loading agent data:", agentError);
      } else {
        setAgentData(agent);
        setBalance(agent.available_balance || 0);
      }

      // Load registration statistics
      const { count: registeredCount } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", currentUser.id);

      if (registeredCount !== null) {
        setTotalRegistered(registeredCount);
      }

      const { count: installedCount } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", currentUser.id)
        .eq("status", "installed");

      if (installedCount !== null) {
        setTotalInstalled(installedCount);
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    // Don't refresh if offline
    const online = await isOnline();
    if (!online) {
      Alert.alert(
        "Offline",
        "You're currently offline. Please connect to the internet to refresh your profile data.",
        [{ text: "OK" }]
      );
      return;
    }
    
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all caches
              await clearAgentDataCache();
              await clearDashboardDataCache();
              await clearNotificationsCache();
              await clearRegistrationsCache();

              // Sign out from Supabase
              // The auth state change listener in _layout.tsx will handle navigation
              await supabase.auth.signOut();
            } catch (error) {
              console.error("Error logging out:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const name = agentData?.name || user?.email || "Agent";
  const email = agentData?.email || user?.email || "";
  const initial = getInitial(agentData?.name, user?.email);
  const statusInfo = getStatusInfo(agentData?.status || "pending");

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        {/* Online/Offline Status Indicator */}
        <View style={styles.headerRight}>
          <View style={[styles.statusIndicator, isOffline ? styles.statusIndicatorOffline : styles.statusIndicatorOnline]}>
            <View style={[styles.statusDot, isOffline ? styles.statusDotOffline : styles.statusDotOnline]} />
            <Text style={[styles.statusText, isOffline ? styles.statusTextOffline : styles.statusTextOnline]}>
              {isOffline ? "Offline" : "Online"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066CC"
            colors={["#0066CC"]}
            enabled={!isOffline} // Disable pull-to-refresh when offline
          />
        }
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusInfo.bgColor },
              ]}
            >
              <Text style={[styles.statusBadgeIcon, { color: statusInfo.color }]}>
                {statusInfo.icon}
              </Text>
            </View>
          </View>

          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>

          {/* Status Badge */}
          <View
            style={[
              styles.statusChip,
              { backgroundColor: statusInfo.bgColor },
            ]}
          >
            <Text style={[styles.statusChipText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Statistics Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Account Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                KSh {balance.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Available Balance</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                KSh {(agentData?.total_earnings || 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalRegistered}</Text>
              <Text style={styles.statLabel}>Total Registered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalInstalled}</Text>
              <Text style={styles.statLabel}>Total Installed</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Airtel Phone</Text>
              <Text style={styles.infoValue}>
                {agentData?.airtel_phone || "Not provided"}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Safaricom Phone</Text>
              <Text style={styles.infoValue}>
                {agentData?.safaricom_phone || "Not provided"}
              </Text>
            </View>
          </View>
        </View>

        {/* Location Information */}
        {(agentData?.town || agentData?.area) && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.infoCard}>
              {agentData?.town && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Town</Text>
                    <Text style={styles.infoValue}>{agentData.town}</Text>
                  </View>
                  {agentData?.area && <View style={styles.infoDivider} />}
                </>
              )}
              {agentData?.area && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Area</Text>
                  <Text style={styles.infoValue}>{agentData.area}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Account Details */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {formatDate(agentData?.created_at)}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonIcon: {
    fontSize: 24,
    color: "#333333",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
  },
  headerRight: {
    width: 80,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
  },
  statusIndicatorOnline: {
    backgroundColor: "#E8F5E9",
  },
  statusIndicatorOffline: {
    backgroundColor: "#FFF3E0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusDotOnline: {
    backgroundColor: "#4CAF50",
  },
  statusDotOffline: {
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  statusTextOnline: {
    color: "#2E7D32",
  },
  statusTextOffline: {
    color: "#E65100",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: scaleHeight(100),
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 40,
    fontFamily: "Poppins_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  statusBadgeIcon: {
    fontSize: 16,
    fontWeight: "bold",
  },
  name: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#333333",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  email: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#0066CC",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#666666",
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
    letterSpacing: 0.2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 4,
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
    shadowColor: "#FF3B30",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  bottomSpacing: {
    height: 20,
  },
});
