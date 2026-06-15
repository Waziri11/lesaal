import crypto from "node:crypto";
import { requireEnv } from "./env";

const TOKEN_ENCRYPTION_ENV_NAME = "GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const ENCRYPTION_VERSION = "v1";

let cachedEncryptionKey = null;

function isHexString(value) {
  return /^[0-9a-fA-F]+$/.test(value);
}

function parseEncryptionKey(rawValue) {
  const value = String(rawValue || "").trim();

  if (!value) {
    throw new Error(`${TOKEN_ENCRYPTION_ENV_NAME} is required.`);
  }

  if (isHexString(value) && value.length === 64) {
    const hexBuffer = Buffer.from(value, "hex");
    if (hexBuffer.length === 32) {
      return hexBuffer;
    }
  }

  try {
    const base64Buffer = Buffer.from(value, "base64");
    if (base64Buffer.length === 32) {
      return base64Buffer;
    }
  } catch {
    // Ignore base64 decode errors and fall through to the final error.
  }

  throw new Error(
    `${TOKEN_ENCRYPTION_ENV_NAME} must be a 32-byte key encoded as base64 (recommended) or 64-char hex.`
  );
}

function getEncryptionKey() {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey;
  }

  cachedEncryptionKey = parseEncryptionKey(requireEnv(TOKEN_ENCRYPTION_ENV_NAME));
  return cachedEncryptionKey;
}

export function encryptSecret(plainText) {
  const value = String(plainText || "");

  if (!value) {
    throw new Error("Cannot encrypt an empty secret.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return `${ENCRYPTION_VERSION}:${payload}`;
}

export function decryptSecret(encryptedValue) {
  const rawValue = String(encryptedValue || "").trim();

  if (!rawValue) {
    throw new Error("Encrypted secret is required.");
  }

  const [version, payload] = rawValue.split(":", 2);
  if (version !== ENCRYPTION_VERSION || !payload) {
    throw new Error("Unsupported encrypted secret format.");
  }

  const data = Buffer.from(payload, "base64");
  if (data.length <= IV_BYTES + AUTH_TAG_BYTES) {
    throw new Error("Encrypted secret payload is invalid.");
  }

  const iv = data.subarray(0, IV_BYTES);
  const authTag = data.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const cipherText = data.subarray(IV_BYTES + AUTH_TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return decrypted.toString("utf8");
}
