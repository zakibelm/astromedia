// Production Video Generator Service with Multi-Provider Fallback
import { logger } from '../../utils/logger';
import { circuits, CircuitBreakerOpenError } from '../resilience/circuitBreaker';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { io } from '../../server';

// Provider types
export type VideoProvider = 'replicate' | 'fal' | 'runway';

export interface VideoGenerationOptions {
  prompt: string;
  inputImage?: string; // Base64 or URL for image-to-video
  duration?: number;   // Seconds
  fps?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: 'cinematic' | 'dynamic' | 'smooth' | 'artistic';
  model?: string;
  seed?: number;
  motionBucketId?: number; // For SVD
  condAug?: number;        // For SVD conditioning
}

export interface GeneratedVideo {
  url: string;
  provider: VideoProvider;
  model: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface VideoGenerationResult {
  success: boolean;
  video: GeneratedVideo | null;
  provider: VideoProvider;
  model: string;
  latencyMs: number;
  cost?: number;
  error?: string;
  jobId?: string;
}

export interface VideoJobProgress {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  result?: VideoGenerationResult;
}

// Model configurations by provider
const MODELS = {
  replicate: {
    svd: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    svdXt: 'stability-ai/stable-video-diffusion-xt:dc5d2a4b43bf8527d56aeb0c6b38deced66b5f8ca786654ca87a77d72bbb6dab',
    animateDiff: 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f',
  },
  fal: {
    svd: 'fal-ai/fast-svd',
    animateLcm: 'fal-ai/fast-animatediff/turbo/text-to-video',
    cogVideo: 'fal-ai/cogvideox-5b',
  },
  runway: {
    gen3: 'gen-3',
  },
};

// Cost estimates per generation (USD)
const COSTS = {
  replicate: {
    svd: 0.02,
    svdXt: 0.04,
    animateDiff: 0.015,
  },
  fal: {
    svd: 0.015,
    animateLcm: 0.02,
    cogVideo: 0.05,
  },
  runway: {
    gen3: 0.10,
  },
};

// Active job tracking
const activeJobs = new Map<string, {
  status: VideoJobProgress['status'];
  progress: number;
  userId?: string;
  campaignId?: string;
  startTime: number;
}>();

/**
 * Generate video using Replicate API (SVD)
 */
async function generateWithReplicate(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  const model = options.model || MODELS.replicate.svd;

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  if (!options.inputImage) {
    throw new Error('Replicate SVD requires an input image');
  }

  const input: Record<string, unknown> = {
    input_image: options.inputImage,
    motion_bucket_id: options.motionBucketId || 127,
    cond_aug: options.condAug || 0.02,
    decoding_t: 14, // Number of frames to decode at a time
    fps: options.fps || 7,
  };

  if (options.seed) {
    input.seed = options.seed;
  }

  // Create prediction
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model.split(':')[1],
      input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  const prediction = await response.json();
  const jobId = prediction.id;

  // Track job
  activeJobs.set(jobId, {
    status: 'processing',
    progress: 0,
    startTime,
  });

  // Poll for completion with progress updates
  let result = prediction;
  let lastProgress = 0;

  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pollResponse = await fetch(result.urls.get, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    result = await pollResponse.json();

    // Estimate progress based on time (SVD typically takes 60-120s)
    const elapsed = Date.now() - startTime;
    const estimatedProgress = Math.min(90, Math.floor(elapsed / 1200)); // 120s = 90%
    
    if (estimatedProgress > lastProgress) {
      lastProgress = estimatedProgress;
      updateJobProgress(jobId, 'processing', estimatedProgress);
    }
  }

  if (result.status === 'failed') {
    updateJobProgress(jobId, 'failed', 0, result.error);
    activeJobs.delete(jobId);
    throw new Error(`Replicate generation failed: ${result.error}`);
  }

  updateJobProgress(jobId, 'completed', 100);
  activeJobs.delete(jobId);

  return {
    success: true,
    video: {
      url: result.output,
      provider: 'replicate',
      model,
      duration: options.duration || 4,
      metadata: {
        predictionId: result.id,
        metrics: result.metrics,
      },
    },
    provider: 'replicate',
    model,
    latencyMs: Date.now() - startTime,
    cost: COSTS.replicate.svd,
    jobId,
  };
}

/**
 * Generate video using FAL API
 */
async function generateWithFal(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  const model = options.inputImage ? MODELS.fal.svd : MODELS.fal.animateLcm;

  if (!process.env.FAL_API_KEY) {
    throw new Error('FAL_API_KEY not configured');
  }

  const payload: Record<string, unknown> = options.inputImage
    ? {
        image_url: options.inputImage,
        motion_bucket_id: options.motionBucketId || 127,
        fps: options.fps || 8,
      }
    : {
        prompt: options.prompt,
        num_frames: (options.duration || 4) * (options.fps || 8),
        fps: options.fps || 8,
        seed: options.seed,
      };

  const response = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FAL API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  return {
    success: true,
    video: {
      url: result.video?.url || result.video,
      provider: 'fal',
      model,
      duration: options.duration || 4,
      metadata: {
        seed: result.seed,
      },
    },
    provider: 'fal',
    model,
    latencyMs: Date.now() - startTime,
    cost: options.inputImage ? COSTS.fal.svd : COSTS.fal.animateLcm,
  };
}

/**
 * Update job progress and emit WebSocket event
 */
function updateJobProgress(
  jobId: string,
  status: VideoJobProgress['status'],
  progress: number,
  message?: string
): void {
  const job = activeJobs.get(jobId);
  if (job) {
    job.status = status;
    job.progress = progress;
  }

  const progressData: VideoJobProgress = {
    jobId,
    status,
    progress,
    message,
  };

  // Emit to all connected clients watching this job
  if (io) {
    io.to(`video-job:${jobId}`).emit('video:progress', progressData);
  }

  logger.debug({ jobId, status, progress }, 'Video job progress update');
}

// Provider priority for fallback
const PROVIDER_PRIORITY: VideoProvider[] = ['replicate', 'fal'];

/**
 * Main video generation function with multi-provider fallback
 */
export async function generateVideo(
  options: VideoGenerationOptions,
  preferredProvider?: VideoProvider,
  userId?: string,
  campaignId?: string
): Promise<VideoGenerationResult> {
  const providers = preferredProvider
    ? [preferredProvider, ...PROVIDER_PRIORITY.filter(p => p !== preferredProvider)]
    : PROVIDER_PRIORITY;

  let lastError: Error | null = null;

  for (const provider of providers) {
    const circuit = circuits[provider as keyof typeof circuits];
    
    // Skip if circuit is open
    if (circuit && !circuit.isCallAllowed()) {
      logger.warn({ provider }, 'Skipping video provider due to open circuit');
      continue;
    }

    try {
      logger.info({ 
        provider, 
        hasInputImage: !!options.inputImage,
        prompt: options.prompt?.substring(0, 50) 
      }, 'Attempting video generation');

      let result: VideoGenerationResult;

      const executeGeneration = async () => {
        switch (provider) {
          case 'replicate':
            return generateWithReplicate(options);
          case 'fal':
            return generateWithFal(options);
          default:
            throw new Error(`Unknown video provider: ${provider}`);
        }
      };

      if (circuit) {
        result = await circuit.execute(executeGeneration);
      } else {
        result = await executeGeneration();
      }

      // Track usage
      if (userId && result.cost) {
        await trackVideoGenerationUsage(userId, result, campaignId);
      }

      logger.info({
        provider,
        model: result.model,
        latencyMs: result.latencyMs,
        duration: result.video?.duration,
      }, 'Video generation successful');

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error instanceof CircuitBreakerOpenError) {
        logger.warn({ provider, error: error.message }, 'Circuit breaker prevented video call');
      } else {
        logger.error({ provider, error: lastError.message }, 'Video generation failed, trying fallback');
      }
    }
  }

