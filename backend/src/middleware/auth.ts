// ============================================================
// Authentication Middleware — StackSave AI
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { UserModel, UserDocument } from '../services/dbService';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  clearSessionCookie,
} from '../utils/session';

// Extend Express Request with optional user
declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

/**
 * Extracts session token from HttpOnly cookie or Authorization header.
 */
function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return req.cookies[SESSION_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

/**
 * Strict authentication middleware. Rejects unauthenticated requests with 401.
 * Validates session signature, expiration, user existence, and sessionVersion matching.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Please sign in.',
      });
      return;
    }

    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      clearSessionCookie(res);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please sign in again.',
      });
      return;
    }

    const user = await UserModel.findById(payload.userId);
    if (!user) {
      clearSessionCookie(res);
      res.status(401).json({
        success: false,
        error: 'User account not found.',
      });
      return;
    }

    // ── Mandatory Correction 2: Session Invalidation / Revocation ──
    if (payload.sessionVersion !== user.sessionVersion) {
      clearSessionCookie(res);
      res.status(401).json({
        success: false,
        error: 'Session has been revoked. Please sign in again.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication middleware error:', err);
    res.status(500).json({ success: false, error: 'Authentication error' });
  }
}

/**
 * Optional authentication middleware.
 * Attaches req.user if a valid session exists, but allows guests to proceed if absent.
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }

    const payload = verifySessionToken(token);
    if (!payload || !payload.userId) {
      return next();
    }

    const user = await UserModel.findById(payload.userId);
    if (user && payload.sessionVersion === user.sessionVersion) {
      req.user = user;
    }
    next();
  } catch {
    // Non-fatal for optional auth; continue as guest
    next();
  }
}
