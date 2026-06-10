export type RegistrationStatusFilter =
  | "all"
  | "pending"
  | "installed"
  | "rejected"
  | "duplicate"
  | "cancelled";

export const REGISTRATION_STATUS_COLORS: Record<
  string,
  { text: string; bg: string }
> = {
  installed: { text: "#4CAF50", bg: "#E8F5E9" },
  pending: { text: "#FF9800", bg: "#FFF4E6" },
  approved: { text: "#FF9800", bg: "#FFF4E6" },
  rejected: { text: "#D32F2F", bg: "#FFEBEE" },
  duplicate: { text: "#7B1FA2", bg: "#F3E5F5" },
  cancelled: { text: "#616161", bg: "#F5F5F5" },
};

export const REGISTRATION_FILTER_OPTIONS: {
  value: RegistrationStatusFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "installed", label: "Installed" },
  { value: "rejected", label: "Rejected" },
  { value: "duplicate", label: "Duplicate" },
  { value: "cancelled", label: "Cancelled" },
];

export function formatRegistrationStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "installed":
      return "Installed";
    case "rejected":
      return "Rejected";
    case "duplicate":
      return "Duplicate";
    case "cancelled":
      return "Cancelled";
    case "approved":
      return "Pending";
    default:
      return status;
  }
}
