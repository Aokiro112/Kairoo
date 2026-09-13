import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { runSecurityAgentStream, isDeepSeekModel } from '../agent/engine';
import { getClientIp } from '../utils/ip';
import { hashIp } from '../utils/ipHash';
import {
  reserveDeepSeekQuota,
  releaseDeepSeekReservation,
  getDeepSeekQuotaStatus,
} from '../services/deepseekQuotaService';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

export const chatRouter = Router();

/**
 * GET /api/chat/quota - Returns current DeepSeek quota status for the caller's IP
 * Allows frontend to display remaining quota without consuming a request.
 */
chatRouter.get('/quota', async (req: Request, res: Response) => {
  try {
    const clientIp = getClientIp(req);
    const ipHash = hashIp(clientIp);
    const quota = await getDeepSeekQuotaStatus(ipHash);

    res.json({
      provider: 'deepseek',
      limit: quota.limit,
      used: quota.used,
      remaining: quota.remaining,
      resetAt: quota.resetAt ? quota.resetAt.toISOString() : null,
      windowStart: quota.windowStart ? quota.windowStart.toISOString() : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve DeepSeek quota status' });
  }
});

// POST /api/chat - SSE streaming
chatRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskId, projectId, messages, model, userMessageText, attachments, userEmail, userId } = req.body;

  // Derive client IP strictly from trusted server-side proxy headers; ignore any client-supplied body IP
  const clientIp = getClientIp(req);
  const ipHash = hashIp(clientIp);
  const isDeepSeek = isDeepSeekModel(model);

  let deepseekQuotaReserved = false;
  let hasProducedUsableContent = false;

  try {
    // --------------------------------------------------------------------------
    // 1. Quota Verification & Reservation
    // --------------------------------------------------------------------------
    if (isDeepSeek) {
      // Enforce strict 2-request per 3-day rolling window per IP hash
      const quota = await reserveDeepSeekQuota(ipHash);

      if (!quota.allowed) {
        return res.status(429).json({
          error: 'DEEPSEEK_LIMIT_REACHED',
          message: 'You have used your 2 DeepSeek messages.',
          limit: quota.limit,
          used: quota.used,
          resetAt: quota.resetAt ? quota.resetAt.toISOString() : null,
        });
      }

      deepseekQuotaReserved = true;
    } else {
      // General Free Tier Quota (Groq) - Preserved existing functionality
      const accountEmail = (req.user?.email || userEmail || req.body?.user?.email || '').trim().toLowerCase();
      const accountId = (req.user?.id || userId || req.body?.user?.id || '').trim().toLowerCase();
      const userIdentifier = accountEmail || accountId || `ip:${clientIp}`;

      const MAX_FREE_CHATS = 2;
      let currentUsage = 0;
      try {
        const record = await prisma.userUsage.findUnique({
          where: { identifier: userIdentifier },
        });
        if (record) {
          currentUsage = record.chatUses;
        }
      } catch {}

      if (currentUsage >= MAX_FREE_CHATS) {
        return res.status(429).json({
          error: `Aapki 2 free chat queries ki limit poori ho chuki hai (${currentUsage}/${MAX_FREE_CHATS} used). Aage use karne ke liye please account upgrade karein.`,
          limitReached: true,
          currentUsage,
          maxUses: MAX_FREE_CHATS,
        });
      }

      // Increment usage counter in persistent database for general free quota
      try {
        await prisma.userUsage.upsert({
          where: { identifier: userIdentifier },
          update: { chatUses: { increment: 1 } },
          create: { identifier: userIdentifier, chatUses: 1 },
        });
      } catch {}
    }

    // --------------------------------------------------------------------------
    // 2. Input Validation
    // --------------------------------------------------------------------------
    if ((!userMessageText || typeof userMessageText !== 'string') && (!attachments || !attachments.length)) {
      if (deepseekQuotaReserved) {
        await releaseDeepSeekReservation(ipHash).catch(() => {});
      }
      return res.status(400).json({ error: 'userMessageText or attachments required' });
    }

    const currentTaskId = taskId || `task-${Date.now()}`;
    const effectiveText = userMessageText || (attachments && attachments[0] ? `Audit artifact: ${attachments[0].name}` : 'Security Audit');
    const firstLine = effectiveText.split('\n')[0].replace(/^https?:\/\//, '').slice(0, 36);
    const sessionTitle = firstLine ? firstLine.charAt(0).toUpperCase() + firstLine.slice(1) : 'Security Audit';

    // --------------------------------------------------------------------------
    // 3. Ensure TaskSession in DB
    // --------------------------------------------------------------------------
    let session = await prisma.taskSession.findUnique({
      where: { id: currentTaskId },
    });

    if (!session) {
      session = await prisma.taskSession.create({
        data: {
          id: currentTaskId,
          title: sessionTitle,
          projectId: projectId || null,
        },
      });
    }

    // --------------------------------------------------------------------------
    // 4. Save User Message in DB
    // --------------------------------------------------------------------------
    await prisma.chatMessage.create({
      data: {
        id: `msg-${Date.now()}`,
        taskId: currentTaskId,
        role: 'user',
        content: userMessageText || '',
        attachmentsJson: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    });

    // --------------------------------------------------------------------------
    // 5. Initialize SSE Stream Headers
    // --------------------------------------------------------------------------
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Emit initial metadata event
    res.write(
      `data: ${JSON.stringify({
        type: 'meta',
        taskId: currentTaskId,
        title: session.title,
        projectId: session.projectId,
        provider: isDeepSeek ? 'deepseek' : 'groq',
      })}\n\n`
    );

    let accumulatedContent = '';
    const accumulatedSteps: any[] = [];

    // --------------------------------------------------------------------------
    // 6. Execute ReAct Security Agent Stream
    // --------------------------------------------------------------------------
    const agentStream = runSecurityAgentStream(
      messages || [{ role: 'user', content: userMessageText || '' }],
      model,
      attachments,
      isDeepSeek ? ipHash : (req.user?.email || `ip:${clientIp}`),
      {
        onFirstContentProduced: () => {
          hasProducedUsableContent = true;
        },
      }
    );

    for await (const event of agentStream) {
      if (event.type === 'reasoning' || event.type === 'tool_group') {
        hasProducedUsableContent = true;
        const stepId = event.data?.id;
        const existingIdx = accumulatedSteps.findIndex((s) => s.id === stepId);
        if (existingIdx >= 0) {
          accumulatedSteps[existingIdx] = { ...accumulatedSteps[existingIdx], ...event.data };
        } else {
          accumulatedSteps.push(event.data);
        }
      } else if (event.type === 'content_chunk') {
        hasProducedUsableContent = true;
        accumulatedContent += event.data;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // --------------------------------------------------------------------------
    // 7. Save Finalized Assistant Message in DB
    // --------------------------------------------------------------------------
    const assistantMsgId = `msg-ai-${Date.now()}`;
    await prisma.chatMessage.create({
      data: {
        id: assistantMsgId,
        taskId: currentTaskId,
        role: 'assistant',
        content: accumulatedContent,
        stepsJson: accumulatedSteps.length > 0 ? JSON.stringify(accumulatedSteps) : null,
      },
    });

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        assistantMsgId,
      })}\n\n`
    );
    res.end();
  } catch (err: any) {
    // Only release reserved DeepSeek quota if no usable content was actually produced.
    // If content was already generated and streamed, the quota must remain consumed
    // even if a downstream error (DB save, client disconnect) occurs afterward.
    if (deepseekQuotaReserved && !hasProducedUsableContent) {
      await releaseDeepSeekReservation(ipHash).catch((relErr) => {
        console.error('Failed to release DeepSeek quota on error:', relErr);
      });
    }

    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error during chat processing' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: err.message || 'An error occurred during generation' })}\n\n`);
      res.end();
    }
  }
});
