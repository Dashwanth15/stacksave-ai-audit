// ============================================================
// Pricing Routes — Public Read-Only Canonical Pricing API
// StackSave AI Audit
//
// GET /api/pricing/providers/:providerId
//   Returns the current runtime-verified plan catalog for a provider.
//   VERIFIED plans from MongoDB overlay are returned when available.
//   Falls back to static knowledge base plans.
//   No auth required — read-only, no secrets exposed.
//
// GET /api/pricing/providers
//   Returns a summary of all known providers' plan counts.
// ============================================================

import { Router, Request, Response } from 'express';
import { KnowledgeLoader } from '../audit-engine/services/KnowledgeLoader';
import { PricingSourceModel } from '../services/dbService';
import { PricingOverlayService } from '../pricing/pricingOverlay';
import { getProviderSource } from '../pricing/sourceRegistry';


const router = Router();

// ── Canonical plan IDs that are valid for each provider ──────
// This whitelist prevents arbitrary/untrusted plan IDs from entering the catalog.
export const CANONICAL_PLAN_IDS: Record<string, ReadonlySet<string>> = {
  antigravity: new Set(['free', 'pro', 'ultra_100', 'ultra_200', 'organization']),
  perplexity: new Set(['free', 'pro', 'max', 'education_pro', 'enterprise_pro', 'enterprise_max', 'custom']),
  cursor: new Set(['hobby', 'pro', 'pro-plus', 'ultra', 'teams', 'enterprise']),
  'github-copilot': new Set(['free', 'individual', 'business', 'enterprise']),
  claude: new Set(['free', 'pro', 'max', 'team', 'enterprise']),
  chatgpt: new Set(['free', 'go', 'plus', 'pro', 'team', 'enterprise']),
  gemini: new Set(['free', 'google-ai-plus', 'google-ai-pro', 'google-ai-ultra', 'workspace', 'api']),
  windsurf: new Set(['free', 'pro', 'max', 'teams', 'enterprise']),
  deepseek: new Set(['free', 'pro', 'api']),
  grok: new Set(['free', 'supergrok_lite', 'supergrok', 'supergrok_plus', 'supergrok_heavy', 'x_premium', 'x_premium_plus', 'api']),
  'openai-api': new Set(['pay-as-you-go']),
  'anthropic-api': new Set(['pay-as-you-go']),
  kimi: new Set(['pay-as-you-go']),
  codex: new Set(['api']),
  'github-models': new Set(['free', 'pro']),
  glm: new Set(['lite', 'pro', 'max', 'enterprise', 'api']),
};

/**
 * Validates that a plan ID is canonical for the given provider.
 * Rejects unknown/untrusted plan IDs.
 */
export function isCanonicalPlanId(providerId: string, planId: string): boolean {
  const allowed = CANONICAL_PLAN_IDS[providerId];
  if (!allowed) return false; // Unknown provider — reject
  return allowed.has(planId);
}

