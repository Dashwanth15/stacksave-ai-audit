/**
 * VERIFICATION: Public API returns correct offers
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function verifyPublicAPI(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('PUBLIC API VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Simulate the public API query: isActive=true, isPublic=true
  const publicOffers = await NotificationEventModel.find({
    isActive: true,
    isPublic: true,
    $or: [
      { partner: { $exists: true, $ne: null } },
      { isPartnerOffer: true },
    ],
  }).lean();

  console.log(`Total public active partner offers: ${publicOffers.length}\n`);

  // Check for the three problematic offers
  const unidays = publicOffers.find(o => 
    o.partner?.toLowerCase().includes('unidays') || 
    o.title?.toLowerCase().includes('unidays')
  );
  
  const nothing = publicOffers.find(o => 
    o.partner?.toLowerCase().includes('nothing')
  );
  
  const airtel = publicOffers.find(o => 
    o.partner?.toLowerCase().includes('airtel') &&
    o.aiProvider === 'perplexity'
  );

  console.log('VERIFICATION RESULTS:');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  console.log(`✓ UNiDAYS Perplexity offer in public API: ${!!unidays ? '❌ FOUND (BAD)' : '✅ NOT FOUND (GOOD)'}`);
  console.log(`✓ Nothing Technology offer in public API: ${!!nothing ? '❌ FOUND (BAD)' : '✅ NOT FOUND (GOOD)'}`);
  console.log(`✓ Airtel Perplexity offer in public API: ${!!airtel ? '❌ FOUND (BAD)' : '✅ NOT FOUND (GOOD)'}`);
  console.log('────────────────────────────────────────────────────────────────────────────────\n');

  if (unidays || nothing || airtel) {
    console.log('❌ FAILED: Some incorrect offers are still in the public API');
    console.log('');
    if (unidays) {
      console.log('UNiDAYS found:');
      console.log(`   Title: ${unidays.title}`);
      console.log(`   Active: ${unidays.isActive}`);
      console.log(`   Public: ${unidays.isPublic}`);
    }
    if (nothing) {
      console.log('Nothing found:');
      console.log(`   Title: ${nothing.title}`);
      console.log(`   Active: ${nothing.isActive}`);
      console.log(`   Public: ${nothing.isPublic}`);
    }
    if (airtel) {
      console.log('Airtel found:');
      console.log(`   Title: ${airtel.title}`);
      console.log(`   Active: ${airtel.isActive}`);
      console.log(`   Public: ${airtel.isPublic}`);
    }
  } else {
    console.log('✅ SUCCESS: All three incorrect offers are properly excluded from public API');
  }

  // List all active Perplexity-related offers
  const activePerplexity = publicOffers.filter(o => 
    o.aiProvider === 'perplexity' || 
    o.providerId === 'perplexity'
  );

  console.log(`\nActive Perplexity-related partner offers in public API: ${activePerplexity.length}`);
  for (const offer of activePerplexity) {
    console.log(`   → ${offer.partner}: ${offer.title}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

if (require.main === module) {
  verifyPublicAPI()
    .then(() => {
      console.log('✅ Verification complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}

export { verifyPublicAPI };
