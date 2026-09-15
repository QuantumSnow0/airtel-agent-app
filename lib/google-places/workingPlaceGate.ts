import { getCachedAgentData } from "../cache/agentCache";
import { supabase } from "../supabase";
import { hasWorkingPlace } from "./parseGooglePlace";

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
]);

export function isAuthOpenRoute(
  pathname: string,
  segments: readonly string[],
): boolean {
  const leaf = segments[segments.length - 1];
  if (leaf && AUTH_OPEN_ROUTES.has(leaf)) return true;
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

export async function getPostAuthHref(userId: string): Promise<string> {
  const cached = await getCachedAgentData();
  if (cached?.id === userId && hasWorkingPlace(cached.working_place)) {
    markWorkingPlaceReady(true);
    return "/dashboard";
  }

  const { data } = await supabase
    .from("agents")
    .select("working_place")
    .eq("id", userId)
    .maybeSingle();

  if (hasWorkingPlace(data?.working_place)) {
    markWorkingPlaceReady(true);
    return "/dashboard";
  }

  if (!data) {
    return "/dashboard";
  }

  markWorkingPlaceReady(false);
  return "/set-working-location";
}
