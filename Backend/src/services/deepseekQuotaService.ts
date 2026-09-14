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

/**
 * Strict chained mutex to serialize concurrent requests for the exact same IP hash
 * within the Node.js event loop, eliminating race conditions before database transactions.
 */
class IpMutex {
  private activeLocks = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.activeLocks.get(key) || Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.activeLocks.set(key, current);

    try {
      await prev;
      return await fn();
    } finally {
      release();
      if (this.activeLocks.get(key) === current) {
        this.activeLocks.delete(key);
      }
    }
  }
}

const ipMutex = new IpMutex();

/**
 * Generates the unique UserUsage identifier for an IP hash.
 */
export function getDeepSeekIdentifier(ipHash: string): string {
  return `deepseek_ip:${ipHash}`;
}

/**
 * Read-only status check for a given IP hash.
 * Does not mutate records or consume quota slots.
 */
export async function getDeepSeekQuotaStatus(
  ipHash: string,
  now: Date = new Date()
): Promise<DeepSeekQuotaStatus> {
  const identifier = getDeepSeekIdentifier(ipHash);

  const record = await prisma.userUsage.findFirst({
    where: {
      OR: [
        { ipHash },
        { identifier },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!record || !record.deepseekWindowStart) {
    return {
      allowed: true,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: 0,
      remaining: MAX_DEEPSEEK_REQUESTS,
      resetAt: null,
      windowStart: null,
    };
  }

  const windowStartTime = new Date(record.deepseekWindowStart).getTime();
  if (isNaN(windowStartTime)) {
    return {
      allowed: true,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: 0,
      remaining: MAX_DEEPSEEK_REQUESTS,
      resetAt: null,
      windowStart: null,
    };
  }

  const unlockTime = windowStartTime + DEEPSEEK_WINDOW_MS;
  const isExpired = now.getTime() >= unlockTime;

  if (isExpired) {
    // Window has passed; quota will reset upon next request
    return {
      allowed: true,
      limit: MAX_DEEPSEEK_REQUESTS,
      used: 0,
      remaining: MAX_DEEPSEEK_REQUESTS,
      resetAt: null,
      windowStart: null,
    };
  }

  const used = Math.min(record.deepseekUses, MAX_DEEPSEEK_REQUESTS);
  const remaining = Math.max(0, MAX_DEEPSEEK_REQUESTS - used);
  const allowed = used < MAX_DEEPSEEK_REQUESTS;
  const resetAt = new Date(unlockTime);

  return {
    allowed,
    limit: MAX_DEEPSEEK_REQUESTS,
    used,
    remaining,
    resetAt,
    windowStart: new Date(windowStartTime),
    reason: allowed ? undefined : 'DEEPSEEK_LIMIT_REACHED',
  };
}

/**
 * Atomically checks and reserves a DeepSeek quota slot for the IP hash.
 *
 * Concurrency Safety:
 * 1. Chained in-process mutex serializes concurrent requests for the exact same IP hash.
 * 2. Prisma transaction ensures atomic reads and writes in the persistent SQLite database.
 * 3. If window expired, resets usage to 1 and anchors windowStart to `now`.
 * 4. If window active and used < 2, increments usage while keeping original windowStart intact.
 * 5. If used >= 2, rejects with allowed=false and calculated resetAt timestamp.
 */
export async function reserveDeepSeekQuota(
  ipHash: string,
  now: Date = new Date()
): Promise<DeepSeekQuotaStatus> {
  const identifier = getDeepSeekIdentifier(ipHash);

  return await ipMutex.runExclusive(ipHash, async () => {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.userUsage.findFirst({
        where: {
          OR: [
            { ipHash },
            { identifier },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Case 1: First request ever from this IP
      if (!existing) {
        const resetAt = new Date(now.getTime() + DEEPSEEK_WINDOW_MS);
        await tx.userUsage.create({
          data: {
            identifier,
            ipHash,
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

      // Case 2: Record exists - check if window has expired or was not yet started
      const windowStart = existing.deepseekWindowStart;
      const windowStartTime = windowStart ? new Date(windowStart).getTime() : NaN;
      const isExpired = !windowStart || isNaN(windowStartTime) || now.getTime() >= windowStartTime + DEEPSEEK_WINDOW_MS;

      if (isExpired) {
        // Automatically start fresh 3-day window anchored to this request
        const resetAt = new Date(now.getTime() + DEEPSEEK_WINDOW_MS);
        await tx.userUsage.update({
          where: { id: existing.id },
          data: {
            identifier,
            ipHash: existing.ipHash || ipHash,
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

      // Case 3: Window is currently active
      const unlockTime = windowStartTime + DEEPSEEK_WINDOW_MS;
      const resetAt = new Date(unlockTime);

      if (existing.deepseekUses >= MAX_DEEPSEEK_REQUESTS) {
        // Quota exhausted within active window
        return {
          allowed: false,
          limit: MAX_DEEPSEEK_REQUESTS,
          used: Math.min(existing.deepseekUses, MAX_DEEPSEEK_REQUESTS),
          remaining: 0,
          resetAt,
          windowStart: new Date(windowStartTime),
          reason: 'DEEPSEEK_LIMIT_REACHED',
        };
      }

      // Slot available: increment usage atomically while keeping windowStart unchanged (anchored)
      const updated = await tx.userUsage.update({
        where: { id: existing.id },
        data: {
          identifier,
          ipHash: existing.ipHash || ipHash,
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
        windowStart: new Date(windowStartTime),
      };
    });
  });
}

/**
 * Releases a previously reserved quota slot if DeepSeek fails due to an upstream
 * provider or server error before any usable response is produced.
 *
 * If the failed request was the initial message (usage was 1), deepseekWindowStart
 * is cleared so the 3-day timer does not lock an unused window.
 */
export async function releaseDeepSeekReservation(ipHash: string): Promise<void> {
  const identifier = getDeepSeekIdentifier(ipHash);

  await ipMutex.runExclusive(ipHash, async () => {
    await prisma.$transaction(async (tx) => {
      const record = await tx.userUsage.findFirst({
        where: {
          OR: [
            { ipHash },
            { identifier },
          ],
        },
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
