import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../lib/supabase";
import {
  editProfileSchema,
  type EditProfileFormData,
} from "../lib/validation/registerSchemas";
import TownPickerModal from "../components/register/TownPickerModal";
import { registerStyles } from "../components/register/styles";
import {
  saveAgentDataToCache,
  type CachedAgentData,
} from "../lib/cache/agentCache";
import {
  scaleFont,
  scaleHeight,
  scaleWidth,
} from "../lib/utils/responsive";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTownPicker, setShowTownPicker] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);

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
    setValue,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<EditProfileFormData>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: "",
      airtelPhone: "",
      safaricomPhone: "",
      town: "",
      area: "",
    },
  });

  const loadAgent = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login" as any);
        return;
      }

      const { data: agent, error } = await supabase
        .from("agents")
        .select(
          "id, email, name, airtel_phone, safaricom_phone, town, area, status, created_at, updated_at, total_earnings, available_balance"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error || !agent) {
        Alert.alert("Error", error?.message ?? "Could not load profile");
        router.back();
        return;
      }

      setAgentId(agent.id);
      reset({
        name: agent.name ?? "",
        airtelPhone: agent.airtel_phone ?? "",
        safaricomPhone: agent.safaricom_phone ?? "",
        town: agent.town ?? "",
        area: agent.area ?? "",
      });
    } finally {
      setLoading(false);
    }
  }, [reset, router]);

  useEffect(() => {
    void loadAgent();
  }, [loadAgent]);

  const onSave = async (data: EditProfileFormData) => {
    if (!agentId) return;
    setSaving(true);
    try {
      const { data: updated, error } = await supabase
        .from("agents")
        .update({
          name: data.name.trim(),
          airtel_phone: data.airtelPhone.trim(),
          safaricom_phone: data.safaricomPhone.trim(),
          town: data.town.trim(),
          area: data.area.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId)
        .select(
          "id, email, name, airtel_phone, safaricom_phone, town, area, status, created_at, updated_at, total_earnings, available_balance"
        )
        .single();

      if (error || !updated) {
        throw new Error(error?.message ?? "Could not save profile");
      }

      const cached: CachedAgentData = {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        airtel_phone: updated.airtel_phone,
        safaricom_phone: updated.safaricom_phone,
        town: updated.town,
        area: updated.area,
        status: updated.status,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        total_earnings: updated.total_earnings,
        available_balance: updated.available_balance,
      };
      await saveAgentDataToCache(cached);

      Alert.alert("Profile updated", "Your details were saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert(
        "Could not save",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0066CC" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text style={styles.hint}>
              Update your name, phones, and location. Email cannot be changed
              here.
            </Text>

            <View style={registerStyles.form}>
              <View style={registerStyles.fieldContainer}>
                <Text style={registerStyles.label}>Full name</Text>
                <Controller
                  control={control}
                  name="name"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[
                          registerStyles.input,
                          error && registerStyles.inputError,
                        ]}
                        placeholder="Your full name"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                      {error ? (
                        <Text style={registerStyles.errorText}>
                          {error.message}
                        </Text>
                      ) : null}
                    </>
                  )}
                />
              </View>

              <View style={registerStyles.fieldContainer}>
                <Text style={registerStyles.label}>Primary phone</Text>
                <Controller
                  control={control}
                  name="airtelPhone"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[
                          registerStyles.input,
                          error && registerStyles.inputError,
                        ]}
                        placeholder="Primary number"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        maxLength={16}
                      />
                      {error ? (
                        <Text style={registerStyles.errorText}>
                          {error.message}
                        </Text>
                      ) : null}
                    </>
                  )}
                />
              </View>

              <View style={registerStyles.fieldContainer}>
                <Text style={registerStyles.label}>Safaricom phone</Text>
                <Controller
                  control={control}
                  name="safaricomPhone"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[
                          registerStyles.input,
                          error && registerStyles.inputError,
                        ]}
                        placeholder="Safaricom number"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="phone-pad"
                        maxLength={16}
                      />
                      {error ? (
                        <Text style={registerStyles.errorText}>
                          {error.message}
                        </Text>
                      ) : null}
                    </>
                  )}
                />
              </View>

              <View style={registerStyles.fieldContainer}>
                <Text style={registerStyles.label}>Town</Text>
                <Controller
                  control={control}
                  name="town"
                  render={({ field: { value }, fieldState: { error } }) => (
                    <>
                      <TouchableOpacity
                        style={[
                          registerStyles.input,
                          registerStyles.dropdownButton,
                          error && registerStyles.inputError,
                        ]}
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowTownPicker(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            registerStyles.dropdownText,
                            !value && registerStyles.dropdownPlaceholder,
                          ]}
                        >
                          {value || "Select town"}
                        </Text>
                        <Text style={registerStyles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>
                      {error ? (
                        <Text style={registerStyles.errorText}>
                          {error.message}
                        </Text>
                      ) : null}
                    </>
                  )}
                />
              </View>

              <View style={registerStyles.fieldContainer}>
                <Text style={registerStyles.label}>Area</Text>
                <Controller
                  control={control}
                  name="area"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[
                          registerStyles.input,
                          error && registerStyles.inputError,
                        ]}
                        placeholder="Enter area"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                      />
                      {error ? (
                        <Text style={registerStyles.errorText}>
                          {error.message}
                        </Text>
                      ) : null}
                    </>
                  )}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveBtn,
                (saving || !isDirty) && styles.saveBtnDisabled,
              ]}
              onPress={handleSubmit(onSave)}
              disabled={saving || !isDirty}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <TownPickerModal
        visible={showTownPicker}
        selectedTown={watch("town")}
        onClose={() => setShowTownPicker(false)}
        onSelectTown={(town) => {
          setValue("town", town, { shouldDirty: true, shouldValidate: true });
          setShowTownPicker(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backBtn: { padding: scaleWidth(8) },
  backBtnText: { fontSize: scaleFont(24), color: "#0066CC" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: scaleFont(18),
    fontFamily: "Poppins_600SemiBold",
    color: "#1A1A1A",
  },
  headerSpacer: { width: scaleWidth(40) },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrollContent: {
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(20),
  },
  hint: {
    fontSize: scaleFont(13),
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: scaleHeight(20),
    lineHeight: scaleFont(18),
  },
  saveBtn: {
    marginTop: scaleHeight(24),
    backgroundColor: "#0066CC",
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(14),
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: scaleFont(15),
    color: "#FFFFFF",
  },
});
