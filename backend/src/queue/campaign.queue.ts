// Campaign orchestration queue with BullMQ
import { Queue, QueueEvents, Worker, Job } from 'bullmq';
import { redis } from '../utils/redis';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { io } from '../server';
import { config } from '../config';

// Import orchestrator
import { runPlaybookParallel } from '../orchestration/orchestrator';
import { defaultPlaybook } from '../orchestration/playbook';
import { CampaignState, PhaseStatus, Mode } from '../orchestration/types';

// Job data types
export interface CampaignJobData {
  campaignId: string;
  userId: string;
  briefData: any;
  governanceMode: 'GUIDED' | 'SEMI_AUTO' | 'AUTO';
}

export interface PhaseJobData {
  campaignId: string;
  phaseId: string;
  agentId: string;
  context: Record<string, any>;
}

// =====================
// Queue Setup
// =====================

const connection = {
  host: redis.options.host || 'localhost',
  port: redis.options.port || 6379,
};

export const campaignQueue = new Queue<CampaignJobData>('campaign-processing', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failures for 7 days
    },
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('campaign-processing', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info({ jobId, returnvalue }, 'Campaign job completed');
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error({ jobId, failedReason }, 'Campaign job failed');
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug({ jobId, progress: data }, 'Campaign job progress');
});

// =====================
// Worker Setup
// =====================

const mapGovernanceMode = (mode: string): Mode => {
  switch (mode) {
    case 'GUIDED':
      return 'guided';
    case 'SEMI_AUTO':
      return 'semi_auto';
    case 'AUTO':
      return 'auto';
    default:
      return 'semi_auto';
  }
};

export const campaignWorker = new Worker<CampaignJobData>(
  'campaign-processing',
  async (job: Job<CampaignJobData>) => {
    const { campaignId, userId, briefData, governanceMode } = job.data;

    logger.info(
      { campaignId, userId, jobId: job.id },
      'Starting campaign processing'
    );

    try {
      // Update campaign status to RUNNING
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Emit event to client via WebSocket
      io.to(`campaign:${campaignId}`).emit('campaign:status', {
        campaignId,
        status: 'RUNNING',
        timestamp: new Date().toISOString(),
      });

      // Prepare initial state for orchestrator
      const initialState: CampaignState = {
        mode: mapGovernanceMode(governanceMode),
        statusByPhase: { briefing: 'completed' },
        triesByPhase: {},
        awaitingHumanApproval: new Set(),
        context: {
          ...briefData,
          campaignId,
        },
      };

      // Events to handle orchestrator callbacks
      const events = {
        onPhaseStatus: async (phaseId: string, status: PhaseStatus) => {
          logger.debug({ campaignId, phaseId, status }, 'Phase status updated');

          // Update in database
          await prisma.campaignPhase.upsert({
            where: {
              campaignId_phaseId: {
                campaignId,
                phaseId,
              },
            },
            update: {
              status: status.toUpperCase() as any,
              updatedAt: new Date(),
            },
            create: {
              campaignId,
              phaseId,
              agentId: phaseId,
              status: status.toUpperCase() as any,
            },
          });

          // Emit to client
          io.to(`campaign:${campaignId}`).emit('phase:status', {
            campaignId,
            phaseId,
            status,
            timestamp: new Date().toISOString(),
          });

          // Update job progress
          const totalPhases = defaultPlaybook.phases.length;
          const completedPhases = Object.values(
            initialState.statusByPhase
          ).filter((s) => s === 'completed').length;
          const progress = Math.round((completedPhases / totalPhases) * 100);
          await job.updateProgress(progress);
        },

        onPhaseOutput: async (phaseId: string, output: any) => {
          logger.info({ campaignId, phaseId }, 'Phase output received');

          // Store output in database
          await prisma.campaignPhase.update({
            where: {
              campaignId_phaseId: {
                campaignId,
                phaseId,
              },
            },
            data: {
              outputData: output,
            },
          });

          // Emit to client
          io.to(`campaign:${campaignId}`).emit('phase:output', {
            campaignId,
            phaseId,
            output,
            timestamp: new Date().toISOString(),
          });
        },

        onPhaseError: async (phaseId: string, error: Error) => {
          logger.error({ campaignId, phaseId, err: error }, 'Phase error');

          await prisma.campaignPhase.update({
            where: {
              campaignId_phaseId: {
                campaignId,
                phaseId,
              },
            },
            data: {
              errorMessage: error.message,
            },
          });

          // Log error
          await prisma.campaignLog.create({
            data: {
              campaignId,
              level: 'ERROR',
              action: `phase_error:${phaseId}`,
              message: error.message,
              phaseId,
              metadata: { stack: error.stack },
            },
          });

          io.to(`campaign:${campaignId}`).emit('phase:error', {
            campaignId,
            phaseId,
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        },

        onAllDone: async (finalState: CampaignState) => {
          logger.info({ campaignId }, 'Campaign processing completed');

          await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              contextData: finalState.context,
            },
          });

          io.to(`campaign:${campaignId}`).emit('campaign:completed', {
            campaignId,
            timestamp: new Date().toISOString(),
          });
        },
      };

      // Run the orchestrator
      const orchestrator = runPlaybookParallel({
        playbook: defaultPlaybook,
        state: initialState,
        events,
        campaignId,
        concurrency: config.queueConcurrency,
      });

      await orchestrator.promise;

      return { success: true, campaignId };
    } catch (error: any) {
      logger.error({ campaignId, err: error }, 'Campaign processing failed');

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
        },
      });

      await prisma.campaignLog.create({
        data: {
          campaignId,
          level: 'CRITICAL',
          action: 'campaign_failed',
          message: error.message,
          metadata: { stack: error.stack },
        },
      });

      io.to(`campaign:${campaignId}`).emit('campaign:failed', {
        campaignId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: config.queueConcurrency,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

campaignWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Campaign worker completed job');
});

campaignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Campaign worker failed job');
});

campaignWorker.on('error', (err) => {
  logger.error({ err }, 'Campaign worker error');
});

// =====================
// Helper Functions
// =====================

/**
 * Add a campaign to the processing queue
 */
export const enqueueCampaign = async (jobData: CampaignJobData) => {
  const job = await campaignQueue.add('process-campaign', jobData, {
    jobId: `campaign:${jobData.campaignId}`,
    priority: 1,
  });

  logger.info({ jobId: job.id, campaignId: jobData.campaignId }, 'Campaign enqueued');

  return job;
};

/**
 * Get campaign job status
 */
export const getCampaignJobStatus = async (campaignId: string) => {
  const job = await campaignQueue.getJob(`campaign:${campaignId}`);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    jobId: job.id,
    state,
    progress,
    data: job.data,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
  };
};

/**
 * Pause a campaign
 */
export const pauseCampaign = async (campaignId: string) => {
  const job = await campaignQueue.getJob(`campaign:${campaignId}`);

  if (job) {
    // Note: BullMQ doesn't support pausing individual jobs
    // We need to implement this at the orchestrator level
    logger.warn({ campaignId }, 'Campaign pause requested but not fully implemented');
  }
};

/**
 * Cancel a campaign
 */
export const cancelCampaign = async (campaignId: string) => {
  const job = await campaignQueue.getJob(`campaign:${campaignId}`);

  if (job) {
    await job.remove();

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'CANCELLED' },
    });

    logger.info({ campaignId }, 'Campaign cancelled');
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing campaign worker...');
  await campaignWorker.close();
  await campaignQueue.close();
});
