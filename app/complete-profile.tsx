import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  BackHandler,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../lib/supabase";
import {
  contactInfoSchema,
  type ContactInfoFormData,
} from "@/lib/validation/registerSchemas";
import ContactInfoStep from "@/components/register/ContactInfoStep";
import { registerStyles } from "@/components/register/styles";
import { deriveTownAreaFromPlace } from "@/lib/google-places/parseGooglePlace";
import type { SelectedGooglePlace } from "@/lib/google-places/types";
import {
  checkAgentPhonesTaken,
  phoneTakenUserMessage,
} from "@/lib/auth/agentPhoneCheck";
import { isAgentProfileIncomplete } from "@/lib/auth/agentProfileCompleteness";
import { waitForSession } from "@/lib/auth/googleAuth";
import {
  saveAgentDataToCache,
  type CachedAgentData,
} from "@/lib/cache/agentCache";
import { markWorkingPlaceReady } from "@/lib/google-places/workingPlaceGate";

export default function CompleteProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayEmail, setDisplayEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [ready, setReady] = useState(false);

  const contactInfoForm = useForm<ContactInfoFormData>({
    resolver: zodResolver(contactInfoSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      airtelPhone: "",
      safaricomPhone: "",
      workingPlace: undefined as unknown as SelectedGooglePlace,
    },
  });

  useFocusEffect(
    useCallback(() => {
      // Google's blank callback route can remain below this screen on Android.
      // Required onboarding must not expose it via the system back button.
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );
      return () => subscription.remove();
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await waitForSession(2500);
      const user = session?.user;
      if (cancelled) return;
      if (!user) {
        router.replace("/login" as any);
        return;
      }

      const meta = user.user_metadata ?? {};
      const name =
        String(meta.name ?? meta.full_name ?? meta.fullName ?? "").trim() ||
        "";
      setDisplayEmail(user.email ?? null);
      setDisplayName(name);
      // Show the form immediately — don't block on the agents lookup
      setReady(true);

      const { data: agent } = await supabase
        .from("agents")
        .select("airtel_phone, safaricom_phone, working_place")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (agent && !isAgentProfileIncomplete(agent)) {
        markWorkingPlaceReady(true);
        router.replace("/dashboard" as any);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onSubmit = async (data: ContactInfoFormData) => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        Alert.alert("Error", "Session expired. Please sign in again.");
        router.replace("/login" as any);
        return;
      }

      const taken = await checkAgentPhonesTaken({
        airtelPhone: data.airtelPhone,
        safaricomPhone: data.safaricomPhone,
        excludeAgentId: user.id,
      });
      if (taken.taken) {
        await supabase.auth.signOut();
        router.replace({
          pathname: "/login",
          params: {
            error: phoneTakenUserMessage(),
          },
        } as any);
        return;
      }

      const located = deriveTownAreaFromPlace(
        data.workingPlace as SelectedGooglePlace,
      );
      const meta = user.user_metadata ?? {};
      const name =
        displayName ||
        String(meta.name ?? meta.full_name ?? "").trim() ||
        (user.email?.split("@")[0] ?? "Agent");

      const row = {
        id: user.id,
        email: user.email,
        name,
        airtel_phone: data.airtelPhone.trim(),
        safaricom_phone: data.safaricomPhone.trim(),
        town: located.town,
        area: located.area,
        working_place: data.workingPlace,
        working_place_updated_at: new Date().toISOString(),
        status: "pending" as const,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      let saved;
      if (existing) {
        const { data: updated, error } = await supabase
          .from("agents")
          .update({
            name: row.name,
            airtel_phone: row.airtel_phone,
            safaricom_phone: row.safaricom_phone,
            town: row.town,
            area: row.area,
            working_place: row.working_place,
            working_place_updated_at: row.working_place_updated_at,
            updated_at: row.updated_at,
          })
          .eq("id", user.id)
          .select(
            "id, email, name, airtel_phone, safaricom_phone, town, area, status, created_at, updated_at, total_earnings, available_balance, working_place, working_place_updated_at",
          )
          .single();
        if (error) throw error;
        saved = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from("agents")
          .insert([
            {
              ...row,
              created_at: new Date().toISOString(),
            },
          ])
          .select(
            "id, email, name, airtel_phone, safaricom_phone, town, area, status, created_at, updated_at, total_earnings, available_balance, working_place, working_place_updated_at",
          )
          .single();
        if (error) throw error;
        saved = inserted;
      }

      await supabase.auth.updateUser({
        data: {
          name,
          airtel_phone: row.airtel_phone,
          safaricom_phone: row.safaricom_phone,
          town: row.town,
          area: row.area,
          working_place: row.working_place,
        },
      });

      const cached: CachedAgentData = {
        id: saved.id,
        email: saved.email,
        name: saved.name,
        airtel_phone: saved.airtel_phone,
        safaricom_phone: saved.safaricom_phone,
        town: saved.town,
        area: saved.area,
        status: saved.status,
        created_at: saved.created_at,
        updated_at: saved.updated_at,
        total_earnings: saved.total_earnings,
        available_balance: saved.available_balance,
        working_place: saved.working_place,
        working_place_updated_at: saved.working_place_updated_at,
      };
      await saveAgentDataToCache(cached);
      markWorkingPlaceReady(true);
      router.replace("/dashboard" as any);
    } catch (err: unknown) {
      Alert.alert(
        "Could not save",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready) {
    return <View style={[registerStyles.container, { backgroundColor: "#FFFFFF" }]} />;
  }

  return (
    <View style={[registerStyles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : insets.top}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[
            registerStyles.scrollContent,
            styles.scrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Add your phone numbers and working location.
            </Text>
          </View>

          <View style={styles.accountCard}>
            <View style={styles.gmailIconWrap}>
              <Image
                source={require("../assets/images/gmail-icon.webp")}
                style={styles.gmailIcon}
                contentFit="contain"
              />
            </View>
            <View style={styles.accountDetails}>
              <Text style={styles.accountLabel}>Signed in with Google</Text>
              {displayName ? (
                <Text style={styles.accountName} numberOfLines={1}>
                  {displayName}
                </Text>
              ) : null}
              <Text style={styles.accountEmail} numberOfLines={1}>
                {displayEmail ?? "Google account"}
              </Text>
            </View>
            <MaterialIcons name="verified" size={22} color="#137A45" />
          </View>

          <ContactInfoStep
            control={contactInfoForm.control}
            scrollViewRef={scrollViewRef}
          />

          <TouchableOpacity
            style={[
              registerStyles.nextButton,
              styles.continueButton,
              isSubmitting && registerStyles.nextButtonDisabled,
            ]}
            onPress={contactInfoForm.handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={registerStyles.nextButtonText}>
                  Complete setup
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchAccountButton}
            onPress={async () => {
              await supabase.auth.signOut();
              router.replace("/login" as any);
            }}
          >
            <Text style={styles.switchAccountText}>
              Use a different account
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 64,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: "#202124",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 28,
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "#68707A",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  gmailIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  gmailIcon: {
    width: 27,
    height: 27,
  },
  accountDetails: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  accountLabel: {
    color: "#68707A",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 2,
  },
  accountName: {
    color: "#202124",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  accountEmail: {
    color: "#4B5563",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 1,
  },
  continueButton: {
    flex: undefined,
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  switchAccountButton: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 6,
  },
  switchAccountText: {
    color: "#5F6368",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
