// Request logging middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { httpRequestCounter, httpRequestDuration } from '../monitoring/metrics';

/**
 * Middleware to log all HTTP requests and collect metrics
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  logger.info(
    {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Incoming request'
  );

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode;

    // Extract route pattern (e.g., /api/v1/campaigns/:id)
    const route = req.route ? req.route.path : req.path;

    // Log response
    logger.info(
      {
        method: req.method,
        route,
        statusCode,
        duration: `${duration.toFixed(3)}s`,
        contentLength: res.get('content-length'),
      },
      'Request completed'
    );

    // Collect Prometheus metrics
    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: statusCode.toString(),
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: statusCode.toString(),
      },
      duration
    );

    return originalSend.call(this, data);
  };

  next();
};
