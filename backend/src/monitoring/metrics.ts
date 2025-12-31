// Prometheus metrics for monitoring
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { logger } from '../utils/logger';

export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register, prefix: 'astromedia_' });

// =====================
// HTTP Metrics
// =====================

export const httpRequestCounter = new Counter({
  name: 'astromedia_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'astromedia_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// =====================
// LLM/AI Metrics
// =====================

export const llmRequestCounter = new Counter({
  name: 'astromedia_llm_requests_total',
  help: 'Total number of LLM API requests',
  labelNames: ['provider', 'model', 'agent', 'success'],
  registers: [register],
});

export const llmRequestDuration = new Histogram({
  name: 'astromedia_llm_request_duration_seconds',
  help: 'Duration of LLM API requests in seconds',
  labelNames: ['provider', 'model', 'agent'],
  buckets: [1, 3, 5, 10, 20, 30, 60],
  registers: [register],
});

export const llmTokensCounter = new Counter({
  name: 'astromedia_llm_tokens_total',
  help: 'Total number of tokens consumed',
  labelNames: ['provider', 'model', 'type'], // type: input/output
  registers: [register],
});

export const llmCostCounter = new Counter({
  name: 'astromedia_llm_cost_usd_total',
  help: 'Total cost of LLM API calls in USD',
  labelNames: ['provider', 'model', 'agent'],
  registers: [register],
});

// =====================
// Campaign Metrics
// =====================

export const campaignCounter = new Counter({
  name: 'astromedia_campaigns_total',
  help: 'Total number of campaigns',
  labelNames: ['status', 'governance_mode'],
  registers: [register],
});

export const campaignDuration = new Histogram({
  name: 'astromedia_campaign_duration_seconds',
  help: 'Duration of campaign execution in seconds',
  labelNames: ['governance_mode', 'status'],
  buckets: [60, 300, 600, 1800, 3600, 7200],
  registers: [register],
});

export const phaseCounter = new Counter({
  name: 'astromedia_phases_total',
  help: 'Total number of campaign phases executed',
  labelNames: ['phase_id', 'agent_id', 'status'],
  registers: [register],
});

export const phaseDuration = new Histogram({
  name: 'astromedia_phase_duration_seconds',
  help: 'Duration of phase execution in seconds',
  labelNames: ['phase_id', 'agent_id'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

// =====================
// Queue Metrics
// =====================

export const queueJobsActive = new Gauge({
  name: 'astromedia_queue_jobs_active',
  help: 'Number of active jobs in the queue',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobsCompleted = new Counter({
  name: 'astromedia_queue_jobs_completed_total',
  help: 'Total number of completed queue jobs',
  labelNames: ['queue_name'],
  registers: [register],
});

export const queueJobsFailed = new Counter({
  name: 'astromedia_queue_jobs_failed_total',
  help: 'Total number of failed queue jobs',
  labelNames: ['queue_name', 'reason'],
  registers: [register],
});

// =====================
// User/Business Metrics
// =====================

export const userQuotaGauge = new Gauge({
  name: 'astromedia_user_quota_remaining',
  help: 'Remaining API quota for users',
  labelNames: ['user_id', 'plan'],
  registers: [register],
});

export const assetCounter = new Counter({
  name: 'astromedia_assets_total',
  help: 'Total number of assets generated',
  labelNames: ['type', 'status'],
  registers: [register],
});

// =====================
// System Health Metrics
// =====================

export const dbConnectionStatus = new Gauge({
  name: 'astromedia_db_connection_status',
  help: 'Database connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

export const redisConnectionStatus = new Gauge({
  name: 'astromedia_redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// =====================
// Helper Functions
// =====================

/**
 * Track LLM request metrics
 */
export const trackLLMRequest = (params: {
  provider: string;
  model: string;
  agent: string;
  success: boolean;
  durationSeconds: number;
  tokensIn?: number;
  tokensOut?: number;
  costUSD?: number;
}) => {
  const { provider, model, agent, success, durationSeconds, tokensIn, tokensOut, costUSD } = params;

  llmRequestCounter.inc({
    provider,
    model,
    agent,
    success: success.toString(),
  });

  llmRequestDuration.observe(
    { provider, model, agent },
    durationSeconds
  );

  if (tokensIn) {
    llmTokensCounter.inc({ provider, model, type: 'input' }, tokensIn);
  }

  if (tokensOut) {
    llmTokensCounter.inc({ provider, model, type: 'output' }, tokensOut);
  }

  if (costUSD) {
    llmCostCounter.inc({ provider, model, agent }, costUSD);
  }
};

/**
 * Track campaign metrics
 */
export const trackCampaign = (params: {
  status: string;
  governanceMode: string;
  durationSeconds?: number;
}) => {
  const { status, governanceMode, durationSeconds } = params;

  campaignCounter.inc({ status, governance_mode: governanceMode });

  if (durationSeconds) {
    campaignDuration.observe(
      { governance_mode: governanceMode, status },
      durationSeconds
    );
  }
};

/**
 * Track phase metrics
 */
export const trackPhase = (params: {
  phaseId: string;
  agentId: string;
  status: string;
  durationSeconds?: number;
}) => {
  const { phaseId, agentId, status, durationSeconds } = params;

  phaseCounter.inc({ phase_id: phaseId, agent_id: agentId, status });

  if (durationSeconds) {
    phaseDuration.observe(
      { phase_id: phaseId, agent_id: agentId },
      durationSeconds
    );
  }
};

/**
 * Initialize metrics (called on server startup)
 */
export const initializeMetrics = async () => {
  logger.info('Initializing Prometheus metrics');

  // Set initial connection statuses
  try {
    const { prisma } = await import('../utils/prisma');
    await prisma.$queryRaw`SELECT 1`;
    dbConnectionStatus.set(1);
  } catch {
    dbConnectionStatus.set(0);
  }

  try {
    const { redis } = await import('../utils/redis');
    await redis.ping();
    redisConnectionStatus.set(1);
  } catch {
    redisConnectionStatus.set(0);
  }

  return register;
};
