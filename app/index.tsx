import { Text, View, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useFonts } from "expo-font";
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
} from "../lib/utils/responsive";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

export default function WelcomeScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  // Show loading only while loading fonts
  // Auth check is handled by _layout.tsx to avoid double loading screens
  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  const handleGetStarted = () => {
    // Navigate to registration form
    router.push("/register" as any);
  };

  const handleSignIn = () => {
    // Navigate to login screen
    router.push("/login" as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Welcome Image Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/welcome-image.jpg")}
            style={styles.welcomeImage}
            resizeMode="contain"
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>
            Register customers for Airtel 5G SmartConnect
          </Text>

          <Text style={styles.description}>
            Join our network of field agents and help expand Airtel's reach.
            Register customers on the go and earn commission for successful
            installations.
          </Text>
        </View>
      </View>

      {/* Button Section - Fixed at bottom */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignIn}
          activeOpacity={0.8}
        >
          <Text style={styles.signInText}>Already an agent? Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  contentWrapper: {
    flex: 1,
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeImage: {
    width: "100%",
    height: 300,
    maxWidth: 400,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#0066CC",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#333333",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: scaleHeight(80), // Add bottom margin to prevent navbar overlap
  },
  button: {
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
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins_600SemiBold",
    letterSpacing: 0.5,
  },
  signInButton: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    color: "#0066CC",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
});
