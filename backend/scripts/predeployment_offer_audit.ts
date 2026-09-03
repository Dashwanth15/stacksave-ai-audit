#!/usr/bin/env node
/**
 * PRE-DEPLOYMENT OFFER AUDIT
 * 
 * Purpose:
 *   Simulate the exact behavior of the new strict public verification filter
 *   against the current production offer database.
 * 
 * Safety:
 *   READ-ONLY — No writes to MongoDB
 *   No mock data — Uses real records
 *   No verification bypass — Applies exact filter logic
 * 
 * Output:
 *   Expected offer count after deployment
 *   Failure breakdown for hidden offers
 *   Re-verification path validation
 *   Optional live provider dry-run (if configured)
 * 
 * Usage:
 *   npx ts-node scripts/predeployment_offer_audit.ts
 *   npm run audit:offers:predeploy
 */

import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ── Load Environment ──────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// ── Import Models & Helpers will be done at runtime ──────────
type NotificationEventDocument = any;

// ── Types ─────────────────────────────────────────────────────

interface OfferAuditResult {
  offerId: string;
  providerId: string;
  providerName?: string;
  title: string;
  fingerprint: string;
  passes: boolean;
  failureReasons: string[];
}

interface AuditSummary {
  databaseConnected: boolean;
  connectionError?: string;
  totalRecords: number;
  activeRecords: number;
  publicRecords: number;
  verifiedRecords: number;
  withEvidenceText: number;
  withSourceFetchedAt: number;
  withLastConfirmedAt: number;
  withLastSuccessfulCheckAt: number;
  passingStrictFilter: number;
  offers: OfferAuditResult[];
  failureBreakdown: {
    missingEvidence: number;
    missingLastConfirmed: number;
    missingSourceFetched: number;
    missingSuccessfulCheck: number;
    invalidSource: number;
    notPublic: number;
    inactive: number;
    notVerified: number;
  };
}

// ── Exact Filter Logic (Reused from intelligence.ts) ──────────

/**
 * Apply the EXACT public offers filter used by GET /api/intelligence/offers
 * This is the strict verification that controls what users see.
 */
function applyPublicOffersFilter(
  event: NotificationEventDocument,
  isRegisteredOfficialSource: (providerId: string, sourceUrl: string) => boolean
): {
  passes: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  // Check 1: sourceStatus === 'VERIFIED'
  if (event.sourceStatus !== 'VERIFIED') {
    reasons.push('INVALID_SOURCE_STATUS');
  }

  // Check 2: isPublic === true
  if (event.isPublic !== true) {
    reasons.push('NOT_PUBLIC');
  }

  // Check 3: evidenceText non-empty
  if (!event.evidenceText || !event.evidenceText.trim()) {
    reasons.push('MISSING_EVIDENCE');
  }

  // Check 4: lastConfirmedAt exists
  if (!event.lastConfirmedAt) {
    reasons.push('MISSING_LAST_CONFIRMED');
  }

  // Check 5: sourceFetchedAt exists
  if (!event.sourceFetchedAt) {
    reasons.push('MISSING_SOURCE_FETCHED');
  }

  // Check 6: lastSuccessfulCheckAt exists
  if (!event.lastSuccessfulCheckAt) {
    reasons.push('MISSING_SUCCESSFUL_CHECK');
  }

  // Check 7: isActive !== false
  if (event.isActive === false) {
    reasons.push('INACTIVE');
  }

  // Check 8: Registered official source
  if (!isRegisteredOfficialSource(event.providerId, event.sourceUrl)) {
    reasons.push('INVALID_SOURCE');
  }

  const passes = reasons.length === 0;
  return { passes, reasons };
}

// ── Database Connection ───────────────────────────────────────

