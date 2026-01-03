// Google OAuth Authentication Service
import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name?: string;
  picture?: string;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/v1/auth/google/callback';

/**
 * Generate Google OAuth authorization URL
 */
export function getGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ error }, 'Failed to exchange code for tokens');
    throw new Error(`Google OAuth token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ error }, 'Failed to get Google user info');
    throw new Error(`Failed to get Google user info: ${error}`);
  }

  return response.json();
}

/**
 * Find or create user from Google profile
 */
export async function findOrCreateGoogleUser(googleUser: GoogleUserInfo) {
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: googleUser.email },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        passwordHash: '', // No password for OAuth users
        role: 'USER',
      },
    });
    logger.info({ userId: user.id, email: user.email }, 'Created new user from Google OAuth');
  } else {
    // Update last login
    user = await prisma.user.update({
      where: { id: user.id },
      data: { 
        lastLoginAt: new Date(),
        name: user.name || googleUser.name, // Update name if not set
      },
    });
    logger.info({ userId: user.id }, 'User logged in via Google OAuth');
  }

  return user;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateAuthToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn || '7d' }
  );
}

/**
 * Complete Google OAuth flow
 */
export async function handleGoogleCallback(code: string) {
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  
  // Get user info
  const googleUser = await getGoogleUserInfo(tokens.access_token);
  
  // Find or create user
  const user = await findOrCreateGoogleUser(googleUser);
  
  // Generate JWT
  const token = generateAuthToken(user);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}
