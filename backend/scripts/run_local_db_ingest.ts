import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { runOfficialExtraction } from './official_pricing_extractor';
import { ingestOfficialExtractedPricing } from '../src/pricing/syncOrchestrator';
import { NotificationEventModel } from '../src/services/dbService';

async function runLocalSync() {
  console.log('Connecting to DB...');
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');
  await mongoose.connect(uri);

  console.log('Running official live extraction across all monitored surfaces...');
  const payload = await runOfficialExtraction('both');

  console.log(`Ingesting extracted payload (${payload.providers.length} providers) into MongoDB...`);
  const result = await ingestOfficialExtractedPricing(payload, 'local_verification_sync');
  console.log('Sync result: Total providers =', result.totalProviders, 'Success =', result.successCount);

  const active = await NotificationEventModel.find({ eventType: 'NEW_OFFER', isActive: { $ne: false } }).lean();
  console.log('\n================================================================================');
  console.log(`NEW ACTIVE OFFERS COUNT IN DB: ${active.length}`);
  console.log('================================================================================');
  active.forEach((o, i) => {
    console.log(`${i + 1}. [${o.providerId}] "${o.title}" | discount: "${o.discount}" | fp: ${o.fingerprint} | lastSeenAt: ${o.lastSeenAt}`);
  });

  const inactive = await NotificationEventModel.find({ eventType: 'NEW_OFFER', isActive: false }).lean();
  console.log(`\nTOTAL INACTIVE OFFERS IN DB: ${inactive.length}`);
  inactive.forEach((o, i) => {
    console.log(`- [${o.providerId}] "${o.title}" (inactive)`);
  });

  await mongoose.disconnect();
}

runLocalSync().catch((err) => {
  console.error(err);
  process.exit(1);
});
