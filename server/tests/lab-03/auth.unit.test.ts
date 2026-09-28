import { describe, expect, it } from "vitest";
import { hashPassword, validPassword, verifyPassword } from "../../src/auth/password.js";
import { validateProvisioning } from "../../src/auth/provisioning.js";

describe("Lab 3 password foundation (session/CSRF tests follow in the next slice)", () => {
  it.each([11, 12, 128, 129])("checks the %i-character boundary", length => {
    expect(validPassword("x".repeat(length))).toBe(length >= 12 && length <= 128);
  });
  it("preserves Unicode and spaces without trimming", async () => {
    const password = "  ทดสอบรหัสผ่าน🔐  ";
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password.trim(), hash)).toBe(false);
    expect(validPassword("🔐".repeat(128))).toBe(true);
    expect(validPassword("🔐".repeat(129))).toBe(false);
  });
  it("uses unequal random salts, verifies correct passwords and rejects wrong ones", async () => {
    const password = "isolated-test-password";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword("different-test-password", first)).toBe(false);
  });
  it("rejects malformed/unsupported records and invalid inputs", async () => {
    for (const record of [null, "", "plaintext", "scrypt-v2$00$00", "scrypt-v1$zz$00"]) {
      expect(await verifyPassword("isolated-test-password", record)).toBe(false);
    }
    await expect(hashPassword("short")).rejects.toThrow();
    expect(await verifyPassword(null, "plaintext")).toBe(false);
  });
  it("validates every provisioning entry and normalized uniqueness", () => {
    expect(validateProvisioning([{ email: " A@example.test ", initialPassword: "temporary-test-password" }]).has("a@example.test")).toBe(true);
    for (const input of [{}, [null], [{ email: "bad", initialPassword: "temporary-test-password" }],
      [{ email: "a@example.test", initialPassword: "short" }],
      [{ email: "a@example.test", initialPassword: "temporary-test-password", role: "ADMINISTRATOR" }],
      [{ email: "a@example.test", initialPassword: "temporary-test-password" }, { email: " A@example.test", initialPassword: "temporary-test-password" }]]) {
      expect(() => validateProvisioning(input)).toThrow();
    }
  });
});
