import { z } from 'zod';

export const KnowledgeFileSchema = z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
    lastModified: z.number().optional()
});

export const AgentSchema = z.object({
    id: z.string(),
    name: z.string(),
    role: z.string(),
    model: z.string(),
    systemPrompt: z.string(),
    ragEnabled: z.boolean(),
    avatarUrl: z.string().optional(),
    knowledgeFiles: z.array(KnowledgeFileSchema).default([]),
    createdAt: z.string(),
});

export const WorkflowSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    orchestratorPrompt: z.string().optional(),
    steps: z.array(z.any()).default([]),
    createdAt: z.string(),
});
