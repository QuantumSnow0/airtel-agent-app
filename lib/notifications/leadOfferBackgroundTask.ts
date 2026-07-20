/**
 * Background push + action handling (Decline without opening the app).
 */

import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { extractOfferIdFromPushData } from "../dispatch/leadOfferBridge";
import { declineLeadOffer } from "../services/leadOfferActionService";
import {
  dismissLeadOfferOsNotification,
} from "./presentLeadOfferOsNotification";
import { requestRichLeadOfferUpgrade } from "./leadOfferUpgradeService";
import { extractLeadOfferPushData } from "./extractLeadOfferPushData";
import { LEAD_OFFER_ACTION_DECLINE } from "./leadOfferNotification";

export const LEAD_OFFER_BACKGROUND_NOTIFICATION_TASK =
  "LEAD_OFFER_BACKGROUND_NOTIFICATION_TASK";

function leadDataFromActionPayload(
  taskData: Record<string, unknown>,
): Record<string, unknown> | null {
  const notification = taskData.notification as
    | Record<string, unknown>
    | undefined;
  const request = notification?.request as Record<string, unknown> | undefined;
  const content = request?.content as Record<string, unknown> | undefined;
  const contentData = content?.data as Record<string, unknown> | undefined;
  return contentData ?? null;
}

TaskManager.defineTask(
  LEAD_OFFER_BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (Platform.OS !== "android") return;
    if (error) {
      console.warn("[lead-bg-task] error:", error);
      return;
    }
    if (!data || typeof data !== "object") return;

    const payload = data as Record<string, unknown>;

    if ("actionIdentifier" in payload) {
      const actionId = String(payload.actionIdentifier ?? "");
      if (actionId !== LEAD_OFFER_ACTION_DECLINE) return;

      const leadData = leadDataFromActionPayload(payload);
      const offerId = leadData ? extractOfferIdFromPushData(leadData) : null;
      if (!offerId) return;

      const notification = payload.notification as
        | Record<string, unknown>
        | undefined;
      const request = notification?.request as Record<string, unknown> | undefined;
      const requestId =
        typeof request?.identifier === "string" ? request.identifier : null;

      try {
        await declineLeadOffer(offerId);
        if (requestId) {
          await Notifications.dismissNotificationAsync(requestId);
        }
        await dismissLeadOfferOsNotification(offerId);
      } catch (e) {
        console.warn("[lead-bg-task] decline failed:", e);
      }
      return;
    }

    const pushData = extractLeadOfferPushData(payload);
    if (pushData) {
      requestRichLeadOfferUpgrade(pushData);
      return;
    }
  },
);

export async function registerLeadOfferBackgroundNotificationTask(): Promise<void> {
  if (Platform.OS !== "android") return;

  try {
    const registered = await TaskManager.isTaskRegisteredAsync(
      LEAD_OFFER_BACKGROUND_NOTIFICATION_TASK,
    );
    if (!registered) {
      await Notifications.registerTaskAsync(
        LEAD_OFFER_BACKGROUND_NOTIFICATION_TASK,
      );
    }
  } catch (e) {
    console.warn("Lead-offer background notification task unavailable:", e);
  }
}