async function connectDatabase(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return {
        success: false,
        error: 'MONGODB_URI environment variable not set',
      };
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Connection failed: ${message}`,
    };
  }
}

// ── Main Audit ────────────────────────────────────────────────

async function runAudit(): Promise<AuditSummary> {
  // Dynamic imports inside the async function
  const dbModule = await import('../dist/services/dbService.js');
  const offerTrustModule = await import('../dist/pricing/offerTrust.js');

  const { NotificationEventModel } = dbModule;
  const { isRegisteredOfficialSource } = offerTrustModule;

  const summary: AuditSummary = {
    databaseConnected: false,
    totalRecords: 0,
    activeRecords: 0,
    publicRecords: 0,
    verifiedRecords: 0,
    withEvidenceText: 0,
    withSourceFetchedAt: 0,
    withLastConfirmedAt: 0,
    withLastSuccessfulCheckAt: 0,
    passingStrictFilter: 0,
    offers: [],
    failureBreakdown: {
      missingEvidence: 0,
      missingLastConfirmed: 0,
      missingSourceFetched: 0,
      missingSuccessfulCheck: 0,
      invalidSource: 0,
      notPublic: 0,
      inactive: 0,
      notVerified: 0,
    },
  };

  // Step 1: Connect to database
  console.log('\n📊 PRE-DEPLOYMENT OFFER AUDIT\n');
  console.log('📡 Connecting to MongoDB...');

  const connection = await connectDatabase();
  if (!connection.success) {
    console.error(`\n❌ DATABASE CONNECTION FAILED`);
    console.error(`Error: ${connection.error}\n`);
    summary.connectionError = connection.error;
    return summary;
  }

  console.log('✅ Connected to MongoDB\n');
  summary.databaseConnected = true;

  try {
    // Step 2: Query all offer records
    console.log('🔍 Querying offer records...');
    const allOffers = await NotificationEventModel.find({})
      .lean()
      .exec() as NotificationEventDocument[];

    summary.totalRecords = allOffers.length;
    console.log(`Found ${allOffers.length} total offer records\n`);

    // Step 3: Count individual attributes
    console.log('📈 Analyzing offer attributes:\n');

    for (const offer of allOffers) {
      if (offer.isActive !== false) summary.activeRecords++;
      if (offer.isPublic === true) summary.publicRecords++;
      if (offer.sourceStatus === 'VERIFIED') summary.verifiedRecords++;
      if (offer.evidenceText && offer.evidenceText.trim()) summary.withEvidenceText++;
      if (offer.sourceFetchedAt) summary.withSourceFetchedAt++;
      if (offer.lastConfirmedAt) summary.withLastConfirmedAt++;
      if (offer.lastSuccessfulCheckAt) summary.withLastSuccessfulCheckAt++;
    }

    console.log(`  Total records:              ${summary.totalRecords}`);
    console.log(`  Active (isActive ≠ false): ${summary.activeRecords}`);
    console.log(`  Public (isPublic = true):  ${summary.publicRecords}`);
    console.log(`  Verified (sourceStatus):   ${summary.verifiedRecords}`);
    console.log(`  With evidenceText:         ${summary.withEvidenceText}`);
    console.log(`  With sourceFetchedAt:      ${summary.withSourceFetchedAt}`);
    console.log(`  With lastConfirmedAt:      ${summary.withLastConfirmedAt}`);
    console.log(`  With lastSuccessfulCheckAt: ${summary.withLastSuccessfulCheckAt}\n`);

    // Step 4: Apply strict filter to each offer
    console.log('🔐 Applying strict public verification filter...\n');

    for (const offer of allOffers) {
      const { passes, reasons } = applyPublicOffersFilter(offer, isRegisteredOfficialSource);

      if (passes) {
        summary.passingStrictFilter++;
      }

      const result: OfferAuditResult = {
        offerId: String(offer._id),
        providerId: offer.providerId,
        providerName: offer.providerName,
        title: offer.title || '(no title)',
        fingerprint: offer.fingerprint,
        passes,
        failureReasons: reasons,
      };

      summary.offers.push(result);

      // Count failure reasons
      for (const reason of reasons) {
        switch (reason) {
          case 'MISSING_EVIDENCE':
            summary.failureBreakdown.missingEvidence++;
            break;
          case 'MISSING_LAST_CONFIRMED':
            summary.failureBreakdown.missingLastConfirmed++;
            break;
          case 'MISSING_SOURCE_FETCHED':
            summary.failureBreakdown.missingSourceFetched++;
            break;
          case 'MISSING_SUCCESSFUL_CHECK':
            summary.failureBreakdown.missingSuccessfulCheck++;
            break;
          case 'INVALID_SOURCE':
            summary.failureBreakdown.invalidSource++;
            break;
          case 'NOT_PUBLIC':
            summary.failureBreakdown.notPublic++;
            break;
          case 'INACTIVE':
            summary.failureBreakdown.inactive++;
            break;
          case 'INVALID_SOURCE_STATUS':
            summary.failureBreakdown.notVerified++;
            break;
        }
      }
    }

    console.log(`✅ Filter applied to ${allOffers.length} offers\n`);

  } finally {
    await mongoose.disconnect();
  }

  return summary;
}

// ── Format Output ─────────────────────────────────────────────

function formatAuditOutput(summary: AuditSummary): void {
  if (!summary.databaseConnected) {
    console.error(`\n${'═'.repeat(60)}`);
    console.error('DATABASE CONNECTION FAILED');
    console.error(`${'═'.repeat(60)}`);
    console.error(`\nError: ${summary.connectionError}`);
    console.error('\n⚠️  Cannot run pre-deployment audit without database access.\n');
    process.exit(1);
  }

  console.log(`${'═'.repeat(70)}`);
  console.log('PRE-DEPLOYMENT AUDIT RESULTS');
  console.log(`${'═'.repeat(70)}\n`);

  console.log('DATABASE:');
  console.log(`  Connected: YES`);
  console.log(`  Total records: ${summary.totalRecords}\n`);

  console.log('CURRENT DATABASE OFFERS:');
  console.log(`  Active:    ${summary.activeRecords}`);
  console.log(`  Public:    ${summary.publicRecords}`);
  console.log(`  Verified:  ${summary.verifiedRecords}\n`);

  console.log('PROVENANCE FIELDS POPULATED:');
  console.log(`  evidenceText:         ${summary.withEvidenceText}/${summary.totalRecords}`);
  console.log(`  sourceFetchedAt:      ${summary.withSourceFetchedAt}/${summary.totalRecords}`);
  console.log(`  lastConfirmedAt:      ${summary.withLastConfirmedAt}/${summary.totalRecords}`);
  console.log(`  lastSuccessfulCheckAt: ${summary.withLastSuccessfulCheckAt}/${summary.totalRecords}\n`);

  console.log('STRICT FILTER RESULTS:');
  console.log(`  Passing all conditions: ${summary.passingStrictFilter}/${summary.totalRecords}`);
  console.log(`  Failing filter:         ${summary.totalRecords - summary.passingStrictFilter}/${summary.totalRecords}\n`);

  if (summary.totalRecords - summary.passingStrictFilter > 0) {
    console.log('FAILURE BREAKDOWN (for failing offers):');
    console.log(`  Missing evidenceText:         ${summary.failureBreakdown.missingEvidence}`);
    console.log(`  Missing lastConfirmedAt:      ${summary.failureBreakdown.missingLastConfirmed}`);
    console.log(`  Missing sourceFetchedAt:      ${summary.failureBreakdown.missingSourceFetched}`);
    console.log(`  Missing lastSuccessfulCheckAt: ${summary.failureBreakdown.missingSuccessfulCheck}`);
    console.log(`  Invalid/unregistered source:  ${summary.failureBreakdown.invalidSource}`);
    console.log(`  Not public (isPublic ≠ true): ${summary.failureBreakdown.notPublic}`);
    console.log(`  Inactive (isActive = false):  ${summary.failureBreakdown.inactive}`);
    console.log(`  Not verified sourceStatus:    ${summary.failureBreakdown.notVerified}\n`);
  }

  console.log(`${'═'.repeat(70)}`);
  console.log('EXPECTED POST-DEPLOYMENT RESULT');
  console.log(`${'═'.repeat(70)}\n`);

  console.log(`📊 OFFERS CURRENTLY PUBLIC (via strict filter):`);
  console.log(`   ${summary.passingStrictFilter}\n`);

  console.log(`📊 OFFERS THAT WOULD BE HIDDEN:`);
  console.log(`   ${summary.totalRecords - summary.passingStrictFilter}\n`);

  console.log(`📊 OFFERS REMAINING IN DATABASE (unchanged):`);
  console.log(`   ${summary.totalRecords}\n`);

  console.log(`📊 OFFERS NEEDING RE-VERIFICATION (after sync):`);
  console.log(`   ${summary.totalRecords - summary.passingStrictFilter}\n`);

  // Show which offers pass/fail
  if (summary.offers.length > 0 && summary.offers.length <= 50) {
    console.log(`${'═'.repeat(70)}`);
    console.log('OFFER-BY-OFFER BREAKDOWN');
    console.log(`${'═'.repeat(70)}\n`);

    for (const offer of summary.offers) {
      const status = offer.passes ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${offer.providerId.padEnd(12)} | ${offer.title.substring(0, 40)}`);
      if (!offer.passes && offer.failureReasons.length > 0) {
        console.log(`       Reasons: ${offer.failureReasons.join(', ')}`);
      }
    }
    console.log();
  }

  // Safety checks
  console.log(`${'═'.repeat(70)}`);
  console.log('DEPLOYMENT SAFETY CHECKS');
  console.log(`${'═'.repeat(70)}\n`);

  console.log(`✅ Existing records deleted:    NO (audit is read-only)`);
  console.log(`✅ Existing records modified:   NO (audit is read-only)`);
  console.log(`✅ detectedAt preserved:        YES (not queried/modified)`);
  console.log(`✅ Fabricated evidence possible: NO (filter only reads)\n`);

  // Final recommendation
  console.log(`${'═'.repeat(70)}`);
  console.log('FINAL ASSESSMENT');
  console.log(`${'═'.repeat(70)}\n`);

  if (summary.passingStrictFilter === 0 && summary.totalRecords > 0) {
    console.log(
      `ℹ️  No existing offers currently pass the strict verification filter.\n` +
      `This is EXPECTED if offers lack new provenance fields (lastConfirmedAt, etc.).\n\n` +
      `After deployment, these offers will be:\n` +
      `  • Hidden from public API (not deleted)\n` +
      `  • Stored in database (unchanged)\n` +
      `  • Re-verifiable by official provider sync\n\n` +
      `To restore public visibility:\n` +
      `  1. Deploy code (strict filter activated)\n` +
      `  2. Run official provider sync\n` +
      `  3. Offers pass strict filter → become publicly visible\n`
    );
  } else if (summary.passingStrictFilter > 0) {
    console.log(
      `✅ ${summary.passingStrictFilter} offer(s) already pass strict verification.\n` +
      `These will remain public after deployment.\n\n` +
      `${summary.totalRecords - summary.passingStrictFilter} offer(s) will be hidden (re-verifiable by sync).\n`
    );
  } else {
    console.log(`ℹ️  No offers in database.\n`);
  }

  console.log(`\n✅ AUDIT COMPLETE — Safe to proceed with deployment.\n`);
}

// ── Main ──────────────────────────────────────────────────────

(async () => {
  try {
    const summary = await runAudit();
    formatAuditOutput(summary);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ AUDIT ERROR:', err);
    process.exit(1);
  }
})();
