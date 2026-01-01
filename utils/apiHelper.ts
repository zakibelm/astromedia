import { APIError, JSONParseError } from './errors';
import { logger } from './logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions extends RequestInit {
    errorMessage?: string;
}

export async function apiRequest<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { errorMessage, ...fetchOptions } = options;
    const startTime = performance.now();
    const method = fetchOptions.method || 'GET';

    logger.debug('API Request started', { endpoint, method });

    let response: Response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions.headers,
            },
            ...fetchOptions,
        });
    } catch (networkError) {
        const duration = performance.now() - startTime;
        logger.error('Network request failed', {
            endpoint,
            method,
            duration,
            error: networkError instanceof Error ? networkError.message : 'Unknown network error'
        });
        throw new Error(`Network request failed: ${networkError instanceof Error ? networkError.message : 'Unknown error'}`);
    }

    const duration = performance.now() - startTime;

    if (!response.ok) {
        logger.warn('API Request returned error status', {
            endpoint,
            method,
            statusCode: response.status,
            duration,
        });
        throw new APIError(
            errorMessage || `API request failed: ${response.statusText}`,
            response.status,
            endpoint
        );
    }

    logger.info('API Request completed', {
        endpoint,
        method,
        statusCode: response.status,
        duration,
    });

    try {
        return await response.json();
    } catch (error) {
        const responseText = await response.text().catch(() => 'Unable to read response');
        logger.error('JSON parsing failed', {
            endpoint,
            method,
            responsePreview: responseText.substring(0, 200),
        });
        throw new JSONParseError(
            'Failed to parse server response as JSON',
            endpoint,
            responseText.substring(0, 200),
            error
        );
    }
}
