/**
 * FORENSIC OFFER RECONCILIATION DIAGNOSTIC
 * 
 * Traces complete offer data flow:
 * - Extraction → Ingestion → MongoDB → API → Frontend
 * 
 * Identifies exact loss points for missing offers.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import { canPublishOffer } from '../src/pricing/offerTrust';

interface OfferRecord {
  providerId: string;
  providerName: string;
  title: string;
  fingerprint: string;
  isActive: boolean | null;
  isPublic: boolean | null;
  eventType: string;
  sourceStatus: string;
  sourceUrl: string;
  evidenceText: string | null;
  detectedAt: Date;
  lastConfirmedAt?: Date;
  detectionMethod?: string;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('FORENSIC OFFER RECONCILIATION DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 1: RAW DATABASE COUNTS
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 1: RAW DATABASE COUNTS');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const totalEvents = await NotificationEventModel.countDocuments({});
  const newOfferEvents = await NotificationEventModel.countDocuments({ eventType: 'NEW_OFFER' });
  const activeEvents = await NotificationEventModel.countDocuments({ isActive: { $ne: false } });
  const publicEvents = await NotificationEventModel.countDocuments({ isPublic: true });
  const verifiedEvents = await NotificationEventModel.countDocuments({ sourceStatus: 'VERIFIED' });

  console.log(`Total Notification Events:       ${totalEvents}`);
  console.log(`  eventType = 'NEW_OFFER':        ${newOfferEvents}`);
  console.log(`  isActive != false:              ${activeEvents}`);
  console.log(`  isPublic = true:                ${publicEvents}`);
  console.log(`  sourceStatus = 'VERIFIED':      ${verifiedEvents}\n`);

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 2: QUALIFICATION FUNNEL
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 2: QUALIFICATION FUNNEL (MongoDB Query)');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const qualifyingDbOffers = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
  });

  console.log(`Offers passing MongoDB filters:  ${qualifyingDbOffers}`);
  console.log(`  (eventType=NEW_OFFER, isActive!=false, isPublic=true)\n`);

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 3: PROVIDER BREAKDOWN
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 3: PROVIDER BREAKDOWN (All Active Public Offers)');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const providerCounts = await NotificationEventModel.aggregate([
    {
      $match: {
        eventType: 'NEW_OFFER',
        isActive: { $ne: false },
        isPublic: true,
      },
    },
    {
      $group: {
        _id: '$providerId',
        count: { $sum: 1 },
        providerName: { $first: '$providerName' },
        titles: { $push: '$title' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  console.log('Provider                 Offers  Titles');
  console.log('─────────────────────────────────────────────────────────────────────────────────────');
  for (const p of providerCounts) {
    console.log(`${(p.providerName || p._id).padEnd(24)} ${String(p.count).padStart(2)}      ${p.titles.slice(0, 2).join(', ')}${p.count > 2 ? '...' : ''}`);
  }
  console.log();

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 4: APPLICATION-LAYER PUBLICATION GATE (canPublishOffer)
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 4: APPLICATION-LAYER PUBLICATION GATE (canPublishOffer)');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const allQualifyingOffers = await NotificationEventModel.find({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: true,
  })
    .select('providerId providerName title sourceUrl evidenceText sourceStatus detectedAt lastConfirmedAt fingerprint isActive isPublic eventType detectionMethod')
    .lean();

  let passedPublicationGate = 0;
  let failedPublicationGate = 0;
  const rejectedOffers: Array<{ providerId: string; title: string; reason: string }> = [];

  for (const offer of allQualifyingOffers) {
    const passes = canPublishOffer(offer);
    if (passes) {
      passedPublicationGate++;
    } else {
      failedPublicationGate++;
      // Determine rejection reason
      let reason = 'UNKNOWN';
      if (!offer.sourceUrl) reason = 'NO_SOURCE_URL';
      else if (!offer.evidenceText || offer.evidenceText.length < 20) reason = 'INSUFFICIENT_EVIDENCE';
      else if (offer.sourceStatus && offer.sourceStatus !== 'ACTIVE') reason = `STATUS_${offer.sourceStatus}`;
      else if (offer.isActive === false) reason = 'IS_ACTIVE_FALSE';
      else reason = 'NOT_IN_SOURCE_REGISTRY';

      rejectedOffers.push({
        providerId: offer.providerId,
        title: offer.title,
        reason,
      });
    }
  }

  console.log(`MongoDB qualifying offers:        ${allQualifyingOffers.length}`);
  console.log(`Passed canPublishOffer:           ${passedPublicationGate} ✅`);
  console.log(`Failed canPublishOffer:           ${failedPublicationGate} ❌\n`);

  if (failedPublicationGate > 0) {
    console.log('REJECTED OFFERS (Failed canPublishOffer):');
    console.log('─────────────────────────────────────────────────────────────────────────────────────');
    for (const r of rejectedOffers) {
      console.log(`  ${r.providerId.padEnd(20)} | ${r.title.padEnd(40)} | ${r.reason}`);
    }
    console.log();
  }

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 5: DETAILED OFFER INVENTORY (ALL OFFERS IN DB)
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 5: COMPLETE OFFER INVENTORY (All Offers in MongoDB)');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const allOffers = await NotificationEventModel.find({
    eventType: 'NEW_OFFER',
  })
    .select('providerId providerName title sourceUrl evidenceText sourceStatus detectedAt lastConfirmedAt fingerprint isActive isPublic')
    .sort({ providerId: 1, detectedAt: -1 })
    .lean();

  console.log(`Total NEW_OFFER events in DB: ${allOffers.length}\n`);
  console.log('Provider             Title                                      Active  Public  Status    Evidence');
  console.log('────────────────────────────────────────────────────────────────────────────────────────────────────────────────');

  for (const offer of allOffers) {
    const active = offer.isActive === false ? 'NO ' : 'YES';
    const pub = offer.isPublic === true ? 'YES' : 'NO ';
    const status = (offer.sourceStatus || 'N/A').padEnd(9);
    const evidenceLen = offer.evidenceText ? offer.evidenceText.length : 0;
    const evidence = evidenceLen >= 20 ? `${evidenceLen} chars ✅` : `${evidenceLen} chars ❌`;

    console.log(
      `${(offer.providerId || 'N/A').padEnd(20)} ${offer.title.slice(0, 40).padEnd(42)} ${active}     ${pub}     ${status} ${evidence}`
    );
  }
  console.log();

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 6: DETECTION OF LOST OFFERS
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 6: OFFER LOSS ANALYSIS');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const extractedButInactive = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: false,
  });

  const extractedButNotPublic = await NotificationEventModel.countDocuments({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
    isPublic: { $ne: true },
  });

  console.log(`Offers marked INACTIVE:           ${extractedButInactive}`);
  console.log(`Offers marked NOT PUBLIC:         ${extractedButNotPublic}`);
  console.log(`Offers failing canPublishOffer:   ${failedPublicationGate}\n`);

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 7: SAMPLE OFFERS (for verification)
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('STEP 7: SAMPLE OFFERS (First 10 qualifying for API)');
  console.log('───────────────────────────────────────────────────────────────────────────────────────');

  const sampleOffers = allQualifyingOffers.slice(0, 10);
  for (const offer of sampleOffers) {
    const passes = canPublishOffer(offer);
    console.log(`[${passes ? '✅' : '❌'}] ${offer.providerId} | ${offer.title}`);
    console.log(`     Source: ${offer.sourceUrl}`);
    console.log(`     Evidence: ${offer.evidenceText ? `${offer.evidenceText.length} chars` : 'NONE'}`);
    console.log(`     Status: ${offer.sourceStatus || 'N/A'} | Public: ${offer.isPublic} | Active: ${offer.isActive}`);
    console.log();
  }

  // ────────────────────────────────────────────────────────────────────────────────────────────
  // STEP 8: SUMMARY
  // ────────────────────────────────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════');
  console.log(`Total Offers in Database:         ${newOfferEvents}`);
  console.log(`Active & Public (MongoDB):        ${qualifyingDbOffers}`);
  console.log(`Passed canPublishOffer (API):     ${passedPublicationGate}`);
  console.log(`Failed canPublishOffer:           ${failedPublicationGate}`);
  console.log();
  console.log('EXPECTED API RESPONSE:            ' + passedPublicationGate + ' offers');
  console.log('═══════════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('✅ Disconnected from MongoDB');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
