import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express, { Request } from 'express';
import { prisma } from '../src/db';
import {
  reserveDeepSeekQuota,
  releaseDeepSeekReservation,
  getDeepSeekQuotaStatus,
  getDeepSeekIdentifier,
  MAX_DEEPSEEK_REQUESTS,
  DEEPSEEK_WINDOW_MS,
} from '../src/services/deepseekQuotaService';
import { hashIp, normalizeIp } from '../src/utils/ipHash';
import { getClientIp } from '../src/utils/ip';
import { isDeepSeekModel, getDeepSeekConfig } from '../src/agent/deepseekService';
import { chatRouter } from '../src/routes/chat';

describe('DeepSeek API & IP-based Quota Verification Suite', () => {
  let server: http.Server;
  let serverPort: number;
  let serverBaseUrl: string;

  // Clean up only this test suite's specific records in UserUsage
  const cleanupTestRecords = async () => {
    try {
      const testIps = [
        'test_ip_scenario_1',
        'test_ip_scenario_4_different',
        'test_ip_scenario_6',
        'test_ip_scenario_7',
        'test_ip_scenario_8',
        'test_ip_scenario_9_concurrency',
        'test_ip_scenario_10_failure',
        '192.0.2.12',
        'test_ip_scenario_14_anchoring',
      ];
      const identifiers = testIps.map((ip) => `deepseek_ip:${hashIp(ip)}`);
      await prisma.userUsage.deleteMany({
        where: {
          identifier: {
            in: identifiers,
          },
        },
      });
    } catch {}
  };

  before(async () => {
    await cleanupTestRecords();

    // Launch a test Express app instance with chatRouter mounted
    const app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        serverBaseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  after(async () => {
    await cleanupTestRecords();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  // --------------------------------------------------------------------------
  // Scenario 1: First DeepSeek request from an IP -> allowed
  // --------------------------------------------------------------------------
  it('Scenario 1: First DeepSeek request from an IP is allowed (used=1, remaining=1)', async () => {
    const ip = 'test_ip_scenario_1';
    const ipHash = hashIp(ip);
    const now = new Date('2026-09-13T10:00:00.000Z');

    const result = await reserveDeepSeekQuota(ipHash, now);

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.remaining, 1);
    assert.ok(result.resetAt);
    assert.strictEqual(
      result.resetAt.toISOString(),
      new Date(now.getTime() + DEEPSEEK_WINDOW_MS).toISOString()
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Second DeepSeek request from same IP -> allowed
  // --------------------------------------------------------------------------
  it('Scenario 2: Second DeepSeek request from same IP is allowed (used=2, remaining=0)', async () => {
    const ip = 'test_ip_scenario_1';
    const ipHash = hashIp(ip);
    const t2 = new Date('2026-09-13T10:05:00.000Z');

    const result = await reserveDeepSeekQuota(ipHash, t2);

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.used, 2);
    assert.strictEqual(result.remaining, 0);
    // Reset timestamp must remain anchored to the FIRST request (10:00:00)
    const expectedReset = new Date(new Date('2026-09-13T10:00:00.000Z').getTime() + DEEPSEEK_WINDOW_MS);
    assert.strictEqual(result.resetAt?.toISOString(), expectedReset.toISOString());
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Third request from same IP -> rejected with HTTP 429
  // --------------------------------------------------------------------------
  it('Scenario 3: Third request from same IP is rejected within active window', async () => {
    const ip = 'test_ip_scenario_1';
    const ipHash = hashIp(ip);
    const t3 = new Date('2026-09-13T10:10:00.000Z');

    const result = await reserveDeepSeekQuota(ipHash, t3);

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.used, 2);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.reason, 'DEEPSEEK_LIMIT_REACHED');
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Request from a different IP -> allowed
  // --------------------------------------------------------------------------
  it('Scenario 4: Request from a different IP is allowed independently', async () => {
    const ip = 'test_ip_scenario_4_different';
    const ipHash = hashIp(ip);
    const now = new Date('2026-09-13T10:15:00.000Z');

    const result = await reserveDeepSeekQuota(ipHash, now);

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.limit, 2);
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.remaining, 1);
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Same IP after 3 days -> quota resets automatically
  // --------------------------------------------------------------------------
  it('Scenario 5: Same IP after 3 days has its quota automatically reset without cron jobs', async () => {
    const ip = 'test_ip_scenario_1';
    const ipHash = hashIp(ip);
    // 3 days + 1 second after initial request of 2026-09-13T10:00:00.000Z
    const afterThreeDays = new Date('2026-09-16T10:00:01.000Z');

    // Read status check: should show reset available
    const status = await getDeepSeekQuotaStatus(ipHash, afterThreeDays);
    assert.strictEqual(status.allowed, true);
    assert.strictEqual(status.used, 0);
    assert.strictEqual(status.remaining, 2);

    // Reservation check: should start a new window with used=1
    const result = await reserveDeepSeekQuota(ipHash, afterThreeDays);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.used, 1);
    assert.strictEqual(result.remaining, 1);
    const expectedNewReset = new Date(afterThreeDays.getTime() + DEEPSEEK_WINDOW_MS);
    assert.strictEqual(result.resetAt?.toISOString(), expectedNewReset.toISOString());
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Same IP before 3 days -> remains locked
  // --------------------------------------------------------------------------
  it('Scenario 6: Same IP before 3-day window expiration remains strictly locked', async () => {
    const ip = 'test_ip_scenario_6';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T12:00:00.000Z');

    // Consume 2 requests
    await reserveDeepSeekQuota(ipHash, t0);
    await reserveDeepSeekQuota(ipHash, new Date('2026-09-13T12:05:00.000Z'));

    // Check at 2 days and 23 hours later (1 hour before unlock)
    const justBeforeExpiration = new Date('2026-09-16T11:00:00.000Z');
    const result = await reserveDeepSeekQuota(ipHash, justBeforeExpiration);

    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
    assert.strictEqual(result.used, 2);
  });

  // --------------------------------------------------------------------------
  // Scenario 7: New account from an already-limited IP -> remains limited
  // --------------------------------------------------------------------------
  it('Scenario 7: Creating a new account from an already-limited IP cannot bypass DeepSeek quota', async () => {
    const ip = 'test_ip_scenario_7';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T14:00:00.000Z');

    // Operator Account A uses the 2 requests from this IP
    await reserveDeepSeekQuota(ipHash, t0);
    await reserveDeepSeekQuota(ipHash, new Date('2026-09-13T14:05:00.000Z'));

    // Operator logs out and registers Account B from the exact same IP
    const accountBStatus = await getDeepSeekQuotaStatus(ipHash, new Date('2026-09-13T14:10:00.000Z'));
    assert.strictEqual(accountBStatus.allowed, false);
    assert.strictEqual(accountBStatus.remaining, 0);

    const accountBAttempt = await reserveDeepSeekQuota(ipHash, new Date('2026-09-13T14:10:00.000Z'));
    assert.strictEqual(accountBAttempt.allowed, false);
    assert.strictEqual(accountBAttempt.reason, 'DEEPSEEK_LIMIT_REACHED');
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Deleted chat/session does not reset quota
  // --------------------------------------------------------------------------
  it('Scenario 8: Deleting chat sessions or tasks does not reset the IP quota', async () => {
    const ip = 'test_ip_scenario_8';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T15:00:00.000Z');

    // Consume 2 requests
    await reserveDeepSeekQuota(ipHash, t0);
    await reserveDeepSeekQuota(ipHash, new Date('2026-09-13T15:05:00.000Z'));

    // Simulate user deleting their TaskSession and ChatMessage history
    const sampleTaskId = `sample-del-task-${Date.now()}`;
    await prisma.taskSession.create({
      data: { id: sampleTaskId, title: 'Sample Deletion Task' },
    });
    await prisma.chatMessage.create({
      data: { id: `sample-msg-${Date.now()}`, taskId: sampleTaskId, role: 'user', content: 'test' },
    });
    await prisma.chatMessage.deleteMany({ where: { taskId: sampleTaskId } });
    await prisma.taskSession.delete({ where: { id: sampleTaskId } });

    // Verify DeepSeek quota remains locked
    const result = await reserveDeepSeekQuota(ipHash, new Date('2026-09-13T15:10:00.000Z'));
    assert.strictEqual(result.allowed, false);
    assert.strictEqual(result.remaining, 0);
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Multiple simultaneous requests cannot bypass the 2-request limit
  // --------------------------------------------------------------------------
  it('Scenario 9: Multiple simultaneous requests from the same IP cannot bypass the 2-request limit', async () => {
    const ip = 'test_ip_scenario_9_concurrency';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T16:00:00.000Z');

    // Fire 10 concurrent requests at the exact same millisecond
    const concurrentRequests = Array.from({ length: 10 }).map(() =>
      reserveDeepSeekQuota(ipHash, t0)
    );

    const results = await Promise.all(concurrentRequests);

    const allowedCount = results.filter((r) => r.allowed).length;
    const rejectedCount = results.filter((r) => !r.allowed).length;

    assert.strictEqual(allowedCount, 2, 'Exactly 2 requests must be allowed');
    assert.strictEqual(rejectedCount, 8, 'Exactly 8 requests must be rejected with 429');

    // Verify database record has exactly deepseekUses = 2
    const record = await prisma.userUsage.findUnique({
      where: { identifier: getDeepSeekIdentifier(ipHash) },
    });
    assert.strictEqual(record?.deepseekUses, 2);
  });

  // --------------------------------------------------------------------------
  // Scenario 10: DeepSeek API failure does not incorrectly burn quota
  // --------------------------------------------------------------------------
  it('Scenario 10: Upstream API failure releases reserved quota slot', async () => {
    const ip = 'test_ip_scenario_10_failure';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T17:00:00.000Z');

    // Step 1: Initial reservation
    const reserve1 = await reserveDeepSeekQuota(ipHash, t0);
    assert.strictEqual(reserve1.allowed, true);
    assert.strictEqual(reserve1.used, 1);

    // Step 2: DeepSeek provider fails before emitting usable content
    await releaseDeepSeekReservation(ipHash);

    // Step 3: Check quota - should be restored to 0 used and null window
    const status = await getDeepSeekQuotaStatus(ipHash, t0);
    assert.strictEqual(status.used, 0);
    assert.strictEqual(status.remaining, 2);
    assert.strictEqual(status.windowStart, null);

    // Step 4: User retries - allowed fresh
    const retry = await reserveDeepSeekQuota(ipHash, t0);
    assert.strictEqual(retry.allowed, true);
    assert.strictEqual(retry.used, 1);
  });

  // --------------------------------------------------------------------------
  // Scenario 11: API key is never exposed in frontend responses
  // --------------------------------------------------------------------------
  it('Scenario 11: DeepSeek API key is never exposed in responses or public config', async () => {
    const config = getDeepSeekConfig();
    // Config should read server-side env
    assert.ok(typeof config.apiKey === 'string');

    // Make request to /api/chat/quota
    const res = await fetch(`${serverBaseUrl}/api/chat/quota`);
    const json = await res.json();

    // Verify response does not contain any secret or key
    const jsonStr = JSON.stringify(json);
    assert.strictEqual(jsonStr.includes('api_key'), false);
    assert.strictEqual(jsonStr.includes('apiKey'), false);
    assert.strictEqual(jsonStr.includes('sk-'), false);
    assert.strictEqual(jsonStr.includes('DEEPSEEK_API_KEY'), false);
  });

  // --------------------------------------------------------------------------
  // Scenario 12: Direct requests to /api/chat cannot bypass the quota
  // --------------------------------------------------------------------------
  it('Scenario 12: Direct POST requests to /api/chat return HTTP 429 when quota exceeded', async () => {
    const testDirectIp = '192.0.2.12';
    const headers = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': testDirectIp,
    };

    // Pre-exhaust this IP's quota in database
    const ipHash = hashIp(testDirectIp);
    const now = new Date();
    await reserveDeepSeekQuota(ipHash, now);
    await reserveDeepSeekQuota(ipHash, now);

    // Send direct POST request to /api/chat
    const res = await fetch(`${serverBaseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'deepseek-chat',
        userMessageText: 'Scan target.com',
      }),
    });

    assert.strictEqual(res.status, 429, 'Must return HTTP 429 Too Many Requests');
    const data = await res.json();
    assert.strictEqual(data.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(data.message, 'You have used your 2 DeepSeek messages.');
    assert.strictEqual(data.limit, 2);
    assert.strictEqual(data.used, 2);
    assert.ok(data.resetAt, 'Must provide resetAt ISO timestamp');
  });

  // --------------------------------------------------------------------------
  // Scenario 13: Proxy/Vercel/Railway IP extraction works through utils/ip.ts
  // --------------------------------------------------------------------------
  it('Scenario 13: Trusted proxy headers correctly extracted and client body IP is ignored', () => {
    // 1. Cloudflare header
    const mockReqCf = {
      headers: { 'cf-connecting-ip': '203.0.113.199' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    assert.strictEqual(getClientIp(mockReqCf), '203.0.113.199');

    // 2. Real-IP header
    const mockReqReal = {
      headers: { 'x-real-ip': '203.0.113.198' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    assert.strictEqual(getClientIp(mockReqReal), '203.0.113.198');

    // 3. X-Forwarded-For chain (takes first client IP)
    const mockReqFwd = {
      headers: { 'x-forwarded-for': '203.0.113.197, 10.0.0.1, 10.0.0.2' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    assert.strictEqual(getClientIp(mockReqFwd), '203.0.113.197');

    // 4. Client body attempt to spoof IP is ignored by getClientIp
    const mockReqSpoof = {
      headers: { 'x-real-ip': '203.0.113.195' },
      body: { ip: '1.2.3.4', clientIp: '5.6.7.8' },
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;
    assert.strictEqual(getClientIp(mockReqSpoof), '203.0.113.195');

    // 5. IP Normalization
    assert.strictEqual(normalizeIp('::ffff:192.168.1.1'), '192.168.1.1');
    assert.strictEqual(normalizeIp('  192.168.1.1  '), '192.168.1.1');
  });

  // --------------------------------------------------------------------------
  // Scenario 14: Reset timestamp is correctly calculated and anchored
  // --------------------------------------------------------------------------
  it('Scenario 14: Reset timestamp is anchored to the first request (not sliding)', async () => {
    const ip = 'test_ip_scenario_14_anchoring';
    const ipHash = hashIp(ip);
    const t0 = new Date('2026-09-13T18:00:00.000Z');
    const t1 = new Date('2026-09-14T12:00:00.000Z'); // 18 hours later

    // Message 1 at T0
    const res1 = await reserveDeepSeekQuota(ipHash, t0);
    const expectedReset = new Date(t0.getTime() + DEEPSEEK_WINDOW_MS);
    assert.strictEqual(res1.resetAt?.toISOString(), expectedReset.toISOString());

    // Message 2 at T1 (18 hours later)
    const res2 = await reserveDeepSeekQuota(ipHash, t1);
    // MUST STILL BE T0 + 3 days, NOT T1 + 3 days!
    assert.strictEqual(
      res2.resetAt?.toISOString(),
      expectedReset.toISOString(),
      'Expiration must be anchored to window start, not slid forward by request 2'
    );
  });

  // --------------------------------------------------------------------------
  // Scenario 15: Existing Groq functionality continues to work
  // --------------------------------------------------------------------------
  it('Scenario 15: Existing Groq models are correctly distinguished from DeepSeek', () => {
    assert.strictEqual(isDeepSeekModel('deepseek-chat'), true);
    assert.strictEqual(isDeepSeekModel('deepseek-reasoner'), true);
    assert.strictEqual(isDeepSeekModel('deepseek/deepseek-chat'), true);
    assert.strictEqual(isDeepSeekModel('deepseek'), true);

    assert.strictEqual(isDeepSeekModel('llama-3.3-70b-versatile'), false);
    assert.strictEqual(isDeepSeekModel('llama-3.1-8b-instant'), false);
    assert.strictEqual(isDeepSeekModel('groq/compound'), false);
    assert.strictEqual(isDeepSeekModel('qwen/qwen3.8-27b'), false);
  });
});
