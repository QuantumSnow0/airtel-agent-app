import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

// Step 1: Agent Information Schema
const personalInfoSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Step 2: Contact & Location Information Schema
const contactInfoSchema = z.object({
  airtelPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
  safaricomPhone: z
    .string()
    .min(10, "Phone number must be at least 10 characters")
    .regex(
      /^\+?[0-9]+$/,
      "Phone number must contain only digits, optionally starting with +"
    ),
  town: z.string().min(1, "Please select a town"),
  area: z.string().min(1, "Please enter a location"),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
type ContactInfoFormData = z.infer<typeof contactInfoSchema>;

// Kenyan towns list
const KENYAN_TOWNS = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Nakuru",
  "Eldoret",
  "Thika",
  "Malindi",
  "Kitale",
  "Garissa",
  "Kakamega",
  "Nyeri",
  "Meru",
  "Machakos",
  "Embu",
  "Kericho",
  "Bungoma",
  "Busia",
  "Homa Bay",
  "Kisii",
  "Bomet",
  "Chuka",
  "Isiolo",
  "Iten",
  "Kabarnet",
  "Kapenguria",
  "Kapsabet",
  "Kerugoya",
  "Kilifi",
  "Kitengela",
  "Kitui",
  "Lodwar",
  "Luanda",
  "Mandera",
  "Maralal",
  "Marsabit",
  "Maua",
  "Migori",
  "Murang'a",
  "Naivasha",
  "Nanyuki",
  "Narok",
  "Nyahururu",
  "Nyamira",
  "Ruiru",
  "Siaya",
  "Voi",
  "Wajir",
  "Webuye",
  "Wote",
  "Olkalou",
  "Magumu",
  "Mwea",
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get("window");
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTownPicker, setShowTownPicker] = useState(false);
  const [townSearchQuery, setTownSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Calculate modal height dynamically
  const modalHeight = screenHeight * 0.85;
  // Calculate list container height (modal height - header ~100px - search ~70px)
  const modalListHeight = modalHeight - 170;

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
  // Use useMemo to ensure stable references in production builds
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

  // Handle keyboard show/hide to adjust scroll position - MUST be before early return
  useEffect(() => {
    if (!fontsLoaded) return; // Early exit if fonts not loaded, but hook is still called

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setTimeout(
          () => {
            // Scroll to end to show buttons when keyboard opens
            scrollViewRef.current?.scrollToEnd({ animated: true });
          },
          Platform.OS === "ios" ? 250 : 100
        );
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // Don't reset scroll position when keyboard closes
        // This allows users to scroll and access all fields even when keyboard is dismissed
        // The scroll position should remain where the user left it
      }
    );

    return () => {
      keyboardDidShowListener.remove();
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

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={[styles.keyboardView, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          bounces={true}
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={true}
          alwaysBounceVertical={false}
          scrollEnabled={true}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.stepIndicator}>Step {currentStep} of 2</Text>
            <Text style={styles.title}>
              {currentStep === 1
                ? "Agent Information"
                : "Contact & Location Information"}
            </Text>
          </View>

          {/* Step 1: Agent Information */}
          {currentStep === 1 && (
            <View style={styles.form}>
              {/* Name Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Full Name</Text>
                <Controller
                  control={personalInfoForm.control}
                  name="name"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="Enter your full name"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="words"
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>

              {/* Email Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Email Address</Text>
                <Controller
                  control={personalInfoForm.control}
                  name="email"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="Enter your email address"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>

              {/* Password Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <Controller
                    control={personalInfoForm.control}
                    name="password"
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            styles.passwordInput,
                            error && styles.inputError,
                          ]}
                          placeholder="Create a password"
                          placeholderTextColor="#999999"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        {error && (
                          <Text style={styles.errorText}>{error.message}</Text>
                        )}
                      </>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Text style={styles.eyeButtonText}>
                      {showPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <Controller
                    control={personalInfoForm.control}
                    name="confirmPassword"
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <>
                        <TextInput
                          style={[
                            styles.input,
                            styles.passwordInput,
                            error && styles.inputError,
                          ]}
                          placeholder="Confirm your password"
                          placeholderTextColor="#999999"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                        {error && (
                          <Text style={styles.errorText}>{error.message}</Text>
                        )}
                      </>
                    )}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Text style={styles.eyeButtonText}>
                      {showConfirmPassword ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 2: Contact Information */}
          {currentStep === 2 && (
            <View style={styles.form}>
              {/* Airtel Phone Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Airtel Phone Number</Text>
                <Controller
                  control={contactInfoForm.control}
                  name="airtelPhone"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="Enter your Airtel number"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => {
                          // Scroll to show this field when focused
                          setTimeout(
                            () => {
                              scrollViewRef.current?.scrollToEnd({
                                animated: true,
                              });
                            },
                            Platform.OS === "ios" ? 300 : 200
                          );
                        }}
                        keyboardType="phone-pad"
                        maxLength={16}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>

              {/* Safaricom Phone Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Safaricom Phone Number</Text>
                <Controller
                  control={contactInfoForm.control}
                  name="safaricomPhone"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="Enter your Safaricom number"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => {
                          // Scroll to show this field when focused
                          setTimeout(
                            () => {
                              scrollViewRef.current?.scrollToEnd({
                                animated: true,
                              });
                            },
                            Platform.OS === "ios" ? 300 : 200
                          );
                        }}
                        keyboardType="phone-pad"
                        maxLength={16}
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>

              {/* Town Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Town</Text>
                <Controller
                  control={contactInfoForm.control}
                  name="town"
                  render={({
                    field: { onChange, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          styles.dropdownButton,
                          error && styles.inputError,
                        ]}
                        onPress={() => {
                          // Dismiss keyboard before opening modal
                          Keyboard.dismiss();
                          // Ensure we can see the field before opening modal
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({
                              animated: true,
                            });
                            setShowTownPicker(true);
                          }, 100);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownText,
                            !value && styles.dropdownPlaceholder,
                          ]}
                        >
                          {value || "Select town"}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>

              {/* Location Field */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Location</Text>
                <Controller
                  control={contactInfoForm.control}
                  name="area"
                  render={({
                    field: { onChange, onBlur, value },
                    fieldState: { error },
                  }) => (
                    <>
                      <TextInput
                        style={[styles.input, error && styles.inputError]}
                        placeholder="Enter location"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => {
                          // Scroll to show this field when focused
                          setTimeout(
                            () => {
                              scrollViewRef.current?.scrollToEnd({
                                animated: true,
                              });
                            },
                            Platform.OS === "ios" ? 300 : 200
                          );
                        }}
                        autoCapitalize="words"
                      />
                      {error && (
                        <Text style={styles.errorText}>{error.message}</Text>
                      )}
                    </>
                  )}
                />
              </View>
            </View>
          )}

          {/* Town Picker Modal */}
          <Modal
            visible={showTownPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
              setShowTownPicker(false);
              setTownSearchQuery("");
            }}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setShowTownPicker(false);
                setTownSearchQuery("");
              }}
            >
              <View
                style={[styles.modalContent, { height: modalHeight }]}
                onStartShouldSetResponder={() => true}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={styles.modalIconContainer}>
                      <Text style={styles.modalIcon}>📍</Text>
                    </View>
                    <View>
                      <Text style={styles.modalTitle}>Select Town</Text>
                      <Text style={styles.modalSubtitle}>
                        Choose your location
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowTownPicker(false);
                      setTownSearchQuery("");
                    }}
                    style={styles.modalCloseButton}
                    activeOpacity={0.7}
                  >
                    <View style={styles.modalCloseButtonInner}>
                      <Text style={styles.modalCloseText}>✕</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.modalSearchContainer}>
                  <View style={styles.modalSearchBox}>
                    <Text style={styles.modalSearchIcon}>🔍</Text>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Search towns..."
                      placeholderTextColor="#999999"
                      value={townSearchQuery}
                      onChangeText={setTownSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {townSearchQuery.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setTownSearchQuery("")}
                        style={styles.modalSearchClear}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.modalSearchClearText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Town List */}
                <View
                  style={[
                    styles.modalListContainer,
                    { height: modalListHeight },
                  ]}
                >
                  <FlatList
                    data={KENYAN_TOWNS.filter((town) =>
                      town.toLowerCase().includes(townSearchQuery.toLowerCase())
                    )}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => {
                      const isSelected = contactInfoForm.watch("town") === item;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.modalItem,
                            isSelected && styles.modalItemSelected,
                          ]}
                          onPress={() => {
                            contactInfoForm.setValue("town", item);
                            Keyboard.dismiss();
                            setShowTownPicker(false);
                            setTownSearchQuery("");
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.modalItemText,
                              isSelected && styles.modalItemTextSelected,
                            ]}
                          >
                            {item}
                          </Text>
                          {isSelected && (
                            <View style={styles.modalItemCheck}>
                              <Text style={styles.modalItemCheckText}>✓</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    style={styles.modalList}
                    contentContainerStyle={styles.modalListContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <View style={styles.modalEmpty}>
                        <Text style={styles.modalEmptyIcon}>🔍</Text>
                        <Text style={styles.modalEmptyText}>
                          No towns found matching "{townSearchQuery}"
                        </Text>
                        <TouchableOpacity
                          onPress={() => setTownSearchQuery("")}
                          style={styles.modalEmptyButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.modalEmptyButtonText}>
                            Clear search
                          </Text>
                        </TouchableOpacity>
                      </View>
                    }
                  />
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.nextButton,
                isSubmitting && styles.nextButtonDisabled,
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
                <Text style={styles.nextButtonText}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 300, // Increased padding to ensure all fields are accessible even without keyboard
  },
  header: {
    marginBottom: 32,
  },
  stepIndicator: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  form: {
    // Remove flex to prevent unused space
  },
  fieldContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#FF3B30",
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 80,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 14,
    paddingVertical: 4,
  },
  eyeButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 32,
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    letterSpacing: 0.3,
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0066CC",
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    flex: 1,
  },
  dropdownPlaceholder: {
    color: "#999999",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666666",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    width: "100%",
    flexDirection: "column",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexShrink: 0, // Prevent header from shrinking
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E6F2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalIcon: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
  },
  modalCloseButton: {
    marginLeft: 16,
  },
  modalCloseButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#666666",
    fontFamily: "Inter_500Medium",
  },
  modalSearchContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexShrink: 0, // Prevent search bar from shrinking
  },
  modalSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  modalSearchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    padding: 0,
  },
  modalSearchClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  modalSearchClearText: {
    fontSize: 12,
    color: "#666666",
    fontFamily: "Inter_500Medium",
  },
  modalListContainer: {
    minHeight: 300, // Fallback minimum height, actual height set dynamically
  },
  modalList: {
    flex: 1,
  },
  modalListContent: {
    paddingBottom: 24,
    flexGrow: 1,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    backgroundColor: "#FFFFFF",
  },
  modalItemSelected: {
    backgroundColor: "#F0F7FF",
    borderLeftWidth: 4,
    borderLeftColor: "#0066CC",
  },
  modalItemText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    letterSpacing: 0.2,
    flex: 1,
  },
  modalItemTextSelected: {
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
  modalItemCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  modalItemCheckText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  modalEmpty: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  modalEmptyText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  modalEmptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  modalEmptyButtonText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#333333",
  },
});
