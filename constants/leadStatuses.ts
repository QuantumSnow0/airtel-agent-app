/**
 * Inbound lead status labels and colors (v1).
 * Separate from registration statuses — agent "installed" requires SR/IMEI proof.
 */

import type { LeadStatus } from "../lib/dispatch/types";

export const LEAD_STATUS_COLORS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending_dispatch: { bg: "#E3F2FD", text: "#1565C0", label: "Pending" },
  offered: { bg: "#FFF3E0", text: "#E65100", label: "Offered" },
  assigned: { bg: "#E8F5E9", text: "#2E7D32", label: "Assigned" },
  kyc_in_progress: { bg: "#F3E5F5", text: "#7B1FA2", label: "KYC in progress" },
  kyc_completed: { bg: "#E0F7FA", text: "#00838F", label: "KYC done" },
  installed: { bg: "#E8F5E9", text: "#1B5E20", label: "Installed" },
  needs_reassignment: { bg: "#FFEBEE", text: "#C62828", label: "Reassigning" },
  admin_queue: { bg: "#ECEFF1", text: "#455A64", label: "Admin queue" },
  lost: { bg: "#F5F5F5", text: "#616161", label: "Lost" },
  expired: { bg: "#F5F5F5", text: "#757575", label: "Expired" },
};

export function formatLeadStatusLabel(status: LeadStatus | string): string {
  return LEAD_STATUS_COLORS[status]?.label ?? status;
}
