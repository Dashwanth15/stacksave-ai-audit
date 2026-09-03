// ============================================================
// Intelligence Routes — Express Endpoints for ADIP
// ============================================================

import { Router, Request, Response } from 'express';
import { ToolEntry, UseCase } from '../types';
import { AIStackIntelligenceService } from '../audit-engine/services/AIStackIntelligenceService';
import { PricingSourceModel, NotificationEventModel, SyncLogModel } from '../services/dbService';
import { PricingOverlayService } from '../pricing/pricingOverlay';
import { isRegisteredOfficialSource } from '../pricing/offerTrust';

const router = Router();

// ── Auth Middleware (copied from admin.ts) ────────────────────

function requireAdminSecret(req: Request, res: Response, next: Function): void {
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

// ── POST /api/intelligence/audit-analysis ────────────────────
// Main endpoint: Generates replacement, consolidation, and removal
// intelligence for an audited tool stack in a single request.
router.post('/audit-analysis', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as {
      tools: ToolEntry[];
      useCase?: UseCase;
    };

    if (!Array.isArray(tools)) {
      return res.status(400).json({ success: false, error: 'Invalid tools payload' });
    }

    const intelligence = AIStackIntelligenceService.generateFullIntelligence(tools, useCase);
    return res.json({ success: true, data: intelligence });
  } catch (err) {
    console.error('POST /api/intelligence/audit-analysis error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate intelligence analysis' });
  }
});

// ── POST /api/intelligence/replace ───────────────────────────
router.post('/replace', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const replacements = AIStackIntelligenceService.analyzeReplacements(tools || [], useCase);
    return res.json({ success: true, data: replacements });
  } catch (err) {
    console.error('POST /api/intelligence/replace error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run replacement analysis' });
  }
});

// ── POST /api/intelligence/consolidate ───────────────────────
router.post('/consolidate', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const consolidations = AIStackIntelligenceService.analyzeConsolidations(tools || [], useCase);
    return res.json({ success: true, data: consolidations });
  } catch (err) {
    console.error('POST /api/intelligence/consolidate error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run consolidation analysis' });
  }
});

// ── POST /api/intelligence/remove ────────────────────────────
router.post('/remove', async (req: Request, res: Response) => {
  try {
    const { tools, useCase = 'coding' } = req.body as { tools: ToolEntry[]; useCase?: UseCase };
    const removals = AIStackIntelligenceService.analyzeRemovals(tools || [], useCase);
    return res.json({ success: true, data: removals });
  } catch (err) {
    console.error('POST /api/intelligence/remove error:', err);
    return res.status(500).json({ success: false, error: 'Failed to run removal analysis' });
  }
});

