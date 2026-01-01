import { z } from 'zod';
import { KnowledgeFile } from '../types';
import { apiRequest } from '../utils/apiHelper';
import { AgentSchema, WorkflowSchema } from '../utils/schemas';

export interface Agent {
    id: string;
    name: string;
    role: string;
    model: string;
    systemPrompt: string;
    ragEnabled: boolean;
    avatarUrl?: string;
    knowledgeFiles: KnowledgeFile[];
    createdAt: string;
}

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    orchestratorPrompt?: string;
    steps: any[];
    createdAt: string;
}

export const galleryService = {
    // --- AGENTS ---
    async getAgents(): Promise<Agent[]> {
        return apiRequest<Agent[]>('/agents', {
            errorMessage: 'Failed to fetch agents',
            schema: z.array(AgentSchema) as unknown as z.ZodType<Agent[]>
        });
    },

    async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'knowledgeFiles'>): Promise<Agent> {
        return apiRequest<Agent>('/agents', {
            method: 'POST',
            body: JSON.stringify(agentData),
            errorMessage: 'Failed to create agent',
            schema: AgentSchema as unknown as z.ZodType<Agent>
        });
    },

    async getAgentById(id: string): Promise<Agent> {
        return apiRequest<Agent>(`/agents/${id}`, {
            errorMessage: 'Failed to fetch agent',
            schema: AgentSchema as unknown as z.ZodType<Agent>
        });
    },

    // --- WORKFLOWS ---
    async getWorkflows(): Promise<Workflow[]> {
        return apiRequest<Workflow[]>('/workflows', {
            errorMessage: 'Failed to fetch workflows',
            schema: z.array(WorkflowSchema) as unknown as z.ZodType<Workflow[]>
        });
    },

    async saveWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
        return apiRequest<Workflow>('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflowData),
            errorMessage: 'Failed to save workflow',
            schema: WorkflowSchema as unknown as z.ZodType<Workflow>
        });
    }
};
