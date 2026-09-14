import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { prisma } from '../src/db';
import { chatRouter } from '../src/routes/chat';
import { DEEPSEEK_WINDOW_MS } from '../src/services/deepseekQuotaService';
import { hashIp } from '../src/utils/ipHash';
import { generateDeviceToken, parseCookies, DEVICE_COOKIE_NAME } from '../src/utils/device';

describe('Account Switching & Multi-Signal Anti-Abuse DeepSeek Quota Suite', () => {
  let server: http.Server;
  let serverPort: number;
  let serverBaseUrl: string;
  let deepseekProviderCallCount = 0;
  const originalFetch = global.fetch;

  const TEST_IP_A = '198.51.100.120';
  const TEST_IP_B = '198.51.100.121'; // e.g. mobile hotspot / cellular IP
  const ipHashA = hashIp(TEST_IP_A);
  const ipHashB = hashIp(TEST_IP_B);

  // Device D: Persistent first-party server-signed device token
  let deviceTokenD: string;
  let deviceCookieHeader: string;

  const cleanupDb = async () => {
    try {
      await prisma.userUsage.deleteMany({
        where: {
          OR: [
            { identifier: { startsWith: 'deepseek_' } },
            { ipHash: ipHashA },
            { ipHash: ipHashB },
            { accountEmails: { contains: 'google_account_a@kairo.test' } },
            { accountEmails: { contains: 'google_account_b@kairo.test' } },
            { accountEmails: { contains: 'google_account_c@kairo.test' } },
          ],
        },
      });
      await prisma.chatMessage.deleteMany({
        where: { taskId: { startsWith: 'test-anti-abuse-' } },
      });
      await prisma.taskSession.deleteMany({
        where: { id: { startsWith: 'test-anti-abuse-' } },
      });
    } catch {}
  };

  before(async () => {
    await cleanupDb();

    // Generate a valid server-signed device token to simulate a persistent browser installation
    deviceTokenD = generateDeviceToken();
    deviceCookieHeader = `${DEVICE_COOKIE_NAME}=${deviceTokenD}`;

    // Mock outgoing DeepSeek API provider to count exact provider invocations
    global.fetch = async (input: any, init?: any): Promise<any> => {
      const urlStr = typeof input === 'string' ? input : input?.url || '';
      if (urlStr.includes('cheaperinference.com') || urlStr.includes('deepseek.com')) {
        deepseekProviderCallCount++;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"DeepSeek live security audit."}}]}\n\n')
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(stream, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        });
      }

      return originalFetch(input, init);
    };

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
    global.fetch = originalFetch;
    await cleanupDb();
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await prisma.$disconnect();
  });

  const sendChatRequest = async (opts: {
    email: string;
    ip?: string;
    cookie?: string;
    taskId?: string;
    projectId?: string;
  }) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Forwarded-For': opts.ip || TEST_IP_A,
    };
    if (opts.cookie) {
      headers['Cookie'] = opts.cookie;
    }

    const res = await originalFetch(`${serverBaseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        taskId: opts.taskId || `test-anti-abuse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        projectId: opts.projectId || undefined,
        model: 'deepseek-chat',
        userMessageText: 'Audit login portal for security issues',
        userEmail: opts.email,
        messages: [{ role: 'user', content: 'Audit login portal for security issues' }],
      }),
    });

    return res;
  };

  // --------------------------------------------------------------------------
  // Test A: Google Account A on Device D + IP A
  // --------------------------------------------------------------------------
  it('Test A.1: Google Account A on Device D + IP A sends Message #1 -> ALLOWED (HTTP 200 SSE)', async () => {
    const res = await sendChatRequest({
      email: 'google_account_a@kairo.test',
      cookie: deviceCookieHeader,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));
    assert.strictEqual(deepseekProviderCallCount, 1, 'DeepSeek provider called exactly 1 time');
  });

  it('Test A.2: Google Account A on Device D + IP A sends Message #2 -> ALLOWED (HTTP 200 SSE)', async () => {
    const res = await sendChatRequest({
      email: 'google_account_a@kairo.test',
      cookie: deviceCookieHeader,
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/event-stream'));
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider called exactly 2 times');
  });

  it('Test A.3: Google Account A on Device D + IP A sends Message #3 -> BLOCKED with HTTP 429 (quota exhausted)', async () => {
    const res = await sendChatRequest({
      email: 'google_account_a@kairo.test',
      cookie: deviceCookieHeader,
    });

    assert.strictEqual(res.status, 429, 'Expected HTTP 429 Too Many Requests');
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(body.limit, 2);
    assert.strictEqual(body.used, 2);
    assert.ok(body.resetAt, 'resetAt timestamp must be provided');
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider MUST NOT be called for blocked request #3');
  });

  // --------------------------------------------------------------------------
  // Test B: Logout Account A -> Login Google Account B on Same Device D + Same IP A
  // --------------------------------------------------------------------------
  it('Test B.1: Logout Account A, Login Google Account B on same Device D + same IP A -> BLOCKED with HTTP 429', async () => {
    const res = await sendChatRequest({
      email: 'google_account_b@kairo.test',
      cookie: deviceCookieHeader, // Same device/browser cookie
      ip: TEST_IP_A,             // Same IP
    });

    assert.strictEqual(res.status, 429, 'Switching to Google Account B MUST NOT grant a fresh quota');
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(body.used, 2);
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider MUST NOT be called for Account B');
  });

  it('Test B.2: Google Account B sends another message -> STILL BLOCKED with HTTP 429', async () => {
    const res = await sendChatRequest({
      email: 'google_account_b@kairo.test',
      cookie: deviceCookieHeader,
      ip: TEST_IP_A,
    });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider call count remains strictly 2');
  });

  // --------------------------------------------------------------------------
  // Test C: Logout Account B -> Login Google Account C on Same Device D + Same IP A
  // --------------------------------------------------------------------------
  it('Test C: Logout Account B, Login Google Account C on same Device D + same IP A -> BLOCKED with HTTP 429', async () => {
    const res = await sendChatRequest({
      email: 'google_account_c@kairo.test',
      cookie: deviceCookieHeader,
      ip: TEST_IP_A,
    });

    assert.strictEqual(res.status, 429, 'Switching to Google Account C MUST NOT grant a fresh quota');
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider call count remains strictly 2');
  });

  // --------------------------------------------------------------------------
  // Test D: IP Rotation on Same Device (e.g. user toggles to mobile hotspot)
  // --------------------------------------------------------------------------
  it('Test D: Same Device D switching to a DIFFERENT IP (TEST_IP_B) with Account B -> BLOCKED with HTTP 429', async () => {
    const res = await sendChatRequest({
      email: 'google_account_b@kairo.test',
      cookie: deviceCookieHeader, // Same device cookie
      ip: TEST_IP_B,             // Rotated IP address (cellular / VPN)
    });

    assert.strictEqual(res.status, 429, 'Persistent device identifier prevents IP rotation bypass');
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider call count remains strictly 2');
  });

  // --------------------------------------------------------------------------
  // Test E: Incognito / Cleared Cookies on Same IP (TEST_IP_A)
  // --------------------------------------------------------------------------
  it('Test E: New device/incognito session on SAME IP (TEST_IP_A) -> BLOCKED with HTTP 429', async () => {
    // No cookie header passed (simulating incognito or cleared cookies)
    const res = await sendChatRequest({
      email: 'google_account_c@kairo.test',
      cookie: undefined,
      ip: TEST_IP_A,
    });

    assert.strictEqual(res.status, 429, 'IP quota signal prevents cookie-clearing bypass');
    const body = (await res.json()) as any;
    assert.strictEqual(body.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider call count remains strictly 2');
  });

  // --------------------------------------------------------------------------
  // Test F: Creating New Task / New Project / New Session
  // --------------------------------------------------------------------------
  it('Test F: Creating a new task in a new project on exhausted environment -> BLOCKED with HTTP 429', async () => {
    const res = await sendChatRequest({
      email: 'google_account_b@kairo.test',
      cookie: deviceCookieHeader,
      ip: TEST_IP_A,
      taskId: 'brand-new-task-xyz',
      projectId: 'brand-new-project-123',
    });

    assert.strictEqual(res.status, 429, 'Quota is global across all tasks and projects');
    assert.strictEqual(deepseekProviderCallCount, 2);
  });

  // --------------------------------------------------------------------------
  // Test G: Automatic Server-Side Device Cookie Issuance
  // --------------------------------------------------------------------------
  it('Test G: Server automatically issues HMAC-signed Set-Cookie when missing', async () => {
    const freshRes = await originalFetch(`${serverBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.199', // Fresh IP
      },
      body: JSON.stringify({
        userMessageText: 'Hello',
        model: 'llama-3.3-70b-versatile', // Use Groq model so it doesn't affect DeepSeek quota
      }),
    });

    const setCookieHeader = freshRes.headers.get('set-cookie');
    assert.ok(setCookieHeader, 'Set-Cookie header must be sent by server');
    assert.ok(setCookieHeader.includes('kairo_device_id='), 'Must set kairo_device_id cookie');
    assert.ok(setCookieHeader.includes('HttpOnly'), 'Cookie must be HttpOnly');
    assert.ok(setCookieHeader.includes('SameSite=Lax'), 'Cookie must be SameSite=Lax');
  });

  // --------------------------------------------------------------------------
  // Test H: 3-Day Window Preservation & Automatic Reset
  // --------------------------------------------------------------------------
  it('Test H: After 3-day cooldown expires, same environment automatically resets to 1/2', async () => {
    // Rewind the database record's deepseekWindowStart to 3 days + 1 minute in the past
    const fourDaysAgo = new Date(Date.now() - (DEEPSEEK_WINDOW_MS + 60 * 1000));
    await prisma.userUsage.updateMany({
      where: {
        OR: [
          { ipHash: ipHashA },
          { identifier: `deepseek_ip:${ipHashA}` },
        ],
      },
      data: {
        deepseekWindowStart: fourDaysAgo,
      },
    });

    // Request from same Device D + same IP A + Google Account A
    const res = await sendChatRequest({
      email: 'google_account_a@kairo.test',
      cookie: deviceCookieHeader,
      ip: TEST_IP_A,
    });

    assert.strictEqual(res.status, 200, 'Expired window must automatically reset quota and allow request');
    assert.strictEqual(deepseekProviderCallCount, 3, 'DeepSeek provider invoked for fresh window request');

    // Check that usage was reset to 1
    const quotaStatus = await prisma.userUsage.findFirst({
      where: {
        OR: [
          { ipHash: ipHashA },
          { identifier: `deepseek_ip:${ipHashA}` },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });

    assert.ok(quotaStatus, 'Database record must exist');
    assert.strictEqual(quotaStatus.deepseekUses, 1, 'Usage counter must reset to 1');
  });

  // --------------------------------------------------------------------------
  // Test I: Different Browser Context Limitation Verification
  // --------------------------------------------------------------------------
  it('Test I: Genuine different browser context (fresh device cookie + different IP) operates independently', async () => {
    const differentBrowserToken = generateDeviceToken();
    const differentBrowserCookie = `${DEVICE_COOKIE_NAME}=${differentBrowserToken}`;
    const differentIP = '198.51.100.222';

    const res = await sendChatRequest({
      email: 'google_account_other@kairo.test',
      cookie: differentBrowserCookie,
      ip: differentIP,
    });

    assert.strictEqual(res.status, 200, 'Genuine different browser on different IP has its own quota');
    assert.strictEqual(deepseekProviderCallCount, 4, 'DeepSeek called for independent environment');
  });
});
