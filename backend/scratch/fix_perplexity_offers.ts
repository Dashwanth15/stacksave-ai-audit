/**
 * FIX: Correct Perplexity offers based on fresh evidence
 * 
 * 1. UNiDAYS - Deactivate (no current UNiDAYS partnership found)
 *    Note: Education Pro exists but is NOT a UNiDAYS partner bundle
 * 2. Nothing Technology - Set to UNAVAILABLE (destination 404)
 * 3. Airtel - Set to EXPIRED (promotion ended January 16, 2026, verified by redirect + "expired" text)
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function fixPerplexityOffers(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('FIX: PERPLEXITY OFFERS DATA CORRECTION');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  const now = new Date();
  let fixedCount = 0;

  // 1. Fix UNiDAYS offer
  console.log('1. UNIDAYS OFFER');
  console.log('   Issue: Incorrectly represented as UNiDAYS Partner Bundle');
  console.log('   Evidence: No current UNiDAYS × Perplexity partnership found');
  console.log('   Action: Deactivate (mark as UNAVAILABLE)\n');

  const unidaysOffers = await NotificationEventModel.find({
    $or: [
      { partner: /unidays/i },
      { title: /unidays/i },
    ],
    isActive: true,
  });

  console.log(`   Found ${unidaysOffers.length} active UNiDAYS offer(s)`);

  for (const offer of unidaysOffers) {
    console.log(`   Deactivating: ${offer.title}`);
    console.log(`   Previous state: isActive=${offer.isActive}, status=${offer.status}`);

    await NotificationEventModel.updateOne(
      { _id: offer._id },
      {
        $set: {
          isActive: false,
          status: 'UNAVAILABLE',
          lastCheckedAt: now,
        },
        $inc: { consecutiveMisses: 1 },
      }
    );

    console.log(`   ✅ Updated: isActive=false, status=UNAVAILABLE`);
    console.log(`   Note: Education Pro is a native Perplexity plan, NOT a UNiDAYS bundle\n`);
    fixedCount++;
  }

  // 2. Fix Nothing Technology offer
  console.log('2. NOTHING TECHNOLOGY OFFER');
  console.log('   Issue: Destination returns HTTP 404');
  console.log('   Evidence: https://nothing.tech/pages/news returns 404');
  console.log('   Historical: Phone (2a) promotion ended April 30, 2024');
  console.log('   Action: Deactivate (mark as UNAVAILABLE)\n');

  const nothingOffers = await NotificationEventModel.find({
    partner: /nothing/i,
    isActive: true,
  });

  console.log(`   Found ${nothingOffers.length} active Nothing Technology offer(s)`);

  for (const offer of nothingOffers) {
    console.log(`   Deactivating: ${offer.title}`);
    console.log(`   Previous state: isActive=${offer.isActive}, status=${offer.status}`);

    await NotificationEventModel.updateOne(
      { _id: offer._id },
      {
        $set: {
          isActive: false,
          status: 'UNAVAILABLE',
          lastCheckedAt: now,
        },
        $inc: { consecutiveMisses: 1 },
      }
    );

    console.log(`   ✅ Updated: isActive=false, status=UNAVAILABLE\n`);
    fixedCount++;
  }

  // 3. Fix Airtel offer
  console.log('3. AIRTEL OFFER');
  console.log('   Issue: Promotion officially ended January 16, 2026');
  console.log('   Evidence: Airtel page redirects to homepage, contains "expired" text');
  console.log('   Official source confirms: "The promotional offer ended on January 16, 2026"');
  console.log('   Current date: September 2026');
  console.log('   Action: Deactivate (mark as EXPIRED)\n');

  const airtelOffers = await NotificationEventModel.find({
    partner: /airtel/i,
    aiProvider: 'perplexity',
    isActive: true,
  });

  console.log(`   Found ${airtelOffers.length} active Airtel offer(s)`);

  for (const offer of airtelOffers) {
    console.log(`   Deactivating: ${offer.title}`);
    console.log(`   Previous state: isActive=${offer.isActive}, status=${offer.status}`);

    await NotificationEventModel.updateOne(
      { _id: offer._id },
      {
        $set: {
          isActive: false,
          status: 'EXPIRED',
          lastCheckedAt: now,
        },
        $inc: { consecutiveMisses: 1 },
      }
    );

    console.log(`   ✅ Updated: isActive=false, status=EXPIRED\n`);
    fixedCount++;
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log(`✅ Fixed ${fixedCount} offer(s)`);
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('IMPORTANT NOTES:');
  console.log('');
  console.log('1. EDUCATION PRO:');
  console.log('   Perplexity Education Pro IS a real current offer');
  console.log('   It is a native Perplexity subscription plan (like Pro, Max)');
  console.log('   50% discount for verified students/educators via SheerID');
  console.log('   It is NOT a UNiDAYS partner bundle');
  console.log('   The UNiDAYS record was incorrect and has been deactivated');
  console.log('');
  console.log('2. NEXT STEPS:');
  console.log('   - Prevent static seeds from recreating these offers');
  console.log('   - Verify public API no longer returns them');
  console.log('   - Run extraction twice to confirm no resurrection');
  console.log('');

  await mongoose.disconnect();
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  fixPerplexityOffers()
    .then(() => {
      console.log('✅ Fix complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Fix failed:', err);
      process.exit(1);
    });
}

export { fixPerplexityOffers };
