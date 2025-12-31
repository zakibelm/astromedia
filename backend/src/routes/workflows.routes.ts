import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Schema for creating a workflow
const createWorkflowSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    orchestratorPrompt: z.string().optional(),
    steps: z.array(z.any()), // Validated loosely for now, can be strict if Step schema is defined
});

// GET /api/workflows - List all workflows for the current user
router.get('/', authenticate, async (req: any, res: Response) => {
    try {
        const workflows = await prisma.workflow.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json(workflows);
    } catch (error) {
        console.error('Error fetching workflows:', error);
        res.status(500).json({ error: 'Failed to fetch workflows' });
    }
});

// POST /api/workflows - Create/Save a workflow
router.post('/', authenticate, async (req: any, res: Response) => {
    try {
        const validatedData = createWorkflowSchema.parse(req.body);

        // Check if ID is provided for update
        if (req.body.id) {
            const existing = await prisma.workflow.findUnique({ where: { id: req.body.id } });
            if (!existing) return res.status(404).json({ error: 'Workflow not found' });
            if (existing.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

            const updated = await prisma.workflow.update({
                where: { id: req.body.id },
                data: {
                    name: validatedData.name,
                    description: validatedData.description,
                    orchestratorPrompt: validatedData.orchestratorPrompt,
                    steps: validatedData.steps,
                }
            });
            return res.json(updated);
        }

        const workflow = await prisma.workflow.create({
            data: {
                ...validatedData,
                userId: req.user.id,
            },
        });

        res.status(201).json(workflow);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error('Error saving workflow:', error);
        res.status(500).json({ error: 'Failed to save workflow' });
    }
});

export default router;
