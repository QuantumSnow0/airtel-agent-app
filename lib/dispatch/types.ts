/**
 * Lead dispatch types (v1) — mirror admin-dashboard/lib/dispatch/types.ts
 * Extend here when adding fields; keep edge function payloads in sync.
 */

export type LeadProduct = "airtel" | "safaricom";

export type LeadStatus =
  | "pending_dispatch"
  | "offered"
  | "assigned"
  | "kyc_in_progress"
  | "kyc_completed"
  | "installed"
  | "needs_reassignment"
  | "admin_queue"
  | "lost"
  | "expired";

export type OfferStatus =
  | "offered"
  | "accepted"
  | "declined"
  | "expired"
  | "superseded";

/** Blind preview from lead_offers.preview_payload */
export type LeadOfferPreview = {
  product?: LeadProduct;
  county?: string | null;
  installationTown?: string | null;
  roughArea?: string | null;
  packageLabel?: string | null;
  submittedAgoMinutes?: number;
  distanceKm?: number | null;
};

export type LeadOffer = {
  id: string;
  lead_id: string;
  status: OfferStatus;
  preview_payload: LeadOfferPreview;
  expires_at: string;
  created_at: string;
  distance_km?: number | null;
};

export type InboundLead = {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  product: LeadProduct;
  status: LeadStatus;
  county: string | null;
  installation_town: string | null;
  installation_area: string | null;
  delivery_landmark: string | null;
  customer_name: string;
  primary_phone: string;
  alternate_phone: string | null;
  email: string | null;
  preferred_package: string | null;
  plan_label: string | null;
  plan_group: string | null;
  visit_date: string | null;
  visit_time: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  assigned_agent_id: string | null;
  accepted_at: string | null;
  kyc_started_at: string | null;
  kyc_completed_at: string | null;
  installed_at: string | null;
  kyc_outcome: string | null;
  airtel_sr_number: string | null;
  safaricom_imei: string | null;
  metadata?: Record<string, unknown>;
};

export type LeadOutcomeAction =
  | "kyc_started"
  | "kyc_completed"
  | "unreachable"
  | "declined"
  | "kyc_failed"
  | "installed"
  | "release";