// ── GET /api/pricing/providers/:providerId ────────────────────
// Returns the current runtime plan catalog for a provider.
// Merges DB-verified plans (if VERIFIED status) with static knowledge.
router.get('/providers/:providerId', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const normalizedId = providerId.toLowerCase().trim();

    // Validate provider is in the canonical registry
    if (!CANONICAL_PLAN_IDS[normalizedId]) {
      return res.status(404).json({
        success: false,
        error: `Provider '${normalizedId}' is not in the canonical pricing registry.`,
      });
    }

    // Ensure KnowledgeLoader is initialized with latest baseline
    KnowledgeLoader.reload();

    // Load static knowledge base plans
    const staticPlans = KnowledgeLoader.loadPlans(normalizedId);

    // Query MongoDB for latest verified pricing
    let dbRecord: {
      status: string;
      plans: object[];
      lastVerifiedAt?: Date;
      lastCheckedAt?: Date;
      pricingUrl?: string;
    } | null = null;

    try {
      dbRecord = await PricingSourceModel.findOne({ providerId: normalizedId })
        .select('status plans lastVerifiedAt lastCheckedAt pricingUrl')
        .lean() as typeof dbRecord;
    } catch {
      // DB not available — use static plans only
    }

    // Get overlay status
    const overlayResult = PricingOverlayService.getProviderOverlayStatus(normalizedId);

    // Build the merged plan list
    // Priority: DB VERIFIED plans > static knowledge base plans
    let mergedPlans = staticPlans;
    let pricingStatus: 'VERIFIED' | 'STATIC_BASELINE' | 'STALE' | 'UNKNOWN' = 'STATIC_BASELINE';
    let lastVerifiedAt: Date | null = null;
    // Default sourceUrl from the canonical source registry
    const registryEntry = getProviderSource(normalizedId);
    let sourceUrl = registryEntry?.pricingUrl ?? `https://perplexity.ai/hub/pricing`;


    if (dbRecord) {
      sourceUrl = (dbRecord as any).pricingUrl || sourceUrl;
      lastVerifiedAt = dbRecord.lastVerifiedAt || null;

      if (dbRecord.status === 'VERIFIED' && Array.isArray(dbRecord.plans) && dbRecord.plans.length > 0) {
        // Filter DB plans through canonical whitelist before merging
        const verifiedDbPlans = (dbRecord.plans as Array<{ id: string; label: string; monthlyPricePerSeat: number; annualPricePerSeat?: number; isPayPerUse?: boolean; currency?: string }>)
          .filter((p) => isCanonicalPlanId(normalizedId, p.id));

        if (verifiedDbPlans.length > 0) {
          // Merge: start with static plans, override/add from verified DB
          const dbPlanMap = new Map(verifiedDbPlans.map((p) => [p.id, p]));

          // Update existing static plans with DB pricing
          const updated = staticPlans.map((sp) => {
            const dbPlan = dbPlanMap.get(sp.id);
            if (dbPlan) {
              return {
                ...sp,
                monthlyPricePerSeat: dbPlan.monthlyPricePerSeat,
                annualPricePerSeat: dbPlan.annualPricePerSeat ?? sp.annualPricePerSeat,
                isPayPerUse: dbPlan.isPayPerUse ?? sp.isPayPerUse,
              };
            }
            return sp;
          });

          // Add newly discovered canonical plans from DB that weren't in static list
          for (const dbPlan of verifiedDbPlans) {
            if (!updated.find((p) => p.id === dbPlan.id)) {
              updated.push({
                id: dbPlan.id,
                label: dbPlan.label,
                monthlyPricePerSeat: dbPlan.monthlyPricePerSeat,
                annualPricePerSeat: dbPlan.annualPricePerSeat,
                isPayPerUse: dbPlan.isPayPerUse,
              });
            }
          }

          mergedPlans = updated;
          pricingStatus = 'VERIFIED';
        }
      } else if (dbRecord.status === 'STALE') {
        pricingStatus = 'STALE';
      }
    }

    // Build canonical response — never expose raw DB internal fields
    const responsePlans = mergedPlans.map((p) => ({
      id: p.id,
      label: p.label,
      monthlyPricePerSeat: p.monthlyPricePerSeat,
      annualPricePerSeat: p.annualPricePerSeat ?? null,
      isPayPerUse: p.isPayPerUse ?? false,
      isContactSales: (p.isPayPerUse && p.monthlyPricePerSeat === 0) ? true : false,
      currency: 'USD',
      tierRank: (p as any).tierRank ?? null,
      features: (p as any).features ?? [],
    }));

    return res.json({
      success: true,
      data: {
        providerId: normalizedId,
        pricingStatus,
        sourceUrl,
        lastVerifiedAt: lastVerifiedAt?.toISOString() ?? null,
        overlayStatus: overlayResult?.status ?? 'UNKNOWN',
        plans: responsePlans,
        planCount: responsePlans.length,
        note: pricingStatus === 'VERIFIED'
          ? 'Plans reflect latest verified pricing from official source via automated sync.'
          : 'Plans reflect static authoritative baseline. Live sync may be pending.',
      },
    });
  } catch (err) {
    console.error(`GET /api/pricing/providers/${req.params.providerId} error:`, err);
    return res.status(500).json({ success: false, error: 'Failed to fetch provider pricing' });
  }
});

// ── GET /api/pricing/providers ────────────────────────────────
// Returns a summary list of all providers with their plan counts.
router.get('/providers', (_req: Request, res: Response) => {
  try {
    KnowledgeLoader.initialize();

    const providerSummaries = Object.keys(CANONICAL_PLAN_IDS).map((providerId) => {
      const plans = KnowledgeLoader.loadPlans(providerId);
      return {
        providerId,
        planCount: plans.length,
        canonicalPlanIds: Array.from(CANONICAL_PLAN_IDS[providerId]),
      };
    });

    return res.json({
      success: true,
      data: {
        providers: providerSummaries,
        totalProviders: providerSummaries.length,
      },
    });
  } catch (err) {
    console.error('GET /api/pricing/providers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch providers' });
  }
});

export default router;