  // All providers failed
  logger.error({ error: lastError?.message }, 'All video generation providers failed');
  
  return {
    success: false,
    video: null,
    provider: providers[0],
    model: 'unknown',
    latencyMs: 0,
    error: lastError?.message || 'All providers failed',
  };
}

/**
 * Track video generation usage
 */
async function trackVideoGenerationUsage(
  userId: string,
  result: VideoGenerationResult,
  campaignId?: string
): Promise<void> {
  try {
    await prisma.usageLog.create({
      data: {
        userId,
        endpoint: '/api/v1/assets/generate-video',
        method: 'POST',
        statusCode: result.success ? 200 : 500,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        cost: result.cost || 0,
      },
    });

    // Update user's API usage (video counts as 3 API calls)
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiUsed: { increment: 3 },
      },
    });
  } catch (error) {
    logger.error({ error, userId }, 'Failed to track video generation usage');
  }
}

/**
 * Image-to-video generation (convenience function)
 */
export async function imageToVideo(
  imageUrl: string,
  options: Omit<VideoGenerationOptions, 'inputImage' | 'prompt'> = {},
  userId?: string
): Promise<VideoGenerationResult> {
  return generateVideo(
    {
      ...options,
      prompt: '', // Not used for image-to-video
      inputImage: imageUrl,
    },
    'replicate', // Prefer Replicate for SVD
    userId
  );
}

/**
 * Text-to-video generation (convenience function)
 */
export async function textToVideo(
  prompt: string,
  options: Omit<VideoGenerationOptions, 'prompt' | 'inputImage'> = {},
  userId?: string
): Promise<VideoGenerationResult> {
  return generateVideo(
    {
      ...options,
      prompt,
    },
    'fal', // Prefer FAL for text-to-video
    userId
  );
}

/**
 * Get job status for polling
 */
export function getJobStatus(jobId: string): VideoJobProgress | null {
  const job = activeJobs.get(jobId);
  if (!job) return null;

  return {
    jobId,
    status: job.status,
    progress: job.progress,
  };
}

/**
 * Subscribe to job progress via WebSocket
 */
export function subscribeToJob(socketId: string, jobId: string): boolean {
  if (!io) return false;

  const socket = io.sockets.sockets.get(socketId);
  if (socket) {
    socket.join(`video-job:${jobId}`);
    return true;
  }
  return false;
}

export { MODELS as VIDEO_MODELS };
