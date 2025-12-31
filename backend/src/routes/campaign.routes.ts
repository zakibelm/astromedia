// Campaign routes
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { quotaLimiter, aiGenerationRateLimiter } from '../middleware/rateLimit';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { enqueueCampaign, getCampaignJobStatus } from '../queue/campaign.queue';
import { logger } from '../utils/logger';
import { trackCampaign } from '../monitoring/metrics';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  governanceMode: z.enum(['GUIDED', 'SEMI_AUTO', 'AUTO']).default('SEMI_AUTO'),
  briefData: z.object({
    companyInfo: z.object({
      name: z.string(),
      sector: z.string(),
      size: z.string(),
      website: z.string().url().optional(),
    }),
    campaignGoals: z.object({
      objectives: z.array(z.string()),
      targetAudience: z.string(),
      budget: z.object({
        amount: z.string(),
        currency: z.enum(['USD', 'CAD', 'EUR']),
      }),
      duration: z.string(),
    }),
    brandIdentity: z.object({
      tone: z.string(),
      brandValues: z.string(),
      priorityChannels: z.array(z.string()),
    }),
    analysisDepth: z.enum(['quick', 'detailed']).default('quick'),
    agentConfiguration: z.record(z.any()).optional(),
    ragEnabled: z.boolean().default(false),
  }),
});

/**
 * GET /api/v1/campaigns
 * List user's campaigns
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { status, limit = 20, offset = 0 } = req.query;

    const campaigns = await prisma.campaign.findMany({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        name: true,
        status: true,
        governanceMode: true,
        currentPhase: true,
        totalCost: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        _count: {
          select: {
            phases: true,
            assets: true,
          },
        },
      },
    });

    const total = await prisma.campaign.count({
      where: {
        userId,
        ...(status && { status: status as any }),
      },
    });

    res.json({
      campaigns,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  })
);

/**
 * GET /api/v1/campaigns/:id
 * Get campaign details
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        phases: {
          orderBy: { createdAt: 'asc' },
        },
        assets: {
          orderBy: { createdAt: 'desc' },
        },
        logs: {
          orderBy: { timestamp: 'desc' },
          take: 100,
        },
      },
    });

    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }

    // Get job status if running
    let jobStatus = null;
    if (campaign.status === 'RUNNING') {
      jobStatus = await getCampaignJobStatus(campaign.id);
    }

    res.json({
      campaign,
      jobStatus,
    });
  })
);

/**
 * POST /api/v1/campaigns
 * Create and launch a new campaign
 */
router.post(
  '/',
  quotaLimiter,
  aiGenerationRateLimiter,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const body = createCampaignSchema.parse(req.body);

    // Extract campaign data
    const { name, governanceMode, briefData } = body;
    const { companyInfo, campaignGoals, brandIdentity } = briefData;

    // Create campaign in database
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        name,
        status: 'DRAFT',
        governanceMode,
        briefData,
        brandProfile: `${companyInfo.name} - ${companyInfo.sector}`,
        goals: campaignGoals.objectives,
        targetAudience: campaignGoals.targetAudience,
        budget: parseFloat(campaignGoals.budget.amount),
        currency: campaignGoals.budget.currency,
        timeline: campaignGoals.duration,
      },
    });

    logger.info({ campaignId: campaign.id, userId }, 'Campaign created');

    // Track metrics
    trackCampaign({ status: 'DRAFT', governanceMode });

    // Enqueue for processing
    await enqueueCampaign({
      campaignId: campaign.id,
      userId,
      briefData,
      governanceMode,
    });

    logger.info({ campaignId: campaign.id }, 'Campaign enqueued for processing');

    res.status(201).json({
      campaign,
      message: 'Campaign created and queued for processing',
    });
  })
);

/**
 * PATCH /api/v1/campaigns/:id
 * Update campaign (e.g., pause, resume)
 */
router.patch(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }

    if (status === 'CANCELLED') {
      const { cancelCampaign } = await import('../queue/campaign.queue');
      await cancelCampaign(id);
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    logger.info({ campaignId: id, newStatus: status }, 'Campaign status updated');

    res.json({ campaign: updated });
  })
);

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
    });

    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }

    // Cancel if running
    if (campaign.status === 'RUNNING') {
      const { cancelCampaign } = await import('../queue/campaign.queue');
      await cancelCampaign(id);
    }

    await prisma.campaign.delete({
      where: { id },
    });

    logger.info({ campaignId: id }, 'Campaign deleted');

    res.status(204).send();
  })
);

/**
 * POST /api/v1/campaigns/:id/phases/:phaseId/approve
 * Approve a phase waiting for validation
 */
router.post(
  '/:id/phases/:phaseId/approve',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const { id: campaignId, phaseId } = req.params;
    const { data } = req.body;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, userId },
    });

    if (!campaign) {
      throw new AppError(404, 'Campaign not found');
    }

    // Update phase status
    await prisma.campaignPhase.update({
      where: {
        campaignId_phaseId: {
          campaignId,
          phaseId,
        },
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // Log approval
    await prisma.campaignLog.create({
      data: {
        campaignId,
        level: 'INFO',
        action: `phase_approved:${phaseId}`,
        message: `Phase ${phaseId} approved by user`,
        phaseId,
      },
    });

    logger.info({ campaignId, phaseId, userId }, 'Phase approved');

    // Emit via WebSocket
    const { io } = await import('../server');
    io.to(`campaign:${campaignId}`).emit('phase:approved', {
      campaignId,
      phaseId,
      data,
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Phase approved' });
  })
);

export default router;
