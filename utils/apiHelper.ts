import { z } from 'zod';
import { APIError, JSONParseError, ValidationError } from './errors';
import { logger } from './logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface FetchOptions<T> extends RequestInit {
    errorMessage?: string;
    schema?: z.ZodSchema<T>;
}

export async function apiRequest<T>(
    endpoint: string,
    options: FetchOptions<T> = {}
): Promise<T> {
    const { errorMessage, schema, ...fetchOptions } = options;
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

    let data: unknown;
    try {
        data = await response.json();
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

    if (schema) {
        try {
            return schema.parse(data);
        } catch (validationError) {
            logger.error('Response validation failed', {
                endpoint,
                method,
                error: validationError,
                dataPreview: JSON.stringify(data).substring(0, 500),
            });
            throw new ValidationError(
                'Invalid API response format',
                endpoint,
                validationError
            );
        }
    }

    return data as T;
}
