import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) {
    return null;
  }

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Error", error.message || "Failed to log out. Please try again.");
        setIsLoggingOut(false);
        setShowLogoutModal(false);
        return;
      }
      // Navigate to welcome screen after successful logout
      router.replace("/" as any);
    } catch (error: any) {
      console.error("Logout error:", error);
      Alert.alert("Error", "Failed to log out. Please try again.");
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Pending Approval</Text>

        {/* Description */}
        <Text style={styles.description}>
          Your registration is pending admin approval.
        </Text>

        <Text style={styles.subDescription}>
          You will be notified once your account is approved. This usually takes
          24-48 hours.
        </Text>

        {/* Status Indicator */}
        <View style={styles.statusContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Awaiting Admin Review</Text>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator color="#333333" />
          ) : (
            <Text style={styles.logoutButtonText}>Logout</Text>
          )}
        </TouchableOpacity>
      </View>

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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 32,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  subDescription: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 32,
    letterSpacing: 0.2,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9E6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE066",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFA500",
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#CC8800",
    letterSpacing: 0.2,
  },
  buttonContainer: {
    paddingBottom: 40,
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
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

