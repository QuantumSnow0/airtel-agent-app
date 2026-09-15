import type {
  AirtelConnectEntryPath,
  AirtelConnectFirstRegistrationFormData,
  AirtelConnectRegistrationFormData,
} from "../validation/airtelConnectRegistrationSchemas";

export type AirtelConnectSubmitPayload = {
  clientHandoffId: string;
  entryPath: AirtelConnectEntryPath;
  customerName: string;
  phoneNumber: string;
  email: string;
  preferredPackage: "standard" | "premium";
  unitsRequired: number;
  installationTown: string;
  landmark: string;
  airtelConnectOrderId?: string;
};

export function buildSubmitPayload(
  form: AirtelConnectRegistrationFormData | AirtelConnectFirstRegistrationFormData,
  clientHandoffId: string,
  entryPath: AirtelConnectEntryPath,
): AirtelConnectSubmitPayload {
  const orderId =
    "airtelConnectOrderId" in form
      ? String(form.airtelConnectOrderId ?? "").trim()
      : "";

  return {
    clientHandoffId,
    entryPath,
    customerName: form.customerName.trim(),
    phoneNumber: form.phoneNumber.trim(),
    email: form.email.trim(),
    preferredPackage: form.preferredPackage,
    unitsRequired: form.unitsRequired,
    installationTown: form.installationTown.trim(),
    landmark: form.landmark.trim(),
    ...(orderId ? { airtelConnectOrderId: orderId } : {}),
  };
}

export function createClientHandoffId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `handoff-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
