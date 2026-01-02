// utils/evvApiClient.ts
import { z } from 'zod';
import { getCampaignLogger } from '../services/orchestration/orchestrator';
import { APIError, JSONParseError, ValidationError, TimeoutError, NetworkError } from './errors';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

/**
 * Options pour une requête EVV
 */
interface EVVRequestOptions<T> {
    endpoint: string;
    schema: z.ZodSchema<T>;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    cacheKey?: string;
    cacheTTL?: number; // En millisecondes
    maxRetries?: number;
    retryDelay?: number; // Délai initial en ms
    timeout?: number; // Timeout en ms
    retryableStatuses?: number[]; // Status codes qui déclenchent un retry
}

/**
 * Entrée de cache
 */
interface CacheEntry<T> {
    data: T;
    expires: number;
}

/**
 * Client API avec pattern EVV (Execute-Verify-Validate)
 * 
 * EXECUTE : Effectue la requête HTTP
 * VERIFY  : Parse et vérifie la validité du JSON
 * VALIDATE: Valide avec Zod et sanitize les données
 */
export class EVVApiClient {
    private logger = getCampaignLogger();
    private cache = new Map<string, CacheEntry<any>>();

    // Configuration par défaut
    private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly DEFAULT_MAX_RETRIES = 2;
    private readonly DEFAULT_RETRY_DELAY = 1000; // 1 seconde
    private readonly DEFAULT_TIMEOUT = 30000; // 30 secondes
    private readonly DEFAULT_RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504];

    /**
     * Effectue une requête avec le pattern EVV complet
     */
    async request<T>(options: EVVRequestOptions<T>): Promise<T> {
        const {
            endpoint,
            schema,
            method = 'GET',
            body,
            headers = {},
            cacheKey,
            cacheTTL = this.DEFAULT_CACHE_TTL,
            maxRetries = this.DEFAULT_MAX_RETRIES,
            retryDelay = this.DEFAULT_RETRY_DELAY,
            timeout = this.DEFAULT_TIMEOUT,
            retryableStatuses = this.DEFAULT_RETRYABLE_STATUSES,
        } = options;

        const sessionId = `api-${method}-${endpoint.replace(/\//g, '-')}-${Date.now()}`;

        // Vérifier le cache (seulement pour GET)
        if (cacheKey && method === 'GET') {
            const cached = this.getFromCache<T>(cacheKey);
            if (cached !== null) {
                this.logger.logPhase(sessionId, {
                    phaseId: `cache-hit-${endpoint}`,
                    status: 'completed',
                    latency: 0,
                });
                console.log(`[EVV] ✓ Cache HIT for ${cacheKey}`);
                return cached;
            }
            console.log(`[EVV] ✗ Cache MISS for ${cacheKey}`);
        }

        let lastError: Error;

        // Retry loop
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const startTime = Date.now();

            try {
                // ==========================================
                // PHASE 1: EXECUTE
                // ==========================================
                this.logger.logPhase(sessionId, {
                    phaseId: `execute-${endpoint}`,
                    status: 'running',
                });
                console.log(`[EVV][${attempt + 1}/${maxRetries + 1}] EXECUTE: ${method} ${endpoint}`);

                const response = await this.executeWithTimeout(
                    fetch(`${API_BASE_URL}${endpoint}`, {
                        method,
                        headers: {
                            'Content-Type': 'application/json',
                            ...headers,
                        },
                        body: body ? JSON.stringify(body) : undefined,
                    }),
                    timeout,
                    endpoint
                );

                // Vérifier le statut HTTP
                if (!response.ok) {
                    const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                    // Retry si c'est un status retryable
                    if (retryableStatuses.includes(response.status) && attempt < maxRetries) {
                        console.warn(`[EVV] ⚠️  ${errorMessage} - Retrying...`);
                        throw new APIError(errorMessage, response.status, endpoint, method);
                    }

                    // Sinon, erreur finale
                    this.logger.logPhase(sessionId, {
                        phaseId: `execute-${endpoint}`,
                        status: 'failed',
                        error: errorMessage,
                        latency: Date.now() - startTime,
                    });
                    throw new APIError(errorMessage, response.status, endpoint, method);
                }

                // ==========================================
                // PHASE 2: VERIFY (JSON Parsing)
                // ==========================================
                this.logger.logPhase(sessionId, {
                    phaseId: `verify-${endpoint}`,
                    status: 'running',
                });
                console.log(`[EVV] VERIFY: Parsing JSON response`);

                let rawData: unknown;
                try {
                    rawData = await response.json();
                } catch (jsonError) {
                    const responseText = await response.text().catch(() => 'Unable to read response body');

                    this.logger.logPhase(sessionId, {
                        phaseId: `verify-${endpoint}`,
                        status: 'failed',
                        error: 'JSON parsing failed',
                        latency: Date.now() - startTime,
                    });

                    throw new JSONParseError(
                        'Failed to parse server response as JSON',
                        endpoint,
                        responseText.substring(0, 200),
                        jsonError
                    );
                }

                console.log(`[EVV] ✓ JSON parsed successfully`);

                // ==========================================
                // PHASE 3: VALIDATE (Schema Validation)
                // ==========================================
                this.logger.logPhase(sessionId, {
                    phaseId: `validate-${endpoint}`,
                    status: 'running',
                });
                console.log(`[EVV] VALIDATE: Running Zod schema validation`);

                const validationResult = schema.safeParse(rawData);

                if (!validationResult.success) {
                    const errors = validationResult.error.errors.map(
                        err => `${err.path.join('.')}: ${err.message}`
                    );

                    this.logger.logPhase(sessionId, {
                        phaseId: `validate-${endpoint}`,
                        status: 'failed',
                        error: `Validation failed: ${errors.join(', ')}`,
                        latency: Date.now() - startTime,
                    });

                    console.error(`[EVV] ✗ Validation FAILED:`, errors);

                    throw new ValidationError(
                        'Response validation failed',
                        errors,
                        endpoint,
                        validationResult.error
                    );
                }

                console.log(`[EVV] ✓ Validation PASSED`);

                // Sanitize (nettoyage XSS, injection, etc.)
                const sanitizedData = this.sanitize(validationResult.data);

                // Mise en cache (seulement pour GET)
                if (cacheKey && method === 'GET') {
                    this.setCache(cacheKey, sanitizedData, cacheTTL);
                    console.log(`[EVV] ✓ Cached result for key: ${cacheKey} (TTL: ${cacheTTL}ms)`);
                }

                // Log de succès
                const duration = Date.now() - startTime;
                this.logger.logPhase(sessionId, {
                    phaseId: `validate-${endpoint}`,
                    status: 'completed',
                    latency: duration,
                });

                console.log(`[EVV] ✓ Request completed successfully in ${duration}ms`);

                return sanitizedData;

            } catch (error) {
                lastError = error as Error;

                const duration = Date.now() - startTime;

                // Log de l'erreur
                this.logger.logPhase(sessionId, {
                    phaseId: `execute-${endpoint}`,
                    status: 'failed',
                    error: lastError.message,
                    latency: duration,
                });

                // Retry si possible
                if (
                    attempt < maxRetries &&
                    (error instanceof APIError || error instanceof NetworkError)
                ) {
                    const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
                    console.warn(
                        `[EVV] ⚠️  Attempt ${attempt + 1} failed: ${lastError.message}`
                    );
                    console.warn(`[EVV] 🔄 Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                    continue;
                }

                // Pas de retry possible, on relance l'erreur
                console.error(`[EVV] ✗ Request failed after ${attempt + 1} attempts:`, lastError.message);
                throw lastError;
            }
        }

        // Si on arrive ici, tous les retries ont échoué
        throw lastError!;
    }

    /**
     * Execute fetch avec timeout
     */
    private async executeWithTimeout<T>(
        promise: Promise<T>,
        timeoutMs: number,
        endpoint: string
    ): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new TimeoutError(
                    `Request timeout after ${timeoutMs}ms`,
                    timeoutMs,
                    endpoint
                ));
            }, timeoutMs);
        });

        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
    }

    /**
     * Sanitize data (nettoyage XSS, injection, etc.)
     */
    private sanitize<T>(data: T): T {
        if (typeof data === 'string') {
            // Nettoyage basique XSS
            return data
                .replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
                .replace(/javascript:/gi, '')
                .trim() as unknown as T;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitize(item)) as unknown as T;
        }

        if (typeof data === 'object' && data !== null) {
            const cleaned: any = {};
            for (const [key, value] of Object.entries(data)) {
                cleaned[key] = this.sanitize(value);
            }
            return cleaned as T;
        }

        return data;
    }

    /**
     * Récupère depuis le cache
     */
    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now > entry.expires) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Met en cache
     */
    private setCache<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            expires: Date.now() + ttl,
        });
    }

    /**
     * Vide le cache
     */
    public clearCache(key?: string): void {
        if (key) {
            this.cache.delete(key);
            console.log(`[EVV] Cache cleared for key: ${key}`);
        } else {
            this.cache.clear();
            console.log(`[EVV] All cache cleared`);
        }
    }

    /**
     * Obtient les stats du cache
     */
    public getCacheStats() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries());

        return {
            totalEntries: entries.length,
            validEntries: entries.filter(([_, entry]) => entry.expires > now).length,
            expiredEntries: entries.filter(([_, entry]) => entry.expires <= now).length,
            keys: entries.map(([key]) => key),
        };
    }

    /**
     * Utilitaire : sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton
export const evvApiClient = new EVVApiClient();
