#!/usr/bin/env node
/**
 * PRICING SYNC DRY-RUN (Read-Only Test)
 * 
 * Purpose:
 *   Simulate the production pricing sync with real Playwright extraction
 *   WITHOUT modifying MongoDB.
 * 
 * Process:
 *   1. Run official_pricing_extractor with real Playwright/Chromium
 *   2. Get extraction payload (fresh offers, evidence, fingerprints)
 *   3. Read existing 26 MongoDB offers (READ-ONLY)
 *   4. Simulate matching in memory
 *   5. Apply strict public verification filter
 *   6. Report recovery analysis
 *   7. NO database writes at any point
 * 
 * Output:
 *   - Console: Detailed analysis
 *   - File: dryrun-report.json
 * 
 * Safety:
 *   - Does NOT call ingestOfficialExtractedPricing()
 *   - Does NOT write to MongoDB
 *   - Does NOT modify any data
 *   - Read-only access to database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// ── Types ──────────────────────────────────────────────────

interface DryRunReport {
  timestamp: string;
  environment: 'github_actions' | 'local';
  currentDatabase: {
    totalOffers: number;
    passingStrictFilter: number;
    failingStrictFilter: number;
    byProvider: Record<string, { total: number; passing: number; failing: number }>;
  };
  providerExtraction: Array<{
    provider: string;
    sourceUrl: string;
    extractionStrategy: string;
    browserRequired: boolean;
    fetchStatus: 'SUCCESS' | 'BLOCKED' | 'TIMEOUT' | 'ERROR';
    fetchStatusCode?: number;
    extractionStatus: 'SUCCESS' | 'PARSE_FAILED' | 'NO_OFFERS' | 'ERROR';
    offersExtracted: number;
    offersWithEvidence: number;
    offersWithProvenance: number;
    errors?: string[];
  }>;
  freshData: {
    totalOffersExtracted: number;
    offersWithEvidence: number;
    offersWithCompleteProvenance: number;
    byProvider: Record<string, { extracted: number; evidence: number; provenance: number }>;
  };
  existingOfferMatching: {
    totalExisting: number;
    matchedToFresh: number;
    notMatched: number;
    matchedAndValid: number;
    matchedButInvalid: number;
    details: Array<{
      provider: string;
      title: string;
      fingerprint: string;
      matchStatus: 'MATCHED' | 'NOT_MATCHED';
      freshFingerprint?: string;
      hasEvidence: boolean;
      hasSourceUrl: boolean;
      hasValidTimestamps: boolean;
      wouldPassStrictFilter: boolean;
      reason: string;
    }>;
  };
  simulatedPostSync: {
    existingThatWouldPass: number;
    existingThatWouldRemainHidden: number;
    newThatWouldPass: number;
    projectedTotalPublic: number;
  };
  verdict: 'PRODUCTION_RECOVERY_VERIFIED' | 'PRODUCTION_RECOVERY_NOT_VERIFIED';
  verdictReason: string;
}

// ── Strict Filter Check ────────────────────────────────────

function passesStrictFilter(offer: any): boolean {
  const hasSourceStatus = offer.sourceStatus === 'VERIFIED';
  const isPublic = offer.isPublic === true;
  const hasEvidence = !!(offer.evidenceText && offer.evidenceText.trim());
  const hasLastConfirmed = !!(offer.lastConfirmedAt && new Date(offer.lastConfirmedAt).getTime() > 0);
  const hasLastSuccessfulCheck = !!(offer.lastSuccessfulCheckAt && new Date(offer.lastSuccessfulCheckAt).getTime() > 0);
  const hasSourceFetched = !!(offer.sourceFetchedAt && new Date(offer.sourceFetchedAt).getTime() > 0);
  const hasRegisteredSource = !!(offer.providerId && offer.sourceUrl);

  return (
    hasSourceStatus &&
    isPublic &&
    hasEvidence &&
    hasLastConfirmed &&
    hasLastSuccessfulCheck &&
    hasSourceFetched &&
    hasRegisteredSource
  );
}

// ── Main ───────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║         PRICING SYNC DRY-RUN (Read-Only Test)                   ║');
  console.log('║  Real Playwright Extraction + In-Memory Simulation              ║');
  console.log('║  NO DATABASE MODIFICATIONS                                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const report: DryRunReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.CI === 'true' ? 'github_actions' : 'local',
    currentDatabase: {
      totalOffers: 0,
      passingStrictFilter: 0,
      failingStrictFilter: 0,
      byProvider: {},
    },
    providerExtraction: [],
    freshData: {
      totalOffersExtracted: 0,
      offersWithEvidence: 0,
      offersWithCompleteProvenance: 0,
      byProvider: {},
    },
    existingOfferMatching: {
      totalExisting: 0,
      matchedToFresh: 0,
      notMatched: 0,
      matchedAndValid: 0,
      matchedButInvalid: 0,
      details: [],
    },
    simulatedPostSync: {
      existingThatWouldPass: 0,
      existingThatWouldRemainHidden: 0,
      newThatWouldPass: 0,
      projectedTotalPublic: 0,
    },
    verdict: 'PRODUCTION_RECOVERY_NOT_VERIFIED',
    verdictReason: 'Initial state',
  };

  try {
    // ── Step 1: Load existing offers from MongoDB (READ-ONLY) ──
    console.log('STEP 1: Reading existing MongoDB offers (READ-ONLY)...\n');

    let existingOffers: any[] = [];
    let mongoConnected = false;

    try {
      const mongoose = await import('mongoose');
      const { NotificationEventModel } = await import('../src/services/dbService');

      if (mongoose.default.connection.readyState === 0) {
        await mongoose.default.connect(process.env.MONGODB_URI || '');
      }
      mongoConnected = true;

      existingOffers = await NotificationEventModel.find({}).lean();
      console.log(`✅ Read ${existingOffers.length} existing offers from MongoDB`);

      report.currentDatabase.totalOffers = existingOffers.length;
      report.currentDatabase.byProvider = {};

      for (const offer of existingOffers) {
        const provider = offer.providerId || 'unknown';
        if (!report.currentDatabase.byProvider[provider]) {
          report.currentDatabase.byProvider[provider] = { total: 0, passing: 0, failing: 0 };
        }
        report.currentDatabase.byProvider[provider].total++;

        if (passesStrictFilter(offer)) {
          report.currentDatabase.passingStrictFilter++;
          report.currentDatabase.byProvider[provider].passing++;
        } else {
          report.currentDatabase.failingStrictFilter++;
          report.currentDatabase.byProvider[provider].failing++;
        }
      }

      console.log(`   Passing strict filter: ${report.currentDatabase.passingStrictFilter}`);
      console.log(`   Failing strict filter: ${report.currentDatabase.failingStrictFilter}`);
      console.log(`   By provider:\n`);
      for (const [provider, counts] of Object.entries(report.currentDatabase.byProvider)) {
        console.log(`     ${provider}: ${(counts as any).total} total (${(counts as any).passing} pass)`);
      }

      await mongoose.default.disconnect();
    } catch (err) {
      console.warn('⚠️  MongoDB connection failed. Proceeding with dry-run (no existing offers to match)');
      console.warn(`   Error: ${err instanceof Error ? err.message : String(err)}\n`);
      report.currentDatabase.totalOffers = 0;
    }

    // ── Step 2: Run real Playwright extraction ──
    console.log('\nSTEP 2: Running real Playwright provider extraction...\n');

    let extractionPayload: any = null;
    try {
      const { runOfficialExtraction } = await import('./official_pricing_extractor');
      extractionPayload = await runOfficialExtraction();

      console.log(`✅ Extraction completed: ${extractionPayload.providers.length} providers`);

      // Analyze extraction results
      for (const provider of extractionPayload.providers) {
        report.providerExtraction.push({
          provider: provider.displayName || provider.providerId,
          sourceUrl: provider.sourceUrl,
          extractionStrategy: provider.extractionStrategy,
          browserRequired: ['Playwright', 'Browser'].some((s) =>
            provider.extractionStrategy?.includes(s)
          ),
          fetchStatus: provider.status === 'VERIFIED' ? 'SUCCESS' : (provider.status || 'ERROR'),
          extractionStatus: provider.offers && provider.offers.length > 0 ? 'SUCCESS' : 'NO_OFFERS',
          offersExtracted: provider.offers?.length || 0,
          offersWithEvidence: provider.offers?.filter((o: any) => o.evidenceText)?.length || 0,
          offersWithProvenance: provider.offers?.filter(
            (o: any) =>
              o.sourceFetchedAt &&
              o.lastConfirmedAt &&
              o.lastSuccessfulCheckAt
          )?.length || 0,
          errors: provider.failureReason ? [provider.failureReason] : undefined,
        });

        const providerName = provider.displayName || provider.providerId;
        if (!report.freshData.byProvider[providerName]) {
          report.freshData.byProvider[providerName] = { extracted: 0, evidence: 0, provenance: 0 };
        }
        report.freshData.byProvider[providerName].extracted += provider.offers?.length || 0;
        report.freshData.byProvider[providerName].evidence += provider.offers?.filter(
          (o: any) => o.evidenceText
        )?.length || 0;
        report.freshData.byProvider[providerName].provenance += provider.offers?.filter(
          (o: any) =>
            o.sourceFetchedAt &&
            o.lastConfirmedAt &&
            o.lastSuccessfulCheckAt
        )?.length || 0;

        report.freshData.totalOffersExtracted += provider.offers?.length || 0;
        report.freshData.offersWithEvidence += provider.offers?.filter(
          (o: any) => o.evidenceText
        )?.length || 0;
        report.freshData.offersWithCompleteProvenance += provider.offers?.filter(
          (o: any) =>
            o.sourceFetchedAt &&
            o.lastConfirmedAt &&
            o.lastSuccessfulCheckAt
        )?.length || 0;
      }
    } catch (err) {
      console.error('❌ Extraction failed:', err instanceof Error ? err.message : String(err));
      report.verdictReason = `Extraction failed: ${err instanceof Error ? err.message : String(err)}`;
      report.verdict = 'PRODUCTION_RECOVERY_NOT_VERIFIED';
    }

    // ── Step 3: Match existing offers against fresh extraction ──
    console.log('\nSTEP 3: Matching existing offers against fresh extraction...\n');

    if (mongoConnected && existingOffers.length > 0 && extractionPayload?.providers?.length > 0) {
      report.existingOfferMatching.totalExisting = existingOffers.length;

      const freshFingerprints = new Map<string, any>();
      for (const provider of extractionPayload.providers) {
        for (const offer of provider.offers || []) {
          if (offer.fingerprint) {
            freshFingerprints.set(offer.fingerprint, offer);
          }
        }
      }

      for (const existing of existingOffers) {
        const fingerprint = existing.fingerprint;
        const isFreshMatch = fingerprint && freshFingerprints.has(fingerprint);

        if (isFreshMatch) {
          report.existingOfferMatching.matchedToFresh++;
          const freshOffer = freshFingerprints.get(fingerprint);

          const hasEvidence = !!(freshOffer.evidenceText && freshOffer.evidenceText.trim());
          const hasSourceUrl = !!(freshOffer.sourceUrl);
          const hasValidTimestamps =
            freshOffer.sourceFetchedAt &&
            freshOffer.lastConfirmedAt &&
            freshOffer.lastSuccessfulCheckAt;

          const wouldPass =
            freshOffer.sourceStatus === 'VERIFIED' &&
            hasEvidence &&
            hasSourceUrl &&
            hasValidTimestamps;

          if (wouldPass) {
            report.existingOfferMatching.matchedAndValid++;
            report.simulatedPostSync.existingThatWouldPass++;
          } else {
            report.existingOfferMatching.matchedButInvalid++;
            report.simulatedPostSync.existingThatWouldRemainHidden++;
          }

          report.existingOfferMatching.details.push({
            provider: existing.providerId,
            title: existing.title,
            fingerprint: fingerprint || 'unknown',
            matchStatus: 'MATCHED',
            freshFingerprint: freshOffer.fingerprint,
            hasEvidence,
            hasSourceUrl,
            hasValidTimestamps,
            wouldPassStrictFilter: wouldPass,
            reason: wouldPass
              ? 'Fresh extraction has all required fields'
              : 'Fresh extraction missing evidence or timestamps',
          });
        } else {
          report.existingOfferMatching.notMatched++;
          report.simulatedPostSync.existingThatWouldRemainHidden++;

          report.existingOfferMatching.details.push({
            provider: existing.providerId,
            title: existing.title,
            fingerprint: fingerprint || 'unknown',
            matchStatus: 'NOT_MATCHED',
            hasEvidence: false,
            hasSourceUrl: false,
            hasValidTimestamps: false,
            wouldPassStrictFilter: false,
            reason: 'No matching fresh extraction found (provider not verified or offer removed)',
          });
        }
      }

      console.log(`   Matched to fresh extraction: ${report.existingOfferMatching.matchedToFresh}`);
      console.log(`   Not matched: ${report.existingOfferMatching.notMatched}`);
      console.log(`   Matched and would pass strict filter: ${report.existingOfferMatching.matchedAndValid}`);
      console.log(`   Matched but would still fail: ${report.existingOfferMatching.matchedButInvalid}`);
    } else {
      report.existingOfferMatching.totalExisting = existingOffers.length;
      report.existingOfferMatching.notMatched = existingOffers.length;
      console.log('   ⚠️  Skipping match analysis (no MongoDB connection or no extraction results)');
    }

    // ── Step 4: Calculate new offers ──
    const newOffersExtracted = extractionPayload?.providers?.reduce(
      (sum: number, p: any) => sum + (p.offers?.length || 0),
      0
    ) || 0;
    const newOffersPassing = extractionPayload?.providers?.reduce(
      (sum: number, p: any) =>
        sum +
        (p.offers?.filter(
          (o: any) =>
            o.sourceStatus === 'VERIFIED' &&
            o.evidenceText &&
            o.sourceFetchedAt &&
            o.lastConfirmedAt &&
            o.lastSuccessfulCheckAt
        )?.length || 0),
      0
    ) || 0;

    // Subtract existing offers from new count (they're "new" if they weren't in DB before)
    const genuinelyNewPassing = Math.max(0, newOffersPassing - report.existingOfferMatching.matchedAndValid);
    report.simulatedPostSync.newThatWouldPass = genuinelyNewPassing;

    // ── Step 5: Final verdict ──
    console.log('\nSTEP 4: Computing final verdict...\n');

    report.simulatedPostSync.projectedTotalPublic =
      report.simulatedPostSync.existingThatWouldPass +
      report.simulatedPostSync.newThatWouldPass;

    const existingWouldRecover =
      report.currentDatabase.totalOffers > 0 &&
      report.existingOfferMatching.matchedToFresh > 0;
    const extractionSuccessful = report.freshData.totalOffersExtracted > 0;

    if (existingWouldRecover && extractionSuccessful) {
      report.verdict = 'PRODUCTION_RECOVERY_VERIFIED';
      report.verdictReason = `Fresh extraction successful (${report.freshData.totalOffersExtracted} offers). Existing offers can be recovered: ${report.existingOfferMatching.matchedToFresh}/${report.currentDatabase.totalOffers}. Post-sync: ${report.simulatedPostSync.projectedTotalPublic} public offers.`;
    } else if (!extractionSuccessful) {
      report.verdict = 'PRODUCTION_RECOVERY_NOT_VERIFIED';
      report.verdictReason = `Fresh extraction failed or produced no offers. Cannot verify recovery.`;
    } else if (!existingWouldRecover) {
      report.verdict = 'PRODUCTION_RECOVERY_NOT_VERIFIED';
      report.verdictReason = `No existing offers matched to fresh extraction. All ${report.currentDatabase.totalOffers} offers would remain hidden.`;
    }

    // ── Output Report ──
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              PRICING SYNC DRY-RUN RESULTS                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('CURRENT DATABASE');
    console.log('─'.repeat(70));
    console.log(`Total offers: ${report.currentDatabase.totalOffers}`);
    console.log(`Currently passing strict filter: ${report.currentDatabase.passingStrictFilter}`);
    console.log(`Currently failing strict filter: ${report.currentDatabase.failingStrictFilter}\n`);

    console.log('PROVIDER EXTRACTION');
    console.log('─'.repeat(70));
    console.log(`Provider${' '.repeat(15)} | Fetch | Browser | Extraction | Offers | Evidence`);
    console.log('-'.repeat(70));
    for (const p of report.providerExtraction) {
      const name = (p.provider || 'Unknown').padEnd(16);
      const fetch = p.fetchStatus.padEnd(7);
      const browser = (p.browserRequired ? 'YES' : 'NO').padEnd(8);
      const extraction = p.extractionStatus.padEnd(11);
      const offers = String(p.offersExtracted).padEnd(7);
      const evidence = String(p.offersWithEvidence).padEnd(8);
      console.log(`${name}| ${fetch}| ${browser}| ${extraction}| ${offers}| ${evidence}`);
    }
    console.log();

    console.log('FRESH DATA');
    console.log('─'.repeat(70));
    console.log(`Total offers extracted: ${report.freshData.totalOffersExtracted}`);
    console.log(`Offers with evidenceText: ${report.freshData.offersWithEvidence}`);
    console.log(`Offers with complete provenance: ${report.freshData.offersWithCompleteProvenance}\n`);

    console.log('EXISTING OFFER MATCHING');
    console.log('─'.repeat(70));
    console.log(`Existing offers: ${report.existingOfferMatching.totalExisting}`);
    console.log(`Matched to fresh extraction: ${report.existingOfferMatching.matchedToFresh}`);
    console.log(`Not matched: ${report.existingOfferMatching.notMatched}`);
    console.log(`Matched and would pass strict filter: ${report.existingOfferMatching.matchedAndValid}`);
    console.log(`Matched but would fail strict filter: ${report.existingOfferMatching.matchedButInvalid}\n`);

    if (process.env.VERBOSE === 'true' && report.existingOfferMatching.details.length > 0) {
      console.log('EXISTING OFFER DETAILS');
      console.log('─'.repeat(70));
      for (const detail of report.existingOfferMatching.details) {
        console.log(`\n  ${detail.provider} / ${detail.title}`);
        console.log(`    Fingerprint: ${detail.fingerprint}`);
        console.log(`    Match Status: ${detail.matchStatus}`);
        console.log(`    Would Pass Strict Filter: ${detail.wouldPassStrictFilter ? 'YES' : 'NO'}`);
        console.log(`    Reason: ${detail.reason}`);
      }
      console.log();
    }

    console.log('SIMULATED POST-SYNC');
    console.log('─'.repeat(70));
    console.log(`Existing offers that would pass strict filter: ${report.simulatedPostSync.existingThatWouldPass}`);
    console.log(`Existing offers that would remain hidden: ${report.simulatedPostSync.existingThatWouldRemainHidden}`);
    console.log(`New offers that would pass strict filter: ${report.simulatedPostSync.newThatWouldPass}`);
    console.log(`PROJECTED TOTAL PUBLIC OFFERS: ${report.simulatedPostSync.projectedTotalPublic}\n`);

    console.log('═'.repeat(70));
    console.log(`\n✨ VERDICT: ${report.verdict}`);
    console.log(`Reason: ${report.verdictReason}\n`);
    console.log('═'.repeat(70));

    if (
      report.verdict === 'PRODUCTION_RECOVERY_VERIFIED' &&
      report.existingOfferMatching.matchedToFresh > 0
    ) {
      console.log(
        '\n✅ SAFE TO DEPLOY\n' +
          'Production extraction verified. Existing offers can be recovered.\n' +
          `${report.existingOfferMatching.matchedToFresh} of ${report.currentDatabase.totalOffers} existing offers ` +
          `matched to fresh extraction.\n` +
          `${report.simulatedPostSync.projectedTotalPublic} offers would become public after sync.\n`
      );
    } else {
      console.log(
        '\n❌ DEPLOYMENT BLOCKED\n' +
          'Production extraction NOT verified or offers cannot be recovered.\n' +
          'Review the details above before deploying.\n'
      );
    }

    // ── Write report to file ──
    const reportPath = path.resolve(__dirname, '..', 'dryrun-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: dryrun-report.json\n`);

    process.exit(report.verdict === 'PRODUCTION_RECOVERY_VERIFIED' ? 0 : 1);
  } catch (err) {
    console.error('\n❌ Fatal error during dry-run:', err);
    report.verdict = 'PRODUCTION_RECOVERY_NOT_VERIFIED';
    report.verdictReason = `Fatal error: ${err instanceof Error ? err.message : String(err)}`;
    const reportPath = path.resolve(__dirname, '..', 'dryrun-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    process.exit(1);
  }
}

main();
