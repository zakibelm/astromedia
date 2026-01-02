// services/galleryService.ts
import { KnowledgeFile } from '../types';
import { evvApiClient } from '../utils/evvApiClient';
import {
    AgentSchema,
    WorkflowSchema,
    CreateAgentSchema,
    CreateWorkflowSchema,
    ValidatedAgent,
    ValidatedWorkflow,
    CreateAgentDTO,
    CreateWorkflowDTO,
} from './schemas/gallerySchemas';
import { z } from 'zod';

// Ré-export des types pour compatibilité avec le code existant
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

/**
 * Service Gallery avec pattern EVV complet
 */
export const galleryService = {
    // ==========================================
    // AGENTS
    // ==========================================

    /**
     * Récupère tous les agents
     */
    async getAgents(): Promise<Agent[]> {
        return evvApiClient.request<Agent[]>({
            endpoint: '/agents',
            schema: z.array(AgentSchema) as unknown as z.ZodSchema<Agent[]>,
            method: 'GET',
            cacheKey: 'agents:all',
            cacheTTL: 3 * 60 * 1000, // 3 minutes
            maxRetries: 3,
        });
    },

    /**
     * Crée un nouvel agent
     */
    async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'knowledgeFiles'>): Promise<Agent> {
        // Invalide le cache
        evvApiClient.clearCache('agents:all');

        return evvApiClient.request<Agent>({
            endpoint: '/agents',
            schema: AgentSchema as unknown as z.ZodSchema<Agent>,
            method: 'POST',
            body: agentData,
            maxRetries: 1, // Pas de retry pour les POST (évite duplication)
        });
    },

    /**
     * Récupère un agent par ID
     */
    async getAgentById(id: string): Promise<Agent> {
        return evvApiClient.request<Agent>({
            endpoint: `/agents/${id}`,
            schema: AgentSchema as unknown as z.ZodSchema<Agent>,
            method: 'GET',
            cacheKey: `agents:${id}`,
            cacheTTL: 5 * 60 * 1000, // 5 minutes
            maxRetries: 3,
        });
    },

    /**
     * Met à jour un agent
     */
    async updateAgent(id: string, agentData: Partial<Agent>): Promise<Agent> {
        // Invalide le cache
        evvApiClient.clearCache('agents:all');
        evvApiClient.clearCache(`agents:${id}`);

        return evvApiClient.request<Agent>({
            endpoint: `/agents/${id}`,
            schema: AgentSchema as unknown as z.ZodSchema<Agent>,
            method: 'PUT',
            body: agentData,
            maxRetries: 1,
        });
    },

    /**
     * Supprime un agent
     */
    async deleteAgent(id: string): Promise<void> {
        // Invalide le cache
        evvApiClient.clearCache('agents:all');
        evvApiClient.clearCache(`agents:${id}`);

        await evvApiClient.request({
            endpoint: `/agents/${id}`,
            schema: z.object({ success: z.boolean() }),
            method: 'DELETE',
            maxRetries: 1,
        });
    },

    // ==========================================
    // WORKFLOWS
    // ==========================================

    /**
     * Récupère tous les workflows
     */
    async getWorkflows(): Promise<Workflow[]> {
        return evvApiClient.request<Workflow[]>({
            endpoint: '/workflows',
            schema: z.array(WorkflowSchema) as unknown as z.ZodSchema<Workflow[]>,
            method: 'GET',
            cacheKey: 'workflows:all',
            cacheTTL: 3 * 60 * 1000, // 3 minutes
            maxRetries: 3,
        });
    },

    /**
     * Crée un nouveau workflow
     */
    async saveWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
        // Invalide le cache
        evvApiClient.clearCache('workflows:all');

        return evvApiClient.request<Workflow>({
            endpoint: '/workflows',
            schema: WorkflowSchema as unknown as z.ZodSchema<Workflow>,
            method: 'POST',
            body: workflowData,
            maxRetries: 1,
        });
    },

    /**
     * Récupère un workflow par ID
     */
    async getWorkflowById(id: string): Promise<Workflow> {
        return evvApiClient.request<Workflow>({
            endpoint: `/workflows/${id}`,
            schema: WorkflowSchema as unknown as z.ZodSchema<Workflow>,
            method: 'GET',
            cacheKey: `workflows:${id}`,
            cacheTTL: 5 * 60 * 1000,
            maxRetries: 3,
        });
    },

    /**
     * Met à jour un workflow
     */
    async updateWorkflow(id: string, workflowData: Partial<Workflow>): Promise<Workflow> {
        // Invalide le cache
        evvApiClient.clearCache('workflows:all');
        evvApiClient.clearCache(`workflows:${id}`);

        return evvApiClient.request<Workflow>({
            endpoint: `/workflows/${id}`,
            schema: WorkflowSchema as unknown as z.ZodSchema<Workflow>,
            method: 'PUT',
            body: workflowData,
            maxRetries: 1,
        });
    },

    /**
     * Supprime un workflow
     */
    async deleteWorkflow(id: string): Promise<void> {
        // Invalide le cache
        evvApiClient.clearCache('workflows:all');
        evvApiClient.clearCache(`workflows:${id}`);

        await evvApiClient.request({
            endpoint: `/workflows/${id}`,
            schema: z.object({ success: z.boolean() }),
            method: 'DELETE',
            maxRetries: 1,
        });
    },

    // ==========================================
    // CACHE MANAGEMENT
    // ==========================================

    /**
     * Vide tout le cache
     */
    clearAllCache(): void {
        evvApiClient.clearCache();
    },

    /**
     * Obtient les statistiques du cache
     */
    getCacheStats() {
        return evvApiClient.getCacheStats();
    },
};
