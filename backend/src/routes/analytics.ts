// ============================================================
// Analytics Routes — Google Analytics 4, Search Console & DB
// StackSave AI Audit — Realtime & Historical Statistics API
// ============================================================

import { Router, Request, Response } from 'express';
import { GoogleAnalyticsService, TimePeriod } from '../services/googleAnalyticsService';
import { requireAdminSecret } from './admin';

const router = Router();
router.use(requireAdminSecret);

// Validate and sanitize the period query parameter
function parsePeriod(rawPeriod: unknown): TimePeriod {
  if (rawPeriod === 'today' || rawPeriod === 'yesterday' || rawPeriod === '7days' || rawPeriod === '30days') {
    return rawPeriod;
  }
  return '7days'; // default
}

// ── GET /api/analytics/overview ───────────────────────────────
// Consolidated analytics overview across all 4 independent data sources.
// Query params: ?period=today|yesterday|7days|30days
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period);
    const data = await GoogleAnalyticsService.getAnalyticsOverview(period);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error fetching overview:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics overview' });
  }
});

// ── GET /api/analytics/realtime ───────────────────────────────
// GA4 Realtime Reporting API: "Active Users — Last 30 Minutes",
// realtime views, event feed.
router.get('/realtime', async (_req: Request, res: Response) => {
  try {
    const data = await GoogleAnalyticsService.getRealtimeAnalytics();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error fetching realtime analytics:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch realtime analytics' });
  }
});

// ── GET /api/analytics/historical ─────────────────────────────
// GA4 Historical Data API: dynamic date ranges, traffic metrics,
// and strictly isolated GA4 event funnel.
router.get('/historical', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period);
    const data = await GoogleAnalyticsService.getHistoricalAnalytics(period);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error fetching historical analytics:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch historical analytics' });
  }
});

// ── GET /api/analytics/search-console ─────────────────────────
// Google Search Console API: organic search queries, clicks, impressions,
// CTR, and average position.
router.get('/search-console', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period);
    const data = await GoogleAnalyticsService.getSearchConsoleAnalytics(period);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error fetching Search Console analytics:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch search console analytics' });
  }
});

// ── GET /api/analytics/database ───────────────────────────────
// MongoDB Database Ground Truth: real completed audits, successful audits,
// failed audits, and lead captures.
router.get('/database', async (req: Request, res: Response) => {
  try {
    const period = parsePeriod(req.query.period);
    const data = await GoogleAnalyticsService.getDatabaseAnalytics(period);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error fetching database analytics:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch database analytics' });
  }
});

// ── GET /api/analytics/health ─────────────────────────────────
// Health and dependency check for GA4, Search Console, and MongoDB.
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const data = await GoogleAnalyticsService.getAnalyticsHealth();
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AnalyticsRoute] Error checking analytics health:', msg);
    res.status(500).json({ success: false, error: 'Failed to check analytics health' });
  }
});

export default router;
