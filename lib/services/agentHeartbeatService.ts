/**
 * Presence heartbeat — keeps last_seen_at fresh so dispatch prefers online agents.
 * Also triggers server-side offer expiry sweep (no cron).
 */

import { AppState, type AppStateStatus } from "react-native";
import { supabase } from "../supabase";
import {
  activateAgentNotifications,
  getDeviceToken,
  registerDeviceToken,
} from "./pushNotificationService";
import { pollAndUpgradePendingLeadOffers } from "../notifications/leadOfferUpgradeService";

const FOREGROUND_HEARTBEAT_MS = 60_000;
/** Slower in background — keeps push token + presence fresh on MIUI. */
const BACKGROUND_HEARTBEAT_MS = 60_000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let activeAgentId: string | null = null;

async function pingHeartbeat(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return;

  try {
    await supabase.functions.invoke("agent-heartbeat", { body: {} });
  } catch (err) {
    console.warn("agent-heartbeat failed:", err);
  }

  // Keep push token + Realtime subscriptions fresh so offers reach this device.
  void activateAgentNotifications(session.user.id);
  void pollAndUpgradePendingLeadOffers(session.user.id);
  const token = await getDeviceToken(8_000);
  if (token) {
    await registerDeviceToken(session.user.id, token);
  }
}

function stopInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startInterval(periodMs: number) {
  stopInterval();
  void pingHeartbeat();
  intervalId = setInterval(() => {
    void pingHeartbeat();
  }, periodMs);
}

function onAppStateChange(next: AppStateStatus) {
  if (!activeAgentId) return;
  const period =
    next === "active" ? FOREGROUND_HEARTBEAT_MS : BACKGROUND_HEARTBEAT_MS;
  startInterval(period);
  if (next !== "active") {
    void pollAndUpgradePendingLeadOffers(activeAgentId);
  }
}

/** Start heartbeat while agent is signed in (continues in background, slower). */
export function startAgentHeartbeat(agentId: string) {
  if (activeAgentId === agentId && intervalId) return;
  activeAgentId = agentId;

  if (!appStateSub) {
    appStateSub = AppState.addEventListener("change", onAppStateChange);
  }

  const period =
    AppState.currentState === "active"
      ? FOREGROUND_HEARTBEAT_MS
      : BACKGROUND_HEARTBEAT_MS;
  startInterval(period);
}

export function stopAgentHeartbeat() {
  activeAgentId = null;
  stopInterval();
  appStateSub?.remove();
  appStateSub = null;
}
