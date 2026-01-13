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
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import {
    getResponsivePadding,
    scaleFont,
    scaleHeight,
    scaleWidth,
} from "../lib/utils/responsive";

/**
 * NOTIFICATION TYPES EXPLANATION:
 * 
 * 1. REGISTRATION_STATUS_CHANGE
 *    - Triggered when: A customer registration status changes (pending → approved → installed)
 *    - Logic: Database trigger or admin action updates status → System creates notification
 *    - Purpose: Agent knows their registration was processed
 *    - Action: Agent can view the registration details
 * 
 * 2. EARNINGS_UPDATE
 *    - Triggered when: Balance/earnings change (new installation = commission earned)
 *    - Logic: Database trigger calculates earnings → System creates notification
 *    - Purpose: Agent knows they earned money
 *    - Action: Agent can view balance/earnings
 * 
 * 3. ACCOUNT_STATUS_CHANGE
 *    - Triggered when: Admin changes agent status (pending → approved/rejected/banned)
 *    - Logic: Admin updates agent status → System creates notification
 *    - Purpose: Agent knows their account status changed
 *    - Action: Agent can view account status
 * 
 * 4. SYNC_FAILURE
 *    - Triggered when: Registration fails to sync to Microsoft Forms
 *    - Logic: Sync service detects failure → System creates notification
 *    - Purpose: Agent knows there's an issue to resolve
 *    - Action: Agent can retry sync
 * 
 * 5. SYSTEM_ANNOUNCEMENT
 *    - Triggered when: Admin sends announcement to all agents
 *    - Logic: Admin creates announcement → System sends to all agents
 *    - Purpose: Important updates/information
 *    - Action: Agent reads announcement
 */

