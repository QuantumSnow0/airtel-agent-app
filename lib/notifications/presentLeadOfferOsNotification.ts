/**
 * Present lead-offer OS notifications locally so Android action buttons work.
 * Remote FCM pushes often skip registered categories — local notifications don't.
 */

import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { PUSH_LEAD_OFFER_SOUND_FILENAME, ANDROID_LEAD_OFFER_CHANNEL_ID } from "../config/leadAlertConfig";
import { extractOfferIdFromPushData } from "../dispatch/leadOfferBridge";
import {
  formatSingleLeadOfferCopy,
  leadOfferNotificationTag,
  LEAD_OFFER_CATEGORY_ID,
  type LeadOfferPreview,
} from "./leadOfferCopy";
import { ensureLeadOfferNotificationCategory } from "./leadOfferCategories";
import { ensureAndroidLeadOfferChannel } from "./leadOfferChannel";

/** Hybrid FCM plays sound first; wait before upgrading the same tag to rich UI + buttons. */
const RICH_UPGRADE_DELAYS_MS = [1_500, 4_000, 7_000, 12_000];

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (raw == null) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

export async function presentLeadOfferOsNotification(
  data: Record<string, unknown>,
  options?: { force?: boolean; upgradeOnly?: boolean },
): Promise<void> {
  if (Platform.OS !== "android") return;
  if (!options?.force && AppState.currentState === "active") return;

  const offerId = extractOfferIdFromPushData(data);
  if (!offerId) return;

  const upgradeOnly = options?.upgradeOnly === true;

  if (upgradeOnly) {
    await dismissLeadOfferOsNotification(offerId);
  }

  const meta = parseMetadata(data.metadata);
  const preview = (meta.preview ?? {}) as LeadOfferPreview;
  const copy = formatSingleLeadOfferCopy(preview);
  const product =
    typeof data.product === "string" && data.product.trim()
      ? data.product.trim()
      : copy.product;
  const title =
    typeof data.title === "string" && data.title.trim()
      ? data.title.trim()
      : copy.title;
  const subtitle =
    typeof data.subtitle === "string" && data.subtitle.trim()
      ? data.subtitle.trim()
      : copy.subtitle;
  const message =
    typeof data.message === "string" && data.message.trim()
      ? data.message.trim()
      : copy.message;

  await ensureLeadOfferNotificationCategory();
  await ensureAndroidLeadOfferChannel();

  await Notifications.scheduleNotificationAsync({
    identifier: leadOfferNotificationTag(offerId),
    content: {
      title,
      subtitle,
      body: message,
      ...(upgradeOnly ? {} : { sound: PUSH_LEAD_OFFER_SOUND_FILENAME }),
      categoryIdentifier: LEAD_OFFER_CATEGORY_ID,
      color: copy.accentColor,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: "LEAD_OFFER",
        product,
        offerId,
        notificationId: data.notificationId,
        relatedId: data.relatedId,
        categoryId: LEAD_OFFER_CATEGORY_ID,
        metadata: meta,
      },
      ...(Platform.OS === "android"
        ? { channelId: ANDROID_LEAD_OFFER_CHANNEL_ID }
        : {}),
    },
    trigger: null,
  });
}

export function scheduleRichLeadOfferNotification(
  data: Record<string, unknown>,
): void {
  for (const delayMs of RICH_UPGRADE_DELAYS_MS) {
    setTimeout(() => {
      void presentLeadOfferOsNotification(data, {
        force: true,
        upgradeOnly: true,
      });
    }, delayMs);
  }
}

export async function dismissLeadOfferOsNotification(
  offerId: string,
): Promise<void> {
  const tag = leadOfferNotificationTag(offerId);

  try {
    await Notifications.dismissNotificationAsync(tag);
  } catch {
    // Already cleared.
  }

  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      const data = notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (
        notification.request.identifier === tag ||
        extractOfferIdFromPushData(data ?? {}) === offerId
      ) {
        await Notifications.dismissNotificationAsync(
          notification.request.identifier,
        );
      }
    }
  } catch {
    // Shade may be unavailable in headless context.
  }
}
