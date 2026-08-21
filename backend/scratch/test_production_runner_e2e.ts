import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/services/dbService';
import { runOfficialExtraction } from '../scripts/official_pricing_extractor';
import { ingestOfficialExtractedPricing } from '../src/pricing/syncOrchestrator';
import { PricingOverlayService } from '../src/pricing/pricingOverlay';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { PricingSourceModel, NotificationEventModel } from '../src/services/dbService';

async function main() {
  console.log('========================================================================================');
  console.log('STACKSAVE AI AUDIT — FULL PRODUCTION WORKFLOW E2E EXECUTION (PLAYWRIGHT + INGESTION)');
  console.log('========================================================================================\n');

  await connectDB();

  // 1. Run Official Extraction
  console.log('1. RUNNING OFFICIAL PLAYWRIGHT & FAST STATIC EXTRACTION...');
  const payload = await runOfficialExtraction();
  console.log(`   ✓ Extracted data for ${payload.providers.length} providers.\n`);

  // 2. Ingest through Backend Validation & Persistence Layer
  console.log('2. INGESTING THROUGH AUTHENTICATED BACKEND VALIDATION & MONGO PIPELINE...');
  const ingestResult = await ingestOfficialExtractedPricing(payload, 'production_e2e_verification');
  console.log(`   ✓ Ingest Run ID: ${ingestResult.syncRunId}`);
  console.log(`   ✓ Verified Count: ${ingestResult.successCount} / ${ingestResult.totalProviders}`);
  console.log(`   ✓ Price Changes Recorded: ${ingestResult.priceChangeCount}\n`);

  // 3. Verify PricingOverlayService & KnowledgeLoader
  console.log('3. VERIFYING PRICING OVERLAY & KNOWLEDGE BASE PROPAGATION...');
  const overlayStatus = await PricingOverlayService.applyVerifiedPricing();
  console.log(`   ✓ Overlay Applied: ${overlayStatus.appliedCount} providers patched in KnowledgeLoader\n`);

  // 4. Verify Offers Recorded in NotificationEventModel
  console.log('4. VERIFYING PUBLIC OFFER DETECTION IN DATABASE...');
  const offersInDb = await NotificationEventModel.find({ eventType: 'OFFER_DETECTED' }).lean();
  console.log(`   ✓ Total Genuine Public Promotions in DB: ${offersInDb.length}`);
  for (const off of offersInDb.slice(0, 5)) {
    console.log(`     - [${off.providerName}] ${off.title} (${off.discount || 'Special'})`);
  }
  console.log();

  // 5. Query Final DB State for all 13 Providers
  console.log('================================================================================================================================================');
  console.log('FINAL 13-PROVIDER PRODUCTION EXECUTION MATRIX');
  console.log('================================================================================================================================================');
  console.log(
    'Provider'.padEnd(16) +
    'Method'.padEnd(18) +
    'Plans'.padEnd(8) +
    'Offers'.padEnd(8) +
    'Status'.padEnd(14) +
    'Authority Category'.padEnd(38) +
    'Overlay Status'
  );
  console.log(''.padEnd(144, '-'));

  const dbSources = await PricingSourceModel.find().lean();

  for (const p of payload.providers) {
    const dbRecord = dbSources.find((s) => s.providerId === p.providerId);
    const overlayRecord = overlayStatus.results.find((r) => r.providerId === p.providerId);

    const overlayStr = overlayRecord ? `${overlayRecord.status} (${overlayRecord.plansPatched} plans)` : 'STATIC_FLOOR';

    console.log(
      (p.displayName || p.providerId).padEnd(16) +
      p.extractionStrategy.padEnd(18) +
      String(p.plans.length).padEnd(8) +
      String(p.offers?.length || 0).padEnd(8) +
      (dbRecord?.status || p.status).padEnd(14) +
      (p.authorityStatus || 'UNKNOWN').padEnd(38) +
      overlayStr
    );
  }
  console.log('================================================================================================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
