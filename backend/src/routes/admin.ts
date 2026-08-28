// ============================================================
// Admin Routes — Pricing Sync & Offer Intelligence
// StackSave AI Audit
//
// All routes protected by Authorization: Bearer <ADMIN_SECRET>
// ============================================================

import { Router, Request, Response, NextFunction } from 'express';
import {
  PricingSourceModel,
  PricingHistoryModel,
  SyncLogModel,
  NotificationEventModel,
} from '../services/dbService';
import { runPricingSync, ingestOfficialExtractedPricing } from '../pricing/syncOrchestrator';
import { runOfferMonitor } from '../pricing/offerMonitor';
import { sendAuditConfirmation, sendReAuditNotification, getSenderAddress } from '../services/emailService';

const router = Router();

// ── Auth Middleware ───────────────────────────────────────────

function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    res.status(503).json({ success: false, error: 'ADMIN_SECRET not configured on server' });
    return;
  }
  const auth = req.headers.authorization;
  const xSecret = req.headers['x-admin-secret'];

  const matchesBearer = auth === `Bearer ${secret}`;
  const matchesXSecret = xSecret === secret;

  if (!matchesBearer && !matchesXSecret) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

router.use(requireAdminSecret);

// ── POST /api/admin/pricing/ingest ────────────────────────────
// Ingest extracted official provider pricing data from Playwright runner.

router.post('/pricing/ingest', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || !Array.isArray(payload.providers)) {
      res.status(400).json({ success: false, error: 'Invalid payload: providers array required' });
      return;
    }
    const triggeredBy = (req.headers['x-triggered-by'] as string) || 'github_actions_playwright';
    const result = await ingestOfficialExtractedPricing(payload, triggeredBy);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin] Pricing ingestion failed:', err);
    res.status(500).json({ success: false, error: `Ingestion failed: ${msg}` });
  }
});

// ── POST /api/admin/pricing/sync ──────────────────────────────
// Trigger a full pricing sync for all providers.

router.post('/pricing/sync', async (req: Request, res: Response) => {
  try {
    const triggeredBy = (req.headers['x-triggered-by'] as string) || 'api';
    const result = await runPricingSync(triggeredBy);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin] Pricing sync failed:', err);
    res.status(500).json({ success: false, error: `Sync failed: ${msg}` });
  }
});

// ── POST /api/admin/offers/scan ───────────────────────────────
// Trigger an offer detection scan.

router.post('/offers/scan', async (_req: Request, res: Response) => {
  try {
    const result = await runOfferMonitor();
    res.json({ success: true, data: result });
  } catch (err: unknown) {

    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin] Offer scan failed:', err);
    res.status(500).json({ success: false, error: `Offer scan failed: ${msg}` });
  }
});

// ── GET /api/admin/pricing/status ────────────────────────────
// Provider monitoring table: current status, last sync time, plans.

router.get('/pricing/status', async (_req: Request, res: Response) => {
  try {
    const sources = await PricingSourceModel.find({})
      .sort({ providerId: 1 })
      .lean();
    res.json({ success: true, data: sources });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /api/admin/pricing/history ───────────────────────────
// Recent price changes (last 50).

router.get('/pricing/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const history = await PricingHistoryModel.find({})
      .sort({ detectedAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: history });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /api/admin/offers ─────────────────────────────────────
// Recent offer notifications (last 50).

router.get('/offers', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offers = await NotificationEventModel.find({})
      .sort({ detectedAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: offers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /api/admin/sync/logs ──────────────────────────────────
// Sync run history (last 20 runs).

router.get('/sync/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const logs = await SyncLogModel.find({})
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, data: logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /api/admin/pricing/:providerId ───────────────────────
// Current pricing for a single provider.

router.get('/pricing/:providerId', async (req: Request, res: Response) => {
  try {
    const source = await PricingSourceModel.findOne({
      providerId: req.params.providerId,
    }).lean();
    if (!source) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }
    res.json({ success: true, data: source });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: msg });
  }
});

// ── POST /api/admin/email/test ─────────────────────────────────
// Send a test transactional email to verify Resend credentials and domain
router.post('/email/test', async (req: Request, res: Response) => {
  try {
    const { to, type = 'audit', companyName } = req.body;
    if (!to || typeof to !== 'string' || !to.includes('@')) {
      res.status(400).json({ success: false, error: 'Recipient email "to" is required' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://stacksaveai.com';
    const sender = getSenderAddress();

    if (type === 're-audit') {
      const result = await sendReAuditNotification({
        email: to,
        auditId: 'test-audit-' + Date.now().toString(36),
        comparisonUrl: `${frontendUrl}/audit/sample-audit-id/diff`,
        companyName: companyName || 'Acme Engineering',
        changedToolsSummary: 'Claude Pro (+$2/mo), Cursor Business (-$5/mo)',
        savingsDelta: 420,
        oldSavings: 1200,
        newSavings: 1620,
      });
      res.json({
        success: result.success,
        type: 're-audit',
        sender,
        recipient: to,
        resendId: result.id,
        error: result.error,
      });
    } else {
      const result = await sendAuditConfirmation({
        email: to,
        auditId: 'test-audit-' + Date.now().toString(36),
        publicUrl: `${frontendUrl}/results/sample-audit-id`,
        monthlySavings: 850,
        annualSavings: 10200,
        isHighSavings: true,
        companyName: companyName || 'Acme Engineering',
        totalMonthlySpend: 2800,
        optimizedMonthlySpend: 1950,
        savingsPercentage: 30,
        teamSize: 15,
        toolCount: 6,
      });
      res.json({
        success: result.success,
        type: 'audit-confirmation',
        sender,
        recipient: to,
        resendId: result.id,
        error: result.error,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Admin] Test email failed:', err);
    res.status(500).json({ success: false, error: `Test email failed: ${msg}` });
  }
});

export default router;
