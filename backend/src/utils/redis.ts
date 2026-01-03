// Redis client singleton
import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // Disable limit to prevent crash on connection retry
  lazyConnect: true, // Don't connect immediately
  retryStrategy(times) {
    if (times > 5) {
      logger.warn('Redis connection retries exhausted (soft fail for dev)');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  reconnectOnError(err) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

// Attempt connection but don't crash if it fails (common in local dev)
redis.connect().catch((err) => {
  logger.warn('Failed to connect to Redis (continuing without it): ' + err.message);
});

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis client error');
});

redis.on('close', () => {
  logger.warn('Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
  logger.info('Redis client disconnected');
});

export default redis;
