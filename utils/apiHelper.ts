import { APIError, JSONParseError } from './errors';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
    errorMessage?: string;
}

export async function apiRequest<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { errorMessage, ...fetchOptions } = options;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
        },
        ...fetchOptions,
    });

    if (!response.ok) {
        throw new APIError(
            errorMessage || `API request failed: ${response.statusText}`,
            response.status,
            endpoint
        );
    }

    try {
        return await response.json();
    } catch (error) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        throw new JSONParseError(
            'Failed to parse server response as JSON',
            endpoint,
            responseText.substring(0, 200), // Premiers 200 chars pour debug
            error
        );
    }
}
