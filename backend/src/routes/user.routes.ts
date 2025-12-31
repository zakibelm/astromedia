// User routes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthenticatedRequest, requireAdmin } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/v1/users/me
 * Get current user profile
 */
router.get(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        apiQuota: true,
        apiUsed: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            campaigns: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({ user });
  })
);

/**
 * PATCH /api/v1/users/me
 * Update current user profile
 */
router.patch(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    const updateSchema = z.object({
      name: z.string().optional(),
      company: z.string().optional(),
    });

    const body = updateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        apiQuota: true,
        apiUsed: true,
      },
    });

    logger.info({ userId }, 'User profile updated');

    res.json({ user });
  })
);

/**
 * POST /api/v1/users/me/change-password
 * Change password
 */
router.post(
  '/me/change-password',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    const passwordSchema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(100),
    });

    const body = passwordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isValid = await bcrypt.compare(body.currentPassword, user.passwordHash);

    if (!isValid) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(body.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logger.info({ userId }, 'User password changed');

    res.json({ message: 'Password changed successfully' });
  })
);

/**
 * GET /api/v1/users/me/usage
 * Get usage statistics
 */
router.get(
  '/me/usage',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        apiQuota: true,
        apiUsed: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    // Get usage logs
    const usageLogs = await prisma.usageLog.findMany({
      where: {
        userId,
        ...(startDate && endDate && {
          timestamp: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        }),
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Calculate totals
    const totalCost = usageLogs.reduce((sum, log) => sum + Number(log.cost), 0);
    const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokensIn + log.tokensOut, 0);

    // Group by provider
    const byProvider = usageLogs.reduce((acc, log) => {
      if (!log.provider) return acc;
      if (!acc[log.provider]) {
        acc[log.provider] = {
          count: 0,
          cost: 0,
          tokens: 0,
        };
      }
      acc[log.provider].count++;
      acc[log.provider].cost += Number(log.cost);
      acc[log.provider].tokens += log.tokensIn + log.tokensOut;
      return acc;
    }, {} as Record<string, any>);

    res.json({
      quota: {
        total: user.apiQuota,
        used: user.apiUsed,
        remaining: user.apiQuota - user.apiUsed,
        percentage: (user.apiUsed / user.apiQuota) * 100,
      },
      totals: {
        cost: totalCost.toFixed(6),
        tokens: totalTokens,
        requests: usageLogs.length,
      },
      byProvider,
    });
  })
);

/**
 * GET /api/v1/users/me/api-keys
 * List user's API keys
 */
router.get(
  '/me/api-keys',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ apiKeys });
  })
);

/**
 * POST /api/v1/users/me/api-keys
 * Create new API key
 */
router.post(
  '/me/api-keys',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;

    const keySchema = z.object({
      name: z.string().min(1).max(100),
      expiresInDays: z.number().min(1).max(365).optional(),
    });

    const body = keySchema.parse(req.body);

    // Generate random API key
    const crypto = await import('crypto');
    const apiKey = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyPrefix = apiKey.substring(0, 16);

    // Hash the key
    const keyHash = await bcrypt.hash(apiKey, 10);

    const expiresAt = body.expiresInDays
      ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        userId,
        name: body.name,
        keyHash,
        keyPrefix,
        expiresAt,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    logger.info({ userId, keyId: apiKeyRecord.id }, 'API key created');

    res.status(201).json({
      apiKey: apiKeyRecord,
      // Return the full key ONLY on creation (never shown again!)
      key: apiKey,
      warning: 'Save this key securely. It will not be shown again.',
    });
  })
);

/**
 * DELETE /api/v1/users/me/api-keys/:keyId
 * Revoke an API key
 */
router.delete(
  '/me/api-keys/:keyId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { keyId } = req.params;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new AppError(404, 'API key not found');
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    logger.info({ userId, keyId }, 'API key revoked');

    res.status(204).send();
  })
);

export default router;
