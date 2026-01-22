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
import { useRouter } from "expo-router";
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

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
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
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
    },
  });

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

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);

    try {
      // Request password reset email from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(
        data.email,
        {
          redirectTo: "wamapps://reset-password",
        }
      );

      if (error) {
        if (error.message.includes("rate_limit") || error.message.includes("rate limit")) {
          Alert.alert(
            "Rate Limit",
            "Please wait a moment before requesting another password reset email."
          );
        } else if (error.message.includes("not found") || error.message.includes("does not exist")) {
          // Don't reveal if email exists - security best practice
          // Show success message anyway to prevent email enumeration
          setEmailSent(true);
        } else {
          Alert.alert(
            "Error",
            error.message || "Failed to send password reset email. Please try again."
          );
        }
        setIsLoading(false);
        return;
      }

      // Success - show confirmation
      setEmailSent(true);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      Alert.alert(
        "Error",
        err.message || "Failed to send password reset email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
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
            <Text style={styles.icon}>✉️</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Check Your Email</Text>

          {/* Message */}
          <Text style={styles.message}>
            We've sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
          </Text>

          <Text style={styles.subMessage}>
            If you don't see the email, please check your spam folder. The link will expire in 1 hour.
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setEmailSent(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Try Different Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                router.back();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
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
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
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
                      onChangeText={onChange}
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
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
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


