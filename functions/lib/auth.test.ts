import { describe, expect, it } from "vitest";
import {
  createSessionCookie,
  createSessionToken,
  passwordsMatch,
  readSessionCookie,
  verifySessionToken,
} from "./auth";

describe("administrator sessions", () => {
  it("accepts a correctly signed unexpired token", async () => {
    const token = await createSessionToken("a-secret-long-enough", 1_000);
    expect(await verifySessionToken(token, "a-secret-long-enough", 1_001)).toBe(
      true,
    );
  });

  it("rejects expired or tampered tokens", async () => {
    const token = await createSessionToken("a-secret-long-enough", 1_000);
    expect(await verifySessionToken(token, "a-secret-long-enough", 50_000)).toBe(
      false,
    );
    expect(
      await verifySessionToken(`${token}x`, "a-secret-long-enough", 1_001),
    ).toBe(false);
  });

  it("sets and reads a hardened cookie", async () => {
    const cookie = await createSessionCookie("a-secret-long-enough", 1_000);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect(readSessionCookie(cookie)).toBeTruthy();
  });

  it("compares administrator passwords safely", async () => {
    expect(await passwordsMatch("correct", "correct")).toBe(true);
    expect(await passwordsMatch("wrong", "correct")).toBe(false);
  });
});
