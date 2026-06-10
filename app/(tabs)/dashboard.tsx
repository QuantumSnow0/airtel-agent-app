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
import { useFocusEffect } from "@react-navigation/native";
import { useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { MaterialIcons } from "@expo/vector-icons";
import { AgentAvatar } from "../../components/AgentAvatar";
import { CommissionDonutCard } from "../../components/CommissionDonutCard";
import { getWamTabBarOffset } from "../../components/WamTabBar";
import { CarrierSelectModal } from "../../components/CarrierSelectModal";
import { AppRatingPrompt } from "../../components/AppRatingPrompt";
import { NotificationEnablePrompt } from "../../components/NotificationEnablePrompt";
import { Toast } from "../../components/Toast";
import {
  dismissAppRatingPrompt,
  markAppRatingSubmitted,
  shouldShowAppRatingPrompt,
} from "../../lib/appRatingPromptStorage";
import {
  markAppRatingPlayStoreOpened,
  submitAppRating,
} from "../../lib/services/appRatingService";
import {
  dismissNotificationPrompt,
  shouldShowNotificationPrompt,
} from "../../lib/notificationPromptStorage";
import { getNotificationPermissionState } from "../../lib/services/pushNotificationService";
import {
  getAgentAvatarSeed,
  getDiceBearStyleForName,
} from "../../lib/utils/dicebear";
import {
    CachedAgentData,
    clearAgentDataCache,
    getCachedAgentData,
    saveAgentDataToCache,
} from "../../lib/cache/agentCache";
import {
    clearDashboardDataCache,
    getCachedDashboardData,
    saveDashboardDataToCache,
} from "../../lib/cache/dashboardCache";
import { clearNotificationsCache } from "../../lib/cache/notificationsCache";
import { clearRegistrationsCache } from "../../lib/cache/registrationsCache";
import {
  getSafaricomCommissionKesForRegistration,
  getSafaricomDealPriceKes,
} from "../../lib/commissions/safaricomAgentCommission";
import {
  computeAirtelInstalledCommissionKsh,
  computeCombinedWalletCommissionKsh,
} from "../../lib/commissions/walletCommission";
import {
  fetchCommissionRates,
  getCachedCommissionRates,
  type AirtelCommissionRates,
} from "../../lib/services/commissionRatesService";
import {
  mapCustomerRowToUnifiedList,
  mapSafaricomRowToUnifiedList,
} from "../../lib/registrations/unifiedListRegistration";
import { getPendingRegistrations, initOfflineStorage } from "../../lib/services/offlineStorage";
import { isOnline, setupAutoSync } from "../../lib/services/syncService";
import { supabase } from "../../lib/supabase";
import {
    getCardPadding,
    scaleFont,
    scaleHeight,
    scaleWidth
} from "../../lib/utils/responsive";
import {
  REGISTRATION_STATUS_COLORS,
  formatRegistrationStatusLabel,
} from "../../constants/registrationStatuses";

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
  const [safaricomRegistered, setSafaricomRegistered] = useState(0);
  const [safaricomInstalled, setSafaricomInstalled] = useState(0);
  const [safaricomInstalledCommissionKsh, setSafaricomInstalledCommissionKsh] =
    useState(0);
  const [safaricomFiberRegistered, setSafaricomFiberRegistered] = useState(0);
  const [safaricomFiberInstalled, setSafaricomFiberInstalled] = useState(0);
  const [safaricomFiberCommissionKsh, setSafaricomFiberCommissionKsh] = useState(0);
  const [safaricomPortableRegistered, setSafaricomPortableRegistered] = useState(0);
  const [safaricomPortableInstalled, setSafaricomPortableInstalled] = useState(0);
  const [safaricomPortableCommissionKsh, setSafaricomPortableCommissionKsh] = useState(0);
  const [safaricomDedicatedRegistered, setSafaricomDedicatedRegistered] = useState(0);
  const [safaricomDedicatedInstalled, setSafaricomDedicatedInstalled] = useState(0);
  const [safaricomDedicatedCommissionKsh, setSafaricomDedicatedCommissionKsh] = useState(0);
  const [safaricomFiberAvgPackageKsh, setSafaricomFiberAvgPackageKsh] = useState(0);
  const [safaricomPortableAvgPackageKsh, setSafaricomPortableAvgPackageKsh] = useState(0);
  const [safaricomDedicatedAvgPackageKsh, setSafaricomDedicatedAvgPackageKsh] = useState(0);
  const [safaricomTotalAvgPackageKsh, setSafaricomTotalAvgPackageKsh] = useState(0);
  const [paidFromLedgerKsh, setPaidFromLedgerKsh] = useState(0);
  const [airtelCommissionRates, setAirtelCommissionRates] =
    useState<AirtelCommissionRates>(getCachedCommissionRates);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSyncRegistrations, setPendingSyncRegistrations] = useState<Set<string>>(new Set());
  const spinValue = useRef(new Animated.Value(0)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");
  const [carrierSelectVisible, setCarrierSelectVisible] = useState(false);
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const [ratingPromptVisible, setRatingPromptVisible] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const wasOfflineRef = useRef(false);

  const evaluateDashboardPrompts = async (agentStatus?: string | null) => {
    if (agentStatus !== "approved") {
      setNotificationPromptVisible(false);
      setRatingPromptVisible(false);
      return;
    }

    const permission = await getNotificationPermissionState();
    const showNotification =
      permission !== "granted" && (await shouldShowNotificationPrompt());
    setNotificationPromptVisible(showNotification);

    if (showNotification) {
      setRatingPromptVisible(false);
      return;
    }

    const showRating = await shouldShowAppRatingPrompt();
    setRatingPromptVisible(showRating);
  };

  const handleNotificationPromptDismiss = async () => {
    await dismissNotificationPrompt();
    setNotificationPromptVisible(false);
    void evaluateDashboardPrompts(agentData?.status);
  };

  const handleNotificationEnabled = () => {
    setNotificationPromptVisible(false);
    void evaluateDashboardPrompts(agentData?.status);
  };

  const handleRatingPromptDismiss = async () => {
    await dismissAppRatingPrompt();
    setRatingPromptVisible(false);
  };

  const handleRatingSubmitted = async (score: number) => {
    await markAppRatingSubmitted(score);
    if (user?.id) {
      await submitAppRating(user.id, score);
    }
  };

  const handlePlayStoreOpened = async () => {
    if (user?.id) {
      await markAppRatingPlayStoreOpened(user.id);
    }
  };

  const handleRatingComplete = () => {
    setRatingPromptVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (agentData?.status === "approved") {
        void evaluateDashboardPrompts(agentData.status);
      }
    }, [agentData?.status])
  );

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
        const { requestNotificationPermissions, getDeviceToken, registerDeviceToken } = await import("../../lib/services/pushNotificationService");
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
    // Note: Navigation is handled by _layout.tsx to prevent duplicate navigations
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          // Clear all caches on logout
          // Navigation will be handled by _layout.tsx auth listener
          await clearAgentDataCache();
          await clearDashboardDataCache();
          await clearNotificationsCache();
          await clearRegistrationsCache();
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

    const cleanup = setupAutoSync(
      user.id,
      (current, total) => {
        if (total > 0) {
          showToast(`Syncing offline data... ${current} of ${total}`, "info");
        }
      },
      async (result) => {
        // Refresh data after sync completes if any were synced
        if (result.synced > 0) {
          console.log(`🔄 ${result.synced} registrations synced - refreshing dashboard`);
          showToast(`${result.synced} registration(s) synced successfully!`, "success");
          // Small delay to ensure database is fully updated before refreshing
          await new Promise(resolve => setTimeout(resolve, 500));
          // Refresh customer data to show newly synced registrations
          await loadCustomerData(user.id);
        } else if (result.failed > 0) {
          showToast(`${result.failed} registration(s) failed to sync`, "error");
        }
      }
    );

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
          
          // Recalculate wallet (DB balance may omit Safaricom until triggers include it)
          void loadCustomerData(user.id);
          
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "safaricom_registrations",
          filter: `agent_id=eq.${user.id}`,
        },
        async (payload) => {
          console.log("🟢 Real-time Safaricom registration update:", payload.eventType, payload);
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
          console.log("🔔 Payload new:", payload.new);
          console.log("🔔 Payload old:", payload.old);
          
          // Always reload count for any change (simplified - no need to check event type)
          try {
            console.log("🔄 Reloading notification count after change...");
            await loadUnreadNotificationCount(user.id);
            console.log("✅ Notification count reloaded");
          } catch (error) {
            console.error("❌ Error reloading notification count:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("📡 Notifications subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to notifications real-time updates");
          // Immediately load count when subscribed to ensure we have the latest
          loadUnreadNotificationCount(user.id).catch((error) => {
            console.error("Error loading initial notification count:", error);
          });
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Error subscribing to notifications");
        } else if (status === "TIMED_OUT") {
          console.error("❌ Notification subscription timed out");
        } else if (status === "CLOSED") {
          console.log("⚠️ Notification subscription closed");
        }
      });

    // Also set up a periodic refresh as a fallback (every 30 seconds)
    // This ensures we get updates even if real-time subscription has issues
    const refreshInterval = setInterval(() => {
      console.log("🔄 Periodic notification count refresh (fallback)");
      loadUnreadNotificationCount(user.id).catch((error) => {
        console.error("Error in periodic notification count refresh:", error);
      });
    }, 30000); // Every 30 seconds

    return () => {
      console.log("🔴 Unsubscribing from registration and notification updates");
      supabase.removeChannel(registrationsChannel);
      supabase.removeChannel(notificationsChannel);
      clearInterval(refreshInterval);
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
    let agentStatusForPrompt: string | null = null;
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
      // Add retry logic for session restoration after force close
      let session = null;
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries && !session) {
        const sessionResult = await supabase.auth.getSession();
        session = sessionResult.data?.session;
        
        if (!session && retries < maxRetries - 1) {
          // Wait a bit before retrying (session might still be restoring)
          await new Promise(resolve => setTimeout(resolve, 200));
          retries++;
        } else {
          break;
        }
      }
      
      let currentUser = session?.user;

      if (!currentUser) {
        // No user session after retries - check if we have cached data first
        const cachedAgentData = await getCachedAgentData();
        if (cachedAgentData) {
          // We have cached data but no session - might be a temporary issue
          // Try to refresh the session one more time
          try {
            const { data: refreshSession, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshSession?.session?.user) {
              // Session restored - use the refreshed session
              currentUser = refreshSession.session.user;
              session = refreshSession.session;
            } else if (refreshError) {
              // Refresh failed - check if it's a network error or actual logout
              console.error("Session refresh failed:", refreshError);
              // If it's a network error, we can still use cached data
              // Only logout if it's an auth error (token expired, invalid, etc.)
              if (refreshError.message?.includes("Invalid") || 
                  refreshError.message?.includes("expired") ||
                  refreshError.message?.includes("JWT")) {
                // Token is invalid - clear cache and redirect to login
                await clearAgentDataCache();
                await clearDashboardDataCache();
                router.replace("/login" as any);
                return;
              }
              // Network error - continue with cached data (offline mode)
              // We'll use a minimal user object from cache
              currentUser = { id: cachedAgentData.id, email: cachedAgentData.email } as any;
            } else {
              // No session and refresh returned nothing - clear cache and redirect
              await clearAgentDataCache();
              await clearDashboardDataCache();
              router.replace("/login" as any);
              return;
            }
          } catch (refreshError: any) {
            // Refresh threw an error - if it's a network error, continue with cache
            console.error("Session refresh error:", refreshError);
            if (refreshError.message?.includes("network") || 
                refreshError.message?.includes("timeout") ||
                refreshError.message?.includes("Failed to fetch")) {
              // Network error - continue with cached data
              currentUser = { id: cachedAgentData.id, email: cachedAgentData.email } as any;
            } else {
              // Auth error - clear cache and redirect to login
              await clearAgentDataCache();
              await clearDashboardDataCache();
              router.replace("/login" as any);
              return;
            }
          }
        } else {
          // No cached data and no session - definitely logged out
          await clearAgentDataCache();
          await clearDashboardDataCache();
          router.replace("/login" as any);
          return;
        }
      }

      // Check if email is verified (only if we have a real session)
      if (currentUser && session && !currentUser.email_confirmed_at) {
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

      if (!currentUser) {
        setIsLoading(false);
        return;
      }

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
          setSafaricomRegistered(cachedDashboardData.safaricomRegistered ?? 0);
          setSafaricomInstalled(cachedDashboardData.safaricomInstalled ?? 0);
          setSafaricomInstalledCommissionKsh(
            cachedDashboardData.safaricomInstalledCommissionKsh ?? 0
          );
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
        setSafaricomRegistered(cachedDashboardData.safaricomRegistered ?? 0);
        setSafaricomInstalled(cachedDashboardData.safaricomInstalled ?? 0);
        setSafaricomInstalledCommissionKsh(
          cachedDashboardData.safaricomInstalledCommissionKsh ?? 0
        );
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
        agentStatusForPrompt = agent.status;
        // Wallet KSh is set in loadCustomerData (Airtel + Safaricom installed commissions)
      }

      if (online) {
        const rates = await fetchCommissionRates();
        setAirtelCommissionRates(rates);
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
        agentStatusForPrompt = cachedDashboardData.agentData?.status ?? null;
        setBalance(cachedDashboardData.balance);
        setTotalRegistered(cachedDashboardData.totalRegistered);
        setTotalInstalled(cachedDashboardData.totalInstalled);
        setPremiumRegistered(cachedDashboardData.premiumRegistered ?? 0);
        setStandardRegistered(cachedDashboardData.standardRegistered ?? 0);
        setPremiumInstalled(cachedDashboardData.premiumInstalled ?? 0);
        setStandardInstalled(cachedDashboardData.standardInstalled ?? 0);
        setSafaricomRegistered(cachedDashboardData.safaricomRegistered ?? 0);
        setSafaricomInstalled(cachedDashboardData.safaricomInstalled ?? 0);
        setSafaricomInstalledCommissionKsh(
          cachedDashboardData.safaricomInstalledCommissionKsh ?? 0
        );
        setRecentRegistrations(cachedDashboardData.recentRegistrations);
      } else {
        const cachedAgentData = await getCachedAgentData();
        if (!cachedAgentData) {
          Alert.alert("Error", "Failed to load user data. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
      if (agentStatusForPrompt) {
        void evaluateDashboardPrompts(agentStatusForPrompt);
      }
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

      // Check for pending offline registrations first
      const pending = await getPendingRegistrations(agentId);
      const pendingIds = new Set(pending.map(p => p.id));
      setPendingSyncRegistrations(pendingIds);

      // Convert pending registrations to display format
      const pendingRegistrations = pending.map((p: any) => ({
        id: p.id,
        customer_name: p.customerData.customerName,
        status: "pending" as const,
        created_at: p.created_at,
        ms_forms_response_id: undefined,
        ms_forms_submitted_at: undefined,
        syncStatus: "pending" as const,
        source: "airtel" as const,
      }));

      // Airtel + Safaricom recent rows (merged by date)
      const [customerRes, safaricomRes] = await Promise.all([
        supabase
          .from("customer_registrations")
          .select(
            "id, customer_name, status, created_at, ms_forms_response_id, ms_forms_submitted_at"
          )
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("safaricom_registrations")
          .select(
            "id, customer_name, service_package, status, created_at, fiber_region_name, fiber_cluster_name, install_town, install_county"
          )
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(15),
      ]);

      const { data: registrations, error: regError } = customerRes;
      const safRows = safaricomRes.error ? [] : safaricomRes.data ?? [];
      if (safaricomRes.error) {
        const msg = String(safaricomRes.error.message || "").toLowerCase();
        if (!msg.includes("does not exist")) {
          console.warn("Safaricom registrations list:", safaricomRes.error);
        }
      }

      if (regError) {
        console.error("Error loading registrations:", regError);
        // If error but we have pending, show those
        if (pendingRegistrations.length > 0) {
          setRecentRegistrations(pendingRegistrations.slice(0, 10));
        }
        return;
      }
      
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
        
        return mapCustomerRowToUnifiedList({
          ...reg,
          syncStatus,
        });
      });

      const safUnified = (safRows ?? []).map((row: any) =>
        mapSafaricomRowToUnifiedList(row)
      );

      // Merge pending offline Airtel + Supabase Airtel + Safaricom
      const allRegistrationsCombined = [
        ...pendingRegistrations,
        ...enhancedRegistrations.filter((reg) => !pendingIds.has(reg.id)),
        ...safUnified,
      ].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // Take top 10 for recent registrations
      const top10Registrations = allRegistrationsCombined.slice(0, 10);
      setRecentRegistrations(top10Registrations);

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

      // Safaricom registrations (commission = share of package price per installed sale)
      let safRegN = 0;
      let safInstN = 0;
      let safCommKsh = 0;
      let safFiberRegN = 0;
      let safFiberInstN = 0;
      let safFiberCommKsh = 0;
      let safPortableRegN = 0;
      let safPortableInstN = 0;
      let safPortableCommKsh = 0;
      let safDedicatedRegN = 0;
      let safDedicatedInstN = 0;
      let safDedicatedCommKsh = 0;
      let safFiberPriceTotalKsh = 0;
      let safPortablePriceTotalKsh = 0;
      let safDedicatedPriceTotalKsh = 0;
      const { count: safRegCount, error: safRegErr } = await supabase
        .from("safaricom_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId);
      if (!safRegErr && safRegCount !== null) {
        safRegN = safRegCount;
      } else if (
        safRegErr &&
        String(safRegErr.message || "")
          .toLowerCase()
          .includes("does not exist")
      ) {
        console.warn("safaricom_registrations table not found; skip Safaricom stats");
      }

      const { count: safInstCount, error: safInstErr } = await supabase
        .from("safaricom_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", agentId)
        .eq("status", "installed");
      if (!safInstErr && safInstCount !== null) {
        safInstN = safInstCount;
      }

      const { data: safInstalledRows, error: safRowsErr } = await supabase
        .from("safaricom_registrations")
        .select(
          "service_package, fiber_deal_id, portable_deal_id, dedicated_wifi_deal_id"
        )
        .eq("agent_id", agentId)
        .eq("status", "installed");
      if (!safRowsErr && safInstalledRows?.length) {
        safCommKsh = safInstalledRows.reduce(
          (sum, row) =>
            sum +
            getSafaricomCommissionKesForRegistration(
              row as {
                service_package: string;
                fiber_deal_id?: string | null;
                portable_deal_id?: string | null;
                dedicated_wifi_deal_id?: string | null;
              }
            ),
          0
        );
      }

      const [
        safFiberRegRes,
        safFiberInstRes,
        safPortableRegRes,
        safPortableInstRes,
        safDedicatedRegRes,
        safDedicatedInstRes,
      ] = await Promise.all([
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "home_business_fiber"),
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "home_business_fiber")
          .eq("status", "installed"),
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "safaricom_portable_5g"),
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "safaricom_portable_5g")
          .eq("status", "installed"),
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "safaricom_dedicated_wifi"),
        supabase
          .from("safaricom_registrations")
          .select("*", { count: "exact", head: true })
          .eq("agent_id", agentId)
          .eq("service_package", "safaricom_dedicated_wifi")
          .eq("status", "installed"),
      ]);

      safFiberRegN = safFiberRegRes.count ?? 0;
      safFiberInstN = safFiberInstRes.count ?? 0;
      safPortableRegN = safPortableRegRes.count ?? 0;
      safPortableInstN = safPortableInstRes.count ?? 0;
      safDedicatedRegN = safDedicatedRegRes.count ?? 0;
      safDedicatedInstN = safDedicatedInstRes.count ?? 0;

      if (safInstalledRows?.length) {
        for (const row of safInstalledRows) {
          const reg = row as {
            service_package: string;
            fiber_deal_id?: string | null;
            portable_deal_id?: string | null;
            dedicated_wifi_deal_id?: string | null;
          };
          const comm = getSafaricomCommissionKesForRegistration(reg);
          let packagePriceKsh = 0;
          if (reg.service_package === "home_business_fiber") {
            packagePriceKsh = getSafaricomDealPriceKes(reg.fiber_deal_id);
            safFiberCommKsh += comm;
            safFiberPriceTotalKsh += packagePriceKsh;
          } else if (reg.service_package === "safaricom_portable_5g") {
            packagePriceKsh = getSafaricomDealPriceKes(reg.portable_deal_id);
            safPortableCommKsh += comm;
            safPortablePriceTotalKsh += packagePriceKsh;
          } else if (reg.service_package === "safaricom_dedicated_wifi") {
            packagePriceKsh = getSafaricomDealPriceKes(reg.dedicated_wifi_deal_id);
            safDedicatedCommKsh += comm;
            safDedicatedPriceTotalKsh += packagePriceKsh;
          }
        }
      }

      setSafaricomRegistered(safRegN);
      setSafaricomInstalled(safInstN);
      setSafaricomInstalledCommissionKsh(safCommKsh);
      setSafaricomFiberRegistered(safFiberRegN);
      setSafaricomFiberInstalled(safFiberInstN);
      setSafaricomFiberCommissionKsh(safFiberCommKsh);
      setSafaricomPortableRegistered(safPortableRegN);
      setSafaricomPortableInstalled(safPortableInstN);
      setSafaricomPortableCommissionKsh(safPortableCommKsh);
      setSafaricomDedicatedRegistered(safDedicatedRegN);
      setSafaricomDedicatedInstalled(safDedicatedInstN);
      setSafaricomDedicatedCommissionKsh(safDedicatedCommKsh);
      setSafaricomFiberAvgPackageKsh(
        safFiberInstN > 0 ? Math.round(safFiberPriceTotalKsh / safFiberInstN) : 0
      );
      setSafaricomPortableAvgPackageKsh(
        safPortableInstN > 0 ? Math.round(safPortablePriceTotalKsh / safPortableInstN) : 0
      );
      setSafaricomDedicatedAvgPackageKsh(
        safDedicatedInstN > 0 ? Math.round(safDedicatedPriceTotalKsh / safDedicatedInstN) : 0
      );
      const safTotalInstalledN = safFiberInstN + safPortableInstN + safDedicatedInstN;
      const safTotalPriceKsh = safFiberPriceTotalKsh + safPortablePriceTotalKsh + safDedicatedPriceTotalKsh;
      setSafaricomTotalAvgPackageKsh(
        safTotalInstalledN > 0 ? Math.round(safTotalPriceKsh / safTotalInstalledN) : 0
      );

      const premiumInstN =
        !premiumInstError && premiumInstalledCount != null ? premiumInstalledCount : 0;
      const standardInstN =
        !standardInstError && standardInstalledCount != null ? standardInstalledCount : 0;
      const rates = await fetchCommissionRates();
      setAirtelCommissionRates(rates);
      const walletTotalKsh = computeCombinedWalletCommissionKsh(
        premiumInstN,
        standardInstN,
        safCommKsh,
        rates
      );
      setBalance(walletTotalKsh);

      // "Paid to you" should come from recorded payout ledger, not inferred balance math.
      let paidLedgerKsh = 0;
      const { data: paymentRows, error: paymentsErr } = await supabase
        .from("agent_payments")
        .select("amount_ksh")
        .eq("agent_id", agentId);
      if (!paymentsErr && paymentRows?.length) {
        paidLedgerKsh = paymentRows.reduce(
          (sum, row) => sum + Number((row as { amount_ksh?: number | string | null }).amount_ksh ?? 0),
          0
        );
      } else if (paymentsErr) {
        const msg = String(paymentsErr.message || "").toLowerCase();
        if (!msg.includes("does not exist")) {
          console.warn("agent_payments lookup:", paymentsErr);
        }
      }
      setPaidFromLedgerKsh(Math.max(0, Math.round(paidLedgerKsh)));

      // Save to cache when online
      if (online && agentData) {
        // Use the top10Registrations we just set
        const registrationsForCache = allRegistrationsCombined.slice(0, 10);
        await saveDashboardDataToCache({
          agentData,
          balance: walletTotalKsh,
          totalRegistered:
            !countError && totalRegistered != null ? totalRegistered : 0,
          totalInstalled:
            !installedError && totalInstalled != null ? totalInstalled : 0,
          premiumRegistered:
            !premiumRegError && premiumRegisteredCount != null
              ? premiumRegisteredCount
              : 0,
          standardRegistered:
            !standardRegError && standardRegisteredCount != null
              ? standardRegisteredCount
              : 0,
          premiumInstalled:
            !premiumInstError && premiumInstalledCount != null
              ? premiumInstalledCount
              : 0,
          standardInstalled:
            !standardInstError && standardInstalledCount != null
              ? standardInstalledCount
              : 0,
          safaricomRegistered: safRegN,
          safaricomInstalled: safInstN,
          safaricomInstalledCommissionKsh: safCommKsh,
          recentRegistrations: registrationsForCache,
        });
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  const handleProfilePress = () => {
    router.navigate("/profile" as any);
  };

  const tabBarClearance = getWamTabBarOffset(insets.bottom);

  if (!fontsLoaded) {
    return null;
  }

  const isApproved = agentData?.status === "approved";
  const showStatusBanner =
    !!agentData?.status && agentData.status !== "approved";
  const name = agentData?.name || user?.email || "";
  const initial = getInitial(agentData?.name, user?.email);
  const avatarSeed = getAgentAvatarSeed(
    agentData?.name,
    agentData?.email ?? user?.email,
    user?.id
  );
  const avatarStyle = getDiceBearStyleForName(agentData?.name);

  const airtelStandardCommissionKsh =
    standardInstalled * airtelCommissionRates.standard;
  const airtelPremiumCommissionKsh =
    premiumInstalled * airtelCommissionRates.premium;
  const airtelInstalledCommissionKsh = computeAirtelInstalledCommissionKsh(
    premiumInstalled,
    standardInstalled,
    airtelCommissionRates
  );
  const combinedEstimatedCommissionKsh =
    airtelInstalledCommissionKsh + safaricomInstalledCommissionKsh;
  const walletDisplayKsh = combinedEstimatedCommissionKsh;
  const paidToAgentKsh = Math.max(0, paidFromLedgerKsh);

  const commissionSegments = [
    {
      key: "airtel",
      label: "Airtel",
      value: airtelInstalledCommissionKsh,
      color: "#E60012",
    },
    {
      key: "safaricom",
      label: "Safaricom",
      value: safaricomInstalledCommissionKsh,
      color: "#00A651",
    },
  ];

  // Interpolate rotation for hourglass animation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <>
      <NotificationEnablePrompt
        visible={notificationPromptVisible}
        agentId={user?.id}
        onDismiss={handleNotificationPromptDismiss}
        onEnabled={handleNotificationEnabled}
      />
      <AppRatingPrompt
        visible={ratingPromptVisible}
        onDismiss={handleRatingPromptDismiss}
        onRated={handleRatingSubmitted}
        onPlayStoreOpened={handlePlayStoreOpened}
        onComplete={handleRatingComplete}
      />
      {isLoading ? (
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={toastType === "info" ? 0 : 3000}
        onHide={() => setToastVisible(false)}
      />
      <CarrierSelectModal
        visible={carrierSelectVisible}
        onClose={() => setCarrierSelectVisible(false)}
        onSelectAirtel={() => {
          setCarrierSelectVisible(false);
          router.push("/register-customer" as any);
        }}
        onSelectSafaricom={() => {
          setCarrierSelectVisible(false);
          router.push("/register-safaricom-customer" as any);
        }}
      />
      <View style={styles.container}>
        {/* Status banner — only when not active (approved) */}
        {showStatusBanner && agentData?.status && (
          <View
            style={[
              styles.statusBanner,
              { paddingTop: insets.top + 4 },
              agentData.status === "pending" && styles.statusBannerPending,
              agentData.status === "banned" && styles.statusBannerSuspended,
              agentData.status === "rejected" && styles.statusBannerRejected,
            ]}
          >
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
                agentData.status === "pending" && styles.statusBannerTextPending,
                agentData.status === "banned" && styles.statusBannerTextSuspended,
                agentData.status === "rejected" && styles.statusBannerTextRejected,
              ]}
            >
              {agentData.status === "pending" && "Awaiting Approval"}
              {agentData.status === "banned" && "Account Suspended"}
              {agentData.status === "rejected" && "Application Rejected"}
            </Text>
          </View>
        )}
        
        {/* Top bar — WAM APPS branding + actions */}
        <View
          style={[
            styles.topHeader,
            !showStatusBanner && {
              paddingTop: insets.top + scaleHeight(12),
              borderTopLeftRadius: scaleWidth(20),
              borderTopRightRadius: scaleWidth(20),
            },
            showStatusBanner && {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            },
          ]}
        >
          <View style={styles.topHeaderRow}>
            <View style={styles.brandRow}>
              <Text style={styles.brandWam}>WAM</Text>
              <Text style={styles.brandApps}>APPS</Text>
            </View>

            <View style={styles.topHeaderActions}>
              <TouchableOpacity
                style={styles.topHeaderIconBtn}
                onPress={() => router.navigate("/registrations" as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Search registrations"
              >
                <MaterialIcons name="search" size={scaleWidth(24)} color="#1A1A1A" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.topHeaderIconBtn}
                onPress={() => {
                  const currentRoute = segments[segments.length - 1];
                  if (currentRoute === "notifications") return;
                  router.push("/notifications" as any);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <View style={styles.topHeaderBellWrap}>
                  <MaterialIcons
                    name="notifications-none"
                    size={scaleWidth(26)}
                    color="#1A1A1A"
                  />
                  {unreadNotifications > 0 && (
                    <View style={styles.topHeaderNotifBadge}>
                      <Text style={styles.topHeaderNotifBadgeText}>
                        {unreadNotifications > 99 ? "99+" : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.topHeaderIconBtn}
                onPress={handleProfilePress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Profile"
              >
                <AgentAvatar
                  seed={avatarSeed}
                  style={avatarStyle}
                  size={scaleWidth(40)}
                  fallbackInitial={initial}
                  showAccountStatusBadge
                  isApproved={isApproved}
                  statusSpin={spin}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarClearance + scaleHeight(16) },
          ]}
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
          {/* Welcome row */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeTextBlock}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
            </View>
            <View
              style={[
                styles.statusIndicator,
                isOffline ? styles.statusIndicatorOffline : styles.statusIndicatorOnline,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isOffline ? styles.statusDotOffline : styles.statusDotOnline,
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  isOffline ? styles.statusTextOffline : styles.statusTextOnline,
                ]}
              >
                {isOffline ? "Offline" : "Online"}
              </Text>
            </View>
          </View>

        <CommissionDonutCard
          totalEarningsKsh={walletDisplayKsh}
          paidKsh={paidToAgentKsh}
          segments={commissionSegments}
        />

        {/* Airtel table (from sketch) */}
        <View style={styles.airtelTableCard}>
          <Text style={styles.airtelTableTitle}>Airtel</Text>

          <View style={styles.airtelTable}>
            <View style={[styles.airtelTableRow, styles.airtelTableHeaderRow]}>
              <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell]}>
                Package
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                Registered
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                Installed
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                Commission
              </Text>
            </View>

            <View style={styles.airtelTableRow}>
              <Text style={styles.airtelTableCell}>Standard</Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                {standardRegistered}
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                {standardInstalled}
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                KSh {airtelStandardCommissionKsh.toLocaleString()}
              </Text>
            </View>

            <View style={styles.airtelTableRow}>
              <Text style={styles.airtelTableCell}>Premium</Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                {premiumRegistered}
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                {premiumInstalled}
              </Text>
              <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                KSh {airtelPremiumCommissionKsh.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.airtelTableRow, styles.airtelTableTotalRow]}>
              <Text style={[styles.airtelTableCell, styles.airtelTableTotalText]}>Total</Text>
              <Text
                style={[
                  styles.airtelTableCell,
                  styles.airtelTableMetric,
                  styles.airtelTableTotalText,
                ]}
              >
                {totalRegistered}
              </Text>
              <Text
                style={[
                  styles.airtelTableCell,
                  styles.airtelTableMetric,
                  styles.airtelTableTotalText,
                ]}
              >
                {totalInstalled}
              </Text>
              <Text
                style={[
                  styles.airtelTableCell,
                  styles.airtelTableMetric,
                  styles.airtelTableTotalText,
                ]}
              >
                KSh {airtelInstalledCommissionKsh.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRowSingle}>
          <View style={styles.airtelTableCard}>
            <Text style={[styles.airtelTableTitle, styles.safaricomTableTitle]}>
              Safaricom
            </Text>

            <View style={[styles.airtelTable, styles.safaricomTotalTable]}>
              <View style={[styles.airtelTableRow, styles.airtelTableHeaderRow]}>
                <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell]}>
                  Package
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                  Registered
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                  Installed
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                  Avg Price
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableHeadCell, styles.airtelTableMetric]}>
                  30% Commission
                </Text>
              </View>

              <View style={styles.airtelTableRow}>
                <Text style={styles.airtelTableCell}>Fiber</Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomFiberRegistered}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomFiberInstalled}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomFiberAvgPackageKsh.toLocaleString()}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomFiberCommissionKsh.toLocaleString()}
                </Text>
              </View>

              <View style={styles.airtelTableRow}>
                <Text style={styles.airtelTableCell}>Portable 5G</Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomPortableRegistered}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomPortableInstalled}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomPortableAvgPackageKsh.toLocaleString()}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomPortableCommissionKsh.toLocaleString()}
                </Text>
              </View>

              <View style={styles.airtelTableRow}>
                <Text style={styles.airtelTableCell}>Dedicated WiFi</Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomDedicatedRegistered}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  {safaricomDedicatedInstalled}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomDedicatedAvgPackageKsh.toLocaleString()}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric]}>
                  KSh {safaricomDedicatedCommissionKsh.toLocaleString()}
                </Text>
              </View>

              <View style={[styles.airtelTableRow, styles.safaricomTableTotalRow]}>
                <Text style={[styles.airtelTableCell, styles.airtelTableTotalText]}>All Packages</Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric, styles.airtelTableTotalText]}>
                  {safaricomRegistered}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric, styles.airtelTableTotalText]}>{safaricomInstalled}</Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric, styles.airtelTableTotalText]}>
                  KSh {safaricomTotalAvgPackageKsh.toLocaleString()}
                </Text>
                <Text style={[styles.airtelTableCell, styles.airtelTableMetric, styles.airtelTableTotalText]}>
                  KSh {safaricomInstalledCommissionKsh.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Registrations Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Registrations</Text>
          {recentRegistrations.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                router.navigate("/registrations" as any);
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
                    <View style={styles.recentNameRow}>
                      <Text style={styles.registrationName}>
                        {registration.customer_name || "Customer"}
                      </Text>
                      {registration.source === "safaricom" && (
                        <View style={styles.recentCarrierChip}>
                          <Text style={styles.recentCarrierChipText}>Safaricom</Text>
                        </View>
                      )}
                    </View>
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
                      {
                        backgroundColor:
                          REGISTRATION_STATUS_COLORS[registration.status || "pending"]?.bg ??
                          REGISTRATION_STATUS_COLORS.pending.bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.registrationStatusText,
                        {
                          color:
                            REGISTRATION_STATUS_COLORS[registration.status || "pending"]?.text ??
                            REGISTRATION_STATUS_COLORS.pending.text,
                        },
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

        {isApproved ? (
          <TouchableOpacity
            style={[
              styles.registerFab,
              {
                bottom: tabBarClearance + scaleHeight(12),
                right: scaleWidth(18),
              },
            ]}
            onPress={() => setCarrierSelectVisible(true)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Register new customer"
          >
            <View style={styles.registerFabInner}>
              <MaterialIcons name="add" size={scaleWidth(34)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>
        </>
      )}
    </>
  );
}

// Create responsive styles
const createStyles = () => {
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
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: scaleHeight(8),
    paddingBottom: scaleHeight(24),
  },
  topHeader: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(14),
    paddingBottom: scaleHeight(14),
  },
  topHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  brandWam: {
    fontSize: scaleFont(22),
    fontFamily: "Poppins_700Bold",
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
  brandApps: {
    fontSize: scaleFont(22),
    fontFamily: "Poppins_700Bold",
    color: "#F5A623",
    letterSpacing: 0.5,
    marginLeft: scaleWidth(2),
  },
  topHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleWidth(4),
  },
  topHeaderIconBtn: {
    padding: scaleWidth(6),
    alignItems: "center",
    justifyContent: "center",
  },
  topHeaderBellWrap: {
    position: "relative",
    width: scaleWidth(32),
    height: scaleWidth(32),
    alignItems: "center",
    justifyContent: "center",
  },
  topHeaderNotifBadge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: scaleWidth(18),
    height: scaleWidth(18),
    borderRadius: scaleWidth(9),
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topHeaderNotifBadgeText: {
    fontSize: scaleFont(10),
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  welcomeSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: scaleHeight(16),
    paddingHorizontal: scaleWidth(6),
  },
  welcomeTextBlock: {
    flex: 1,
    marginRight: scaleWidth(12),
  },
  airtelTableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scaleWidth(12),
    padding: cardPadding,
    marginBottom: scaleHeight(20),
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  airtelTableTitle: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
    color: "#E60012",
    marginBottom: scaleHeight(10),
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  airtelTable: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: scaleWidth(10),
    overflow: "hidden",
  },
  airtelTableHeaderRow: {
    backgroundColor: "#F8FAFC",
  },
  airtelTableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  airtelTableCell: {
    flex: 1,
    paddingVertical: scaleHeight(10),
    paddingHorizontal: scaleWidth(10),
    fontSize: scaleFont(13),
    fontFamily: "Inter_500Medium",
    color: "#334155",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  airtelTableHeadCell: {
    fontFamily: "Inter_600SemiBold",
    color: "#475569",
  },
  airtelTableMetric: {
    textAlign: "center",
  },
  airtelTableTotalRow: {
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 0,
  },
  safaricomTableTotalRow: {
    backgroundColor: "#ECFDF3",
    borderBottomWidth: 0,
  },
  airtelTableTotalText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#1E293B",
  },
  safaricomTableTitle: {
    color: "#00A651",
  },
  safaricomPackageTables: {
    gap: scaleHeight(10),
  },
  safaricomPackageCard: {
    backgroundColor: "#F8FFFB",
    borderRadius: scaleWidth(10),
    borderWidth: 1,
    borderColor: "#D1FAE5",
    padding: scaleWidth(8),
  },
  safaricomPackageTitle: {
    fontSize: scaleFont(12),
    fontFamily: "Inter_600SemiBold",
    color: "#047857",
    marginBottom: scaleHeight(6),
  },
  safaricomTotalTable: {
    marginTop: scaleHeight(10),
  },
  statsRowSingle: {
    width: "100%",
    marginBottom: scaleHeight(20),
  },
  statCardWide: {
    flex: 1,
    width: "100%",
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
  safMetricsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: scaleHeight(4),
  },
  safMetric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: scaleHeight(4),
  },
  safMetricDivider: {
    width: 1,
    backgroundColor: "#E8E8E8",
    marginVertical: scaleHeight(4),
  },
  safMetricLabel: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_400Regular",
    color: "#888888",
    marginBottom: scaleHeight(4),
  },
  safMetricValue: {
    fontSize: scaleFont(16),
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
  },
  statCarrierAirtel: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    color: "#E60012",
    marginBottom: scaleHeight(6),
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  statCarrierSaf: {
    fontSize: scaleFont(11),
    fontFamily: "Inter_600SemiBold",
    color: "#00A651",
    marginBottom: scaleHeight(6),
    letterSpacing: 0.3,
    textTransform: "uppercase",
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
  registerFab: {
    position: "absolute",
    width: scaleWidth(60),
    height: scaleWidth(60),
    borderRadius: scaleWidth(30),
    backgroundColor: "#005EB8",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.28)",
    shadowColor: "#004A94",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 14,
  },
  registerFabInner: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
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
  recentNameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  recentCarrierChip: {
    backgroundColor: "rgba(0, 166, 81, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 166, 81, 0.35)",
  },
  recentCarrierChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#00A651",
  },
  registrationName: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.2,
    flexShrink: 1,
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
  greeting: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
    marginBottom: scaleHeight(2),
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
    fontSize: scaleFont(20),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
    letterSpacing: 0.3,
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
  body: {
    flex: 1,
    // Empty for now - content will be added later
  },
  });
};

const styles = createStyles();
