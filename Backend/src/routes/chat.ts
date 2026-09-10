import { Router, Response } from 'express';
import { prisma } from '../db';
import { runSecurityAgentStream } from '../agent/engine';
import { getClientIp } from '../utils/ip';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

export const chatRouter = Router();

// POST /api/chat - SSE streaming
chatRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, projectId, messages, model, userMessageText, attachments, userEmail, userId } = req.body;

    // Resolve user identifier: account email (from token or payload) > account ID > client IP
    const accountEmail = (req.user?.email || userEmail || req.body?.user?.email || '').trim().toLowerCase();
    const accountId = (req.user?.id || userId || req.body?.user?.id || '').trim().toLowerCase();
    const clientIp = getClientIp(req);

    const userIdentifier = accountEmail || accountId || `ip:${clientIp}`;

    if ((!userMessageText || typeof userMessageText !== 'string') && (!attachments || !attachments.length)) {
      return res.status(400).json({ error: 'userMessageText or attachments required' });
    }

    const currentTaskId = taskId || `task-${Date.now()}`;
    const effectiveText = userMessageText || (attachments && attachments[0] ? `Audit artifact: ${attachments[0].name}` : 'Security Audit');
    const firstLine = effectiveText.split('\n')[0].replace(/^https?:\/\//, '').slice(0, 36);
    const sessionTitle = firstLine ? firstLine.charAt(0).toUpperCase() + firstLine.slice(1) : 'Security Audit';

    // 1. Ensure TaskSession in DB
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

    // 2. Save User Message in DB
    await prisma.chatMessage.create({
      data: {
        id: `msg-${Date.now()}`,
        taskId: currentTaskId,
        role: 'user',
        content: userMessageText || '',
        attachmentsJson: attachments && attachments.length > 0 ? JSON.stringify(attachments) : null,
      },
    });

    // 3. Set SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send Meta
    res.write(
      `data: ${JSON.stringify({
        type: 'meta',
        taskId: currentTaskId,
        title: session.title,
        projectId: session.projectId,
      })}\n\n`
    );

    let accumulatedContent = '';
    const accumulatedSteps: any[] = [];

    const agentStream = runSecurityAgentStream(
      messages || [{ role: 'user', content: userMessageText || '' }],
      model,
      attachments,
      userIdentifier
    );

    for await (const event of agentStream) {
      if (event.type === 'reasoning' || event.type === 'tool_group') {
        accumulatedSteps.push(event.data);
      } else if (event.type === 'content_chunk') {
        accumulatedContent += event.data;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // 4. Save Finalized Assistant Message in DB
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
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', data: err.message })}\n\n`);
      res.end();
    }
  }
});
