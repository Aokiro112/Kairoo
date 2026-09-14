import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import { prisma } from '../src/db';
import { chatRouter } from '../src/routes/chat';
import { DEEPSEEK_WINDOW_MS } from '../src/services/deepseekQuotaService';
import { hashIp } from '../src/utils/ipHash';

describe('Global Per-IP Cross-Chat Acceptance Test Suite', () => {
  let server: http.Server;
  let serverPort: number;
  let serverBaseUrl: string;
  let deepseekProviderCallCount = 0;
  const originalFetch = global.fetch;

  const FIXED_TEST_IP = '198.51.100.99';
  const ipHash = hashIp(FIXED_TEST_IP);

  const cleanupDb = async () => {
    try {
      await prisma.userUsage.deleteMany({
        where: {
          OR: [
            { identifier: `deepseek_ip:${ipHash}` },
            { ipHash },
          ],
        },
      });
      await prisma.chatMessage.deleteMany({
        where: {
          taskId: { startsWith: 'test-cross-chat-' },
        },
      });
      await prisma.taskSession.deleteMany({
        where: {
          id: { startsWith: 'test-cross-chat-' },
        },
      });
    } catch {}
  };

  before(async () => {
    await cleanupDb();

    // Mock outgoing DeepSeek API provider call to track EXACT provider call counts
    global.fetch = async (input: any, init?: any): Promise<any> => {
      const urlStr = typeof input === 'string' ? input : input?.url || '';
      if (urlStr.includes('cheaperinference.com') || urlStr.includes('deepseek.com')) {
        deepseekProviderCallCount++;

        const stream = new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();
            controller.enqueue(
              encoder.encode('data: {"choices":[{"delta":{"content":"DeepSeek live analysis"}}]}\n\n')
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

  const sendChat = async (overrides: Record<string, any> = {}) => {
    const res = await originalFetch(`${serverBaseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': FIXED_TEST_IP,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        userMessageText: 'Audit target security posture',
        ...overrides,
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

  const getDbRecord = async () => {
    return await prisma.userUsage.findFirst({
      where: {
        OR: [
          { identifier: `deepseek_ip:${ipHash}` },
          { ipHash },
        ],
      },
    });
  };

  // --------------------------------------------------------------------------
  // Chat A: Message #1 -> ALLOWED, usage = 1, provider calls = 1
  // --------------------------------------------------------------------------
  it('Step 1: Chat A / Message #1 -> ALLOWED (HTTP 200), db usage = 1, provider calls = 1', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-A', userMessageText: 'hello' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(deepseekProviderCallCount, beforeCalls + 1);

    const record = await getDbRecord();
    assert.ok(record);
    assert.strictEqual(record.deepseekUses, 1);
  });

  // --------------------------------------------------------------------------
  // Chat A: Message #2 -> ALLOWED, usage = 2, provider calls = 2
  // --------------------------------------------------------------------------
  it('Step 2: Chat A / Message #2 -> ALLOWED (HTTP 200), db usage = 2, provider calls = 2', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-A', userMessageText: 'analyze configuration' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(deepseekProviderCallCount, beforeCalls + 1);

    const record = await getDbRecord();
    assert.ok(record);
    assert.strictEqual(record.deepseekUses, 2);
  });

  // --------------------------------------------------------------------------
  // Chat A: Message #3 -> BLOCKED (HTTP 429), usage = 2 (NOT 3), provider calls = 2
  // --------------------------------------------------------------------------
  it('Step 3: Chat A / Message #3 -> BLOCKED (HTTP 429), db usage = 2 (NOT 3), provider calls = 2', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-A', userMessageText: 'third message in Chat A' });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(res.json?.limit, 2);
    assert.strictEqual(res.json?.used, 2);
    assert.strictEqual(deepseekProviderCallCount, beforeCalls, 'DeepSeek provider MUST NOT be called');

    const record = await getDbRecord();
    assert.ok(record);
    assert.strictEqual(record.deepseekUses, 2, 'Database usage MUST remain 2, NOT 3');
  });

  // --------------------------------------------------------------------------
  // CRITICAL CROSS-CHAT TEST:
  // Chat B / New Chat: Message #1 -> BLOCKED (HTTP 429), provider calls = 2
  // --------------------------------------------------------------------------
  it('Step 4: New Chat B / Message #1 -> BLOCKED (HTTP 429), provider calls remain 2', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-B', userMessageText: 'Scan example.com' });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls, 'DeepSeek provider MUST NOT be called for new chat');

    const record = await getDbRecord();
    assert.strictEqual(record?.deepseekUses, 2);
  });

  // --------------------------------------------------------------------------
  // Chat B: Message #2 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 5: New Chat B / Message #2 -> BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-B', userMessageText: 'Another message in B' });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls);

    const record = await getDbRecord();
    assert.strictEqual(record?.deepseekUses, 2);
  });

  // --------------------------------------------------------------------------
  // Chat C: Message #1 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 6: Chat C / Message #1 -> BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({ taskId: 'test-cross-chat-C', userMessageText: 'Check security headers' });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls);
  });

  // --------------------------------------------------------------------------
  // New Project: Message #1 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 7: New Project / Message #1 -> BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({
      projectId: 'project-brand-new-999',
      taskId: 'test-cross-chat-D-in-project',
      userMessageText: 'Audit new project',
    });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls);
  });

  // --------------------------------------------------------------------------
  // New Session (empty taskId and projectId): Message #1 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 8: New Session / Message #1 -> BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({
      userMessageText: 'Message with no taskId or projectId',
    });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls);
  });

  // --------------------------------------------------------------------------
  // Logout/Login (different account/email on same IP): Message #1 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 9: Different User Account on Same IP -> BLOCKED (HTTP 429)', async () => {
    const beforeCalls = deepseekProviderCallCount;
    const res = await sendChat({
      taskId: 'test-cross-chat-E-diff-account',
      userEmail: 'completely_different_user@example.com',
      userId: 'usr_new_account_9999',
      userMessageText: 'Message from new account on same IP',
    });

    assert.strictEqual(res.status, 429);
    assert.strictEqual(res.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeCalls);
  });

  // --------------------------------------------------------------------------
  // Total DeepSeek calls must still be exactly 2
  // --------------------------------------------------------------------------
  it('Step 10: Verify total DeepSeek provider calls remain exactly 2', () => {
    assert.strictEqual(deepseekProviderCallCount, 2, 'DeepSeek provider must have been called EXACTLY 2 times TOTAL');
  });

  // --------------------------------------------------------------------------
  // After 3-day expiry:
  // New Chat / Message 1 -> ALLOWED
  // New Chat / Message 2 -> ALLOWED
  // New Chat / Message 3 -> BLOCKED (HTTP 429)
  // --------------------------------------------------------------------------
  it('Step 11: After 3-day expiry: New Chat / Message 1 & 2 ALLOWED, Message 3 BLOCKED (HTTP 429)', async () => {
    // Fast-forward 3 days and 1 minute
    const expiredTime = new Date(Date.now() - (DEEPSEEK_WINDOW_MS + 60000));
    await prisma.userUsage.update({
      where: { identifier: `deepseek_ip:${ipHash}` },
      data: { deepseekWindowStart: expiredTime },
    });

    const beforeWindowResetCalls = deepseekProviderCallCount;

    // Reset Msg 1 -> ALLOWED
    const res1 = await sendChat({ taskId: 'test-cross-chat-reset-1', userMessageText: 'Window reset message 1' });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(deepseekProviderCallCount, beforeWindowResetCalls + 1);

    const rec1 = await getDbRecord();
    assert.strictEqual(rec1?.deepseekUses, 1);

    // Reset Msg 2 -> ALLOWED
    const res2 = await sendChat({ taskId: 'test-cross-chat-reset-1', userMessageText: 'Window reset message 2' });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(deepseekProviderCallCount, beforeWindowResetCalls + 2);

    const rec2 = await getDbRecord();
    assert.strictEqual(rec2?.deepseekUses, 2);

    // Reset Msg 3 -> BLOCKED (HTTP 429)
    const res3 = await sendChat({ taskId: 'test-cross-chat-reset-2', userMessageText: 'Window reset message 3 in new chat' });
    assert.strictEqual(res3.status, 429);
    assert.strictEqual(res3.json?.error, 'DEEPSEEK_LIMIT_REACHED');
    assert.strictEqual(deepseekProviderCallCount, beforeWindowResetCalls + 2, 'Provider not called for Msg 3');

    const rec3 = await getDbRecord();
    assert.strictEqual(rec3?.deepseekUses, 2, 'Database usage remains 2');
  });

  // --------------------------------------------------------------------------
  // Concurrency: two simultaneous requests from same IP when remaining=1
  // --------------------------------------------------------------------------
  it('Step 12: Concurrency safety: 2 simultaneous requests with remaining=1 -> 1 allowed, 1 rejected', async () => {
    // Reset to remaining=1
    await prisma.userUsage.update({
      where: { identifier: `deepseek_ip:${ipHash}` },
      data: { deepseekUses: 1, deepseekWindowStart: new Date() },
    });

    const [r1, r2] = await Promise.all([
      sendChat({ taskId: 'concurrent-1', userMessageText: 'Simultaneous A' }),
      sendChat({ taskId: 'concurrent-2', userMessageText: 'Simultaneous B' }),
    ]);

    const statuses = [r1.status, r2.status].sort();
    assert.deepStrictEqual(statuses, [200, 429], 'Exactly one must succeed (200) and one must be blocked (429)');

    const record = await getDbRecord();
    assert.strictEqual(record?.deepseekUses, 2, 'Database usage must be capped at 2');
  });
});
