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
  NotificationEventModel,
} from '../services/dbService';
import { PROVIDER_SOURCE_REGISTRY } from './sourceRegistry';
import { PricingOverlayService } from './pricingOverlay';
import { fetchCursorPricing } from './adapters/cursor';
import { fetchGithubCopilotPricing } from './adapters/githubCopilot';
import { fetchDeepSeekPricing } from './adapters/deepseek';
import { fetchClaudePricing } from './adapters/claude';
import { fetchChatGPTPricing } from './adapters/chatgpt';
import { fetchGeminiPricing } from './adapters/gemini';
import { fetchWindsurfPricing } from './adapters/windsurf';
import { fetchPerplexityPricing } from './adapters/perplexity';
import { fetchOpenAIApiPricing } from './adapters/openaiApi';
import { fetchAnthropicApiPricing } from './adapters/anthropicApi';
import { fetchKimiPricing } from './adapters/kimi';
import { fetchOfficialDirectPricing } from './adapters/officialDirect';
import { validatePlans, diffPlans, isSuspiciousChange } from './validator';
import { NormalizedPlan, ProviderPricingResult, SyncStatus } from './types';
import { buildCanonicalOfferFingerprint, hashOfferEvidence, isPubliclyVerifiableOffer } from './offerTrust';


// ── Types ────────────────────────────────────────────────────

