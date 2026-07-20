/**
 * Builds Expo push payloads for lead-offer notifications (MD3).
 *
 * Android: hybrid payload (top-level title/body so FCM is never blank) + full `data` for
 * native builder / background task. Rich UI (logo + buttons) comes from a local notification
 * scheduled on Realtime INSERT (background) or the background push task (headless path).
 *
 * NEVER set richContent.image — FCM uses it as a BigPicture banner when expanded.
 */

import {
  formatSingleLeadOfferCopy,
  leadOfferNotificationTag,
  LEAD_OFFER_CATEGORY_ID,
  type LeadOfferPreview,
} from "./lead-offer-notification-copy.ts";

export type PendingLeadOfferRow = {
  metadata?: { preview?: LeadOfferPreview; offerId?: string } | null;
};

export function buildLeadOfferPushCopy(
  _pendingRows: PendingLeadOfferRow[],
  latestPreview: LeadOfferPreview,
  pendingCount: number,
): ReturnType<typeof formatSingleLeadOfferCopy> {
  const copy = formatSingleLeadOfferCopy(latestPreview);
  copy.leadCount = Math.max(1, pendingCount);
  return copy;
}

function buildLeadOfferDataPayload(input: {
  notificationId: string;
  relatedId?: string;
  offerId?: string;
  preview: LeadOfferPreview;
  copy: ReturnType<typeof formatSingleLeadOfferCopy>;
  leadOfferChannelId: string;
  leadSound: string;
}): Record<string, string> {
  const {
    notificationId,
    relatedId,
    offerId,
    preview,
    copy,
    leadOfferChannelId,
    leadSound,
  } = input;

  return {
    type: "LEAD_OFFER",
    product: copy.product,
    notificationId,
    relatedId: relatedId ?? "",
    offerId: offerId ?? "",
    title: copy.title,
    message: copy.message,
    body: copy.message,
    subtitle: copy.subtitle,
    categoryId: LEAD_OFFER_CATEGORY_ID,
    channelId: leadOfferChannelId,
    sound: leadSound,
    color: copy.accentColor,
    metadata: JSON.stringify({
      offerId,
      preview,
      leadCount: copy.leadCount,
    }),
  };
}

export function buildLeadOfferExpoPushPayload(input: {
  token: string;
  deviceType: string;
  notificationId: string;
  relatedId?: string;
  offerId?: string;
  preview: LeadOfferPreview;
  copy: ReturnType<typeof formatSingleLeadOfferCopy>;
  leadOfferChannelId: string;
  leadSound: string;
}): Record<string, unknown> {
  const {
    token,
    deviceType,
    notificationId,
    relatedId,
    offerId,
    preview,
    copy,
    leadOfferChannelId,
    leadSound,
  } = input;

  const tag = offerId ? leadOfferNotificationTag(offerId) : "wam_lead_offer";
  const data = buildLeadOfferDataPayload({
    notificationId,
    relatedId,
    offerId,
    preview,
    copy,
    leadOfferChannelId,
    leadSound,
  });

  if (deviceType !== "ios") {
    return {
      to: token,
      priority: "high",
      tag,
      title: copy.title,
      body: copy.message,
      subtitle: copy.subtitle,
      sound: leadSound,
      channelId: leadOfferChannelId,
      categoryId: LEAD_OFFER_CATEGORY_ID,
      data: {
        ...data,
        tag,
      },
    };
  }

  return {
    to: token,
    sound: leadSound,
    title: copy.title,
    body: copy.message,
    subtitle: copy.subtitle,
    data,
    badge: 1,
    priority: "high",
    categoryId: LEAD_OFFER_CATEGORY_ID,
    tag,
  };
}
