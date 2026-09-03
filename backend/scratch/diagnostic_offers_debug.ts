#!/usr/bin/env npx ts-node
/**
 * DIAGNOSTIC: Why is the Offers Page showing 0 offers?
 * 
 * This script traces the complete data pipeline:
 * 1. Total offers in MongoDB
 * 2. How many pass each filter condition
 * 3. Which conditions fail most often
 * 4. Sample failing offers to understand blockers
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../services/dbService';
import { isRegisteredOfficialSource } from '../pricing/offerTrust';

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stacksave';
  if (!uri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
}

async function runDiagnostic() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('DIAGNOSTIC: Offers Page 0 Offers Issue');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Total offers in database
  const totalOffers = await NotificationEventModel.countDocuments({});
  console.log(`📊 Total offers in MongoDB: ${totalOffers}`);

  // 2. Offers with eventType NEW_OFFER
  const newOffers = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
  });
  console.log(`   └─ With eventType: NEW_OFFER: ${newOffers}`);

  // 3. Active offers (isActive !== false)
  const activeOffers = await NotificationEventModel.countDocuments({
    isActive: { $ne: false },
  });
  console.log(`   └─ Active (isActive !== false): ${activeOffers}`);

  // 4. Public offers
  const publicOffers = await NotificationEventModel.countDocuments({
    isPublic: true,
  });
  console.log(`   └─ Public (isPublic: true): ${publicOffers}`);

  // 5. Offers with sourceStatus VERIFIED
  const verifiedStatus = await NotificationEventModel.countDocuments({
    sourceStatus: 'VERIFIED',
  });
  console.log(`   └─ With sourceStatus: VERIFIED: ${verifiedStatus}`);

  // 6. Offers with evidenceText
  const withEvidence = await NotificationEventModel.countDocuments({
    evidenceText: { $exists: true, $ne: null },
  });
  console.log(`   └─ With evidenceText (non-empty): ${withEvidence}`);

  // 7. Offers with lastConfirmedAt
  const withLastConfirmed = await NotificationEventModel.countDocuments({
    lastConfirmedAt: { $exists: true, $ne: null },
  });
  console.log(`   └─ With lastConfirmedAt: ${withLastConfirmed}`);

  // 8. Offers with sourceFetchedAt
  const withSourceFetched = await NotificationEventModel.countDocuments({
    sourceFetchedAt: { $exists: true, $ne: null },
  });
  console.log(`   └─ With sourceFetchedAt: ${withSourceFetched}`);

  // 9. Offers with lastSuccessfulCheckAt
  const withLastCheck = await NotificationEventModel.countDocuments({
    lastSuccessfulCheckAt: { $exists: true, $ne: null },
  });
  console.log(`   └─ With lastSuccessfulCheckAt: ${withLastCheck}`);

  // 10. ALL CONDITIONS COMBINED (matching the API filter)
  const allConditions = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
    evidenceText: { $exists: true, $ne: null },
    lastConfirmedAt: { $exists: true, $ne: null },
    sourceFetchedAt: { $exists: true, $ne: null },
    lastSuccessfulCheckAt: { $exists: true, $ne: null },
  });
  console.log(`   └─ ALL CONDITIONS TOGETHER: ${allConditions}`);

  console.log('\n─ Filter Analysis ─\n');
  console.log('% Offers passing each condition:');
  console.log(`  • eventType: NEW_OFFER: ${totalOffers > 0 ? Math.round((newOffers / totalOffers) * 100) : 0}%`);
  console.log(`  • isActive !== false: ${totalOffers > 0 ? Math.round((activeOffers / totalOffers) * 100) : 0}%`);
  console.log(`  • isPublic: true: ${totalOffers > 0 ? Math.round((publicOffers / totalOffers) * 100) : 0}%`);
  console.log(`  • sourceStatus: VERIFIED: ${totalOffers > 0 ? Math.round((verifiedStatus / totalOffers) * 100) : 0}%`);
  console.log(`  • evidenceText (non-empty): ${totalOffers > 0 ? Math.round((withEvidence / totalOffers) * 100) : 0}%`);
  console.log(`  • lastConfirmedAt present: ${totalOffers > 0 ? Math.round((withLastConfirmed / totalOffers) * 100) : 0}%`);
  console.log(`  • sourceFetchedAt present: ${totalOffers > 0 ? Math.round((withSourceFetched / totalOffers) * 100) : 0}%`);
  console.log(`  • lastSuccessfulCheckAt present: ${totalOffers > 0 ? Math.round((withLastCheck / totalOffers) * 100) : 0}%`);

  // 11. Sample offers to understand why they fail
  console.log('\n─ Sample Offers (First 5) ─\n');
  const samples = await NotificationEventModel.find({})
    .limit(5)
    .select('providerId title sourceStatus sourceUrl evidenceText isPublic isActive lastConfirmedAt sourceFetchedAt lastSuccessfulCheckAt')
    .lean();

  samples.forEach((offer, idx) => {
    console.log(`\n${idx + 1}. "${offer.title}"`);
    console.log(`   Provider: ${offer.providerId}`);
    console.log(`   sourceStatus: ${offer.sourceStatus || 'MISSING'}`);
    console.log(`   isPublic: ${offer.isPublic}`);
    console.log(`   isActive: ${offer.isActive !== false ? 'true' : 'false'}`);
    console.log(`   evidenceText: ${offer.evidenceText ? `"${offer.evidenceText.substring(0, 50)}..."` : 'MISSING'}`);
    console.log(`   lastConfirmedAt: ${offer.lastConfirmedAt ? new Date(offer.lastConfirmedAt).toISOString() : 'MISSING'}`);
    console.log(`   sourceFetchedAt: ${offer.sourceFetchedAt ? new Date(offer.sourceFetchedAt).toISOString() : 'MISSING'}`);
    console.log(`   lastSuccessfulCheckAt: ${offer.lastSuccessfulCheckAt ? new Date(offer.lastSuccessfulCheckAt).toISOString() : 'MISSING'}`);

    // Check isRegisteredOfficialSource
    const isRegistered = offer.sourceUrl ? isRegisteredOfficialSource(offer.providerId, offer.sourceUrl) : false;
    console.log(`   isRegisteredOfficialSource: ${isRegistered ? '✓' : '✗'}`);
  });

  // 12. Check which single condition filters out the most offers
  console.log('\n─ Condition Breakdown (Step-by-step filtering) ─\n');

  let current = totalOffers;
  console.log(`Start: ${current} total offers`);

  const step1 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
  });
  console.log(`After "eventType: NEW_OFFER": ${step1} (filtered: ${current - step1})`);
  current = step1;

  const step2 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
  });
  console.log(`After "isActive !== false": ${step2} (filtered: ${current - step2})`);
  current = step2;

  const step3 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
  });
  console.log(`After "isPublic: true": ${step3} (filtered: ${current - step3})`);
  current = step3;

  const step4 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
  });
  console.log(`After "sourceStatus: VERIFIED": ${step4} (filtered: ${current - step4})`);
  current = step4;

  const step5 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
    evidenceText: { $exists: true, $ne: null },
  });
  console.log(`After "evidenceText non-empty": ${step5} (filtered: ${current - step5})`);
  current = step5;

  const step6 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
    evidenceText: { $exists: true, $ne: null },
    lastConfirmedAt: { $exists: true, $ne: null },
  });
  console.log(`After "lastConfirmedAt present": ${step6} (filtered: ${current - step6})`);
  current = step6;

  const step7 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
    evidenceText: { $exists: true, $ne: null },
    lastConfirmedAt: { $exists: true, $ne: null },
    sourceFetchedAt: { $exists: true, $ne: null },
  });
  console.log(`After "sourceFetchedAt present": ${step7} (filtered: ${current - step7})`);
  current = step7;

  const step8 = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
    sourceStatus: 'VERIFIED',
    evidenceText: { $exists: true, $ne: null },
    lastConfirmedAt: { $exists: true, $ne: null },
    sourceFetchedAt: { $exists: true, $ne: null },
    lastSuccessfulCheckAt: { $exists: true, $ne: null },
  });
  console.log(`After "lastSuccessfulCheckAt present": ${step8} (filtered: ${current - step8})`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  if (step8 === 0) {
    console.log('❌ RESULT: No offers pass all filter conditions');
    console.log('\nMost likely cause:');
    
    if (step5 > 0 && step6 === 0) {
      console.log('   ➜ BLOCKER: lastConfirmedAt missing (metadata not populated)');
    } else if (step4 > 0 && step5 === 0) {
      console.log('   ➜ BLOCKER: evidenceText empty or missing');
    } else if (step3 > 0 && step4 === 0) {
      console.log('   ➜ BLOCKER: sourceStatus not set to VERIFIED');
    } else if (step2 > 0 && step3 === 0) {
      console.log('   ➜ BLOCKER: isPublic not set to true');
    } else if (step1 > 0 && step2 === 0) {
      console.log('   ➜ BLOCKER: isActive set to false (offers marked as expired)');
    } else if (totalOffers > 0 && step1 === 0) {
      console.log('   ➜ BLOCKER: eventType not set to NEW_OFFER');
    }
  } else {
    console.log(`✅ RESULT: ${step8} offers should be visible on Offers page`);
  }

  await mongoose.disconnect();
}

connectDB().then(runDiagnostic).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
