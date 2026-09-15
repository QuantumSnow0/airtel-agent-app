import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Keyboard,
  Pressable,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import {
  useForm,
  useWatch,
  Controller,
  type Control,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import {
  getCachedAgentData,
  saveAgentDataToCache,
} from "@/lib/cache/agentCache";
import {
  airtelConnectFirstRegistrationSchema,
  airtelConnectRegistrationSchema,
  type AirtelConnectEntryPath,
  type AirtelConnectFirstRegistrationFormData,
  type AirtelConnectRegistrationFormData,
} from "@/lib/validation/airtelConnectRegistrationSchemas";
import { MAX_UNITS_REQUIRED } from "@/lib/utils/customerRegistration";
import {
  fetchCommissionRates,
  getCachedCommissionRates,
  type AirtelCommissionRates,
} from "@/lib/services/commissionRatesService";
import {
  AirtelConnectHandoffModal,
  HANDOFF_LAUNCH_DISPLAY_MS,
  HANDOFF_SAVED_HOLD_MS,
  type HandoffModalPhase,
} from "./AirtelConnectHandoffModal";
import {
  buildSubmitPayload,
  createClientHandoffId,
  recordAirtelConnectHandoff,
  submitAirtelConnectRegistration,
} from "@/lib/services/airtelConnectRegistrationService";
import { openAirtelConnectOrPlayStore } from "@/lib/services/airtelConnectLauncher";
import { SUPPORT_PHONE, SUPPORT_PHONE_TEL } from "@/constants/legal";
import { scaleHeight } from "@/lib/utils/responsive";
import { AC, acStyles } from "./airtelConnectRegisterStyles";

type FormData = AirtelConnectFirstRegistrationFormData;

type SavedHandoff = {
  registrationId: string;
  clientHandoffId: string;
};

const EMPTY_FORM: FormData = {
  customerName: "",
  phoneNumber: "",
  email: "",
  preferredPackage: "premium",
  unitsRequired: 1,
  installationTown: "",
  landmark: "",
  airtelConnectOrderId: "",
};

function fieldError(
  name: FieldPath<FormData>,
  errors: Record<string, { message?: string } | undefined>,
  touched: Partial<Record<FieldPath<FormData>, boolean>>,
  submitCount: number,
): string | undefined {
  if (!touched[name] && submitCount === 0) return undefined;
  return errors[name]?.message;
}

function Field({
  control,
  name,
  label,
  placeholder,
  error,
  keyboardType,
  autoCapitalize,
  multiline,
  isLast,
  onFocusExtra,
}: {
  control: Control<FormData>;
  name: FieldPath<FormData>;
  label: string;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words";
  multiline?: boolean;
  isLast?: boolean;
  onFocusExtra?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[acStyles.field, isLast && acStyles.fieldLast]}>
      <Text style={acStyles.label}>{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <>
            <TextInput
              style={[
                acStyles.input,
                multiline && acStyles.inputMultiline,
                focused && !error && acStyles.inputFocused,
                error && acStyles.inputError,
              ]}
              placeholder={placeholder}
              placeholderTextColor={AC.inkFaint}
              value={typeof value === "string" ? value : String(value ?? "")}
              onChangeText={onChange}
              onBlur={() => {
                setFocused(false);
                onBlur();
              }}
              onFocus={() => {
                setFocused(true);
                onFocusExtra?.();
              }}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              multiline={multiline}
            />
            {error ? <Text style={acStyles.errorText}>{error}</Text> : null}
          </>
        )}
      />
    </View>
  );
}

function CommissionBar({
  control,
  rates,
}: {
  control: Control<FormData>;
  rates: AirtelCommissionRates;
}) {
  const [pkg, units] = useWatch({
    control,
    name: ["preferredPackage", "unitsRequired"],
  });
  const rate = pkg === "standard" ? rates.standard : rates.premium;
  const total = rate * (units ?? 1);

  return (
    <View style={acStyles.commissionBar}>
      <MaterialIcons name="payments" size={20} color={AC.success} />
      <Text style={acStyles.commissionText}>
        You earn{" "}
        <Text style={acStyles.commissionAmount}>
          KSh {total.toLocaleString()}
        </Text>{" "}
        once installed
      </Text>
    </View>
  );
}

