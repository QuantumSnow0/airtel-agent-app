/**
 * Report KYC / install outcomes via edge function (v1).
 * Future: deeplink from Airtel Connect may auto-call kyc_completed.
 */

import { supabase } from "../supabase";
import type { LeadOutcomeAction } from "../dispatch/types";

export type LeadOutcomeParams = {
  leadId: string;
  action: LeadOutcomeAction;
  airtelSrNumber?: string;
  safaricomImei?: string;
  notes?: string;
};

export async function submitLeadOutcome(
  params: LeadOutcomeParams,
): Promise<{ success: boolean; status?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke("lead-outcome", {
    body: {
      leadId: params.leadId,
      action: params.action,
      airtelSrNumber: params.airtelSrNumber,
      safaricomImei: params.safaricomImei,
      notes: params.notes,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data?.error) {
    return { success: false, error: String(data.error) };
  }

  return { success: true, status: data?.status as string | undefined };
}