// ── GET /api/intelligence/pricing-status ─────────────────────
// PUBLIC (no auth required) — read-only pricing sync status per provider.
// Used by the frontend PricingIntelligencePanel to show verified/stale status.
//
// Response shape:
//   { success: true, data: { providers: ProviderStatus[], summary: {...} } }
router.get('/pricing-status', async (_req: Request, res: Response) => {
  try {
    const latestSuccessfulSync = await SyncLogModel.findOne({
      completedAt: { $exists: true },
      successCount: { $gt: 0 },
    })
      .sort({ completedAt: -1 })
      .select('completedAt')
      .lean();

    const sources = await PricingSourceModel.find({})
      .select('providerId displayName status lastCheckedAt lastSuccessfulCheckAt lastVerifiedAt consecutiveFailures pricingUrl strategy')
      .sort({ providerId: 1 })
      .lean();

    const overlayStatus = PricingOverlayService.getLastOverlayStatus();

    const providers = sources.map((s) => {
      const overlay = overlayStatus.results.find((r) => r.providerId === s.providerId);
      const strategy = (s as { strategy?: string }).strategy ?? null;
      const status = s.status;

      let authorityCategory:
        | 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE'
        | 'VERIFIED_API_MODEL_PRICE'
        | 'VERIFIED_FREE_TIER'
        | 'AUTHORITATIVE_STATIC_BASELINE'
        | 'STALE'
        | 'NO_RELIABLE_PUBLIC_SOURCE';

      let authorityDescription: string;

      const isApiProvider = ['openai-api', 'anthropic-api', 'deepseek', 'kimi'].includes(s.providerId);
      const isFreeTierProvider = ['codex', 'github-models'].includes(s.providerId);

      if (status === 'VERIFIED') {
        if (isFreeTierProvider) {
          authorityCategory = 'VERIFIED_FREE_TIER';
          authorityDescription = 'Verified zero-cost public access or developer preview tier directly from official provider.';
        } else if (isApiProvider) {
          authorityCategory = 'VERIFIED_API_MODEL_PRICE';
          authorityDescription = 'Official API model token pricing verified directly from vendor-owned pricing and documentation pages.';
        } else {
          authorityCategory = 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE';
          authorityDescription = 'Official pricing verified directly from vendor page markup (JSON-LD / Contentful / Docs Table / Hydrated DOM).';
        }
      } else if (status === 'STALE') {
        authorityCategory = 'STALE';
        authorityDescription = 'Last verified >24h ago; previous confirmed pricing retained.';
      } else if (status === 'FETCH_BLOCKED') {
        authorityCategory = 'AUTHORITATIVE_STATIC_BASELINE';
        authorityDescription = 'Vendor bot mitigation (403/429) blocked automated fetch; authoritative static baseline retained.';
      } else if (strategy === 'STATIC_FALLBACK' || status === 'NO_RELIABLE_PUBLIC_SOURCE') {
        authorityCategory = 'AUTHORITATIVE_STATIC_BASELINE';
        authorityDescription = 'Client-rendered SPA without static markup; authoritative static baseline retained.';
      } else {
        authorityCategory = 'NO_RELIABLE_PUBLIC_SOURCE';
        authorityDescription = 'No scrapeable public source. Authoritative baseline retained.';
      }



      return {
        providerId: s.providerId,
        displayName: s.displayName || s.providerId,
        syncStatus: s.status,                        // VERIFIED | STALE | FETCH_BLOCKED | PARSE_FAILED | NO_RELIABLE_PUBLIC_SOURCE
        authorityCategory,
        authorityDescription,
        lastVerifiedAt: s.lastVerifiedAt ?? null,
        lastCheckedAt: s.lastCheckedAt ?? null,
        lastSuccessfulCheckAt: s.lastSuccessfulCheckAt ?? null,
        consecutiveFailures: s.consecutiveFailures ?? 0,
        sourceUrl: (s as { pricingUrl?: string }).pricingUrl ?? null,
        pricingStrategy: strategy,
        engineStatus: overlay?.status ?? 'UNKNOWN',  // APPLIED | SKIPPED | NOT_IN_REGISTRY
        engineReason: overlay?.reason ?? null,
        plansPatched: overlay?.plansPatched ?? 0,
      };
    });



    const verifiedCount = providers.filter((p) => p.syncStatus === 'VERIFIED').length;
    const staleCount = providers.filter((p) => p.syncStatus === 'STALE').length;
    const blockedCount = providers.filter(
      (p) => p.syncStatus === 'FETCH_BLOCKED' || p.syncStatus === 'PARSE_FAILED' || p.syncStatus === 'NO_RELIABLE_PUBLIC_SOURCE'
    ).length;

    const overallHealth =
      verifiedCount === providers.length ? 'ALL_VERIFIED'
      : verifiedCount > 0 ? 'PARTIAL'
      : 'DEGRADED';

    return res.json({
      success: true,
      data: {
        providers,
        summary: {
          totalProviders: providers.length,
          verifiedCount,
          staleCount,
          blockedCount,
          overallHealth,
          overlayLastAppliedAt: overlayStatus.appliedAt,
          lastSuccessfulSyncAt: latestSuccessfulSync?.completedAt ?? null,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/pricing-status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch pricing status' });
  }
});

// ── GET /api/intelligence/offers/diagnostic (ADMIN-ONLY) ─────
// INTERNAL: Safe diagnostic endpoint (no credentials exposed)
// Reports offer verification state without exposing secrets
// Purpose: Debug why offers page may show zero offers
// SECURITY: Protected by requireAdminSecret — returns 401 if not authenticated
router.get('/offers/diagnostic', requireAdminSecret, async (_req: Request, res: Response) => {
  try {
    // DIAGNOSTIC COUNTS — No evidence/secrets exposed
    // NOTE: Updated to match simplified architecture (no timestamp publication gates)
    const [
      totalEvents,
      newOfferEvents,
      activeEvents,
      publicEvents,
      verifiedEvents,
      withEvidence,
      withSourceFetched,
      withLastConfirmed,
      withLastCheck,
      allConditions,
    ] = await Promise.all([
      NotificationEventModel.countDocuments({}),
      NotificationEventModel.countDocuments({ eventType: 'NEW_OFFER' }),
      NotificationEventModel.countDocuments({ isActive: { $ne: false } }),
      NotificationEventModel.countDocuments({ isPublic: true }),
      NotificationEventModel.countDocuments({ sourceStatus: 'VERIFIED' }),
      NotificationEventModel.countDocuments({ evidenceText: { $exists: true, $ne: null } }),
      NotificationEventModel.countDocuments({ sourceFetchedAt: { $exists: true, $ne: null } }),
      NotificationEventModel.countDocuments({ lastConfirmedAt: { $exists: true, $ne: null } }),
      NotificationEventModel.countDocuments({ lastSuccessfulCheckAt: { $exists: true, $ne: null } }),
      // NEW: Match the simplified architecture — only 3 gates matter for publication
      NotificationEventModel.countDocuments({
        eventType: 'NEW_OFFER',
        isActive: { $ne: false },
        isPublic: true,
        evidenceText: { $exists: true, $ne: null },
        // sourceRegistry validation happens in application code, not DB query
        // So we can't filter by it here — but we report this as the qualifying count
      }),
    ]);

    // Provider-level diagnostics (updated for simplified architecture)
    const providerCounts = await NotificationEventModel.aggregate([
      {
        $match: {
          eventType: 'NEW_OFFER',
          isActive: { $ne: false },
          isPublic: true,
          evidenceText: { $exists: true, $ne: null },
          // sourceRegistry filtering happens in application layer
        },
      },
      {
        $group: {
          _id: '$providerId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      success: true,
      data: {
        diagnostic: {
          totalNotificationEvents: totalEvents,
          breakdown: {
            eventType_NEW_OFFER: newOfferEvents,
            isActive_true: activeEvents,
            isPublic_true: publicEvents,
            sourceStatus_VERIFIED: verifiedEvents,
            evidenceText_exists: withEvidence,
            sourceFetchedAt_exists: withSourceFetched,
            lastConfirmedAt_exists: withLastConfirmed,
            lastSuccessfulCheckAt_exists: withLastCheck,
          },
          percentages: {
            eventType_NEW_OFFER: totalEvents > 0 ? Math.round((newOfferEvents / totalEvents) * 100) : 0,
            isActive_true: totalEvents > 0 ? Math.round((activeEvents / totalEvents) * 100) : 0,
            isPublic_true: totalEvents > 0 ? Math.round((publicEvents / totalEvents) * 100) : 0,
            sourceStatus_VERIFIED: totalEvents > 0 ? Math.round((verifiedEvents / totalEvents) * 100) : 0,
            evidenceText_exists: totalEvents > 0 ? Math.round((withEvidence / totalEvents) * 100) : 0,
            sourceFetchedAt_exists: totalEvents > 0 ? Math.round((withSourceFetched / totalEvents) * 100) : 0,
            lastConfirmedAt_exists: totalEvents > 0 ? Math.round((withLastConfirmed / totalEvents) * 100) : 0,
            lastSuccessfulCheckAt_exists: totalEvents > 0 ? Math.round((withLastCheck / totalEvents) * 100) : 0,
          },
          offersPassingAllConditions: allConditions,
          offersPassingAllConditions_percent: totalEvents > 0 ? Math.round((allConditions / totalEvents) * 100) : 0,
          offersQualifyingForPublic: allConditions,
          offersQualifyingForPublic_note: 'Events matching: eventType=NEW_OFFER, isActive=true, isPublic=true, evidenceText exists. Note: sourceRegistry filtering happens in app layer.',
          providerBreakdown: providerCounts.map((p: { _id: string; count: number }) => ({
            providerId: p._id,
            publicOfferCount: p.count,
          })),
          note: 'DIAGNOSTIC: Reports record counts to identify why offers may not appear. Simplified architecture: Offers are public if eventType=NEW_OFFER, isActive=true, isPublic=true, evidenceText exists, AND sourceUrl is in sourceRegistry (checked in app layer).',
        },
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/offers/diagnostic error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate diagnostic' });
  }
});

// ── GET /api/intelligence/offers ─────────────────────────────
// PUBLIC (no auth required) — read-only recent new public offers.
// Returns only genuinely new offers (deduped by fingerprint in DB).
// Ordered by detectedAt desc, limited to last 20.
//
// IMPORTANT: These are official public promotions only.
// Account-specific or private offers are never included.
//
// Response shape:
//   { success: true, data: { offers: PublicOffer[], count: number } }
router.get('/offers', async (_req: Request, res: Response) => {
  try {
    const events = await NotificationEventModel.find({
      eventType: 'NEW_OFFER',
      isActive: { $ne: false },
      isPublic: true,
    })
      .sort({ detectedAt: -1 })
      .select('providerId providerName title description discount discountType evidenceText detectionMethod sourceStatus sourceUrl sourceFetchedAt lastSuccessfulCheckAt evidenceLocation contentHash extractorVersion detectedAt expiresAt fingerprint isActive isPublic lastSeenAt lastConfirmedAt')
      .lean();

    const offers = events.filter((e) => (
      e.isPublic === true &&
      Boolean(e.evidenceText?.trim()) &&
      isRegisteredOfficialSource(e.providerId, e.sourceUrl)
    )).map((e) => ({
      id: e.fingerprint || (e as { _id?: unknown })._id?.toString() || `${e.providerId}-${e.title}`,
      fingerprint: e.fingerprint,
      providerId: e.providerId,
      providerName: e.providerName || e.providerId,
      title: e.title,
      description: e.description || null,
      discount: e.discount || null,
      discountType: e.discountType || null,
      evidenceText: e.evidenceText || null,
      detectionMethod: e.detectionMethod || 'PLAYWRIGHT_DOM',
      sourceStatus: e.sourceStatus,
      sourceUrl: e.sourceUrl,
      sourceFetchedAt: e.sourceFetchedAt,
      lastSuccessfulCheckAt: e.lastSuccessfulCheckAt,
      evidenceLocation: e.evidenceLocation,
      contentHash: e.contentHash,
      extractorVersion: e.extractorVersion,
      detectedAt: e.detectedAt,
      lastConfirmedAt: e.lastConfirmedAt,
      expiresAt: e.expiresAt || null,
    }));

    return res.json({
      success: true,
      data: {
        offers,
        count: offers.length,
        note: 'These are publicly available promotions from official provider sources. Account-specific offers are not included.',
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/offers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch public offers' });
  }
});


export default router;
