// Enhanced Logger with Correlation IDs and Structured Logging
import pino, { Logger, LoggerOptions } from 'pino';
import { AsyncLocalStorage } from 'async_hooks';
import { config } from '../config';

// Correlation ID storage for request tracing
const correlationStorage = new AsyncLocalStorage<string>();

// Generate a unique correlation ID
export const generateCorrelationId = (): string => {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
};

// Get current correlation ID from async context
export const getCorrelationId = (): string | undefined => {
  return correlationStorage.getStore();
};

// Run a function with a correlation ID in context
export const withCorrelationId = <T>(correlationId: string, fn: () => T): T => {
  return correlationStorage.run(correlationId, fn);
};

// Custom serializers for sensitive data redaction
const serializers = {
  req: (req: { method: string; url: string; headers: Record<string, string> }) => ({
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      'x-correlation-id': req.headers['x-correlation-id'],
      // Redact sensitive headers
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      cookie: req.headers.cookie ? '[REDACTED]' : undefined,
    },
  }),
  res: (res: { statusCode: number }) => ({
    statusCode: res.statusCode,
  }),
  err: pino.stdSerializers.err,
};

// Logger configuration
const loggerOptions: LoggerOptions = {
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  
  // Add correlation ID to all logs
  mixin() {
    const correlationId = getCorrelationId();
    return correlationId ? { correlationId } : {};
  },

  // Format timestamp as ISO string
  timestamp: pino.stdTimeFunctions.isoTime,

  // Serializers for data redaction
  serializers,

  // Custom formatting
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
      service: 'astromedia-api',
      version: process.env.npm_package_version || '2.0.0',
      env: config.nodeEnv,
    }),
  },

  // Redact sensitive fields in log data
  redact: {
    paths: [
      'password',
      'passwordHash',
      'apiKey',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
      'headers.authorization',
      'headers.cookie',
    ],
    censor: '[REDACTED]',
  },
};

// Pretty print in development
const developmentTransport = {
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
    messageFormat: '{correlationId} - {msg}',
  },
};

// Create the base logger
const createLogger = (): Logger => {
  if (config.nodeEnv === 'development') {
    return pino({
      ...loggerOptions,
      transport: developmentTransport,
    });
  }
  
  return pino(loggerOptions);
};

export const logger = createLogger();

// Child logger factory for component-specific logging
export const createChildLogger = (component: string, metadata?: Record<string, unknown>): Logger => {
  return logger.child({
    component,
    ...metadata,
  });
};

// Specialized loggers for different components
export const loggers = {
  api: createChildLogger('api'),
  orchestrator: createChildLogger('orchestrator'),
  agents: createChildLogger('agents'),
  generators: createChildLogger('generators'),
  queue: createChildLogger('queue'),
  auth: createChildLogger('auth'),
  database: createChildLogger('database'),
  cache: createChildLogger('cache'),
};

// Performance logging helper
export const logPerformance = (
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void => {
  const duration = Date.now() - startTime;
  logger.info({
    operation,
    duration,
    durationMs: duration,
    ...metadata,
  }, `${operation} completed in ${duration}ms`);
};

// Agent execution logging helper
export const logAgentExecution = (
  agentId: string,
  phase: string,
  status: 'start' | 'success' | 'error',
  metadata?: Record<string, unknown>
): void => {
  const logData = {
    agentId,
    phase,
    status,
    ...metadata,
  };

  switch (status) {
    case 'start':
      loggers.agents.info(logData, `Agent ${agentId} starting phase ${phase}`);
      break;
    case 'success':
      loggers.agents.info(logData, `Agent ${agentId} completed phase ${phase}`);
      break;
    case 'error':
      loggers.agents.error(logData, `Agent ${agentId} failed phase ${phase}`);
      break;
  }
};

// Cost tracking logging helper
export const logCost = (
  provider: string,
  model: string,
  operation: string,
  cost: number,
  metadata?: Record<string, unknown>
): void => {
  logger.info({
    type: 'cost',
    provider,
    model,
    operation,
    cost,
    costUsd: cost,
    ...metadata,
  }, `Cost: $${cost.toFixed(6)} for ${operation} via ${provider}/${model}`);
};

// Error logging helper with context
export const logError = (
  error: Error,
  context: string,
  metadata?: Record<string, unknown>
): void => {
  logger.error({
    err: error,
    context,
    errorName: error.name,
    errorMessage: error.message,
    ...metadata,
  }, `Error in ${context}: ${error.message}`);
};

// Audit logging for security-sensitive operations
export const logAudit = (
  action: string,
  userId: string | null,
  resource: string,
  outcome: 'success' | 'failure',
  metadata?: Record<string, unknown>
): void => {
  logger.info({
    type: 'audit',
    action,
    userId,
    resource,
    outcome,
    timestamp: new Date().toISOString(),
    ...metadata,
  }, `Audit: ${action} on ${resource} by ${userId || 'anonymous'} - ${outcome}`);
};

// Request/Response logging middleware data
export interface RequestLogData {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
  userId?: string;
  ip?: string;
}

export const logRequest = (data: RequestLogData): void => {
  const level = data.statusCode >= 400 ? 'warn' : 'info';
  
  logger[level]({
    type: 'request',
    ...data,
  }, `${data.method} ${data.url} ${data.statusCode} ${data.responseTime}ms`);
};

export default logger;
