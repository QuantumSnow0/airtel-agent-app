import * as Linking from "expo-linking";
import { Stack, useRouter, useSegments, usePathname } from "expo-router";
import { useEffect, useState } from "react";
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
  isCompleteProfileRoute,
  isSetWorkingLocationRoute,
} from "../lib/google-places/workingPlaceGate";
import {
  clearGoogleOAuthNavigationOwned,
  createSessionFromUrl,
  isGoogleOAuthBrowserOpen,
  isGoogleOAuthNavigationOwned,
  isGoogleOAuthRedirectUrl,
  resolveGooglePostAuthHref,
  waitForSession,
} from "../lib/auth/googleAuth";
import { resetTo } from "../lib/auth/resetTo";
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
    console.log("🚀 Layout auth setup");

    const replaceIfDifferent = (href: string) => {
      // React Strict Mode cleans up the first effect run while its async
      // session/profile lookup may still be resolving. That stale run must
      // never perform a second navigation.
      if (!isMounted) return;
      const normalize = (value: string) =>
        (`/${value}`.replace(/\/+/g, "/").replace(/\/$/, "") || "/")
          .replace(/^\/\(tabs\)/, "");
      if (normalize(pathname) !== normalize(href)) {
        resetTo(router, href);
      }
    };

    const finishInitializing = () => {
      if (isMounted && !isAppBlockedRef.current) {
        setIsInitializing(false);
      }
    };

    const checkSessionOnce = async (): Promise<void> => {
      if (isBlocked || isAppBlockedRef.current) {
        return;
      }

      try {
        // The callback screen is the sole owner of Google OAuth completion.
        // Root bootstrap must not route an old/still-persisting session away
        // before the callback code/tokens have been exchanged.
        if (
          pathname.includes("google-auth") ||
          pathname.includes("auth/callback")
        ) {
          finishInitializing();
          return;
        }

        const session = await waitForSession(1200);

        if (!isMounted || isBlocked || isAppBlockedRef.current) {
          return;
        }

        if (session?.user && !isBlocked && !isAppBlockedRef.current) {
          console.log("✅ Session found — resolving post-auth route");
          try {
            if (!session.user.email_confirmed_at) {
              replaceIfDifferent("/verify-email");
            } else {
              const href = await getPostAuthHref(session.user.id);
              if (!isMounted) return;
              replaceIfDifferent(href);
            }
          } catch (authError) {
            console.error("Error resolving post-auth route:", authError);
            try {
              replaceIfDifferent("/complete-profile");
            } catch {
              /* ignore */
            }
          }
          await new Promise((r) => setTimeout(r, 80));
          finishInitializing();
          return;
        }

        finishInitializing();
      } catch (error) {
        console.error("Error in checkSessionOnce:", error);
        finishInitializing();
      }
    };

    const maxLoadTimer = setTimeout(() => {
      if (isMounted && !isBlocked) {
        console.warn("Auth bootstrap timeout — showing app");
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
          setIsInitializing(false);
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
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Don't handle auth changes if app is blocked
      if (isBlocked || isAppBlockedRef.current) {
        console.log("🚫 App is blocked - ignoring auth state change");
        return;
      }

      if (event === "SIGNED_OUT") {
        if (isGoogleOAuthNavigationOwned() || isGoogleOAuthBrowserOpen()) {
          console.log("Ignoring SIGNED_OUT during Google OAuth");
          return;
        }
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
    // Use both ref and flag to prevent concurrent setup during Strict Mode.
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
          pushNotificationsSetupRef.current = false;
          isSettingUpPushNotifications.current = false;
        });
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
    if (isGoogleOAuthNavigationOwned()) return;
    if (isCompleteProfileRoute(pathname, segments)) return;
    if (pathname.includes("auth/callback") || pathname.includes("google-auth")) {
      return;
    }
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
      const href = await getPostAuthHref(session.user.id);
      if (cancelled || isGoogleOAuthNavigationOwned()) return;
      if (
        href === "/complete-profile" &&
        !isCompleteProfileRoute(pathname, segments)
      ) {
        router.replace("/complete-profile" as any);
        return;
      }
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
    const requestIdentifier = notification.request?.identifier;
    const data = notification.request?.content?.data as
      | Record<string, unknown>
      | undefined;
    const actionId = response.actionIdentifier;

    console.log("🔔 Handling notification tap:", data, actionId);

    // Android can surface the Chrome/Google OAuth return intent through Expo's
    // notification response API. It has no Expo notification identifier/type
    // and must never be allowed to navigate to Home.
    if (
      !requestIdentifier ||
      !data ||
      (typeof data.type !== "string" &&
        typeof data.actionUrl !== "string" &&
        typeof data.relatedId !== "string")
    ) {
      console.log("⚠️ Non-app notification intent, skipping navigation");
      return;
    }

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
      // Unknown notification payloads are not navigation commands.
      console.log("⚠️ No supported notification action, skipping navigation");
    }
  };

  const handleDeepLink = async (event: { url: string }) => {
    try {
      const urlString = event.url;
      console.log("Handling deep link:", urlString);

      if (isGoogleOAuthRedirectUrl(urlString)) {
        // Always consume returned credentials first. The google-auth screen
        // remains the sole navigation owner for in-app OAuth.
        const ownedBeforeCallback =
          isGoogleOAuthBrowserOpen() || isGoogleOAuthNavigationOwned();
        const { error } = await createSessionFromUrl(urlString);
        const session = await waitForSession(2000);
        if (ownedBeforeCallback) {
          return;
        }
        clearGoogleOAuthNavigationOwned();
        if (error && !session?.user) {
          router.replace({
            pathname: "/login",
            params: { error },
          } as any);
          return;
        }
        if (session?.user) {
          const href = await resolveGooglePostAuthHref(session.user.id);
          router.replace(href as any);
        }
        return;
      }

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
          contentStyle: {
            backgroundColor: "#FFFFFF",
          },
        }}
      />
      <LeadDispatchManager />
      <NotificationDetailHost />
    </>
  );
}
