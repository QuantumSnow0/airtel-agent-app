import type { CustomerRegistrationData } from "./msFormsService";
import { getFunctionsAuthHeaders, supabase } from "../supabase";

export type CompleteLeadRegistrationResult =
  | {
      success: true;
      registrationId: string;
      responseId?: string;
      status: "kyc_completed";
    }
  | { success: false; error: string; retryable?: boolean };

async function extractFailure(
  error: unknown,
  data: unknown,
): Promise<{ error: string; retryable: boolean }> {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    String((data as { error?: unknown }).error ?? "").trim()
  ) {
    return {
      error: String((data as { error?: unknown }).error),
      retryable: Boolean((data as { retryable?: unknown }).retryable),
    };
  }

  const functionError = error as { message?: string; context?: Response };
  if (functionError.context && typeof functionError.context.json === "function") {
    try {
      const body = (await functionError.context.clone().json()) as {
        error?: unknown;
        message?: unknown;
        retryable?: unknown;
      };
      const message = body.error ?? body.message;
      if (message != null) {
        return {
          error: String(message),
          retryable: Boolean(body.retryable),
        };
      }
    } catch {
      // Fall through to the SDK message.
    }
  }
  return {
    error: functionError.message || "Registration submission failed",
    retryable: false,
  };
}

export async function completeLeadRegistration(
  leadId: string,
  customerData: CustomerRegistrationData,
): Promise<CompleteLeadRegistrationResult> {
  const auth = await getFunctionsAuthHeaders();
  if ("error" in auth) return { success: false, error: auth.error };

  const { data, error } = await supabase.functions.invoke(
    "complete-lead-registration",
    {
      headers: auth,
      body: { leadId, customerData },
    },
  );

  if (error) {
    const failure = await extractFailure(error, data);
    return {
      success: false,
      error: failure.error,
      retryable: failure.retryable,
    };
  }
  if (!data?.success) {
    return {
      success: false,
      error: String(data?.error ?? "Registration submission failed"),
      retryable: Boolean(data?.retryable),
    };
  }

  return {
    success: true,
    registrationId: String(data.registrationId),
    responseId: data.responseId ? String(data.responseId) : undefined,
    status: "kyc_completed",
  };
}
