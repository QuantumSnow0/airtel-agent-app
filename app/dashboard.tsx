import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import { useEffect, useState } from "react";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    loadUserData();
    
    // Listen for auth state changes (logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.replace("/" as any);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // Get current user
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !currentUser) {
        // No user - redirect to login
        router.replace("/login" as any);
        return;
      }

      // Check if email is verified
      if (!currentUser.email_confirmed_at) {
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

      // Get agent data
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (agentError) {
        console.error("Error loading agent data:", agentError);
        // Agent record doesn't exist - treat as pending
        router.replace("/pending-approval" as any);
        return;
      }

      setAgentData(agent);

      // Check if agent is approved
      if (agent.status !== "approved") {
        // Not approved - redirect to pending approval
        router.replace("/pending-approval" as any);
        return;
      }
    } catch (error: any) {
      console.error("Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Error", error.message || "Failed to log out.");
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        return;
      }
      router.replace("/" as any);
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.name}>{agentData?.name || user?.email}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color="#333333" />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Agent Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Agent Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{agentData?.email || user?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Airtel Phone:</Text>
            <Text style={styles.infoValue}>{agentData?.airtel_phone || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Town:</Text>
            <Text style={styles.infoValue}>{agentData?.town || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Area:</Text>
            <Text style={styles.infoValue}>{agentData?.area || "N/A"}</Text>
          </View>
          <View style={[styles.statusBadge, styles.statusApproved]}>
            <Text style={styles.statusText}>Status: Approved ✓</Text>
          </View>
        </View>

        {/* Dashboard Content - Placeholder */}
        <View style={styles.contentPlaceholder}>
          <Text style={styles.placeholderText}>Dashboard</Text>
          <Text style={styles.placeholderSubtext}>
            Customer registration and other features will be available here.
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !isLoggingOut && setShowLogoutModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {/* Modal Icon */}
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🚪</Text>
            </View>

            {/* Modal Title */}
            <Text style={styles.modalTitle}>Logout</Text>

            {/* Modal Message */}
            <Text style={styles.modalMessage}>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </Text>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  logoutButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    flex: 1,
    textAlign: "right",
    letterSpacing: 0.2,
  },
  statusBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  statusApproved: {
    backgroundColor: "#E6F7E6",
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#2E7D32",
    letterSpacing: 0.2,
  },
  contentPlaceholder: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  placeholderText: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  placeholderSubtext: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 12,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  modalButtonCancel: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 12,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  modalButtonConfirm: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});

