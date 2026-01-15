import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  FlatList,
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
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
  getCardPadding,
} from "../lib/utils/responsive";
import { getPendingRegistrations, initOfflineStorage } from "../lib/services/offlineStorage";
import {
  getCachedRegistrations,
  saveRegistrationsToCache,
  clearRegistrationsCache,
  CachedRegistration,
} from "../lib/cache/registrationsCache";
import {
  syncRegistrationFromSupabase,
  syncAllUnsyncedRegistrations,
  syncPendingRegistrations,
  isOnline,
  setupAutoSync,
} from "../lib/services/syncService";
import { Toast } from "../components/Toast";

interface Registration {
  id: string;
  customer_name: string;
  preferred_package?: string;
  installation_town?: string;
  status: string;
  created_at: string;
  ms_forms_response_id?: string;
  ms_forms_submitted_at?: string;
  syncStatus?: "synced" | "pending" | "not_synced";
}

export default function RegistrationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "installed">("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"info" | "success" | "error">("info");

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    loadRegistrations();
  }, [filter]);

  // Filter registrations by search query in real-time
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If no search query, show all registrations for current filter
      setRegistrations(allRegistrations);
      return;
    }

    // Filter by search query (only search in name and town for privacy)
    const queryLower = searchQuery.toLowerCase();
    const filtered = allRegistrations.filter((reg) => {
      const nameMatch = reg.customer_name?.toLowerCase().includes(queryLower);
      const locationMatch = reg.installation_town?.toLowerCase().includes(queryLower);
      return nameMatch || locationMatch;
    });
    setRegistrations(filtered);
  }, [searchQuery, allRegistrations]);

  // Set up auto-sync with callback to refresh data after sync
  useEffect(() => {
    const loadUserAndSetupSync = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) return;

      // Setup auto-sync with callback to refresh registrations after sync completes
      const cleanup = setupAutoSync(
        user.id,
        undefined, // No progress callback needed
        (result) => {
          // Refresh registrations after sync completes if any were synced
          if (result.synced > 0) {
            console.log(`🔄 ${result.synced} registrations synced - refreshing data`);
            loadRegistrations();
          }
        }
      );

      return cleanup;
    };

    const cleanupPromise = loadUserAndSetupSync();
    
    return () => {
      cleanupPromise.then((cleanup) => {
        if (cleanup) cleanup();
      });
    };
  }, []);

  // Monitor network status and refresh when coming back online
  useEffect(() => {
    let wasOffline = false;
    let checkInterval: NodeJS.Timeout;

    const checkNetworkStatus = async () => {
      try {
        const online = await isOnline();
        if (!online && !wasOffline) {
          wasOffline = true;
        } else if (online && wasOffline) {
          // Just came back online - refresh data
          console.log("🌐 Back online - refreshing registrations");
          wasOffline = false;
          loadRegistrations();
        }
      } catch (error) {
        console.error("Error checking network status:", error);
      }
    };

    // Check immediately
    checkNetworkStatus();

    // Then check every 10 seconds
    checkInterval = setInterval(checkNetworkStatus, 10000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  const loadRegistrations = async () => {
    try {
      setIsLoading(true);

      // Get current user - use getSession() which works offline
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      const user = session?.user;

      if (!user) {
        router.replace("/login" as any);
        return;
      }

      // Check if online
      const online = await isOnline();

      // If offline, load from cache and pending registrations
      if (!online) {
        console.log("📴 Offline - loading registrations from cache and pending");
        const cachedRegistrations = await getCachedRegistrations();
        const pending = await getPendingRegistrations(user.id);
        
        // Convert pending registrations to Registration format
        const pendingRegistrations: Registration[] = pending.map((p: any) => ({
          id: p.id,
          customer_name: p.customerData.customerName,
          preferred_package: p.customerData.preferredPackage,
          installation_town: p.customerData.installationTown,
          status: "pending" as const,
          created_at: p.created_at,
          ms_forms_response_id: undefined,
          ms_forms_submitted_at: undefined,
          syncStatus: "pending" as const,
        }));

        // Merge cached and pending registrations
        const pendingIds = new Set(pending.map((p: any) => p.id));
        const combined = [
          ...pendingRegistrations,
          ...(cachedRegistrations || []).filter((reg) => !pendingIds.has(reg.id)),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });

        // Apply filter to combined data
        let filtered = combined;
        if (filter !== "all") {
          filtered = combined.filter((reg) => reg.status === filter);
        }
        setAllRegistrations(filtered as Registration[]);
        setTotalCount(filtered.length);
        setIsLoading(false);
        return;
      }

      // Online - Try to load cached data first (for fast initial display)
      const cachedRegistrations = await getCachedRegistrations();
      if (cachedRegistrations) {
        // Apply filter to cached data
        let filtered = cachedRegistrations;
        if (filter !== "all") {
          filtered = cachedRegistrations.filter((reg) => reg.status === filter);
        }
        setAllRegistrations(filtered as Registration[]);
        setTotalCount(filtered.length);
        setIsLoading(false); // Show cached data immediately
      }

      // Build query - Only fetch non-sensitive data for privacy compliance
      let query = supabase
        .from("customer_registrations")
        .select("id, customer_name, preferred_package, installation_town, status, created_at, ms_forms_response_id, ms_forms_submitted_at")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      // Apply filter
      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Check for pending offline registrations and merge them
      const pending = await getPendingRegistrations(user.id);
      const pendingIds = new Set(pending.map((p: any) => p.id));

      // Convert pending registrations to Registration format for display
      const pendingRegistrations: Registration[] = pending.map((p: any) => ({
        id: p.id,
        customer_name: p.customerData.customerName,
        preferred_package: p.customerData.preferredPackage,
        installation_town: p.customerData.installationTown,
        status: "pending" as const,
        created_at: p.created_at,
        ms_forms_response_id: undefined,
        ms_forms_submitted_at: undefined,
        syncStatus: "pending" as const,
      }));

      // Enhance registrations with sync status
      const enhancedRegistrations = (data || []).map((reg: any) => {
        const hasMSFormsId = !!reg.ms_forms_response_id;
        const hasMSFormsSubmittedAt = !!reg.ms_forms_submitted_at;

        let syncStatus: "synced" | "pending" | "not_synced" = "not_synced";

        if (hasMSFormsId && hasMSFormsSubmittedAt) {
          syncStatus = "synced";
        } else if (!hasMSFormsId) {
          const createdAt = reg.created_at ? new Date(reg.created_at).getTime() : 0;
          const now = Date.now();
          const fiveMinutesAgo = now - 5 * 60 * 1000;

          if (createdAt > fiveMinutesAgo) {
            syncStatus = "pending";
          } else {
            syncStatus = "not_synced";
          }
        }

        return {
          ...reg,
          syncStatus,
        };
      });

      // Merge pending offline registrations with Supabase registrations
      // Combine both arrays, ensuring pending ones are at the top (most recent)
      const allRegistrationsCombined = [
        ...pendingRegistrations,
        ...enhancedRegistrations.filter((reg) => !pendingIds.has(reg.id)), // Exclude any that are already in pending
      ].sort((a, b) => {
        // Sort by created_at descending (most recent first)
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // Save to cache (save all registrations, not filtered)
      // First, get all registrations for cache
      const allQuery = supabase
        .from("customer_registrations")
        .select("id, customer_name, preferred_package, installation_town, status, created_at, ms_forms_response_id, ms_forms_submitted_at")
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      const { data: allData } = await allQuery;
      if (allData) {
        const allEnhanced = allData.map((reg: any) => {
          const hasMSFormsId = !!reg.ms_forms_response_id;
          const hasMSFormsSubmittedAt = !!reg.ms_forms_submitted_at;
          let syncStatus: "synced" | "pending" | "not_synced" = "not_synced";
          if (hasMSFormsId && hasMSFormsSubmittedAt) {
            syncStatus = "synced";
          } else if (!hasMSFormsId) {
            const createdAt = reg.created_at ? new Date(reg.created_at).getTime() : 0;
            const now = Date.now();
            const fiveMinutesAgo = now - 5 * 60 * 1000;
            if (createdAt > fiveMinutesAgo) {
              syncStatus = "pending";
            } else {
              syncStatus = "not_synced";
            }
          }
          return { ...reg, syncStatus };
        });
        // Merge pending registrations for cache too
        const allDataWithPending = [
          ...pendingRegistrations,
          ...allEnhanced.filter((reg) => !pendingIds.has(reg.id)),
        ].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return dateB - dateA;
        });
        await saveRegistrationsToCache(allDataWithPending);
      }

      setAllRegistrations(allRegistrationsCombined);
      
      // Set total count (for the current filter, not search)
      setTotalCount(allRegistrationsCombined.length);
      
      // Note: Search filtering is handled by the useEffect hook above
    } catch (error: any) {
      console.error("Error loading registrations:", error);
      // Try to load from cache on error
      const cachedRegistrations = await getCachedRegistrations();
      if (cachedRegistrations) {
        let filtered = cachedRegistrations;
        if (filter !== "all") {
          filtered = cachedRegistrations.filter((reg) => reg.status === filter);
        }
        setAllRegistrations(filtered as Registration[]);
        setTotalCount(filtered.length);
      } else {
        Alert.alert("Error", "Failed to load registrations");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRegistrations();
    setRefreshing(false);
  };

  const showToast = (message: string, type: "info" | "success" | "error" = "info") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const handleSyncRegistration = async (registrationId: string) => {
    if (syncingIds.has(registrationId)) return;

    const online = await isOnline();
    if (!online) {
      Alert.alert("Offline", "Please check your internet connection and try again.");
      return;
    }

    setSyncingIds((prev) => new Set(prev).add(registrationId));
    showToast("Syncing registration...", "info");

    try {
      // Check if this registration is in offline storage (needs sync to both Supabase AND MS Forms)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("User not found", "error");
        return;
      }

      // Check if this registration is in offline storage first
      // If offline storage fails, skip it and sync from Supabase directly
      let offlineRegistration = null;
      try {
        // Try to initialize and check offline storage
        try {
          await initOfflineStorage();
        } catch (initError) {
          // If initialization fails, skip offline check entirely
          console.warn("⚠️ Offline storage not available, skipping offline check");
          throw initError; // Re-throw to skip to Supabase sync
        }
        
        try {
          const pendingRegistrations = await getPendingRegistrations(user.id);
          offlineRegistration = pendingRegistrations.find((p: any) => p.id === registrationId);
        } catch (getError) {
          // If getting pending registrations fails, skip offline check
          console.warn("⚠️ Could not get pending registrations, proceeding with Supabase sync");
        }
      } catch (error) {
        // Any error in offline storage check - proceed with Supabase sync
        console.warn("⚠️ Offline storage check failed, proceeding with Supabase sync:", error);
      }

      let result;
      if (offlineRegistration) {
        // Registration is in offline storage - sync to BOTH Supabase and MS Forms
        console.log("🔄 Syncing offline registration to Supabase and MS Forms");
        // Use the offline sync which handles both Supabase and MS Forms
        const { syncPendingRegistrations } = await import("../lib/services/syncService");
        const syncResult = await syncPendingRegistrations(user.id, (current, total) => {
          showToast(`Syncing... ${current} of ${total}`, "info");
        });
        // Check if this specific registration was synced
        const wasSynced = syncResult.synced > 0 && !syncResult.errors.some(
          (err) => err.includes(registrationId)
        );
        result = {
          success: wasSynced,
          error: wasSynced ? undefined : syncResult.errors.find((err) => err.includes(registrationId)) || "Failed to sync",
        };
      } else {
        // Registration is already in Supabase - only sync to MS Forms
        console.log("🔄 Syncing registration from Supabase to MS Forms");
        showToast("Syncing to Microsoft Forms...", "info");
        result = await syncRegistrationFromSupabase(registrationId);
      }

      if (result.success) {
        showToast("Registration synced successfully!", "success");
        // Wait a bit for database to update, then reload
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadRegistrations(); // Reload to update sync status
      } else {
        showToast(result.error || "Failed to sync registration", "error");
      }
    } catch (error: any) {
      showToast(error.message || "An error occurred", "error");
    } finally {
      setSyncingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(registrationId);
        return newSet;
      });
    }
  };

  const handleSyncAll = async () => {
    const online = await isOnline();
    if (!online) {
      Alert.alert("Offline", "Please check your internet connection and try again.");
      return;
    }

    setSyncingAll(true);
    showToast("Starting sync...", "info");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showToast("User not found", "error");
        return;
      }

      // Step 1: Sync offline registrations (to both Supabase AND MS Forms)
      console.log("🔄 Step 1: Syncing offline registrations...");
      let offlineSyncResult = { success: true, synced: 0, failed: 0, errors: [] };
      let offlineTotal = 0;
      try {
        // Ensure offline storage is initialized
        await initOfflineStorage();
        const pending = await getPendingRegistrations(user.id);
        offlineTotal = pending.length;
        
        if (offlineTotal > 0) {
          offlineSyncResult = await syncPendingRegistrations(user.id, (current, total) => {
            showToast(`Syncing offline... ${current} of ${total}`, "info");
          });
        }
      } catch (error) {
        console.warn("⚠️ Could not sync offline registrations, skipping:", error);
        // Continue with Supabase sync even if offline sync fails
      }
      
      // Step 2: Sync registrations already in Supabase but not in MS Forms
      console.log("🔄 Step 2: Syncing Supabase registrations to MS Forms...");
      let supabaseTotal = 0;
      // Get count first
      const { count } = await supabase
        .from("customer_registrations")
        .select("*", { count: "exact", head: true })
        .eq("agent_id", user.id)
        .is("ms_forms_response_id", null);
      supabaseTotal = count || 0;

      const supabaseSyncResult = await syncAllUnsyncedRegistrations(
        user.id,
        (current, total) => {
          const offlineDone = offlineTotal;
          const currentTotal = offlineDone + total;
          const currentProgress = offlineDone + current;
          showToast(`Syncing all... ${currentProgress} of ${currentTotal}`, "info");
        }
      );

      const totalSynced = offlineSyncResult.synced + supabaseSyncResult.synced;
      const totalFailed = offlineSyncResult.failed + supabaseSyncResult.failed;
      const allErrors = [...offlineSyncResult.errors, ...supabaseSyncResult.errors];

      if (totalSynced > 0 || totalFailed === 0) {
        showToast(
          `Sync complete! ${totalSynced} synced${totalFailed > 0 ? `, ${totalFailed} failed` : ""}`,
          totalFailed > 0 ? "error" : "success"
        );
        // Wait a bit for database to update, then reload
        await new Promise(resolve => setTimeout(resolve, 500));
        await loadRegistrations(); // Reload to update sync status
      } else {
        showToast("Sync failed: " + (allErrors[0] || "Unknown error"), "error");
        // Still reload to show current status
        await loadRegistrations();
      }
    } catch (error: any) {
      showToast(error.message || "An error occurred", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "installed":
        return "#4CAF50";
      case "approved":
        return "#2196F3";
      case "pending":
        return "#FF9800";
      default:
        return "#999999";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "installed":
        return "#E8F5E9";
      case "approved":
        return "#E3F2FD";
      case "pending":
        return "#FFF4E6";
      default:
        return "#F5F5F5";
    }
  };

  const getSyncStatusText = (syncStatus?: string) => {
    switch (syncStatus) {
      case "synced":
        return "✅ Synced";
      case "pending":
        return "⏳ Pending Sync";
      case "not_synced":
        return "❌ Not Synced";
      default:
        return "❓ Unknown";
    }
  };

  const getSyncStatusColor = (syncStatus?: string) => {
    switch (syncStatus) {
      case "synced":
        return "#4CAF50";
      case "pending":
        return "#FF9800";
      case "not_synced":
        return "#999999";
      default:
        return "#999999";
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Registrations</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar and Filter */}
      <View style={styles.searchFilterContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Dropdown */}
        <View style={styles.filterDropdownContainer}>
          <TouchableOpacity
            style={styles.filterDropdownButton}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterDropdownText}>
              {filter === "all"
                ? "All"
                : filter === "pending"
                ? "Pending"
                : filter === "approved"
                ? "Approved"
                : "Installed"}
            </Text>
            <Text style={styles.filterDropdownArrow}>
              {showFilterDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showFilterDropdown && (
            <View style={styles.filterDropdownMenu}>
              <TouchableOpacity
                style={[
                  styles.filterDropdownItem,
                  filter === "all" && styles.filterDropdownItemActive,
                ]}
                onPress={() => {
                  setFilter("all");
                  setShowFilterDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.filterDropdownItemText,
                    filter === "all" && styles.filterDropdownItemTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterDropdownItem,
                  filter === "pending" && styles.filterDropdownItemActive,
                ]}
                onPress={() => {
                  setFilter("pending");
                  setShowFilterDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.filterDropdownItemText,
                    filter === "pending" && styles.filterDropdownItemTextActive,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterDropdownItem,
                  filter === "approved" && styles.filterDropdownItemActive,
                ]}
                onPress={() => {
                  setFilter("approved");
                  setShowFilterDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.filterDropdownItemText,
                    filter === "approved" && styles.filterDropdownItemTextActive,
                  ]}
                >
                  Approved
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterDropdownItem,
                  filter === "installed" && styles.filterDropdownItemActive,
                ]}
                onPress={() => {
                  setFilter("installed");
                  setShowFilterDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.filterDropdownItemText,
                    filter === "installed" && styles.filterDropdownItemTextActive,
                  ]}
                >
                  Installed
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Total Count and Sync All */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {searchQuery.trim()
            ? `Showing ${registrations.length} of ${totalCount} customers`
            : `Total: ${totalCount} customer${totalCount !== 1 ? "s" : ""}`}
        </Text>
        <TouchableOpacity
          style={[styles.syncAllButton, syncingAll && styles.syncAllButtonDisabled]}
          onPress={handleSyncAll}
          disabled={syncingAll}
          activeOpacity={0.7}
        >
          <Text style={styles.syncAllButtonText}>
            {syncingAll ? "Syncing..." : "Sync All"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        duration={toastType === "info" ? 0 : 3000}
        onHide={() => setToastVisible(false)}
      />

      {/* Registrations List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={() => setShowFilterDropdown(false)}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading registrations...</Text>
          </View>
        ) : registrations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📋</Text>
            <Text style={styles.emptyStateText}>No registrations found</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === "all"
                ? "You haven't registered any customers yet"
                : `No ${filter} registrations`}
            </Text>
          </View>
        ) : (
          <View style={styles.registrationsList}>
            {registrations.map((registration) => (
              <View key={registration.id} style={styles.registrationCard}>
                {/* Header - Always Visible, Clickable to Expand/Collapse */}
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  onPress={() => {
                    setExpandedCards((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(registration.id)) {
                        newSet.delete(registration.id);
                      } else {
                        newSet.add(registration.id);
                      }
                      return newSet;
                    });
                  }}
                >
                  <View style={styles.customerHeaderRow}>
                    <View style={styles.headerLeftSection}>
                      <Text style={styles.registrationName}>
                        {registration.customer_name || "Customer"}
                      </Text>
                      {/* Sync Status - Always Visible */}
                      {registration.syncStatus && (
                        <View style={styles.syncStatusContainer}>
                          <Text
                            style={[
                              styles.syncStatusText,
                              { color: getSyncStatusColor(registration.syncStatus) },
                            ]}
                          >
                            {getSyncStatusText(registration.syncStatus)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.headerRightSection}>
                      <View
                        style={[
                          styles.registrationStatus,
                          {
                            backgroundColor: getStatusBgColor(registration.status),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.registrationStatusText,
                            { color: getStatusColor(registration.status) },
                          ]}
                        >
                          {registration.status || "pending"}
                        </Text>
                      </View>
                      <Text style={styles.expandIcon}>
                        {expandedCards.has(registration.id) ? "▲" : "▼"}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Collapsible Details */}
                {expandedCards.has(registration.id) && (
                  <View style={styles.expandedContent}>
                    {/* Minimal Details (Privacy Compliant) */}
                    <View style={styles.customerDetailsGrid}>
                      {/* Package */}
                      {registration.preferred_package && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Package:</Text>
                          <Text style={styles.detailValue}>
                            {registration.preferred_package === "premium" ? "Premium" : "Standard"}
                          </Text>
                        </View>
                      )}

                      {/* Location (Town only - no specific address) */}
                      {registration.installation_town && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Town:</Text>
                          <Text style={styles.detailValue}>
                            {registration.installation_town}
                          </Text>
                        </View>
                      )}

                      {/* Registration Date */}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Registered:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(registration.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons Row */}
                    {/* Sync Button Row (Sync status already shown in header) */}
                    {registration.syncStatus !== "synced" && (
                      <View style={styles.syncRow}>
                        <TouchableOpacity
                          style={[
                            styles.syncButton,
                            syncingIds.has(registration.id) && styles.syncButtonDisabled,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSyncRegistration(registration.id);
                          }}
                          disabled={syncingIds.has(registration.id)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.syncButtonText}>
                            {syncingIds.has(registration.id) ? "Syncing..." : "Sync"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerRight: {
    width: 60,
  },
  searchFilterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#333333",
  },
  filterDropdownContainer: {
    position: "relative",
    width: 120,
  },
  filterDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 40,
  },
  filterDropdownText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
  filterDropdownArrow: {
    fontSize: 10,
    color: "#666666",
    marginLeft: 8,
  },
  filterDropdownMenu: {
    position: "absolute",
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  filterDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  filterDropdownItemActive: {
    backgroundColor: "#E6F2FF",
  },
  filterDropdownItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#333333",
  },
  filterDropdownItemTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
  },
  countContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  countText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
  syncAllButton: {
    backgroundColor: "#0066CC",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncAllButtonDisabled: {
    backgroundColor: "#999999",
    opacity: 0.6,
  },
  syncAllButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  syncButton: {
    backgroundColor: "#0066CC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-end",
  },
  syncButtonDisabled: {
    backgroundColor: "#999999",
    opacity: 0.6,
  },
  syncButtonText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    textAlign: "center",
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
    width: "100%",
  },
  registrationLeft: {
    width: "100%",
  },
  cardHeader: {
    width: "100%",
  },
  customerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeftSection: {
    flex: 1,
    marginRight: 8,
  },
  headerRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandIcon: {
    fontSize: 12,
    color: "#999999",
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  registrationName: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    flex: 1,
    marginRight: 8,
  },
  registrationStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  registrationStatusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  customerDetailsGrid: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#666666",
    width: 90,
    marginRight: 8,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    flex: 1,
  },
  syncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  syncStatusContainer: {
    marginTop: 4,
  },
  syncStatusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});

