// Centralized configuration management
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Configuration schema with validation
const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(8000),

  // Database
  databaseUrl: z.string().url(),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),

  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('7d'),

  // CORS
  corsOrigin: z.string().default('http://localhost:5173'),

  // API Keys (stored securely in backend)
  openrouterApiKey: z.string().optional(),
  hfApiKey: z.string().optional(),
  googleCloudProjectId: z.string().optional(),
  googleCloudCredentials: z.string().optional(), // Base64 encoded JSON
  ayrshareApiKey: z.string().optional(),

  // Storage
  gcsStorageBucket: z.string().optional(),

  // Rate limiting
  rateLimitWindowMs: z.coerce.number().default(60000), // 1 minute
  rateLimitMaxRequests: z.coerce.number().default(100),

  // Monitoring
  enableMetrics: z.coerce.boolean().default(true),
  enableTracing: z.coerce.boolean().default(false),

  // Queue
  queueConcurrency: z.coerce.number().default(3),

  // Costs & Quotas
  defaultMonthlyQuota: z.coerce.number().default(1000),
});

// Parse and validate environment variables
const parseConfig = () => {
  try {
    return configSchema.parse({
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,

      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,

      jwtSecret: process.env.JWT_SECRET,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN,

      corsOrigin: process.env.CORS_ORIGIN,

      openrouterApiKey: process.env.OPENROUTER_API_KEY,
      hfApiKey: process.env.HF_API_KEY,
      googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      googleCloudCredentials: process.env.GOOGLE_CLOUD_CREDENTIALS,
      ayrshareApiKey: process.env.AYRSHARE_API_KEY,

      gcsStorageBucket: process.env.GCS_STORAGE_BUCKET,

      rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,

      enableMetrics: process.env.ENABLE_METRICS,
      enableTracing: process.env.ENABLE_TRACING,

      queueConcurrency: process.env.QUEUE_CONCURRENCY,
      defaultMonthlyQuota: process.env.DEFAULT_MONTHLY_QUOTA,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const config = parseConfig();

export type Config = z.infer<typeof configSchema>;
