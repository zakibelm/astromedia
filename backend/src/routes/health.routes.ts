// Health check routes
import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /api/v1/health
 * Basic health check
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '2.0.0',
    });
  })
);

/**
 * GET /api/v1/health/ready
 * Readiness probe (checks all dependencies)
 */
router.get(
  '/ready',
  asyncHandler(async (req, res) => {
    const checks: Record<string, boolean> = {};

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch {
      checks.database = false;
    }

    // Check Redis
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      checks.redis = false;
    }

    const isReady = Object.values(checks).every((v) => v === true);

    res.status(isReady ? 200 : 503).json({
      ready: isReady,
      checks,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/health/live
 * Liveness probe (basic check)
 */
router.get('/live', (req, res) => {
  res.json({
    live: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
