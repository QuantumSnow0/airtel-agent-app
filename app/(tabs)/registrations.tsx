import { useState, useEffect, useCallback } from "react";
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
import { supabase } from "../../lib/supabase";
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
  getCardPadding,
} from "../../lib/utils/responsive";
import { getPendingRegistrations, initOfflineStorage } from "../../lib/services/offlineStorage";
import {
  getCachedRegistrations,
  saveRegistrationsToCache,
  clearRegistrationsCache,
  CachedRegistration,
} from "../../lib/cache/registrationsCache";
import {
  syncAllUnsyncedRegistrations,
  syncPendingRegistrations,
  isOnline,
  setupAutoSync,
} from "../../lib/services/syncService";
import { Toast } from "../../components/Toast";
import { getWamTabBarOffset } from "../../components/WamTabBar";
import {
  mapCustomerRowToUnifiedList,
  mapSafaricomRowToUnifiedList,
} from "../../lib/registrations/unifiedListRegistration";
import {
  REGISTRATION_FILTER_OPTIONS,
  REGISTRATION_STATUS_COLORS,
  formatRegistrationStatusLabel,
  type RegistrationStatusFilter,
} from "../../constants/registrationStatuses";

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
  /** Defaults to Airtel when omitted (older cache). */
  source?: "airtel" | "safaricom";
}

