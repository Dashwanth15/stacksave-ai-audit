// ============================================================
// Pricing Sync Orchestrator — StackSave AI Audit
//
// Main pipeline: runs all provider adapters, validates results,
// compares against DB, writes history on changes, updates source
// records, and generates a structured sync log.
// ============================================================

import { randomUUID } from 'crypto';
import {
  PricingSourceModel,
  PricingHistoryModel,
  SyncLogModel,
} from '../services/dbService';
import { PROVIDER_SOURCE_REGISTRY } from './sourceRegistry';
import { PricingOverlayService } from './pricingOverlay';
import { fetchCursorPricing } from './adapters/cursor';
import { fetchGithubCopilotPricing } from './adapters/githubCopilot';
import { fetchDeepSeekPricing } from './adapters/deepseek';
import { fetchOfficialDirectPricing } from './adapters/officialDirect';
import { validatePlans, diffPlans, isSuspiciousChange } from './validator';
import { NormalizedPlan, ProviderPricingResult, SyncStatus } from './types';


// ── Types ────────────────────────────────────────────────────

export interface ProviderSyncSummary {
  providerId: string;
  displayName: string;
  status: SyncStatus;
  plansCount: number;
  strategy: string;
  priceChanged: boolean;
  changeSummary?: string;
  isSuspicious: boolean;
  validationErrors: string[];
  validationWarnings: string[];
  durationMs: number;
  failureReason?: string;
}

export interface SyncRunResult {
  syncRunId: string;
  startedAt: Date;
  completedAt: Date;
  triggeredBy: string;
  providers: ProviderSyncSummary[];
  totalProviders: number;
  successCount: number;
  failureCount: number;
  staleCount: number;
  priceChangeCount: number;
}

// ── Adapter Dispatch (OFFICIAL VENDOR SOURCES ONLY) ───────────

async function runAdapter(providerId: string, sourceUrl: string): Promise<ProviderPricingResult> {
  switch (providerId) {
    case 'cursor':
      return fetchCursorPricing();
    case 'github-copilot':
      return fetchGithubCopilotPricing();
    case 'deepseek':
      return fetchDeepSeekPricing();
    default:
      return fetchOfficialDirectPricing(providerId, sourceUrl);
  }
}

// ── Plans comparison helper ───────────────────────────────────

function plansAreEqual(a: NormalizedPlan[], b: NormalizedPlan[]): boolean {
  if (a.length !== b.length) return false;
  for (const planA of a) {
    const planB = b.find((p) => p.id === planA.id);
    if (!planB) return false;
    if (planA.monthlyPricePerSeat !== planB.monthlyPricePerSeat) return false;
    if ((planA.annualPricePerSeat ?? 0) !== (planB.annualPricePerSeat ?? 0)) return false;
  }
  return true;
}

// ── Main Orchestrator ─────────────────────────────────────────

