import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";
import { clearAgentDataCache, getCachedAgentData } from "../cache/agentCache";
import { clearDashboardDataCache } from "../cache/dashboardCache";
import { supabase } from "../supabase";
import {
  getPostAuthHref,
  markWorkingPlaceReady,
} from "../google-places/workingPlaceGate";

WebBrowser.maybeCompleteAuthSession();

/**
 * Must match an expo-router screen so deep links land somewhere controlled.
 * AuthSession still returns the URL to JS when possible.
 */
export const GOOGLE_AUTH_REDIRECT = Linking.createURL("google-auth", {
  scheme: "wamapps",
});

/** Prevents layout/index/login from racing Google’s own redirect. */
let oauthNavOwned = false;
let oauthBrowserOpen = false;
/** Strict Mode / remount safe — only one in-flight start=1 OAuth. */
let oauthStartInFlight: Promise<{ error: string | null; href?: string }> | null =
  null;

export function markGoogleOAuthNavigationOwned(): void {
  oauthNavOwned = true;
}

export function isGoogleOAuthNavigationOwned(): boolean {
  return oauthNavOwned || oauthBrowserOpen;
}

export function clearGoogleOAuthNavigationOwned(): void {
  oauthNavOwned = false;
}

export function isGoogleOAuthBrowserOpen(): boolean {
  return oauthBrowserOpen;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until Supabase has a user session (Android dismiss often races storage). */
export async function waitForSession(
  timeoutMs = 4000,
): Promise<Session | null> {
  const readOnce = async (): Promise<Session | null> =>
    Promise.race([
      supabase.auth
        .getSession()
        .then(({ data }) => data.session ?? null)
        .catch(() => null),
      sleep(500).then(() => null),
    ]);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const session = await readOnce();
    if (session?.user) return session;
    await sleep(150);
  }
  return readOnce();
}

/** Clear caches that belong to another user, then resolve post-auth route. */
export async function resolveGooglePostAuthHref(userId: string): Promise<string> {
  markWorkingPlaceReady(false);
  const cached = await getCachedAgentData();
  if (!cached || cached.id !== userId) {
    await clearAgentDataCache();
    await clearDashboardDataCache();
  }
  return getPostAuthHref(userId);
}

function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const parts: string[] = [];

  if (queryIndex >= 0) {
    const end = hashIndex > queryIndex ? hashIndex : url.length;
    parts.push(url.slice(queryIndex + 1, end));
  }
  if (hashIndex >= 0) {
    parts.push(url.slice(hashIndex + 1));
  }

  for (const part of parts) {
    for (const pair of part.split("&")) {
      if (!pair) continue;
      const eq = pair.indexOf("=");
      const key = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
      const value = decodeURIComponent(eq >= 0 ? pair.slice(eq + 1) : "");
      if (key) params[key] = value;
    }
  }
  return params;
}

export function isGoogleOAuthRedirectUrl(url: string): boolean {
  return (
    url.includes("google-auth") ||
    url.includes("auth/callback") ||
    (url.includes("wamapps://") &&
      (url.includes("access_token=") ||
        url.includes("code=") ||
        url.includes("error=")))
  );
}

export async function createSessionFromUrl(url: string): Promise<{
  error: string | null;
}> {
  try {
    markGoogleOAuthNavigationOwned();

    const params = parseAuthParams(url);
    const access_token = params.access_token;
    const refresh_token = params.refresh_token;
    const code = params.code;
    const errorDescription =
      params.error_description || params.error || null;

    if (errorDescription) {
      clearGoogleOAuthNavigationOwned();
      return { error: String(errorDescription) };
    }

    // Prefer URL credentials even if a session already exists (account switch).
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        const session = await waitForSession(2000);
        if (session?.user) return { error: null };
        clearGoogleOAuthNavigationOwned();
        return { error: error.message };
      }
      return { error: null };
    }

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (error) {
        const session = await waitForSession(2000);
        if (session?.user) return { error: null };
        clearGoogleOAuthNavigationOwned();
        return { error: error.message };
      }
      return { error: null };
    }

    // Only read persisted state after consuming callback credentials. Reading
    // first can wait behind Supabase's auth lock and strand the app on login.
    const existing = await waitForSession(1000);
    if (existing?.user) {
      return { error: null };
    }

    clearGoogleOAuthNavigationOwned();
    return { error: "No auth credentials in redirect URL" };
  } catch (e: unknown) {
    clearGoogleOAuthNavigationOwned();
    return {
      error:
        e instanceof Error ? e.message : "Failed to complete Google sign-in",
    };
  }
}

function mapOAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("identity is already linked") ||
    lower.includes("email address is already")
  ) {
    return "An account with this email already exists. Sign in with your password, then connect Google in Profile.";
  }
  return message;
}

async function openGoogleOAuth(
  start: () => Promise<{
    url: string | null;
    error: { message: string } | null;
  }>,
): Promise<{ error: string | null; href?: string }> {
  const { url, error } = await start();
  if (error) return { error: mapOAuthError(error.message) };
  if (!url) return { error: "Could not start Google sign-in" };

  markGoogleOAuthNavigationOwned();
  oauthBrowserOpen = true;
  let result: WebBrowser.WebBrowserAuthSessionResult;
  try {
    result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_AUTH_REDIRECT);
  } finally {
    oauthBrowserOpen = false;
    markGoogleOAuthNavigationOwned();
  }

  // Prefer URL credentials when AuthSession reports success.
  if (result.type === "success" && result.url) {
    const sessionResult = await createSessionFromUrl(result.url);
    if (sessionResult.error) {
      const late = await waitForSession(3000);
      if (late?.user) {
        markGoogleOAuthNavigationOwned();
        const href = await resolveGooglePostAuthHref(late.user.id);
        return {
          error: null,
          href:
            href === "/dashboard" || href === "/set-working-location"
              ? href
              : "/complete-profile",
        };
      }
      clearGoogleOAuthNavigationOwned();
      return { error: mapOAuthError(sessionResult.error) };
    }
  }

  // After Google, land on complete-profile unless the agent is already fully set up.
  // Never open Home first — incomplete users were flashing dashboard → skeleton → complete-profile.
  const session = await waitForSession(4000);
  if (session?.user) {
    markGoogleOAuthNavigationOwned();
    const href = await resolveGooglePostAuthHref(session.user.id);
    return {
      error: null,
      href: href === "/dashboard" || href === "/set-working-location" ? href : "/complete-profile",
    };
  }

  clearGoogleOAuthNavigationOwned();
  if (result.type === "cancel" || result.type === "dismiss") {
    return { error: null };
  }
  return { error: "Google sign-in was not completed" };
}

/** Sign in / sign up with Google (new agents complete phones + pin next). */
export async function signInWithGoogle(): Promise<{
  error: string | null;
  href?: string;
}> {
  if (oauthStartInFlight) return oauthStartInFlight;

  oauthStartInFlight = (async () => {
    try {
      return await openGoogleOAuth(async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: GOOGLE_AUTH_REDIRECT,
            skipBrowserRedirect: true,
            queryParams: {
              access_type: "offline",
              prompt: "select_account",
            },
          },
        });
        return { url: data.url ?? null, error };
      });
    } finally {
      oauthStartInFlight = null;
    }
  })();

  return oauthStartInFlight;
}

/**
 * Link Google to the currently signed-in (password) account.
 */
export async function linkGoogleIdentity(): Promise<{
  error: string | null;
  href?: string;
}> {
  return openGoogleOAuth(async () => {
    const { data, error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: GOOGLE_AUTH_REDIRECT,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
    return { url: data?.url ?? null, error };
  });
}

export function hasGoogleIdentity(
  identities: { provider?: string }[] | null | undefined,
): boolean {
  return (identities ?? []).some((i) => i.provider === "google");
}

export function authRedirectUrl(): string {
  return GOOGLE_AUTH_REDIRECT;
}
