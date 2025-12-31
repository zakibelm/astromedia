// Asset routes
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication
router.use(authenticate);

/**
 * GET /api/v1/assets
 * List assets with filters
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { campaignId, type, status, limit = 20, offset = 0 } = req.query;

    const assets = await prisma.asset.findMany({
      where: {
        campaign: {
          userId,
        },
        ...(campaignId && { campaignId: campaignId as string }),
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const total = await prisma.asset.count({
      where: {
        campaign: {
          userId,
        },
        ...(campaignId && { campaignId: campaignId as string }),
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
      },
    });

    res.json({
      assets,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  })
);

/**
 * GET /api/v1/assets/:id
 * Get asset details
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        campaign: {
          userId,
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!asset) {
      throw new AppError(404, 'Asset not found');
    }

    res.json({ asset });
  })
);

/**
 * PATCH /api/v1/assets/:id
 * Update asset (e.g., approve/reject)
 */
router.patch(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    const updateSchema = z.object({
      status: z.enum(['APPROVED', 'REJECTED', 'ARCHIVED']),
    });

    updateSchema.parse({ status });

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        campaign: {
          userId,
        },
      },
    });

    if (!asset) {
      throw new AppError(404, 'Asset not found');
    }

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        status,
        validatedAt: new Date(),
        validatedBy: userId,
      },
    });

    logger.info({ assetId: id, status, userId }, 'Asset status updated');

    // Emit via WebSocket
    const { io } = await import('../server');
    io.to(`campaign:${asset.campaignId}`).emit('asset:updated', {
      assetId: id,
      status,
      timestamp: new Date().toISOString(),
    });

    res.json({ asset: updated });
  })
);

/**
 * DELETE /api/v1/assets/:id
 * Delete asset
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        campaign: {
          userId,
        },
      },
    });

    if (!asset) {
      throw new AppError(404, 'Asset not found');
    }

    await prisma.asset.delete({
      where: { id },
    });

    logger.info({ assetId: id, userId }, 'Asset deleted');

    res.status(204).send();
  })
);

export default router;
