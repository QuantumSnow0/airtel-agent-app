import { useState, useEffect, useRef } from "react";
import * as React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFonts } from "expo-font";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : ""
  );
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  // Initialize OTP refs and auto-focus first input
  useEffect(() => {
    if (!fontsLoaded) return;

    // Initialize refs array if not already done
    if (otpRefs.current.length === 0) {
      otpRefs.current = Array(6).fill(null);
    }

    // Auto-focus first input when screen loads
    setTimeout(() => {
      setFocusedIndex(0);
      otpRefs.current[0]?.focus();
    }, 300);
  }, [fontsLoaded]);

  // Get email from params or AsyncStorage
  useEffect(() => {
    if (!fontsLoaded) return;

    const getEmailFromStorage = async () => {
      if (!email || email === "") {
        try {
          const storedEmail = await AsyncStorage.getItem(
            "pendingVerificationEmail"
          );
          if (storedEmail && storedEmail !== "") {
            setEmail(storedEmail);
          }
        } catch (error) {
          console.error("Error getting email from AsyncStorage:", error);
        }
      }

      // Fallback: Try to get email from current user session
      if (!email || email === "") {
        try {
          const {
            data: { user },
            error: getUserError,
          } = await supabase.auth.getUser();
          if (user?.email && !getUserError) {
            setEmail(user.email);
            await AsyncStorage.setItem("pendingVerificationEmail", user.email);
          }
        } catch (error) {
          console.error("Error getting email from user:", error);
        }
      }
    };

    getEmailFromStorage();
  }, [fontsLoaded, email]);

  // Handle OTP input change
  const handleOtpChange = (value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, "");

    if (digit.length > 1) {
      // Handle paste - fill multiple boxes
      const digits = digit.slice(0, 6).split("");
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);

      // Focus the next empty box or the last box
      const nextEmptyIndex = newOtp.findIndex((d) => d === "");
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : 5;
      if (focusIndex < 6 && otpRefs.current[focusIndex]) {
        otpRefs.current[focusIndex]?.focus();
      }
      return;
    }

    // Update single digit
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-advance to next box if digit entered
    if (digit && index < 5 && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      // If current box is empty and backspace is pressed, go to previous box
      otpRefs.current[index - 1]?.focus();
    } else if (key === "Backspace" && otp[index]) {
      // Clear current box
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  // Get OTP as string
  const otpString = otp.join("");

  // Verify OTP code
  const handleVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (!otpCode || otpCode.length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    if (!email || email === "") {
      Alert.alert(
        "Error",
        "Email address not found. Please try registering again."
      );
      return;
    }

    setIsVerifying(true);

    try {
      const otpCode = otp.join("");
      console.log("Verifying OTP code...");

      // Verify OTP using Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otpCode,
        type: "signup",
      });

      if (error) {
        console.error("OTP verification error:", error);

        if (
          error.message?.includes("expired") ||
          error.message?.includes("invalid")
        ) {
          Alert.alert(
            "Invalid Code",
            "The verification code is invalid or has expired. Please request a new code."
          );
          setOtp(["", "", "", "", "", ""]); // Clear all inputs
          setTimeout(() => {
            setFocusedIndex(0);
            otpRefs.current[0]?.focus(); // Focus first input
          }, 100);
        } else {
          Alert.alert(
            "Verification Failed",
            error.message || "Failed to verify code. Please try again."
          );
        }
        setIsVerifying(false);
        return;
      }

      if (data?.user?.email_confirmed_at) {
        console.log(
          "OTP verified successfully! Email confirmed at:",
          data.user.email_confirmed_at
        );

        // Create agent profile now that email is verified
        // Agent data is stored in user_metadata from registration
        const metadata = data.user.user_metadata || {};
        const { error: profileError } = await supabase
          .from("agents")
          .insert([
            {
              id: data.user.id,
              email: data.user.email || email,
              name: metadata.name || "",
              airtel_phone: metadata.airtel_phone || null,
              safaricom_phone: metadata.safaricom_phone || null,
              town: metadata.town || null,
              area: metadata.area || null,
              status: "pending",
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (profileError) {
          console.error("Error creating agent profile:", profileError);
          // Check if profile already exists (in case of retry)
          if (profileError.code === "23505") {
            // Unique constraint violation - profile already exists, that's OK
            console.log("Agent profile already exists, continuing...");
          } else {
            Alert.alert(
              "Warning",
              "Profile creation had an issue. Please contact support if you can't access your account."
            );
          }
        }

        // Clean up stored credentials
        await AsyncStorage.removeItem("pendingVerificationEmail");
        await AsyncStorage.removeItem("pendingVerificationPassword");

        // Navigate to dashboard (will show pending status)
        router.replace("/dashboard" as any);
        setIsVerifying(false);
        return;
      }

      // If verification succeeded but email_confirmed_at not set, check again
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (!userError && userData.user?.email_confirmed_at) {
        console.log("Email confirmed! Creating agent profile...");

        // Create agent profile now that email is verified
        const metadata = userData.user.user_metadata || {};
        const { error: profileError } = await supabase
          .from("agents")
          .insert([
            {
              id: userData.user.id,
              email: userData.user.email || email,
              name: metadata.name || "",
              airtel_phone: metadata.airtel_phone || null,
              safaricom_phone: metadata.safaricom_phone || null,
              town: metadata.town || null,
              area: metadata.area || null,
              status: "pending",
              created_at: new Date().toISOString(),
            },
          ])
          .select();

        if (profileError) {
          console.error("Error creating agent profile:", profileError);
          if (profileError.code === "23505") {
            console.log("Agent profile already exists, continuing...");
          } else {
            Alert.alert(
              "Warning",
              "Profile creation had an issue. Please contact support if you can't access your account."
            );
          }
        }

        await AsyncStorage.removeItem("pendingVerificationEmail");
        await AsyncStorage.removeItem("pendingVerificationPassword");
        router.replace("/dashboard" as any);
        setIsVerifying(false);
        return;
      }

      // If we reach here, verification might have succeeded but email not yet confirmed
      Alert.alert(
        "Verification In Progress",
        "Your code has been verified. Please wait a moment and try again."
      );
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to verify code. Please try again."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    setIsResending(true);

    try {
      // Get email from state or AsyncStorage
      let emailToUse = email;

      if (!emailToUse || emailToUse === "") {
        try {
          const storedEmail = await AsyncStorage.getItem(
            "pendingVerificationEmail"
          );
          if (storedEmail && storedEmail !== "") {
            emailToUse = storedEmail;
            setEmail(storedEmail);
          }
        } catch (error) {
          console.error("Error getting email from AsyncStorage:", error);
        }
      }

      // Fallback: Try to get from current user session
      if (!emailToUse || emailToUse === "") {
        try {
          const {
            data: { user },
            error: getUserError,
          } = await supabase.auth.getUser();
          if (user?.email && !getUserError) {
            emailToUse = user.email;
            setEmail(user.email);
            await AsyncStorage.setItem("pendingVerificationEmail", user.email);
          }
        } catch (error) {
          console.error("Error getting email from user:", error);
        }
      }

      if (!emailToUse || emailToUse === "") {
        Alert.alert(
          "Error",
          "Unable to find your email address. Please try registering again or contact support."
        );
        setIsResending(false);
        return;
      }

      console.log("Resending OTP to:", emailToUse);

      // Resend OTP using Supabase
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailToUse,
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
          setIsResending(false);
          return;
        }

        // Check if already verified
        if (
          error.message?.includes("already confirmed") ||
          error.message?.includes("already verified")
        ) {
          Alert.alert(
            "Already Verified",
            "Your email has already been verified. Please try signing in."
          );
          setIsResending(false);
          return;
        }

        // Other errors
        Alert.alert(
          "Error",
          error.message ||
            "Failed to resend verification code. Please try again."
        );
        setIsResending(false);
        return;
      }

      // Success
      Alert.alert(
        "Code Sent",
        `A new verification code has been sent to ${emailToUse}. Please check your inbox and spam folder.`
      );
      setOtp(["", "", "", "", "", ""]); // Clear all inputs
      setTimeout(() => {
        setFocusedIndex(0);
        otpRefs.current[0]?.focus(); // Focus first input
      }, 100);
    } catch (error: any) {
      console.error("Error resending OTP:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to resend verification code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.content}>
          {/* Header with Icon */}
          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✉️</Text>
            </View>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to
            </Text>
            {email && email !== "" ? (
              <Text style={styles.emailText}>{email}</Text>
            ) : (
              <Text style={styles.emailText}>your email address</Text>
            )}
          </View>

          {/* OTP Input Section */}
          <View style={styles.otpSection}>
            <Text style={styles.otpLabel}>Enter verification code</Text>
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    otpRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpBox,
                    otp[index] && styles.otpBoxFilled,
                    focusedIndex === index && styles.otpBoxFocused,
                  ]}
                  value={otp[index]}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) =>
                    handleOtpKeyPress(nativeEvent.key, index)
                  }
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(null)}
                  placeholder=""
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus={true}
                />
              ))}
            </View>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (otpString.length !== 6 || isVerifying) &&
                styles.verifyButtonDisabled,
            ]}
            onPress={handleVerifyOtp}
            activeOpacity={0.8}
            disabled={otpString.length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          {/* Resend Section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={isResending || isVerifying}
              activeOpacity={0.7}
            >
              {isResending ? (
                <View style={styles.resendLoading}>
                  <ActivityIndicator size="small" color="#0066CC" />
                  <Text style={styles.resendLink}>Sending...</Text>
                </View>
              ) : (
                <Text style={styles.resendLink}>Resend code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <View style={styles.helpSection}>
            <Text style={styles.helpText}>
              • Check your spam or junk folder
            </Text>
            <Text style={styles.helpText}>
              • Make sure you entered the correct email address
            </Text>
            <Text style={styles.helpText}>
              • Codes expire after a few minutes for security
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E6F2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  otpSection: {
    marginBottom: 32,
  },
  otpLabel: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#333333",
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  otpBox: {
    width: 52,
    height: 52,
    fontSize: 22,
    fontFamily: "Poppins_700Bold",
    color: "#333333",
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    padding: 0,
  },
  otpBoxFilled: {
    borderColor: "#0066CC",
    backgroundColor: "#F0F8FF",
  },
  otpBoxFocused: {
    borderColor: "#0066CC",
    borderWidth: 2,
    shadowColor: "#0066CC",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  verifyButton: {
    backgroundColor: "#0066CC",
    paddingVertical: 18,
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
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.3,
  },
  resendSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#0066CC",
    letterSpacing: 0.2,
  },
  resendLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  helpSection: {
    marginTop: "auto",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  helpText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#999999",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
});
