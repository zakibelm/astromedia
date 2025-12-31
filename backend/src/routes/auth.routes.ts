// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { generateToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().optional(),
  company: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      throw new AppError(409, 'User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        company: body.company,
      },
      select: {
        id: true,
        email: true,
        name: true,
        company: true,
        role: true,
        apiQuota: true,
        createdAt: true,
      },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered');

    res.status(201).json({
      user,
      token,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Login user
 */
router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(body.password, user.passwordHash);

    if (!isValid) {
      throw new AppError(401, 'Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info({ userId: user.id, email: user.email }, 'User logged in');

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        role: user.role,
        apiQuota: user.apiQuota,
        apiUsed: user.apiUsed,
      },
      token,
    });
  })
);

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    // In a production app, you'd implement refresh tokens
    // For now, we'll just return a new token based on the current one
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Token refresh not yet implemented',
    });
  })
);

export default router;
