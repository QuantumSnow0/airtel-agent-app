import { describe, expect, it } from "vitest";
import { normalizeKePhone } from "../lib/auth/normalizeKePhone";

describe("normalizeKePhone", () => {
  it("normalizes local 07 numbers to 254", () => {
    expect(normalizeKePhone("0712345678")).toBe("254712345678");
  });

  it("keeps 254 numbers", () => {
    expect(normalizeKePhone("+254712345678")).toBe("254712345678");
  });

  it("returns null for empty", () => {
    expect(normalizeKePhone("")).toBeNull();
    expect(normalizeKePhone(null)).toBeNull();
  });
});
