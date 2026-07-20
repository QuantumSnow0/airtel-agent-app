/**
 * Bridges push / realtime events → LeadDispatchManager modal (v1).
 * Avoids coupling pushNotificationService to React components.
 */

export type LeadOfferPromptHandler = (offerId: string | null) => void;
export type LeadOfferQueueRefreshHandler = (
  preferredOfferId: string | null,
  silent?: boolean,
) => void;

const handlers = new Set<LeadOfferPromptHandler>();
const refreshHandlers = new Set<LeadOfferQueueRefreshHandler>();
let pendingPrompt: string | null | undefined;

export function subscribeToLeadOfferPrompts(
  handler: LeadOfferPromptHandler,
): () => void {
  handlers.add(handler);
  if (pendingPrompt !== undefined) {
    const offerId = pendingPrompt;
    pendingPrompt = undefined;
    try {
      handler(offerId);
    } catch (e) {
      console.warn("leadOfferBridge pending prompt error:", e);
    }
  }
  return () => handlers.delete(handler);
}

/** offerId null → fetch latest active offer */
export function promptLeadOfferModal(offerId: string | null): void {
  if (handlers.size === 0) {
    pendingPrompt = offerId;
    return;
  }
  for (const handler of handlers) {
    try {
      handler(offerId);
    } catch (e) {
      console.warn("leadOfferBridge handler error:", e);
    }
  }
}

/** Refresh queue after accept/decline from notification shade. silent=true hides modal. */
export function refreshLeadOfferQueue(
  preferredOfferId: string | null = null,
  silent = false,
): void {
  for (const handler of refreshHandlers) {
    try {
      handler(preferredOfferId, silent);
    } catch (e) {
      console.warn("leadOfferBridge refresh handler error:", e);
    }
  }
}

export function subscribeToLeadOfferQueueRefresh(
  handler: LeadOfferQueueRefreshHandler,
): () => void {
  refreshHandlers.add(handler);
  return () => refreshHandlers.delete(handler);
}

function parseMetadata(
  raw: unknown,
): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return null;
}

export function extractOfferIdFromPushData(
  data: Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  const meta = parseMetadata(data.metadata);
  if (meta?.offerId != null && String(meta.offerId).trim()) {
    return String(meta.offerId).trim();
  }
  if (data.offerId != null && String(data.offerId).trim()) {
    return String(data.offerId).trim();
  }
  return null;
}

export function isLeadOfferNotificationData(
  data: Record<string, unknown> | null | undefined,
): boolean {
  return data?.type === "LEAD_OFFER";
}
