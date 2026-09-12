/**
 * MANUAL FIX: Deactivate Broken Offers (Xiaomi, SoftBank)
 * 
 * This script immediately deactivates all known broken offers in MongoDB.
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function deactivateBrokenOffers(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('MANUAL FIX: DEACTIVATING BROKEN OFFERS');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Find all potentially broken offers
  const brokenOffers = await NotificationEventModel.find({
    isActive: true,
    $or: [
      { partner: /xiaomi/i },
      { partner: /softbank/i },
      { sourceUrl: /mi\.com.*support.*faq/i },
      { sourceUrl: /softbank\.jp.*perplexity/i },
    ],
  });

  console.log(`Found ${brokenOffers.length} potentially broken offer(s):\n`);

  let deactivatedCount = 0;

  for (const offer of brokenOffers) {
    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log(`Partner: ${offer.partner}`);
    console.log(`Title: ${offer.title}`);
    console.log(`Source URL: ${offer.sourceUrl}`);
    console.log(`Current Status: isActive=${offer.isActive}, status=${offer.status}`);

    // Deactivate
    await NotificationEventModel.updateOne(
      { _id: offer._id },
      {
        $set: {
          isActive: false,
          status: 'UNAVAILABLE',
          lastCheckedAt: new Date(),
        },
        $inc: { consecutiveMisses: 1 },
      }
    );

    console.log(`✅ DEACTIVATED: isActive=false, status=UNAVAILABLE`);
    console.log('');
    deactivatedCount++;
  }

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`✅ ${deactivatedCount} broken offer(s) deactivated`);
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Verify GET /api/intelligence/offers does NOT return these offers');
  console.log('2. Verify frontend Offers dashboard does NOT display these cards');
  console.log('3. Implement health checks for discovery candidates (Phase 4)');
  console.log('');

  await mongoose.disconnect();
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  deactivateBrokenOffers()
    .then(() => {
      console.log('✅ Fix complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Fix failed:', err);
      process.exit(1);
    });
}

export { deactivateBrokenOffers };
