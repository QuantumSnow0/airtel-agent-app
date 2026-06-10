import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { getCachedAgentData } from "../lib/cache/agentCache";
import {
  safaricomFiberLocationStepSchema,
  safaricomPortableDedicatedInstallStepSchema,
  safaricomRegistrationSchema,
  safaricomStep1Schema,
  SafaricomRegistrationFormData,
} from "../lib/validation/safaricomRegistrationSchemas";
import SafaricomCustomerInfoStep from "../components/safaricom-register/SafaricomCustomerInfoStep";
import SafaricomFiberLocationStep from "../components/safaricom-register/SafaricomFiberLocationStep";
import SafaricomPackageLocationStep from "../components/safaricom-register/SafaricomPackageLocationStep";
import SafaricomPortableDedicatedInstallStep from "../components/safaricom-register/SafaricomPortableDedicatedInstallStep";
import { insertSafaricomRegistration } from "../lib/services/safaricomRegistrationService";
import { isOnline } from "../lib/services/syncService";
import { initOfflineStorage } from "../lib/services/offlineStorage";

const SAF_GREEN = "#00A651";

export default function RegisterSafaricomCustomerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [agentData, setAgentData] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const {
    control,
    handleSubmit,
    getValues,
    setError,
    clearErrors,
    setValue,
  } =
    useForm<SafaricomRegistrationFormData>({
      // zod merge + refine output typing vs RHF Resolver inference
      resolver: zodResolver(safaricomRegistrationSchema) as any,
      mode: "onBlur",
      defaultValues: {
        // servicePackage intentionally omitted — no package selected until the agent taps one.
        fiberRegionName: "",
        fiberClusterName: "",
        fiberEstateId: "",
        fiberEstateName: "",
        installCounty: "",
        installTown: "",
        installLandmark: "",
        customerName: "",
        safaricomNumber: "",
        alternateNumber: "",
        email: "",
        identificationNumber: "",
        dateOfBirth: "",
      } as Partial<SafaricomRegistrationFormData>,
    });

  const step1Package = useWatch({ control, name: "servicePackage" });
  const step1Fiber = useWatch({ control, name: "fiberDealId" });
  const step1Portable = useWatch({ control, name: "portableDealId" });
  const step1Dedicated = useWatch({ control, name: "dedicatedWifiDealId" });
  const fiberRegion = useWatch({ control, name: "fiberRegionName" });
  const fiberCluster = useWatch({ control, name: "fiberClusterName" });
  const fiberEstateIdW = useWatch({ control, name: "fiberEstateId" });
  const fiberEstateNameW = useWatch({ control, name: "fiberEstateName" });
  const installCountyW = useWatch({ control, name: "installCounty" });
  const installTownW = useWatch({ control, name: "installTown" });
  const installLandmarkW = useWatch({ control, name: "installLandmark" });

  const isFiberPackage = step1Package === "home_business_fiber";
  const isPortableOrDedicated =
    step1Package === "safaricom_portable_5g" ||
    step1Package === "safaricom_dedicated_wifi";
  const hasInstallStep = isFiberPackage || isPortableOrDedicated;

  const wizardSteps = useMemo(() => {
    if (isFiberPackage) {
      return [
        { id: 1, title: "Package" },
        { id: 2, title: "Location" },
        { id: 3, title: "Customer" },
      ];
    }
    if (isPortableOrDedicated) {
      return [
        { id: 1, title: "Package" },
        { id: 2, title: "Installation" },
        { id: 3, title: "Customer" },
      ];
    }
    return [
      { id: 1, title: "Package" },
      { id: 2, title: "Customer" },
    ];
  }, [isFiberPackage, isPortableOrDedicated]);

  const step1Ready = useMemo(() => {
    return safaricomStep1Schema.safeParse({
      servicePackage: step1Package,
      fiberDealId: step1Fiber,
      portableDealId: step1Portable,
      dedicatedWifiDealId: step1Dedicated,
    }).success;
  }, [step1Package, step1Fiber, step1Portable, step1Dedicated]);

  const fiberLocationReady = useMemo(() => {
    return safaricomFiberLocationStepSchema.safeParse({
      fiberRegionName: fiberRegion,
      fiberClusterName: fiberCluster,
      fiberEstateId: fiberEstateIdW,
      fiberEstateName: fiberEstateNameW,
    }).success;
  }, [fiberRegion, fiberCluster, fiberEstateIdW, fiberEstateNameW]);

  const portableDedicatedInstallReady = useMemo(() => {
    return safaricomPortableDedicatedInstallStepSchema.safeParse({
      installCounty: installCountyW,
      installTown: installTownW,
      installLandmark: installLandmarkW,
    }).success;
  }, [installCountyW, installTownW, installLandmarkW]);

  useEffect(() => {
    initOfflineStorage();
    loadAgentData();
  }, []);

  const loadAgentData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        router.replace("/login" as any);
        return;
      }

      const online = await isOnline();

      if (!online) {
        const cachedAgentData = await getCachedAgentData();
        if (cachedAgentData) {
          if (cachedAgentData.status !== "approved") {
            setAgentData(cachedAgentData);
            setShowApprovalModal(true);
            return;
          }
          setAgentData(cachedAgentData);
          return;
        }
        setAgentData({
          id: user.id,
          name: "Agent",
          status: "approved",
          airtel_phone: "",
          safaricom_phone: "",
        });
        return;
      }

      const cachedAgentData = await getCachedAgentData();
      if (cachedAgentData) {
        if (cachedAgentData.status !== "approved") {
          setAgentData(cachedAgentData);
          setShowApprovalModal(true);
          return;
        }
        setAgentData(cachedAgentData);
      }

      const { data: agent, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !agent) {
        if (cachedAgentData) {
          return;
        }
        Alert.alert("Error", "Agent profile not found");
        router.back();
        return;
      }

      const { saveAgentDataToCache } = await import("../lib/cache/agentCache");
      await saveAgentDataToCache(agent);

      if (agent.status !== "approved") {
        setAgentData(agent);
        setShowApprovalModal(true);
        return;
      }

      setAgentData(agent);
    } catch (error) {
      console.error("Error loading agent data:", error);
      const cachedAgentData = await getCachedAgentData();
      if (cachedAgentData) {
        if (cachedAgentData.status !== "approved") {
          setAgentData(cachedAgentData);
          setShowApprovalModal(true);
          return;
        }
        setAgentData(cachedAgentData);
      } else {
        Alert.alert(
          "Error",
          "Failed to load agent data. Please check your connection."
        );
        router.back();
      }
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return {
          title: "Awaiting Approval",
          message:
            "Your account is currently pending approval from the administrator.",
          details:
            "Once your account is approved, you'll be able to register customers.",
          icon: "⏳",
        };
      case "banned":
        return {
          title: "Account Suspended",
          message:
            "Your account has been suspended and you cannot register customers at this time.",
          details:
            "Please contact support if you believe this is an error.",
          icon: "⚠️",
        };
      case "rejected":
        return {
          title: "Application Rejected",
          message: "Your agent application has been rejected.",
          details: "Please contact support for more information.",
          icon: "✗",
        };
      default:
        return {
          title: "Access Restricted",
          message: "Your account status does not allow customer registration.",
          details: "Please contact support for assistance.",
          icon: "🔒",
        };
    }
  };

  const onValidSubmit = async (data: SafaricomRegistrationFormData) => {
    if (!agentData?.id) {
      Alert.alert("Error", "Agent profile not loaded. Please try again.");
      return;
    }

    setIsSubmitting(true);
    Keyboard.dismiss();
    try {
      const online = await isOnline();
      if (!online) {
        Alert.alert(
          "No connection",
          "You need an internet connection to save this registration. Please try again when online."
        );
        return;
      }

      const { error } = await insertSafaricomRegistration(agentData.id, data);

      if (error) {
        console.error("Safaricom registration insert:", error);
        const missingRelation =
          error.code === "42P01" ||
          (typeof error.message === "string" &&
            error.message.toLowerCase().includes("does not exist"));
        const missingDateOfBirthColumn =
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("date_of_birth");
        const hint = missingRelation
          ? " Create the safaricom_registrations table in Supabase (run airtel-agent-app/SAFARICOM_REGISTRATIONS_SCHEMA.sql)."
          : missingDateOfBirthColumn
          ? " Add the missing date_of_birth column in Supabase (run airtel-agent-app/SAFARICOM_ADD_DATE_OF_BIRTH.sql)."
          : "";
        Alert.alert(
          "Could not save",
          (error.message || "Database error") + hint
        );
        return;
      }

      Alert.alert("Registration saved", "The Safaricom registration was saved successfully.", [
        { text: "OK", onPress: () => router.replace("/dashboard" as any) },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      Alert.alert("Could not save", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToStep1 = () => {
    clearErrors();
    setValue("fiberRegionName", "", { shouldValidate: false });
    setValue("fiberClusterName", "", { shouldValidate: false });
    setValue("fiberEstateId", "", { shouldValidate: false });
    setValue("fiberEstateName", "", { shouldValidate: false });
    setValue("installCounty", "", { shouldValidate: false });
    setValue("installTown", "", { shouldValidate: false });
    setValue("installLandmark", "", { shouldValidate: false });
    setCurrentStep(1);
  };

  const handleFooterContinue = async () => {
    if (currentStep === 1) {
      if (!step1Ready) {
        return;
      }
      const v = getValues();
      const parsed = safaricomStep1Schema.safeParse({
        servicePackage: v.servicePackage,
        fiberDealId: v.fiberDealId,
        portableDealId: v.portableDealId,
        dedicatedWifiDealId: v.dedicatedWifiDealId,
      });
      if (!parsed.success) {
        clearErrors();
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            setError(key as keyof SafaricomRegistrationFormData, {
              type: "manual",
              message: issue.message,
            });
          }
        }
        return;
      }
      clearErrors([
        "servicePackage",
        "fiberDealId",
        "portableDealId",
        "dedicatedWifiDealId",
        "fiberRegionName",
        "fiberClusterName",
        "fiberEstateId",
        "fiberEstateName",
        "installCounty",
        "installTown",
        "installLandmark",
      ]);
      Keyboard.dismiss();
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2 && isFiberPackage) {
      if (!fiberLocationReady) {
        return;
      }
      const loc = safaricomFiberLocationStepSchema.safeParse({
        fiberRegionName: getValues("fiberRegionName"),
        fiberClusterName: getValues("fiberClusterName"),
        fiberEstateId: getValues("fiberEstateId"),
        fiberEstateName: getValues("fiberEstateName"),
      });
      if (!loc.success) {
        clearErrors([
          "fiberRegionName",
          "fiberClusterName",
          "fiberEstateId",
          "fiberEstateName",
        ]);
        for (const issue of loc.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            setError(key as keyof SafaricomRegistrationFormData, {
              type: "manual",
              message: issue.message,
            });
          }
        }
        return;
      }
      clearErrors([
        "fiberRegionName",
        "fiberClusterName",
        "fiberEstateId",
        "fiberEstateName",
      ]);
      Keyboard.dismiss();
      setCurrentStep(3);
      return;
    }
    if (currentStep === 2 && isPortableOrDedicated) {
      if (!portableDedicatedInstallReady) {
        return;
      }
      const pd = safaricomPortableDedicatedInstallStepSchema.safeParse({
        installCounty: getValues("installCounty"),
        installTown: getValues("installTown"),
        installLandmark: getValues("installLandmark"),
      });
      if (!pd.success) {
        clearErrors(["installCounty", "installTown", "installLandmark"]);
        for (const issue of pd.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") {
            setError(key as keyof SafaricomRegistrationFormData, {
              type: "manual",
              message: issue.message,
            });
          }
        }
        return;
      }
      clearErrors(["installCounty", "installTown", "installLandmark"]);
      Keyboard.dismiss();
      setCurrentStep(3);
      return;
    }
    if (currentStep === 2 && !hasInstallStep) {
      handleSubmit(onValidSubmit)();
      return;
    }
    if (currentStep === 3) {
      handleSubmit(onValidSubmit)();
    }
  };

  const handleFooterBack = () => {
    if (currentStep === 3 && hasInstallStep) {
      clearErrors();
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      goToStep1();
      return;
    }
    router.back();
  };

  if (!fontsLoaded || (!agentData && !showApprovalModal)) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator size="large" color={SAF_GREEN} />
      </View>
    );
  }

  const statusInfo = agentData?.status
    ? getStatusMessage(agentData.status)
    : null;

  return (
    <>
      <Modal
        visible={showApprovalModal}
        transparent
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
                  <Text style={styles.modalDetailsText}>
                    {statusInfo.details}
                  </Text>
                </View>
                {agentData?.status === "pending" && (
                  <View style={styles.modalInfoBox}>
                    <Text style={styles.modalInfoText}>
                      Your application is under review. You will receive a
                      notification once your account is approved.
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
                    <Text style={styles.modalSupportNumber}>0700776994</Text>
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

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
          enabled
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerBack}
              activeOpacity={0.7}
            >
              <Text style={styles.headerBackIcon}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.headerBadgeRow}>
                <View style={styles.safBadge}>
                  <Text style={styles.safBadgeText}>Safaricom</Text>
                </View>
              </View>
              <Text style={styles.headerTitle}>Register customer</Text>
              <Text style={styles.headerSubtitle}>
                Step {currentStep} of {wizardSteps.length} ·{" "}
                {wizardSteps[currentStep - 1]?.title}
              </Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressRow}>
              {wizardSteps.map((step, index) => (
                <View key={step.id} style={styles.progressSegment}>
                  <View
                    style={[
                      styles.progressTrackInline,
                      index + 1 <= currentStep && styles.progressTrackActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.progressLabel,
                      index + 1 <= currentStep && styles.progressLabelActive,
                    ]}
                    numberOfLines={2}
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
            <View style={{ padding: 20 }}>
              {currentStep === 1 && (
                <SafaricomPackageLocationStep
                  control={control}
                  setValue={setValue}
                  clearErrors={clearErrors}
                />
              )}
              {currentStep === 2 && isFiberPackage && (
                <SafaricomFiberLocationStep
                  control={control}
                  setValue={setValue}
                  clearErrors={clearErrors}
                />
              )}
              {currentStep === 2 && isPortableOrDedicated && (
                <SafaricomPortableDedicatedInstallStep
                  control={control}
                  setValue={setValue}
                  clearErrors={clearErrors}
                />
              )}
              {currentStep === 2 && !hasInstallStep && (
                <SafaricomCustomerInfoStep control={control} />
              )}
              {currentStep === 3 && (
                <SafaricomCustomerInfoStep control={control} />
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TouchableOpacity
            style={styles.footerBack}
            onPress={handleFooterBack}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.footerBackText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.footerContinue,
              ((currentStep === 1 && !step1Ready) ||
                (currentStep === 2 &&
                  isFiberPackage &&
                  !fiberLocationReady) ||
                (currentStep === 2 &&
                  isPortableOrDedicated &&
                  !portableDedicatedInstallReady)) &&
                styles.footerContinueDisabled,
            ]}
            onPress={handleFooterContinue}
            disabled={
              isSubmitting ||
              (currentStep === 1 && !step1Ready) ||
              (currentStep === 2 &&
                isFiberPackage &&
                !fiberLocationReady) ||
              (currentStep === 2 &&
                isPortableOrDedicated &&
                !portableDedicatedInstallReady)
            }
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.footerContinueText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
  },
  safe: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
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
  },
  headerBack: {
    padding: 8,
    marginRight: 12,
  },
  headerBackIcon: {
    fontSize: 24,
    color: "#333333",
  },
  headerBadgeRow: {
    marginBottom: 4,
  },
  safBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 166, 81, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 166, 81, 0.35)",
  },
  safBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: SAF_GREEN,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#333333",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginTop: 2,
  },
  progressWrap: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  progressSegment: {
    flex: 1,
  },
  progressTrackInline: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8E8E8",
  },
  progressTrackActive: {
    backgroundColor: SAF_GREEN,
  },
  progressLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#999999",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 13,
  },
  progressLabelActive: {
    color: SAF_GREEN,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  footerBack: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  footerBackText: {
    fontFamily: "Inter_500Medium",
    color: "#666666",
    fontSize: 15,
  },
  footerContinue: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SAF_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  footerContinueDisabled: {
    opacity: 0.42,
  },
  footerContinueText: {
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    fontSize: 15,
    letterSpacing: 0.3,
  },
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
    backgroundColor: "#E8F5E9",
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
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: SAF_GREEN,
  },
  modalInfoText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#1B5E20",
    lineHeight: 20,
  },
  modalButton: {
    width: "100%",
    backgroundColor: SAF_GREEN,
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
    color: SAF_GREEN,
    textDecorationLine: "underline",
  },
});
