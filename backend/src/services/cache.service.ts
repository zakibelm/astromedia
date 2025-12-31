// Intelligent caching service for LLM responses
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class CacheService {
  private static instance: CacheService;
  private readonly TTL_SHORT = 3600; // 1 hour
  private readonly TTL_MEDIUM = 86400; // 24 hours
  private readonly TTL_LONG = 604800; // 7 days

  private constructor() {}

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate cache key from prompt + parameters
   */
  private generateKey(prefix: string, data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return `cache:${prefix}:${hash}`;
  }

  /**
   * Cache LLM response
   * Uses semantic hashing to match similar prompts
   */
  async cacheLLMResponse(params: {
    provider: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
    response: any;
    ttl?: number;
  }): Promise<void> {
    const { provider, model, prompt, systemInstruction, response, ttl } = params;

    const cacheData = {
      provider,
      model,
      prompt: prompt.toLowerCase().trim(),
      systemInstruction: systemInstruction?.toLowerCase().trim(),
    };

    const key = this.generateKey('llm', cacheData);
    const value = JSON.stringify({
      response,
      cachedAt: new Date().toISOString(),
      provider,
      model,
    });

    const cacheTTL = ttl || this.TTL_MEDIUM;

    try {
      await redis.setex(key, cacheTTL, value);
      logger.debug({ key, ttl: cacheTTL }, 'LLM response cached');
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to cache LLM response');
    }
  }

  /**
   * Get cached LLM response
   */
  async getCachedLLMResponse(params: {
    provider: string;
    model: string;
    prompt: string;
    systemInstruction?: string;
  }): Promise<any | null> {
    const { provider, model, prompt, systemInstruction } = params;

    const cacheData = {
      provider,
      model,
      prompt: prompt.toLowerCase().trim(),
      systemInstruction: systemInstruction?.toLowerCase().trim(),
    };

    const key = this.generateKey('llm', cacheData);

    try {
      const cached = await redis.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        logger.info(
          { key, cachedAt: parsed.cachedAt },
          'LLM cache hit - saved API call'
        );
        return parsed.response;
      }

      logger.debug({ key }, 'LLM cache miss');
      return null;
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to get cached LLM response');
      return null;
    }
  }

  /**
   * Cache image generation result
   */
  async cacheImageGeneration(params: {
    model: string;
    prompt: string;
    imageBase64: string;
    ttl?: number;
  }): Promise<void> {
    const { model, prompt, imageBase64, ttl } = params;

    const key = this.generateKey('image', { model, prompt: prompt.toLowerCase().trim() });
    const value = JSON.stringify({
      imageBase64,
      cachedAt: new Date().toISOString(),
      model,
    });

    const cacheTTL = ttl || this.TTL_LONG; // Images are expensive, cache longer

    try {
      await redis.setex(key, cacheTTL, value);
      logger.debug({ key, ttl: cacheTTL }, 'Image generation cached');
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to cache image');
    }
  }

  /**
   * Get cached image
   */
  async getCachedImage(params: {
    model: string;
    prompt: string;
  }): Promise<string | null> {
    const { model, prompt } = params;

    const key = this.generateKey('image', { model, prompt: prompt.toLowerCase().trim() });

    try {
      const cached = await redis.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        logger.info(
          { key, cachedAt: parsed.cachedAt },
          'Image cache hit - saved expensive API call'
        );
        return parsed.imageBase64;
      }

      return null;
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to get cached image');
      return null;
    }
  }

  /**
   * Cache video generation result
   */
  async cacheVideoGeneration(params: {
    model: string;
    prompt: string;
    videoBase64: string;
    ttl?: number;
  }): Promise<void> {
    const { model, prompt, videoBase64, ttl } = params;

    const key = this.generateKey('video', { model, prompt: prompt.toLowerCase().trim() });
    const value = JSON.stringify({
      videoBase64,
      cachedAt: new Date().toISOString(),
      model,
    });

    const cacheTTL = ttl || this.TTL_LONG; // Videos are very expensive

    try {
      await redis.setex(key, cacheTTL, value);
      logger.debug({ key, ttl: cacheTTL }, 'Video generation cached');
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to cache video');
    }
  }

  /**
   * Get cached video
   */
  async getCachedVideo(params: {
    model: string;
    prompt: string;
  }): Promise<string | null> {
    const { model, prompt } = params;

    const key = this.generateKey('video', { model, prompt: prompt.toLowerCase().trim() });

    try {
      const cached = await redis.get(key);

      if (cached) {
        const parsed = JSON.parse(cached);
        logger.info(
          { key, cachedAt: parsed.cachedAt },
          'Video cache hit - saved very expensive API call'
        );
        return parsed.videoBase64;
      }

      return null;
    } catch (error) {
      logger.error({ err: error, key }, 'Failed to get cached video');
      return null;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(`cache:${pattern}*`);

      if (keys.length === 0) {
        return 0;
      }

      const deleted = await redis.del(...keys);
      logger.info({ pattern, count: deleted }, 'Cache invalidated');
      return deleted;
    } catch (error) {
      logger.error({ err: error, pattern }, 'Failed to invalidate cache');
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    llmCacheSize: number;
    imageCacheSize: number;
    videoCacheSize: number;
  }> {
    try {
      const [llmKeys, imageKeys, videoKeys] = await Promise.all([
        redis.keys('cache:llm:*'),
        redis.keys('cache:image:*'),
        redis.keys('cache:video:*'),
      ]);

      return {
        totalKeys: llmKeys.length + imageKeys.length + videoKeys.length,
        llmCacheSize: llmKeys.length,
        imageCacheSize: imageKeys.length,
        videoCacheSize: videoKeys.length,
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get cache stats');
      return {
        totalKeys: 0,
        llmCacheSize: 0,
        imageCacheSize: 0,
        videoCacheSize: 0,
      };
    }
  }
}

export const cacheService = CacheService.getInstance();
