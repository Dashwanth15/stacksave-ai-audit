// ============================================================
// Intelligence Routes — Express Endpoints for ADIP
// ============================================================

import { Router, Request, Response } from 'express';
import { ToolEntry, UseCase } from '../types';
import { AIStackIntelligenceService } from '../audit-engine/services/AIStackIntelligenceService';
import { PricingSourceModel, NotificationEventModel, SyncLogModel, SubscriptionModel } from '../services/dbService';
import { PricingOverlayService } from '../pricing/pricingOverlay';
import { isRegisteredOfficialSource, canPublishOffer } from '../pricing/offerTrust';
import { resolveCanonicalOfferUrl } from '../pricing/partnerSourceRegistry';
import { getProviderSource } from '../pricing/sourceRegistry';
import { PlatformRankingEngine, RankingCategory } from '../audit-engine/services/PlatformRankingEngine';
import { ProviderDiscoveryService } from '../pricing/providerDiscoveryService';
import { optionalAuthenticate } from '../middleware/auth';
import { isPremiumUser, syncUserEntitlement } from '../services/billingService';
import { OFFERS_ACCESS_CONFIG } from '../config/offersConfig';

// ── Canonical AI Provider Names (Zero Hardcoded Redundancy) ──
export const CANONICAL_AI_PROVIDER_NAMES: Record<string, string> = {
  'anthropic-api': 'Anthropic API',
  'antigravity': 'Google Antigravity',
  'amazon-q': 'Amazon Q Developer',
  'beautiful-ai': 'Beautiful.ai',
  'bolt-new': 'Bolt.new',
  'canva-ai': 'Canva AI',
  'cerebras': 'Cerebras',
  'character-ai': 'Character.ai',
  'chatgpt': 'ChatGPT',
  'claude': 'Claude',
  'codex': 'OpenAI Codex',
  'cohere': 'Cohere',
  'consensus': 'Consensus',
  'copy-ai': 'Copy.ai',
  'cursor': 'Cursor',
  'deepl': 'DeepL',
  'deepseek': 'DeepSeek',
  'descript': 'Descript',
  'devin': 'Devin',
  'elevenlabs': 'ElevenLabs',
  'elicit': 'Elicit',
  'figma-ai': 'Figma AI',
  'fireworks-ai': 'Fireworks AI',
  'framer': 'Framer',
  'gamma': 'Gamma',
  'gemini': 'Gemini',
  'genspark': 'Genspark',
  'github-copilot': 'GitHub Copilot',
  'github-models': 'GitHub Models',
  'glm': 'GLM',
  'grammarly': 'Grammarly',
  'grok': 'Grok',
  'groq': 'Groq',
  'heygen': 'HeyGen',
  'huggingface': 'Hugging Face',
  'ideogram': 'Ideogram',
  'jasper': 'Jasper',
  'jetbrains': 'JetBrains',
  'kimi': 'Kimi',
  'kling-ai': 'Kling AI',
  'leonardo-ai': 'Leonardo AI',
  'lovable': 'Lovable',
  'luma-ai': 'Luma AI',
  'manus': 'Manus',
  'midjourney': 'Midjourney',
  'mistral': 'Mistral AI',
  'muse': 'Muse',
  'notebooklm': 'NotebookLM',
  'notion-ai': 'Notion AI',
  'openai-api': 'OpenAI API',
  'otter-ai': 'Otter.ai',
  'perplexity': 'Perplexity',
  'poe': 'Poe',
  'qwen': 'Qwen',
  'replit-ai': 'Replit AI',
  'runway': 'Runway',
  'sambanova': 'SambaNova',
  'scite': 'Scite',
  'speechify': 'Speechify',
  'suno': 'Suno',
  'synthesia': 'Synthesia',
  'together-ai': 'Together AI',
  'udio': 'Udio',
  'uizard': 'Uizard',
  'v0': 'v0 by Vercel',
  'wandb': 'Weights & Biases',
  'windsurf': 'Windsurf',
  'writesonic': 'Writesonic',
};

