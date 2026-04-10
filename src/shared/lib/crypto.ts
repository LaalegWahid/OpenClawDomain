import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is not set");
  const buf = Buffer.from(key, "hex");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY must be a 64-char hex string (32 bytes)");
  return buf;
}

/**
 * Encrypts a plaintext string.
 * Returns a string in the format: iv:authTag:ciphertext (all hex)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a string produced by encrypt().
 */
export function decrypt(stored: string): string {
  const [ivHex, tagHex, encryptedHex] = stored.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Invalid encrypted value format");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
}

/**
 * Encrypts a key only if it's a non-empty string, otherwise returns null.
 */
export function encryptIfPresent(value: string | undefined | null): string | null {
  if (!value || !value.trim()) return null;
  return encrypt(value.trim());
}

/**
 * Decrypts a key only if it's a non-null stored value, otherwise returns undefined.
 */
export function decryptIfPresent(stored: string | null | undefined): string | undefined {
  if (!stored) return undefined;
  return decrypt(stored);
}