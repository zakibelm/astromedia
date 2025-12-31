// Global error handling middleware
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: any[] | undefined;

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;

    switch (err.code) {
      case 'P2002':
        message = 'Unique constraint violation';
        break;
      case 'P2025':
        message = 'Record not found';
        statusCode = 404;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed';
        break;
      default:
        message = 'Database error';
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  }

  // Log error
  logger.error(
    {
      err,
      statusCode,
      method: req.method,
      url: req.url,
      ip: req.ip,
    },
    message
  );

  // Send response
  res.status(statusCode).json({
    error: message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.message,
    }),
  });
};

/**
 * Async error wrapper for route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
