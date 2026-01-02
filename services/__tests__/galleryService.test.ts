import { describe, it, expect, vi, beforeEach } from 'vitest';
import { galleryService } from '../galleryService';
import { apiRequest } from '../../utils/apiHelper';

// Mock apiRequest directly
vi.mock('../../utils/apiHelper', () => ({
    apiRequest: vi.fn(),
}));

describe('galleryService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('getAgents should call apiRequest with correct path and schema', async () => {
        const mockAgents = [{ id: '1', name: 'Agent 1' }];
        vi.mocked(apiRequest).mockResolvedValue(mockAgents);

        const result = await galleryService.getAgents();

        expect(apiRequest).toHaveBeenCalledWith('/agents', expect.objectContaining({
            errorMessage: 'Failed to fetch agents',
            schema: expect.any(Object) // Checking if schema is passed
        }));
        expect(result).toEqual(mockAgents);
    });

    it('createAgent should call apiRequest with POST method', async () => {
        const newAgent = { name: 'New Agent', role: 'Role', model: 'gpt-4', systemPrompt: 'Prompt', ragEnabled: false };
        const createdAgent = { id: '123', ...newAgent, createdAt: 'date' };

        vi.mocked(apiRequest).mockResolvedValue(createdAgent);

        // @ts-ignore - mock data doesn't need to match full type for this test
        await galleryService.createAgent(newAgent);

        expect(apiRequest).toHaveBeenCalledWith('/agents', expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(newAgent),
            errorMessage: 'Failed to create agent',
        }));
    });
});
