import { prisma } from '../db';

export const MAX_DEEPSEEK_REQUESTS = 2;
export const DEEPSEEK_WINDOW_DAYS = 3;
export const DEEPSEEK_WINDOW_MS = DEEPSEEK_WINDOW_DAYS * 24 * 60 * 60 * 1000; // 259,200,000 ms (exactly 3 days)

export interface DeepSeekQuotaStatus {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: Date | null;
  windowStart: Date | null;
  reason?: string;
}

export interface AntiAbuseContext {
  ipHash: string;
  deviceHash?: string | null;
  accountEmail?: string | null;
}

export type QuotaTarget = string | AntiAbuseContext;

/**
 * Normalizes input target into a structured AntiAbuseContext.
 * Guarantees 100% backward compatibility for callers passing raw `ipHash` strings.
 */
export function normalizeTarget(target: QuotaTarget): {
  ipHash: string;
  deviceHash: string | null;
  accountEmail: string | null;
} {
  if (typeof target === 'string') {
    return { ipHash: target, deviceHash: null, accountEmail: null };
  }
  return {
    ipHash: target.ipHash,
    deviceHash: target.deviceHash || null,
    accountEmail: target.accountEmail ? target.accountEmail.trim().toLowerCase() : null,
  };
}

/**
 * Multi-key chained mutex to serialize concurrent requests for the same IP hash
 * and/or same device hash within the Node.js event loop.
 * Acquires sorted keys to prevent deadlocks and eliminates race conditions before DB transactions.
 */
class AntiAbuseMutex {
  private activeLocks = new Map<string, Promise<void>>();

  async runExclusive<T>(keys: string[], fn: () => Promise<T>): Promise<T> {
    const sortedKeys = Array.from(new Set(keys.filter(Boolean))).sort();
    if (sortedKeys.length === 0) return await fn();

    const acquireNext = async (idx: number): Promise<T> => {
      if (idx >= sortedKeys.length) {
        return await fn();
      }
      const key = sortedKeys[idx];
      const prev = this.activeLocks.get(key) || Promise.resolve();
      let release: () => void = () => {};
      const current = new Promise<void>((resolve) => {
        release = resolve;
      });
      this.activeLocks.set(key, current);

      try {
        await prev;
        return await acquireNext(idx + 1);
      } finally {
        release();
        if (this.activeLocks.get(key) === current) {
          this.activeLocks.delete(key);
        }
      }
    };

    return await acquireNext(0);
  }
}

const antiAbuseMutex = new AntiAbuseMutex();

/**
 * Generates the unique UserUsage identifier for an IP hash.
 */
export function getDeepSeekIdentifier(ipHash: string): string {
  return `deepseek_ip:${ipHash}`;
}

/**
 * Helper to build database search conditions matching ANY of the active anti-abuse signals:
 * - Client IP hash
 * - Persistent first-party device hash
 * - Associated account email(s)
 */
function buildSearchConditions(
  ipHash: string,
  deviceHash: string | null,
  accountEmail: string | null
): any[] {
  const conditions: any[] = [
    { ipHash },
    { identifier: getDeepSeekIdentifier(ipHash) },
  ];

  if (deviceHash) {
    conditions.push({ deviceHash });
    conditions.push({ identifier: `deepseek_dev:${deviceHash}` });
  }

  if (accountEmail) {
    conditions.push({ accountEmails: { contains: accountEmail } });
    conditions.push({ identifier: `account:${accountEmail}` });
  }

  return conditions;
}

/**
 * Merges and normalizes comma-separated account email records without duplicates.
 */
function mergeAccountEmails(
  existing: string | null | undefined,
  newEmail: string | null | undefined
): string | null {
  if (!newEmail && !existing) return null;
  const set = new Set<string>();
  if (existing) {
    existing
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .forEach((e) => set.add(e));
  }
  if (newEmail) {
    set.add(newEmail.trim().toLowerCase());
  }
  return set.size > 0 ? Array.from(set).join(',') : null;
}

/**
 * Read-only status check across all anti-abuse signals (IP + Device + Account).
 * Does not mutate records or consume quota slots.
 */
