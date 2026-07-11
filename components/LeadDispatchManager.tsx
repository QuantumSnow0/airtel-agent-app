/**
 * Global lead-offer listener (v1).
 * Shows modal when a new offer arrives while the app is open.
 *
 * Triggers:
 *   1. leadOfferBridge (push foreground + realtime notification insert)
 *   2. Realtime INSERT on lead_offers (if publication enabled)
 *   3. App resume → poll active offers
 *   4. Active offers on launch
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  fetchActiveOffers,
  fetchOfferById,
} from "../lib/services/leadDispatchService";
import type { LeadOffer } from "../lib/dispatch/types";
import { subscribeToLeadOfferPrompts } from "../lib/dispatch/leadOfferBridge";
import {
  startLeadOfferAlertLoop,
  stopLeadOfferAlertLoop,
} from "../lib/services/leadAlertService";
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

export function LeadDispatchManager({
  pendingOfferId,
  onPendingOfferHandled,
}: LeadDispatchManagerProps) {
  const router = useRouter();
  const [modalOffer, setModalOffer] = useState<LeadOffer | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const agentIdRef = useRef<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const lastPromptedOfferIdRef = useRef<string | null>(null);
  const modalVisibleRef = useRef(false);
  const pendingPromptRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    modalVisibleRef.current = modalVisible;
  }, [modalVisible]);

  const showOffer = useCallback((offer: LeadOffer) => {
    if (offer.status !== "offered") return;
    if (new Date(offer.expires_at).getTime() <= Date.now()) return;
    if (
      lastPromptedOfferIdRef.current === offer.id &&
      modalVisibleRef.current
    ) {
      return;
    }

    lastPromptedOfferIdRef.current = offer.id;
    setModalOffer(offer);
    setModalVisible(true);

    startLeadOfferAlertLoop(offer.id, offer.expires_at, () => {
      setModalOffer((current) => current ?? offer);
      setModalVisible(true);
    });
  }, []);

  const clearOffer = useCallback(() => {
    stopLeadOfferAlertLoop();
    setModalVisible(false);
    setModalOffer(null);
    lastPromptedOfferIdRef.current = null;
  }, []);

  const openOfferById = useCallback(
    async (agentId: string, offerId: string) => {
      const { offer } = await fetchOfferById(agentId, offerId);
      if (offer) showOffer(offer);
    },
    [showOffer],
  );

  const showLatestActiveOffer = useCallback(
    async (agentId: string) => {
      const { offers } = await fetchActiveOffers(agentId);
      if (offers.length > 0) showOffer(offers[0]);
    },
    [showOffer],
  );

  const handlePrompt = useCallback(
    async (offerId: string | null) => {
      const agentId = agentIdRef.current;
      if (!agentId) {
        pendingPromptRef.current = offerId;
        return;
      }
      pendingPromptRef.current = undefined;
      if (offerId) {
        await openOfferById(agentId, offerId);
      } else {
        await showLatestActiveOffer(agentId);
      }
    },
    [openOfferById, showLatestActiveOffer],
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

      await showLatestActiveOffer(userId);

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
            showOffer(rowToOffer(row));
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("✅ lead_offers realtime subscribed");
          }
        });

      channelsRef.current = [offersChannel];
    },
    [handlePrompt, showLatestActiveOffer, showOffer, teardownChannels],
  );

  // Bridge: push foreground + notification realtime (from pushNotificationService)
  useEffect(() => {
    return subscribeToLeadOfferPrompts((offerId) => {
      void handlePrompt(offerId);
    });
  }, [handlePrompt]);

  // Auth + realtime setup
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
      agentIdRef.current = null;
      if (session?.user) {
        void setupForAgent(session.user.id);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      teardownChannels();
      stopLeadOfferAlertLoop();
    };
  }, [setupForAgent, teardownChannels]);

  // Returning to app — catch offers missed while backgrounded
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === "active" && agentIdRef.current) {
        void showLatestActiveOffer(agentIdRef.current);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [showLatestActiveOffer]);

  useEffect(() => {
    if (!pendingOfferId || !agentIdRef.current) return;
    void openOfferById(agentIdRef.current, pendingOfferId).then(() => {
      onPendingOfferHandled?.();
    });
  }, [pendingOfferId, onPendingOfferHandled, openOfferById]);

  return (
    <LeadOfferModal
      visible={modalVisible}
      offer={modalOffer}
      onDismiss={() => setModalVisible(false)}
      onExpired={clearOffer}
      onDeclined={clearOffer}
      onAccepted={(leadId) => {
        stopLeadOfferAlertLoop();
        setModalVisible(false);
        setModalOffer(null);
        lastPromptedOfferIdRef.current = null;
        router.push(`/lead/${leadId}` as any);
      }}
    />
  );
}
