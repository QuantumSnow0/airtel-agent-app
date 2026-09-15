export type NotificationType =
  | "REGISTRATION_STATUS_CHANGE"
  | "EARNINGS_UPDATE"
  | "ACCOUNT_STATUS_CHANGE"
  | "SYNC_FAILURE"
  | "SYSTEM_ANNOUNCEMENT"
  | "PAYOUT_RECEIVED"
  | "LEAD_OFFER"
  | "LEAD_OVERDUE"
  | "LEAD_INSTALLED"
  | "LEAD_SUBMITTED_STATUS";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
};
