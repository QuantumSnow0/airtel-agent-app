import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { checkAppVersion } from "../lib/services/appVersionService";
import {
    getDeviceToken,
    getLastNotificationResponse,
    registerDeviceToken,
    requestNotificationPermissions,
    setupNotificationListeners,
} from "../lib/services/pushNotificationService";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
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

    // Check app version first (before session check)
    checkAppVersion()
      .then((versionCheck) => {
        if (isMounted) {
          if (versionCheck.isBlocked) {
            // App version is too old and force update is enabled
            console.log("🚫 App version blocked - update required");
            setNeedsUpdate(true);
            setIsBlocked(true);
            setIsInitializing(false);
            router.replace("/update-required" as any);
            return;
          } else if (versionCheck.needsUpdate) {
            // Update available but not forced
            console.log("📱 App update available (not forced)");
            setNeedsUpdate(true);
            // Continue with app, but you could show a non-blocking banner
          }
        }
      })
      .catch((error) => {
        console.error("Version check error:", error);
        // On error, allow app to continue
      });

    // Try to get session quickly in parallel (don't wait for it)
    // If it completes quickly, clear loading early. Otherwise, maxLoadTimer will handle it.
    checkSession()
      .then(() => {
        if (isMounted && !isBlocked) {
          clearTimeout(maxLoadTimer);
          setIsInitializing(false);
        }
      })
      .catch((error) => {
        console.error("Session check error:", error);
        if (isMounted && !isBlocked) {
          clearTimeout(maxLoadTimer);
          setIsInitializing(false);
        }
      })
      .finally(() => {
        // Ensure loading is cleared even if timer already fired
        if (isMounted && !isBlocked) {
          clearTimeout(maxLoadTimer);
        }
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        console.log("User signed out - redirecting to welcome");
        // Small delay to ensure router is ready
        setTimeout(() => {
          router.replace("/" as any);
        }, 100);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        // User just logged in or token refreshed - setup push notifications
        console.log("User signed in - setting up push notifications");
        setupPushNotifications().catch((error) => {
          console.error("Error setting up push notifications after login:", error);
        });
      }
    });

    // Handle deep links when app is already open
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Setup push notifications (will run even if user not logged in yet)
    console.log("🚀 Calling setupPushNotifications...");
    setupPushNotifications()
      .then(() => {
        console.log("✅ setupPushNotifications completed");
      })
      .catch((error) => {
        console.error("❌ Error setting up push notifications on mount:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
      });

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

      // If we have a valid session, try to redirect immediately
      if (session?.user) {
        // Redirect immediately - index.tsx will also check and redirect
        handleAuthChange(session).catch((error) => {
          console.error("Error in handleAuthChange:", error);
          // Ignore errors - individual screens will handle their own auth checks
        });
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
          // Agent record doesn't exist or query timed out - redirect to dashboard (will show pending status)
          router.replace("/dashboard" as any);
          return;
        }

        // Always navigate to dashboard (dashboard handles pending/approved status display)
        router.replace("/dashboard" as any);
      } catch (agentError) {
        console.error("Error checking agent status:", agentError);
        // On error, redirect to dashboard (will show pending status)
        router.replace("/dashboard" as any);
      }
    } catch (error) {
      console.error("Error handling auth change:", error);
      // On any error, just let user stay where they are or go to welcome
      // Individual screens will handle auth checks
    }
  };

  const setupPushNotifications = async () => {
    try {
      console.log("🔔 Starting push notification setup...");
      console.log("📋 Current time:", new Date().toISOString());
      
      // Request notification permissions
      console.log("🔐 Requesting notification permissions...");
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log("⚠️ Notification permissions not granted");
        return;
      }
      console.log("✅ Notification permissions granted");

      // Get device token
      const token = await getDeviceToken();
      if (!token) {
        console.log("⚠️ Could not get device token");
        return;
      }

      console.log("📱 Device token obtained:", token.substring(0, 50) + "...");

      // Get current user (if logged in)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      // If user is logged in, register token in database
      if (!userError && user) {
        console.log("👤 User found:", user.id);
        // Register token in database
        const result = await registerDeviceToken(user.id, token);
        if (result.success) {
          console.log("✅ Device token registered successfully");
        } else {
          console.error("❌ Failed to register device token:", result.error);
        }
      } else {
        // No user logged in yet - this is normal on app startup
        // Token will be registered when user logs in (handled by SIGNED_IN event)
        console.log("⚠️ No user logged in, token will be registered on login");
      }

      // Setup notification listeners
      const cleanup = setupNotificationListeners(
        // Foreground notification handler
        (notification) => {
          console.log("📬 Foreground notification:", notification);
          // Notification is automatically shown by expo-notifications
          // You can add custom handling here if needed
        },
        // Notification tap handler
        (response) => {
          console.log("👆 Notification tapped:", response);
          handleNotificationTap(response);
        }
      );

      // Check if app was opened from a notification
      const lastResponse = await getLastNotificationResponse();
      if (lastResponse) {
        console.log("📱 App opened from notification");
        handleNotificationTap(lastResponse);
      }

      // Cleanup on unmount
      return cleanup;
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  };

  const handleNotificationTap = (response: any) => {
    const notification = response.notification;
    const data = notification.request.content.data;

    console.log("🔔 Handling notification tap:", data);

    // Navigate based on notification type
    if (data?.type) {
      switch (data.type) {
        case "REGISTRATION_STATUS_CHANGE":
          if (data.relatedId) {
            router.push("/registrations" as any);
          }
          break;
        case "EARNINGS_UPDATE":
          router.push("/dashboard" as any);
          break;
        case "ACCOUNT_STATUS_CHANGE":
          router.push("/dashboard" as any);
          break;
        case "SYNC_FAILURE":
          router.push("/registrations" as any);
          break;
        case "SYSTEM_ANNOUNCEMENT":
          router.push("/notifications" as any);
          break;
        default:
          router.push("/notifications" as any);
      }
    } else {
      // Default: navigate to notifications
      router.push("/notifications" as any);
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
