import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth'; // Assuming auth middleware exists

const router = Router();
const prisma = new PrismaClient();

// Schema for creating an agent
const createAgentSchema = z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    model: z.string(),
    systemPrompt: z.string(),
    ragEnabled: z.boolean().optional(),
    avatarUrl: z.string().optional(),
});

// GET /api/agents - List all agents for the current user
router.get('/', authenticate, async (req: any, res: Response) => {
    try {
        const agents = await prisma.aIAgent.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                knowledgeFiles: {
                    select: { id: true, name: true, fileSize: true }
                }
            }
        });
        res.json(agents);
    } catch (error) {
        console.error('Error fetching agents:', error);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});

// POST /api/agents - Create a new agent
router.post('/', authenticate, async (req: any, res: Response) => {
    try {
        const validatedData = createAgentSchema.parse(req.body);

        const agent = await prisma.aIAgent.create({
            data: {
                ...validatedData,
                userId: req.user.id,
            },
        });

        res.status(201).json(agent);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error creating agent:', error);
        res.status(500).json({ error: 'Failed to create agent' });
    }
});

// GET /api/agents/:id - Get a specific agent
router.get('/:id', authenticate, async (req: any, res: Response) => {
    try {
        const agent = await prisma.aIAgent.findUnique({
            where: { id: req.params.id },
            include: { knowledgeFiles: true }
        });

        if (!agent) return res.status(404).json({ error: 'Agent not found' });
        if (agent.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

        res.json(agent);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch agent' });
    }
});

export default router;
