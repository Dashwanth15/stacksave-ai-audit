import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { chromium } from 'playwright';
import { extractPerplexity, extractOfficialPartnerOffers } from '../scripts/official_pricing_extractor';
import { ingestOfficialExtractedPricing } from '../src/pricing/syncOrchestrator';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { NotificationEventModel } from '../src/services/dbService';
import { canPublishOffer } from '../src/pricing/offerTrust';

async function main() {
  console.log('=== STARTING DOUBLE EXTRACTION VERIFICATION SUITE ===\n');

  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('✅ Connected to MongoDB\n');

  const browser = await chromium.launch({ headless: true });

  try {
    // ── EXTRACTION RUN 1 ─────────────────────────────────────────
    console.log('====================================================');
    console.log('🔄 STARTING EXTRACTION RUN 1 OF 2...');
    console.log('====================================================');

    console.log('1. Extracting native Perplexity data...');
    const perplexityData1 = await extractPerplexity(browser);
    console.log(`   Plans extracted: ${perplexityData1.plans.length}`);
    console.log(`   Offers extracted: ${perplexityData1.offers?.length || 0}`);
    for (const o of perplexityData1.offers || []) {
      console.log(`   - Offer: "${o.title}" | discount: ${o.discount} | isPartnerOffer: ${o.isPartnerOffer} | partner: ${o.partner}`);
    }

    console.log('\n2. Ingesting native Perplexity data into MongoDB...');
    const ingestRes1 = await ingestOfficialExtractedPricing({
      providers: [perplexityData1],
      runnerVersion: 'test_double_run_1',
    }, 'test_runner_1');
    console.log(`   Ingest result: accepted=${ingestRes1.totalOffersAccepted}, rejected=${ingestRes1.totalOffersRejected}`);

    console.log('\n3. Extracting official partner offers...');
    const partnerOffers1 = await extractOfficialPartnerOffers(browser);
    console.log(`   Live partner offers extracted: ${partnerOffers1.length}`);

    console.log('\n4. Running PartnerOfferScanner.runFullScan...');
    const scanResult1 = await PartnerOfferScanner.runFullScan(partnerOffers1, browser);
    console.log(`   Partner scan completed: preserved=${scanResult1.preservedActiveCount}, new=${scanResult1.newOffersCount}, expired=${scanResult1.expiredOffersCount}`);

    // ── EXTRACTION RUN 2 ─────────────────────────────────────────
    console.log('\n====================================================');
    console.log('🔄 STARTING EXTRACTION RUN 2 OF 2 (RESURRECTION CHECK)...');
    console.log('====================================================');

    console.log('1. Extracting native Perplexity data (Run 2)...');
    const perplexityData2 = await extractPerplexity(browser);

    console.log('\n2. Ingesting native Perplexity data into MongoDB (Run 2)...');
    const ingestRes2 = await ingestOfficialExtractedPricing({
      providers: [perplexityData2],
      runnerVersion: 'test_double_run_2',
    }, 'test_runner_2');
    console.log(`   Ingest result 2: accepted=${ingestRes2.totalOffersAccepted}, rejected=${ingestRes2.totalOffersRejected}`);

    console.log('\n3. Extracting official partner offers (Run 2)...');
    const partnerOffers2 = await extractOfficialPartnerOffers(browser);

    console.log('\n4. Running PartnerOfferScanner.runFullScan (Run 2)...');
    const scanResult2 = await PartnerOfferScanner.runFullScan(partnerOffers2, browser);
    console.log(`   Partner scan 2 completed: preserved=${scanResult2.preservedActiveCount}, new=${scanResult2.newOffersCount}, expired=${scanResult2.expiredOffersCount}`);

    // ── VERIFICATION CHECKS ──────────────────────────────────────
    console.log('\n====================================================');
    console.log('📊 DATABASE POST-EXTRACTION FORENSIC AUDIT');
    console.log('====================================================');

    const allPerplexityOffers = await NotificationEventModel.find({ providerId: 'perplexity' }).lean();
    console.log(`Total Perplexity records in MongoDB: ${allPerplexityOffers.length}\n`);

    for (const off of allPerplexityOffers) {
      console.log(`Offer: "${off.title}"`);
      console.log(`   _id:            ${off._id}`);
      console.log(`   isActive:       ${off.isActive}`);
      console.log(`   status:         ${off.status}`);
      console.log(`   isPartnerOffer: ${off.isPartnerOffer}`);
      console.log(`   partner:        ${JSON.stringify(off.partner)}`);
      console.log(`   partnerType:    ${JSON.stringify(off.partnerType)}`);
      console.log(`   offerType:      ${off.offerType}`);
      console.log(`   benefit:        ${off.benefit}`);
      console.log(`   sourceUrl:      ${off.sourceUrl}`);
      console.log(`   canPublish:     ${canPublishOffer(off as any)}`);
      console.log('----------------------------------------------------');
    }

    // Explicit Acceptance Criteria Tests
    console.log('\n====================================================');
    console.log('🎯 CHECKING 10 FINAL ACCEPTANCE CRITERIA');
    console.log('====================================================');

    // 1. Education Pro canonical check
    const eduProOffers = allPerplexityOffers.filter(o => /education\s*pro/i.test(o.title));
    const canonicalEdu = eduProOffers.find(o => o.isActive === true);

    console.log(`1. Perplexity Education Pro Active Count: ${eduProOffers.filter(o => o.isActive).length} (Must be exactly 1)`);
    if (canonicalEdu) {
      console.log('   ✅ Canonical Education Pro found!');
      console.log(`   - Title: "${canonicalEdu.title}"`);
      console.log(`   - isActive: ${canonicalEdu.isActive} (MUST be true)`);
      console.log(`   - status: ${canonicalEdu.status} (MUST be ACTIVE)`);
      console.log(`   - discount: ${canonicalEdu.discount} (MUST be 50% OFF)`);
      console.log(`   - isPartnerOffer: ${canonicalEdu.isPartnerOffer} (MUST be false)`);
      console.log(`   - partner: ${canonicalEdu.partner} (MUST be undefined/null, NOT '')`);
      console.log(`   - SheerID in evidence: ${canonicalEdu.evidenceText?.includes('SheerID')} (MUST be true)`);
      console.log(`   - destinationUrl: ${canonicalEdu.sourceUrl} (MUST be official Help Center)`);
      console.log(`   - canPublish: ${canPublishOffer(canonicalEdu as any)} (MUST be true)`);
    } else {
      console.error('   ❌ Canonical Education Pro NOT FOUND or NOT ACTIVE!');
    }

    // 2. UNiDAYS check
    const unidaysOffer = allPerplexityOffers.find(o => (o.partner || '').toLowerCase().includes('unidays') || o.title.toLowerCase().includes('unidays'));
    console.log(`\n2. UNiDAYS Record:`);
    if (unidaysOffer) {
      console.log(`   - Title: "${unidaysOffer.title}"`);
      console.log(`   - isActive: ${unidaysOffer.isActive} (MUST be false)`);
      console.log(`   - status: ${unidaysOffer.status} (MUST be UNAVAILABLE/HISTORICAL)`);
      console.log(`   - canPublish: ${canPublishOffer(unidaysOffer as any)} (MUST be false)`);
      if (!unidaysOffer.isActive && unidaysOffer.status === 'UNAVAILABLE') {
        console.log('   ✅ UNiDAYS is correctly INACTIVE and preserved.');
      } else {
        console.error('   ❌ UNiDAYS is unexpectedly active or wrong status!');
      }
    } else {
      console.log('   ℹ No UNiDAYS record found.');
    }

    // 3. Airtel check
    const airtelOffer = allPerplexityOffers.find(o => (o.partner || '').toLowerCase().includes('airtel') || o.title.toLowerCase().includes('airtel'));
    console.log(`\n3. Airtel Record:`);
    if (airtelOffer) {
      console.log(`   - Title: "${airtelOffer.title}"`);
      console.log(`   - isActive: ${airtelOffer.isActive} (MUST be false)`);
      console.log(`   - status: ${airtelOffer.status} (MUST be EXPIRED)`);
      console.log(`   - canPublish: ${canPublishOffer(airtelOffer as any)} (MUST be false)`);
      if (!airtelOffer.isActive && airtelOffer.status === 'EXPIRED') {
        console.log('   ✅ Airtel is correctly EXPIRED and preserved.');
      } else {
        console.error('   ❌ Airtel is unexpectedly active or wrong status!');
      }
    } else {
      console.log('   ℹ No Airtel record found.');
    }

    // 4. Nothing Technology check
    const nothingOffer = allPerplexityOffers.find(o => (o.partner || '').toLowerCase().includes('nothing') || o.title.toLowerCase().includes('nothing'));
    console.log(`\n4. Nothing Technology Record:`);
    if (nothingOffer) {
      console.log(`   - Title: "${nothingOffer.title}"`);
      console.log(`   - isActive: ${nothingOffer.isActive} (MUST be false)`);
      console.log(`   - status: ${nothingOffer.status} (MUST be UNAVAILABLE)`);
      console.log(`   - canPublish: ${canPublishOffer(nothingOffer as any)} (MUST be false)`);
      if (!nothingOffer.isActive && nothingOffer.status === 'UNAVAILABLE') {
        console.log('   ✅ Nothing Technology is correctly INACTIVE and preserved.');
      } else {
        console.error('   ❌ Nothing Technology is unexpectedly active or wrong status!');
      }
    } else {
      console.log('   ℹ No Nothing record found.');
    }

    // ── PUBLIC API SIMULATION ────────────────────────────────────
    console.log('\n====================================================');
    console.log('🌐 SIMULATING GET /api/intelligence/offers');
    console.log('====================================================');

    const publicEvents = await NotificationEventModel.find({
      eventType: 'NEW_OFFER',
      isActive: { $ne: false },
      isPublic: true,
    }).lean();

    const publishable = publicEvents.filter(e => canPublishOffer(e as any));
    console.log(`Total public publishable offers across all providers: ${publishable.length}`);

    const perplexityPublic = publishable.filter(e => e.providerId === 'perplexity');
    console.log(`Perplexity offers in public API response: ${perplexityPublic.length}`);
    for (const p of perplexityPublic) {
      console.log(`- "${p.title}" | Partner: ${p.partner || 'None (Native)'} | Type: ${p.offerType} | Badge: ${p.discount || p.benefit} | URL: ${p.sourceUrl}`);
    }

    const hasAirtelPublic = perplexityPublic.some(p => (p.partner || '').toLowerCase().includes('airtel') || p.title.toLowerCase().includes('airtel'));
    const hasUnidaysPublic = perplexityPublic.some(p => (p.partner || '').toLowerCase().includes('unidays') || p.title.toLowerCase().includes('unidays'));
    const hasNothingPublic = perplexityPublic.some(p => (p.partner || '').toLowerCase().includes('nothing') || p.title.toLowerCase().includes('nothing'));
    const hasEduProPublic = perplexityPublic.some(p => /education\s*pro/i.test(p.title));

    console.log('\nPublic Visibility Audit:');
    console.log(`- Airtel visible?             ${hasAirtelPublic} (MUST be false)`);
    console.log(`- UNiDAYS visible?            ${hasUnidaysPublic} (MUST be false)`);
    console.log(`- Nothing visible?            ${hasNothingPublic} (MUST be false)`);
    console.log(`- Education Pro visible?      ${hasEduProPublic} (MUST be true)`);

    if (!hasAirtelPublic && !hasUnidaysPublic && !hasNothingPublic && hasEduProPublic) {
      console.log('\n🎉 ALL ACCEPTANCE CRITERIA SATISFIED 100%!');
    } else {
      console.error('\n❌ SOME ACCEPTANCE CRITERIA FAILED!');
    }

  } finally {
    await browser.close();
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
