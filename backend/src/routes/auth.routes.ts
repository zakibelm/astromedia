// Authentication routes
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../utils/prisma';
import { generateToken } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

const googleAuthSchema = z.object({
  credential: z.string(),
});

/**
 * POST /api/v1/auth/google
 * specific Login/Signup via Google
 */
router.post(
  '/google',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { credential } = googleAuthSchema.parse(req.body);

    // Verify Google Token
    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
    } catch (error) {
        throw new AppError(401, 'Invalid Google Token');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
        throw new AppError(400, 'Invalid Google Token Payload');
    }

    const { email, name, picture } = payload;

    // Find or Create User
    let user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        // Create new user (random password since they use Google)
        const passwordHash = await bcrypt.hash(Math.random().toString(36), 12);
        
        user = await prisma.user.create({
            data: {
                email,
                name: name || 'Google User',
                passwordHash,
                // avatarUrl: picture // Add if schema supports it
                role: 'USER', // Default role
            }
        });
        logger.info({ userId: user.id, email }, 'User registered via Google');
    } else {
        logger.info({ userId: user.id, email }, 'User logged in via Google');
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