export async function getDeepSeekQuotaStatus(
  target: QuotaTarget,
  now: Date = new Date()
): Promise<DeepSeekQuotaStatus> {
  const { ipHash, deviceHash, accountEmail } = normalizeTarget(target);
  const searchConditions = buildSearchConditions(ipHash, deviceHash, accountEmail);

  const records = await prisma.userUsage.findMany({
    where: {
      OR: searchConditions,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!records || records.length === 0) {
    return {
      allowed: true,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: 0,
      remaining: MAX_DEEPSEEK_REQUESTS,
      resetAt: null,
      windowStart: null,
    };
  }

  // Find active (unexpired) records in this quota environment
  const activeRecords = records.filter((r) => {
    if (!r.deepseekWindowStart) return false;
    const wTime = new Date(r.deepseekWindowStart).getTime();
    return !isNaN(wTime) && now.getTime() < wTime + DEEPSEEK_WINDOW_MS;
  });

  if (activeRecords.length === 0) {
    // All windows have expired; fresh quota available
    return {
      allowed: true,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: 0,
      remaining: MAX_DEEPSEEK_REQUESTS,
      resetAt: null,
      windowStart: null,
    };
  }

  // Check if any matching active record has exhausted the quota
  const exhausted = activeRecords.find((r) => r.deepseekUses >= MAX_DEEPSEEK_REQUESTS);
  if (exhausted) {
    const wTime = new Date(exhausted.deepseekWindowStart!).getTime();
    const unlockTime = wTime + DEEPSEEK_WINDOW_MS;
    return {
      allowed: false,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: MAX_DEEPSEEK_REQUESTS,
      remaining: 0,
      resetAt: new Date(unlockTime),
      windowStart: new Date(wTime),
      reason: 'DEEPSEEK_LIMIT_REACHED',
    };
  }

  // Quota is active and has remaining slots; pick the record with highest usage
  const primary = activeRecords.sort((a, b) => b.deepseekUses - a.deepseekUses)[0];
  const wTime = new Date(primary.deepseekWindowStart!).getTime();
  const unlockTime = wTime + DEEPSEEK_WINDOW_MS;
  const used = Math.min(primary.deepseekUses, MAX_DEEPSEEK_REQUESTS);
  const remaining = Math.max(0, MAX_DEEPSEEK_REQUESTS - used);

  return {
    allowed: true,
    limit: MAX_DEEPSEEK_REQUESTS,
    used,
    remaining,
    resetAt: new Date(unlockTime),
    windowStart: new Date(wTime),
  };
}

/**
 * Atomically checks and reserves a DeepSeek quota slot across anti-abuse signals.
 *
 * Multi-Signal Protection:
 * 1. IP Hash (client connection)
 * 2. Device Hash (server-authenticated first-party persistent cookie)
 * 3. Account Email (when authenticated)
 *
 * Anti-Abuse Rules:
 * - Switching accounts on the same device or same IP cannot grant fresh quota.
 * - One user request consumes exactly ONE logical quota unit (NO double-charging).
 * - 3-day window is strictly anchored to the first request of the window and persists across logins/logouts.
 */
export async function reserveDeepSeekQuota(
  target: QuotaTarget,
  now: Date = new Date()
): Promise<DeepSeekQuotaStatus> {
  const { ipHash, deviceHash, accountEmail } = normalizeTarget(target);

  const lockKeys = [
    `ip:${ipHash}`,
    deviceHash ? `dev:${deviceHash}` : '',
  ].filter(Boolean);

  return await antiAbuseMutex.runExclusive(lockKeys, async () => {
    return await prisma.$transaction(async (tx) => {
      const searchConditions = buildSearchConditions(ipHash, deviceHash, accountEmail);

      const existingRecords = await tx.userUsage.findMany({
        where: {
          OR: searchConditions,
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Case 1: First request ever from this environment (fresh IP, fresh device, fresh account)
      if (!existingRecords || existingRecords.length === 0) {
        const identifier = getDeepSeekIdentifier(ipHash);
        const resetAt = new Date(now.getTime() + DEEPSEEK_WINDOW_MS);

        await tx.userUsage.create({
          data: {
            identifier,
            ipHash,
            deviceHash,
            accountEmails: accountEmail || null,
            deepseekUses: 1,
            deepseekWindowStart: now,
          },
        });

        return {
          allowed: true,
          limit: MAX_DEEPSEEK_REQUESTS,
          used: 1,
          remaining: 1,
          resetAt,
          windowStart: now,
        };
      }

      // Case 2: Matching record(s) exist - evaluate active window vs expired
      const activeRecords = existingRecords.filter((r) => {
        if (!r.deepseekWindowStart) return false;
        const wTime = new Date(r.deepseekWindowStart).getTime();
        return !isNaN(wTime) && now.getTime() < wTime + DEEPSEEK_WINDOW_MS;
      });

      // Sub-case 2a: Quota is exhausted in an active window
      const exhaustedRecord = activeRecords.find((r) => r.deepseekUses >= MAX_DEEPSEEK_REQUESTS);
      if (exhaustedRecord) {
        const wTime = new Date(exhaustedRecord.deepseekWindowStart!).getTime();
        const unlockTime = wTime + DEEPSEEK_WINDOW_MS;
        const resetAt = new Date(unlockTime);

        // Ensure current deviceHash and accountEmail are linked to this record
        const updatedAccounts = mergeAccountEmails(exhaustedRecord.accountEmails, accountEmail);
        await tx.userUsage.update({
          where: { id: exhaustedRecord.id },
          data: {
            deviceHash: deviceHash || exhaustedRecord.deviceHash,
            accountEmails: updatedAccounts,
          },
        });

        return {
          allowed: false,
          limit: MAX_DEEPSEEK_REQUESTS,
          used: MAX_DEEPSEEK_REQUESTS,
          remaining: 0,
          resetAt,
          windowStart: new Date(wTime),
          reason: 'DEEPSEEK_LIMIT_REACHED',
        };
      }

      // Sub-case 2b: Active window with slots available (< 2 uses)
      if (activeRecords.length > 0) {
        const primaryRecord = activeRecords.sort((a, b) => b.deepseekUses - a.deepseekUses)[0];
        const wTime = new Date(primaryRecord.deepseekWindowStart!).getTime();
        const unlockTime = wTime + DEEPSEEK_WINDOW_MS;
        const resetAt = new Date(unlockTime);

        const updatedAccounts = mergeAccountEmails(primaryRecord.accountEmails, accountEmail);
        const updated = await tx.userUsage.update({
          where: { id: primaryRecord.id },
          data: {
            ipHash: ipHash || primaryRecord.ipHash,
            deviceHash: deviceHash || primaryRecord.deviceHash,
            accountEmails: updatedAccounts,
            deepseekUses: { increment: 1 },
          },
        });

        const newUsed = updated.deepseekUses;
        const remaining = Math.max(0, MAX_DEEPSEEK_REQUESTS - newUsed);

        return {
          allowed: true,
          limit: MAX_DEEPSEEK_REQUESTS,
          used: newUsed,
          remaining,
          resetAt,
          windowStart: new Date(wTime),
        };
      }

      // Sub-case 2c: All records in this environment have expired (> 3 days)
      // Start a fresh 3-day window anchored to this request
      const primaryRecord = existingRecords[0];
      const resetAt = new Date(now.getTime() + DEEPSEEK_WINDOW_MS);
      const updatedAccounts = mergeAccountEmails(primaryRecord.accountEmails, accountEmail);

      await tx.userUsage.update({
        where: { id: primaryRecord.id },
        data: {
          ipHash: ipHash || primaryRecord.ipHash,
          deviceHash: deviceHash || primaryRecord.deviceHash,
          accountEmails: updatedAccounts,
          deepseekUses: 1,
          deepseekWindowStart: now,
        },
      });

      return {
        allowed: true,
        limit: MAX_DEEPSEEK_REQUESTS,
        used: 1,
        remaining: 1,
        resetAt,
        windowStart: now,
      };
    });
  });
}

/**
 * Releases a previously reserved quota slot if DeepSeek fails due to an upstream
 * provider or server error before any usable response is produced.
 */
export async function releaseDeepSeekReservation(target: QuotaTarget): Promise<void> {
  const { ipHash, deviceHash, accountEmail } = normalizeTarget(target);
  const lockKeys = [
    `ip:${ipHash}`,
    deviceHash ? `dev:${deviceHash}` : '',
  ].filter(Boolean);

  await antiAbuseMutex.runExclusive(lockKeys, async () => {
    await prisma.$transaction(async (tx) => {
      const searchConditions = buildSearchConditions(ipHash, deviceHash, accountEmail);
      const record = await tx.userUsage.findFirst({
        where: {
          OR: searchConditions,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!record || record.deepseekUses <= 0) return;

      if (record.deepseekUses === 1) {
        // First message failed: revert count to 0 and nullify windowStart
        await tx.userUsage.update({
          where: { id: record.id },
          data: {
            deepseekUses: 0,
            deepseekWindowStart: null,
          },
        });
      } else {
        // Subsequent message failed: decrement usage, keep windowStart anchored
        await tx.userUsage.update({
          where: { id: record.id },
          data: {
            deepseekUses: { decrement: 1 },
          },
        });
      }
    });
  });
}
