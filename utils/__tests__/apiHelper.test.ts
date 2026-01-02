import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from '../apiHelper';
import { APIError, JSONParseError, ValidationError } from '../errors';
import { z } from 'zod';

// Mock generic fetch
global.fetch = vi.fn();

describe('apiHelper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch data successfully', async () => {
        const mockData = { id: 1, name: 'Test' };
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        } as Response);

        const result = await apiRequest('/test');
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw APIError when response is not ok', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
        } as Response);

        await expect(apiRequest('/test')).rejects.toThrow(APIError);
        await expect(apiRequest('/test')).rejects.toThrow('API request failed: Not Found');
    });

    it('should throw JSONParseError when response is not JSON', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => { throw new Error('Invalid JSON') },
            text: async () => '<html>Error</html>',
        } as Response);

        await expect(apiRequest('/test')).rejects.toThrow(JSONParseError);
    });

    it('should validate data with Zod schema', async () => {
        const mockData = { id: '1', name: 'Test' };
        const Schema = z.object({
            id: z.string(),
            name: z.string(),
        });

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        const result = await apiRequest('/test', { schema: Schema });
        expect(result).toEqual(mockData);
    });

    it('should throw ValidationError when data does not match schema', async () => {
        const mockData = { id: 1, name: 'Test' }; // id is number, schema expects string
        const Schema = z.object({
            id: z.string(),
            name: z.string(),
        });

        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        } as Response);

        await expect(apiRequest('/test', { schema: Schema })).rejects.toThrow(ValidationError);
    });
});
