import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  airtelLeadSubmitSchema,
  type AirtelLeadSubmitFormData,
} from "@/lib/validation/airtelConnectRegistrationSchemas";
import { MAX_UNITS_REQUIRED } from "@/lib/utils/customerRegistration";
import { submitAirtelInboundLead } from "@/lib/services/submitAirtelLeadService";
import {
  pickPackageFee,
  type LeadPackageFees,
} from "@/lib/commissions/leadInstallCommission";
import { fetchDispatchConfig } from "@/lib/services/leadDispatchService";
import { scaleHeight } from "@/lib/utils/responsive";
import { AC, acStyles } from "@/components/customer-register/airtelConnectRegisterStyles";
import { PlacesLocationSearch } from "@/components/PlacesLocationSearch";
import { PlaceMapPreview } from "@/components/PlaceMapPreview";
import type { SelectedGooglePlace } from "@/lib/google-places/types";
import {
  deriveTownAreaFromPlace,
  parseGooglePlace,
} from "@/lib/google-places/parseGooglePlace";
import { resolveOperationalAreaFromPlace } from "@/lib/google-places/operational-area-bounds";

function townFromLandmark(place: SelectedGooglePlace): string {
  return (
    resolveOperationalAreaFromPlace(place) ||
    deriveTownAreaFromPlace(place).town ||
    ""
  );
}

const VISIT_TIME_SLOTS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
  "6:00 PM",
];

const EMPTY_FORM: AirtelLeadSubmitFormData = {
  customerName: "",
  phoneNumber: "",
  email: "",
  preferredPackage: "premium",
  unitsRequired: 1,
  installationTown: "",
  googlePlace: null as unknown as SelectedGooglePlace,
  visitDate: "",
  visitTime: "",
};

function formatDisplayDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function parseDisplayDate(value: string): Date | null {
  const [month, day, year] = value.split("/").map(Number);
  if (!month || !day || !year) return null;
  const d = new Date(year, month - 1, day);
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function fieldError(
  name: FieldPath<AirtelLeadSubmitFormData>,
  errors: Record<string, { message?: string } | undefined>,
  touched: Partial<Record<FieldPath<AirtelLeadSubmitFormData>, boolean>>,
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
}: {
  control: Control<AirtelLeadSubmitFormData>;
  name: FieldPath<AirtelLeadSubmitFormData>;
  label: string;
  placeholder: string;
  error?: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words";
  multiline?: boolean;
  isLast?: boolean;
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
              onFocus={() => setFocused(true)}
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

export default function SubmitAirtelLeadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitterFees, setSubmitterFees] = useState<LeadPackageFees>({
    standard: 0,
    premium: 0,
  });
  const [placesMenuOpen, setPlacesMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const landmarkBlockRef = useRef<View>(null);

  const bringLandmarkIntoView = useCallback(() => {
    const node = landmarkBlockRef.current;
    const scroll = scrollRef.current;
    if (!node || !scroll) return;
    // Pin the landmark near the top of the visible scroll area so the
    // dropdown below it sits above the keyboard (footer is hidden while open).
    setTimeout(() => {
      node.measureInWindow((_x, y) => {
        scroll.measureInWindow((_sx, scrollY) => {
          const desiredTop = scrollY + scaleHeight(16);
          const delta = y - desiredTop;
          if (Math.abs(delta) < 12) return;
          scroll.scrollTo({
            y: Math.max(0, scrollOffsetRef.current + delta),
            animated: true,
          });
        });
      });
    }, Platform.OS === "ios" ? 80 : 160);
  }, []);

  const handlePlacesMenuOpenChange = useCallback(
    (open: boolean) => {
      setPlacesMenuOpen(open);
      if (open) bringLandmarkIntoView();
    },
    [bringLandmarkIntoView],
  );

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, touchedFields, submitCount },
  } = useForm<AirtelLeadSubmitFormData>({
    resolver: zodResolver(airtelLeadSubmitSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: EMPTY_FORM,
  });

  const visitDate = useWatch({ control, name: "visitDate" });
  const visitTime = useWatch({ control, name: "visitTime" });
  const preferredPackage = useWatch({ control, name: "preferredPackage" });
  const submitterEarnKes = pickPackageFee(submitterFees, preferredPackage);

  useEffect(() => {
    void fetchDispatchConfig().then((cfg) => {
      setSubmitterFees(cfg.submitterFees);
    });
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onSubmit = useCallback(
    async (data: AirtelLeadSubmitFormData) => {
      if (submitting) return;
      setSubmitting(true);
      Keyboard.dismiss();
      try {
        const result = await submitAirtelInboundLead(data);
        if (!result.success) {
          Alert.alert(
            result.duplicate ? "Lead already exists" : "Could not submit",
            result.error,
          );
          return;
        }

        const dispatchNote =
          result.dispatch?.outcome === "offered"
            ? "Offered to a nearby agent."
            : result.dispatch?.outcome === "admin_queue"
              ? "Queued for admin — no agent in range yet."
              : "Submitted for dispatch.";

        Alert.alert("Lead submitted", dispatchNote, [
          { text: "OK", onPress: () => router.replace("/leads" as any) },
        ]);
      } finally {
        setSubmitting(false);
      }
    },
    [router, submitting],
  );

  return (
    <SafeAreaView style={acStyles.root} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      <View style={acStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={acStyles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons name="arrow-back" size={20} color={AC.ink} />
        </TouchableOpacity>
        <View style={acStyles.headerText}>
          <Text style={acStyles.headerTitle}>Submit Airtel lead</Text>
          <Text style={acStyles.headerSub}>
            Customer interest only — no install or Connect
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
        <ScrollView
          ref={scrollRef}
          style={acStyles.scroll}
          contentContainerStyle={[
            acStyles.scrollContent,
            placesMenuOpen || keyboardHeight > 0
              ? { paddingBottom: scaleHeight(280) }
              : null,
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <View style={[acStyles.formCard, { overflow: "visible" }]}>
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
                error={fieldError("email", errors, touchedFields, submitCount)}
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
                          {(() => {
                            const pkgEarn = pickPackageFee(submitterFees, pkg);
                            return pkgEarn > 0 ? (
                              <Text style={acStyles.packageTileEarn}>
                                +KSh {pkgEarn.toLocaleString()}
                              </Text>
                            ) : null;
                          })()}
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
                        <MaterialIcons name="remove" size={18} color={AC.ink} />
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

              {submitterEarnKes > 0 ? (
                <View style={acStyles.commissionBar}>
                  <MaterialIcons name="payments" size={20} color={AC.success} />
                  <Text style={acStyles.commissionText}>
                    You earn{" "}
                    <Text style={acStyles.commissionAmount}>
                      KSh {submitterEarnKes.toLocaleString()}
                    </Text>{" "}
                    when this lead is installed
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                acStyles.section,
                acStyles.sectionBorder,
                { zIndex: 40, overflow: "visible" },
              ]}
            >
              <View
                ref={landmarkBlockRef}
                collapsable={false}
                style={[acStyles.field, { marginBottom: 0, zIndex: 30 }]}
              >
                <Text style={acStyles.label}>Installation landmark</Text>
                <Controller
                  control={control}
                  name="googlePlace"
                  render={({ field: { onChange, value } }) => {
                    const selected =
                      parseGooglePlace(value) ??
                      (value as SelectedGooglePlace | null) ??
                      null;
                    return (
                      <View>
                        <PlacesLocationSearch
                          selected={selected}
                          onSelect={(place) => {
                            onChange(place);
                            if (place) {
                              const town = townFromLandmark(place);
                              setValue("installationTown", town, {
                                shouldValidate: true,
                                shouldTouch: true,
                              });
                            } else {
                              setValue("installationTown", "", {
                                shouldValidate: true,
                              });
                            }
                          }}
                          onMenuOpenChange={handlePlacesMenuOpenChange}
                          onFocusSearch={bringLandmarkIntoView}
                          error={fieldError(
                            "googlePlace",
                            errors,
                            touchedFields,
                            submitCount,
                          )}
                          placeholder="Search a shop, church, or building"
                        />
                        {selected ? (
                          <View style={{ marginTop: 12 }}>
                            <PlaceMapPreview
                              lat={selected.lat}
                              lng={selected.lng}
                              label={selected.name}
                              embedded
                              height={scaleHeight(140)}
                            />
                          </View>
                        ) : null}
                      </View>
                    );
                  }}
                />
              </View>
            </View>

            <View style={[acStyles.section, acStyles.sectionBorder]}>
              <Text style={acStyles.sectionTitle}>Preferred visit</Text>
              <Text style={acStyles.sectionHint}>
                When the customer would like installation
              </Text>

              <View style={acStyles.field}>
                <Text style={acStyles.label}>Visit date</Text>
                <TouchableOpacity
                  style={[
                    acStyles.input,
                    fieldError(
                      "visitDate",
                      errors,
                      touchedFields,
                      submitCount,
                    ) && acStyles.inputError,
                    { justifyContent: "center" },
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: visitDate ? AC.ink : AC.inkFaint,
                    }}
                  >
                    {visitDate || "Select visit date"}
                  </Text>
                </TouchableOpacity>
                {fieldError("visitDate", errors, touchedFields, submitCount) ? (
                  <Text style={acStyles.errorText}>
                    {fieldError("visitDate", errors, touchedFields, submitCount)}
                  </Text>
                ) : null}
              </View>

              <View style={[acStyles.field, acStyles.fieldLast]}>
                <Text style={acStyles.label}>Visit time</Text>
                <TouchableOpacity
                  style={[
                    acStyles.input,
                    fieldError(
                      "visitTime",
                      errors,
                      touchedFields,
                      submitCount,
                    ) && acStyles.inputError,
                    { justifyContent: "center" },
                  ]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text
                    style={{
                      fontFamily: "Inter_400Regular",
                      fontSize: 15,
                      color: visitTime ? AC.ink : AC.inkFaint,
                    }}
                  >
                    {visitTime || "Select visit time"}
                  </Text>
                </TouchableOpacity>
                {fieldError("visitTime", errors, touchedFields, submitCount) ? (
                  <Text style={acStyles.errorText}>
                    {fieldError("visitTime", errors, touchedFields, submitCount)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>

        {keyboardHeight === 0 && !placesMenuOpen ? (
          <View
            style={[
              acStyles.footer,
              {
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              style={[acStyles.saveBtn, submitting && acStyles.saveBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Submit lead"
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#FFF" />
                  <Text style={acStyles.saveBtnText}>Submit lead</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </View>

      {showDatePicker && Platform.OS === "android" ? (
        <DateTimePicker
          value={parseDisplayDate(visitDate) ?? new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(_event, date) => {
            setShowDatePicker(false);
            if (date) {
              setValue("visitDate", formatDisplayDate(date), {
                shouldValidate: true,
                shouldTouch: true,
              });
            }
          }}
        />
      ) : null}

      <Modal
        visible={showDatePicker && Platform.OS === "ios"}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: AC.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <TouchableOpacity
              onPress={() => setShowDatePicker(false)}
              style={{ alignSelf: "flex-end", padding: 16 }}
            >
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  color: AC.red,
                  fontSize: 15,
                }}
              >
                Done
              </Text>
            </TouchableOpacity>
            <DateTimePicker
              value={parseDisplayDate(visitDate) ?? new Date()}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={(_event, date) => {
                if (date) {
                  setValue("visitDate", formatDisplayDate(date), {
                    shouldValidate: true,
                    shouldTouch: true,
                  });
                }
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: AC.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "60%",
              paddingBottom: Math.max(insets.bottom, 20),
            }}
          >
            <Text
              style={{
                fontFamily: "Poppins_600SemiBold",
                fontSize: 18,
                color: AC.ink,
                marginBottom: 16,
              }}
            >
              Select visit time
            </Text>
            <ScrollView>
              {VISIT_TIME_SLOTS.map((time) => {
                const selected = visitTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 14,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: selected ? AC.redSoft : AC.canvas,
                      borderWidth: selected ? 1 : 0,
                      borderColor: AC.red,
                    }}
                    onPress={() => {
                      setValue("visitTime", time, {
                        shouldValidate: true,
                        shouldTouch: true,
                      });
                      setShowTimePicker(false);
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: selected
                          ? "Poppins_600SemiBold"
                          : "Inter_400Regular",
                        fontSize: 16,
                        color: selected ? AC.redDark : AC.ink,
                      }}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setShowTimePicker(false)}
              style={{ paddingVertical: 12, alignItems: "center" }}
            >
              <Text
                style={{
                  fontFamily: "Inter_500Medium",
                  color: AC.inkMuted,
                  fontSize: 15,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
