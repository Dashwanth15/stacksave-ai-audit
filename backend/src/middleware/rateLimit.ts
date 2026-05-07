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
 * Global rate limiter — 100 requests per 15 minutes per IP.
 * Generous for real users, blocks automated abuse.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Audit creation limiter — 20 audits per hour per IP.
 * Prevents mass audit generation while allowing
 * legitimate testing and usage.
 */
export const auditLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
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
