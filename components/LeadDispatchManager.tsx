/**
 * Global lead-offer listener (v1).
 * Shows modal when a new offer arrives while the app is open.
 *
 * Multiple pending offers are queued — after accept/decline/expiry the next opens.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  fetchActiveOffers,
  fetchOfferById,
} from "../lib/services/leadDispatchService";
import type { LeadOffer } from "../lib/dispatch/types";
import {
  subscribeToLeadOfferPrompts,
  subscribeToLeadOfferQueueRefresh,
} from "../lib/dispatch/leadOfferBridge";
import {
  startLeadOfferAlertLoop,
  stopLeadOfferAlertLoop,
} from "../lib/services/leadAlertService";
import {
  startAgentHeartbeat,
  stopAgentHeartbeat,
} from "../lib/services/agentHeartbeatService";
import { dismissLeadOfferOsNotification } from "../lib/notifications/presentLeadOfferOsNotification";
import {
  buildLeadOfferPushDataFromOffer,
  requestRichLeadOfferUpgrade,
} from "../lib/notifications/leadOfferUpgradeService";
import { activateAgentNotifications } from "../lib/services/pushNotificationService";
import { LeadOfferModal } from "./LeadOfferModal";

type LeadDispatchManagerProps = {
  pendingOfferId?: string | null;
  onPendingOfferHandled?: () => void;
};

function rowToOffer(row: Record<string, unknown>): LeadOffer {
  return {
    id: String(row.id),
    lead_id: String(row.lead_id),
    status: row.status as LeadOffer["status"],
    preview_payload: (row.preview_payload ?? {}) as LeadOffer["preview_payload"],
    expires_at: String(row.expires_at),
    created_at: String(row.created_at),
    distance_km: row.distance_km as number | null,
  };
}

function isOfferLive(offer: LeadOffer): boolean {
  return (
    offer.status === "offered" &&
    new Date(offer.expires_at).getTime() > Date.now()
  );
}

export function LeadDispatchManager({
  pendingOfferId,
  onPendingOfferHandled,
}: LeadDispatchManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [modalOffer, setModalOffer] = useState<LeadOffer | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const agentIdRef = useRef<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const offerQueueRef = useRef<LeadOffer[]>([]);
  const modalVisibleRef = useRef(false);
  const pendingPromptRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    modalVisibleRef.current = modalVisible;
  }, [modalVisible]);

  const syncQueueState = useCallback((queue: LeadOffer[], index: number) => {
    offerQueueRef.current = queue;
    setQueueTotal(queue.length);
    setQueueIndex(queue.length > 0 ? index + 1 : 0);
  }, []);

  const presentQueueOffer = useCallback(
    (queue: LeadOffer[], index: number) => {
      if (AppState.currentState !== "active") return;

      const offer = queue[index];
      if (!offer || !isOfferLive(offer)) return;

      syncQueueState(queue, index);
      setModalOffer(offer);
      setModalVisible(true);

      startLeadOfferAlertLoop(offer.id, offer.expires_at, () => {
        setModalOffer((current) => current ?? offer);
        setModalVisible(true);
      });
    },
    [syncQueueState],
  );

  const clearOffer = useCallback(() => {
    stopLeadOfferAlertLoop();
    setModalVisible(false);
    setModalOffer(null);
    offerQueueRef.current = [];
    setQueueTotal(0);
    setQueueIndex(0);
  }, []);

  const refreshAndPresentQueue = useCallback(
    async (agentId: string, preferredOfferId?: string | null) => {
      const { offers } = await fetchActiveOffers(agentId);
      let live = offers.filter(isOfferLive);

      if (live.length === 0 && preferredOfferId) {
        const { offer } = await fetchOfferById(agentId, preferredOfferId);
        if (offer && isOfferLive(offer)) {
          live = [offer];
        }
      }

      if (live.length === 0) {
        clearOffer();
        return;
      }

      let startIndex = 0;
      if (preferredOfferId) {
        const idx = live.findIndex((o) => o.id === preferredOfferId);
        if (idx >= 0) startIndex = idx;
      }

      const rotated = [
        ...live.slice(startIndex),
        ...live.slice(0, startIndex),
      ];
      presentQueueOffer(rotated, 0);
    },
    [clearOffer, presentQueueOffer],
  );

  const advanceQueue = useCallback(async () => {
    const agentId = agentIdRef.current;
    if (!agentId) {
      clearOffer();
      return;
    }

    if (modalOffer?.id) {
      void dismissLeadOfferOsNotification(modalOffer.id);
    }

    await refreshAndPresentQueue(agentId);
    if (offerQueueRef.current.length === 0) {
      clearOffer();
    }
  }, [clearOffer, modalOffer?.id, refreshAndPresentQueue]);

  const silentRefreshQueue = useCallback(
    async (agentId: string) => {
      stopLeadOfferAlertLoop();
      const { offers } = await fetchActiveOffers(agentId);
      const live = offers.filter(isOfferLive);
      offerQueueRef.current = live;
      setQueueTotal(live.length);
      setQueueIndex(0);
      setModalVisible(false);
      setModalOffer(null);
    },
    [],
  );

  const openOfferById = useCallback(
    async (agentId: string, offerId: string) => {
      await refreshAndPresentQueue(agentId, offerId);
    },
    [refreshAndPresentQueue],
  );

  const handlePrompt = useCallback(
    async (offerId: string | null) => {
      const agentId = agentIdRef.current;
      if (!agentId) {
        pendingPromptRef.current = offerId;
        return;
      }
      pendingPromptRef.current = undefined;

      await refreshAndPresentQueue(agentId, offerId ?? undefined);
      if (offerQueueRef.current.length === 0 && offerId) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        await refreshAndPresentQueue(agentId, offerId);
      }
    },
    [refreshAndPresentQueue],
  );

  const teardownChannels = useCallback(() => {
    for (const ch of channelsRef.current) {
      supabase.removeChannel(ch);
    }
    channelsRef.current = [];
  }, []);

  const setupForAgent = useCallback(
    async (userId: string) => {
      const { data: agent } = await supabase
        .from("agents")
        .select("status")
        .eq("id", userId)
        .maybeSingle();

      if (agent?.status !== "approved") return;

      agentIdRef.current = userId;
      teardownChannels();
      startAgentHeartbeat(userId);

      await refreshAndPresentQueue(userId);

      if (pendingPromptRef.current !== undefined) {
        const queued = pendingPromptRef.current;
        pendingPromptRef.current = undefined;
        await handlePrompt(queued);
      }

      const offersChannel = supabase
        .channel(`lead-offers-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "lead_offers",
            filter: `agent_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row.status !== "offered") return;
            const offer = rowToOffer(row);
            if (!isOfferLive(offer)) return;

            // Background: hybrid FCM plays sound; Realtime upgrades to rich UI + buttons after delay.
            if (AppState.currentState !== "active") {
              requestRichLeadOfferUpgrade(
                buildLeadOfferPushDataFromOffer(offer),
              );
              return;
            }

            if (modalVisibleRef.current) {
              const exists = offerQueueRef.current.some((o) => o.id === offer.id);
              if (!exists) {
                const next = [...offerQueueRef.current, offer];
                offerQueueRef.current = next;
                setQueueTotal(next.length);
              }
              return;
            }

            void refreshAndPresentQueue(userId, offer.id);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ lead_offers realtime subscribed");
          } else if (
            status === "CLOSED" ||
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            console.warn("lead_offers realtime disconnected:", status);
            const agentId = agentIdRef.current;
            if (agentId) {
              setTimeout(() => {
                if (agentIdRef.current === agentId) {
                  void setupForAgent(agentId);
                }
              }, 2_000);
            }
          }
        });

      channelsRef.current = [offersChannel];
    },
    [
      handlePrompt,
      refreshAndPresentQueue,
      syncQueueState,
      teardownChannels,
    ],
  );

  useEffect(() => {
    return subscribeToLeadOfferPrompts((offerId) => {
      void handlePrompt(offerId);
    });
  }, [handlePrompt]);

  useEffect(() => {
    return subscribeToLeadOfferQueueRefresh((preferredOfferId, silent) => {
      const agentId = agentIdRef.current;
      if (!agentId) return;
      if (silent) {
        void silentRefreshQueue(agentId);
      } else {
        void refreshAndPresentQueue(agentId, preferredOfferId ?? undefined);
      }
    });
  }, [refreshAndPresentQueue, silentRefreshQueue]);

  useEffect(() => {
    let mounted = true;

    const trySetup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted || !session?.user) return;
      await setupForAgent(session.user.id);
    };

    void trySetup();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      teardownChannels();
      stopAgentHeartbeat();
      agentIdRef.current = null;
      if (session?.user) {
        void setupForAgent(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      teardownChannels();
      stopAgentHeartbeat();
      stopLeadOfferAlertLoop();
    };
  }, [setupForAgent, teardownChannels]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      const agentId = agentIdRef.current;
      if (next === "active" && agentId) {
        void refreshAndPresentQueue(agentId);
        void activateAgentNotifications(agentId);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [refreshAndPresentQueue]);

  useEffect(() => {
    if (!pendingOfferId || !agentIdRef.current) return;
    void openOfferById(agentIdRef.current, pendingOfferId).then(() => {
      onPendingOfferHandled?.();
    });
  }, [pendingOfferId, onPendingOfferHandled, openOfferById]);

  if (pathname?.includes("set-working-location")) {
    return null;
  }

  return (
    <LeadOfferModal
      visible={modalVisible}
      offer={modalOffer}
      queueIndex={queueIndex}
      queueTotal={queueTotal}
      onDismiss={() => setModalVisible(false)}
      onExpired={() => {
        void advanceQueue();
      }}
      onDeclined={() => {
        void advanceQueue();
      }}
      onAccepted={(leadId) => {
        stopLeadOfferAlertLoop();
        if (modalOffer?.id) {
          void dismissLeadOfferOsNotification(modalOffer.id);
        }
        clearOffer();
        router.push(`/lead/${leadId}` as any);
      }}
    />
  );
}
