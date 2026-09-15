import { supabase } from "../supabase";

export type RegistrationMode = "legacy_wam" | "airtel_connect";

export type RegistrationModeResult = {
  mode: RegistrationMode;
  county?: string | null;
  reason?: string;
  globalEnabled?: boolean;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: RegistrationModeResult } | null = null;

/** Fail-safe default when backend is unavailable. */
export const LEGACY_MODE: RegistrationModeResult = {
  mode: "legacy_wam",
  reason: "fail_safe_default",
};

/**
 * Resolve registration workflow for the authenticated agent.
 * Backend-controlled county rollout + global kill switch.
 * Short in-memory cache only — no persistent device cache.
 */
export async function fetchRegistrationMode(
  forceRefresh = false,
): Promise<RegistrationModeResult> {
  if (!forceRefresh && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const { data, error } = await supabase.rpc("get_my_registration_mode");
    if (error) {
      console.warn("get_my_registration_mode failed:", error.message);
      return LEGACY_MODE;
    }

    const mode =
      (data as { mode?: string })?.mode === "airtel_connect"
        ? "airtel_connect"
        : "legacy_wam";

    const result: RegistrationModeResult = {
      mode,
      county: (data as { county?: string })?.county ?? null,
      reason: (data as { reason?: string })?.reason,
      globalEnabled: (data as { global_enabled?: boolean })?.global_enabled,
    };

    if (__DEV__) {
      console.log("get_my_registration_mode:", result);
    }

    cached = { at: Date.now(), value: result };
    return result;
  } catch (e) {
    console.warn("fetchRegistrationMode:", e);
    return LEGACY_MODE;
  }
}

export function clearRegistrationModeCache(): void {
  cached = null;
}
