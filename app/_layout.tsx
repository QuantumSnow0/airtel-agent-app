import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { AppState, StatusBar } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { APP_FONTS } from "../lib/fonts";
import { checkAppVersion } from "../lib/services/appVersionService";
import {
  applyOtaUpdateIfAvailable,
  useApplyPendingOtaUpdate,
} from "../lib/services/otaUpdateService";
import {
  activateAgentNotifications,
  ensureAllNotificationChannels,
  ensureNotificationListeners,
  getDeviceToken,
  getLastNotificationResponse,
  LEAD_OFFER_ACTION_ACCEPT,
  LEAD_OFFER_ACTION_DECLINE,
  LEAD_OFFER_ACTION_DISMISS,
  LEAD_OFFER_ACTION_VIEW,
  requestNotificationPermissions,
  unregisterDeviceToken,
  unsubscribeFromNotificationAlerts,
} from "../lib/services/pushNotificationService";
import { supabase } from "../lib/supabase";
import { LeadDispatchManager } from "../components/LeadDispatchManager";
import { NotificationDetailHost } from "../components/NotificationDetailModal";
import {
  extractOfferIdFromPushData,
  promptLeadOfferModal,
  refreshLeadOfferQueue,
} from "../lib/dispatch/leadOfferBridge";
import {
  getPostAuthHref,
  isAuthOpenRoute,
  isSetWorkingLocationRoute,
  isWorkingPlaceReady,
} from "../lib/google-places/workingPlaceGate";
import {
  acceptLeadOffer,
  declineLeadOffer,
} from "../lib/services/leadOfferActionService";
import { dismissLeadOfferOsNotification } from "../lib/notifications/presentLeadOfferOsNotification";
import {
  handleNotificationOpen,
  resolveNotificationActionUrl,
} from "../lib/notifications/openNotificationAction";
import * as Notifications from "expo-notifications";

