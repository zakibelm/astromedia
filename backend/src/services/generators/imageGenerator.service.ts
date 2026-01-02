// Production Image Generator Service with Multi-Provider Fallback
import { logger } from '../../utils/logger';
import { circuits, CircuitBreakerOpenError } from '../resilience/circuitBreaker';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { redis } from '../../utils/redis';

// Provider types
export type ImageProvider = 'replicate' | 'fal' | 'huggingface';

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:5' | '5:4';
  style?: 'artistic' | 'photorealistic' | 'anime' | 'digital-art';
  model?: string;
  numOutputs?: number;
  seed?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

export interface GeneratedImage {
  url: string;
  provider: ImageProvider;
  model: string;
  seed?: number;
  metadata?: Record<string, unknown>;
}

export interface ImageGenerationResult {
  success: boolean;
  images: GeneratedImage[];
  provider: ImageProvider;
  model: string;
  latencyMs: number;
  cost?: number;
  error?: string;
}

// Model configurations by provider
const MODELS = {
  replicate: {
    flux: 'black-forest-labs/flux-schnell',
    fluxPro: 'black-forest-labs/flux-1.1-pro',
    sdxl: 'stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc',
    sdxlTurbo: 'stability-ai/sdxl-turbo',
  },
  fal: {
    fluxDev: 'fal-ai/flux/dev',
    fluxSchnell: 'fal-ai/flux/schnell',
    fluxPro: 'fal-ai/flux-pro',
  },
  huggingface: {
    sdxl: 'stabilityai/stable-diffusion-xl-base-1.0',
    sd3: 'stabilityai/stable-diffusion-3-medium',
  },
};

// Cost estimates per generation (USD)
const COSTS = {
  replicate: {
    flux: 0.003,
    fluxPro: 0.055,
    sdxl: 0.004,
    sdxlTurbo: 0.002,
  },
  fal: {
    fluxDev: 0.025,
    fluxSchnell: 0.003,
    fluxPro: 0.05,
  },
  huggingface: {
    sdxl: 0.002,
    sd3: 0.003,
  },
};

// Aspect ratio to dimensions mapping
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768 },
  '9:16': { width: 768, height: 1344 },
  '4:5': { width: 896, height: 1120 },
  '5:4': { width: 1120, height: 896 },
};

/**
 * Generate image using Replicate API
 */
async function generateWithReplicate(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const model = options.model || MODELS.replicate.flux;

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN not configured');
  }

  const dimensions = options.aspectRatio
    ? ASPECT_RATIO_DIMENSIONS[options.aspectRatio]
    : { width: options.width || 1024, height: options.height || 1024 };

  const input: Record<string, unknown> = {
    prompt: options.prompt,
    width: dimensions.width,
    height: dimensions.height,
    num_outputs: options.numOutputs || 1,
    guidance_scale: options.guidanceScale || 7.5,
    num_inference_steps: options.numInferenceSteps || 25,
  };

  if (options.negativePrompt) {
    input.negative_prompt = options.negativePrompt;
  }
  if (options.seed) {
    input.seed = options.seed;
  }

  // Call Replicate API
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : undefined,
      model: model.includes(':') ? undefined : model,
      input,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Replicate API error: ${response.status} - ${errorText}`);
  }

  const prediction = await response.json();

  // Poll for completion
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const pollResponse = await fetch(result.urls.get, {
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
    });
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error(`Replicate generation failed: ${result.error}`);
  }

  const images: GeneratedImage[] = (Array.isArray(result.output) ? result.output : [result.output]).map((url: string) => ({
    url,
    provider: 'replicate' as ImageProvider,
    model,
    seed: result.metrics?.predict_time ? undefined : options.seed,
    metadata: {
      predictionId: result.id,
      metrics: result.metrics,
    },
  }));

  return {
    success: true,
    images,
    provider: 'replicate',
    model,
    latencyMs: Date.now() - startTime,
    cost: COSTS.replicate.flux,
  };
}

/**
 * Generate image using FAL API
 */
async function generateWithFal(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const model = options.model || MODELS.fal.fluxSchnell;

  if (!process.env.FAL_API_KEY) {
    throw new Error('FAL_API_KEY not configured');
  }

  const dimensions = options.aspectRatio
    ? ASPECT_RATIO_DIMENSIONS[options.aspectRatio]
    : { width: options.width || 1024, height: options.height || 1024 };

  const response = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: options.prompt,
      image_size: {
        width: dimensions.width,
        height: dimensions.height,
      },
      num_images: options.numOutputs || 1,
      seed: options.seed,
      guidance_scale: options.guidanceScale,
      num_inference_steps: options.numInferenceSteps,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FAL API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  const images: GeneratedImage[] = result.images.map((img: { url: string }) => ({
    url: img.url,
    provider: 'fal' as ImageProvider,
    model,
    seed: result.seed,
  }));

  return {
    success: true,
    images,
    provider: 'fal',
    model,
    latencyMs: Date.now() - startTime,
    cost: COSTS.fal.fluxSchnell,
  };
}

/**
 * Generate image using HuggingFace Inference API
 */
async function generateWithHuggingFace(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const startTime = Date.now();
  const model = options.model || MODELS.huggingface.sdxl;

  if (!config.hfApiKey) {
    throw new Error('HF_API_KEY not configured');
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.hfApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: options.prompt,
      parameters: {
        negative_prompt: options.negativePrompt,
        width: options.width || 1024,
        height: options.height || 1024,
        guidance_scale: options.guidanceScale || 7.5,
        num_inference_steps: options.numInferenceSteps || 30,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`);
  }

  // HF returns the image directly as binary
  const imageBlob = await response.blob();
  const arrayBuffer = await imageBlob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const dataUrl = `data:image/png;base64,${base64}`;

  return {
    success: true,
    images: [{
      url: dataUrl,
      provider: 'huggingface',
      model,
    }],
    provider: 'huggingface',
    model,
    latencyMs: Date.now() - startTime,
    cost: COSTS.huggingface.sdxl,
  };
}

