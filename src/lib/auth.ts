import crypto from "crypto";

const SCRYPT_KEYLEN = 64;

/**
 * Hashes a plaintext password using Node.js native crypto.scryptSync with a 16-byte random salt.
 * Formats result as `salt:derivedKeyHex`.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored `salt:derivedKeyHex` hash using timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    if (!salt || !key) return false;

    const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    const keyBuffer = Buffer.from(key, "hex");

    if (derivedKey.length !== keyBuffer.length) return false;
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically strong 32-byte (64 hex characters) session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export const SESSION_COOKIE_NAME = "inflow_session";
export const SESSION_DURATION_SEC = 7 * 24 * 60 * 60; // 7 days

/**
 * Computes an expiration timestamp string formatted for SQLite (`YYYY-MM-DD HH:MM:SS`).
 */
export function getSessionExpiryDate(): string {
  const d = new Date(Date.now() + SESSION_DURATION_SEC * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function nowTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export interface UserRow {
  id: number;
  username: string;
  display_name: string;
  password_hash: string;
  role: "superadmin" | "tenant";
  status: "active" | "suspended";
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSessionRow {
  id: number;
  session_token: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface UserAccountRow {
  id: number;
  user_id: number;
  account_username: string;
  created_at: string;
}

export interface SafeUser {
  id: number;
  username: string;
  display_name: string;
  role: "superadmin" | "tenant";
  status: "active" | "suspended";
  assigned_accounts: string[];
  last_login_at?: string | null;
  created_at?: string;
}