export default function RegistrationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<RegistrationStatusFilter>("all");
  const [carrierFilter, setCarrierFilter] = useState<"all" | "airtel" | "safaricom">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name">("newest");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [syncingAll, setSyncingAll] = useState(false);
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

  const applyClientFilters = useCallback(() => {
    let filtered = [...allRegistrations];

    if (carrierFilter !== "all") {
      filtered = filtered.filter(
        (reg) => (reg.source ?? "airtel") === carrierFilter
      );
    }

    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter((reg) => {
        const nameMatch = reg.customer_name?.toLowerCase().includes(queryLower);
        const locationMatch = reg.installation_town?.toLowerCase().includes(queryLower);
        const pkgMatch = reg.preferred_package?.toLowerCase().includes(queryLower);
        const statusMatch = formatRegistrationStatusLabel(reg.status)
          .toLowerCase()
          .includes(queryLower);
        const carrierMatch =
          (reg.source ?? "airtel") === "safaricom"
            ? "safaricom".includes(queryLower)
            : "airtel".includes(queryLower);
        return nameMatch || locationMatch || pkgMatch || statusMatch || carrierMatch;
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return (a.customer_name ?? "").localeCompare(b.customer_name ?? "");
      }
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "oldest" ? dateA - dateB : dateB - dateA;
    });

    setRegistrations(filtered);
  }, [allRegistrations, carrierFilter, searchQuery, sortBy]);

  useEffect(() => {
    applyClientFilters();
  }, [applyClientFilters]);

  const openRegistrationDetail = (registration: Registration) => {
    const source = registration.source ?? "airtel";
    router.push(`/registration/${registration.id}?source=${source}` as any);
  };

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
          source: "airtel" as const,
        }));

        // Merge cached and pending registrations
        const pendingIds = new Set(pending.map((p: any) => p.id));
        const combined = [
          ...pendingRegistrations,
          ...(cachedRegistrations || [])
            .map((reg) => ({ ...reg, source: reg.source ?? ("airtel" as const) }))
            .filter((reg) => !pendingIds.has(reg.id)),
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
        const normalized = cachedRegistrations.map((reg) => ({
          ...reg,
          source: reg.source ?? ("airtel" as const),
        }));
        let filtered = normalized;
        if (filter !== "all") {
          filtered = normalized.filter((reg) => reg.status === filter);
        }
        setAllRegistrations(filtered as Registration[]);
        setTotalCount(filtered.length);
        setIsLoading(false); // Show cached data immediately
      }

      // Airtel + Safaricom (same status filter)
      let customerQuery = supabase
        .from("customer_registrations")
        .select(
          "id, customer_name, preferred_package, installation_town, status, created_at, ms_forms_response_id, ms_forms_submitted_at"
        )
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        customerQuery = customerQuery.eq("status", filter);
      }

      let safaricomQuery = supabase
        .from("safaricom_registrations")
        .select(
          "id, customer_name, service_package, status, created_at, fiber_region_name, fiber_cluster_name, install_town, install_county"
        )
        .eq("agent_id", user.id)
        .order("created_at", { ascending: false });

      if (filter !== "all") {
        safaricomQuery = safaricomQuery.eq("status", filter);
      }

      const [{ data, error }, safRes] = await Promise.all([
        customerQuery,
        safaricomQuery,
      ]);

      if (error) {
        throw error;
      }

      const safData = safRes.error ? [] : safRes.data ?? [];
      if (safRes.error) {
        const m = String(safRes.error.message || "").toLowerCase();
        if (!m.includes("does not exist")) {
          console.warn("Safaricom registrations:", safRes.error);
        }
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
        source: "airtel" as const,
      }));

      // Enhance Airtel rows with sync status (cloud save = synced for agents)
      const enhancedRegistrations = (data || []).map((reg: any) =>
        mapCustomerRowToUnifiedList({
          ...reg,
          syncStatus: "synced" as const,
        })
      );

      const safUnified = safData.map((row: any) => mapSafaricomRowToUnifiedList(row));

      const allRegistrationsCombined = [
        ...pendingRegistrations,
        ...enhancedRegistrations.filter((reg) => !pendingIds.has(reg.id)),
        ...safUnified,
      ].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      // Cache: full Airtel + full Safaricom (unfiltered), merged
      const [{ data: allCustomer }, { data: allSaf }] = await Promise.all([
        supabase
          .from("customer_registrations")
          .select(
            "id, customer_name, preferred_package, installation_town, status, created_at, ms_forms_response_id, ms_forms_submitted_at"
          )
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("safaricom_registrations")
          .select(
            "id, customer_name, service_package, status, created_at, fiber_region_name, fiber_cluster_name, install_town, install_county"
          )
          .eq("agent_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (allCustomer) {
        const allEnhanced = allCustomer.map((reg: any) =>
          mapCustomerRowToUnifiedList({ ...reg, syncStatus: "synced" as const })
        );
        const safForCache = (allSaf ?? []).map((row: any) =>
          mapSafaricomRowToUnifiedList(row)
        );
        const allDataWithPending = [
          ...pendingRegistrations,
          ...allEnhanced.filter((reg) => !pendingIds.has(reg.id)),
          ...safForCache,
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
        const normalized = cachedRegistrations.map((reg) => ({
          ...reg,
          source: reg.source ?? ("airtel" as const),
        }));
        let filtered = normalized;
        if (filter !== "all") {
          filtered = normalized.filter((reg) => reg.status === filter);
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

  const getStatusColor = (status: string) =>
    REGISTRATION_STATUS_COLORS[status]?.text ?? "#999999";

  const getStatusBgColor = (status: string) =>
    REGISTRATION_STATUS_COLORS[status]?.bg ?? "#F5F5F5";

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
        <Text style={styles.headerTitle}>Registrations</Text>
      </View>

      {/* Search Bar and Filter */}
      <View style={styles.searchFilterContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, town, status…"
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
              {REGISTRATION_FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? "All"}
            </Text>
            <Text style={styles.filterDropdownArrow}>
              {showFilterDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showFilterDropdown && (
            <View style={styles.filterDropdownMenu}>
              {REGISTRATION_FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterDropdownItem,
                    filter === option.value && styles.filterDropdownItemActive,
                  ]}
                  onPress={() => {
                    setFilter(option.value);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterDropdownItemText,
                      filter === option.value && styles.filterDropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sortDropdownContainer}>
          <TouchableOpacity
            style={styles.filterDropdownButton}
            onPress={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowFilterDropdown(false);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterDropdownText}>
              {sortBy === "newest"
                ? "Newest"
                : sortBy === "oldest"
                  ? "Oldest"
                  : "Name"}
            </Text>
            <Text style={styles.filterDropdownArrow}>
              {showSortDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>
          {showSortDropdown ? (
            <View style={[styles.filterDropdownMenu, styles.sortDropdownMenu]}>
              {(
                [
                  { value: "newest", label: "Newest first" },
                  { value: "oldest", label: "Oldest first" },
                  { value: "name", label: "Customer name" },
                ] as const
              ).map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterDropdownItem,
                    sortBy === option.value && styles.filterDropdownItemActive,
                  ]}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterDropdownItemText,
                      sortBy === option.value && styles.filterDropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.carrierChipsRow}>
        {(
          [
            { value: "all", label: "All networks" },
            { value: "airtel", label: "Airtel" },
            { value: "safaricom", label: "Safaricom" },
          ] as const
        ).map((chip) => (
          <TouchableOpacity
            key={chip.value}
            style={[
              styles.carrierChip,
              carrierFilter === chip.value && styles.carrierChipActive,
            ]}
            onPress={() => setCarrierFilter(chip.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.carrierChipText,
                carrierFilter === chip.value && styles.carrierChipTextActive,
              ]}
            >
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getWamTabBarOffset(insets.bottom) },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={() => {
          setShowFilterDropdown(false);
          setShowSortDropdown(false);
        }}
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
                <TouchableOpacity
                  style={styles.cardHeader}
                  activeOpacity={0.7}
                  onPress={() => openRegistrationDetail(registration)}
                >
                  <View style={styles.customerHeaderRow}>
                    <View style={styles.headerLeftSection}>
                      <View style={styles.nameRow}>
                        <Text style={styles.registrationName}>
                          {registration.customer_name || "Customer"}
                        </Text>
                        {(registration.source ?? "airtel") === "safaricom" && (
                          <View style={styles.carrierChip}>
                            <Text style={styles.carrierChipText}>Safaricom</Text>
                          </View>
                        )}
                      </View>
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
                          {formatRegistrationStatusLabel(registration.status || "pending")}
                        </Text>
                      </View>
                      <Text style={styles.expandIcon}>›</Text>
                    </View>
                  </View>
                  <View style={styles.cardMetaRow}>
                    {registration.installation_town ? (
                      <Text style={styles.cardMetaText} numberOfLines={1}>
                        {registration.installation_town}
                      </Text>
                    ) : null}
                    <Text style={styles.cardMetaText}>
                      {new Date(registration.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
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
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    gap: 12,
  },
  sortDropdownContainer: {
    position: "relative",
    minWidth: 96,
  },
  sortDropdownMenu: {
    right: 0,
    left: "auto",
    minWidth: 150,
  },
  carrierChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  carrierChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  carrierChipActive: {
    backgroundColor: "#E6F2FF",
  },
  carrierChipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#666666",
  },
  carrierChipTextActive: {
    color: "#0066CC",
    fontFamily: "Inter_600SemiBold",
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  cardMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    flex: 1,
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
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  carrierChip: {
    backgroundColor: "rgba(0, 166, 81, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 166, 81, 0.35)",
  },
  carrierChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#00A651",
    letterSpacing: 0.2,
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
    flexShrink: 1,
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

