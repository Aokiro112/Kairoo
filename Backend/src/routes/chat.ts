import { Router, Request, Response } from 'express';
import { prisma } from '../db';
import { runSecurityAgentStream } from '../agent/engine';

export const chatRouter = Router();

// POST /api/chat - SSE streaming
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { taskId, projectId, messages, model, userMessageText } = req.body;

    if (!userMessageText || typeof userMessageText !== 'string') {
      return res.status(400).json({ error: 'userMessageText is required' });
    }

    const currentTaskId = taskId || `task-${Date.now()}`;
    const firstLine = userMessageText.split('\n')[0].replace(/^https?:\/\//, '').slice(0, 36);
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
        content: userMessageText,
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
      messages || [{ role: 'user', content: userMessageText }],
      model
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
