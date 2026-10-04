import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for Meta access tokens at rest (spec: encrypt access/refresh tokens).
 * Stored format: base64(iv) . base64(ciphertext) . base64(authTag)
 */
const ALGO = "aes-256-gcm";

function keyFromEnv(raw: string | undefined): Buffer {
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

export function encryptSecret(plain: string, rawKey = process.env.TOKEN_ENCRYPTION_KEY): string {
  const key = keyFromEnv(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, enc, tag].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(stored: string, rawKey = process.env.TOKEN_ENCRYPTION_KEY): string {
  const key = keyFromEnv(rawKey);
  const [ivB64, encB64, tagB64] = stored.split(".");
  if (!ivB64 || !encB64 || !tagB64) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
