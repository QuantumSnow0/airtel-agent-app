import { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  personalInfoSchema,
  contactInfoSchema,
  PersonalInfoFormData,
  ContactInfoFormData,
} from "@/lib/validation/registerSchemas";
import PersonalInfoStep from "@/components/register/PersonalInfoStep";
import ContactInfoStep from "@/components/register/ContactInfoStep";
import TownPickerModal from "@/components/register/TownPickerModal";
import { registerStyles } from "@/components/register/styles";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTownPicker, setShowTownPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Store form data across steps
  const [formData, setFormData] = useState<{
    personalInfo?: PersonalInfoFormData;
    contactInfo?: ContactInfoFormData;
  }>({});

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // Initialize forms - must be before early return
  const personalInfoForm = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const contactInfoForm = useForm<ContactInfoFormData>({
    resolver: zodResolver(contactInfoSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      airtelPhone: "",
      safaricomPhone: "",
      town: "",
      area: "",
    },
  });

  // Reset scroll position when step changes - MUST be before early return
  useEffect(() => {
    if (fontsLoaded) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [currentStep, fontsLoaded]);

  // Handle keyboard show/hide - removed auto-scroll to prevent content going out of view
  // Individual inputs will handle their own scrolling via onFocus
  useEffect(() => {
    if (!fontsLoaded) return;

    // Just listen for keyboard hide to ensure proper cleanup
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Keyboard closed - no action needed
      }
    );

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [fontsLoaded]);

  // Early return MUST be after all hooks
  if (!fontsLoaded) {
    return null;
  }

  const onPersonalInfoSubmit = async (data: PersonalInfoFormData) => {
    // Check if email already exists before proceeding to step 2
    setIsCheckingEmail(true);

    try {
      // Try to sign in with a dummy password to check if email exists
      // For already verified emails, Supabase may return "Invalid login credentials"
      // which doesn't distinguish between wrong email vs wrong password.
      // However, if we get "Email not confirmed" or "Invalid password",
      // we know the email exists.
      const { error, data: signInData } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: "dummy_check_password_12345!@#$%",
        });

      // Check the error message to determine if email exists
      if (error) {
        const errorMsg = error.message.toLowerCase();
        console.log("Email check error:", errorMsg);

        // If we get "Email not confirmed", the email definitely exists (just not verified)
        // If we get "Invalid password", the email exists (password is wrong)
        if (
          errorMsg.includes("email not confirmed") ||
          errorMsg.includes("invalid password")
        ) {
          // Email exists - redirect to login with email prefilled
          setIsCheckingEmail(false);
          router.push({
            pathname: "/login",
            params: {
              email: data.email,
              error:
                "This email is already registered. Please sign in instead.",
            },
          } as any);
          return;
        }

        // If error is "Invalid login credentials", Supabase doesn't distinguish
        // between wrong email vs wrong password for security reasons.
        // However, for already verified emails, we need to check differently.
        // Let's check if we can get the user to see if email_confirmed_at exists.
        // Actually, we can't do that without proper auth.
        // So we'll proceed and let step 2 handle it with actual signup.
      } else if (signInData?.user) {
        // Sign in succeeded (shouldn't happen with dummy password, but if it does, email exists)
        setIsCheckingEmail(false);

        // Check if email is already verified
        if (signInData.user.email_confirmed_at) {
          router.replace({
            pathname: "/login",
            params: {
              email: data.email,
              error:
                "This email is already registered and verified. Please sign in instead.",
            },
          } as any);
        } else {
          router.replace({
            pathname: "/login",
            params: {
              email: data.email,
              error:
                "This email is already registered. Please sign in instead.",
            },
          } as any);
        }

        // Note: We don't sign out here - when user signs in, it will replace the session
        // Signing out would trigger the auth listener and redirect to welcome page
        return;
      }
    } catch (err: any) {
      console.error("Error checking email:", err);
      // If there's an unexpected error, continue with registration
      // Let Supabase handle duplicate check at signup time
    }

    setIsCheckingEmail(false);
    setFormData((prev) => ({ ...prev, personalInfo: data }));
    setCurrentStep(2);
    // Reset scroll position when moving to next step
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, 100);
  };

  const onPersonalInfoError = (errors: any) => {
    // Scroll to first error field if needed
    console.log("Validation errors:", errors);
  };

  const onContactInfoError = (errors: any) => {
    console.log("Validation errors:", errors);
  };

  const onContactInfoSubmit = async (data: ContactInfoFormData) => {
    setIsSubmitting(true);

    try {
      const allFormData = { ...formData.personalInfo, ...data };

      if (!formData.personalInfo) {
        Alert.alert("Error", "Please complete all steps");
        setIsSubmitting(false);
        return;
      }

      // 1. Sign up with Supabase Auth using OTP flow
      // This sends an OTP code via email instead of a confirmation link
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.personalInfo.email,
        password: formData.personalInfo.password,
        options: {
          // Request OTP instead of confirmation link
          emailRedirectTo: "airtelagentsapp://verify-email",
          // Store additional user metadata
          data: {
            name: formData.personalInfo.name,
            airtel_phone: data.airtelPhone,
            safaricom_phone: data.safaricomPhone,
            town: data.town,
            area: data.area,
          },
        },
      });

      if (authError) {
        const errorMsg = authError.message.toLowerCase();
        // Check for "already registered" or similar errors
        if (
          errorMsg.includes("already registered") ||
          errorMsg.includes("user already registered") ||
          errorMsg.includes("email already registered") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("user already exists")
        ) {
          // Redirect to login with email prefilled and error message
          router.push({
            pathname: "/login",
            params: {
              email: formData.personalInfo.email,
              error:
                "This email is already registered. Please sign in instead.",
            },
          } as any);
        } else {
          Alert.alert("Registration Error", authError.message);
        }
        setIsSubmitting(false);
        return;
      }

      if (!authData?.user) {
        Alert.alert("Error", "Failed to create account. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Check if email already exists by checking the identities array
      // If identities array is empty, it means the email is already registered
      // This is a reliable way to detect existing emails regardless of password
      if (authData.user.identities && authData.user.identities.length === 0) {
        console.log("Email already registered - identities array is empty");

        // Redirect to login page with email prefilled and error message
        // Note: We don't sign out here - when user signs in, it will replace the session
        // Signing out would trigger the auth listener and redirect to welcome page
        router.replace({
          pathname: "/login",
          params: {
            email: formData.personalInfo.email,
            error: "This email is already registered. Please sign in instead.",
          },
        } as any);

        setIsSubmitting(false);
        return;
      }

      // Check if email is already confirmed (already verified)
      if (authData.user.email_confirmed_at) {
        console.log(
          "SignUp returned user with email_confirmed_at - already verified"
        );
        // Redirect to login page with email prefilled and error message
        router.push({
          pathname: "/login",
          params: {
            email: formData.personalInfo.email,
            error:
              "This email is already registered and verified. Please sign in instead.",
          },
        } as any);
        setIsSubmitting(false);
        return;
      }

      // 2. Agent profile will be created automatically by database trigger
      // AFTER email verification (OTP confirmation) - see DELAYED_AGENT_PROFILE_CREATION.sql
      // The user metadata (name, phone numbers, town, area) is stored in raw_user_meta_data
      // and will be used by the trigger to create the profile after OTP verification

      // 3. Note: Don't request OTP here - signUp already sent an email
      // The verify-email screen will handle requesting OTP if needed
      // This avoids rate limiting issues (60 second cooldown)

      // 4. Store email and password in AsyncStorage for verification screen (in case user navigates via deep link)
      // This ensures email and password are available even when navigating from email link
      await AsyncStorage.setItem(
        "pendingVerificationEmail",
        formData.personalInfo.email
      );
      await AsyncStorage.setItem(
        "pendingVerificationPassword",
        formData.personalInfo.password
      );

      // 5. Navigate to email verification screen with email and password
      // Password is needed to sign in after email verification
      router.push({
        pathname: "/verify-email",
        params: {
          email: formData.personalInfo.email,
          password: formData.personalInfo.password, // Pass password to sign in after verification
        },
      } as any);
    } catch (error: any) {
      console.error("Registration error:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to register. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      router.back();
    } else {
      setCurrentStep(currentStep - 1);
      // Reset scroll position when going back
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    }
  };

  const handleSelectTown = (town: string) => {
    contactInfoForm.setValue("town", town);
  };

  return (
    <View style={registerStyles.container}>
      <KeyboardAvoidingView
        style={[registerStyles.keyboardView, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={registerStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          alwaysBounceVertical={false}
          scrollEnabled={true}
        >
          {/* Header */}
          <View style={registerStyles.header}>
            <Text style={registerStyles.stepIndicator}>
              Step {currentStep} of 2
            </Text>
            <Text style={registerStyles.title}>
              {currentStep === 1
                ? "Agent Information"
                : "Contact & Location Information"}
            </Text>
          </View>

          {/* Step 1: Agent Information */}
          {currentStep === 1 && (
            <PersonalInfoStep
              control={personalInfoForm.control}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              onToggleConfirmPassword={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              scrollViewRef={scrollViewRef}
            />
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <ContactInfoStep
              control={contactInfoForm.control}
              scrollViewRef={
                scrollViewRef as React.RefObject<ScrollView | null>
              }
              onOpenTownPicker={() => {
                Keyboard.dismiss();
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                  setShowTownPicker(true);
                }, 100);
              }}
            />
          )}

          {/* Town Picker Modal */}
          <TownPickerModal
            visible={showTownPicker}
            selectedTown={contactInfoForm.watch("town")}
            onClose={() => setShowTownPicker(false)}
            onSelectTown={handleSelectTown}
          />

          {/* Navigation Buttons */}
          <View style={registerStyles.buttonContainer}>
            <TouchableOpacity
              style={registerStyles.backButton}
              onPress={handleBack}
            >
              <Text style={registerStyles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                registerStyles.nextButton,
                isSubmitting && registerStyles.nextButtonDisabled,
              ]}
              onPress={
                currentStep === 1
                  ? personalInfoForm.handleSubmit(
                      onPersonalInfoSubmit,
                      onPersonalInfoError
                    )
                  : contactInfoForm.handleSubmit(
                      onContactInfoSubmit,
                      onContactInfoError
                    )
              }
              disabled={isSubmitting || isCheckingEmail}
            >
              {isSubmitting || isCheckingEmail ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={registerStyles.nextButtonText}>
                  {currentStep === 2 ? "Register" : "Next"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
