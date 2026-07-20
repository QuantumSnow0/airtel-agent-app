import type { CustomerRegistrationData } from "./msFormsService";

export interface PendingRegistration {
  id: string;
  agent_id: string;
  customerData: CustomerRegistrationData;
  agentData: { name: string; mobile: string };
  status: "pending" | "syncing" | "synced" | "failed";
  error?: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}
