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
import * as Linking from "expo-linking";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingLink, setIsProcessingLink] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
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
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Handle deep links for password reset - Process access_token from URL
  useEffect(() => {
    const processPasswordResetLink = async () => {
      try {
        // Extract access_token from URL params (passed from _layout.tsx)
        let accessToken = typeof params.access_token === 'string' ? params.access_token : null;
        let refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
        let type = typeof params.type === 'string' ? params.type : null;

        // Get initial URL when app opens from deep link
        const initialUrl = await Linking.getInitialURL();
        
        // Extract tokens from URL - Supabase puts tokens in hash fragments (#access_token=xxx)
        if (!accessToken && initialUrl) {
          console.log("Processing deep link URL:", initialUrl);
          
          // Use expo-linking to parse the URL properly
          const parsedUrl = Linking.parse(initialUrl);
          console.log("Parsed URL:", parsedUrl);
          
          // Check queryParams first
          if (parsedUrl.queryParams) {
            accessToken = parsedUrl.queryParams.access_token as string || accessToken;
            refreshToken = parsedUrl.queryParams.refresh_token as string || refreshToken;
            type = parsedUrl.queryParams.type as string || type;
          }
          
          // If still no token, try parsing the full URL string manually
          // Supabase typically uses hash fragments: #access_token=xxx&refresh_token=yyy&type=recovery
          if (!accessToken && initialUrl.includes('#')) {
            const hashPart = initialUrl.split('#')[1];
            if (hashPart) {
              const hashParams = new URLSearchParams(hashPart);
              accessToken = hashParams.get("access_token") || accessToken;
              refreshToken = hashParams.get("refresh_token") || refreshToken;
              type = hashParams.get("type") || type;
            }
          }
          
          // Fallback: Use regex to extract from any format
          if (!accessToken) {
            const tokenMatch = initialUrl.match(/access_token=([^&#]+)/);
            const refreshMatch = initialUrl.match(/refresh_token=([^&#]+)/);
            const typeMatch = initialUrl.match(/[?&#]type=([^&#]+)/);
            
            if (tokenMatch) accessToken = decodeURIComponent(tokenMatch[1]);
            if (refreshMatch) refreshToken = decodeURIComponent(refreshMatch[1]);
            if (typeMatch) type = decodeURIComponent(typeMatch[1]);
          }
          
          console.log("Extracted tokens:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
        }

        // Check if this is a password reset link (type=recovery)
        if (accessToken && type === "recovery") {
          console.log("Processing password reset link with access_token");
          
          // Establish session using the access_token and refresh_token
          // Supabase requires both tokens to set a session
          if (refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error("Error setting session:", sessionError);
              // Don't show error immediately - session might be established via detectSessionInUrl
              // Let the retry logic below handle it
            } else if (sessionData?.session) {
              console.log("Password reset session established successfully via setSession");
              setIsProcessingLink(false);
              return;
            }
          } else {
            // No refresh_token - try using just access_token
            // For password reset, we might need to verify the token first
            console.log("No refresh_token found, checking if Supabase auto-processed the link...");
            // Continue to retry logic below
          }
        } else if (accessToken && !type) {
          // Token found but no type - might still be a password reset link
          // Try setting session anyway
          if (refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (!sessionError && sessionData?.session) {
              console.log("Session established with access_token (no type specified)");
              setIsProcessingLink(false);
              return;
            }
          }
        }

        // Wait for Supabase to process the deep link (detectSessionInUrl: true should help)
        // Check session multiple times with delays
        let sessionFound = false;
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between checks
          
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (!sessionError && session) {
            console.log("Password reset session found - user can proceed");
            sessionFound = true;
            break;
          }
        }
        
        if (!sessionFound) {
          // No session found after multiple attempts
          // Don't show error immediately - let user see the form
          // They can try to reset password, and onSubmit will check again with better error message
          console.log("No session found after processing deep link - will check again on submit");
        }
      } catch (error: any) {
        console.error("Error processing password reset link:", error);
        Alert.alert(
          "Error",
          "Failed to process password reset link. Please request a new password reset link.",
          [
            {
              text: "Request New Link",
              onPress: () => router.replace("/forgot-password" as any),
            },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => router.replace("/login" as any),
            },
          ]
        );
      } finally {
        setIsProcessingLink(false);
      }
    };

    // Process the link after fonts are loaded
    if (fontsLoaded) {
      // Process immediately - Supabase with detectSessionInUrl: true should handle it
      // But we'll also manually try to process tokens from URL
      const timer = setTimeout(() => {
        processPasswordResetLink();
      }, 500); // Shorter delay since detectSessionInUrl should help

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, params]);

  // Listen for auth state changes to detect when session is established
  useEffect(() => {
    if (!fontsLoaded) return;

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session ? "Session exists" : "No session");
      
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          console.log("Password reset session established via auth state change");
          setIsProcessingLink(false);
        }
      }
    });

    // Also listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      console.log("Deep link received:", event.url);
      // Process the URL again in case tokens are in this URL
      if (event.url.includes('reset-password') || event.url.includes('access_token')) {
        setIsProcessingLink(true);
        // Extract and process tokens from this URL
        const urlString = event.url;
        const tokenMatch = urlString.match(/access_token=([^&#]+)/);
        const refreshMatch = urlString.match(/refresh_token=([^&#]+)/);
        
        if (tokenMatch && refreshMatch) {
          const accessToken = decodeURIComponent(tokenMatch[1]);
          const refreshToken = decodeURIComponent(refreshMatch[1]);
          
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ data, error }) => {
            if (error) {
              console.error("Error setting session from deep link:", error);
            } else if (data?.session) {
              console.log("Session established from deep link listener");
              setIsProcessingLink(false);
            }
          });
        }
      }
    });

    return () => {
      authSubscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, [fontsLoaded]);

  // Handle keyboard show/hide to ensure button is visible
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === "ios" ? 250 : 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  // Show loading state while processing the reset link
  if (isProcessingLink) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={{ marginTop: 16, fontSize: 16, fontFamily: "Inter_400Regular", color: "#666666" }}>
          Processing reset link...
        </Text>
      </View>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);

    try {
      // Check if we have a session (should exist after clicking reset link)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        Alert.alert(
          "Session Expired",
          "Your password reset link has expired or is invalid. Please request a new password reset link.",
          [
            {
              text: "Request New Link",
              onPress: () => router.replace("/forgot-password" as any),
            },
            {
              text: "Cancel",
              style: "cancel",
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Verify the session user exists
      if (!session.user) {
        Alert.alert(
          "Error",
          "Invalid session. Please request a new password reset link.",
          [
            {
              text: "Request New Link",
              onPress: () => router.replace("/forgot-password" as any),
            },
          ]
        );
        setIsLoading(false);
        return;
      }

      // Update password using the current session
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        if (updateError.message.includes("session") || updateError.message.includes("expired")) {
          Alert.alert(
            "Session Expired",
            "Your password reset link has expired. Please request a new password reset link.",
            [
              {
                text: "Request New Link",
                onPress: () => router.replace("/forgot-password" as any),
              },
            ]
          );
        } else {
          Alert.alert(
            "Error",
            updateError.message || "Failed to reset password. Please try again."
          );
        }
        setIsLoading(false);
        return;
      }

      // Success - sign out and redirect to login immediately
      await supabase.auth.signOut();
      
      // Show success message briefly then redirect
      setPasswordReset(true);
      setTimeout(() => {
        router.replace("/login" as any);
      }, 2000); // Show success message for 2 seconds before redirecting
    } catch (err: any) {
      console.error("Reset password error:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to reset password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (passwordReset) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>✅</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Password Reset Successful!</Text>

          {/* Message */}
          <Text style={styles.message}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>

          <Text style={styles.subMessage}>
            Redirecting to sign in...
          </Text>

          {/* Manual redirect button in case auto-redirect is slow */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/login" as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

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
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/login" as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password below. Make sure it's at least 6 characters long.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* New Password Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>New Password</Text>
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
                        placeholder="Enter new password"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                          }, Platform.OS === "ios" ? 300 : 200);
                        }}
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

            {/* Confirm Password Field */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
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
                        placeholder="Confirm new password"
                        placeholderTextColor="#999999"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        onFocus={() => {
                          setTimeout(() => {
                            scrollViewRef.current?.scrollToEnd({ animated: true });
                          }, Platform.OS === "ios" ? 300 : 200);
                        }}
                        secureTextEntry={!showConfirmPassword}
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
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeButtonText}>
                    {showConfirmPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/login" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
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
    paddingTop: 40,
    paddingBottom: 350,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  backIcon: {
    fontSize: 24,
    color: "#333333",
    fontFamily: "Inter_400Regular",
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
    lineHeight: 24,
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
  buttonContainer: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: "#0066CC",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.5,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: "#333333",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  icon: {
    fontSize: 80,
  },
  message: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#333333",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  subMessage: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
    letterSpacing: 0.2,
  },
});

