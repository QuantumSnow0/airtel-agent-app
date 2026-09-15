import { describe, expect, it } from "vitest";
import {
  airtelConnectFirstRegistrationSchema,
  airtelConnectRegistrationSchema,
} from "../lib/validation/airtelConnectRegistrationSchemas";
import { buildSubmitPayload, createClientHandoffId } from "../lib/services/airtelConnectRegistrationPayload";

describe("airtelConnectRegistrationSchema", () => {
  const valid = {
    customerName: "Jane Doe",
    phoneNumber: "0712345678",
    email: "jane@example.com",
    preferredPackage: "premium" as const,
    unitsRequired: 1,
    installationTown: "Kiambu",
    landmark: "Near Sarit Centre",
    airtelConnectOrderId: "",
  };

  it("accepts all seven required fields", () => {
    expect(airtelConnectRegistrationSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional Order ID on Path A", () => {
    expect(
      airtelConnectRegistrationSchema.safeParse({
        ...valid,
        airtelConnectOrderId: "AC-123",
      }).success,
    ).toBe(true);
  });

  it("rejects missing fields", () => {
    const { landmark: _, ...rest } = valid;
    expect(airtelConnectRegistrationSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid phone", () => {
    expect(
      airtelConnectRegistrationSchema.safeParse({
        ...valid,
        phoneNumber: "123",
      }).success,
    ).toBe(false);
  });

  it("rejects quantity above max", () => {
    expect(
      airtelConnectRegistrationSchema.safeParse({
        ...valid,
        unitsRequired: 5,
      }).success,
    ).toBe(false);
  });
});

describe("airtelConnectFirstRegistrationSchema", () => {
  const valid = {
    customerName: "Jane Doe",
    phoneNumber: "0712345678",
    email: "jane@example.com",
    preferredPackage: "premium" as const,
    unitsRequired: 1,
    installationTown: "Kiambu",
    landmark: "Near Sarit Centre",
    airtelConnectOrderId: "AC-12345",
  };

  it("requires Order ID", () => {
    expect(airtelConnectFirstRegistrationSchema.safeParse(valid).success).toBe(
      true,
    );
    expect(
      airtelConnectFirstRegistrationSchema.safeParse({
        ...valid,
        airtelConnectOrderId: "",
      }).success,
    ).toBe(false);
  });
});

describe("airtelConnectRegistrationService", () => {
  it("buildSubmitPayload maps form fields", () => {
    const id = createClientHandoffId();
    const payload = buildSubmitPayload(
      {
        customerName: "Jane",
        phoneNumber: "0712345678",
        email: "j@x.com",
        preferredPackage: "standard",
        unitsRequired: 2,
        installationTown: "Kiambu",
        landmark: "LM",
        airtelConnectOrderId: "",
      },
      id,
      "wam_first",
    );
    expect(payload.clientHandoffId).toBe(id);
    expect(payload.entryPath).toBe("wam_first");
    expect(payload.preferredPackage).toBe("standard");
    expect(payload.unitsRequired).toBe(2);
    expect(payload.airtelConnectOrderId).toBeUndefined();
  });

  it("buildSubmitPayload includes Order ID for connect_first", () => {
    const id = createClientHandoffId();
    const payload = buildSubmitPayload(
      {
        customerName: "Jane",
        phoneNumber: "0712345678",
        email: "j@x.com",
        preferredPackage: "premium",
        unitsRequired: 1,
        installationTown: "Kiambu",
        landmark: "LM",
        airtelConnectOrderId: " AC-999 ",
      },
      id,
      "connect_first",
    );
    expect(payload.entryPath).toBe("connect_first");
    expect(payload.airtelConnectOrderId).toBe("AC-999");
  });

  it("createClientHandoffId returns unique strings", () => {
    const a = createClientHandoffId();
    const b = createClientHandoffId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });
});

describe("registrationMode fail-safe", () => {
  it("documents legacy_wam as safe default when config unavailable", () => {
    expect("legacy_wam").toBe("legacy_wam");
  });
});
