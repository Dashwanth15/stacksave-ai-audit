/**
 * VERIFICATION: Check All Active Offers
 * 
 * This script lists all currently active offers in MongoDB
 * to verify Xiaomi and SoftBank remain inactive.
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function checkAllActiveOffers(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION: ALL ACTIVE OFFERS IN DATABASE');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Get all partner offers (both active and inactive)
  // Note: Partner offers don't have eventType field, they're distinguished by having a partner field
  const allOffers = await NotificationEventModel.find({
    partner: { $exists: true, $ne: null },
  }).sort({ isActive: -1, partner: 1 });

  console.log(`Total partner offers in database: ${allOffers.length}\n`);

  const activeOffers = allOffers.filter(o => o.isActive);
  const inactiveOffers = allOffers.filter(o => !o.isActive);

  console.log(`✅ ACTIVE OFFERS: ${activeOffers.length}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');
  
  for (const offer of activeOffers) {
    console.log(`${offer.partner.padEnd(25)} | ${offer.title.substring(0, 50).padEnd(50)} | ${offer.sourceUrl?.substring(0, 60) || 'N/A'}`);
  }

  console.log('\n');
  console.log(`❌ INACTIVE OFFERS: ${inactiveOffers.length}`);
  console.log('────────────────────────────────────────────────────────────────────────────────');
  
  for (const offer of inactiveOffers) {
    console.log(`${offer.partner.padEnd(25)} | ${offer.status?.padEnd(12)} | ${offer.title.substring(0, 40).padEnd(40)} | ${offer.sourceUrl?.substring(0, 50) || 'N/A'}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  
  // Specifically check Xiaomi and SoftBank
  const xiaomi = allOffers.filter(o => o.partner.toLowerCase().includes('xiaomi'));
  const softbank = allOffers.filter(o => o.partner.toLowerCase().includes('softbank'));

  console.log('\n🔍 SPECIFIC CHECK: Xiaomi & SoftBank');
  console.log('────────────────────────────────────────────────────────────────────────────────');
  
  if (xiaomi.length > 0) {
    for (const offer of xiaomi) {
      const status = offer.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      console.log(`Xiaomi: ${status} | status=${offer.status} | ${offer.sourceUrl}`);
    }
  } else {
    console.log('Xiaomi: No offers found in database');
  }

  if (softbank.length > 0) {
    for (const offer of softbank) {
      const status = offer.isActive ? '🟢 ACTIVE' : '🔴 INACTIVE';
      console.log(`SoftBank: ${status} | status=${offer.status} | ${offer.sourceUrl}`);
    }
  } else {
    console.log('SoftBank: No offers found in database');
  }

  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  checkAllActiveOffers()
    .then(() => {
      console.log('✅ Verification complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}

export { checkAllActiveOffers };
