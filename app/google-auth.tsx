import { useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import {
  clearGoogleOAuthNavigationOwned,
  createSessionFromUrl,
  isGoogleOAuthRedirectUrl,
  markGoogleOAuthNavigationOwned,
  resolveGooglePostAuthHref,
  signInWithGoogle,
  waitForSession,
} from "@/lib/auth/googleAuth";
import { resetTo } from "@/lib/auth/resetTo";

/**
 * Single owner for Google OAuth UI — blank until the final destination.
 */
export default function GoogleAuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ start?: string }>();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const go = (href: string) => {
      markGoogleOAuthNavigationOwned();
      // Wipe welcome/register underneath so the logo cannot flash
      resetTo(router, href);
      setTimeout(() => clearGoogleOAuthNavigationOwned(), 2500);
    };

    const failToLogin = (error?: string) => {
      clearGoogleOAuthNavigationOwned();
      if (error) {
        resetTo(router, "/login");
        // replace again with params (resetTo can't pass params easily)
        router.replace({ pathname: "/login", params: { error } } as any);
      } else {
        resetTo(router, "/login");
      }
    };

    void (async () => {
      markGoogleOAuthNavigationOwned();

      if (params.start === "1") {
        const { error, href } = await signInWithGoogle();
        if (href) {
          go(href);
          return;
        }
        const session = await waitForSession(2000);
        if (session?.user) {
          go(await resolveGooglePostAuthHref(session.user.id));
          return;
        }
        if (error) {
          failToLogin(error);
          return;
        }
        failToLogin();
        return;
      }

      const url = (await Linking.getInitialURL()) ?? "";
      if (url && isGoogleOAuthRedirectUrl(url)) {
        const { error } = await createSessionFromUrl(url);
        if (error) {
          const session = await waitForSession(2000);
          if (!session?.user) {
            failToLogin(error);
            return;
          }
        }
      }

      const session = await waitForSession(3000);
      if (!session?.user) {
        failToLogin();
        return;
      }

      go(await resolveGooglePostAuthHref(session.user.id));
    })();
  }, [params.start, router]);

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
