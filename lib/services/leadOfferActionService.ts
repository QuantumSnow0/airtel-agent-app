/**

 * Accept / decline lead offers via edge function (v1).

 */



import { getFunctionsAuthHeaders, supabase } from "../supabase";

import type { InboundLead } from "../dispatch/types";



async function readFunctionsError(

  error: { message: string; context?: unknown },

  data: unknown,

): Promise<string> {

  if (data && typeof data === "object" && data !== null && "error" in data) {

    const msg = (data as { error?: unknown }).error;

    if (msg != null && String(msg).trim()) return String(msg);

  }



  const context = error.context as

    | { json?: () => Promise<unknown>; status?: number }

    | Response

    | undefined;



  if (context && typeof (context as Response).json === "function") {

    try {

      const body = (await (context as Response).clone().json()) as {

        error?: unknown;

        message?: unknown;

        msg?: unknown;

      };

      if (body?.error != null && String(body.error).trim()) {

        return String(body.error);

      }

      if (body?.message != null && String(body.message).trim()) {

        return String(body.message);

      }

      if (body?.msg != null && String(body.msg).trim()) {

        return String(body.msg);

      }

    } catch {

      // Body may already be consumed or non-JSON.

    }

  }



  return error.message || "Request failed";

}



function friendlyOfferError(message: string): string {

  const m = message.toLowerCase();

  if (m.includes("expired") && m.includes("offer")) {

    return "This offer expired. Wait for the next lead or check Leads.";

  }

  if (m.includes("jwt") || m.includes("token") || m.includes("session expired")) {

    return "Session expired. Sign out and sign in again.";

  }

  if (m.includes("not your offer")) {

    return "This offer belongs to another agent.";

  }

  if (m.includes("not found")) {

    return "Offer not found. Pull to refresh and try again.";

  }

  if (m.includes("not authenticated") || m.includes("authorization") || m.includes("not signed")) {

    return "Session expired. Sign out and sign in again.";

  }

  if (m.includes("accepted") || m.includes("superseded") || m.includes("declined")) {

    return `This offer is no longer available (${message}).`;

  }

  return message;

}



async function invokeOfferAction(offerId: string, action: "accept" | "decline") {

  const auth = await getFunctionsAuthHeaders();

  if ("error" in auth) {

    return { data: null, error: { message: auth.error } };

  }



  return supabase.functions.invoke("lead-offer-action", {

    headers: auth,

    body: { offerId, action },

  });

}



export async function acceptLeadOffer(

  offerId: string,

): Promise<{ success: boolean; lead?: InboundLead; error?: string }> {

  const { data, error } = await invokeOfferAction(offerId, "accept");



  if (error) {

    const raw = await readFunctionsError(error, data);

    return { success: false, error: friendlyOfferError(raw) };

  }



  if (data?.error) {

    return { success: false, error: friendlyOfferError(String(data.error)) };

  }



  void import("../notifications/unreadCount").then(({ markLeadOfferNotificationsRead }) =>
    markLeadOfferNotificationsRead(offerId),
  );

  return { success: true, lead: data?.lead as InboundLead | undefined };

}



export async function declineLeadOffer(

  offerId: string,

): Promise<{ success: boolean; error?: string }> {

  const { data, error } = await invokeOfferAction(offerId, "decline");



  if (error) {

    const raw = await readFunctionsError(error, data);

    return { success: false, error: friendlyOfferError(raw) };

  }



  if (data?.error) {

    return { success: false, error: friendlyOfferError(String(data.error)) };

  }



  void import("../notifications/unreadCount").then(({ markLeadOfferNotificationsRead }) =>
    markLeadOfferNotificationsRead(offerId),
  );

  return { success: true };

}

