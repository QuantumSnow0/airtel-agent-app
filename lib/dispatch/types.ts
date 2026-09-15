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
  | "pending_install"
  | "installed"
  | "rejected"
  | "duplicate"
  | "cancelled"
  | "needs_reassignment"
  | "admin_queue"
  | "lost"
  | "expired"
  | "deferred";

export type OfferStatus =
  | "offered"
  | "accepted"
  | "declined"
  | "expired"
  | "superseded";

/** Safe customer pin from preview_payload (no name/phone). */
export type OfferGooglePlace = {
  placeId?: string;
  name?: string;
  formattedAddress?: string;
  lat?: number;
  lng?: number;
};

/** Blind preview from lead_offers.preview_payload */
export type LeadOfferPreview = {
  product?: LeadProduct;
  /** inbound_leads.source — used to hide install fees on agent_own */
  source?: string | null;
  county?: string | null;
  installationTown?: string | null;
  roughArea?: string | null;
  packageLabel?: string | null;
  preferredPackage?: string | null;
  submittedAgoMinutes?: number;
  distanceKm?: number | null;
  isCallbackReminder?: boolean;
  googlePlace?: OfferGooglePlace | null;
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
  submitted_by_agent_id?: string | null;
  preferred_agent_id?: string | null;
  callback_at?: string | null;
  accepted_at: string | null;
  call_initiated_at: string | null;
  contact_verified_at: string | null;
  contact_verified_phone: string | null;
  contact_verification_method: "sms_otp" | null;
  kyc_started_at: string | null;
  kyc_completed_at: string | null;
  installed_at: string | null;
  kyc_outcome: string | null;
  airtel_sr_number: string | null;
  safaricom_imei: string | null;
  registration_id: string | null;
  /** Flat install commission (KSh) when status is installed. */
  commission_earned_ksh?: number | null;
  metadata?: Record<string, unknown>;
};

export type LeadOutcomeAction =
  | "call_started"
  | "kyc_started"
  | "kyc_completed"
  | "unreachable"
  | "declined"
  | "kyc_failed"
  | "installed"
  | "release"
  | "defer";
