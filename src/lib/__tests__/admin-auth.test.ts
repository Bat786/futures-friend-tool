import { describe, expect, it } from "vitest";
import { isAdminEmail, isAdminUser } from "../admin-auth";

describe("admin authorization", () => {
  it("accepts only the configured administrator email, case-insensitively", () => {
    expect(isAdminEmail("Zeeshad91@gmail.com")).toBe(true);
    expect(isAdminEmail(" zeeshad91@GMAIL.COM ")).toBe(true);
    expect(isAdminEmail("someone@example.com")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("rejects missing and non-admin users", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser({ email: "other@example.com" })).toBe(false);
  });
});
