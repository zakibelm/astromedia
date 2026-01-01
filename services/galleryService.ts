import { KnowledgeFile } from '../types';
import { apiRequest } from '../utils/apiHelper';

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
            errorMessage: 'Failed to fetch agents'
        });
    },

    async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'knowledgeFiles'>): Promise<Agent> {
        return apiRequest<Agent>('/agents', {
            method: 'POST',
            body: JSON.stringify(agentData),
            errorMessage: 'Failed to create agent'
        });
    },

    async getAgentById(id: string): Promise<Agent> {
        return apiRequest<Agent>(`/agents/${id}`, {
            errorMessage: 'Failed to fetch agent'
        });
    },

    // --- WORKFLOWS ---
    async getWorkflows(): Promise<Workflow[]> {
        return apiRequest<Workflow[]>('/workflows', {
            errorMessage: 'Failed to fetch workflows'
        });
    },

    async saveWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
        return apiRequest<Workflow>('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflowData),
            errorMessage: 'Failed to save workflow'
        });
    }
};