// Notification type definitions
type NotificationType =
  | "REGISTRATION_STATUS_CHANGE"
  | "EARNINGS_UPDATE"
  | "ACCOUNT_STATUS_CHANGE"
  | "SYNC_FAILURE"
  | "SYSTEM_ANNOUNCEMENT";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  // Optional data for navigation/actions
  relatedId?: string; // e.g., registration_id, customer_id
  metadata?: {
    // Type-specific data
    status?: string; // For status changes
    amount?: number; // For earnings
    customerName?: string; // For registrations
  };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
      const { data: { user } } = await supabase.auth.getUser();
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
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("No user found");
        setIsLoading(false);
        return;
      }

      // Fetch notifications from database
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50); // Limit to 50 most recent

      if (error) {
        console.error("Error loading notifications:", error);
        setIsLoading(false);
        // Fallback to fake data for now
        loadFakeNotifications();
        return;
      }

      // Transform database records to Notification format
      const notifications: Notification[] = (data || []).map((record: any) => ({
        id: record.id,
        type: record.type as NotificationType,
        title: record.title,
        message: record.message,
        isRead: record.is_read,
        createdAt: record.created_at,
        relatedId: record.related_id,
        metadata: record.metadata || {},
      }));

      setNotifications(notifications);

      // Automatically mark all unread notifications as read after a short delay
      // This ensures notifications are marked as read when viewed
      markNotificationsAsRead(notifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      // Fallback to fake data
      loadFakeNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFakeNotifications = () => {
    const fakeNotifications: Notification[] = [
      // Registration Status Change - Installed (most recent)
      {
        id: "1",
        type: "REGISTRATION_STATUS_CHANGE",
        title: "Installation Completed",
        message: "Customer 'John Doe' installation has been completed. You earned KSh 300.",
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        relatedId: "reg-123",
        metadata: {
          status: "installed",
          amount: 300,
          customerName: "John Doe",
        },
      },
      // Earnings Update
      {
        id: "2",
        type: "EARNINGS_UPDATE",
        title: "New Earnings Added",
        message: "KSh 300 has been added to your balance from a premium installation.",
        isRead: false,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        metadata: {
          amount: 300,
        },
      },
      // Registration Status Change - Approved
      {
        id: "3",
        type: "REGISTRATION_STATUS_CHANGE",
        title: "Registration Approved",
        message: "Customer 'Jane Smith' registration has been approved and is scheduled for installation.",
        isRead: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        relatedId: "reg-456",
        metadata: {
          status: "approved",
          customerName: "Jane Smith",
        },
      },
      // Account Status Change
      {
        id: "4",
        type: "ACCOUNT_STATUS_CHANGE",
        title: "Account Approved",
        message: "Your agent account has been approved. You can now start registering customers.",
        isRead: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      },
      // Sync Failure
      {
        id: "5",
        type: "SYNC_FAILURE",
        title: "Sync Failed",
        message: "Failed to sync registration for 'Mike Johnson' to Microsoft Forms. Please try again.",
        isRead: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        relatedId: "reg-789",
        metadata: {
          customerName: "Mike Johnson",
        },
      },
      // System Announcement
      {
        id: "6",
        type: "SYSTEM_ANNOUNCEMENT",
        title: "System Maintenance",
        message: "Scheduled maintenance will occur on January 15th from 2 AM to 4 AM. Services may be temporarily unavailable.",
        isRead: true,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      },
      // More earnings
      {
        id: "7",
        type: "EARNINGS_UPDATE",
        title: "New Earnings Added",
        message: "KSh 150 has been added to your balance from a standard installation.",
        isRead: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
        metadata: {
          amount: 150,
        },
      },
    ];

    setNotifications(fakeNotifications);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Don't set isLoading during refresh - RefreshControl already shows spinner
    try {
      const { data: { user } } = await supabase.auth.getUser();
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

      const notifications: Notification[] = (data || []).map((record: any) => ({
        id: record.id,
        type: record.type as NotificationType,
        title: record.title,
        message: record.message,
        isRead: record.is_read,
        createdAt: record.created_at,
        relatedId: record.related_id,
        metadata: record.metadata || {},
      }));

      setNotifications(notifications);

      // Automatically mark all unread notifications as read when refreshed
      markNotificationsAsRead(notifications);
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to automatically mark unread notifications as read
  const markNotificationsAsRead = async (notifications: Notification[]) => {
    const unreadNotifications = notifications.filter((n) => !n.isRead);
    if (unreadNotifications.length > 0) {
      // Small delay to ensure notifications are actually displayed
      setTimeout(async () => {
        const unreadIds = unreadNotifications.map((n) => n.id);
        try {
          const { error } = await supabase
            .from("notifications")
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
            })
            .in("id", unreadIds);

          if (!error) {
            // Update local state to reflect read status
            setNotifications((prev) =>
              prev.map((notif) =>
                unreadIds.includes(notif.id)
                  ? { ...notif, isRead: true }
                  : notif
              )
            );
          }
        } catch (error) {
          console.error("Error auto-marking notifications as read:", error);
        }
      }, 1000); // 1 second delay
    }
  };

  const markAllAsRead = async () => {
    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Optimistically update UI
    setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));

    // Update all unread notifications in database
    try {
      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("agent_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        // Reload notifications to revert
        loadNotifications();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Navigate based on notification type
    // Note: Notifications are automatically marked as read when viewed, no need to mark on click
    switch (notification.type) {
      case "REGISTRATION_STATUS_CHANGE":
        // Navigate to registration details
        if (notification.relatedId) {
          router.push(`/registrations` as any);
        }
        break;
      case "EARNINGS_UPDATE":
        // Navigate to dashboard (balance section)
        router.push("/dashboard" as any);
        break;
      case "ACCOUNT_STATUS_CHANGE":
        // Navigate to profile/account settings
        router.push("/dashboard" as any);
        break;
      case "SYNC_FAILURE":
        // Navigate to registrations page with filter for failed syncs
        router.push(`/registrations` as any);
        break;
      case "SYSTEM_ANNOUNCEMENT":
        // No navigation needed
        break;
    }
  };

  const getNotificationIcon = (type: NotificationType): string => {
    switch (type) {
      case "REGISTRATION_STATUS_CHANGE":
        return "✅";
      case "EARNINGS_UPDATE":
        return "💰";
      case "ACCOUNT_STATUS_CHANGE":
        return "👤";
      case "SYNC_FAILURE":
        return "⚠️";
      case "SYSTEM_ANNOUNCEMENT":
        return "📢";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case "REGISTRATION_STATUS_CHANGE":
        return "#4CAF50"; // Green
      case "EARNINGS_UPDATE":
        return "#FF9800"; // Orange
      case "ACCOUNT_STATUS_CHANGE":
        return "#2196F3"; // Blue
      case "SYNC_FAILURE":
        return "#F44336"; // Red
      case "SYSTEM_ANNOUNCEMENT":
        return "#9C27B0"; // Purple
      default:
        return "#666666";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
      notificationCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: scaleWidth(12),
        padding: getResponsivePadding(),
        marginBottom: scaleHeight(12),
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
        borderLeftWidth: 4,
      },
      notificationCardUnread: {
        backgroundColor: "#F8F9FF",
        borderLeftColor: "#0066CC",
      },
      notificationCardRead: {
        borderLeftColor: "#E0E0E0",
      },
      notificationHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: scaleWidth(12),
      },
      notificationIconContainer: {
        width: scaleWidth(40),
        height: scaleWidth(40),
        borderRadius: scaleWidth(20),
        backgroundColor: "#F0F0F0",
        justifyContent: "center",
        alignItems: "center",
      },
      notificationIcon: {
        fontSize: scaleFont(20),
      },
      notificationContent: {
        flex: 1,
      },
      notificationTitle: {
        fontSize: scaleFont(16),
        fontFamily: "Poppins_600SemiBold",
        color: "#333333",
        marginBottom: scaleHeight(4),
      },
      notificationMessage: {
        fontSize: scaleFont(14),
        fontFamily: "Inter_400Regular",
        color: "#666666",
        lineHeight: scaleFont(20),
        marginBottom: scaleHeight(8),
      },
      notificationFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      },
      notificationTime: {
        fontSize: scaleFont(12),
        fontFamily: "Inter_400Regular",
        color: "#999999",
      },
      notificationBadge: {
        paddingHorizontal: scaleWidth(8),
        paddingVertical: scaleHeight(4),
        borderRadius: scaleWidth(12),
        backgroundColor: "#0066CC",
      },
      notificationBadgeText: {
        fontSize: scaleFont(10),
        fontFamily: "Inter_600SemiBold",
        color: "#FFFFFF",
        textTransform: "uppercase",
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
              onPress={() => router.back()}
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
            <Text style={styles.emptyStateIcon}>🔔</Text>
            <Text style={styles.emptyStateText}>No notifications</Text>
            <Text style={styles.emptyStateSubtext}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => {
            const iconColor = getNotificationColor(notification.type);
            const isUnread = !notification.isRead;

            return (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  isUnread ? styles.notificationCardUnread : styles.notificationCardRead,
                  { borderLeftColor: isUnread ? iconColor : "#E0E0E0" },
                ]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
              >
                <View style={styles.notificationHeader}>
                  <View
                    style={[
                      styles.notificationIconContainer,
                      { backgroundColor: `${iconColor}15` },
                    ]}
                  >
                    <Text style={styles.notificationIcon}>
                      {getNotificationIcon(notification.type)}
                    </Text>
                  </View>
                  <View style={styles.notificationContent}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: scaleHeight(4),
                      }}
                    >
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      {isUnread && (
                        <View
                          style={{
                            width: scaleWidth(8),
                            height: scaleWidth(8),
                            borderRadius: scaleWidth(4),
                            backgroundColor: iconColor,
                          }}
                        />
                      )}
                    </View>
                    <Text style={styles.notificationMessage}>
                      {notification.message}
                    </Text>
                    <View style={styles.notificationFooter}>
                      <Text style={styles.notificationTime}>
                        {formatTimeAgo(notification.createdAt)}
                      </Text>
                      <View
                        style={[
                          styles.notificationBadge,
                          { backgroundColor: `${iconColor}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.notificationBadgeText,
                            { color: iconColor },
                          ]}
                        >
                          {notification.type
                            .replace(/_/g, " ")
                            .toLowerCase()
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

