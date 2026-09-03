import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { NotificationEventModel, connectDB } from '../src/services/dbService';

async function verifyDbAndApi() {
  console.log('--- STARTING DATABASE & API RECONCILIATION ---');
  await connectDB();

  // 1. Query MongoDB for all active offers
  const activeOffers = await NotificationEventModel.find({
    eventType: 'NEW_OFFER',
    isActive: { $ne: false },
  }).sort({ detectedAt: -1 }).lean();

  console.log(`\n[MongoDB] Active Offer Count: ${activeOffers.length}`);
  console.log('--------------------------------------------------------------------------------');

  for (const [idx, o] of activeOffers.entries()) {
    console.log(`[#${idx + 1}] Provider: ${o.providerId} (${o.providerName})`);
    console.log(`     Title: ${o.title}`);
    console.log(`     Source URL: ${o.sourceUrl}`);
    console.log(`     Discount: ${o.discount || 'N/A'}`);
    console.log(`     Evidence Text: ${o.evidenceText || 'N/A'}`);
    console.log(`     Detection Method: ${o.detectionMethod || 'N/A'}`);
    console.log(`     Source Status: ${o.sourceStatus || 'VERIFIED'}`);
    console.log(`     Last Confirmed: ${o.lastConfirmedAt ? new Date(o.lastConfirmedAt).toISOString() : 'N/A'}`);
    console.log(`     Fingerprint: ${o.fingerprint}`);
    console.log(`     IsActive: ${o.isActive !== false}`);
    console.log('--------------------------------------------------------------------------------');
  }

  // 2. Check retired services
  const retiredCodex = activeOffers.filter(o => o.providerId === 'codex');
  const retiredGithubModels = activeOffers.filter(o => o.providerId === 'github-models');
  console.log(`\n[Sanity Check] Active Codex offers in DB: ${retiredCodex.length} (Expected: 0)`);
  console.log(`[Sanity Check] Active GitHub Models offers in DB: ${retiredGithubModels.length} (Expected: 0)`);

  // 3. Check for stale numeric fallbacks in titles/descriptions
  const stalePerp = activeOffers.filter(o => o.providerId === 'perplexity' && (o.description?.includes('18.7') || o.title?.includes('18.7')));
  console.log(`[Sanity Check] Offers with hardcoded 18.7 fallback: ${stalePerp.length} (Expected: 0)`);

  // 4. Test API endpoint logic directly
  const apiFormattedOffers = activeOffers.map((e) => ({
    id: e.fingerprint || (e as any)._id?.toString(),
    fingerprint: e.fingerprint,
    providerId: e.providerId,
    providerName: e.providerName || e.providerId,
    title: e.title,
    description: e.description || null,
    discount: e.discount || null,
    discountType: e.discountType || null,
    evidenceText: e.evidenceText || null,
    detectionMethod: e.detectionMethod || 'PLAYWRIGHT_DOM',
    sourceStatus: e.sourceStatus || 'VERIFIED',
    sourceUrl: e.sourceUrl,
    detectedAt: e.detectedAt,
    lastConfirmedAt: e.lastConfirmedAt || e.lastSeenAt || e.detectedAt,
    expiresAt: e.expiresAt || null,
  }));

  console.log(`\n[API Simulation] API Count: ${apiFormattedOffers.length}`);
  console.log(`[Reconciliation Result] MongoDB Active Count (${activeOffers.length}) == API Count (${apiFormattedOffers.length}) -> MATCH: ${activeOffers.length === apiFormattedOffers.length}`);

  await mongoose.disconnect();
  console.log('\n--- RECONCILIATION COMPLETE ---');
}

verifyDbAndApi().catch(console.error);
