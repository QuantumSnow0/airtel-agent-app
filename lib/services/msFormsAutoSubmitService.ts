import { supabase } from "../supabase";

export type AutoSubmitResult =
  | { ok: true; skipped: true; reason: string }
  | { ok: true; skipped: false; responseId?: string }
  | { ok: false; error: string };

export type MSFormsSyncResult = {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isAutoMSFormsMode(): Promise<boolean> {
  const { data, error } = await supabase
    .from("ms_forms_config")
    .select("submission_mode")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("ms_forms_config read failed:", error.message);
    return false;
  }
  return data?.submission_mode === "auto";
}

/**
 * When ms_forms_config.submission_mode is "auto", submit a saved registration
 * to Microsoft Forms. No-op in manual mode.
 */
export async function maybeAutoSubmitToMSForms(
  registrationId: string
): Promise<AutoSubmitResult> {
  try {
    if (!(await isAutoMSFormsMode())) {
      return { ok: true, skipped: true, reason: "manual_mode" };
    }

    const { data, error } = await supabase.functions.invoke(
      "auto-submit-ms-forms",
      { body: { registrationId } }
    );

    if (error) {
      console.warn("auto-submit-ms-forms invoke error:", error.message);
      return { ok: false, error: error.message };
    }

    if (data?.skipped) {
      return {
        ok: true,
        skipped: true,
        reason: String(data.reason ?? "skipped"),
      };
    }

    if (!data?.success) {
      return {
        ok: false,
        error: String(data?.error ?? "Auto-submit failed"),
      };
    }

    return {
      ok: true,
      skipped: false,
      responseId: data.responseId as string | undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Auto-submit failed";
    console.warn("maybeAutoSubmitToMSForms:", message);
    return { ok: false, error: message };
  }
}

/** Retry auto-submit a few times (MS Forms can be slow or briefly fail). */
export async function maybeAutoSubmitToMSFormsWithRetry(
  registrationId: string,
  attempts = MAX_ATTEMPTS
): Promise<AutoSubmitResult> {
  let last: AutoSubmitResult = { ok: false, error: "Auto-submit failed" };

  for (let attempt = 0; attempt < attempts; attempt++) {
    last = await maybeAutoSubmitToMSForms(registrationId);
    if (last.ok) return last;
    if (attempt < attempts - 1) {
      await sleep(RETRY_DELAY_MS);
    }
  }

  return last;
}

/**
 * Submit all of this agent's cloud registrations that are not yet in MS Forms
 * (when automatic mode is on). Used after offline sync and on manual "Sync all".
 */
export async function syncPendingMSFormsForAgent(
  agentId: string,
  onProgress?: (current: number, total: number) => void
): Promise<MSFormsSyncResult> {
  const result: MSFormsSyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (!(await isAutoMSFormsMode())) {
    return result;
  }

  const { data: rows, error } = await supabase
    .from("customer_registrations")
    .select("id, customer_name")
    .eq("agent_id", agentId)
    .eq("commission_exempt", false)
    .is("ms_forms_response_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, synced: 0, failed: 0, errors: [error.message] };
  }

  const pending = rows ?? [];
  const total = pending.length;

  for (let i = 0; i < pending.length; i++) {
    const row = pending[i];
    onProgress?.(i + 1, total);

    const submit = await maybeAutoSubmitToMSFormsWithRetry(row.id);
    if (submit.ok && !submit.skipped) {
      result.synced++;
    } else if (!submit.ok) {
      result.failed++;
      result.errors.push(
        `${row.customer_name ?? row.id}: ${submit.error ?? "Failed"}`
      );
    }
  }

  result.success = result.failed === 0;
  return result;
}
