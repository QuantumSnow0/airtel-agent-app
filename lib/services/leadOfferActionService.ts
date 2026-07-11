/**
 * Accept / decline lead offers via edge function (v1).
 */

import { supabase } from "../supabase";
import type { InboundLead } from "../dispatch/types";

export async function acceptLeadOffer(
  offerId: string,
): Promise<{ success: boolean; lead?: InboundLead; error?: string }> {
  const { data, error } = await supabase.functions.invoke("lead-offer-action", {
    body: { offerId, action: "accept" },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data?.error) {
    return { success: false, error: String(data.error) };
  }

  return { success: true, lead: data?.lead as InboundLead | undefined };
}

export async function declineLeadOffer(
  offerId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("lead-offer-action", {
    body: { offerId, action: "decline" },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data?.error) {
    return { success: false, error: String(data.error) };
  }

  return { success: true };
}