export function getCanonicalProviderName(providerId: string, fallbackName?: string): string {
  const normId = providerId.toLowerCase().trim();
  if (CANONICAL_AI_PROVIDER_NAMES[normId]) {
    return CANONICAL_AI_PROVIDER_NAMES[normId];
  }
  const sourceConfig = getProviderSource(normId);
  if (sourceConfig?.displayName) {
    return sourceConfig.displayName;
  }
  if (fallbackName && typeof fallbackName === 'string') {
    return fallbackName
      .replace(/\s*\(OpenAI\)|\s*\(Anthropic\)|\s*\(Google\)/gi, '')
      .trim();
  }
  return providerId;
}

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
// PUBLIC (no auth required) — all verified active public offers.
// Returns ALL qualifying offers across all validated providers.
// Sorted by offerOpportunityScore DESC (strongest offers first).
//
// Scoring architecture:
//
//   platformIntelligenceScore — PlatformRankingEngine score for the canonical AI platform.
//     Resolved via aiProvider (partner/bundle offers) or providerId (direct offers).
//     ASUS Gemini offer → scored as Gemini; Pixel Gemini offer → scored as Gemini.
//
//   offerOpportunityScore — Offer-only signals (no platform component):
//     offerValue       * 0.40  — magnitude of the offer benefit
//     freshness        * 0.25  — recency of last confirmed verification
//     eligibilityScore * 0.20  — breadth of who can access it
//     partnerContrib   * 0.10  — strength of the non-AI commercial partner (0 if none)
//     evidenceConf     * 0.05  — quality of detection method
//     × offerTypeWeight        — normalises by offer category importance
//
//   finalRecommendedScore = platformIntelligenceScore * 0.60 + offerOpportunityScore * 0.40
//     Platform quality carries 60% weight so major platforms appear first in Recommended.
//
// Response shape:
//   { success: true, data: { offers: PublicOffer[], count: number, isPremiumUser: boolean, lockedMetadata: {...} } }
// ── Public Offers In-Memory Snapshot Cache ──────────────────
interface PublicOffersCacheSnapshot {
  freeData: {
    offers: any[];
    count: number;
    providerCount: number;
    providers: Array<{ providerId: string; displayName: string; offerCount: number }>;
    isPremiumUser: boolean;
    lockedMetadata: { hasLockedOffers: boolean; previewCount: number };
    note: string;
  };
  premiumData: {
    offers: any[];
    count: number;
    providerCount: number;
    providers: Array<{ providerId: string; displayName: string; offerCount: number }>;
    isPremiumUser: boolean;
    lockedMetadata: { hasLockedOffers: boolean; previewCount: number };
    note: string;
  };
  allMonitoredProviders: Array<{ providerId: string; displayName: string; offerCount: number }>;
  cachedAt: number;
}

let publicOffersCache: PublicOffersCacheSnapshot | null = null;
const OFFERS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

export function invalidatePublicOffersCache(): void {
  publicOffersCache = null;
  console.log('[IntelligenceRoute] In-memory public offers cache invalidated.');
}

