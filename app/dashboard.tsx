import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
    Poppins_600SemiBold,
    Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    CachedAgentData,
    clearAgentDataCache,
    getCachedAgentData,
    saveAgentDataToCache,
} from "../lib/cache/agentCache";
import { supabase } from "../lib/supabase";

// Helper function to get time-based greeting
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning 👋,";
  } else if (hour < 18) {
    return "Good afternoon 👋,";
  } else {
    return "Good evening 👋,";
  }
};

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

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<CachedAgentData | null>(null);
  const [greeting, setGreeting] = useState("Good morning,");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [balance, setBalance] = useState(0); // Agent commission balance
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalInstalled, setTotalInstalled] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    loadUserData();

    // Listen for auth state changes (logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          // Clear cache on logout
          await clearAgentDataCache();
          router.replace("/" as any);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Real-time subscription for agent balance updates
  useEffect(() => {
    if (!user?.id) return;

    console.log("🔴 Setting up real-time subscription for agent:", user.id);

    // Subscribe to changes in the agents table for this specific agent
    const balanceChannel = supabase
      .channel(`agent-balance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agents",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log("🟢 Real-time balance update received:", payload);
          const updatedAgent = payload.new as CachedAgentData;
          
          // Update agent data
          setAgentData(updatedAgent);
          saveAgentDataToCache(updatedAgent);
          
          // Update balance if it changed
          if (updatedAgent.available_balance !== undefined && updatedAgent.available_balance !== null) {
            setBalance(updatedAgent.available_balance);
            console.log("💰 Balance updated:", updatedAgent.available_balance);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Balance subscription status:", status);
      });

    return () => {
      console.log("🔴 Unsubscribing from balance updates");
      supabase.removeChannel(balanceChannel);
    };
  }, [user?.id]);

  // Real-time subscription for customer registrations (status updates)
  useEffect(() => {
    if (!user?.id) return;

    console.log("🔴 Setting up real-time subscription for registrations:", user.id);

    // Subscribe to changes in customer_registrations for this agent
    const registrationsChannel = supabase
      .channel(`agent-registrations-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "customer_registrations",
          filter: `agent_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("🟢 Real-time registration update received:", payload.eventType, payload);
          
          // Reload customer data to get updated statuses and counts
          await loadCustomerData(user.id);
        }
      )
      .subscribe((status) => {
        console.log("📡 Registrations subscription status:", status);
      });

    return () => {
      console.log("🔴 Unsubscribing from registration updates");
      supabase.removeChannel(registrationsChannel);
    };
  }, [user?.id]);

  // Animate hourglass rotation when pending
  useEffect(() => {
    const isApproved = agentData?.status === "approved";
    if (!isApproved && agentData !== null) {
      // Start rotation animation for pending status
      const rotateAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      return () => rotateAnimation.stop();
    } else {
      // Reset animation when approved
      spinValue.setValue(0);
    }
  }, [agentData?.status]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !currentUser) {
        // No user - clear cache and redirect to login
        await clearAgentDataCache();
        router.replace("/login" as any);
        return;
      }

      // Check if email is verified
      if (!currentUser.email_confirmed_at) {
        await clearAgentDataCache();
        Alert.alert(
          "Email Not Verified",
          "Please verify your email address first.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/verify-email" as any),
            },
          ]
        );
        return;
      }

      setUser(currentUser);

      // Try to load cached agent data first (for fast initial display)
      const cachedAgentData = await getCachedAgentData();
      let hasCachedData = false;
      if (cachedAgentData) {
        setAgentData(cachedAgentData);
        setIsLoading(false); // Show cached data immediately
        hasCachedData = true;
      }

      // Fetch fresh agent data from database (background fetch)
      // Include balance and earnings columns
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (agentError) {
        console.error("Error loading agent data:", agentError);
        // Agent record doesn't exist - treat as pending
        // Clear cache and set agentData to null
        await clearAgentDataCache();
        setAgentData(null);
      } else {
        // Save fresh data to cache
        await saveAgentDataToCache(agent);
        setAgentData(agent);
        
        // Set balance and total earnings from database
        // These are automatically updated by the database trigger
        setBalance(agent.available_balance || 0);
        // Note: total_earnings is used in the UI calculation below
      }

      // Load customer registrations data
      if (currentUser) {
        await loadCustomerData(currentUser.id);
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
      // Don't show error alert if we have cached data (better UX)
      const cachedAgentData = await getCachedAgentData();
      if (!cachedAgentData) {
        Alert.alert("Error", "Failed to load user data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all data (for pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadUserData();
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load customer registration data
  const loadCustomerData = async (agentId: string) => {
    try {
      setIsLoadingRegistrations(true);

      // Fetch customer registrations
      const { data: registrations, error: regError } = await supabase
        .from("customer_registrations")
        .select("id, customer_name, status, created_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (regError) {
        console.error("Error loading registrations:", regError);
      } else {
        setRecentRegistrations(registrations || []);
      }

      // Calculate stats
      const { count: totalRegistered, error: countError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);

      if (!countError && totalRegistered !== null) {
        setTotalRegistered(totalRegistered);
      }

      const { count: totalInstalled, error: installedError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "installed");

      if (!installedError && totalInstalled !== null) {
        setTotalInstalled(totalInstalled);
      }

      // Balance and total_earnings are now loaded from the agents table
      // They are automatically updated by database triggers when status changes
      // No need to calculate here - already set from agent data above
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const handleProfilePress = () => {
    // Profile/settings logic - to be implemented later
    console.log("Profile button pressed");
  };

  if (!fontsLoaded) {
    return null;
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const isApproved = agentData?.status === "approved";
  const name = agentData?.name || user?.email || "";
  const initial = getInitial(agentData?.name, user?.email);

  // Interpolate rotation for hourglass animation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0066CC"
            colors={["#0066CC"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          {/* Left: Profile Icon Button */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            <View style={styles.profileIconContainer}>
              <Text style={styles.profileInitial}>{initial}</Text>
              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  isApproved && styles.statusBadgeApproved,
                ]}
              >
                {isApproved ? (
                  <Text style={styles.statusBadgeIcon}>✓</Text>
                ) : (
                  <Animated.Text
                    style={[
                      styles.statusBadgeIcon,
                      { transform: [{ rotate: spin }] },
                    ]}
                  >
                    ⏳
                  </Animated.Text>
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Left: Greeting and Name */}
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.name}>{name}</Text>
          </View>

          {/* Right: Notification Icon Button */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              // Notification logic - to be implemented later
              console.log("Notification button pressed");
            }}
            activeOpacity={0.7}
          >
            <View style={styles.notificationIconContainer}>
              <Text style={styles.notificationIcon}>🔔</Text>
              {/* Unread Notification Badge */}
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceContent}>
            <View style={styles.balanceLeft}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>
                KSh {balance.toLocaleString()}
              </Text>
              <View style={styles.totalEarningsContainer}>
                <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
                <Text style={styles.totalEarningsAmount}>
                  KSh {(agentData?.total_earnings ?? totalInstalled * 150).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.balanceIconContainer}>
              <Text style={styles.balanceIcon}>💰</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Registered</Text>
            <Text style={styles.statValue}>{totalRegistered}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Installed</Text>
            <Text style={styles.statValue}>{totalInstalled}</Text>
          </View>
        </View>

        {/* Register New Customer Button */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => {
            // Navigate to customer registration form
            router.push("/register-customer" as any);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.registerButtonText}>+ Register New Customer</Text>
        </TouchableOpacity>

        {/* Recent Registrations Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Registrations</Text>
          {recentRegistrations.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                // Navigate to all registrations view
                console.log("View all registrations");
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recent Registrations List */}
        {isLoadingRegistrations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#0066CC" />
          </View>
        ) : recentRegistrations.length > 0 ? (
          <View style={styles.registrationsList}>
            {recentRegistrations.slice(0, 5).map((registration, index) => (
              <TouchableOpacity
                key={registration.id || index}
                style={styles.registrationCard}
                activeOpacity={0.7}
                onPress={() => {
                  // Navigate to registration details
                  console.log("View registration details");
                }}
              >
                <View style={styles.registrationContent}>
                  <View style={styles.registrationLeft}>
                    <Text style={styles.registrationName}>
                      {registration.customer_name || "Customer"}
                    </Text>
                    <Text style={styles.registrationDate}>
                      {registration.created_at
                        ? new Date(registration.created_at).toLocaleDateString()
                        : "N/A"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.registrationStatus,
                      registration.status === "installed" &&
                        styles.registrationStatusInstalled,
                      registration.status === "approved" &&
                        styles.registrationStatusApproved,
                    ]}
                  >
                    <Text
                      style={[
                        styles.registrationStatusText,
                        registration.status === "installed" &&
                          styles.registrationStatusTextInstalled,
                        registration.status === "approved" &&
                          styles.registrationStatusTextApproved,
                      ]}
                    >
                      {registration.status || "pending"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No registrations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start by registering your first customer
            </Text>
          </View>
        )}
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
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 20,
  },
  balanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLeft: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  balanceAmount: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#0066CC",
    letterSpacing: 0.3,
  },
  totalEarningsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  totalEarningsLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  totalEarningsAmount: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#4CAF50",
    letterSpacing: 0.2,
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E6F2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceIcon: {
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
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
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  registerButton: {
    backgroundColor: "#0066CC",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  registerButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    letterSpacing: 0.2,
  },
  registrationsList: {
    gap: 12,
  },
  registrationCard: {
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
  registrationContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  registrationLeft: {
    flex: 1,
  },
  registrationName: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  registrationDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    letterSpacing: 0.2,
  },
  registrationStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#FFF4E6",
  },
  registrationStatusInstalled: {
    backgroundColor: "#E8F5E9",
  },
  registrationStatusApproved: {
    backgroundColor: "#E3F2FD",
  },
  registrationStatusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#FFA500",
    textTransform: "capitalize",
  },
  registrationStatusTextInstalled: {
    color: "#4CAF50",
  },
  registrationStatusTextApproved: {
    color: "#2196F3",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderStyle: "dashed",
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  greetingContainer: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  profileButton: {
    marginRight: 0,
  },
  notificationButton: {
    padding: 4,
  },
  notificationIconContainer: {
    position: "relative",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: "#F5F7FA",
  },
  notificationBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  profileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  profileInitial: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  statusBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F5F7FA",
    backgroundColor: "#FFF4E6", // Light orange background for pending
  },
  statusBadgeApproved: {
    backgroundColor: "#4CAF50",
  },
  statusBadgeIcon: {
    fontSize: 9,
    color: "#FFA500",
    fontWeight: "bold",
  },
  body: {
    flex: 1,
    // Empty for now - content will be added later
  },
});
