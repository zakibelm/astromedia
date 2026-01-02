// CSRF Protection Middleware
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware to set CSRF token cookie on GET requests
 */
export const setCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Only set on safe methods if no token exists
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const existingToken = req.cookies?.[CSRF_COOKIE_NAME];
    
    if (!existingToken) {
      const token = generateCsrfToken();
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JS to send in header
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    }
  }
  next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip validation for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip for API key authenticated requests (they're stateless)
  if (req.headers['x-api-key']) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    logger.warn({ 
      path: req.path, 
      method: req.method,
      hasCoookie: !!cookieToken,
      hasHeader: !!headerToken 
    }, 'CSRF token missing');
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'CSRF token missing',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    logger.warn({ path: req.path, method: req.method }, 'CSRF token mismatch');
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid CSRF token',
    });
  }

  next();
};

/**
 * Route handler to get a fresh CSRF token
 */
export const getCsrfToken = (req: Request, res: Response) => {
  const token = generateCsrfToken();
  
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({ csrfToken: token });
};
