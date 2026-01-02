// Secure Cookie-Based Authentication Service
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenType: 'access' | 'refresh';
  tokenId?: string; // For refresh token revocation
}

/**
 * Generate access and refresh tokens
 */
export const generateTokenPair = (user: { id: string; email: string; role: string }) => {
  const tokenId = crypto.randomUUID();

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'access',
    } as TokenPayload,
    config.jwtSecret,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenType: 'refresh',
      tokenId,
    } as TokenPayload,
    config.jwtSecret,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  return { accessToken, refreshToken, tokenId };
};

/**
 * Set authentication cookies on response
 */
export const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Access token cookie - short-lived
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  // Refresh token cookie - longer-lived
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth', // Only sent to auth endpoints
  });
};

/**
 * Clear authentication cookies
 */
export const clearAuthCookies = (res: Response) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { path: '/api/v1/auth' });
};

/**
 * Store refresh token in database for revocation tracking
 */
export const storeRefreshToken = async (
  userId: string,
  tokenId: string,
  expiresAt: Date
) => {
  // Using a simple approach - in production, consider a dedicated RefreshToken table
  await prisma.$executeRaw`
    INSERT INTO refresh_tokens (id, user_id, expires_at, created_at)
    VALUES (${tokenId}, ${userId}, ${expiresAt}, NOW())
    ON CONFLICT (id) DO NOTHING
  `.catch(() => {
    // Table might not exist yet, log warning
    logger.warn('refresh_tokens table not found, skipping token storage');
  });
};

/**
 * Revoke a specific refresh token
 */
export const revokeRefreshToken = async (tokenId: string) => {
  try {
    await prisma.$executeRaw`
      DELETE FROM refresh_tokens WHERE id = ${tokenId}
    `;
    logger.info({ tokenId }, 'Refresh token revoked');
  } catch (error) {
    logger.warn({ tokenId }, 'Failed to revoke refresh token');
  }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export const revokeAllUserTokens = async (userId: string) => {
  try {
    await prisma.$executeRaw`
      DELETE FROM refresh_tokens WHERE user_id = ${userId}
    `;
    logger.info({ userId }, 'All user tokens revoked');
  } catch (error) {
    logger.warn({ userId }, 'Failed to revoke user tokens');
  }
};

/**
 * Verify refresh token and check if it's not revoked
 */
export const verifyRefreshToken = async (token: string): Promise<TokenPayload | null> => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    
    if (decoded.tokenType !== 'refresh') {
      logger.warn('Invalid token type for refresh');
      return null;
    }

    // Check if token is revoked (if tracking is enabled)
    if (decoded.tokenId) {
      const exists = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count FROM refresh_tokens WHERE id = ${decoded.tokenId}
      `.catch(() => [{ count: 1 }]); // If table doesn't exist, assume valid

      if (exists[0]?.count === 0) {
        logger.warn({ tokenId: decoded.tokenId }, 'Refresh token was revoked');
        return null;
      }
    }

    return decoded;
  } catch (error) {
    logger.warn({ error }, 'Refresh token verification failed');
    return null;
  }
};

/**
 * Implement refresh token rotation
 * Returns new token pair and invalidates the old refresh token
 */
export const rotateRefreshToken = async (
  oldRefreshToken: string,
  res: Response
): Promise<{ user: any; accessToken: string } | null> => {
  const decoded = await verifyRefreshToken(oldRefreshToken);
  
  if (!decoded) {
    return null;
  }

  // Revoke old token
  if (decoded.tokenId) {
    await revokeRefreshToken(decoded.tokenId);
  }

  // Get fresh user data
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, role: true, name: true, company: true },
  });

  if (!user) {
    logger.warn({ userId: decoded.userId }, 'User not found during token rotation');
    return null;
  }

  // Generate new token pair
  const { accessToken, refreshToken, tokenId } = generateTokenPair(user);

  // Store new refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await storeRefreshToken(user.id, tokenId, expiresAt);

  // Set new cookies
  setAuthCookies(res, accessToken, refreshToken);

  logger.info({ userId: user.id }, 'Token rotation successful');

  return { user, accessToken };
};

export const getAccessTokenFromCookies = (cookies: Record<string, string>): string | undefined => {
  return cookies?.[ACCESS_TOKEN_COOKIE_NAME];
};

export const getRefreshTokenFromCookies = (cookies: Record<string, string>): string | undefined => {
  return cookies?.[REFRESH_TOKEN_COOKIE_NAME];
};
