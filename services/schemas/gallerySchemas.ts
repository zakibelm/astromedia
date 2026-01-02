import { z } from 'zod';

/**
 * Schéma de validation pour KnowledgeFile
 */
export const KnowledgeFileSchema = z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().optional(),
    uploadedAt: z.string().optional(),
    url: z.string().url().optional(),
});

/**
 * Schéma de validation pour Agent
 */
export const AgentSchema = z.object({
    id: z.string().min(1, 'Agent ID is required'),
    name: z.string().min(1, 'Agent name is required').max(100, 'Name too long'),
    role: z.string().min(1, 'Role is required'),
    model: z.string().min(1, 'Model is required'),
    systemPrompt: z.string(),
    ragEnabled: z.boolean(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    knowledgeFiles: z.array(KnowledgeFileSchema).default([]),
    createdAt: z.string().datetime().or(z.string()), // Accepte ISO datetime ou string générique
});

/**
 * Schéma de validation pour WorkflowStep
 */
export const WorkflowStepSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['agent', 'api', 'condition', 'loop', 'custom']).optional(),
    config: z.record(z.unknown()).optional(),
    nextSteps: z.array(z.string()).optional(),
}).passthrough(); // Permet les propriétés supplémentaires pour compatibilité

/**
 * Schéma de validation pour Workflow
 */
export const WorkflowSchema = z.object({
    id: z.string().min(1, 'Workflow ID is required'),
    name: z.string().min(1, 'Workflow name is required').max(200, 'Name too long'),
    description: z.string().optional(),
    orchestratorPrompt: z.string().optional(),
    steps: z.array(WorkflowStepSchema).default([]),
    createdAt: z.string().datetime().or(z.string()),
});

/**
 * Type inférés de Zod (pour TypeScript)
 */
export type ValidatedAgent = z.infer<typeof AgentSchema>;
export type ValidatedWorkflow = z.infer<typeof WorkflowSchema>;
export type ValidatedKnowledgeFile = z.infer<typeof KnowledgeFileSchema>;

/**
 * Schémas pour les requêtes POST/PUT (omit id et createdAt)
 */
export const CreateAgentSchema = AgentSchema.omit({
    id: true,
    createdAt: true,
    knowledgeFiles: true
});

export const CreateWorkflowSchema = WorkflowSchema.omit({
    id: true,
    createdAt: true
}).partial();

export type CreateAgentDTO = z.infer<typeof CreateAgentSchema>;
export type CreateWorkflowDTO = z.infer<typeof CreateWorkflowSchema>;
