import crypto from 'crypto';

/**
 * Normalizes an IP address by trimming whitespace, lowercasing,
 * and stripping IPv6-mapped IPv4 prefixes (e.g. "::ffff:192.168.1.1").
 */
export function normalizeIp(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
  let clean = rawIp.trim().toLowerCase();
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }
  return clean || '127.0.0.1';
}

/**
 * Computes a privacy-safe SHA-256 hash of the normalized IP with a server-side salt.
 * Ensures the raw IP address is never stored in plaintext or reversible via public rainbow tables.
 */
export function hashIp(rawIp: string, customSalt?: string): string {
  const normalized = normalizeIp(rawIp);
  const salt = customSalt || process.env.IP_HASH_SALT || 'kairo_deepseek_ip_salt_v1';
  return crypto.createHash('sha256').update(`${salt}:${normalized}`).digest('hex');
}
