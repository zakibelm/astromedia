// Structured logging with Pino
import pino from 'pino';
import { config } from '../config';

const isDevelopment = config.nodeEnv === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'HH:MM:ss',
          singleLine: false,
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

// Helper functions for structured logging
export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error({ err: error, ...context }, error.message);
};

export const logInfo = (message: string, context?: Record<string, any>) => {
  logger.info(context, message);
};

export const logDebug = (message: string, context?: Record<string, any>) => {
  logger.debug(context, message);
};

export const logWarn = (message: string, context?: Record<string, any>) => {
  logger.warn(context, message);
};
