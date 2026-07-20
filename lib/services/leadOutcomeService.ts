/**
 * Report KYC / install outcomes via edge function (v1).
 */

import { getFunctionsAuthHeaders, supabase } from "../supabase";
import type { LeadOutcomeAction } from "../dispatch/types";

export type LeadOutcomeParams = {
  leadId: string;
  action: LeadOutcomeAction;
  airtelSrNumber?: string;
  safaricomImei?: string;
  notes?: string;
};

export type LeadOutcomeResult = {
  success: boolean;
  status?: string;
  releaseReason?: string;
  commissionKes?: number;
  dispatch?: {
    outcome?: string;
    reason?: string;
    agentId?: string;
  };
  error?: string;
};

export async function submitLeadOutcome(
  params: LeadOutcomeParams,
): Promise<LeadOutcomeResult> {
  const auth = await getFunctionsAuthHeaders();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await supabase.functions.invoke("lead-outcome", {
    headers: auth,
    body: {
      leadId: params.leadId,
      action: params.action,
      airtelSrNumber: params.airtelSrNumber,
      safaricomImei: params.safaricomImei,
      notes: params.notes,
    },
  });

  if (error) {
    let message = error.message;
    if (data && typeof data === "object" && data !== null && "error" in data) {
      const nested = (data as { error?: unknown }).error;
      if (nested != null && String(nested).trim()) {
        message = String(nested);
      }
    } else {
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        try {
          const body = (await context.clone().json()) as {
            error?: unknown;
            msg?: unknown;
          };
          if (body?.error != null) message = String(body.error);
          else if (body?.msg != null) message = String(body.msg);
        } catch {
          // ignore
        }
      }
    }
    return { success: false, error: message };
  }

  if (data?.error) {
    return { success: false, error: String(data.error) };
  }

  return {
    success: true,
    status: data?.status as string | undefined,
    releaseReason: data?.releaseReason as string | undefined,
    commissionKes:
      data?.commissionKes != null ? Number(data.commissionKes) : undefined,
    dispatch: data?.dispatch as LeadOutcomeResult["dispatch"],
  };
}

export function releaseReasonLabel(reason: string | null | undefined): string {
  switch (reason) {
    case "unreachable":
      return "Customer unreachable";
    case "declined":
      return "Customer declined";
    case "kyc_failed":
      return "KYC / registration failed";
    default:
      return reason ? reason.replace(/_/g, " ") : "Released";
  }
}
