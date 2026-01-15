import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Modal,
  StyleSheet,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
  getCardPadding,
} from "../lib/utils/responsive";
import {
  customerRegistrationSchema,
  CustomerRegistrationFormData,
} from "../lib/validation/customerRegistrationSchemas";
import CustomerInfoStep from "../components/customer-register/CustomerInfoStep";
import InstallationDetailsStep from "../components/customer-register/InstallationDetailsStep";
import VisitDetailsStep from "../components/customer-register/VisitDetailsStep";
import { registerStyles } from "../components/register/styles";
import {
  registerCustomerToMSForms,
  CustomerRegistrationData,
} from "../lib/services/msFormsService";
import { formatDateForMSForms } from "../lib/utils/customerRegistration";
import {
  savePendingRegistration,
  initOfflineStorage,
  getPendingCount,
} from "../lib/services/offlineStorage";
import { isOnline, syncPendingRegistrations } from "../lib/services/syncService";
import { getCachedAgentData } from "../lib/cache/agentCache";

const STEPS = [
  { id: 1, title: "Customer Information" },
  { id: 2, title: "Installation Details" },
  { id: 3, title: "Visit Details" },
];

export default function RegisterCustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentData, setAgentData] = useState<any>(null);
  const [selectedTown, setSelectedTown] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
    watch,
  } = useForm<CustomerRegistrationFormData>({
    resolver: zodResolver(customerRegistrationSchema),
    mode: "onBlur",
    defaultValues: {
      customerName: "",
      airtelNumber: "",
      alternateNumber: "",
      email: "",
      preferredPackage: "premium",
      installationTown: "",
      deliveryLandmark: "",
      installationLocation: "",
      visitDate: "",
      visitTime: "",
    },
  });

  const watchedTown = watch("installationTown");

  useEffect(() => {
    if (watchedTown) {
      setSelectedTown(watchedTown);
    }
  }, [watchedTown]);

  useEffect(() => {
    loadAgentData();
    initOfflineStorage();
    checkOnlineStatus();
    loadPendingCount();
    
    // Check online status periodically
    const interval = setInterval(() => {
      checkOnlineStatus();
      loadPendingCount();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkOnlineStatus = async () => {
    const online = await isOnline();
    setIsOffline(!online);
  };

  const loadPendingCount = async () => {
    if (agentData?.id) {
      const count = await getPendingCount(agentData.id);
      setPendingCount(count);
    }
  };

  const loadAgentData = async () => {
    try {
      // Use getSession() which works offline
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

      // If offline, try to load from cache first
      if (!online) {
        console.log("📴 Offline - loading agent data from cache");
        const cachedAgentData = await getCachedAgentData();
        if (cachedAgentData) {
          if (cachedAgentData.status !== "approved") {
            setAgentData(cachedAgentData); // Store agent data to show status in modal
            setShowApprovalModal(true);
            return;
          }
          setAgentData(cachedAgentData);
          return;
        } else {
          // No cache available - allow form to work with minimal agent data
          console.log("⚠️ No cached agent data available, but allowing offline registration");
          // Set minimal agent data to allow form submission
          // The form will work, and agent info will be minimal but sufficient for offline storage
          setAgentData({
            id: user.id,
            name: "Agent",
            status: "approved", // Allow registration in offline mode
            airtel_phone: "",
            safaricom_phone: "",
          });
          // Don't show alert - just allow the form to work silently
          return;
        }
      }

      // Online - Try to load from cache first (for fast display)
      const cachedAgentData = await getCachedAgentData();
      if (cachedAgentData) {
        if (cachedAgentData.status !== "approved") {
          setAgentData(cachedAgentData);
          setShowApprovalModal(true);
          return;
        }
        setAgentData(cachedAgentData);
      }

      // Fetch fresh agent data from database
      const { data: agent, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !agent) {
        // If we have cached data, use it
        if (cachedAgentData) {
          console.warn("⚠️ Failed to fetch fresh agent data, using cache");
          return;
        }
        Alert.alert("Error", "Agent profile not found");
        router.back();
        return;
      }

      // Save to cache
      const { saveAgentDataToCache } = await import("../lib/cache/agentCache");
      await saveAgentDataToCache(agent);

      if (agent.status !== "approved") {
        setAgentData(agent); // Store agent data to show status in modal
        setShowApprovalModal(true);
        return;
      }

      setAgentData(agent);
    } catch (error: any) {
      console.error("Error loading agent data:", error);
      // Try to load from cache on error
      const cachedAgentData = await getCachedAgentData();
      if (cachedAgentData) {
        console.log("✅ Using cached agent data after error");
        if (cachedAgentData.status !== "approved") {
          setAgentData(cachedAgentData);
          setShowApprovalModal(true);
          return;
        }
        setAgentData(cachedAgentData);
      } else {
        Alert.alert("Error", "Failed to load agent data. Please check your connection.");
        router.back();
      }
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof CustomerRegistrationFormData)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = [
        "customerName",
        "airtelNumber",
        "alternateNumber",
        "email",
        "preferredPackage",
      ];
    } else if (currentStep === 2) {
      fieldsToValidate = [
        "installationTown",
        "deliveryLandmark",
        "installationLocation",
      ];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: CustomerRegistrationFormData) => {
    if (!agentData) {
      Alert.alert("Error", "Agent data not loaded");
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();

    try {
      // Prepare customer data for MS Forms
      const customerData: CustomerRegistrationData = {
        customerName: data.customerName,
        airtelNumber: data.airtelNumber,
        alternateNumber: data.alternateNumber,
        email: data.email,
        preferredPackage: data.preferredPackage,
        installationTown: data.installationTown,
        deliveryLandmark: data.deliveryLandmark,
        installationLocation: data.installationLocation,
        visitDate: data.visitDate,
        visitTime: data.visitTime,
      };

      // Prepare agent data (with fallback for offline mode)
      const agentInfo = {
        name: agentData.name || "Agent",
        mobile: agentData.airtel_phone || agentData.safaricom_phone || "",
      };

      // Check if online
      let online = await isOnline();
      setIsOffline(!online);

      let dbRegistration: any = null;

      if (online) {
        // Step 1: Try to save to database first
        try {
          const { data: registration, error: dbError } = await supabase
            .from("customer_registrations")
            .insert({
              agent_id: agentData.id,
              customer_name: data.customerName,
              airtel_number: data.airtelNumber,
              alternate_number: data.alternateNumber,
              email: data.email,
              preferred_package: data.preferredPackage,
              installation_town: data.installationTown,
              delivery_landmark: data.deliveryLandmark,
              installation_location: data.installationLocation,
              visit_date: data.visitDate,
              visit_time: data.visitTime,
              status: "pending",
            })
            .select()
            .single();

          if (dbError) {
            throw dbError;
          }

          dbRegistration = registration;
        } catch (dbError: any) {
          console.warn("⚠️ Database save failed, saving offline:", dbError);
          // Fall through to offline save
          online = false;
        }
      }

      // If offline or database save failed, save to offline storage
      if (!online || !dbRegistration) {
        const pendingId = await savePendingRegistration(
          agentData.id,
          customerData,
          agentInfo
        );
        await loadPendingCount();

        Alert.alert(
          "Registration Saved Offline",
          "Your registration has been saved and will be synced automatically when you're back online.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/dashboard" as any),
            },
          ]
        );
        return;
      }

      // Step 2: Submit to Microsoft Forms
      let msFormsResult;
      try {
        console.log("=== MS Forms Submission Start ===");
        console.log("Customer Data:", JSON.stringify(customerData, null, 2));
        console.log("Agent Info:", JSON.stringify(agentInfo, null, 2));

        msFormsResult = await registerCustomerToMSForms(
          customerData,
          agentInfo
        );

        console.log("=== MS Forms Submission Result ===");
        console.log("Success:", msFormsResult.success);
        console.log("Response ID:", msFormsResult.responseId);
        console.log("Submit Date:", msFormsResult.submitDate);
        console.log("Responder:", msFormsResult.responder);
        console.log("Error:", msFormsResult.error);
        console.log("Full Response:", JSON.stringify(msFormsResult, null, 2));

        if (msFormsResult.success && msFormsResult.responseId) {
          console.log(
            "✅ MS Forms submission successful! Response ID:",
            msFormsResult.responseId
          );
          // Update database with MS Forms response ID
          const { error: updateError } = await supabase
            .from("customer_registrations")
            .update({
              ms_forms_response_id: msFormsResult.responseId,
              ms_forms_submitted_at: new Date().toISOString(),
            })
            .eq("id", dbRegistration.id);

          if (updateError) {
            console.error("Error updating MS Forms response ID:", updateError);
          } else {
            console.log("✅ Database updated with MS Forms response ID");
          }
        } else {
          console.warn("⚠️ MS Forms submission returned success=false");
          console.warn("Error message:", msFormsResult.error);
        }
      } catch (msFormsError: any) {
        console.error("=== MS Forms Submission Error ===");
        console.error("Error Type:", msFormsError?.constructor?.name);
        console.error("Error Message:", msFormsError?.message);
        console.error("Error Stack:", msFormsError?.stack);
        console.error("Full Error:", JSON.stringify(msFormsError, null, 2));

        // Registration is saved in database, but MS Forms submission failed
        // This is okay - we can retry later
        Alert.alert(
          "Registration Saved",
          "Customer registration has been saved, but submission to Microsoft Forms failed. It will be retried automatically.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/dashboard" as any),
            },
          ]
        );
        return;
      }

      // Success!
      Alert.alert("Success!", "Customer registered successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/dashboard" as any),
        },
      ]);
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert(
        "Registration Failed",
        error.message || "Failed to register customer. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return {
          title: "Awaiting Approval",
          message: "Your account is currently pending approval from the administrator.",
          details: "Once your account is approved, you'll be able to register customers and start earning commissions.",
          icon: "⏳",
        };
      case "banned":
        return {
          title: "Account Suspended",
          message: "Your account has been suspended and you cannot register customers at this time.",
          details: "Please contact support if you believe this is an error or if you have questions about your account status.",
          icon: "⚠️",
        };
      case "rejected":
        return {
          title: "Application Rejected",
          message: "Your agent application has been rejected.",
          details: "Please contact support for more information or to appeal this decision.",
          icon: "✗",
        };
      default:
        return {
          title: "Access Restricted",
          message: "Your account status does not allow customer registration.",
          details: "Please contact support for assistance with your account.",
          icon: "🔒",
        };
    }
  };

  if (!fontsLoaded || (!agentData && !showApprovalModal)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F5F7FA",
        }}
      >
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const statusInfo = agentData?.status ? getStatusMessage(agentData.status) : null;

  return (
    <>
      {/* Approval Status Modal */}
      <Modal
        visible={showApprovalModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowApprovalModal(false);
          router.back();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {statusInfo && (
              <>
                <View style={styles.modalIconContainer}>
                  <Text style={styles.modalIcon}>{statusInfo.icon}</Text>
                </View>
                <Text style={styles.modalTitle}>{statusInfo.title}</Text>
                <Text style={styles.modalMessage}>{statusInfo.message}</Text>
                <View style={styles.modalDetailsContainer}>
                  <Text style={styles.modalDetailsLabel}>What this means:</Text>
                  <Text style={styles.modalDetailsText}>{statusInfo.details}</Text>
                </View>
                {agentData?.status === "pending" && (
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoText}>
                      💡 Your application is under review. You'll receive a notification once your account is approved.
                    </Text>
                  </View>
                )}
                <View style={styles.modalSupportContainer}>
                  <Text style={styles.modalSupportLabel}>Need help?</Text>
                  <TouchableOpacity
                    onPress={async () => {
                      const phoneNumber = "0700776994";
                      const url = `tel:${phoneNumber}`;
                      const canOpen = await Linking.canOpenURL(url);
                      if (canOpen) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert("Support", `Call: ${phoneNumber}`);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalSupportNumber}>📞 0700776994</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setShowApprovalModal(false);
                    router.back();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F5F7FA" }}
        edges={["top", "bottom"]}
      >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        enabled={true}
      >
        {/* Header with Back Button */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingTop: 12,
            paddingBottom: 12,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: "#F0F0F0",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              padding: 8,
              marginRight: 12,
            }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontFamily: "Poppins_700Bold",
                color: "#333333",
              }}
            >
              Register Customer
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Inter_400Regular",
                color: "#999999",
                marginTop: 2,
              }}
            >
              Step {currentStep} of {STEPS.length}
            </Text>
          </View>
        </View>

        {/* Progress Indicator */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderBottomWidth: 1,
            borderBottomColor: "#F0F0F0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            {STEPS.map((step, index) => (
              <View key={step.id} style={{ flex: 1 }}>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor:
                      index + 1 <= currentStep ? "#0066CC" : "#E8E8E8",
                  }}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Inter_500Medium",
                    color: index + 1 <= currentStep ? "#0066CC" : "#999999",
                    marginTop: 6,
                    textAlign: "center",
                  }}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 200 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form Content */}
          <View style={{ padding: 20 }}>
            {currentStep === 1 && <CustomerInfoStep control={control} />}
            {currentStep === 2 && (
              <InstallationDetailsStep
                control={control}
                selectedTown={selectedTown}
                onTownChange={setSelectedTown}
              />
            )}
            {currentStep === 3 && <VisitDetailsStep control={control} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Navigation Buttons */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: "row",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 12),
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F0F0F0",
          gap: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5,
        }}
      >
        {currentStep > 1 && (
          <TouchableOpacity
            style={{
              paddingVertical: 12,
              paddingHorizontal: 20,
              borderRadius: 10,
              backgroundColor: "#F8F9FA",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 80,
            }}
            onPress={handleBack}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontFamily: "Inter_500Medium",
                color: "#666666",
                fontSize: 15,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}
        {currentStep < STEPS.length ? (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: "#0066CC",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#0066CC",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleNext}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                color: "#FFFFFF",
                fontSize: 15,
                letterSpacing: 0.3,
              }}
            >
              Next →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: "#0066CC",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              shadowColor: "#0066CC",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
            }}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Poppins_600SemiBold",
                    color: "#FFFFFF",
                    fontSize: 15,
                    letterSpacing: 0.3,
                  }}
                >
                  Submitting...
                </Text>
              </>
            ) : (
              <Text
                style={{
                  fontFamily: "Poppins_600SemiBold",
                  color: "#FFFFFF",
                  fontSize: 15,
                  letterSpacing: 0.3,
                }}
              >
                Submit
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF4E6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalDetailsContainer: {
    width: "100%",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalDetailsLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#333333",
    marginBottom: 8,
  },
  modalDetailsText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    lineHeight: 20,
  },
  modalInfoBox: {
    width: "100%",
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  modalInfoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#1976D2",
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: "#0066CC",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
  },
  modalSupportContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  modalSupportLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: 8,
  },
  modalSupportNumber: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#0066CC",
    textDecorationLine: "underline",
  },
});