export async function runPricingSync(triggeredBy: string = 'api'): Promise<SyncRunResult> {
  const syncRunId = randomUUID();
  const startedAt = new Date();

  console.log(`[PricingSync] Starting sync run ${syncRunId} (triggered by: ${triggeredBy})`);

  // Create the sync log record immediately so we have a record even if something crashes
  await SyncLogModel.create({
    syncRunId,
    startedAt,
    triggeredBy,
    totalProviders: PROVIDER_SOURCE_REGISTRY.length,
  });

  const providerSummaries: ProviderSyncSummary[] = [];

  for (const source of PROVIDER_SOURCE_REGISTRY) {
    const adapterStart = Date.now();
    console.log(`[PricingSync] Processing ${source.id}...`);

    let result: ProviderPricingResult;
    try {
      result = await runAdapter(source.id, source.pricingUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      result = {
        providerId: source.id,
        status: 'FETCH_BLOCKED',
        strategy: source.strategy,
        sourceUrl: source.pricingUrl,
        fetchedAt: new Date(),
        plans: [],
        failureReason: `Unhandled adapter error: ${msg}`,
      };
    }

    const durationMs = Date.now() - adapterStart;
    const summary: ProviderSyncSummary = {
      providerId: source.id,
      displayName: source.displayName,
      status: result.status,
      plansCount: result.plans?.length ?? 0,
      strategy: source.strategy,
      priceChanged: false,
      isSuspicious: false,
      validationErrors: [],
      validationWarnings: [],
      durationMs,
      failureReason: result.failureReason,
    };


    // ── Handle non-verified results ───────────────────────────
    if (result.status !== 'VERIFIED') {
      // Upsert the source record preserving existing plans as STALE
      await PricingSourceModel.findOneAndUpdate(
        { providerId: source.id },
        {
          $set: {
            displayName: source.displayName,
            pricingUrl: source.pricingUrl,
            strategy: source.strategy,
            status: 'STALE',
            lastSyncedAt: result.fetchedAt,
            failureReason: result.failureReason,
          },
          $inc: { consecutiveFailures: 1 },
        },
        { upsert: true, new: true }
      );

      providerSummaries.push(summary);
      continue;
    }

    // ── Validate fetched plans ────────────────────────────────
    const validation = validatePlans(result.plans);
    summary.validationErrors = validation.errors;
    summary.validationWarnings = validation.warnings;

    if (!validation.isValid) {
      summary.status = 'PARSE_FAILED';
      summary.failureReason = `Validation errors: ${validation.errors.join('; ')}`;

      await PricingSourceModel.findOneAndUpdate(
        { providerId: source.id },
        {
          $set: {
            displayName: source.displayName,
            pricingUrl: source.pricingUrl,
            strategy: source.strategy,
            status: 'STALE',
            lastSyncedAt: result.fetchedAt,
            failureReason: summary.failureReason,
          },
          $inc: { consecutiveFailures: 1 },
        },
        { upsert: true, new: true }
      );

      providerSummaries.push(summary);
      continue;
    }

    // ── Load previous plans for diff ──────────────────────────
    const existing = await PricingSourceModel.findOne({ providerId: source.id });
    const previousPlans: NormalizedPlan[] = (existing?.plans ?? []) as NormalizedPlan[];

    const suspicious = previousPlans.length > 0
      ? isSuspiciousChange(previousPlans, result.plans)
      : false;

    const changeSummary = previousPlans.length > 0
      ? diffPlans(previousPlans, result.plans)
      : `Initial pricing record: ${result.plans.length} plan(s)`;

    const priceChanged = previousPlans.length === 0
      || !plansAreEqual(previousPlans, result.plans);

    summary.priceChanged = priceChanged;
    summary.isSuspicious = suspicious;
    summary.changeSummary = changeSummary ?? undefined;

    // ── Write history record on change ────────────────────────
    if (priceChanged && changeSummary) {
      await PricingHistoryModel.create({
        providerId: source.id,
        detectedAt: result.fetchedAt,
        previousPlans,
        newPlans: result.plans,
        changeSummary,
        isSuspicious: suspicious,
        syncRunId,
      });
      console.log(`[PricingSync] Price change detected for ${source.id}: ${changeSummary}`);
    }

    // ── Upsert the source record ──────────────────────────────
    const finalStatus: SyncStatus = suspicious ? 'VALIDATION_SUSPICIOUS' : 'VERIFIED';

    await PricingSourceModel.findOneAndUpdate(
      { providerId: source.id },
      {
        $set: {
          displayName: source.displayName,
          pricingUrl: source.pricingUrl,
          strategy: source.strategy,
          status: finalStatus,
          lastSyncedAt: result.fetchedAt,
          lastVerifiedAt: result.fetchedAt,
          plans: result.plans,
          failureReason: suspicious
            ? `Price change exceeded 200% threshold. Manual review required. ${changeSummary}`
            : undefined,
          consecutiveFailures: 0,
        },
      },
      { upsert: true, new: true }
    );

    providerSummaries.push(summary);
  }

  // ── Tally results ─────────────────────────────────────────
  const completedAt = new Date();
  const successCount  = providerSummaries.filter((p) => p.status === 'VERIFIED').length;
  const failureCount  = providerSummaries.filter((p) =>
    p.status === 'FETCH_BLOCKED' || p.status === 'PARSE_FAILED' || p.status === 'NO_RELIABLE_PUBLIC_SOURCE'
  ).length;
  const staleCount    = providerSummaries.filter((p) => p.status === 'STALE').length;
  const priceChangeCount = providerSummaries.filter((p) => p.priceChanged).length;

  // ── Finalize sync log ─────────────────────────────────────
  await SyncLogModel.findOneAndUpdate(
    { syncRunId },
    {
      $set: {
        completedAt,
        providerResults: providerSummaries,
        totalProviders: providerSummaries.length,
        successCount,
        failureCount,
        staleCount,
        priceChangeCount,
      },
    }
  );

  console.log(
    `[PricingSync] Run ${syncRunId} complete: ${successCount} verified, ${failureCount} failed, ${staleCount} stale, ${priceChangeCount} price changes`
  );

  // ── Re-apply pricing overlay after sync ────────────────────────
  // Immediately propagates verified prices to the recommendation engine
  // so the next audit uses updated pricing without a server restart.
  if (successCount > 0) {
    PricingOverlayService.applyVerifiedPricing().catch((err) => {
      console.error('[PricingSync] Post-sync overlay failed:', err);
    });
  }

  return {
    syncRunId,
    startedAt,
    completedAt,
    triggeredBy,
    providers: providerSummaries,
    totalProviders: providerSummaries.length,
    successCount,
    failureCount,
    staleCount,
    priceChangeCount,
  };
}

// ── Ingest Runner Extracted Official Pricing ──────────────────
export async function ingestOfficialExtractedPricing(
  payload: import('./types').OfficialIngestPayload,
  triggeredBy: string = 'github_actions_playwright'
): Promise<SyncRunResult> {
  const syncRunId = randomUUID();
  const startedAt = new Date();

  console.log(`[PricingSync:Ingest] Ingesting runner payload (${payload.providers.length} providers, runId: ${syncRunId})`);

  await SyncLogModel.create({
    syncRunId,
    startedAt,
    triggeredBy,
    totalProviders: payload.providers.length,
  });

  const providerSummaries: ProviderSyncSummary[] = [];

  for (const item of payload.providers) {
    const registryConfig = PROVIDER_SOURCE_REGISTRY.find((p) => p.id === item.providerId);
    const displayName = registryConfig?.displayName || item.displayName || item.providerId;

    const validation = validatePlans(item.plans);
    const isVerified = validation.isValid && item.status === 'VERIFIED';
    const finalStatus: SyncStatus = isVerified ? 'VERIFIED' : (item.status || 'FETCH_BLOCKED');

    const existing = await PricingSourceModel.findOne({ providerId: item.providerId });
    const existingPlans = (existing?.plans as NormalizedPlan[]) ?? [];

    const priceChanged = isVerified && existingPlans.length > 0 && !plansAreEqual(existingPlans, item.plans);
    const isSuspicious = priceChanged ? isSuspiciousChange(existingPlans, item.plans) : false;
    const changeSummary = priceChanged ? diffPlans(existingPlans, item.plans) : undefined;

    if (priceChanged && !isSuspicious) {
      await PricingHistoryModel.create({
        providerId: item.providerId,
        changedAt: new Date(),
        previousPlans: existingPlans,
        newPlans: item.plans,
        changeSummary: changeSummary ?? 'Price update from official runner',
        syncRunId,
      });
    }

    // Ingest genuine offers with fingerprint deduplication if present
    if (item.offers && item.offers.length > 0) {
      for (const off of item.offers) {
        const fp = off.fingerprint || randomUUID();
        const existingEvent = await import('../services/dbService').then(m => m.NotificationEventModel.findOne({
          fingerprint: fp,
        }));
        if (!existingEvent) {
          await import('../services/dbService').then(m => m.NotificationEventModel.create({
            providerId: item.providerId,
            providerName: displayName,
            eventType: 'NEW_OFFER',
            fingerprint: fp,
            title: off.title,
            description: off.description,
            sourceUrl: off.sourceUrl || item.sourceUrl,
            detectedAt: new Date(),
            discount: typeof off.discount === 'number' ? `${off.discount}%` : String(off.discount || ''),
            discountType: 'PROMOTION',
          }));
        }
      }
    }


    const plansToStore = isVerified ? item.plans : (existingPlans.length > 0 ? existingPlans : item.plans);

    await PricingSourceModel.findOneAndUpdate(
      { providerId: item.providerId },
      {
        $set: {
          displayName,
          sourceUrl: item.sourceUrl,
          pricingUrl: item.sourceUrl,
          strategy: item.extractionStrategy,
          status: finalStatus,
          plans: plansToStore,
          lastCheckedAt: new Date(item.checkedAt || Date.now()),
          validationWarnings: validation.warnings,
          failureReason: isVerified ? undefined : (item.failureReason || 'Failed validation'),
          ...(isVerified ? {
            lastVerifiedAt: new Date(),
            lastSuccessfulCheckAt: new Date(),
            consecutiveFailures: 0,
          } : {
            $inc: { consecutiveFailures: 1 },
          }),
        },
      },
      { upsert: true, new: true }
    );

    providerSummaries.push({
      providerId: item.providerId,
      displayName,
      status: finalStatus,
      plansCount: plansToStore.length,
      strategy: item.extractionStrategy,
      priceChanged,
      changeSummary,
      isSuspicious,
      validationErrors: validation.errors,
      validationWarnings: validation.warnings,
      durationMs: 0,
      failureReason: isVerified ? undefined : item.failureReason,
    });
  }

  const completedAt = new Date();
  const successCount = providerSummaries.filter((p) => p.status === 'VERIFIED').length;
  const failureCount = providerSummaries.filter((p) => p.status !== 'VERIFIED' && p.status !== 'STALE').length;
  const staleCount = providerSummaries.filter((p) => p.status === 'STALE').length;
  const priceChangeCount = providerSummaries.filter((p) => p.priceChanged).length;

  await SyncLogModel.findOneAndUpdate(
    { syncRunId },
    {
      $set: {
        completedAt,
        providerResults: providerSummaries,
        totalProviders: providerSummaries.length,
        successCount,
        failureCount,
        staleCount,
        priceChangeCount,
      },
    }
  );

  if (successCount > 0) {
    PricingOverlayService.applyVerifiedPricing().catch((err) => {
      console.error('[PricingSync:Ingest] Post-ingest overlay failed:', err);
    });
  }

  return {
    syncRunId,
    startedAt,
    completedAt,
    triggeredBy,
    providers: providerSummaries,
    totalProviders: providerSummaries.length,
    successCount,
    failureCount,
    staleCount,
    priceChangeCount,
  };
}

