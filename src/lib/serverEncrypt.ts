/**
 * AES-256-GCM encryption for sensitive values stored in the database
 * (e.g. emailPassword, smsApiKey in communicationConfig).
 *
 * Requires COMMS_ENCRYPTION_KEY in environment — a 64-character hex string
 * representing 32 random bytes. Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If COMMS_ENCRYPTION_KEY is not set, encrypt/decrypt are no-ops so
 * existing deployments continue to work without migration.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32; // 256-bit
const IV_BYTES = 12;  // 96-bit IV for GCM

function getKey(): Buffer | null {
    const raw = process.env.COMMS_ENCRYPTION_KEY;
    if (!raw) return null;
    try {
        const buf = Buffer.from(raw, "hex");
        return buf.length === KEY_BYTES ? buf : null;
    } catch {
        return null;
    }
}

/**
 * Encrypt a string. Returns the ciphertext in `iv:tag:data` hex format.
 * If COMMS_ENCRYPTION_KEY is not configured, returns plaintext unchanged.
 */
export function encryptSecret(plaintext: string): string {
    const key = getKey();
    if (!key || !plaintext) return plaintext;

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a string previously encrypted by encryptSecret().
 * Falls back to returning the original value for backward compatibility
 * (plain-text values already in the database will still work).
 */
export function decryptSecret(value: string): string {
    const key = getKey();
    if (!key || !value) return value;

    // Not in our format → unencrypted legacy value, return as-is
    const parts = value.split(":");
    if (parts.length !== 3) return value;

    try {
        const [ivHex, tagHex, encHex] = parts;
        const iv = Buffer.from(ivHex, "hex");
        const tag = Buffer.from(tagHex, "hex");
        const enc = Buffer.from(encHex, "hex");

        const decipher = createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(enc).toString("utf8") + decipher.final("utf8");
    } catch {
        // Decryption failed (wrong key or corrupted) — return as-is
        return value;
    }
}
