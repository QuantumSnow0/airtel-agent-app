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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { NotificationCard } from "../components/NotificationCard";
import { mapDbNotification } from "../lib/notifications/presentation";
import { handleNotificationOpen } from "../lib/notifications/openNotificationAction";
import {
    getResponsivePadding,
    scaleFont,
    scaleHeight,
    scaleWidth,
} from "../lib/utils/responsive";
import {
  getCachedNotifications,
  saveNotificationsToCache,
} from "../lib/cache/notificationsCache";
import { MaterialIcons } from "@expo/vector-icons";
import type { AppNotification } from "../lib/notifications/types";

export default function NotificationsScreen() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const hasLoadedRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Load real notifications from database
  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadNotifications();
    
    // Set up real-time subscription for notifications
    const setupRealtimeSubscription = async () => {
      // Use getSession() which works offline
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      const channel = supabase
        .channel(`notifications-realtime-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `agent_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔔 Real-time notification update in notifications page:", payload.eventType);
            // Reload notifications when changes occur (skip loading state for smoother UX)
            loadNotifications(true);
          }
        )
        .subscribe((status) => {
          console.log("📡 Notifications page subscription status:", status);
        });

      subscriptionRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      hasLoadedRef.current = false;
      cleanup.then((cleanupFn) => cleanupFn?.());
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, []);

  const loadNotifications = async (skipLoadingState = false) => {
    if (!skipLoadingState) {
      setIsLoading(true);
    }
    try {
      // Get current user - use getSession() which works offline
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const user = session?.user;

      if (!user) {
        console.error("No user found");
        setIsLoading(false);
        return;
      }

      // Check if online
      const { isOnline } = await import("../lib/services/syncService");
      const online = await isOnline();

      // If offline, load from cache
      if (!online) {
        console.log("📴 Offline - loading notifications from cache");
        const cachedNotifications = await getCachedNotifications();
        if (cachedNotifications) {
          setNotifications(cachedNotifications as AppNotification[]);
          setIsLoading(false);
          return;
        } else {
          // No cache available
          setNotifications([]);
          setIsLoading(false);
          return;
        }
      }

      // Online - Try to load cached data first (for fast initial display)
      const cachedNotifications = await getCachedNotifications();
      if (cachedNotifications && !skipLoadingState) {
        setNotifications(cachedNotifications as AppNotification[]);
        setIsLoading(false); // Show cached data immediately
      }

      // Fetch fresh notifications from database (background fetch)
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Limit to 50 most recent

      if (error) {
        console.error("Error loading notifications:", error);
        // If we have cached data, keep using it
        if (!cachedNotifications) {
          setIsLoading(false);
        }
        return;
      }

      const notifications = (data || []).map(mapDbNotification);

      // Save to cache
      await saveNotificationsToCache(notifications);
      setNotifications(notifications);

      // Automatically mark all unread notifications as read after a short delay
      // This ensures notifications are marked as read when viewed
      markNotificationsAsRead(notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Try to load from cache on error
      const cachedNotifications = await getCachedNotifications();
      if (cachedNotifications) {
        setNotifications(cachedNotifications as AppNotification[]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Don't set isLoading during refresh - RefreshControl already shows spinner
    try {
      // Use getSession() which works offline
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error refreshing notifications:", error);
        setRefreshing(false);
        return;
      }

      const notifications = (data || []).map(mapDbNotification);

      setNotifications(notifications);

      // Automatically mark all unread notifications as read when refreshed
      markNotificationsAsRead(notifications);
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Mark every unread row for this agent (not just the 50 on screen)
  const markNotificationsAsRead = async (_items: AppNotification[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    setTimeout(async () => {
      try {
        const { markAllNotificationsRead } = await import(
          "../lib/notifications/unreadCount"
        );
        const result = await markAllNotificationsRead(user.id, {
          excludeSpotlightKinds: true,
        });
        if (result.ok) {
          setNotifications((prev) =>
            prev.map((notif) => {
              if (notif.type !== "SYSTEM_ANNOUNCEMENT") {
                return { ...notif, isRead: true };
              }
              const kind = String(notif.metadata?.kind ?? "").toLowerCase();
              if (kind === "meeting" || kind === "urgent") return notif;
              return { ...notif, isRead: true };
            }),
          );
        } else {
          console.error("Error auto-marking notifications as read:", result.error);
        }
      } catch (error) {
        console.error("Error auto-marking notifications as read:", error);
      }
    }, 1000);
  };

  const markAllAsRead = async () => {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Optimistically update UI
    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));

    try {
      const { markAllNotificationsRead } = await import(
        "../lib/notifications/unreadCount"
      );
      const result = await markAllNotificationsRead(user.id);
      if (!result.ok) {
        console.error("Error marking all notifications as read:", result.error);
        loadNotifications();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // Mark this one read when opened
    if (!notification.isRead) {
      void supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notification.id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, isRead: true } : n,
            ),
          );
        });
    }

    // Prefer the custom detail sheet so long announcements are readable;
    // Open link stays available inside the sheet when metadata has a URL.
    await handleNotificationOpen(router, notification, {
      preferExternalLink: false,
    });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!fontsLoaded) {
    return null;
  }

  const createStyles = () => {
    const responsivePadding = getResponsivePadding();
    
    return StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
      },
      header: {
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        paddingTop: insets.top,
      },
      headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: responsivePadding,
        paddingVertical: scaleHeight(12),
      },
      headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleWidth(12),
      },
      backButton: {
        padding: scaleWidth(4),
      },
      backButtonText: {
        fontSize: scaleFont(24),
      },
      headerTitle: {
        fontSize: scaleFont(20),
        fontFamily: "Poppins_600SemiBold",
        color: "#333333",
      },
      headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: scaleWidth(12),
      },
      markAllReadButton: {
        paddingVertical: scaleHeight(6),
        paddingHorizontal: scaleWidth(12),
      },
      markAllReadText: {
        fontSize: scaleFont(12),
        fontFamily: "Inter_500Medium",
        color: "#0066CC",
      },
      scrollContent: {
        paddingHorizontal: responsivePadding,
        paddingTop: scaleHeight(16),
        paddingBottom: scaleHeight(40),
      },
      loadingContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleHeight(60),
      },
      loadingText: {
        fontSize: scaleFont(14),
        fontFamily: "Inter_400Regular",
        color: "#666666",
        marginTop: scaleHeight(12),
      },
      emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: scaleHeight(60),
      },
      emptyStateIcon: {
        fontSize: scaleFont(64),
        marginBottom: scaleHeight(16),
      },
      emptyStateText: {
        fontSize: scaleFont(16),
        fontFamily: "Poppins_600SemiBold",
        color: "#666666",
        marginBottom: scaleHeight(8),
      },
      emptyStateSubtext: {
        fontSize: scaleFont(14),
        fontFamily: "Inter_400Regular",
        color: "#999999",
        textAlign: "center",
      },
    });
  };

  const styles = createStyles();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // Check if we can go back (if there's a previous screen in stack)
                // If we're at the root (accessed via tab), navigate to dashboard instead
                const currentRoute = segments[segments.length - 1];
                if (segments.length <= 1 || currentRoute === "notifications") {
                  // We're at root or already on notifications, go to dashboard
                  router.replace("/dashboard" as any);
                } else {
                  // There's a previous screen, go back normally
                  router.back();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: "#FF3B30",
                  borderRadius: scaleWidth(10),
                  paddingHorizontal: scaleWidth(8),
                  paddingVertical: scaleHeight(2),
                  minWidth: scaleWidth(20),
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: scaleFont(11),
                    fontFamily: "Inter_600SemiBold",
                    color: "#FFFFFF",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllReadButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllReadText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons
              name="notifications-none"
              size={scaleWidth(56)}
              color="#C5CAD3"
            />
            <Text style={styles.emptyStateText}>No notifications</Text>
            <Text style={styles.emptyStateSubtext}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={handleNotificationPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

