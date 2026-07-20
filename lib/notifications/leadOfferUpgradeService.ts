/**
 * Upgrade hybrid FCM plain banners → rich local notifications (buttons + subtitle).
 * Hybrid push bypasses onMessageReceived on MIUI; heartbeat poll is the reliable backup.
 */

import { AppState, Platform } from "react-native";
import { fetchActiveOffers } from "../services/leadDispatchService";
import type { LeadOffer } from "../dispatch/types";
import { scheduleRichLeadOfferNotification } from "./presentLeadOfferOsNotification";

const UPGRADED_TTL_MS = 10 * 60 * 1000;
const upgradedAt = new Map<string, number>();

function rememberUpgrade(offerId: string): void {
  upgradedAt.set(offerId, Date.now());
  const cutoff = Date.now() - UPGRADED_TTL_MS;
  for (const [id, at] of upgradedAt) {
    if (at < cutoff) upgradedAt.delete(id);
  }
}

function wasRecentlyUpgraded(offerId: string): boolean {
  const at = upgradedAt.get(offerId);
  if (!at) return false;
  return Date.now() - at < UPGRADED_TTL_MS;
}

export function buildLeadOfferPushDataFromOffer(offer: LeadOffer): Record<string, unknown> {
  return {
    type: "LEAD_OFFER",
    offerId: offer.id,
    relatedId: offer.lead_id,
    product: offer.preview_payload?.product,
    metadata: {
      offerId: offer.id,
      preview: offer.preview_payload,
    },
  };
}

/** Schedule rich upgrade once per offer (Realtime, push listener, or heartbeat). */
export function requestRichLeadOfferUpgrade(data: Record<string, unknown>): void {
  if (Platform.OS !== "android") return;
  if (AppState.currentState === "active") return;

  const offerId =
    typeof data.offerId === "string" && data.offerId.trim()
      ? data.offerId.trim()
      : null;
  if (!offerId || wasRecentlyUpgraded(offerId)) return;

  rememberUpgrade(offerId);
  scheduleRichLeadOfferNotification(data);
}

/** Poll DB for fresh offers and upgrade any plain hybrid banner still showing. */
export async function pollAndUpgradePendingLeadOffers(
  agentId: string,
): Promise<void> {
  if (Platform.OS !== "android") return;
  if (AppState.currentState === "active") return;

  const { offers } = await fetchActiveOffers(agentId);
  const cutoff = Date.now() - 5 * 60 * 1000;

  for (const offer of offers) {
    if (wasRecentlyUpgraded(offer.id)) continue;
    const created = new Date(offer.created_at).getTime();
    if (Number.isNaN(created) || created < cutoff) continue;

    requestRichLeadOfferUpgrade(buildLeadOfferPushDataFromOffer(offer));
  }
}
