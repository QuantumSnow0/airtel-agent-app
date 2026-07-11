/**
 * Fetch assigned inbound lead detail (v1).
 * RLS: only assigned_agent_id = auth user.
 */

import { supabase } from "../supabase";
import type { InboundLead } from "./types";

export async function fetchInboundLeadById(
  leadId: string,
): Promise<{ lead: InboundLead | null; error?: string }> {
  const { data, error } = await supabase
    .from("inbound_leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (error) return { lead: null, error: error.message };
  if (!data) return { lead: null, error: "Lead not found" };
  return { lead: data as InboundLead };
}
