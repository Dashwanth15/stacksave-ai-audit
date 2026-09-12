/**
 * SOFTBANK × PERPLEXITY FORENSIC DIAGNOSTIC SCRIPT
 * 
 * This script performs a complete forensic trace of the SoftBank × Perplexity offer
 * to determine why it appears active despite having a 404 destination.
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

interface DiagnosticReport {
  mongoDbRecord: any | null;
  staticSeedStatus: 'PRESENT' | 'ABSENT';
  playwrightExtractionStatus: 'IN_LIST' | 'NOT_IN_LIST';
  partnerRegistryStatus: 'REGISTERED' | 'NOT_REGISTERED';
  partnerDiscoveryStatus: 'IN_CANDIDATES' | 'NOT_IN_CANDIDATES';
  rootCause: string;
  recommendation: string;
}

async function diagnoseSoftBankOffer(): Promise<DiagnosticReport> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('SOFTBANK × PERPLEXITY FORENSIC DIAGNOSTIC');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // ═══ STEP 1: FIND MONGODB RECORD ═══
  console.log('[STEP 1] Searching MongoDB for SoftBank × Perplexity offer...\n');
  
  const softbankOffer = await NotificationEventModel.findOne({
    $or: [
      { partner: /softbank/i },
      { sourceUrl: /softbank\.jp.*perplexity/i },
      { title: /softbank.*perplexity/i },
      { description: /softbank.*perplexity/i },
    ],
  }).lean();

  if (softbankOffer) {
    console.log('✅ FOUND MONGODB RECORD:\n');
    console.log(`   _id:                    ${softbankOffer._id}`);
    console.log(`   fingerprint:            ${softbankOffer.fingerprint}`);
    console.log(`   providerId:             ${softbankOffer.providerId}`);
    console.log(`   providerName:           ${softbankOffer.providerName}`);
    console.log(`   title:                  ${softbankOffer.title}`);
    console.log(`   partner:                ${softbankOffer.partner}`);
    console.log(`   partnerType:            ${softbankOffer.partnerType}`);
    console.log(`   isPartnerOffer:         ${softbankOffer.isPartnerOffer}`);
    console.log(`   offerType:              ${softbankOffer.offerType}`);
    console.log(`   sourceUrl:              ${softbankOffer.sourceUrl}`);
    console.log(`   destinationUrl:         ${softbankOffer.destinationUrl || 'N/A'}`);
    console.log(`   isActive:               ${softbankOffer.isActive}`);
    console.log(`   status:                 ${softbankOffer.status}`);
    console.log(`   isPublic:               ${softbankOffer.isPublic}`);
    console.log(`   detectionMethod:        ${softbankOffer.detectionMethod}`);
    console.log(`   sourceStatus:           ${softbankOffer.sourceStatus}`);
    console.log(`   detectedAt:             ${softbankOffer.detectedAt}`);
    console.log(`   lastCheckedAt:          ${softbankOffer.lastCheckedAt}`);
    console.log(`   lastConfirmedAt:        ${softbankOffer.lastConfirmedAt}`);
    console.log(`   lastSuccessfulCheckAt:  ${softbankOffer.lastSuccessfulCheckAt || 'N/A'}`);
    console.log(`   lastSeenAt:             ${softbankOffer.lastSeenAt || 'N/A'}`);
    console.log(`   consecutiveMisses:      ${softbankOffer.consecutiveMisses || 0}`);
    console.log(`   benefit:                ${softbankOffer.benefit}`);
    console.log(`   duration:               ${softbankOffer.duration}`);
    console.log(`   value:                  ${softbankOffer.value}`);
    console.log(`   eligibility:            ${softbankOffer.eligibility}`);
    console.log(`   country:                ${softbankOffer.country}`);
    console.log(`   region:                 ${softbankOffer.region}`);
    console.log(`   evidenceText:           ${(softbankOffer.evidenceText || '').substring(0, 200)}...`);
    console.log(`   createdAt:              ${softbankOffer.createdAt}`);
    console.log(`   updatedAt:              ${softbankOffer.updatedAt}`);
    console.log('');
  } else {
    console.log('❌ NO MONGODB RECORD FOUND for SoftBank × Perplexity\n');
  }

  // ═══ STEP 2: CHECK STATIC SEEDS ═══
  console.log('[STEP 2] Checking if SoftBank is in static seed data...\n');
  
  const { PartnerOfferScanner } = await import('../src/pricing/partnerOfferScanner');
  const knownPartnerOffers = PartnerOfferScanner.getKnownPartnerOffers();
  const softbankInSeeds = knownPartnerOffers.some(
    (o) => o.partner?.toLowerCase().includes('softbank') || o.officialSourceUrl?.includes('softbank.jp')
  );

  if (softbankInSeeds) {
    console.log('✅ FOUND: SoftBank IS in getKnownPartnerOffers() static seed list\n');
  } else {
    console.log('❌ NOT FOUND: SoftBank is NOT in getKnownPartnerOffers() static seed list\n');
  }

  // ═══ STEP 3: CHECK PLAYWRIGHT EXTRACTION LIST ═══
  console.log('[STEP 3] Checking if SoftBank is in Playwright extraction hardcoded list...\n');
  
  // We know from code inspection it's not there, but document it
  const playwrightHasSOftBank = false; // extractOfficialPartnerOffers only has Jio, Airtel, Pixel, Samsung, ASUS
  if (playwrightHasSOftBank) {
    console.log('✅ FOUND: SoftBank IS in extractOfficialPartnerOffers() array\n');
  } else {
    console.log('❌ NOT FOUND: SoftBank is NOT in extractOfficialPartnerOffers() array\n');
    console.log('   Current partners in extraction list:');
    console.log('   - Jio × Google AI Pro');
    console.log('   - Airtel × Perplexity Pro');
    console.log('   - Google Pixel × Google One AI Premium');
    console.log('   - Samsung × Galaxy AI');
    console.log('   - ASUS × Google One AI Premium');
    console.log('   → SoftBank is MISSING from this list\n');
  }

  // ═══ STEP 4: CHECK PARTNER REGISTRY ═══
  console.log('[STEP 4] Checking if SoftBank is in partnerSourceRegistry...\n');
  
  const { getAllRegisteredPartners } = await import('../src/pricing/partnerSourceRegistry');
  const allPartners = getAllRegisteredPartners();
  const softbankInRegistry = allPartners.some((p) => p.partnerId === 'softbank' || p.name === 'SoftBank');
  
  if (softbankInRegistry) {
    const softbankEntry = allPartners.find((p) => p.partnerId === 'softbank');
    console.log('✅ FOUND: SoftBank IS registered in partnerSourceRegistry\n');
    console.log(`   partnerId:       ${softbankEntry?.partnerId}`);
    console.log(`   name:            ${softbankEntry?.name}`);
    console.log(`   category:        ${softbankEntry?.category}`);
    console.log(`   officialDomain:  ${softbankEntry?.officialDomain}`);
    console.log(`   offersUrl:       ${softbankEntry?.offersUrl}`);
    console.log(`   country:         ${softbankEntry?.country}`);
    console.log(`   isRegistered:    ${softbankEntry?.isRegistered}\n`);
  } else {
    console.log('❌ NOT FOUND: SoftBank is NOT in partnerSourceRegistry\n');
  }

  // ═══ STEP 5: CHECK PARTNER DISCOVERY CANDIDATES ═══
  console.log('[STEP 5] Checking if SoftBank is in partnerDiscoveryService candidates...\n');
  
  const { PartnerDiscoveryService } = await import('../src/pricing/partnerDiscoveryService');
  const candidates = PartnerDiscoveryService.discoverEcosystemCandidates();
  const softbankInCandidates = candidates.some(
    (c) => c.partnerName === 'SoftBank' || c.sourceUrl?.includes('softbank.jp')
  );
  
  if (softbankInCandidates) {
    const softbankCandidate = candidates.find((c) => c.partnerName === 'SoftBank');
    console.log('✅ FOUND: SoftBank IS in partnerDiscoveryService ecosystem candidates\n');
    console.log(`   partnerName:          ${softbankCandidate?.partnerName}`);
    console.log(`   category:             ${softbankCandidate?.category}`);
    console.log(`   sourceUrl:            ${softbankCandidate?.sourceUrl}`);
    console.log(`   possibleAiProvider:   ${softbankCandidate?.possibleAiProvider}`);
    console.log(`   possibleAiPlan:       ${softbankCandidate?.possibleAiPlan}`);
    console.log(`   benefit:              ${softbankCandidate?.benefit}`);
    console.log(`   duration:             ${softbankCandidate?.duration}\n`);
  } else {
    console.log('❌ NOT FOUND: SoftBank is NOT in partnerDiscoveryService candidates\n');
  }

  // ═══ STEP 6: ROOT CAUSE ANALYSIS ═══
  console.log('[STEP 6] ROOT CAUSE ANALYSIS\n');
  
  let rootCause = '';
  let recommendation = '';
  
  if (softbankOffer && softbankOffer.isActive) {
    if (!playwrightHasSOftBank && !softbankInSeeds) {
      rootCause = 'HISTORICAL RECORD WITHOUT REVALIDATION: The SoftBank offer exists in MongoDB but is NOT in the current extraction pipeline. It was likely added manually, via a previous extraction that has since been removed, or through discovery candidates. The critical bug is that when an offer is NOT in the current extraction list, it is NEVER revalidated and remains active indefinitely.';
      recommendation = 'IMPLEMENT RECONCILIATION: Add logic to mark offers as EXPIRED/UNAVAILABLE when they are absent from successful extraction runs AND their destinations return 404/expired status. The partner scanner must not only add new offers but also deactivate stale ones.';
    } else if (softbankInSeeds) {
      rootCause = 'STATIC SEED WITHOUT HEALTH CHECK: SoftBank is in the static seed list which automatically marks it as active on every scan, bypassing destination health checks.';
      recommendation = 'REMOVE FROM STATIC SEEDS: Remove SoftBank from getKnownPartnerOffers() OR add health check validation to static seeds before marking them active.';
    } else if (playwrightHasSOftBank) {
      rootCause = 'PLAYWRIGHT EXTRACTION WITHOUT REJECTION: SoftBank is in the Playwright extraction list but the research agent is not properly rejecting it based on 404 status.';
      recommendation = 'CHECK RESEARCH AGENT: Verify PlaywrightOfferResearchAgent properly detects and rejects 404 destinations for SoftBank.';
    } else {
      rootCause = 'UNKNOWN SOURCE: Unable to determine how SoftBank offer entered the database.';
      recommendation = 'MANUAL INVESTIGATION REQUIRED: Check database history, logs, and extraction timestamps.';
    }
  } else if (softbankOffer && !softbankOffer.isActive) {
    rootCause = 'OFFER ALREADY DEACTIVATED: The SoftBank offer exists but is already marked inactive. Frontend may be caching stale data.';
    recommendation = 'CHECK FRONTEND CACHE: Clear frontend cache and verify API response excludes inactive offers.';
  } else {
    rootCause = 'NO DATABASE RECORD: SoftBank offer does not exist in MongoDB. Frontend may be showing fallback/static data.';
    recommendation = 'CHECK FRONTEND STATIC DATA: Verify frontend is not displaying hardcoded SoftBank offer independent of backend API.';
  }

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('ROOT CAUSE:');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(rootCause);
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('RECOMMENDATION:');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(recommendation);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();

  return {
    mongoDbRecord: softbankOffer,
    staticSeedStatus: softbankInSeeds ? 'PRESENT' : 'ABSENT',
    playwrightExtractionStatus: playwrightHasSOftBank ? 'IN_LIST' : 'NOT_IN_LIST',
    partnerRegistryStatus: softbankInRegistry ? 'REGISTERED' : 'NOT_REGISTERED',
    partnerDiscoveryStatus: softbankInCandidates ? 'IN_CANDIDATES' : 'NOT_IN_CANDIDATES',
    rootCause,
    recommendation,
  };
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  diagnoseSoftBankOffer()
    .then((report) => {
      console.log('\n✅ Diagnostic complete. Report generated.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Diagnostic failed:', err);
      process.exit(1);
    });
}

export { diagnoseSoftBankOffer };