export default function AirtelConnectRegisterScreen({
  entryPath = "wam_first",
  onChangePath,
}: {
  entryPath?: AirtelConnectEntryPath;
  onChangePath?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isConnectFirst = entryPath === "connect_first";
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [handoffPhase, setHandoffPhase] = useState<HandoffModalPhase>("hidden");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [pendingLaunch, setPendingLaunch] = useState(false);
  const [commissionRates, setCommissionRates] = useState<AirtelCommissionRates>(
    getCachedCommissionRates,
  );

  const savedHandoffRef = useRef<SavedHandoff | null>(null);
  const clientHandoffIdRef = useRef<string>(createClientHandoffId());
  const submitLockRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollViewportRef = useRef<View>(null);
  const scrollYRef = useRef(0);
  const townFieldRef = useRef<View>(null);
  const landmarkFieldRef = useRef<View>(null);
  const activeFieldRef = useRef<React.RefObject<View | null> | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, touchedFields, submitCount },
  } = useForm<FormData>({
    resolver: zodResolver(
      isConnectFirst
        ? airtelConnectFirstRegistrationSchema
        : airtelConnectRegistrationSchema,
    ),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: EMPTY_FORM,
  });

  const handoffBusy = handoffPhase !== "hidden";

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace("/login" as any);
        return;
      }

      let agent = await getCachedAgentData();
      if (!agent) {
        const { data, error } = await supabase
          .from("agents")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (error || !data) {
          Alert.alert("Error", "Could not load your agent profile.", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
        }
        await saveAgentDataToCache(data);
        agent = data;
      }

      if (agent?.status !== "approved") {
        Alert.alert(
          "Approval required",
          "Your account must be approved before registering customers.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }
      setAgentId(session.user.id);
      setLoadingAgent(false);
      fetchCommissionRates().then(setCommissionRates);
    })();
  }, [router]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      activeFieldRef.current = null;
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const revealActiveField = useCallback(() => {
    const field = activeFieldRef.current?.current;
    const viewport = scrollViewportRef.current;
    if (!field || !viewport) return;

    viewport.measureInWindow((_vx, viewportY, _vw, viewportHeight) => {
      field.measureInWindow((_fx, fieldY, _fw, fieldHeight) => {
        const margin = scaleHeight(16);
        const overlap =
          fieldY + fieldHeight + margin - (viewportY + viewportHeight);
        if (overlap > 1) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + overlap,
            animated: true,
          });
        }
      });
    });
  }, []);

  const launchAirtelConnect = useCallback(async (registrationId: string) => {
    setHandoffPhase("launching");
    setLaunchError(null);

    await new Promise((resolve) =>
      setTimeout(resolve, HANDOFF_LAUNCH_DISPLAY_MS),
    );

    try {
      const result = await openAirtelConnectOrPlayStore();
      void recordAirtelConnectHandoff(
        registrationId,
        result.launched ? "launched" : "play_store",
      );

      if (result.launched) {
        setHandoffPhase("hidden");
        setPendingLaunch(false);
        savedHandoffRef.current = null;
        clientHandoffIdRef.current = createClientHandoffId();
        submitLockRef.current = false;
        return;
      }

      setLaunchError(
        "Airtel Connect isn't installed. We opened the Play Store — install it, then tap Open Airtel Connect.",
      );
      setHandoffPhase("launch_error");
      setPendingLaunch(true);
      submitLockRef.current = false;
    } catch {
      void recordAirtelConnectHandoff(registrationId, "failed");
      setLaunchError(
        "Could not open Airtel Connect. Open it from your home screen to finish KYC.",
      );
      setHandoffPhase("launch_error");
      setPendingLaunch(true);
      submitLockRef.current = false;
    }
  }, []);

  const executeHandoff = useCallback(
    async (data: FormData) => {
      if (!agentId || submitLockRef.current) return;
      submitLockRef.current = true;
      setSaveError(null);
      setLaunchError(null);
      Keyboard.dismiss();

      const existing = savedHandoffRef.current;
      if (existing && !isConnectFirst) {
        await launchAirtelConnect(existing.registrationId);
        return;
      }

      setHandoffPhase("saving");

      try {
        const payload = buildSubmitPayload(
          data,
          clientHandoffIdRef.current,
          entryPath,
        );
        const result = await submitAirtelConnectRegistration(payload);

        if (!result.success) {
          setSaveError(result.error);
          setHandoffPhase("save_error");
          submitLockRef.current = false;
          return;
        }

        savedHandoffRef.current = {
          registrationId: result.registrationId,
          clientHandoffId: clientHandoffIdRef.current,
        };

        if (isConnectFirst) {
          setHandoffPhase("hidden");
          reset(EMPTY_FORM);
          clientHandoffIdRef.current = createClientHandoffId();
          savedHandoffRef.current = null;
          submitLockRef.current = false;
          Alert.alert(
            "Saved",
            "Customer details and Airtel Connect Order ID saved. You can review this under Registrations.",
            [{ text: "OK", onPress: () => router.back() }],
          );
          return;
        }

        setPendingLaunch(true);
        setHandoffPhase("saved");
        reset(EMPTY_FORM);

        await new Promise((resolve) =>
          setTimeout(resolve, HANDOFF_SAVED_HOLD_MS),
        );

        await launchAirtelConnect(result.registrationId);
      } catch (e) {
        setSaveError(
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        );
        setHandoffPhase("save_error");
        submitLockRef.current = false;
      }
    },
    [agentId, entryPath, isConnectFirst, launchAirtelConnect, reset, router],
  );

  const runHandoff = useCallback(
    async (data: FormData) => {
      if (!agentId || submitLockRef.current) return;

      const orderId = String(data.airtelConnectOrderId ?? "").trim();
      if (!isConnectFirst && !orderId) {
        Alert.alert(
          "Order ID missing",
          "Airtel Connect Order ID is needed for payment. You can save now and add it later under Registrations.",
          [
            { text: "Add Order ID", style: "cancel" },
            {
              text: "Save without it",
              onPress: () => {
                void executeHandoff(data);
              },
            },
          ],
        );
        return;
      }

      await executeHandoff(data);
    },
    [agentId, executeHandoff, isConnectFirst],
  );

  const handleRetryLaunch = useCallback(() => {
    const registrationId = savedHandoffRef.current?.registrationId;
    if (!registrationId || submitLockRef.current) return;
    submitLockRef.current = true;
    void launchAirtelConnect(registrationId);
  }, [launchAirtelConnect]);

  const handleDismissHandoffError = useCallback(() => {
    setHandoffPhase("hidden");
    submitLockRef.current = false;
  }, []);

  const ctaLabel = isConnectFirst
    ? "Save registration"
    : pendingLaunch
      ? "Open Airtel Connect"
      : "Save & open Airtel Connect";

  const ctaIcon = isConnectFirst
    ? "check"
    : pendingLaunch
      ? "open-in-new"
      : "arrow-forward";

  if (loadingAgent) {
    return (
      <View style={acStyles.loadingWrap}>
        <ActivityIndicator size="large" color={AC.red} />
        <Text style={acStyles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={acStyles.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={acStyles.header}>
        <TouchableOpacity
          onPress={() => (onChangePath ? onChangePath() : router.back())}
          style={acStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={AC.ink} />
        </TouchableOpacity>
        <View style={acStyles.headerText}>
          <Text style={acStyles.headerTitle}>Airtel registration</Text>
          <Text style={acStyles.headerSub}>
            {isConnectFirst
              ? "Finish in WAM after Airtel Connect"
              : "Save in WAM, complete KYC in Airtel Connect"}
          </Text>
        </View>
      </View>

      <View style={acStyles.flowStrip}>
        {isConnectFirst ? (
          <>
            <View style={[acStyles.flowChip, acStyles.flowChipActive]}>
              <View style={[acStyles.flowDot, acStyles.flowDotActive]} />
              <Text style={[acStyles.flowLabel, acStyles.flowLabelActive]}>
                Airtel Connect
              </Text>
            </View>
            <Text style={acStyles.flowArrow}>→</Text>
            <View style={acStyles.flowChip}>
              <View style={acStyles.flowDot} />
              <Text style={acStyles.flowLabel}>WAM Apps</Text>
            </View>
          </>
        ) : (
          <>
            <View style={[acStyles.flowChip, acStyles.flowChipActive]}>
              <View style={[acStyles.flowDot, acStyles.flowDotActive]} />
              <Text style={[acStyles.flowLabel, acStyles.flowLabelActive]}>
                WAM Apps
              </Text>
            </View>
            <Text style={acStyles.flowArrow}>→</Text>
            <View style={acStyles.flowChip}>
              <View style={acStyles.flowDot} />
              <Text style={acStyles.flowLabel}>Airtel Connect</Text>
            </View>
          </>
        )}
      </View>

      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <View
          ref={scrollViewportRef}
          collapsable={false}
          style={{ flex: 1 }}
          onLayout={() => setTimeout(revealActiveField, 60)}
        >
          <ScrollView
            ref={scrollRef}
            style={acStyles.scroll}
            contentContainerStyle={acStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              scrollYRef.current = e.nativeEvent.contentOffset.y;
            }}
          >
            <View style={acStyles.formCard}>
              <View style={acStyles.section}>
                <Text style={acStyles.sectionTitle}>Customer</Text>
                <Text style={acStyles.sectionHint}>
                  Contact details for the person signing up
                </Text>
                <Field
                  control={control}
                  name="customerName"
                  label="Full name"
                  placeholder="e.g. Jane Wanjiku"
                  error={fieldError(
                    "customerName",
                    errors,
                    touchedFields,
                    submitCount,
                  )}
                  autoCapitalize="words"
                />
                <Field
                  control={control}
                  name="phoneNumber"
                  label="Phone number"
                  placeholder="0712 345 678"
                  error={fieldError(
                    "phoneNumber",
                    errors,
                    touchedFields,
                    submitCount,
                  )}
                  keyboardType="phone-pad"
                />
                <Field
                  control={control}
                  name="email"
                  label="Email"
                  placeholder="customer@email.com"
                  error={fieldError(
                    "email",
                    errors,
                    touchedFields,
                    submitCount,
                  )}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  isLast
                />
              </View>

              <View style={[acStyles.section, acStyles.sectionBorder]}>
                <Text style={acStyles.sectionTitle}>Package</Text>
                <Text style={acStyles.sectionHint}>
                  Internet plan and number of devices
                </Text>

                <Controller
                  control={control}
                  name="preferredPackage"
                  render={({ field: { onChange, value } }) => (
                    <View style={acStyles.packageRow}>
                      {(["standard", "premium"] as const).map((pkg) => {
                        const selected = value === pkg;
                        const commission =
                          pkg === "standard"
                            ? commissionRates.standard
                            : commissionRates.premium;
                        return (
                          <Pressable
                            key={pkg}
                            onPress={() => onChange(pkg)}
                            style={[
                              acStyles.packageTile,
                              selected && acStyles.packageTileSelected,
                            ]}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                          >
                            {pkg === "premium" ? (
                              <View style={acStyles.popularTag}>
                                <Text style={acStyles.popularTagText}>
                                  Popular
                                </Text>
                              </View>
                            ) : null}
                            <Text style={acStyles.packageTileName}>{pkg}</Text>
                            <Text style={acStyles.packageTilePrice}>
                              {pkg === "standard"
                                ? "KSh 2,999/mo"
                                : "KSh 3,999/mo"}
                            </Text>
                            <Text style={acStyles.packageTileEarn}>
                              +KSh {commission.toLocaleString()}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                />

                <Text style={acStyles.label}>Devices</Text>
                <Controller
                  control={control}
                  name="unitsRequired"
                  render={({ field: { onChange, value } }) => {
                    const units = value ?? 1;
                    return (
                      <View style={acStyles.qtyRow}>
                        <TouchableOpacity
                          onPress={() => onChange(Math.max(1, units - 1))}
                          disabled={units <= 1}
                          style={[
                            acStyles.qtyBtn,
                            units <= 1 && acStyles.qtyBtnDisabled,
                          ]}
                          accessibilityLabel="Decrease"
                        >
                          <MaterialIcons
                            name="remove"
                            size={18}
                            color={AC.ink}
                          />
                        </TouchableOpacity>
                        <View style={acStyles.qtyCenter}>
                          <Text style={acStyles.qtyValue}>{units}</Text>
                          <Text style={acStyles.qtyUnit}>
                            {units === 1 ? "device" : "devices"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() =>
                            onChange(Math.min(MAX_UNITS_REQUIRED, units + 1))
                          }
                          disabled={units >= MAX_UNITS_REQUIRED}
                          style={[
                            acStyles.qtyBtn,
                            units >= MAX_UNITS_REQUIRED &&
                              acStyles.qtyBtnDisabled,
                          ]}
                          accessibilityLabel="Increase"
                        >
                          <MaterialIcons name="add" size={18} color={AC.ink} />
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />

                <CommissionBar control={control} rates={commissionRates} />
              </View>

              <View style={[acStyles.section, acStyles.sectionBorder]}>
                <Text style={acStyles.sectionTitle}>Installation</Text>
                <Text style={acStyles.sectionHint}>
                  Where the customer's home internet will be installed
                </Text>
                <View ref={townFieldRef} collapsable={false}>
                  <Field
                    control={control}
                    name="installationTown"
                    label="Installation town"
                    placeholder="e.g. Kiambu, Westlands, Ruiru…"
                    error={fieldError(
                      "installationTown",
                      errors,
                      touchedFields,
                      submitCount,
                    )}
                    autoCapitalize="words"
                    onFocusExtra={() => {
                      activeFieldRef.current = townFieldRef;
                      revealActiveField();
                    }}
                  />
                </View>
                <View ref={landmarkFieldRef} collapsable={false}>
                  <Field
                    control={control}
                    name="landmark"
                    label="Landmark"
                    placeholder="Near mall, school, shop…"
                    error={fieldError(
                      "landmark",
                      errors,
                      touchedFields,
                      submitCount,
                    )}
                    autoCapitalize="words"
                    multiline
                    isLast
                    onFocusExtra={() => {
                      activeFieldRef.current = landmarkFieldRef;
                      revealActiveField();
                    }}
                  />
                </View>
              </View>

              <View style={[acStyles.section, acStyles.sectionBorder]}>
                <Text style={acStyles.sectionTitle}>
                  Airtel Connect Order ID
                </Text>
                <Text style={acStyles.sectionHint}>
                  {isConnectFirst
                    ? "Required, order reference from Airtel Connect for payment"
                    : "Add now or later, needed for payment"}
                </Text>
                <View style={acStyles.noticeBox}>
                  <MaterialIcons
                    name="info-outline"
                    size={18}
                    color={AC.warn}
                  />
                  <Text style={acStyles.noticeText}>
                    {isConnectFirst
                      ? "Enter the same Order ID shown in Airtel Connect so ops can match this registration for payment."
                      : "After KYC in Airtel Connect, copy the Order ID here or add it under Registrations. Payment needs this reference."}
                  </Text>
                </View>
                <Field
                  control={control}
                  name="airtelConnectOrderId"
                  label={
                    isConnectFirst ? "Order ID" : "Order ID (optional for now)"
                  }
                  placeholder="e.g. AC-123456789"
                  error={fieldError(
                    "airtelConnectOrderId",
                    errors,
                    touchedFields,
                    submitCount,
                  )}
                  autoCapitalize="none"
                  isLast
                />
              </View>
            </View>
          </ScrollView>
        </View>

        <View
          style={[
            acStyles.footer,
            {
              paddingBottom:
                keyboardHeight > 0
                  ? scaleHeight(12)
                  : Math.max(insets.bottom, 12),
            },
          ]}
        >
          <Pressable
            onPress={() => {
              if (pendingLaunch && !isConnectFirst) {
                handleRetryLaunch();
                return;
              }
              void handleSubmit(runHandoff)();
            }}
            disabled={handoffBusy}
            style={[acStyles.saveBtn, handoffBusy && acStyles.saveBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <MaterialIcons
              name={ctaIcon as "check" | "open-in-new" | "arrow-forward"}
              size={18}
              color="#FFF"
            />
            <Text style={acStyles.saveBtnText}>{ctaLabel}</Text>
          </Pressable>
          {keyboardHeight === 0 ? (
            <Pressable
              onPress={() => void Linking.openURL(SUPPORT_PHONE_TEL)}
              style={{ paddingVertical: scaleHeight(10) }}
            >
              <Text style={acStyles.footerHelp}>
                Need help?{" "}
                <Text style={acStyles.footerHelpLink}>
                  Call {SUPPORT_PHONE}
                </Text>
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <AirtelConnectHandoffModal
        phase={handoffPhase}
        saveError={saveError}
        launchError={launchError}
        onRetryLaunch={handleRetryLaunch}
        onDismissError={handleDismissHandoffError}
      />
    </SafeAreaView>
  );
}
