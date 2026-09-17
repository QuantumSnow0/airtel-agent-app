import { getCachedAgentData } from "../cache/agentCache";
import { supabase } from "../supabase";
import { hasWorkingPlace } from "../google-places/parseGooglePlace";

/**
 * True when agent row is missing or phones / working pin are incomplete
 * (typical right after Google OAuth).
 */
export function isAgentProfileIncomplete(agent: {
  airtel_phone?: string | null;
  safaricom_phone?: string | null;
  working_place?: unknown;
} | null): boolean {
  if (!agent) return true;
  const airtel = (agent.airtel_phone ?? "").trim();
  const safaricom = (agent.safaricom_phone ?? "").trim();
  if (!airtel || !safaricom) return true;
  if (!hasWorkingPlace(agent.working_place)) return true;
  return false;
}

export async function fetchAgentProfileCompleteness(userId: string): Promise<{
  incomplete: boolean;
  agent: {
    airtel_phone: string | null;
    safaricom_phone: string | null;
    working_place: unknown;
  } | null;
}> {
  const cached = await getCachedAgentData();
  if (cached?.id === userId) {
    return {
      incomplete: isAgentProfileIncomplete(cached),
      agent: {
        airtel_phone: cached.airtel_phone,
        safaricom_phone: cached.safaricom_phone,
        working_place: cached.working_place ?? null,
      },
    };
  }

  const { data } = await supabase
    .from("agents")
    .select("airtel_phone, safaricom_phone, working_place")
    .eq("id", userId)
    .maybeSingle();

  return {
    incomplete: isAgentProfileIncomplete(data),
    agent: data
      ? {
          airtel_phone: data.airtel_phone,
          safaricom_phone: data.safaricom_phone,
          working_place: data.working_place ?? null,
        }
      : null,
  };
}
