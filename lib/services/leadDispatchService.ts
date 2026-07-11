/**
 * Lead dispatch — availability, offers, assigned leads (v1).
 * Direct Supabase reads/writes where RLS allows; mutations via edge functions.
 */

import { supabase } from "../supabase";
import type { InboundLead, LeadOffer, LeadOfferPreview } from "../dispatch/types";

export type DispatchConfig = {
  offer_timeout_minutes: number;
  sla_hours: number;
  max_open_leads_per_agent: number;
};

function mapOffer(row: Record<string, unknown>): LeadOffer {
  return {
    id: String(row.id),
    lead_id: String(row.lead_id),
    status: row.status as LeadOffer["status"],
    preview_payload: (row.preview_payload ?? {}) as LeadOfferPreview,
    expires_at: String(row.expires_at),
    created_at: String(row.created_at),
    distance_km: row.distance_km as number | null | undefined,
  };
}

/** Read global dispatch knobs for UI countdowns. */
export async function fetchDispatchConfig(): Promise<DispatchConfig> {
  const defaults: DispatchConfig = {
    offer_timeout_minutes: 15,
    sla_hours: 24,
    max_open_leads_per_agent: 3,
  };

  const { data } = await supabase
    .from("dispatch_config")
    .select("offer_timeout_minutes, sla_hours, max_open_leads_per_agent")
    .limit(1)
    .maybeSingle();

  if (!data) return defaults;
  return {
    offer_timeout_minutes: data.offer_timeout_minutes ?? defaults.offer_timeout_minutes,
    sla_hours: data.sla_hours ?? defaults.sla_hours,
    max_open_leads_per_agent:
      data.max_open_leads_per_agent ?? defaults.max_open_leads_per_agent,
  };
}

/** Whether agent receives inbound offers (agent_dispatch_settings). */
export async function fetchDispatchAvailability(
  agentId: string,
): Promise<{ isAvailable: boolean; canReceiveLeads: boolean }> {
  const { data: agent } = await supabase
    .from("agents")
    .select("lead_dispatch_scope, status")
    .eq("id", agentId)
    .maybeSingle();

  const scope = agent?.lead_dispatch_scope ?? "both";
  const canReceiveLeads =
    agent?.status === "approved" && scope !== "none";

  const { data: settings } = await supabase
    .from("agent_dispatch_settings")
    .select("is_available")
    .eq("agent_id", agentId)
    .maybeSingle();

  return {
    isAvailable: settings?.is_available ?? false,
    canReceiveLeads,
  };
}

/** Toggle "Available for leads" — creates settings row if missing. */
export async function setDispatchAvailability(
  agentId: string,
  isAvailable: boolean,
): Promise<{ success: boolean; error?: string }> {
  const now = new Date().toISOString();
  const { error } = await supabase.from("agent_dispatch_settings").upsert(
    {
      agent_id: agentId,
      is_available: isAvailable,
      last_available_at: isAvailable ? now : undefined,
      updated_at: now,
    },
    { onConflict: "agent_id" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Active blind offers for this agent. */
export async function fetchActiveOffers(
  agentId: string,
): Promise<{ offers: LeadOffer[]; error?: string }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("lead_offers")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "offered")
    .gt("expires_at", now)
    .order("expires_at", { ascending: true });

  if (error) return { offers: [], error: error.message };
  return { offers: (data ?? []).map(mapOffer) };
}

/** Leads assigned to this agent (post-accept). */
export async function fetchAssignedLeads(
  agentId: string,
): Promise<{ leads: InboundLead[]; error?: string }> {
  const { data, error } = await supabase
    .from("inbound_leads")
    .select("*")
    .eq("assigned_agent_id", agentId)
    .in("status", [
      "assigned",
      "kyc_in_progress",
      "kyc_completed",
      "installed",
    ])
    .order("updated_at", { ascending: false });

  if (error) return { leads: [], error: error.message };
  return { leads: (data ?? []) as InboundLead[] };
}

/** Single offer by id (must belong to agent). */
export async function fetchOfferById(
  agentId: string,
  offerId: string,
): Promise<{ offer: LeadOffer | null; error?: string }> {
  const { data, error } = await supabase
    .from("lead_offers")
    .select("*")
    .eq("id", offerId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error) return { offer: null, error: error.message };
  if (!data) return { offer: null };
  return { offer: mapOffer(data) };
}
