import { supabase } from "../supabase";
import { hasWorkingPlace } from "./parseGooglePlace";
import { isAgentProfileIncomplete } from "../auth/agentProfileCompleteness";

const workingPlaceReady = { current: false };

export function markWorkingPlaceReady(ready: boolean): void {
  workingPlaceReady.current = ready;
}

export function isWorkingPlaceReady(): boolean {
  return workingPlaceReady.current;
}

const AUTH_OPEN_ROUTES = new Set([
  "index",
  "login",
  "register",
  "verify-email",
  "forgot-password",
  "reset-password",
  "privacy-policy",
  "update-required",
  "set-working-location",
  "complete-profile",
  "callback",
  "google-auth",
]);

export function isAuthOpenRoute(
  pathname: string,
  segments: readonly string[],
): boolean {
  const leaf = segments[segments.length - 1];
  if (leaf && AUTH_OPEN_ROUTES.has(leaf)) return true;
  if (pathname.includes("auth/callback")) return true;
  if (pathname.includes("complete-profile")) return true;
  return AUTH_OPEN_ROUTES.has(pathname.replace(/^\//, ""));
}

export function isSetWorkingLocationRoute(
  pathname: string,
  segments: readonly string[],
): boolean {
  return (
    pathname.includes("set-working-location") ||
    segments.includes("set-working-location")
  );
}

export function isCompleteProfileRoute(
  pathname: string,
  segments: readonly string[],
): boolean {
  return (
    pathname.includes("complete-profile") ||
    segments.includes("complete-profile")
  );
}

export async function getPostAuthHref(userId: string): Promise<string> {
  // Always verify against DB — stale cache after Google signup (no agents row yet)
  // or a deleted agent row must not send users to /dashboard.
  const { data } = await supabase
    .from("agents")
    .select("airtel_phone, safaricom_phone, working_place")
    .eq("id", userId)
    .maybeSingle();

  if (!data || isAgentProfileIncomplete(data)) {
    markWorkingPlaceReady(false);
    return "/complete-profile";
  }

  if (hasWorkingPlace(data.working_place)) {
    markWorkingPlaceReady(true);
    return "/dashboard";
  }

  markWorkingPlaceReady(false);
  return "/set-working-location";
}
