import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { prisma } from '../src/db';
import { chatRouter } from '../src/routes/chat';
import {
  reserveDeepSeekQuota,
  DEEPSEEK_WINDOW_MS,
  MAX_DEEPSEEK_REQUESTS,
} from '../src/services/deepseekQuotaService';
import { hashIp } from '../src/utils/ipHash';

describe('Exact 9-Test End-to-End DeepSeek Quota Verification Suite', () => {
  let server: http.Server;
  let serverPort: number;
  let serverBaseUrl: string;
  let deepseekCallCount = 0;
  const originalFetch = global.fetch;

  const TEST_IP_A = '198.51.100.77';
  const TEST_IP_B = '198.51.100.88';

  const cleanupDb = async () => {
    try {
      const hashA = hashIp(TEST_IP_A);
      const hashB = hashIp(TEST_IP_B);
      await prisma.userUsage.deleteMany({
        where: {
          identifier: {
            in: [`deepseek_ip:${hashA}`, `deepseek_ip:${hashB}`],
          },
        },
      });
    } catch {}
  };

  before(async () => {
    await cleanupDb();

    // Intercept global.fetch to count outgoing calls to DeepSeek API endpoint
    // and provide a mock SSE streaming response so we don't depend on external network latency
    global.fetch = async (input: any, init?: any): Promise<any> => {
      const urlStr = typeof input === 'string' ? input : input?.url || '';
      if (urlStr.includes('cheaperinference.com') || urlStr.includes('deepseek.com')) {
        deepseekCallCount++;

        // Return a mock SSE stream response simulating DeepSeek API
        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"DeepSeek mock answer"}}]}\n\n')
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

    // Spin up express server with chatRouter mounted
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

  // Helper to send chat POST request
  const sendChatRequest = async (ip: string, bodyOverrides: Record<string, any> = {}) => {
    const res = await originalFetch(`${serverBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': ip,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        userMessageText: 'Test message for security analysis',
        ...bodyOverrides,
      }),
    });

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';
    let json: any = null;
    let text = '';

    if (contentType.includes('application/json')) {
      json = await res.json();
    } else {
      text = await res.text();
    }

    return { status, contentType, json, text };
  };

  // Helper to check quota status GET /api/chat/quota
  const getQuotaStatus = async (ip: string) => {
    const res = await originalFetch(`${serverBaseUrl}/api/chat/quota`, {
      headers: { 'X-Forwarded-For': ip },
    });
    return await res.json();
  };

  // --------------------------------------------------------------------------
  // TEST 1: Request: DeepSeek chat #1 -> HTTP 200 / successful response, Usage: 1/2
  // --------------------------------------------------------------------------
  it('Test 1: Request 1 from TEST_IP_A is allowed (HTTP 200 SSE, Usage: 1/2)', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 200, 'Request 1 must succeed with HTTP 200');
    assert.ok(res.contentType.includes('text/event-stream'), 'Must return SSE stream');
    assert.strictEqual(deepseekCallCount, beforeCalls + 1, 'DeepSeek API MUST be called for request #1');

    const quota = await getQuotaStatus(TEST_IP_A);
    assert.strictEqual(quota.used, 1, 'Usage must be 1');
    assert.strictEqual(quota.remaining, 1, 'Remaining must be 1');
    assert.strictEqual(quota.limit, 2, 'Limit must be 2');
    assert.ok(quota.resetAt, 'Must have resetAt timestamp');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Same IP: DeepSeek chat #2 -> HTTP 200 / successful response, Usage: 2/2
  // --------------------------------------------------------------------------
  it('Test 2: Request 2 from TEST_IP_A is allowed (HTTP 200 SSE, Usage: 2/2)', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 200, 'Request 2 must succeed with HTTP 200');
    assert.ok(res.contentType.includes('text/event-stream'), 'Must return SSE stream');
    assert.strictEqual(deepseekCallCount, beforeCalls + 1, 'DeepSeek API MUST be called for request #2');

    const quota = await getQuotaStatus(TEST_IP_A);
    assert.strictEqual(quota.used, 2, 'Usage must be 2');
    assert.strictEqual(quota.remaining, 0, 'Remaining must be 0');
    assert.strictEqual(quota.limit, 2, 'Limit must be 2');
  });

  // --------------------------------------------------------------------------
  // TEST 3: Same IP: DeepSeek chat #3 -> HTTP 429, Error: DEEPSEEK_LIMIT_REACHED
  //         MOST IMPORTANT: Verify DeepSeek provider was NOT called for request #3
  // --------------------------------------------------------------------------
  it('Test 3: Request 3 from TEST_IP_A is BLOCKED with HTTP 429 and DeepSeek is NOT called', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 429, 'Request 3 MUST return HTTP 429 Too Many Requests');
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(res.json?.limit, 2);
    assert.strictEqual(res.json?.used, 2);
    assert.ok(res.json?.resetAt, 'Must include resetAt ISO timestamp');

    // CRITICAL REQUIREMENT: Provider must NOT be called
    assert.strictEqual(
      deepseekCallCount,
      beforeCalls,
      'CRITICAL: DeepSeek API provider MUST NOT be called for request #3!'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 4: Same IP: DeepSeek chat #4 -> HTTP 429
  // --------------------------------------------------------------------------
  it('Test 4: Request 4 from TEST_IP_A is also BLOCKED with HTTP 429', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 429, 'Request 4 MUST return HTTP 429');
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekCallCount, beforeCalls, 'DeepSeek API MUST NOT be called for request #4');
  });

  // --------------------------------------------------------------------------
  // TEST 5: New task/session/project but SAME IP -> HTTP 429
  // --------------------------------------------------------------------------
  it('Test 5: New task/session/project on SAME IP is STILL BLOCKED with HTTP 429', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A, {
      taskId: `new-brand-task-${Date.now()}`,
      projectId: `new-project-${Date.now()}`,
      userEmail: 'different_user_email@example.com',
      userId: 'usr_different_account_123',
    });

    assert.strictEqual(res.status, 429, 'New task/session on same IP MUST return HTTP 429');
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekCallCount, beforeCalls, 'DeepSeek API MUST NOT be called for new session on limited IP');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Different IP -> HTTP 200 / allowed
  // --------------------------------------------------------------------------
  it('Test 6: Request from a DIFFERENT IP (TEST_IP_B) is ALLOWED (HTTP 200)', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_B);

    assert.strictEqual(res.status, 200, 'Different IP MUST be allowed with HTTP 200');
    assert.strictEqual(deepseekCallCount, beforeCalls + 1, 'DeepSeek API MUST be called for fresh IP');

    const quota = await getQuotaStatus(TEST_IP_B);
    assert.strictEqual(quota.used, 1);
    assert.strictEqual(quota.remaining, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Same original IP after 3-day expiration -> HTTP 200 / allowed, Usage: 1/2
  // --------------------------------------------------------------------------
  it('Test 7: Same original IP (TEST_IP_A) after 3-day expiration is ALLOWED and resets to 1/2', async () => {
    const ipHashA = hashIp(TEST_IP_A);

    // Simulate passage of 3 days by updating the database record deepseekWindowStart
    // to 3 days and 1 minute in the past
    const fourDaysAgo = new Date(Date.now() - (DEEPSEEK_WINDOW_MS + 60000));
    await prisma.userUsage.update({
      where: { identifier: `deepseek_ip:${ipHashA}` },
      data: { deepseekWindowStart: fourDaysAgo },
    });

    // Check quota status before sending request: should indicate window expired (used=0, remaining=2)
    const statusBefore = await getQuotaStatus(TEST_IP_A);
    assert.strictEqual(statusBefore.allowed, true);
    assert.strictEqual(statusBefore.used, 0);
    assert.strictEqual(statusBefore.remaining, 2);

    // Send chat request: window resets and consumes 1 slot
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 200, 'Expired IP must be allowed with HTTP 200');
    assert.strictEqual(deepseekCallCount, beforeCalls + 1, 'DeepSeek API MUST be called on reset');

    const statusAfter = await getQuotaStatus(TEST_IP_A);
    assert.strictEqual(statusAfter.used, 1, 'Usage must become 1 after reset');
    assert.strictEqual(statusAfter.remaining, 1, 'Remaining must be 1');
  });

  // --------------------------------------------------------------------------
  // TEST 8: Immediately send another request -> HTTP 200 / allowed, Usage becomes: 2/2
  // --------------------------------------------------------------------------
  it('Test 8: Immediately send another request after reset -> ALLOWED (HTTP 200, Usage: 2/2)', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 200, 'Second request after reset must be allowed');
    assert.strictEqual(deepseekCallCount, beforeCalls + 1);

    const statusAfter = await getQuotaStatus(TEST_IP_A);
    assert.strictEqual(statusAfter.used, 2, 'Usage must become 2');
    assert.strictEqual(statusAfter.remaining, 0, 'Remaining must become 0');
  });

  // --------------------------------------------------------------------------
  // TEST 9: Next request -> HTTP 429
  // --------------------------------------------------------------------------
  it('Test 9: Next request after consuming 2 slots in new window is BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekCallCount;
    const res = await sendChatRequest(TEST_IP_A);

    assert.strictEqual(res.status, 429, 'Third request in new window MUST return HTTP 429');
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekCallCount, beforeCalls, 'DeepSeek API MUST NOT be called');
  });
});
