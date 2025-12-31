// Cost tracking service for LLM and AI services
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { trackLLMRequest } from '../monitoring/metrics';

// Pricing data (as of December 2024)
// Prices are per 1M tokens for input/output
const PRICING_TABLE = {
  // OpenRouter models
  'openai/gpt-4': {
    inputPer1M: 30.0,
    outputPer1M: 60.0,
  },
  'openai/gpt-4-turbo': {
    inputPer1M: 10.0,
    outputPer1M: 30.0,
  },
  'openai/gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'anthropic/claude-3.5-sonnet': {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  'anthropic/claude-3-haiku': {
    inputPer1M: 0.25,
    outputPer1M: 1.25,
  },
  'meta-llama/llama-3-70b-instruct': {
    inputPer1M: 0.9,
    outputPer1M: 0.9,
  },
  'mistralai/mixtral-8x22b': {
    inputPer1M: 1.2,
    outputPer1M: 1.2,
  },

  // Image generation (per image)
  'gemini-2.5-flash-image': {
    perImage: 0.02, // ~$0.02 per image
  },
  'seedream': {
    perImage: 0.05, // ~$0.05 per image
  },

  // Video generation (per second of video)
  'wan-2.2': {
    perSecond: 0.10, // ~$0.10 per second
  },
  'veo-2.0-generate-001': {
    perSecond: 0.15, // ~$0.15 per second
  },
};

export class CostTrackingService {
  /**
   * Calculate cost for LLM request
   */
  calculateLLMCost(params: {
    model: string;
    tokensIn: number;
    tokensOut: number;
  }): number {
    const { model, tokensIn, tokensOut } = params;

    const pricing = PRICING_TABLE[model as keyof typeof PRICING_TABLE];

    if (!pricing || !('inputPer1M' in pricing)) {
      logger.warn({ model }, 'No pricing data found for model, using default');
      return 0.001; // Default fallback cost
    }

    const inputCost = (tokensIn / 1_000_000) * pricing.inputPer1M;
    const outputCost = (tokensOut / 1_000_000) * pricing.outputPer1M;

    return inputCost + outputCost;
  }

  /**
   * Calculate cost for image generation
   */
  calculateImageCost(model: string, count: number = 1): number {
    const pricing = PRICING_TABLE[model as keyof typeof PRICING_TABLE];

    if (!pricing || !('perImage' in pricing)) {
      logger.warn({ model }, 'No pricing data found for image model, using default');
      return 0.02 * count;
    }

    return pricing.perImage * count;
  }

  /**
   * Calculate cost for video generation
   */
  calculateVideoCost(model: string, durationSeconds: number): number {
    const pricing = PRICING_TABLE[model as keyof typeof PRICING_TABLE];

    if (!pricing || !('perSecond' in pricing)) {
      logger.warn({ model }, 'No pricing data found for video model, using default');
      return 0.10 * durationSeconds;
    }

    return pricing.perSecond * durationSeconds;
  }

  /**
   * Track LLM usage and cost
   */
  async trackLLMUsage(params: {
    userId: string;
    provider: string;
    model: string;
    agent: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    success: boolean;
    endpoint?: string;
  }): Promise<void> {
    const {
      userId,
      provider,
      model,
      agent,
      tokensIn,
      tokensOut,
      latencyMs,
      success,
      endpoint = '/api/v1/internal/llm',
    } = params;

    // Calculate cost
    const cost = this.calculateLLMCost({ model, tokensIn, tokensOut });

    try {
      // Log usage
      await prisma.usageLog.create({
        data: {
          userId,
          endpoint,
          method: 'POST',
          statusCode: success ? 200 : 500,
          provider,
          model,
          tokensIn,
          tokensOut,
          latencyMs,
          cost,
        },
      });

      // Update user's API usage counter
      await prisma.user.update({
        where: { id: userId },
        data: {
          apiUsed: {
            increment: 1,
          },
        },
      });

      // Update campaign cost if applicable
      // (Implementation depends on context)

      // Track Prometheus metrics
      trackLLMRequest({
        provider,
        model,
        agent,
        success,
        durationSeconds: latencyMs / 1000,
        tokensIn,
        tokensOut,
        costUSD: cost,
      });

      logger.info(
        {
          userId,
          provider,
          model,
          tokensIn,
          tokensOut,
          cost: cost.toFixed(6),
          agent,
        },
        'LLM usage tracked'
      );
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to track LLM usage');
    }
  }

  /**
   * Track image generation cost
   */
  async trackImageGeneration(params: {
    userId: string;
    campaignId?: string;
    model: string;
    count?: number;
  }): Promise<void> {
    const { userId, campaignId, model, count = 1 } = params;

    const cost = this.calculateImageCost(model, count);

    try {
      await prisma.usageLog.create({
        data: {
          userId,
          endpoint: '/api/v1/internal/image',
          method: 'POST',
          statusCode: 200,
          provider: 'image_generation',
          model,
          tokensIn: 0,
          tokensOut: 0,
          cost,
        },
      });

      // Update campaign cost if applicable
      if (campaignId) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            totalCost: {
              increment: cost,
            },
          },
        });
      }

      logger.info(
        { userId, campaignId, model, count, cost: cost.toFixed(6) },
        'Image generation cost tracked'
      );
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to track image generation cost');
    }
  }

  /**
   * Track video generation cost
   */
  async trackVideoGeneration(params: {
    userId: string;
    campaignId?: string;
    model: string;
    durationSeconds: number;
  }): Promise<void> {
    const { userId, campaignId, model, durationSeconds } = params;

    const cost = this.calculateVideoCost(model, durationSeconds);

    try {
      await prisma.usageLog.create({
        data: {
          userId,
          endpoint: '/api/v1/internal/video',
          method: 'POST',
          statusCode: 200,
          provider: 'video_generation',
          model,
          tokensIn: 0,
          tokensOut: 0,
          cost,
        },
      });

      // Update campaign cost if applicable
      if (campaignId) {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            totalCost: {
              increment: cost,
            },
          },
        });
      }

      logger.info(
        { userId, campaignId, model, durationSeconds, cost: cost.toFixed(6) },
        'Video generation cost tracked'
      );
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to track video generation cost');
    }
  }

  /**
   * Get user's total spend
   */
  async getUserTotalSpend(userId: string, startDate?: Date, endDate?: Date): Promise<number> {
    try {
      const result = await prisma.usageLog.aggregate({
        where: {
          userId,
          ...(startDate &&
            endDate && {
              timestamp: {
                gte: startDate,
                lte: endDate,
              },
            }),
        },
        _sum: {
          cost: true,
        },
      });

      return Number(result._sum.cost) || 0;
    } catch (error) {
      logger.error({ err: error, userId }, 'Failed to get user total spend');
      return 0;
    }
  }

  /**
   * Get campaign total cost
   */
  async getCampaignCost(campaignId: string): Promise<number> {
    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { totalCost: true },
      });

      return Number(campaign?.totalCost) || 0;
    } catch (error) {
      logger.error({ err: error, campaignId }, 'Failed to get campaign cost');
      return 0;
    }
  }
}

export const costTrackingService = new CostTrackingService();
