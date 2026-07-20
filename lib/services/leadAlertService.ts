/**
 * Urgent lead-offer alerts — repeating ping until accept, decline, or expiry.
 * Foreground: in-app sound + haptics. Background: OS reminder notification.
 */

import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { AppState, Platform, Vibration } from "react-native";
import {
  LEAD_OFFER_ALERT_INTERVAL_MS,
  LEAD_OFFER_SOUND_ASSET,
} from "../config/leadAlertConfig";
import { presentLeadOfferReminder } from "./pushNotificationService";

let sound: Audio.Sound | null = null;
let audioModeReady = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let activeOfferId: string | null = null;
let activeExpiresAt: string | null = null;
let repromptModal: (() => void) | null = null;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
  audioModeReady = true;
}

async function unloadSound(): Promise<void> {
  if (!sound) return;
  try {
    await sound.unloadAsync();
  } catch {
    /* ignore */
  }
  sound = null;
}

function vibrateLeadPattern(): void {
  if (Platform.OS !== "android") return;
  Vibration.vibrate([0, 350, 120, 350, 120, 500]);
}

function isOfferExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

/** Single ping — sound + haptics (foreground) or OS reminder (background, repeats only). */
export async function playLeadOfferPing(
  offerId?: string,
  options?: { osReminder?: boolean },
): Promise<void> {
  if (AppState.currentState !== "active") {
    if (offerId && options?.osReminder) {
      void presentLeadOfferReminder(offerId);
    }
    return;
  }

  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  vibrateLeadPattern();

  try {
    await ensureAudioMode();
    await unloadSound();
    const { sound: next } = await Audio.Sound.createAsync(LEAD_OFFER_SOUND_ASSET, {
      shouldPlay: true,
      volume: 1,
    });
    sound = next;
    next.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void next.unloadAsync();
        if (sound === next) sound = null;
      }
    });
  } catch (e) {
    console.warn("Lead offer ping sound failed:", e);
  }
}

/**
 * Repeat alert every LEAD_OFFER_ALERT_INTERVAL_MS until stopLeadOfferAlertLoop()
 * or the offer expires. Re-opens the modal via reprompt if the agent dismissed it.
 */
export function startLeadOfferAlertLoop(
  offerId: string,
  expiresAt: string,
  reprompt?: () => void,
): void {
  if (isOfferExpired(expiresAt)) return;

  if (activeOfferId === offerId && loopTimer) {
    repromptModal = reprompt ?? null;
    return;
  }

  stopLeadOfferAlertLoop();

  activeOfferId = offerId;
  activeExpiresAt = expiresAt;
  repromptModal = reprompt ?? null;

  void playLeadOfferPing(offerId);

  loopTimer = setInterval(() => {
    if (!activeOfferId || !activeExpiresAt) return;

    if (isOfferExpired(activeExpiresAt)) {
      stopLeadOfferAlertLoop();
      return;
    }

    void playLeadOfferPing(activeOfferId, { osReminder: true });
    repromptModal?.();
  }, LEAD_OFFER_ALERT_INTERVAL_MS);
}

export function stopLeadOfferAlertLoop(): void {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  activeOfferId = null;
  activeExpiresAt = null;
  repromptModal = null;
  void unloadSound();
}

/** @deprecated Use stopLeadOfferAlertLoop */
export function resetLeadOfferAlertDedupe(): void {
  stopLeadOfferAlertLoop();
}

export function isLeadOfferAlertLoopActive(offerId?: string): boolean {
  if (!loopTimer || !activeOfferId) return false;
  if (offerId) return activeOfferId === offerId;
  return true;
}
