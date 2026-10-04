import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

describe("token encryption", () => {
  const key = randomBytes(32).toString("base64");
  it("round-trips", () => {
    const enc = encryptSecret("EAAB-token", key);
    expect(enc).not.toContain("EAAB");
    expect(decryptSecret(enc, key)).toBe("EAAB-token");
  });
  it("fails on a tampered ciphertext", () => {
    const enc = encryptSecret("x", key);
    const [iv, body, tag] = enc.split(".");
    const flipped = Buffer.from(body!, "base64");
    flipped[0] = (flipped[0]! + 1) % 256;
    expect(() => decryptSecret(`${iv}.${flipped.toString("base64")}.${tag}`, key)).toThrow();
  });
  it("rejects a short key", () => {
    expect(() => encryptSecret("x", "c2hvcnQ=")).toThrow(/32 bytes/);
  });
});
