// ============================================================
// Session & Cookie Utilities — StackSave AI
// ============================================================

import { Response } from 'express';
import jwt from 'jsonwebtoken';

export const SESSION_COOKIE_NAME = 'stacksave_session';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'stacksave_dev_session_secret_change_in_production_min_32_chars';

export interface SessionPayload {
  userId: string;
  sessionVersion: number;
}

export function generateSessionToken(user: { _id: unknown; sessionVersion: number }): string {
  const payload: SessionPayload = {
    userId: String(user._id),
    sessionVersion: user.sessionVersion || 1,
  };
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: '30d' });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearSessionCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  });
}
