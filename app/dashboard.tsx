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
import { useRouter, useSegments } from "expo-router";
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
import { Toast } from "../components/Toast";
import {
    CachedAgentData,
    clearAgentDataCache,
    getCachedAgentData,
    saveAgentDataToCache,
} from "../lib/cache/agentCache";
import {
    clearDashboardDataCache,
    getCachedDashboardData,
    saveDashboardDataToCache,
} from "../lib/cache/dashboardCache";
import { clearNotificationsCache } from "../lib/cache/notificationsCache";
import { clearRegistrationsCache } from "../lib/cache/registrationsCache";
import { getPendingRegistrations, initOfflineStorage } from "../lib/services/offlineStorage";
import { isOnline, setupAutoSync } from "../lib/services/syncService";
import { supabase } from "../lib/supabase";
import {
    getCardPadding,
    getResponsivePadding,
    scaleFont,
    scaleHeight,
    scaleWidth
} from "../lib/utils/responsive";

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
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<CachedAgentData | null>(null);
  const [greeting, setGreeting] = useState("Good morning,");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Load unread notification count
  const loadUnreadNotificationCount = async (agentId: string) => {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("is_read", false);

      if (error) {
        console.error("Error loading unread notification count:", error);
        return;
      }

      if (count !== null) {
        console.log("📊 Unread notifications count:", count);
        setUnreadNotifications(count);
      } else {
        console.log("📊 No unread notifications");
        setUnreadNotifications(0);
      }
    } catch (error) {
      console.error("Error loading unread notification count:", error);
      setUnreadNotifications(0);
    }
  };
  const [balance, setBalance] = useState(0); // Agent commission balance
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalInstalled, setTotalInstalled] = useState(0);
  const [premiumRegistered, setPremiumRegistered] = useState(0);
  const [standardRegistered, setStandardRegistered] = useState(0);
  const [premiumInstalled, setPremiumInstalled] = useState(0);
  const [standardInstalled, setStandardInstalled] = useState(0);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSyncRegistrations, setPendingSyncRegistrations] = useState<Set<string>>(new Set());
  const spinValue = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const [isOffline, setIsOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    setGreeting(getTimeBasedGreeting());
    initOfflineStorage();
    loadUserData();
    
    // Also load notification count on mount
    const loadInitialNotificationCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await loadUnreadNotificationCount(user.id);
        
        // Register device token for push notifications
        const { requestNotificationPermissions, getDeviceToken, registerDeviceToken } = await import("../lib/services/pushNotificationService");
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
          const token = await getDeviceToken();
          if (token) {
            await registerDeviceToken(user.id, token);
          }
        }
      }
    };
    loadInitialNotificationCount();

    // Listen for auth state changes (logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          // Clear all caches on logout
          await clearAgentDataCache();
          await clearDashboardDataCache();
          await clearNotificationsCache();
          await clearRegistrationsCache();
          router.replace("/" as any);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Setup auto-sync for pending registrations
  useEffect(() => {
    if (!user?.id) return;

    const showToast = (message: string, type: "info" | "success" | "error" = "info") => {
      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);
    };

    const cleanup = setupAutoSync(user.id, (current, total) => {
      if (total > 0) {
        showToast(`Syncing offline data... ${current} of ${total}`, "info");
      }
    });

    return () => {
      cleanup();
    };
  }, [user?.id]);

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
          console.log("🟢 Real-time agent update received:", payload);
          const updatedAgent = payload.new as CachedAgentData;
          
          // Update agent data (includes status, balance, earnings, etc.)
          setAgentData(updatedAgent);
          saveAgentDataToCache(updatedAgent);
          
          // Update balance if it changed
          if (updatedAgent.available_balance !== undefined && updatedAgent.available_balance !== null) {
            setBalance(updatedAgent.available_balance);
            console.log("💰 Balance updated:", updatedAgent.available_balance);
          }
          
          // Log status change if it occurred
          if (payload.old && payload.old.status !== updatedAgent.status) {
            console.log("🔄 Agent status changed:", payload.old.status, "→", updatedAgent.status);
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

    // Subscribe to notifications for real-time updates
    const notificationsChannel = supabase
      .channel(`agent-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "notifications",
          filter: `agent_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("🔔 Notification update received:", payload.eventType, payload);
          
          // Handle different event types
          if (payload.eventType === "INSERT") {
            console.log("🆕 New notification inserted:", payload.new);
            // New notification - reload count
            await loadUnreadNotificationCount(user.id);
          } else if (payload.eventType === "UPDATE") {
            console.log("🔄 Notification updated:", payload.new);
            // Notification marked as read or updated - reload count
            await loadUnreadNotificationCount(user.id);
          } else if (payload.eventType === "DELETE") {
            console.log("🗑️ Notification deleted");
            // Notification deleted - reload count
            await loadUnreadNotificationCount(user.id);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Notifications subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to notifications");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to notifications");
        }
      });

    return () => {
      console.log("🔴 Unsubscribing from registration updates");
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(notificationsChannel);
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

  // Check network status periodically
  useEffect(() => {
    if (!user?.id) return;
    
    let isChecking = false;
    
    const checkNetworkStatus = async () => {
      if (isChecking) return; // Prevent concurrent checks
      isChecking = true;
      
      try {
        const online = await isOnline();
        const currentlyOffline = !online;
        const previousOffline = wasOfflineRef.current;
        
        // Only update state if it changed
        if (currentlyOffline !== isOffline) {
          setIsOffline(currentlyOffline);
          
          // If just came back online (transitioned from offline to online), reload data
          if (online && previousOffline && !currentlyOffline) {
            console.log("🔄 Back online - refreshing data");
            // Reload data when coming back online
            loadUserData();
          }
          
          // Update ref
          wasOfflineRef.current = currentlyOffline;
        }
      } catch (error) {
        console.error("Error checking network status:", error);
      } finally {
        isChecking = false;
      }
    };

    // Check immediately (set initial state, but don't reload)
    isOnline().then((online) => {
      const offline = !online;
      setIsOffline(offline);
      wasOfflineRef.current = offline;
    });

    // Check every 10 seconds (less frequent to avoid issues)
    const interval = setInterval(checkNetworkStatus, 10000);

    return () => clearInterval(interval);
  }, [user?.id]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Check if online (with timeout to prevent hanging)
      // Use Promise.race to ensure it doesn't hang when offline
      const onlinePromise = isOnline();
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 3000); // 3 second max for initial check
      });
      const online = await Promise.race([onlinePromise, timeoutPromise]);
      setIsOffline(!online);

      // Get current user - use getSession() which works offline
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const currentUser = session?.user;

      if (!currentUser) {
        // No user session - clear cache and redirect to login
        await clearAgentDataCache();
        await clearDashboardDataCache();
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

      // If offline, load from cache
      if (!online) {
        console.log("📴 Offline - loading from cache");
        const cachedDashboardData = await getCachedDashboardData();
        if (cachedDashboardData) {
          setAgentData(cachedDashboardData.agentData);
          setBalance(cachedDashboardData.balance);
          setTotalRegistered(cachedDashboardData.totalRegistered);
          setTotalInstalled(cachedDashboardData.totalInstalled);
          setPremiumRegistered(cachedDashboardData.premiumRegistered ?? 0);
          setStandardRegistered(cachedDashboardData.standardRegistered ?? 0);
          setPremiumInstalled(cachedDashboardData.premiumInstalled ?? 0);
          setStandardInstalled(cachedDashboardData.standardInstalled ?? 0);
          setRecentRegistrations(cachedDashboardData.recentRegistrations);
          setIsLoading(false);
          return;
        } else {
          // No cache available - try to load agent cache at least
          const cachedAgentData = await getCachedAgentData();
          if (cachedAgentData) {
            setAgentData(cachedAgentData);
          }
          // Always set loading to false, even if no cache (prevents infinite loading)
          setIsLoading(false);
          return;
        }
      }

      // Online - Try to load cached data first (for fast initial display)
      const cachedDashboardData = await getCachedDashboardData();
      if (cachedDashboardData) {
        setAgentData(cachedDashboardData.agentData);
        setBalance(cachedDashboardData.balance);
        setTotalRegistered(cachedDashboardData.totalRegistered);
        setTotalInstalled(cachedDashboardData.totalInstalled);
        setPremiumRegistered(cachedDashboardData.premiumRegistered ?? 0);
        setStandardRegistered(cachedDashboardData.standardRegistered ?? 0);
        setPremiumInstalled(cachedDashboardData.premiumInstalled ?? 0);
        setStandardInstalled(cachedDashboardData.standardInstalled ?? 0);
        setRecentRegistrations(cachedDashboardData.recentRegistrations);
        setIsLoading(false); // Show cached data immediately
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
        // If we have cached data, keep using it
        if (!cachedDashboardData) {
          await clearAgentDataCache();
          setAgentData(null);
        }
      } else {
        // Save fresh data to cache
        await saveAgentDataToCache(agent);
        setAgentData(agent);
        
        // Set balance and total earnings from database
        // These are automatically updated by the database trigger
        setBalance(agent.available_balance || 0);
        // Note: total_earnings is used in the UI calculation below
      }

      // Load customer registrations data and notification count
      if (currentUser && online) {
        await loadCustomerData(currentUser.id);
        await loadUnreadNotificationCount(currentUser.id);
        
        // Save complete dashboard data to cache after all data is loaded
        if (agentData) {
          await saveDashboardDataToCache({
            agentData,
            balance: balance ?? 0,
            totalRegistered: totalRegistered ?? 0,
            totalInstalled: totalInstalled ?? 0,
            recentRegistrations: recentRegistrations,
          });
        }
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
      // If offline or error, try to load from cache
      const cachedDashboardData = await getCachedDashboardData();
      if (cachedDashboardData) {
        setAgentData(cachedDashboardData.agentData);
        setBalance(cachedDashboardData.balance);
        setTotalRegistered(cachedDashboardData.totalRegistered);
        setTotalInstalled(cachedDashboardData.totalInstalled);
        setPremiumRegistered(cachedDashboardData.premiumRegistered ?? 0);
        setStandardRegistered(cachedDashboardData.standardRegistered ?? 0);
        setPremiumInstalled(cachedDashboardData.premiumInstalled ?? 0);
        setStandardInstalled(cachedDashboardData.standardInstalled ?? 0);
        setRecentRegistrations(cachedDashboardData.recentRegistrations);
      } else {
        const cachedAgentData = await getCachedAgentData();
        if (!cachedAgentData) {
          Alert.alert("Error", "Failed to load user data. Please try again.");
        }
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

      const online = await isOnline();
      
      // If offline, don't try to fetch
      if (!online) {
        return;
      }

      // Fetch customer registrations (include MS Forms submission status)
      const { data: registrations, error: regError } = await supabase
        .from("customer_registrations")
        .select("id, customer_name, status, created_at, ms_forms_response_id, ms_forms_submitted_at")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (regError) {
        console.error("Error loading registrations:", regError);
      } else {
        // Check for pending offline registrations and merge status
        const pending = await getPendingRegistrations(agentId);
        const pendingIds = new Set(pending.map(p => p.id));
        setPendingSyncRegistrations(pendingIds);
        
        // Enhance registrations with sync status
        const enhancedRegistrations = (registrations || []).map((reg: any) => {
          const hasMSFormsId = !!reg.ms_forms_response_id;
          const hasMSFormsSubmittedAt = !!reg.ms_forms_submitted_at;
          
          // Determine sync status
          let syncStatus: "synced" | "pending" | "not_synced" = "not_synced";
          
          if (hasMSFormsId && hasMSFormsSubmittedAt) {
            // Successfully synced to both Supabase and MS Forms
            syncStatus = "synced";
          } else if (!hasMSFormsId) {
            // Not synced to MS Forms yet
            // Check if it was created recently (might be syncing)
            const createdAt = reg.created_at ? new Date(reg.created_at).getTime() : 0;
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000; // 5 minutes
            
            if (createdAt > fiveMinutesAgo) {
              // Recently created, likely pending sync
              syncStatus = "pending";
            } else {
              // Older registration without MS Forms ID - not synced
              syncStatus = "not_synced";
            }
          }
          
          return {
            ...reg,
            syncStatus,
          };
        });
        
        setRecentRegistrations(enhancedRegistrations);
      }

      // Calculate stats with premium/standard breakdown
      const { count: totalRegistered, error: countError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);

      if (!countError && totalRegistered !== null) {
        setTotalRegistered(totalRegistered);
      }

      // Get premium registered count
      const { count: premiumRegisteredCount, error: premiumRegError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("preferred_package", "premium");

      if (!premiumRegError && premiumRegisteredCount !== null) {
        setPremiumRegistered(premiumRegisteredCount);
      }

      // Get standard registered count
      const { count: standardRegisteredCount, error: standardRegError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("preferred_package", "standard");

      if (!standardRegError && standardRegisteredCount !== null) {
        setStandardRegistered(standardRegisteredCount);
      }

      // Get total installed count
      const { count: totalInstalled, error: installedError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "installed");

      if (!installedError && totalInstalled !== null) {
        setTotalInstalled(totalInstalled);
      }

      // Get premium installed count
      const { count: premiumInstalledCount, error: premiumInstError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "installed")
        .eq("preferred_package", "premium");

      if (!premiumInstError && premiumInstalledCount !== null) {
        setPremiumInstalled(premiumInstalledCount);
      }

      // Get standard installed count
      const { count: standardInstalledCount, error: standardInstError } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "installed")
        .eq("preferred_package", "standard");

      if (!standardInstError && standardInstalledCount !== null) {
        setStandardInstalled(standardInstalledCount);
      }

      // Save to cache when online
      if (online && agentData) {
        await saveDashboardDataToCache({
          agentData,
          balance: balance ?? 0,
          totalRegistered: totalRegistered ?? 0,
          totalInstalled: totalInstalled ?? 0,
          premiumRegistered: premiumRegistered ?? 0,
          standardRegistered: standardRegistered ?? 0,
          premiumInstalled: premiumInstalled ?? 0,
          standardInstalled: standardInstalled ?? 0,
          recentRegistrations: recentRegistrations,
        });
      }
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
    <>
      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={toastType === "info" ? 0 : 3000}
        onHide={() => setToastVisible(false)}
      />
      <View style={styles.container}>
        {/* Agent Status Banner - Top */}
        {agentData?.status && (
          <View
            style={[
              styles.statusBanner,
              { paddingTop: insets.top + 4 },
              agentData.status === "approved" && styles.statusBannerApproved,
              agentData.status === "pending" && styles.statusBannerPending,
              agentData.status === "banned" && styles.statusBannerSuspended,
              agentData.status === "rejected" && styles.statusBannerRejected,
            ]}
          >
            {agentData.status === "approved" && (
              <Text style={styles.statusBannerIcon}></Text>
            )}
            {agentData.status === "pending" && (
              <Text style={styles.statusBannerIcon}>⏳</Text>
            )}
            {agentData.status === "banned" && (
              <Text style={styles.statusBannerIcon}>⚠</Text>
            )}
            {agentData.status === "rejected" && (
              <Text style={styles.statusBannerIcon}>✗</Text>
            )}
            <Text
              style={[
                styles.statusBannerText,
                agentData.status === "approved" && styles.statusBannerTextApproved,
                agentData.status === "pending" && styles.statusBannerTextPending,
                agentData.status === "banned" && styles.statusBannerTextSuspended,
                agentData.status === "rejected" && styles.statusBannerTextRejected,
              ]}
            >
              {agentData.status === "approved" && "Account Active"}
              {agentData.status === "pending" && "Awaiting Approval"}
              {agentData.status === "banned" && "Account Suspended"}
              {agentData.status === "rejected" && "Application Rejected"}
            </Text>
          </View>
        )}
        
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
          <View style={styles.headerContent}>
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
            <View style={styles.greetingRow}>
              <Text style={styles.greeting}>{greeting}</Text>
              {/* Online/Offline Status */}
              <View style={[styles.statusIndicator, isOffline ? styles.statusIndicatorOffline : styles.statusIndicatorOnline]}>
                <View style={[styles.statusDot, isOffline ? styles.statusDotOffline : styles.statusDotOnline]} />
                <Text style={[styles.statusText, isOffline ? styles.statusTextOffline : styles.statusTextOnline]}>
                  {isOffline ? "Offline" : "Online"}
                </Text>
              </View>
            </View>
            <Text style={styles.name}>{name}</Text>
          </View>

          {/* Right: Notification Icon Button */}
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {
              // Check if we're already on notifications screen to avoid duplicate stack entries
              const currentRoute = segments[segments.length - 1];
              if (currentRoute === "notifications") {
                // Already on notifications, don't navigate
                return;
              }
              router.push("/notifications" as any);
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
                  KSh {(agentData?.total_earnings ?? (premiumInstalled * 300 + standardInstalled * 150)).toLocaleString()}
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
            <View style={styles.statBreakdown}>
              <View style={styles.statBreakdownRow}>
                <View style={styles.statBreakdownItem}>
                  <Text style={styles.statBreakdownLabel}>Premium</Text>
                  <Text style={[styles.statBreakdownValue, styles.statBreakdownPremium]}>
                    {premiumRegistered}
                  </Text>
                </View>
                <View style={styles.statBreakdownDivider} />
                <View style={styles.statBreakdownItem}>
                  <Text style={styles.statBreakdownLabel}>Standard</Text>
                  <Text style={[styles.statBreakdownValue, styles.statBreakdownStandard]}>
                    {standardRegistered}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Installed</Text>
            <Text style={styles.statValue}>{totalInstalled}</Text>
            <View style={styles.statBreakdown}>
              <View style={styles.statBreakdownRow}>
                <View style={styles.statBreakdownItem}>
                  <Text style={styles.statBreakdownLabel}>Premium</Text>
                  <Text style={[styles.statBreakdownValue, styles.statBreakdownPremium]}>
                    {premiumInstalled}
                  </Text>
                </View>
                <View style={styles.statBreakdownDivider} />
                <View style={styles.statBreakdownItem}>
                  <Text style={styles.statBreakdownLabel}>Standard</Text>
                  <Text style={[styles.statBreakdownValue, styles.statBreakdownStandard]}>
                    {standardInstalled}
                  </Text>
                </View>
              </View>
            </View>
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
                router.push("/registrations" as any);
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
                    {/* Sync Status Indicator */}
                    {registration.syncStatus && (
                      <View style={styles.syncStatusContainer}>
                        <Text style={[
                          styles.syncStatusText,
                          registration.syncStatus === "synced" && styles.syncStatusSynced,
                          registration.syncStatus === "pending" && styles.syncStatusPending,
                          registration.syncStatus === "not_synced" && styles.syncStatusUnknown,
                        ]}>
                          {registration.syncStatus === "synced" && "✅ Synced"}
                          {registration.syncStatus === "pending" && "⏳ Pending Sync"}
                          {registration.syncStatus === "not_synced" && "❌ Not Synced"}
                        </Text>
                      </View>
                    )}
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
    </>
  );
}

// Create responsive styles
const createStyles = () => {
  const responsivePadding = getResponsivePadding();
  const cardPadding = getCardPadding();
  
  return StyleSheet.create({
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
    paddingTop: 0,
    paddingBottom: scaleHeight(100), // Add bottom padding to prevent navbar overlap
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    gap: scaleWidth(12),
    marginBottom: scaleHeight(20),
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(12),
    padding: cardPadding,
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
    fontSize: scaleFont(12),
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: scaleHeight(8),
    letterSpacing: 0.2,
    textAlign: "center",
  },
  statValue: {
    fontSize: scaleFont(24),
    fontFamily: "Poppins_700Bold",
    color: "#333333",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  statBreakdown: {
    marginTop: scaleHeight(12),
    paddingTop: scaleHeight(12),
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  statBreakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statBreakdownItem: {
    flex: 1,
    alignItems: "center",
  },
  statBreakdownLabel: {
    fontSize: scaleFont(10),
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: scaleHeight(4),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statBreakdownValue: {
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
  },
  statBreakdownPremium: {
    color: "#9C27B0",
  },
  statBreakdownStandard: {
    color: "#0066CC",
  },
  statBreakdownDivider: {
    width: 1,
    height: scaleHeight(30),
    backgroundColor: "#E0E0E0",
    marginHorizontal: scaleWidth(8),
  },
  registerButton: {
    backgroundColor: "#0066CC",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(16),
    paddingHorizontal: responsivePadding,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleHeight(24),
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
  syncStatusContainer: {
    marginTop: 4,
  },
  syncStatusText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
  syncStatusSynced: {
    color: "#4CAF50",
  },
  syncStatusPending: {
    color: "#FF9800",
  },
  syncStatusUnknown: {
    color: "#999999",
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
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  greeting: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
    marginRight: 8,
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
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
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  statusTextOnline: {
    color: "#2E7D32",
  },
  statusTextOffline: {
    color: "#E65100",
  },
  name: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
    marginTop: 4,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  statusBannerApproved: {
    backgroundColor: "#E8F5E9",
  },
  statusBannerPending: {
    backgroundColor: "#FFF4E6",
  },
  statusBannerSuspended: {
    backgroundColor: "#FFEBEE",
  },
  statusBannerRejected: {
    backgroundColor: "#F5F5F5",
  },
  statusBannerIcon: {
    fontSize: 16,
  },
  statusBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  statusBannerTextApproved: {
    color: "#2E7D32",
  },
  statusBannerTextPending: {
    color: "#E65100",
  },
  statusBannerTextSuspended: {
    color: "#C62828",
  },
  statusBannerTextRejected: {
    color: "#616161",
  },
  agentStatusContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: "center",
  },
  agentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  agentStatusBadgeApproved: {
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  agentStatusBadgePending: {
    backgroundColor: "#FFF4E6",
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  agentStatusBadgeSuspended: {
    backgroundColor: "#FFEBEE",
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  agentStatusBadgeRejected: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  agentStatusIcon: {
    fontSize: 14,
  },
  agentStatusText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  agentStatusTextApproved: {
    color: "#2E7D32",
  },
  agentStatusTextPending: {
    color: "#E65100",
  },
  agentStatusTextSuspended: {
    color: "#C62828",
  },
  agentStatusTextRejected: {
    color: "#616161",
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
};

const styles = createStyles();
