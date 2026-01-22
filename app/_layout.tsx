import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, StatusBar, StyleSheet, View } from "react-native";
import { checkAppVersion } from "../lib/services/appVersionService";
import {
  getDeviceToken,
  getLastNotificationResponse,
  registerDeviceToken,
  requestNotificationPermissions,
  setupNotificationListeners,
} from "../lib/services/pushNotificationService";
import { supabase } from "../lib/supabase";

// Move ref outside component to persist across remounts (React Strict Mode)
const pushNotificationsSetupRef = { current: false };
const isSettingUpPushNotifications = { current: false };
const layoutEffectHasRun = { current: false };
const sessionCheckCompleted = { current: false };
const initializationCompleted = { current: false };
const isAppBlockedRef = { current: false }; // Track if app is blocked for update

export default function RootLayout() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;
    let sessionChecked = false;
    
    // Track if this is the first run
    const isFirstRun = !layoutEffectHasRun.current;
    if (isFirstRun) {
      layoutEffectHasRun.current = true;
      console.log("🚀 Layout effect running (first time)");
    } else {
      console.log("⏭️ Layout effect running (remount - React Strict Mode)");
    }

    // On remounts, just ensure initialization is complete and skip session check
    if (!isFirstRun) {
      console.log("⏭️ Remount detected - skipping session check, ensuring initialization complete");
      if (isMounted && !initializationCompleted.current) {
        setIsInitializing(false);
        initializationCompleted.current = true;
      }
      return () => {
        isMounted = false;
      };
    }

    // Check session immediately (from local storage - very fast)
    // This prevents showing welcome page if user is already signed in
    // Add retry logic for session restoration after force close
    // NOTE: This will be called AFTER version check (only if not blocked)
    const checkSessionWithRetry = async (retries = 0): Promise<void> => {
      // Prevent multiple concurrent session checks
      if (sessionCheckCompleted.current) {
        console.log("⏭️ Session check already completed, skipping");
        if (isMounted && !initializationCompleted.current) {
          setIsInitializing(false);
          initializationCompleted.current = true;
        }
        return;
      }

      // Don't proceed if app is blocked (check both state and ref)
      if (isBlocked || isAppBlockedRef.current) {
        console.log("🚫 App is blocked - skipping session check");
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        sessionChecked = true;
        
        // Check again if blocked (might have changed during async operation)
        if (isBlocked || isAppBlockedRef.current) {
          console.log("🚫 App became blocked during session check - aborting");
          return;
        }
        
        if (error) {
          console.error("Error getting session:", error);
          // If it's a network error and we have retries left, try again
          if (retries < 3 && (error.message?.includes("network") || error.message?.includes("timeout"))) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return checkSessionWithRetry(retries + 1);
          }
          // Other errors or max retries - show welcome page
          sessionCheckCompleted.current = true;
          if (isMounted && !isBlocked) {
            setIsInitializing(false);
            initializationCompleted.current = true;
          }
          return;
        }
        
        if (session?.user && isMounted && !isBlocked && !isAppBlockedRef.current) {
          // User is signed in - redirect immediately to dashboard
          console.log("✅ Session found - redirecting to dashboard");
          sessionCheckCompleted.current = true;
          handleAuthChange(session).then(() => {
            // After navigation, clear loading
            if (isMounted && !isBlocked) {
              setIsInitializing(false);
              initializationCompleted.current = true;
            }
          }).catch((error) => {
            console.error("Error in handleAuthChange:", error);
            if (isMounted && !isBlocked) {
              setIsInitializing(false);
              initializationCompleted.current = true;
            }
          });
        } else if (!session && retries < 3) {
          // No session but might still be restoring - retry with increasing delay
          // AsyncStorage might need time to initialize after force close
          const delay = Math.min(300 * (retries + 1), 1000); // 300ms, 600ms, 900ms, max 1000ms
          console.log(`⏳ No session found, retrying in ${delay}ms (attempt ${retries + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return checkSessionWithRetry(retries + 1);
        } else {
          // No session after retries - show welcome page
          console.log("❌ No session found after retries - showing welcome page");
          sessionCheckCompleted.current = true;
          if (isMounted && !isBlocked) {
            setIsInitializing(false);
            initializationCompleted.current = true;
          }
        }
      } catch (error) {
        console.error("Error in checkSessionWithRetry:", error);
        // Only mark as completed if we've exhausted retries
        if (retries >= 3) {
          sessionChecked = true;
          sessionCheckCompleted.current = true;
          if (isMounted && !isBlocked) {
            setIsInitializing(false);
            initializationCompleted.current = true;
          }
        } else {
          // Retry on exception (might be AsyncStorage not ready)
          const delay = Math.min(300 * (retries + 1), 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return checkSessionWithRetry(retries + 1);
        }
      }
    };

    // Fallback timer - if session check takes too long, show app anyway
    // Increased to 3 seconds to allow AsyncStorage time to restore session after force close
    const maxLoadTimer = setTimeout(() => {
      if (isMounted && !sessionChecked && !initializationCompleted.current && !isBlocked) {
        console.log("Max load time reached (3s) - showing app (session may still be restoring)");
        setIsInitializing(false);
        initializationCompleted.current = true;
        // Don't set sessionCheckCompleted here - let the async check complete
      }
    }, 3000); // 3 seconds - gives AsyncStorage time to restore after force close

    // Check app version FIRST (before session check) - this must block everything if update is required
    checkAppVersion()
      .then((versionCheck) => {
        if (isMounted) {
          if (versionCheck.isBlocked) {
            // App version is too old and force update is enabled
            console.log("🚫 App version blocked - update required - BLOCKING ALL NAVIGATION");
            setNeedsUpdate(true);
            setIsBlocked(true);
            isAppBlockedRef.current = true; // Set ref to prevent navigation
            setIsInitializing(false);
            sessionCheckCompleted.current = true; // Prevent session check from running
            router.replace("/update-required" as any);
            return; // Exit early - don't proceed with session check
          } else if (versionCheck.needsUpdate) {
            // Update available but not forced
            console.log("📱 App update available (not forced)");
            setNeedsUpdate(true);
            // Continue with app, but you could show a non-blocking banner
          }
          
          // Only proceed with session check if NOT blocked
          if (!versionCheck.isBlocked) {
            checkSessionWithRetry();
          }
        }
      })
      .catch((error) => {
        console.error("Version check error:", error);
        // On error, allow app to continue with session check
        checkSessionWithRetry();
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Don't handle auth changes if app is blocked
      if (isBlocked || isAppBlockedRef.current) {
        console.log("🚫 App is blocked - ignoring auth state change");
        return;
      }

      if (event === "SIGNED_OUT") {
        console.log("User signed out - redirecting to login");
        // Navigate immediately - router.replace will handle duplicate prevention
        router.replace("/login" as any);
      } else if (event === "SIGNED_IN") {
        // User just logged in - setup push notifications
        // Only setup on SIGNED_IN, not on TOKEN_REFRESHED (which fires too frequently)
        // Only call if not already set up and not currently setting up
        if (!pushNotificationsSetupRef.current && !isSettingUpPushNotifications.current) {
          console.log("User signed in - setting up push notifications");
          pushNotificationsSetupRef.current = true;
          isSettingUpPushNotifications.current = true;
          setupPushNotifications()
            .then(() => {
              isSettingUpPushNotifications.current = false;
            })
            .catch((error) => {
              console.error("Error setting up push notifications after login:", error);
              pushNotificationsSetupRef.current = false; // Reset on error so we can retry
              isSettingUpPushNotifications.current = false;
            });
        } else {
          console.log("⏳ Push notifications already set up or in progress, skipping...");
        }
      }
    });

    // Handle deep links when app is already open
    const linkingSubscription = Linking.addEventListener("url", handleDeepLink);

    // Setup push notifications (will run even if user not logged in yet)
    // Only setup once to prevent infinite loops - skip on remounts
    if (isFirstRun) {
      // Use both ref and flag to prevent concurrent calls
      if (!pushNotificationsSetupRef.current && !isSettingUpPushNotifications.current) {
        console.log("🚀 Calling setupPushNotifications...");
        pushNotificationsSetupRef.current = true;
        isSettingUpPushNotifications.current = true;
        setupPushNotifications()
          .then(() => {
            console.log("✅ setupPushNotifications completed");
            isSettingUpPushNotifications.current = false;
          })
          .catch((error) => {
            console.error("❌ Error setting up push notifications on mount:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            pushNotificationsSetupRef.current = false; // Reset on error so we can retry
            isSettingUpPushNotifications.current = false;
          });
      } else if (isSettingUpPushNotifications.current) {
        console.log("⏳ setupPushNotifications already in progress, skipping...");
      } else if (pushNotificationsSetupRef.current) {
        console.log("✅ setupPushNotifications already completed, skipping...");
      }
    } else {
      // On remount, skip push notifications setup but still allow initialization to complete
      console.log("⏭️ Skipping push notifications setup on remount");
    }

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
        // Redirect immediately - handleAuthChange will navigate to dashboard
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

    // Don't navigate if app is blocked (update required)
    if (isBlocked) {
      console.log("🚫 App is blocked - preventing navigation from handleAuthChange");
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

        // Check again if blocked before navigating
        if (isBlocked || isAppBlockedRef.current) {
          console.log("🚫 App is blocked - preventing dashboard navigation");
          return;
        }

        if (agentError || !agentData) {
          // Agent record doesn't exist or query timed out - redirect to dashboard (will show pending status)
          router.replace("/dashboard" as any);
          return;
        }

        // Always navigate to dashboard (dashboard handles pending/approved status display)
        router.replace("/dashboard" as any);
      } catch (agentError) {
        console.error("Error checking agent status:", agentError);
        // On error, redirect to dashboard (will show pending status) - but only if not blocked
        if (!isBlocked && !isAppBlockedRef.current) {
          router.replace("/dashboard" as any);
        }
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
      // Only handle if app was actually opened from notification (not on every startup)
      // This prevents redirecting to notifications on normal app startup
      // IMPORTANT: Only check this once on initial mount, not on every app reopen
      const lastResponse = await getLastNotificationResponse();
      if (lastResponse) {
        // Check if notification was tapped very recently (within last 1 second)
        // This ensures we only navigate if user actually tapped a notification just now
        // Stale notifications from previous app sessions will be ignored
        const notificationTime = lastResponse.notification.date || 0;
        const now = Date.now();
        const timeSinceNotification = now - notificationTime;
        
        // Only navigate if notification was tapped very recently (within 1 second)
        // This prevents navigating on app reopen from old notifications
        if (timeSinceNotification < 1000) {
          console.log("📱 App opened from notification tap (very recent)");
          // Small delay to ensure router is ready
          setTimeout(() => {
            handleNotificationTap(lastResponse);
          }, 300);
        } else {
          console.log(`📱 Notification response found but too old (${Math.round(timeSinceNotification / 1000)}s ago), ignoring`);
        }
      }

      // Cleanup on unmount
      return cleanup;
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  };

  const handleNotificationTap = (response: any) => {
    if (!response || !response.notification) {
      console.log("⚠️ Invalid notification response, skipping navigation");
      return;
    }

    const notification = response.notification;
    const data = notification.request?.content?.data;

    console.log("🔔 Handling notification tap:", data);

    // Check current route to avoid unnecessary navigation
    const currentRoute = segments[segments.length - 1];
    
    // Only navigate if we have valid notification data
    if (!data) {
      console.log("⚠️ No notification data, skipping navigation");
      return;
    }

    // Navigate based on notification type
    if (data?.type) {
      switch (data.type) {
        case "REGISTRATION_STATUS_CHANGE":
          if (data.relatedId && currentRoute !== "registrations") {
            router.push("/registrations" as any);
          } else if (!data.relatedId && currentRoute !== "dashboard") {
            router.push("/dashboard" as any);
          }
          break;
        case "EARNINGS_UPDATE":
          if (currentRoute !== "dashboard") {
            router.push("/dashboard" as any);
          }
          break;
        case "ACCOUNT_STATUS_CHANGE":
          if (currentRoute !== "dashboard") {
            router.push("/dashboard" as any);
          }
          break;
        case "SYNC_FAILURE":
          if (currentRoute !== "registrations") {
            router.push("/registrations" as any);
          }
          break;
        case "SYSTEM_ANNOUNCEMENT":
          if (currentRoute !== "notifications") {
            router.push("/notifications" as any);
          }
          break;
        default:
          // Unknown type - go to dashboard instead of notifications to avoid confusion
          console.log("⚠️ Unknown notification type, navigating to dashboard");
          if (currentRoute !== "dashboard") {
            router.push("/dashboard" as any);
          }
      }
    } else {
      // No type specified - go to dashboard instead of notifications
      console.log("⚠️ No notification type, navigating to dashboard");
      if (currentRoute !== "dashboard") {
        router.push("/dashboard" as any);
      }
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    try {
      const urlString = event.url;
      console.log("Handling deep link:", urlString);

      // Extract tokens directly from URL string (works with hash fragments and query params)
      // Supabase password reset links format: wamapps://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </>
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
