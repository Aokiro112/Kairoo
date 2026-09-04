import { Router, Request, Response } from 'express';
import { prisma } from '../db';

export const projectsRouter = Router();

// GET all projects
projectsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
      },
    });
    res.json(projects);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new project
projectsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, targetDomain } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        targetDomain: targetDomain?.trim() || null,
      },
    });
    res.status(201).json(project);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE project by ID
projectsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.project.delete({ where: { id } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
