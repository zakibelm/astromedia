// services/__tests__/galleryService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { galleryService } from '../galleryService';
import { evvApiClient } from '../../utils/evvApiClient';

// Mock the entire evvApiClient module
vi.mock('../../utils/evvApiClient', () => ({
    evvApiClient: {
        request: vi.fn(),
        clearCache: vi.fn(),
        getCacheStats: vi.fn().mockReturnValue({
            totalEntries: 0,
            validEntries: 0,
            expiredEntries: 0,
            keys: [],
        }),
    }
}));

describe('galleryService with EVV', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getAgents', () => {
        it('should fetch agents successfully', async () => {
            const mockAgents = [
                {
                    id: '1',
                    name: 'Test Agent',
                    role: 'CMO',
                    model: 'gpt-4',
                    systemPrompt: 'You are a CMO',
                    ragEnabled: true,
                    knowledgeFiles: [],
                    createdAt: '2024-01-01T00:00:00Z',
                },
            ];

            // Mock successful return from client
            vi.mocked(evvApiClient.request).mockResolvedValue(mockAgents);

            const result = await galleryService.getAgents();

            expect(result).toEqual(mockAgents);
            // Verify it called the client with correct endpoint and GET
            expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                endpoint: '/agents',
                method: 'GET'
            }));
        });

        it('should propagate errors from client', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('EVV Client Error'));

            await expect(galleryService.getAgents()).rejects.toThrow('EVV Client Error');
        });
    });

    describe('Cache & Clear', () => {
        it('should call clearCache on update', async () => {
            await galleryService.updateAgent('123', { name: 'New Name' });

            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:123');
        });

        // Removed specific cache integration test (should be in client tests)
        // because we are now mocking the client interaction
    });
});