// Move ref outside component to persist across remounts (React Strict Mode)
const pushNotificationsSetupRef = { current: false };
const isSettingUpPushNotifications = { current: false };
const layoutEffectHasRun = { current: false };
const sessionCheckCompleted = { current: false };
const initializationCompleted = { current: false };
const isAppBlockedRef = { current: false }; // Track if app is blocked for update

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(APP_FONTS);
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useApplyPendingOtaUpdate(!isBlocked);

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

    const finishInitializing = () => {
      if (isMounted && !isAppBlockedRef.current && !initializationCompleted.current) {
        setIsInitializing(false);
        initializationCompleted.current = true;
      }
    };

    const checkSessionOnce = async (): Promise<void> => {
      if (sessionCheckCompleted.current) {
        finishInitializing();
        return;
      }
      if (isBlocked || isAppBlockedRef.current) {
        return;
      }

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        sessionChecked = true;

        if (isBlocked || isAppBlockedRef.current) {
          return;
        }

        if (error) {
          console.error("Error getting session:", error);
          sessionCheckCompleted.current = true;
          finishInitializing();
          return;
        }

        if (session?.user && isMounted && !isBlocked && !isAppBlockedRef.current) {
          console.log("✅ Session found - redirecting to dashboard");
          sessionCheckCompleted.current = true;
          try {
            await handleAuthChange(session);
          } catch (authError) {
            console.error("Error in handleAuthChange:", authError);
          }
          finishInitializing();
          return;
        }

        sessionCheckCompleted.current = true;
        finishInitializing();
      } catch (error) {
        console.error("Error in checkSessionOnce:", error);
        sessionChecked = true;
        sessionCheckCompleted.current = true;
        finishInitializing();
      }
    };

    const maxLoadTimer = setTimeout(() => {
      if (isMounted && !initializationCompleted.current && !isBlocked) {
        console.warn("Auth bootstrap timeout — showing app");
        sessionCheckCompleted.current = true;
        finishInitializing();
      }
    }, 5000);

    checkSessionOnce();

    checkAppVersion()
      .then((versionCheck) => {
        if (!isMounted) return;
        if (versionCheck.isBlocked) {
          console.log("🚫 App version blocked - update required - BLOCKING ALL NAVIGATION");
          setNeedsUpdate(true);
          setIsBlocked(true);
          isAppBlockedRef.current = true;
          sessionCheckCompleted.current = true;
          setIsInitializing(false);
          initializationCompleted.current = true;
          router.replace("/update-required" as any);
          return;
        }
        if (versionCheck.needsUpdate) {
          console.log("📱 App update available (not forced)");
          setNeedsUpdate(true);
        }
        void applyOtaUpdateIfAvailable();
      })
      .catch((error) => {
        console.error("Version check error:", error);
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
        unsubscribeFromNotificationAlerts();
        void (async () => {
          const token = await getDeviceToken(5_000);
          if (token) await unregisterDeviceToken(token);
        })();
        router.replace("/login" as any);
      } else if (event === "SIGNED_IN") {
        if (session?.user) {
          void activateAgentNotifications(session.user.id);
        }
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

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active") return;
      void (async () => {
        if (!isAppBlockedRef.current) {
          await applyOtaUpdateIfAvailable();
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          await activateAgentNotifications(session.user.id);
        }
      })();
    });

    // Cleanup function
    return () => {
      isMounted = false;
      clearTimeout(maxLoadTimer);
      subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSub.remove();
    };
  }, []);

  useEffect(() => {
    if (isInitializing || isBlocked) return;
    if (
      isAuthOpenRoute(pathname, segments) &&
      !isSetWorkingLocationRoute(pathname, segments)
    ) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.email_confirmed_at) return;
      if (
        isWorkingPlaceReady() &&
        !isSetWorkingLocationRoute(pathname, segments)
      ) {
        return;
      }
      const href = await getPostAuthHref(session.user.id);
      if (cancelled) return;
      if (
        href === "/set-working-location" &&
        !isSetWorkingLocationRoute(pathname, segments)
      ) {
        router.replace("/set-working-location" as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, segments, isInitializing, isBlocked, router]);

  useEffect(() => {
    if (fontsLoaded && !isInitializing) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isInitializing]);

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

        const href = await getPostAuthHref(session.user.id);
        router.replace(href as any);
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

      await ensureAllNotificationChannels();
      ensureNotificationListeners((response) => {
        console.log("👆 Notification tapped:", response);
        handleNotificationTap(response);
      });

      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log("⚠️ Notification permissions not granted — in-app list still works");
        return;
      }
      console.log("✅ Notification permissions granted");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!userError && user) {
        console.log("👤 User found:", user.id);
        await activateAgentNotifications(user.id);
      } else {
        console.log("⚠️ No user logged in — alerts will subscribe after login");
      }

      const lastResponse = await getLastNotificationResponse();
      if (lastResponse) {
        const notificationTime = lastResponse.notification.date || 0;
        const now = Date.now();
        const timeSinceNotification = now - notificationTime;

        if (timeSinceNotification < 1000) {
          console.log("📱 App opened from notification tap (very recent)");
          setTimeout(() => {
            handleNotificationTap(lastResponse);
          }, 300);
        } else {
          console.log(
            `📱 Notification response found but too old (${Math.round(timeSinceNotification / 1000)}s ago), ignoring`
          );
        }
      }
    } catch (error) {
      console.error("Error setting up push notifications:", error);
    }
  };

  const handleNotificationTap = async (response: Notifications.NotificationResponse) => {
    if (!response?.notification) {
      console.log("⚠️ Invalid notification response, skipping navigation");
      return;
    }

    const notification = response.notification;
    const data = notification.request?.content?.data as
      | Record<string, unknown>
      | undefined;
    const actionId = response.actionIdentifier;

    console.log("🔔 Handling notification tap:", data, actionId);

    if (data?.type === "LEAD_OFFER") {
      const offerId = extractOfferIdFromPushData(data);

      if (
        actionId === LEAD_OFFER_ACTION_DECLINE ||
        actionId === LEAD_OFFER_ACTION_DISMISS
      ) {
        if (offerId) {
          await declineLeadOffer(offerId);
          await dismissLeadOfferOsNotification(offerId);
        }
        try {
          await Notifications.dismissNotificationAsync(
            notification.request.identifier,
          );
        } catch {
          // Notification may already be cleared by the system.
        }
        refreshLeadOfferQueue(null);
        return;
      }

      if (actionId === LEAD_OFFER_ACTION_ACCEPT && offerId) {
        const result = await acceptLeadOffer(offerId);
        await dismissLeadOfferOsNotification(offerId);
        try {
          await Notifications.dismissNotificationAsync(
            notification.request.identifier,
          );
        } catch {
          // Notification may already be cleared by the system.
        }
        if (result.success && result.lead?.id) {
          refreshLeadOfferQueue(null, true);
          router.push(`/lead/${result.lead.id}` as any);
        } else {
          refreshLeadOfferQueue(offerId);
        }
        return;
      }

      if (
        actionId === LEAD_OFFER_ACTION_VIEW ||
        actionId === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        promptLeadOfferModal(offerId);
        return;
      }
    }

    const currentRoute = segments[segments.length - 1];
    
    // Only navigate if we have valid notification data
    if (!data) {
      console.log("⚠️ No notification data, skipping navigation");
      return;
    }

    const metadata =
      data.metadata && typeof data.metadata === "object"
        ? (data.metadata as Record<string, unknown>)
        : {};
    const content = notification.request?.content;
    const pushTitle =
      (typeof data.title === "string" && data.title) ||
      (typeof content?.title === "string" ? content.title : null);
    const pushMessage =
      (typeof data.message === "string" && data.message) ||
      (typeof content?.body === "string" ? content.body : null);
    const actionUrl =
      (typeof data.actionUrl === "string" && data.actionUrl) ||
      resolveNotificationActionUrl(metadata, pushMessage);

    // Announcements → custom sheet; other types with links open immediately.
    if (actionUrl && data.type !== "LEAD_OFFER") {
      await handleNotificationOpen(router, {
        type: typeof data.type === "string" ? data.type : undefined,
        title: pushTitle,
        relatedId:
          typeof data.relatedId === "string" ? data.relatedId : null,
        actionUrl,
        metadata,
        message: pushMessage,
        carrier: typeof data.carrier === "string" ? data.carrier : null,
      });
      return;
    }

    // Navigate based on notification type
    if (data?.type) {
      await handleNotificationOpen(router, {
        type: String(data.type),
        title: pushTitle,
        relatedId:
          typeof data.relatedId === "string" ? data.relatedId : null,
        actionUrl,
        metadata,
        message: pushMessage,
        carrier: typeof data.carrier === "string" ? data.carrier : null,
      });
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
          console.log("[ResetPassword _layout] Setting session with tokens (access_token present, refresh_token present)");
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.error("[ResetPassword _layout] setSession failed:", {
              message: sessionError.message,
              name: sessionError.name,
              status: (sessionError as any)?.status,
              code: (sessionError as any)?.code,
            });
            // Still navigate to reset-password - it will handle the error
          } else if (sessionData?.session) {
            console.log("[ResetPassword _layout] Password reset session established successfully");
          } else {
            console.warn("[ResetPassword _layout] setSession returned no session:", { sessionData });
          }
        } else if (accessToken) {
          // Only access_token - try to establish session anyway
          console.warn("[ResetPassword _layout] Only access_token found, no refresh_token - session may fail. Tokens:", {
            hasAccessToken: true,
            hasRefreshToken: false,
            recoveryType,
          });
        } else {
          console.warn("[ResetPassword _layout] Missing tokens for reset - cannot set session:", {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
          });
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

  if (!fontsLoaded || isInitializing) {
    return null;
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
      <LeadDispatchManager />
      <NotificationDetailHost />
    </>
  );
}
