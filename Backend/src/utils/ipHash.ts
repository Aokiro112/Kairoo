import crypto from 'crypto';

/**
 * Normalizes an IP address by trimming whitespace, lowercasing,
 * stripping port numbers, removing bracket wrappers, and stripping
 * IPv6-mapped IPv4 prefixes (e.g. "::ffff:192.168.1.1:8080" -> "192.168.1.1").
 */
export function normalizeIp(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
  let clean = rawIp.trim().toLowerCase();

  // Strip port from bracketed IPv6: [2001:db8::1]:8080 -> 2001:db8::1
  if (clean.startsWith('[')) {
    const closingBracket = clean.indexOf(']');
    if (closingBracket !== -1) {
      clean = clean.slice(1, closingBracket);
    }
  }

  // Strip ::ffff: IPv4-mapped IPv6 prefix
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }

  // Strip port from IPv4 (contains dots and exactly one colon)
  const colonCount = (clean.match(/:/g) || []).length;
  if (colonCount === 1 && clean.includes('.')) {
    clean = clean.split(':')[0];
  }

  // Standardize loopback forms to consistent representation
  if (clean === '::1' || clean === 'localhost') {
    clean = '127.0.0.1';
  }

  return clean || '127.0.0.1';
}

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
