import crypto from 'crypto';
import express from 'express';

// Server-side runtime encryption key derived from environment or random runtime secret
const SERVER_SECRET = process.env.SESSION_SECRET || process.env.GEMINI_API_KEY || 'cfz_secret_vault_seed_2026';
const VAULT_KEY = crypto.scryptSync(SERVER_SECRET, 'cfz_byok_salt_2026', 32);

/**
 * Encrypts a raw Gemini API key into an AES-256-GCM string format
 */
export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', VAULT_KEY, iv);
  let encrypted = cipher.update(apiKey.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM payload back into the raw Gemini API key
 */
export function decryptApiKey(encryptedPayload: string): string | null {
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', VAULT_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.trim();
  } catch (err) {
    return null;
  }
}

/**
 * Returns a masked representation of an API key (e.g., "AIzaSy...4x8A")
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

/**
 * Parses HTTP request headers to extract cookies
 */
export function parseRequestCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      if (name) {
        list[name] = decodeURIComponent(parts.join('=').trim());
      }
    });
  }
  return list;
}

/**
 * Extracts ONLY the user's configured BYOK from HTTP-Only cookie or custom header
 * Returns undefined if user has not configured their own key (does NOT fallback to server env key)
 */
export function extractUserByokOnly(req: express.Request): string | undefined {
  const cookies = parseRequestCookies(req);
  const cookiePayload = cookies['cfz_byok_session'];
  
  if (cookiePayload) {
    const decryptedKey = decryptApiKey(cookiePayload);
    if (decryptedKey && decryptedKey.trim().length > 5) return decryptedKey.trim();
  }

  // Fallback to explicitly passed headers if cookies are disabled in dev environment
  const headerKey = (req.headers['x-gemini-api-key'] || req.headers['x-gemini-key'] || req.headers['x-byok']) as string;
  if (headerKey && headerKey.trim().length > 5) {
    return headerKey.trim();
  }

  return undefined;
}

/**
 * Extracts the user's BYOK or falls back to system server GEMINI_API_KEY for execution
 */
export function extractByokFromRequest(req: express.Request): string | undefined {
  const userKey = extractUserByokOnly(req);
  if (userKey) return userKey;

  return process.env.GEMINI_API_KEY;
}