export async function getOrBuildPublicOffersSnapshot(): Promise<PublicOffersCacheSnapshot> {
  const now = Date.now();
  if (publicOffersCache && (now - publicOffersCache.cachedAt) < OFFERS_CACHE_TTL_MS) {
    return publicOffersCache;
  }

  const events = await NotificationEventModel.find({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
  })
    .sort({ detectedAt: -1 })
    .select('providerId providerName title description discount discountType evidenceText detectionMethod sourceStatus sourceUrl sourceFetchedAt lastSuccessfulCheckAt evidenceLocation contentHash extractorVersion detectedAt expiresAt fingerprint isActive isPublic lastSeenAt lastConfirmedAt isPartnerOffer partner partnerType aiProvider aiPlan offerType benefit duration value eligibility activationMethod country region termsUrl sourceType status category destinationUrl offerSubtype monthlyEquivalent annualPrice annualSavingsPercent annualSavingsAmount')
    .lean();

  // ── offerTypeWeight map ──────────────────────────────────────
  const OFFER_TYPE_WEIGHT: Record<string, number> = {
    partner:    1.00,   // NON-AI company + AI benefit (most valuable)
    startup:    0.90,   // Startup credit grants
    student:    0.85,   // Student / education access
    api:        0.80,   // API developer discounts
    free:       0.75,   // Free access tiers / special promotions
    trial:      0.65,   // Free trials (time-limited)
    annual:     0.70,   // Annual billing savings
  };

  // ── Evidence confidence map ──────────────────────────────────
  const EVIDENCE_CONF: Record<string, number> = {
    PLAYWRIGHT_LIVE: 100,
    PLAYWRIGHT_DOM:  90,
    JSON_LD:         85,
    HTML_TABLE:      80,
    NEXTJS_EMBEDDED: 80,
    STATIC_BASELINE: 60,
  };

  // ── Partner type strength map ────────────────────────────────
  const PARTNER_STRENGTH: Record<string, number> = {
    telecom:     100,
    broadband:   100,
    devices:     95,
    banking:     85,
    credit_card: 85,
    membership:  80,
  };

  // ── Helper: derive offer category from stored fields ─────────
  function inferOfferCategory(e: typeof events[0]): 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free' {
    const sub = (((e as any).offerSubtype || '') as string).toUpperCase();
    if (sub === 'STUDENT_DISCOUNT' || sub === 'ACADEMIC_FREE') return 'student';
    if (sub === 'STARTUP_GRANT') return 'startup';
    if (sub === 'API_DISCOUNT' || sub === 'API_RATE_DISCOUNT' || sub === 'API_CREDIT') return 'api';
    if (sub === 'ANNUAL_DISCOUNT') return 'annual';
    if (sub === 'PARTNER_BUNDLE') return 'partner';
    if (sub === 'FREE_TRIAL') return 'trial';
    if (sub === 'FREE_PLAN' || sub === 'PROMOTIONAL_FREE') return 'free';

    const pType = (e.partnerType || '').toLowerCase();
    const oType = (e.offerType || '').toUpperCase();
    const combined = `${e.title || ''} ${e.description || ''} ${e.eligibility || ''} ${oType}`.toLowerCase();

    // Student / Education
    if (pType === 'education' || oType.includes('EDUCATION') || combined.includes('student') || combined.includes('educat') || combined.includes('teacher') || combined.includes('.edu')) {
      return 'student';
    }
    // Startup Grants
    if (pType === 'cloud' || oType.includes('STARTUP') || oType === 'CLOUD_BUNDLE' || combined.includes('startup') || combined.includes('founder') || combined.includes('accelerator')) {
      return 'startup';
    }
    // API Discounts
    if (combined.includes('prompt caching') || combined.includes('off-peak') || combined.includes('batch processing') || combined.includes('message batches') || combined.includes('api developer') || combined.includes('api pricing') || (e.title || '').toLowerCase().includes('api')) {
      return 'api';
    }
    // Annual Savings
    if (combined.includes('annual') || combined.includes('billed annually')) {
      return 'annual';
    }
    // Commercial Partner Bundles
    if (e.isPartnerOffer || (e.partner && ['telecom', 'devices', 'banking', 'broadband', 'credit_card', 'membership'].includes(pType))) {
      return 'partner';
    }
    if (combined.includes('trial') || combined.includes('preview')) {
      return 'trial';
    }
    return 'free';
  }

  // ── Helper: compute platformIntelligenceScore ─────────────────
  function computePlatformIntelligenceScore(e: typeof events[0]): number {
    const canonicalId = (e as any).aiProvider || e.providerId;
    return PlatformRankingEngine.getScoreForProvider(canonicalId);
  }

  // ── Helper: compute offerOpportunityScore ────────────────────
  function computeOpportunityScore(e: typeof events[0], category: string): number {
    const discountText = (e.discount || e.benefit || e.evidenceText || '').toLowerCase();
    let offerValue = 50; // baseline
    if (discountText.includes('100%') || discountText.includes('free for') || discountText.includes('18 month')) offerValue = 100;
    else if (discountText.includes('12 month') || discountText.includes('1 year')) offerValue = 95;
    else if (discountText.includes('90%')) offerValue = 90;
    else if (discountText.includes('50%')) offerValue = 80;
    else if (discountText.includes('free')) offerValue = 85;
    else if (discountText.includes('25%')) offerValue = 70;
    else if (discountText.includes('20%')) offerValue = 65;
    else if (discountText.includes('15%') || discountText.includes('17%')) offerValue = 60;
    if (category === 'partner') offerValue = Math.max(offerValue, 90);
    if (category === 'startup') offerValue = Math.max(offerValue, 75);
    if (category === 'student') offerValue = Math.max(offerValue, 70);

    const confirmedAt = e.lastConfirmedAt ? new Date(e.lastConfirmedAt) : new Date(e.detectedAt);
    const daysSince = Math.max(0, (Date.now() - confirmedAt.getTime()) / 86_400_000);
    const freshness = Math.max(0, 100 - Math.round(daysSince * 3));

    let eligibilityScore = 100; // default global
    if (e.country && e.country !== 'GLOBAL' && e.country !== 'US') eligibilityScore = 50;
    else if (e.region) eligibilityScore = 75;

    let partnerScore = 0;
    if (e.partnerType) {
      partnerScore = PARTNER_STRENGTH[e.partnerType.toLowerCase()] ?? 70;
    }
    const partnerContrib = partnerScore;

    const evidenceConf = EVIDENCE_CONF[e.detectionMethod || 'PLAYWRIGHT_DOM'] ?? 60;

    const rawScore =
      offerValue       * 0.40 +
      freshness        * 0.25 +
      eligibilityScore * 0.20 +
      partnerContrib   * 0.10 +
      evidenceConf     * 0.05;

    const typeWeight = OFFER_TYPE_WEIGHT[category] ?? 0.70;
    return Math.min(100, Math.round(rawScore * typeWeight));
  }

  const scoredOffers = events
    .filter((e) => e.isPublic === true && canPublishOffer(e))
    .map((e) => {
      const category = ((e as any).category as 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free') || inferOfferCategory(e);
      const platformIntelligenceScore = computePlatformIntelligenceScore(e);
      const offerOpportunityScore = computeOpportunityScore(e, category);
      const finalRecommendedScore = Math.min(100, Math.round(
        platformIntelligenceScore * 0.60 + offerOpportunityScore * 0.40
      ));
      const destinationUrl = resolveCanonicalOfferUrl((e as any).destinationUrl || e.sourceUrl);
      const canonicalId = ((e as any).aiProvider || e.providerId || '').toLowerCase().trim();
      const canonicalDisplayName = getCanonicalProviderName(canonicalId, e.providerName || e.providerId);
      return {
        id: e.fingerprint || (e as { _id?: unknown })._id?.toString() || `${e.providerId}-${e.title}`,
        fingerprint: e.fingerprint,
        providerId: e.providerId,
        providerName: canonicalDisplayName,
        canonicalProviderId: canonicalId,
        title: e.title,
        category,
        description: e.description || null,
        discount: e.discount || null,
        discountType: e.discountType || null,
        evidenceText: e.evidenceText || null,
        detectionMethod: e.detectionMethod || 'PLAYWRIGHT_DOM',
        sourceStatus: e.sourceStatus,
        sourceUrl: resolveCanonicalOfferUrl(e.sourceUrl || (e as any).destinationUrl),
        destinationUrl,
        offerSubtype: (e as any).offerSubtype || null,
        monthlyEquivalent: (e as any).monthlyEquivalent ?? null,
        annualPrice: (e as any).annualPrice ?? null,
        annualSavingsPercent: (e as any).annualSavingsPercent ?? null,
        annualSavingsAmount: (e as any).annualSavingsAmount ?? null,
        sourceDomain: (e as any).sourceDomain || null,
        providerOfficialUrl: (e as any).providerOfficialUrl || null,
        sourceFetchedAt: (e as any).sourceFetchedAt,
        lastSuccessfulCheckAt: (e as any).lastSuccessfulCheckAt,
        evidenceLocation: (e as any).evidenceLocation,
        contentHash: (e as any).contentHash,
        extractorVersion: (e as any).extractorVersion,
        detectedAt: e.detectedAt,
        lastConfirmedAt: e.lastConfirmedAt,
        expiresAt: e.expiresAt || null,
        isPartnerOffer: e.isPartnerOffer ?? false,
        partner: e.partner || null,
        partnerType: e.partnerType || null,
        aiProvider: e.aiProvider || null,
        aiPlan: e.aiPlan || null,
        offerType: e.offerType || null,
        benefit: e.benefit || null,
        duration: e.duration || null,
        value: e.value || null,
        eligibility: e.eligibility || null,
        activationMethod: e.activationMethod || null,
        country: e.country || null,
        region: e.region || null,
        termsUrl: e.termsUrl || null,
        sourceType: (e as any).sourceType || 'official',
        status: (e as any).status || 'ACTIVE',
        platformIntelligenceScore,
        offerOpportunityScore,
        finalRecommendedScore,
      };
    })
    .sort((a, b) => b.finalRecommendedScore - a.finalRecommendedScore);

  // ── 1. Premium Payload (All offers visible) ──
  const premiumCanonicalProvidersMap = new Map<string, { providerId: string; displayName: string; offerCount: number }>();
  for (const offer of scoredOffers) {
    const canonicalId = ((offer.aiProvider || offer.providerId) || '').toLowerCase().trim();
    const existing = premiumCanonicalProvidersMap.get(canonicalId);
    if (existing) {
      existing.offerCount++;
    } else {
      premiumCanonicalProvidersMap.set(canonicalId, {
        providerId: canonicalId,
        displayName: getCanonicalProviderName(canonicalId, offer.providerName),
        offerCount: 1,
      });
    }
  }
  const premiumProvidersList = Array.from(premiumCanonicalProvidersMap.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const premiumData = {
    offers: scoredOffers,
    count: scoredOffers.length,
    providerCount: premiumProvidersList.length,
    providers: premiumProvidersList,
    isPremiumUser: true,
    lockedMetadata: {
      hasLockedOffers: false,
      previewCount: 0,
    },
    note: 'Offers sorted by finalRecommendedScore (platformIntelligenceScore×0.60 + offerOpportunityScore×0.40). Access control enforced on server.',
  };

  // ── 2. Free / Guest Payload (Server-Side Access Control) ──
  const premiumCategoriesSet = new Set(
    (OFFERS_ACCESS_CONFIG.PREMIUM_OFFER_CATEGORIES || []).map((c) => c.toLowerCase().trim())
  );
  const premiumProvidersSet = new Set(
    (OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS || []).map((p) => p.toLowerCase().trim())
  );

  const freeEligibleOffers: typeof scoredOffers = [];
  const categoryCountsMap = new Map<string, number>();

  for (const offer of scoredOffers) {
    const catKey = (offer.category || '').toLowerCase().trim();
    const provKey = (offer.canonicalProviderId || offer.providerId || '').toLowerCase().trim();

    if (premiumCategoriesSet.has(catKey) || premiumProvidersSet.has(provKey)) {
      continue;
    }

    const currentCatCount = categoryCountsMap.get(catKey) || 0;
    if (
      OFFERS_ACCESS_CONFIG.FREE_VISIBLE_OFFER_LIMIT !== null &&
      OFFERS_ACCESS_CONFIG.FREE_VISIBLE_OFFER_LIMIT !== undefined &&
      currentCatCount >= OFFERS_ACCESS_CONFIG.FREE_VISIBLE_OFFER_LIMIT
    ) {
      continue;
    }

    categoryCountsMap.set(catKey, currentCatCount + 1);
    freeEligibleOffers.push(offer);
  }

  const freeCanonicalProvidersMap = new Map<string, { providerId: string; displayName: string; offerCount: number }>();
  for (const offer of freeEligibleOffers) {
    const canonicalId = ((offer.aiProvider || offer.providerId) || '').toLowerCase().trim();
    const existing = freeCanonicalProvidersMap.get(canonicalId);
    if (existing) {
      existing.offerCount++;
    } else {
      freeCanonicalProvidersMap.set(canonicalId, {
        providerId: canonicalId,
        displayName: getCanonicalProviderName(canonicalId, offer.providerName),
        offerCount: 1,
      });
    }
  }
  const freeProvidersList = Array.from(freeCanonicalProvidersMap.values())
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const freeData = {
    offers: freeEligibleOffers,
    count: freeEligibleOffers.length,
    providerCount: freeProvidersList.length,
    providers: freeProvidersList,
    isPremiumUser: false,
    lockedMetadata: {
      hasLockedOffers: true,
      previewCount: OFFERS_ACCESS_CONFIG.PREMIUM_OFFER_PREVIEW_COUNT || 3,
    },
    note: 'Offers sorted by finalRecommendedScore (platformIntelligenceScore×0.60 + offerOpportunityScore×0.40). Access control enforced on server.',
  };

  publicOffersCache = {
    freeData,
    premiumData,
    allMonitoredProviders: premiumProvidersList,
    cachedAt: now,
  };

  return publicOffersCache;
}

// ── GET /api/intelligence/offers ─────────────────────────────
// PUBLIC (no auth required) — all verified active public offers.
// Reads from the high-performance in-memory cache snapshot.
router.get('/offers', optionalAuthenticate, async (req: Request, res: Response) => {
  try {
    let isPremium = false;
    if (req.user) {
      isPremium = isPremiumUser(req.user);
      if (isPremium) {
        const sub = await SubscriptionModel.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
        if (sub && !isPremiumUser(req.user, sub)) {
          await syncUserEntitlement(req.user._id, sub);
          isPremium = false;
        }
      }
    }

    const snapshot = await getOrBuildPublicOffersSnapshot();

    if (isPremium || !OFFERS_ACCESS_CONFIG.PREMIUM_OFFERS_ENABLED) {
      return res.json({
        success: true,
        data: snapshot.premiumData,
      });
    }

    return res.json({
      success: true,
      data: snapshot.freeData,
    });
  } catch (err) {
    console.error('GET /api/intelligence/offers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch public offers' });
  }
});


