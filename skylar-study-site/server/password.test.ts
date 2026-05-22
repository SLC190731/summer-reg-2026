import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("password helper", () => {
  it("hashes and verifies password successfully", async () => {
    const stored = await hashPassword("Hello123!");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Hello123!", stored)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const stored = await hashPassword("Correct-Password");
    expect(await verifyPassword("Wrong-Password", stored)).toBe(false);
  });

  it("rejects malformed stored hash", async () => {
    expect(await verifyPassword("any", "")).toBe(false);
    expect(await verifyPassword("any", "not-a-valid-format")).toBe(false);
  });

  it("produces unique hashes for same password (random salt)", async () => {
    const a = await hashPassword("samePass");
    const b = await hashPassword("samePass");
    expect(a).not.toBe(b);
    expect(await verifyPassword("samePass", a)).toBe(true);
    expect(await verifyPassword("samePass", b)).toBe(true);
  });
});
