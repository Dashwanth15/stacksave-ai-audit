// ============================================================
// Internal Protected Routes — StackSave AI
// Protected by PREMIUM_DIGEST_CRON_SECRET or ADMIN_SECRET
// Never exposed to the public or frontend
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import { triggerDailyOfferDigest } from '../services/emailScheduler';

const router = Router();

/**
 * Authentication middleware for internal cron / scheduler jobs.
 * Accepts:
 * - Authorization: Bearer <PREMIUM_DIGEST_CRON_SECRET | ADMIN_SECRET>
 * - x-cron-secret: <PREMIUM_DIGEST_CRON_SECRET | ADMIN_SECRET>
 */
export function requireInternalCronSecret(req: Request, res: Response, next: NextFunction): void {
  const cronSecret = process.env.PREMIUM_DIGEST_CRON_SECRET || process.env.ADMIN_SECRET;

  if (!cronSecret || cronSecret.trim() === '') {
    res.status(503).json({
      success: false,
      error: 'PREMIUM_DIGEST_CRON_SECRET or ADMIN_SECRET is not configured on the server.',
    });
    return;
  }

  const authHeader = req.headers.authorization;
  const xSecretHeader = req.headers['x-cron-secret'] || req.headers['x-admin-secret'];

  const matchesBearer = authHeader === `Bearer ${cronSecret}`;
  const matchesHeader = xSecretHeader === cronSecret;

  if (!matchesBearer && !matchesHeader) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid internal cron secret.',
    });
    return;
  }

  next();
}

router.use(requireInternalCronSecret);

// ── POST /api/internal/email/premium-digest ──────────────────
// Protected endpoint triggered by GitHub Actions or external cron
router.post('/email/premium-digest', async (req: Request, res: Response) => {
  try {
    const stats = await triggerDailyOfferDigest();
    return res.status(200).json({
      success: true,
      message: 'Daily Premium AI offers digest executed successfully.',
      data: stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[InternalRoute] Error executing daily premium digest:', msg);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while executing the daily digest.',
    });
  }
});

export default router;