// ── GET /api/intelligence/platform-rankings ──────────────────
// PUBLIC (no auth required) — Evidence-driven, multi-signal platform rankings.
// Zero hardcoded brand bias. Supported categories:
//   OVERALL | CODING | GENERAL_ASSISTANT | RESEARCH | WRITING | IMAGE | VIDEO | VOICE_AUDIO | AGENTS | DEVELOPER_API
router.get('/platform-rankings', async (req: Request, res: Response) => {
  try {
    const rawCategory = (req.query.category as string || 'OVERALL').toUpperCase() as RankingCategory;
    const rankings = PlatformRankingEngine.getCategoryRankings(rawCategory);
    return res.json({ success: true, data: rankings });
  } catch (err) {
    console.error('GET /api/intelligence/platform-rankings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate platform rankings' });
  }
});

// ── GET /api/intelligence/discovered-providers ───────────────
// PUBLIC (no auth required) — AI platforms discovered in the wider ecosystem
// that are not part of the baseline core StackSave provider catalog.
router.get('/discovered-providers', async (_req: Request, res: Response) => {
  try {
    const providers = ProviderDiscoveryService.getAllDiscoveredProviders();
    return res.json({
      success: true,
      data: {
        total: providers.length,
        providers,
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/discovered-providers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch discovered providers' });
  }
});

// ── GET /api/intelligence/providers ─────────────────────────
// PUBLIC (no auth required) — Canonical list of unique AI providers monitored 24/7.
// Deduplicated by canonical AI platform identity (aiProvider || providerId).
// Commercial partner companies (Jio, ASUS, Amex, Pixel, etc.) do NOT inflate the count.
router.get('/providers', async (_req: Request, res: Response) => {
  try {
    const snapshot = await getOrBuildPublicOffersSnapshot();
    return res.json({
      success: true,
      data: {
        count: snapshot.allMonitoredProviders.length,
        providers: snapshot.allMonitoredProviders,
      },
    });
  } catch (err) {
    console.error('GET /api/intelligence/providers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch monitored providers' });
  }
});

export default router;

