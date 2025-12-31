import { KnowledgeFile } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

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
        const response = await fetch(`${API_BASE_URL}/agents`, {
            headers: {
                'Content-Type': 'application/json',
                // Add Authorization header here if needed, e.g. `Bearer ${token}`
            }
        });
        if (!response.ok) throw new Error('Failed to fetch agents');
        return response.json();
    },

    async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'knowledgeFiles'>): Promise<Agent> {
        const response = await fetch(`${API_BASE_URL}/agents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agentData),
        });
        if (!response.ok) throw new Error('Failed to create agent');
        return response.json();
    },

    async getAgentById(id: string): Promise<Agent> {
        const response = await fetch(`${API_BASE_URL}/agents/${id}`);
        if (!response.ok) throw new Error('Failed to fetch agent');
        return response.json();
    },

    // --- WORKFLOWS ---
    async getWorkflows(): Promise<Workflow[]> {
        const response = await fetch(`${API_BASE_URL}/workflows`, {
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Failed to fetch workflows');
        return response.json();
    },

    async saveWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
        const response = await fetch(`${API_BASE_URL}/workflows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workflowData),
        });
        if (!response.ok) throw new Error('Failed to save workflow');
        return response.json();
    }
};
