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

    describe('getAgent', () => {
        it('should fetch a single agent successfully', async () => {
            const mockAgent = {
                id: '1',
                name: 'Test Agent',
                role: 'CMO',
                model: 'gpt-4',
                systemPrompt: 'You are a CMO',
                ragEnabled: true,
                knowledgeFiles: [],
                createdAt: '2024-01-01T00:00:00Z',
            };

            vi.mocked(evvApiClient.request).mockResolvedValue(mockAgent);

            const result = await galleryService.getAgent('1');

            expect(result).toEqual(mockAgent);
            expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                endpoint: '/agents/1',
                method: 'GET'
            }));
        });

        it('should handle non-existent agent', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('Agent not found'));

            await expect(galleryService.getAgent('999')).rejects.toThrow('Agent not found');
        });
    });

    describe('createAgent', () => {
        it('should create a new agent successfully', async () => {
            const newAgent = {
                name: 'New Agent',
                role: 'Designer',
                model: 'gpt-4',
                systemPrompt: 'You are a designer',
                ragEnabled: false,
            };

            const createdAgent = {
                id: '2',
                ...newAgent,
                knowledgeFiles: [],
                createdAt: '2024-01-01T00:00:00Z',
            };

            vi.mocked(evvApiClient.request).mockResolvedValue(createdAgent);

            const result = await galleryService.createAgent(newAgent);

            expect(result).toEqual(createdAgent);
            expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                endpoint: '/agents',
                method: 'POST',
                body: newAgent
            }));
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
        });

        it('should handle validation errors', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('Validation error'));

            await expect(galleryService.createAgent({} as any)).rejects.toThrow('Validation error');
        });
    });

    describe('updateAgent', () => {
        it('should update an agent successfully', async () => {
            const updatedData = { name: 'Updated Name', role: 'Updated Role' };
            const updatedAgent = {
                id: '1',
                name: 'Updated Name',
                role: 'Updated Role',
                model: 'gpt-4',
                systemPrompt: 'You are updated',
                ragEnabled: true,
                knowledgeFiles: [],
                createdAt: '2024-01-01T00:00:00Z',
            };

            vi.mocked(evvApiClient.request).mockResolvedValue(updatedAgent);

            const result = await galleryService.updateAgent('1', updatedData);

            expect(result).toEqual(updatedAgent);
            expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                endpoint: '/agents/1',
                method: 'PUT',
                body: updatedData
            }));
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:1');
        });
    });

    describe('deleteAgent', () => {
        it('should delete an agent successfully', async () => {
            vi.mocked(evvApiClient.request).mockResolvedValue({ success: true });

            await galleryService.deleteAgent('1');

            expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                endpoint: '/agents/1',
                method: 'DELETE'
            }));
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:1');
        });

        it('should handle deletion errors', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('Agent not found'));

            await expect(galleryService.deleteAgent('999')).rejects.toThrow('Agent not found');
        });
    });

    describe('Workflow Operations', () => {
        const mockWorkflow = {
            id: 'w1',
            name: 'Test Workflow',
            description: 'A test workflow',
            phases: [],
            createdAt: '2024-01-01T00:00:00Z',
        };

        describe('getWorkflows', () => {
            it('should fetch workflows successfully', async () => {
                vi.mocked(evvApiClient.request).mockResolvedValue([mockWorkflow]);

                const result = await galleryService.getWorkflows();

                expect(result).toEqual([mockWorkflow]);
                expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                    endpoint: '/workflows',
                    method: 'GET'
                }));
            });
        });

        describe('getWorkflow', () => {
            it('should fetch a single workflow successfully', async () => {
                vi.mocked(evvApiClient.request).mockResolvedValue(mockWorkflow);

                const result = await galleryService.getWorkflow('w1');

                expect(result).toEqual(mockWorkflow);
                expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                    endpoint: '/workflows/w1',
                    method: 'GET'
                }));
            });
        });

        describe('createWorkflow', () => {
            it('should create a new workflow successfully', async () => {
                const newWorkflow = {
                    name: 'New Workflow',
                    description: 'A new workflow',
                    phases: [],
                };

                vi.mocked(evvApiClient.request).mockResolvedValue({
                    id: 'w2',
                    ...newWorkflow,
                    createdAt: '2024-01-01T00:00:00Z',
                });

                const result = await galleryService.createWorkflow(newWorkflow);

                expect(result).toHaveProperty('id');
                expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                    endpoint: '/workflows',
                    method: 'POST',
                    body: newWorkflow
                }));
                expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:all');
            });
        });

        describe('updateWorkflow', () => {
            it('should update a workflow successfully', async () => {
                const updatedData = { name: 'Updated Workflow' };

                vi.mocked(evvApiClient.request).mockResolvedValue({
                    ...mockWorkflow,
                    ...updatedData,
                });

                const result = await galleryService.updateWorkflow('w1', updatedData);

                expect(result.name).toBe('Updated Workflow');
                expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:all');
                expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:w1');
            });
        });

        describe('deleteWorkflow', () => {
            it('should delete a workflow successfully', async () => {
                vi.mocked(evvApiClient.request).mockResolvedValue({ success: true });

                await galleryService.deleteWorkflow('w1');

                expect(evvApiClient.request).toHaveBeenCalledWith(expect.objectContaining({
                    endpoint: '/workflows/w1',
                    method: 'DELETE'
                }));
                expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:all');
                expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:w1');
            });
        });
    });

    describe('Cache Management', () => {
        it('should call clearCache on agent update', async () => {
            await galleryService.updateAgent('123', { name: 'New Name' });

            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:123');
        });

        it('should call clearCache on agent deletion', async () => {
            await galleryService.deleteAgent('123');

            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:all');
            expect(evvApiClient.clearCache).toHaveBeenCalledWith('agents:123');
        });

        it('should call clearCache on workflow creation', async () => {
            await galleryService.createWorkflow({
                name: 'Test',
                description: 'Test',
                phases: [],
            });

            expect(evvApiClient.clearCache).toHaveBeenCalledWith('workflows:all');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty agent list', async () => {
            vi.mocked(evvApiClient.request).mockResolvedValue([]);

            const result = await galleryService.getAgents();

            expect(result).toEqual([]);
        });

        it('should handle empty workflow list', async () => {
            vi.mocked(evvApiClient.request).mockResolvedValue([]);

            const result = await galleryService.getWorkflows();

            expect(result).toEqual([]);
        });

        it('should handle network errors', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('Network error'));

            await expect(galleryService.getAgents()).rejects.toThrow('Network error');
        });

        it('should handle timeout errors', async () => {
            vi.mocked(evvApiClient.request).mockRejectedValue(new Error('Request timeout'));

            await expect(galleryService.getAgent('1')).rejects.toThrow('Request timeout');
        });
    });
});
