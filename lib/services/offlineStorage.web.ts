/**
 * Web stub — offline SQLite is native-only. Registration flows target Android/iOS.
 */
import type { CustomerRegistrationData } from "./msFormsService";
import type { PendingRegistration } from "./offlineStorage.types";

export type { PendingRegistration } from "./offlineStorage.types";

export async function initOfflineStorage(): Promise<void> {
  // No-op on web.
}

export async function savePendingRegistration(
  _agentId: string,
  _customerData: CustomerRegistrationData,
  _agentData: { name: string; mobile: string },
): Promise<string> {
  throw new Error("Offline registration storage is not available on web.");
}

export async function getPendingRegistrations(
  _agentId?: string,
): Promise<PendingRegistration[]> {
  return [];
}

export async function updatePendingRegistrationStatus(
  _id: string,
  _status: PendingRegistration["status"],
  _error?: string,
): Promise<void> {
  // No-op on web.
}

export async function deletePendingRegistration(_id: string): Promise<void> {
  // No-op on web.
}

export async function getPendingCount(_agentId?: string): Promise<number> {
  return 0;
}
