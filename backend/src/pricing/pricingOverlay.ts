// ============================================================
// Pricing Overlay Service — StackSave AI Audit
//
// THE MISSING LINK between the pricing sync pipeline and the
// recommendation engine.
//
// Flow:
//   MongoDB (PricingSource, status=VERIFIED)
//   → PricingOverlayService.applyVerifiedPricing()
//   → KnowledgeLoader.patchPlansFromDB() (in-memory plan cache)
//   → OptimizationStrategyEngine
//   → Audit financial calculations
//
// Called from:
//   1. app.ts start() — once after connectDB() on cold start
//   2. syncOrchestrator.ts — after every sync run completes
//
// Rules:
//   - Only VERIFIED status records patch the cache.
//   - STALE / FETCH_BLOCKED / PARSE_FAILED records do NOT
//     override the static plans (last-known-good is preserved).
//   - Logs PRICING_OVERLAY_APPLIED / PRICING_OVERLAY_SKIPPED per provider.
//   - Never silently uses stale pricing as current.
// ============================================================

import { PricingSourceModel } from '../services/dbService';
import { KnowledgeLoader } from '../audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../audit-engine/services/KnowledgeScoringEngine';
import { NormalizedPlan } from './types';

export interface OverlayResult {
  providerId: string;
  status: 'APPLIED' | 'SKIPPED' | 'NOT_IN_REGISTRY';
  reason: string;
  plansPatched?: number;
}

export interface ApplyOverlayResult {
  appliedAt: Date;
  results: OverlayResult[];
  appliedCount: number;
  skippedCount: number;
}

export class PricingOverlayService {
  private static lastAppliedAt: Date | null = null;
  private static lastResults: OverlayResult[] = [];

  /**
   * Query PricingSource for all records and patch KnowledgeLoader's
   * in-memory plan cache with VERIFIED records only. Called on startup
   * and after each sync run.
   *
   * Only VERIFIED records are applied. STALE / FETCH_BLOCKED records are
   * explicitly skipped with a log so operators can see which providers are
   * using static fallback pricing.
   */
  static async applyVerifiedPricing(): Promise<ApplyOverlayResult> {
    const startedAt = new Date();
    const results: OverlayResult[] = [];

    let sources: Array<{
      providerId: string;
      status: string;
      plans: object[];
      lastVerifiedAt?: Date;
      displayName: string;
    }> = [];

    try {
      sources = (await PricingSourceModel.find({}).lean()) as typeof sources;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[PricingOverlay] DB query failed — keeping static plans: ${msg}`);
      return {
        appliedAt: startedAt,
        results: [],
        appliedCount: 0,
        skippedCount: 0,
      };
    }

    // Ensure KnowledgeLoader is initialized with static data first
    KnowledgeLoader.initialize();

    for (const source of sources) {
      const { providerId, status, plans } = source;

      if (status !== 'VERIFIED') {
        const skippedReason =
          status === 'STALE'
            ? `Status STALE — last verified ${source.lastVerifiedAt?.toISOString() ?? 'never'}. Static plans retained.`
            : `Status ${status} — static plans retained.`;

        console.log(
          `[PricingOverlay] PRICING_OVERLAY_SKIPPED provider=${providerId} reason="${skippedReason}"`
        );
        results.push({ providerId, status: 'SKIPPED', reason: skippedReason });
        continue;
      }

      if (!plans || plans.length === 0) {
        results.push({
          providerId,
          status: 'SKIPPED',
          reason: 'VERIFIED status but plans array is empty — static plans retained.',
        });
        continue;
      }

      // Patch KnowledgeLoader's in-memory cache with verified DB plans
      const dbPlans = plans as NormalizedPlan[];
      const patched = KnowledgeLoader.patchPlansFromDB(providerId, dbPlans);

      if (patched) {
        console.log(
          `[PricingOverlay] PRICING_OVERLAY_APPLIED provider=${providerId} plans=${dbPlans.length}` +
            ` verifiedAt=${source.lastVerifiedAt?.toISOString() ?? 'unknown'}`
        );
        results.push({
          providerId,
          status: 'APPLIED',
          reason: `${dbPlans.length} plan(s) from VERIFIED DB record applied to recommendation engine.`,
          plansPatched: dbPlans.length,
        });
      } else {
        results.push({
          providerId,
          status: 'NOT_IN_REGISTRY',
          reason: 'Provider not found in KnowledgeLoader cache — DB plans not applied.',
        });
      }
    }

    const appliedCount = results.filter((r) => r.status === 'APPLIED').length;
    const skippedCount = results.filter((r) => r.status === 'SKIPPED').length;
    const notInRegistry = results.filter((r) => r.status === 'NOT_IN_REGISTRY').length;

    // Scored profiles derive costEfficiencyScore / valueScore / costDataAvailable from the
    // plan prices read at score time, and KnowledgeScoringEngine memoises one profile per
    // provider id for the process lifetime. Without this invalidation the overlay patched
    // KnowledgeLoader's plans while every recommendation kept scoring the pre-sync prices,
    // so a verified price change reached the audit's financial display and never reached
    // provider selection. Only invalidate when something actually changed.
    if (appliedCount > 0) {
      KnowledgeScoringEngine.clearCache();
      console.log(
        `[PricingOverlay] Scored-profile cache invalidated — ${appliedCount} provider(s) will be rescored against verified prices`
      );
    }

    console.log(
      `[PricingOverlay] Complete: ${appliedCount} providers patched, ` +
        `${skippedCount} skipped (stale/failed), ${notInRegistry} not in registry`
    );

    this.lastAppliedAt = startedAt;
    this.lastResults = results;

    return { appliedAt: startedAt, results, appliedCount, skippedCount };
  }

  /** Return the results from the most recent overlay application. */
  static getLastOverlayStatus(): { appliedAt: Date | null; results: OverlayResult[] } {
    return { appliedAt: this.lastAppliedAt, results: this.lastResults };
  }

  /** Get overlay status for a specific provider. */
  static getProviderOverlayStatus(providerId: string): OverlayResult | null {
    return this.lastResults.find((r) => r.providerId === providerId) ?? null;
  }
}
