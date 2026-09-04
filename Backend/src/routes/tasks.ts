import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export const tasksRouter = Router();

// GET all task sessions
tasksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.taskSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    const formatted = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      createdAt: t.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      updatedAt: t.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: t.messages.map((m) => {
        let steps = undefined;
        if (m.stepsJson) {
          try {
            steps = JSON.parse(m.stepsJson);
          } catch {}
        }
        return {
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content || '',
          steps,
          timestamp: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }),
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all task sessions
tasksRouter.delete('/', async (req: Request, res: Response) => {
  try {
    await prisma.chatMessage.deleteMany({});
    await prisma.taskSession.deleteMany({});
    res.json({ success: true, message: 'All tasks deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE task session by ID
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.taskSession.delete({ where: { id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
