import { useCallback, useState } from "react";
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { AFFILIATION_DISCLAIMER } from "../constants/legal";
import { getPostAuthHref } from "../lib/google-places/workingPlaceGate";
import {
  isGoogleOAuthBrowserOpen,
  isGoogleOAuthNavigationOwned,
  isGoogleOAuthRedirectUrl,
  waitForSession,
} from "../lib/auth/googleAuth";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function WelcomeScreen() {
  const router = useRouter();
  /** false = blank (never flash Get Started during Google / session restore) */
  const [showWelcome, setShowWelcome] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setShowWelcome(false);

      void (async () => {
        // Stay blank while Google owns navigation — but never forever
        const deadline = Date.now() + 8000;
        while (
          !cancelled &&
          Date.now() < deadline &&
          (isGoogleOAuthBrowserOpen() || isGoogleOAuthNavigationOwned())
        ) {
          const session = await waitForSession(600);
          if (session?.user) {
            const href = await getPostAuthHref(session.user.id);
            if (!cancelled) router.replace(href as any);
            return;
          }
          await sleep(100);
        }

        if (cancelled) return;

        const url = (await Linking.getInitialURL()) ?? "";
        if (!cancelled && url && isGoogleOAuthRedirectUrl(url)) {
          router.replace("/google-auth" as any);
          return;
        }

        const session = await waitForSession(1200);
        if (cancelled) return;

        if (session?.user) {
          const href = await getPostAuthHref(session.user.id);
          if (!cancelled) router.replace(href as any);
          return;
        }

        if (!cancelled) setShowWelcome(true);
      })();

      return () => {
        cancelled = true;
      };
    }, [router]),
  );

  const handleGetStarted = () => {
    router.replace("/register" as any);
  };

  const handleSignIn = () => {
    router.replace("/login" as any);
  };

  if (!showWelcome) {
    return <View style={styles.blank} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
  blank: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
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
