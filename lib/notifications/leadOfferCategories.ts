import * as Notifications from "expo-notifications";
import {
  LEAD_OFFER_ACTION_ACCEPT,
  LEAD_OFFER_ACTION_DECLINE,
  LEAD_OFFER_CATEGORY_ID,
} from "./leadOfferNotification";

/** Always refresh — categories must exist before any push arrives. */
export async function ensureLeadOfferNotificationCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(LEAD_OFFER_CATEGORY_ID, [
    {
      identifier: LEAD_OFFER_ACTION_ACCEPT,
      buttonTitle: "Accept",
      options: { opensAppToForeground: true },
    },
    {
      identifier: LEAD_OFFER_ACTION_DECLINE,
      buttonTitle: "Decline",
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
}
