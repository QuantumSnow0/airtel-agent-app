import { supabase } from "../supabase";
import type { AirtelConnectSubmitPayload } from "./airtelConnectRegistrationPayload";

export type { AirtelConnectSubmitPayload } from "./airtelConnectRegistrationPayload";
export {
  buildSubmitPayload,
  createClientHandoffId,
} from "./airtelConnectRegistrationPayload";

export type AirtelConnectSubmitResult =
  | {
      success: true;
      registrationId: string;
      idempotentReplay: boolean;
    }
  | {
      success: false;
      error: string;
      retryable: boolean;
    };

/**
 * Save Airtel Connect registration via Edge Function (idempotent on clientHandoffId).
 */
export async function submitAirtelConnectRegistration(
  payload: AirtelConnectSubmitPayload,
): Promise<AirtelConnectSubmitResult> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "submit-airtel-connect-registration",
      { body: payload },
    );

    if (error) {
      return {
        success: false,
        error: error.message || "Could not save registration",
        retryable: true,
      };
    }

    if (!data?.success || !data?.registrationId) {
      return {
        success: false,
        error: String(data?.error ?? "Registration save failed"),
        retryable: data?.mode !== "legacy_wam",
      };
    }

    return {
      success: true,
      registrationId: String(data.registrationId),
      idempotentReplay: Boolean(data.idempotentReplay),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
      retryable: true,
    };
  }
}

export type HandoffStatus = "launched" | "play_store" | "failed";

/** Record external handoff outcome without creating a new registration. */
export async function recordAirtelConnectHandoff(
  registrationId: string,
  status: HandoffStatus,
): Promise<void> {
  const { error } = await supabase
    .from("customer_registrations")
    .update({
      airtel_connect_handoff_at: new Date().toISOString(),
      airtel_connect_handoff_status: status,
    })
    .eq("id", registrationId);

  if (error) {
    console.warn("recordAirtelConnectHandoff:", error.message);
  }
}

/** Agent follow-up: save Airtel Connect Order ID for payment. */
export async function updateAirtelConnectOrderId(
  registrationId: string,
  orderId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const trimmed = orderId.trim();
  if (trimmed.length < 3) {
    return { success: false, error: "Enter a valid Airtel Connect Order ID" };
  }

  const { error } = await supabase
    .from("customer_registrations")
    .update({ airtel_connect_order_id: trimmed })
    .eq("id", registrationId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
