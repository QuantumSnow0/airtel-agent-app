import { supabase } from "../supabase";

export type AgentPaymentRow = {
  id: string;
  amount_ksh: number;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export async function fetchAgentPaymentHistory(
  agentId: string
): Promise<{ payments: AgentPaymentRow[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("agent_payments")
      .select("id, amount_ksh, reference, notes, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (error) {
      return { payments: [], error: error.message };
    }

    return {
      payments: (data ?? []).map((row) => ({
        id: row.id,
        amount_ksh: Number(row.amount_ksh ?? 0),
        reference: row.reference ?? null,
        notes: row.notes ?? null,
        created_at: row.created_at,
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { payments: [], error: message };
  }
}
