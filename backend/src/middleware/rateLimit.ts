// Advanced rate limiting with Redis backend
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

/**
 * Global rate limiter for all API endpoints
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  // store: new RedisStore({
  //   // @ts-ignore - Redis client compatibility
  //   sendCommand: (...args: string[]) => redis.call(...args),
  // }),
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      'Rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/v1/health';
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  // store: new RedisStore({
  //   // @ts-ignore
  //   sendCommand: (...args: string[]) => redis.call(...args),
  //   prefix: 'rl:auth:',
  // }),
  handler: (req, res) => {
    logger.warn(
      { ip: req.ip, path: req.path },
      'Auth rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: 900
    });
  },
  keyGenerator: (req) => {
    // Rate limit by IP + email combination
    const email = req.body?.email || 'unknown';
    return `${req.ip}-${email}`;
  }
});

/**
 * Per-user quota limiter (for LLM API calls)
 */
export const quotaLimiter = async (
  req: AuthenticatedRequest,
  res: any,
  next: any
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const { prisma } = await import('../utils/prisma');

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { apiQuota: true, apiUsed: true }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (user.apiUsed >= user.apiQuota) {
      logger.warn(
        { userId: req.user.id, used: user.apiUsed, quota: user.apiQuota },
        'User quota exceeded'
      );
      return res.status(429).json({
        error: 'Quota Exceeded',
        message: 'Monthly API quota exceeded. Please upgrade your plan or wait until next month.',
        quota: user.apiQuota,
        used: user.apiUsed
      });
    }

    // Attach quota info to request for logging
    (req as any).quota = {
      total: user.apiQuota,
      used: user.apiUsed,
      remaining: user.apiQuota - user.apiUsed
    };

    next();
  } catch (error) {
    logger.error({ err: error }, 'Quota check error');
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to check quota'
    });
  }
};

/**
 * Rate limiter for expensive AI generation endpoints
 */
export const aiGenerationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  // store: new RedisStore({
  //   // @ts-ignore
  //   sendCommand: (...args: string[]) => redis.call(...args),
  //   prefix: 'rl:ai:',
  // }),
  handler: (req, res) => {
    logger.warn(
      { userId: (req as AuthenticatedRequest).user?.id, path: req.path },
      'AI generation rate limit exceeded'
    );
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'AI generation rate limit exceeded. Please slow down.',
      retryAfter: 60
    });
  },
  keyGenerator: (req) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    return userId || req.ip || 'unknown';
  }
});
