import { Request } from 'express';

/**
 * Extracts a single clean IP string from headers that could be either a string or string[].
 */
function extractFirstIp(headerVal: string | string[] | undefined): string | null {
  if (!headerVal) return null;
  const raw = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  if (!raw || typeof raw !== 'string') return null;

  // Split comma-delimited proxy chains and pick the first valid client address
  const parts = raw.split(',').map((p) => p.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower !== 'unknown' && lower !== 'null' && lower !== 'undefined') {
      return part;
    }
  }
  return parts[0] || null;
}

/**
 * Strips port numbers, IPv6 scope/zone identifiers, and brackets from an IP string.
 * Examples:
 *   "203.0.113.195:48231" -> "203.0.113.195"
 *   "[2001:db8::1]:8080"   -> "2001:db8::1"
 *   "::ffff:192.168.1.1"   -> "192.168.1.1"
 *   "fe80::1%eth0"         -> "fe80::1"
 */
export function cleanIpString(rawIp: string): string {
  if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
  let clean = rawIp.trim().toLowerCase().replace(/^["']|["']$/g, '');

  if (clean === 'unknown' || clean === 'null' || clean === 'undefined') {
    return '127.0.0.1';
  }

  // Strip IPv6 zone ID / interface scope (%eth0, %12)
  if (clean.includes('%')) {
    clean = clean.split('%')[0];
  }

  // Strip port from bracketed IPv6: [2001:db8::1]:8080 -> 2001:db8::1
  if (clean.startsWith('[')) {
    const closingIdx = clean.indexOf(']');
    if (closingIdx !== -1) {
      clean = clean.slice(1, closingIdx);
    }
  }

  // Strip ::ffff: IPv4-mapped IPv6 prefix
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }

  // Strip port from IPv4 (contains exactly one colon and dots)
  const colonCount = (clean.match(/:/g) || []).length;
  if (colonCount === 1 && clean.includes('.')) {
    clean = clean.split(':')[0];
  }

  // Standardize all loopback representations to '127.0.0.1'
  if (clean === '::1' || clean === 'localhost' || clean === '0.0.0.0' || clean === '::' || clean === '127.0.0.1') {
    clean = '127.0.0.1';
  }

  return clean || '127.0.0.1';
}

export const normalizeIp = cleanIpString;

/**
 * Server-side client IP extractor.
 * Strictly derives the client IP from trusted reverse proxy headers
 * (Cloudflare, Vercel, Railway, AWS ALB, Nginx) or socket remote address.
 * Completely ignores any client-supplied body or query parameters.
 */
export const getClientIp = (req: Request): string => {
  // 1. Cloudflare True-Client-IP / CF-Connecting-IP
  const cfIp = extractFirstIp(req.headers['cf-connecting-ip'] || req.headers['true-client-ip']);
  if (cfIp) return cleanIpString(cfIp);

  // 2. Standard X-Real-IP (Vercel, Nginx)
  const realIp = extractFirstIp(req.headers['x-real-ip']);
  if (realIp) return cleanIpString(realIp);

  // 3. X-Forwarded-For chain (takes first / original client IP)
  const forwarded = extractFirstIp(req.headers['x-forwarded-for']);
  if (forwarded) return cleanIpString(forwarded);

  // 4. X-Client-IP fallback
  const clientIpHeader = extractFirstIp(req.headers['x-client-ip']);
  if (clientIpHeader) return cleanIpString(clientIpHeader);

  // 5. Express req.ip (when trust proxy is set)
  if (req.ip && typeof req.ip === 'string') {
    return cleanIpString(req.ip);
  }

  // 6. Direct TCP socket remote address
  const socketAddress = req.socket?.remoteAddress;
  if (socketAddress && typeof socketAddress === 'string') {
    return cleanIpString(socketAddress);
  }

  return '127.0.0.1';
};