// Provider priority for fallback
const PROVIDER_PRIORITY: ImageProvider[] = ['replicate', 'fal', 'huggingface'];

/**
 * Main image generation function with multi-provider fallback
 */
export async function generateImage(
  options: ImageGenerationOptions,
  preferredProvider?: ImageProvider,
  userId?: string
): Promise<ImageGenerationResult> {
  const providers = preferredProvider
    ? [preferredProvider, ...PROVIDER_PRIORITY.filter(p => p !== preferredProvider)]
    : PROVIDER_PRIORITY;

  let lastError: Error | null = null;

  for (const provider of providers) {
    const circuit = circuits[provider as keyof typeof circuits];
    
    // Skip if circuit is open
    if (circuit && !circuit.isCallAllowed()) {
      logger.warn({ provider }, 'Skipping provider due to open circuit');
      continue;
    }

    try {
      logger.info({ provider, prompt: options.prompt.substring(0, 50) }, 'Attempting image generation');

      let result: ImageGenerationResult;

      if (circuit) {
        result = await circuit.execute(async () => {
          switch (provider) {
            case 'replicate':
              return generateWithReplicate(options);
            case 'fal':
              return generateWithFal(options);
            case 'huggingface':
              return generateWithHuggingFace(options);
            default:
              throw new Error(`Unknown provider: ${provider}`);
          }
        });
      } else {
        switch (provider) {
          case 'replicate':
            result = generateWithReplicate(options);
            break;
          case 'fal':
            result = await generateWithFal(options);
            break;
          case 'huggingface':
            result = await generateWithHuggingFace(options);
            break;
          default:
            throw new Error(`Unknown provider: ${provider}`);
        }
      }

      // Track usage and cost
      if (userId && result.cost) {
        await trackImageGenerationUsage(userId, result);
      }

      logger.info({
        provider,
        model: result.model,
        latencyMs: result.latencyMs,
        imagesGenerated: result.images.length,
      }, 'Image generation successful');

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (error instanceof CircuitBreakerOpenError) {
        logger.warn({ provider, error: error.message }, 'Circuit breaker prevented call');
      } else {
        logger.error({ provider, error: lastError.message }, 'Image generation failed, trying fallback');
      }
    }
  }

  // All providers failed
  logger.error({ error: lastError?.message }, 'All image generation providers failed');
  
  return {
    success: false,
    images: [],
    provider: providers[0],
    model: 'unknown',
    latencyMs: 0,
    error: lastError?.message || 'All providers failed',
  };
}

/**
 * Track image generation usage for billing/quotas
 */
async function trackImageGenerationUsage(
  userId: string,
  result: ImageGenerationResult
): Promise<void> {
  try {
    // Log to database
    await prisma.usageLog.create({
      data: {
        userId,
        endpoint: '/api/v1/assets/generate-image',
        method: 'POST',
        statusCode: result.success ? 200 : 500,
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        cost: result.cost || 0,
      },
    });

    // Update user's API usage
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiUsed: { increment: 1 },
      },
    });

    // Cache recent generation for deduplication
    const cacheKey = `img_gen:${userId}:recent`;
    await redis?.lpush(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      provider: result.provider,
      model: result.model,
      cost: result.cost,
    }));
    await redis?.ltrim(cacheKey, 0, 99); // Keep last 100
    await redis?.expire(cacheKey, 86400); // 24 hours
  } catch (error) {
    logger.error({ error, userId }, 'Failed to track image generation usage');
  }
}

/**
 * Generate A/B test images (artistic + realistic)
 */
export async function generateABImages(
  prompt: string,
  options: Omit<ImageGenerationOptions, 'prompt'> = {}
): Promise<{ artistic: ImageGenerationResult; realistic: ImageGenerationResult }> {
  const artisticPrompt = `${prompt}, artistic style, vibrant colors, conceptual, creative composition`;
  const realisticPrompt = `${prompt}, photorealistic, professional photography, 8k, detailed, natural lighting`;

  const [artistic, realistic] = await Promise.all([
    generateImage({ ...options, prompt: artisticPrompt }, 'replicate'),
    generateImage({ ...options, prompt: realisticPrompt }, 'fal'),
  ]);

  return { artistic, realistic };
}

export { MODELS as IMAGE_MODELS };
