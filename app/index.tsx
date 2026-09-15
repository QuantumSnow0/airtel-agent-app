import { Text, View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import {
  scaleWidth,
  scaleHeight,
  scaleFont,
  getResponsivePadding,
} from "../lib/utils/responsive";
import { AFFILIATION_DISCLAIMER } from "../constants/legal";

export default function WelcomeScreen() {
  const router = useRouter();

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Image Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/images/welcome-image.jpg")}
            style={styles.welcomeImage}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <Text style={styles.subtitle}>
            Register customers for home internet services
          </Text>

          <Text style={styles.description}>
            Join our network of field agents and help expand our reach.
            Register customers on the go and earn commission for successful
            installations.
          </Text>
          <Text style={styles.disclaimer}>{AFFILIATION_DISCLAIMER}</Text>
        </View>
      </ScrollView>

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
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
    width: "100%",
    minHeight: 250,
  },
  logo: {
    width: 120,
    height: 120,
  },
  welcomeImage: {
    width: "100%",
    height: 250,
    maxWidth: 400,
    minHeight: 200,
  },
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 40,
    width: "100%",
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
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
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
