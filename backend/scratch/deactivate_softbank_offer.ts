/**
 * MANUAL FIX: Deactivate SoftBank × Perplexity Offer
 * 
 * This script immediately deactivates the stale SoftBank offer in MongoDB.
 * Run this BEFORE the reconciliation logic takes effect (7-day grace period).
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function deactivateSoftBankOffer(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('MANUAL FIX: DEACTIVATING SOFTBANK × PERPLEXITY OFFER');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Find the SoftBank offer
  const softbankOffer = await NotificationEventModel.findOne({
    $or: [
      { partner: /softbank/i },
      { sourceUrl: /softbank\.jp.*perplexity/i },
      { fingerprint: 'fd922b96bc87db59e3294f948f35c7b8' }, // Known fingerprint from diagnostic
    ],
  });

  if (!softbankOffer) {
    console.log('✅ No SoftBank offer found in database (already deactivated or never existed)');
    await mongoose.disconnect();
    return;
  }

  console.log('[BEFORE FIX]');
  console.log(`   _id:            ${softbankOffer._id}`);
  console.log(`   fingerprint:    ${softbankOffer.fingerprint}`);
  console.log(`   title:          ${softbankOffer.title}`);
  console.log(`   partner:        ${softbankOffer.partner}`);
  console.log(`   sourceUrl:      ${softbankOffer.sourceUrl}`);
  console.log(`   isActive:       ${softbankOffer.isActive}     ← SHOULD BE false`);
  console.log(`   status:         ${softbankOffer.status}       ← SHOULD BE UNAVAILABLE`);
  console.log('');

  // Deactivate the offer
  await NotificationEventModel.updateOne(
    { _id: softbankOffer._id },
    {
      $set: {
        isActive: false,
        status: 'UNAVAILABLE',
        lastCheckedAt: new Date(),
      },
      $inc: { consecutiveMisses: 1 },
    }
  );

  // Verify the update
  const updated = await NotificationEventModel.findById(softbankOffer._id);
  
  console.log('[AFTER FIX]');
  console.log(`   _id:            ${updated!._id}`);
  console.log(`   fingerprint:    ${updated!.fingerprint}`);
  console.log(`   title:          ${updated!.title}`);
  console.log(`   partner:        ${updated!.partner}`);
  console.log(`   sourceUrl:      ${updated!.sourceUrl}`);
  console.log(`   isActive:       ${updated!.isActive}     ✅`);
  console.log(`   status:         ${updated!.status}       ✅`);
  console.log(`   lastCheckedAt:  ${updated!.lastCheckedAt}`);
  console.log('');

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('✅ SoftBank × Perplexity offer successfully deactivated');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Verify GET /api/intelligence/offers does NOT return SoftBank offer');
  console.log('2. Verify frontend Offers dashboard does NOT display SoftBank card');
  console.log('3. Clear frontend cache if necessary');
  console.log('4. Monitor reconciliation logic on next partner scan (7-day grace period)');
  console.log('');

  await mongoose.disconnect();
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  deactivateSoftBankOffer()
    .then(() => {
      console.log('✅ Fix complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Fix failed:', err);
      process.exit(1);
    });
}

export { deactivateSoftBankOffer };
