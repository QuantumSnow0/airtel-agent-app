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
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: typeof params.email === "string" ? params.email : "",
      password: "",
    },
  });

  // Set email and error from params when component mounts
  useEffect(() => {
    if (fontsLoaded && params.email) {
      const email = typeof params.email === "string" ? params.email : "";
      if (email) {
        setValue("email", email);
      }
    }
    if (params.error) {
      const errorMessage = typeof params.error === "string" ? params.error : "";
      if (errorMessage) {
        setError(errorMessage);
      }
    }
  }, [fontsLoaded, params.email, params.error, setValue]);

  if (!fontsLoaded) {
    return null;
  }

  // Removed auto-scroll handlers - KeyboardAvoidingView will handle layout adjustments

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("Invalid email or password. Please try again.");
          setUnverifiedEmail(null);
        } else if (authError.message.includes("Email not confirmed")) {
          setError("Please verify your email before signing in.");
          setUnverifiedEmail(data.email);
        } else {
          setError(authError.message || "Failed to sign in. Please try again.");
          setUnverifiedEmail(null);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to sign in. Please try again.");
        setUnverifiedEmail(null);
        setIsLoading(false);
        return;
      }

      // Check if email is verified first
      if (!authData.user.email_confirmed_at) {
        setError("Please verify your email address before signing in.");
        setUnverifiedEmail(data.email);
        setIsLoading(false);
        return;
      }

      // Clear unverified email state if verification check passes
      setUnverifiedEmail(null);

      // Check if agent is approved by checking the agents table
      const { data: agentData, error: agentError } = await supabase
        .from("agents")
        .select("status")
        .eq("id", authData.user.id)
        .single();

      if (agentError) {
        console.error("Error checking agent status:", agentError);
        // If agent record doesn't exist, treat as pending - go to dashboard (will show pending status)
        router.replace("/dashboard" as any);
        setIsLoading(false);
        return;
      }

      // Always navigate to dashboard (dashboard handles pending/approved status display)
      router.replace("/dashboard" as any);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend OTP for unverified emails
  const handleResendOtp = async () => {
    if (!unverifiedEmail) return;

    setIsResendingOtp(true);

    try {
      console.log("Resending OTP to:", unverifiedEmail);

      // Resend OTP using Supabase
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unverifiedEmail,
        options: {
          emailRedirectTo: "airtelagentsapp://verify-email",
        },
      });

      if (error) {
        console.error("Resend OTP error:", error);

        // Check for rate limiting
        if (
          error.message?.includes("after") &&
          error.message?.includes("seconds")
        ) {
          const match = error.message.match(/(\d+)\s+seconds/);
          const seconds = match ? match[1] : "60";
          Alert.alert(
            "Rate Limit",
            `Please wait ${seconds} seconds before requesting another code. This is a security measure to prevent spam.`
          );
          setIsResendingOtp(false);
          return;
        }

        // Check if already verified
        if (
          error.message?.includes("already confirmed") ||
          error.message?.includes("already verified")
        ) {
          Alert.alert(
            "Already Verified",
            "Your email has already been verified. Please try signing in again."
          );
          setUnverifiedEmail(null);
          setError(null);
          setIsResendingOtp(false);
          return;
        }

        // Other errors
        Alert.alert(
          "Error",
          error.message ||
            "Failed to resend verification code. Please try again."
        );
        setIsResendingOtp(false);
        return;
      }

      // Success - show message and navigate to verify-email screen
      Alert.alert(
        "Code Sent",
        `A new verification code has been sent to ${unverifiedEmail}. Please check your inbox and spam folder.`
      );

      // Navigate to verify-email screen
      router.push({
        pathname: "/verify-email",
        params: { email: unverifiedEmail },
      } as any);
    } catch (error: any) {
      console.error("Error resending OTP:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to resend verification code. Please try again."
      );
    } finally {
      setIsResendingOtp(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={[styles.keyboardView, { paddingTop: insets.top }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>
              Enter your credentials to access your account
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email Address</Text>
              <Controller
                control={control}
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
                      onChangeText={(text) => {
                        onChange(text);
                        setError(null);
                        setUnverifiedEmail(null);
                      }}
                      onBlur={onBlur}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isLoading}
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
                  control={control}
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
                        placeholder="Enter your password"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={(text) => {
                          onChange(text);
                          setError(null);
                        }}
                        onFocus={() => {
                          // KeyboardAvoidingView will handle the layout adjustment
                        }}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!isLoading}
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

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>{error}</Text>
                {unverifiedEmail && (
                  <TouchableOpacity
                    style={styles.resendOtpContainer}
                    onPress={handleResendOtp}
                    disabled={isResendingOtp || isLoading}
                    activeOpacity={0.7}
                  >
                    {isResendingOtp ? (
                      <View style={styles.resendOtpLoading}>
                        <ActivityIndicator size="small" color="#0066CC" />
                        <Text style={styles.resendOtpText}>Sending...</Text>
                      </View>
                    ) : (
                      <Text style={styles.resendOtpText}>
                        Resend verification code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Forgot Password Link */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => {
                router.push("/forgot-password" as any);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.signInButton,
                isLoading && styles.signInButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push("/register" as any);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 40,
    paddingBottom: 400, // Extra padding to ensure Sign In button is above keyboard
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    letterSpacing: 0.2,
  },
  form: {
    marginBottom: 32,
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
  errorContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FFF5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE5E5",
    alignItems: "center",
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 8,
  },
  resendOtpContainer: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendOtpLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resendOtpText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    textDecorationLine: "underline",
  },
  buttonContainer: {
    marginTop: 20,
  },
  signInButton: {
    backgroundColor: "#0066CC",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.5,
  },
  forgotPasswordContainer: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    letterSpacing: 0.2,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  signUpText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
  },
});
