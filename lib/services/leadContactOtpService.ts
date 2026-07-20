import { getFunctionsAuthHeaders, supabase } from "../supabase";

type FunctionError = {
  message?: string;
  context?: Response;
};

async function extractFunctionError(
  error: FunctionError,
  data: unknown,
): Promise<string> {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    String((data as { error?: unknown }).error ?? "").trim()
  ) {
    return String((data as { error?: unknown }).error);
  }

  const context = error.context;
  if (context && typeof context.json === "function") {
    try {
      const body = (await context.clone().json()) as {
        error?: unknown;
        message?: unknown;
      };
      if (body.error != null) return String(body.error);
      if (body.message != null) return String(body.message);
    } catch {
      // Use the SDK message below.
    }
  }
  return error.message || "Request failed";
}

export type SendLeadContactOtpResult =
  | {
      success: true;
      alreadyVerified?: boolean;
      maskedPhone?: string;
      expiresInSeconds?: number;
      resendAfterSeconds?: number;
      verifiedAt?: string;
    }
  | { success: false; error: string; retryAfterSeconds?: number };

export async function sendLeadContactOtp(
  leadId: string,
): Promise<SendLeadContactOtpResult> {
  const auth = await getFunctionsAuthHeaders();
  if ("error" in auth) return { success: false, error: auth.error };

  const { data, error } = await supabase.functions.invoke(
    "send-lead-contact-otp",
    {
      headers: auth,
      body: { leadId },
    },
  );

  if (error) {
    return {
      success: false,
      error: await extractFunctionError(error as FunctionError, data),
      retryAfterSeconds:
        data?.retryAfterSeconds != null
          ? Number(data.retryAfterSeconds)
          : undefined,
    };
  }
  if (data?.error) return { success: false, error: String(data.error) };

  return {
    success: true,
    alreadyVerified: Boolean(data?.alreadyVerified),
    maskedPhone: data?.maskedPhone ? String(data.maskedPhone) : undefined,
    expiresInSeconds:
      data?.expiresInSeconds != null
        ? Number(data.expiresInSeconds)
        : undefined,
    resendAfterSeconds:
      data?.resendAfterSeconds != null
        ? Number(data.resendAfterSeconds)
        : undefined,
    verifiedAt: data?.verifiedAt ? String(data.verifiedAt) : undefined,
  };
}

export type VerifyLeadContactOtpResult =
  | {
      success: true;
      alreadyVerified?: boolean;
      verifiedAt?: string;
    }
  | { success: false; error: string; attemptsRemaining?: number };

export async function verifyLeadContactOtp(
  leadId: string,
  code: string,
): Promise<VerifyLeadContactOtpResult> {
  const auth = await getFunctionsAuthHeaders();
  if ("error" in auth) return { success: false, error: auth.error };

  const { data, error } = await supabase.functions.invoke(
    "verify-lead-contact-otp",
    {
      headers: auth,
      body: { leadId, code },
    },
  );

  if (error) {
    return {
      success: false,
      error: await extractFunctionError(error as FunctionError, data),
      attemptsRemaining:
        data?.attemptsRemaining != null
          ? Number(data.attemptsRemaining)
          : undefined,
    };
  }
  if (data?.error) return { success: false, error: String(data.error) };

  return {
    success: true,
    alreadyVerified: Boolean(data?.alreadyVerified),
    verifiedAt: data?.verifiedAt ? String(data.verifiedAt) : undefined,
  };
}
