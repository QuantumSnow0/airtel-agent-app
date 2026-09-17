import { supabase } from "../supabase";
import { normalizeKePhone } from "./normalizeKePhone";

export { normalizeKePhone };

export type PhoneTakenResult = {
  taken: boolean;
  airtelTaken: boolean;
  safaricomTaken: boolean;
};

const PHONE_EXISTS_MESSAGE =
  "This phone number is already registered. Please sign in with your existing account instead.";

export function phoneTakenUserMessage(): string {
  return PHONE_EXISTS_MESSAGE;
}

/**
 * Server-side duplicate check (SECURITY DEFINER).
 * Cross-matches Airtel/Safaricom on either column.
 */
export async function checkAgentPhonesTaken(opts: {
  airtelPhone: string;
  safaricomPhone: string;
  excludeAgentId?: string | null;
}): Promise<PhoneTakenResult> {
  const { data, error } = await supabase.rpc("agent_phones_taken", {
    p_airtel: opts.airtelPhone.trim(),
    p_safaricom: opts.safaricomPhone.trim(),
    p_exclude_agent_id: opts.excludeAgentId ?? null,
  });

  if (error) {
    console.error("agent_phones_taken RPC error:", error);
    throw new Error(
      error.message || "Could not verify phone numbers. Please try again.",
    );
  }

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    taken: Boolean(row.taken),
    airtelTaken: Boolean(row.airtel_taken),
    safaricomTaken: Boolean(row.safaricom_taken),
  };
}
