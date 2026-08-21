// ============================================================
// Intelligence Routes — Express Endpoints for ADIP
// ============================================================

import { Router, Request, Response } from 'express';
import { ToolEntry, UseCase } from '../types';
import { AIStackIntelligenceService } from '../audit-engine/services/AIStackIntelligenceService';
import { PricingSourceModel, NotificationEventModel } from '../services/dbService';
import { PricingOverlayService } from '../pricing/pricingOverlay';

const router = Router();

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
    const sources = await PricingSourceModel.find({})
      .select('providerId displayName status lastVerifiedAt consecutiveFailures pricingUrl strategy')
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
        | 'AUTHORITATIVE_STATIC_BASELINE'
        | 'STALE'
        | 'NO_RELIABLE_PUBLIC_SOURCE';

      let authorityDescription: string;

      if (status === 'VERIFIED') {
        authorityCategory = 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE';
        authorityDescription = 'Official pricing verified directly from vendor page markup (JSON-LD / Contentful / Docs Table).';
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
        },
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/pricing-status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch pricing status' });
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
    const events = await NotificationEventModel.find({ eventType: 'NEW_OFFER' })
      .sort({ detectedAt: -1 })
      .limit(20)
      .select('providerId providerName title description discount discountType sourceUrl detectedAt expiresAt')
      .lean();

    const offers = events.map((e) => ({
      providerId: e.providerId,
      providerName: e.providerName || e.providerId,
      title: e.title,
      description: e.description || null,
      discount: e.discount || null,
      discountType: e.discountType || null,
      sourceUrl: e.sourceUrl,
      detectedAt: e.detectedAt,
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
