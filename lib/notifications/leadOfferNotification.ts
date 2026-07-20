/**
 * Material Design 3 lead-offer notification presentation (client).
 */

import {
  capitalizeBrand,
  formatGroupedLeadOfferCopy,
  formatLeadLocation,
  formatLeadQueueLine,
  formatSingleLeadOfferCopy,
  leadOfferNotificationTag,
  LEAD_OFFER_ANDROID_TAG_PREFIX,
  LEAD_OFFER_CATEGORY_ID,
  LEAD_OFFER_RESPONSE_SECONDS,
  providerAccentColor,
  type LeadOfferPreview,
} from "./leadOfferCopy";

export {
  capitalizeBrand,
  formatLeadLocation,
  formatSingleLeadOfferCopy,
  formatGroupedLeadOfferCopy,
  formatLeadQueueLine,
  LEAD_OFFER_ANDROID_TAG_PREFIX,
  LEAD_OFFER_CATEGORY_ID,
  LEAD_OFFER_RESPONSE_SECONDS,
  providerAccentColor,
  leadOfferNotificationTag,
  type LeadOfferPreview,
};

export const LEAD_OFFER_ACTION_ACCEPT = "LEAD_OFFER_ACCEPT";
export const LEAD_OFFER_ACTION_VIEW = "LEAD_OFFER_VIEW";
export const LEAD_OFFER_ACTION_DECLINE = "LEAD_OFFER_DECLINE";
/** @deprecated Use LEAD_OFFER_ACTION_DECLINE */
export const LEAD_OFFER_ACTION_DISMISS = LEAD_OFFER_ACTION_DECLINE;

export function parseLeadOfferPreview(
  raw: unknown,
): LeadOfferPreview | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as LeadOfferPreview;
}

export type LeadOfferNotificationContent = {
  title: string;
  subtitle: string;
  body: string;
  color: string;
  categoryIdentifier: string;
  data: Record<string, unknown>;
};

export function buildLeadOfferNotificationContent(input: {
  preview: LeadOfferPreview;
  offerId?: string;
  notificationId?: string;
  relatedId?: string;
  leadCount?: number;
}): LeadOfferNotificationContent {
  const { preview, offerId, notificationId, relatedId, leadCount = 1 } = input;
  const copy =
    leadCount > 1
      ? formatGroupedLeadOfferCopy([preview])
      : formatSingleLeadOfferCopy(preview);

  return {
    title: copy.title,
    subtitle: copy.subtitle,
    body: copy.message,
    color: copy.accentColor,
    categoryIdentifier: LEAD_OFFER_CATEGORY_ID,
    data: {
      type: "LEAD_OFFER",
      notificationId,
      relatedId,
      offerId,
      subtitle: copy.subtitle,
      categoryId: LEAD_OFFER_CATEGORY_ID,
      color: copy.accentColor,
      metadata: { offerId, preview, leadCount: copy.leadCount },
    },
  };
}
