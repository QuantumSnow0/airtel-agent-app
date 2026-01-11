import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { ActivityIndicator, View, StyleSheet } from "react-native";

export default function RootLayout() {
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let isMounted = true;

    // Always show app after max 1 second - NEVER get stuck
    // This timer always fires regardless of what happens with session check
    const maxLoadTimer = setTimeout(() => {
      console.log("Max load time reached (1s) - showing app");
      if (isMounted) {
        setIsInitializing(false);
      }
    }, 1000); // 1 second absolute maximum

    // Try to get session quickly in parallel (don't wait for it)
    // If it completes quickly, clear loading early. Otherwise, maxLoadTimer will handle it.
    checkSession()
      .then(() => {
        if (isMounted) {
          clearTimeout(maxLoadTimer);
          setIsInitializing(false);
        }
      })
      .catch((error) => {
        console.error("Session check error:", error);
        if (isMounted) {
          clearTimeout(maxLoadTimer);
          setIsInitializing(false);
        }
      })
      .finally(() => {
        // Ensure loading is cleared even if timer already fired
        if (isMounted) {
          clearTimeout(maxLoadTimer);
        }
      });

    // Listen for auth state changes (for logout events only)
    // Note: Only handle SIGNED_OUT - initial load handles other events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only handle logout - this happens after app is loaded anyway
      if (event === "SIGNED_OUT") {
        console.log("User signed out - redirecting to welcome");
        // Small delay to ensure router is ready
        setTimeout(() => {
          router.replace("/" as any);
        }, 100);
      }
    });

    // Handle deep links when app is already open
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened via deep link (non-blocking)
    // Email verification links may contain "code=" or "verify-email"
    // Password reset links contain "access_token=" or "token=" with type=recovery
    Linking.getInitialURL()
      .then((url) => {
        if (
          url &&
          (url.includes("verify-email") ||
            url.includes("code=") ||
            url.includes("token=") ||
            url.includes("access_token="))
        ) {
          handleDeepLink({ url });
        }
      })
      .catch((error) => {
        console.error("Error checking initial URL:", error);
        // Don't block - just log error
      });

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(maxLoadTimer);
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const checkSession = async (): Promise<void> => {
    try {
      // Very quick session check with aggressive timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{
        data: { session: null };
        error: null;
      }>(
        (resolve) =>
          setTimeout(() => {
            console.log("Session check timed out - continuing");
            resolve({ data: { session: null }, error: null });
          }, 800) // 800ms max - shorter than max load timer
      );

      const result = await Promise.race([sessionPromise, timeoutPromise]);
      const session = (result as any)?.data?.session;

      // If we have a valid session, try to redirect after router is ready
      if (session?.user) {
        // Wait a bit longer for router to be fully initialized before redirecting
        setTimeout(() => {
          handleAuthChange(session).catch((error) => {
            console.error("Error in handleAuthChange:", error);
            // Ignore errors - individual screens will handle their own auth checks
          });
        }, 800); // Wait longer to ensure router is ready
      }
      // If no session, just return - welcome screen will show naturally
    } catch (error) {
      console.error("Error checking session:", error);
      // Return normally - loading state will be cleared by timeout
    }
  };

  const handleAuthChange = async (session: any) => {
    if (!session?.user) {
      return;
    }

    // Have session - check verification and approval status and redirect
    try {
      // Check if email is verified (from session, no need to fetch user again)
      if (!session.user.email_confirmed_at) {
        router.replace("/verify-email" as any);
        return;
      }

      // Email verified - check agent approval status with timeout
      try {
        const agentPromise = supabase
          .from("agents")
          .select("status")
          .eq("id", session.user.id)
          .single();

        const agentTimeoutPromise = new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: { message: "Timeout" } }),
            2000
          )
        );

        const { data: agentData, error: agentError } = (await Promise.race([
          agentPromise,
          agentTimeoutPromise,
        ])) as any;

        if (agentError || !agentData) {
          // Agent record doesn't exist or query timed out - redirect to pending approval
          router.replace("/pending-approval" as any);
          return;
        }

        // Navigate based on approval status
        if (agentData.status === "approved") {
          router.replace("/dashboard" as any);
        } else {
          router.replace("/pending-approval" as any);
        }
      } catch (agentError) {
        console.error("Error checking agent status:", agentError);
        // On error, redirect to pending approval
        router.replace("/pending-approval" as any);
      }
    } catch (error) {
      console.error("Error handling auth change:", error);
      // On any error, just let user stay where they are or go to welcome
      // Individual screens will handle auth checks
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    try {
      const urlString = event.url;
      console.log("Handling deep link:", urlString);

      // Extract tokens directly from URL string (works with hash fragments and query params)
      // Supabase password reset links format: airtelagentsapp://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
      const tokenMatch = urlString.match(/access_token=([^&#]+)/);
      const refreshMatch = urlString.match(/refresh_token=([^&#]+)/);
      const typeMatch = urlString.match(/[?&#]type=([^&#]+)/);
      const resetMatch = urlString.match(/reset-password/);
      const verifyMatch = urlString.match(/verify-email/);

      // Password reset link (type=recovery)
      if (
        (tokenMatch || refreshMatch) &&
        (typeMatch?.[1] === "recovery" || resetMatch)
      ) {
        console.log("Processing password reset deep link in _layout.tsx");

        const accessToken = tokenMatch
          ? decodeURIComponent(tokenMatch[1])
          : null;
        const refreshToken = refreshMatch
          ? decodeURIComponent(refreshMatch[1])
          : null;
        const recoveryType = typeMatch
          ? decodeURIComponent(typeMatch[1])
          : null;

        if (accessToken && refreshToken) {
          // Establish session BEFORE navigating to reset-password screen
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.error("Error setting session in _layout:", sessionError);
            // Still navigate to reset-password - it will handle the error
          } else if (sessionData?.session) {
            console.log("Password reset session established in _layout.tsx");
          }
        } else if (accessToken) {
          // Only access_token - try to establish session anyway
          console.log("Warning: Only access_token found, no refresh_token");
        }

        // Navigate to reset-password screen
        router.replace("/reset-password" as any);
        return;
      }

      // Email verification link (type=signup) - OTP flow
      // For OTP-based verification, users manually enter the code
      // If a verify-email link is detected, just navigate to verify-email screen
      const linkType = typeMatch ? decodeURIComponent(typeMatch[1]) : null;

      // Skip if this is a password reset link (uses different flow)
      if (linkType !== "recovery" && !resetMatch) {
        // Check if this is an email verification link (not password reset)
        if (urlString.includes("verify-email") || linkType === "signup") {
          console.log(
            "Email verification deep link detected - navigating to verify-email screen (OTP flow)"
          );
          // For OTP flow, just navigate to verify-email screen where user enters code manually
          router.replace("/verify-email" as any);
          return;
        }
      }
    } catch (error) {
      console.error("Deep link error:", error);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066CC" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
});
