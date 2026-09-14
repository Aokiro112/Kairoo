import crypto from 'crypto';

import { cleanIpString } from './ip';

export const normalizeIp = cleanIpString;

/**
 * Computes a privacy-safe SHA-256 hash of the normalized IP with a server-side salt.
 * Ensures the raw IP address is never stored in plaintext or reversible via public rainbow tables.
 * The same IP will ALWAYS produce the exact same database key deterministically.
 */
export function hashIp(rawIp: string, customSalt?: string): string {
  const normalized = normalizeIp(rawIp);
  const salt = customSalt || process.env.IP_HASH_SALT || 'kairo_deepseek_ip_salt_v1';
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}