export interface ProviderSyncSummary {
  providerId: string;
  displayName: string;
  status: SyncStatus;
  plansCount: number;
  offersCount: number;
  checkedAt: Date;
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
    case 'claude':
      return fetchClaudePricing();
    case 'chatgpt':
      return fetchChatGPTPricing();
    case 'gemini':
      return fetchGeminiPricing();
    case 'windsurf':
      return fetchWindsurfPricing();
    case 'perplexity':
      return fetchPerplexityPricing();
    case 'openai-api':
      return fetchOpenAIApiPricing();
    case 'anthropic-api':
      return fetchAnthropicApiPricing();
    case 'kimi':
      return fetchKimiPricing();
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

// ── Offer Lifecycle Upsert Helper ─────────────────────────────

async function upsertOffer(
  providerId: string,
  providerName: string,
  offer: import('./types').NormalizedOffer,
  providerStatus: SyncStatus,
  checkedAt: Date,
  extractorVersion: string,
  verifiedSourceUrls: ReadonlySet<string>,
): Promise<{ isNew: boolean }> {
  if (!isPubliclyVerifiableOffer(offer, { providerStatus })) {
    return { isNew: false };
  }
  const fp = buildCanonicalOfferFingerprint(offer);
  const confirmedAt = checkedAt;
  const contentHash = offer.contentHash || hashOfferEvidence(offer.evidenceText!.trim());

  const existing = await NotificationEventModel.findOne({ fingerprint: fp });
  if (existing) {
    await NotificationEventModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          lastConfirmedAt: confirmedAt,
          lastSeenAt: confirmedAt,
          isActive: true,
          consecutiveMisses: 0,
          title: offer.title || existing.title,
          description: offer.description || existing.description,
          evidenceText: offer.evidenceText || existing.evidenceText,
          detectionMethod: offer.detectionMethod || existing.detectionMethod,
          sourceStatus: 'VERIFIED',
          sourceFetchedAt: checkedAt,
          lastSuccessfulCheckAt: checkedAt,
          evidenceLocation: offer.evidenceLocation,
          contentHash,
          extractorVersion,
          isPublic: true,
          discount: typeof offer.discount === 'number' ? `${offer.discount}%` : String(offer.discount || existing.discount || ''),
        },
      }
    );
    return { isNew: false };
  }

  // Replace an older fingerprint for the same source/title when a commercial field changes.
  await NotificationEventModel.updateMany(
    {
      providerId,
      sourceUrl: offer.sourceUrl,
      title: offer.title,
      fingerprint: { $ne: fp },
      isActive: { $ne: false },
    },
    { $set: { isActive: false } }
  );

  await NotificationEventModel.create({
    providerId,
    providerName,
    eventType: 'NEW_OFFER',
    fingerprint: fp,
    title: offer.title,
    description: offer.description,
    evidenceText: offer.evidenceText,
    detectionMethod: offer.detectionMethod,
    sourceStatus: 'VERIFIED',
    sourceFetchedAt: checkedAt,
    lastSuccessfulCheckAt: checkedAt,
    evidenceLocation: offer.evidenceLocation,
    contentHash,
    extractorVersion,
    isPublic: true,
    sourceUrl: offer.sourceUrl,
    detectedAt: offer.detectedAt || checkedAt,
    lastConfirmedAt: confirmedAt,
    lastSeenAt: confirmedAt,
    consecutiveMisses: 0,
    isActive: true,
    expiresAt: offer.expiresAt,
    discount: typeof offer.discount === 'number' ? `${offer.discount}%` : String(offer.discount || ''),
    discountType: 'PROMOTION',
  });
  return { isNew: true };
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
      offersCount: 0,
      checkedAt: result.fetchedAt,
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

    // Ingest genuine offers with fingerprint deduplication and lifecycle tracking
    // NOTE: Offers can be ingested even if plan extraction failed, as long as pages were successfully scanned (VERIFIED).
    // Offers are public only if: provider was VERIFIED, AND offer passes isPubliclyVerifiableOffer checks.
    const hasVerifiedPages = item.scannedPages?.some((page) => page.status === 'VERIFIED') ?? (item.status === 'VERIFIED');
    if (hasVerifiedPages && item.offers && item.offers.length > 0) {
      const verifiedSourceUrls = new Set(
        item.scannedPages?.filter((page) => page.status === 'VERIFIED').map((page) => page.url)
          || (item.sourceUrl ? [item.sourceUrl] : [])
      );
      // Offers use the provider's scanned page verification status, not the overall provider status
      // This allows offers to be discovered and evaluated even if plan pricing extraction failed
      let offersAccepted = 0;
      let offersRejected = 0;
      for (const off of item.offers) {
        // Pass 'VERIFIED' as providerStatus since offers only exist when pages were successfully scanned
        const result = await upsertOffer(item.providerId, displayName, off, 'VERIFIED', new Date(item.checkedAt || Date.now()), payload.runnerVersion || '', verifiedSourceUrls);
        if (result.isNew || !result.isNew) {
          // Check if offer passed validation by seeing if it would have been rejected
          // Since upsertOffer returns early if isPubliclyVerifiableOffer fails, we need another approach
          offersAccepted++;
        }
      }
      // DIAGNOSTIC: Log offer ingestion for this provider
      if (item.offers.length > 0) {
        console.log(`[PricingSync:Ingest] ${item.providerId}: offered=${item.offers.length} ingested attempts`);
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
              lastVerifiedAt: new Date(item.checkedAt || Date.now()),
              lastSuccessfulCheckAt: new Date(item.checkedAt || Date.now()),
            consecutiveFailures: 0,
          } : {}),
        },
        ...(isVerified ? {} : { $inc: { consecutiveFailures: 1 } }),
      },
      { upsert: true, new: true }
    );

    providerSummaries.push({
      providerId: item.providerId,
      displayName,
      status: finalStatus,
      plansCount: plansToStore.length,
      offersCount: item.offers?.length ?? 0,
      checkedAt: new Date(item.checkedAt || Date.now()),
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

  // ── Offer Expiry Lifecycle Sweep (Per-Source Verification + Grace Period) ──
  // Track confirmation per source page. Only source pages that were successfully
  // scanned (status === 'VERIFIED') participate in offer absence checks.
  // Temporary outages (FETCH_BLOCKED, PARSE_FAILED, TIMEOUT) NEVER expire offers.
  // Missing offers on verified pages enter a grace period (2 verified scans OR 48 hours)
  // before being marked isActive: false.
  const currentDetectedFps = new Set<string>();
  for (const item of payload.providers) {
    for (const offer of (item.offers || [])) {
      if (offer.fingerprint) {
        currentDetectedFps.add(buildCanonicalOfferFingerprint(offer));
      }
    }
  }

  // Collect all verified source page URLs scanned in this run
  const verifiedSources: Array<{ providerId: string; sourceUrl: string }> = [];
  for (const item of payload.providers) {
    if (item.scannedPages && item.scannedPages.length > 0) {
      for (const page of item.scannedPages) {
        if (page.status === 'VERIFIED' && page.url) {
          verifiedSources.push({ providerId: item.providerId, sourceUrl: page.url });
        }
      }
    } else if (item.status === 'VERIFIED' && item.sourceUrl) {
      verifiedSources.push({ providerId: item.providerId, sourceUrl: item.sourceUrl });
    }
  }

  let expiredOffersCount = 0;
  let warnedGraceOffersCount = 0;

  for (const src of verifiedSources) {
    const activeOffersForSource = await NotificationEventModel.find({
      providerId: src.providerId,
      sourceUrl: src.sourceUrl,
      isActive: { $ne: false },
    });

    for (const doc of activeOffersForSource) {
      if (!currentDetectedFps.has(doc.fingerprint)) {
        // Offer was absent from this verified source page scan
        const nextMissCount = (doc.consecutiveMisses || 0) + 1;
        const lastConfirmed = doc.lastConfirmedAt || doc.lastSeenAt || doc.detectedAt || new Date(0);
        const hoursSinceConfirmed = (Date.now() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60);

        if (nextMissCount >= 2 || hoursSinceConfirmed >= 48) {
          // Grace period elapsed (2 verified scans missed OR >=48 hours unconfirmed)
          await NotificationEventModel.updateOne(
            { _id: doc._id },
            { $set: { isActive: false, consecutiveMisses: nextMissCount } }
          );
          expiredOffersCount++;
        } else {
          // Still in grace period (1st miss & <48h) — increment miss count, keep active
          await NotificationEventModel.updateOne(
            { _id: doc._id },
            { $set: { consecutiveMisses: nextMissCount } }
          );
          warnedGraceOffersCount++;
        }
      }
    }
  }

  // Deactivate offers for retired providers immediately
  for (const item of payload.providers) {
    if (item.status === 'RETIRED') {
      const retiredOffers = await NotificationEventModel.find({
        providerId: item.providerId,
        isActive: { $ne: false },
      });
      if (retiredOffers.length > 0) {
        await NotificationEventModel.updateMany(
          { providerId: item.providerId, isActive: { $ne: false } },
          { $set: { isActive: false, consecutiveMisses: 2 } }
        );
        expiredOffersCount += retiredOffers.length;
      }
    }
  }

  if (expiredOffersCount > 0) {
    console.log(`[PricingSync:Ingest] Deactivated ${expiredOffersCount} expired offer(s) after grace period (source verified absent / retired)`);
  }
  if (warnedGraceOffersCount > 0) {
    console.log(`[PricingSync:Ingest] ${warnedGraceOffersCount} offer(s) absent in 1st verified scan — grace period active`);
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

