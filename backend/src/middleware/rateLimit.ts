// ============================================================
// Rate Limiting Middleware — StackSave AI Audit
//
// Two tiers of rate limiting:
// 1. Global: 100 requests / 15 min per IP
// 2. Audit creation: 20 audits / hour per IP
//
// Uses in-memory store (express-rate-limit default). For
// multi-instance deployment, switch to rate-limit-redis.
// See ARCHITECTURE.md "Scaling to 10k Audits/Day" section.
// ============================================================

import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter — 300 requests per 15 minutes per IP.
 * An SPA makes multiple API calls per page view (audit data,
 * diff data, version timeline, etc.), so this needs headroom.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Audit creation limiter — 50 audits per hour per IP.
 * Prevents mass audit generation while allowing
 * legitimate testing and usage.
 */
export const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, error: 'Too many audits created. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Lead capture limiter — 10 leads per hour per IP.
 * Tighter than audit since lead spam is higher risk.
 */
export const leadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
