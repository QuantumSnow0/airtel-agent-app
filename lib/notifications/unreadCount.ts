import { supabase } from "../supabase";

/** Lead offers have their own Leads-tab badge / modal — exclude from the home bell. */
const BELL_EXCLUDED_TYPES = ["LEAD_OFFER"] as const;

/**
 * Unread count for the dashboard notification bell.
 * Only counts notifications the agent hasn't opened yet, excluding lead-offer rows.
 */
export async function fetchUnreadNotificationBellCount(
  agentId: string,
): Promise<number> {
  // Lead offers use the Leads tab badge — keep them off the home bell.
  let query = supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("is_read", false);

  for (const type of BELL_EXCLUDED_TYPES) {
    query = query.neq("type", type);
  }

  const { count, error } = await query;

  if (error) {
    console.error("Error loading unread notification count:", error);
    return 0;
  }

  return count ?? 0;
}

/** Mark every unread notification for this agent as read. */
export async function markAllNotificationsRead(
  agentId: string,
  options?: { excludeSpotlightKinds?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  if (!options?.excludeSpotlightKinds) {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq("agent_id", agentId)
      .eq("is_read", false);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  // Keep meeting / urgent home spotlight items unread until dismissed on Home.
  const { data, error: selectError } = await supabase
    .from("notifications")
    .select("id, type, metadata")
    .eq("agent_id", agentId)
    .eq("is_read", false)
    .limit(200);

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const ids = (data ?? [])
    .filter((row) => {
      if (row.type !== "SYSTEM_ANNOUNCEMENT") return true;
      const kind = String(
        (row.metadata as Record<string, unknown> | null)?.kind ?? "",
      ).toLowerCase();
      return kind !== "meeting" && kind !== "urgent";
    })
    .map((row) => row.id);

  if (ids.length === 0) return { ok: true };

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Mark LEAD_OFFER notification rows for a given offer as read. */
export async function markLeadOfferNotificationsRead(
  offerId: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rows } = await supabase
      .from("notifications")
      .select("id, metadata")
      .eq("agent_id", user.id)
      .eq("type", "LEAD_OFFER")
      .eq("is_read", false)
      .limit(40);

    const ids = (rows ?? [])
      .filter((row) => {
        const meta = (row.metadata ?? {}) as Record<string, unknown>;
        return String(meta.offerId ?? "") === offerId;
      })
      .map((row) => row.id);

    if (ids.length === 0) return;

    await supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in("id", ids);
  } catch (e) {
    console.warn("markLeadOfferNotificationsRead failed:", e);
  }
}
