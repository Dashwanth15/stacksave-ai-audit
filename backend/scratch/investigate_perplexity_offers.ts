/**
 * INVESTIGATION: Perplexity Offers Data Quality Issue
 * 
 * This script examines three incorrect Perplexity offers:
 * 1. UNiDAYS - incorrectly classified as partner bundle (should be Education Pro)
 * 2. Nothing Technology - 404/expired
 * 3. Airtel - officially expired (ended January 16, 2026)
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import dotenv from 'dotenv';

dotenv.config();

async function investigatePerplexityOffers(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('INVESTIGATION: PERPLEXITY OFFERS DATA QUALITY');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // Find all Perplexity-related partner offers
  const perplexityOffers = await NotificationEventModel.find({
    $or: [
      { aiProvider: 'perplexity' },
      { providerId: 'perplexity' },
      { partner: /unidays/i },
      { partner: /nothing/i },
      { partner: /airtel/i },
    ],
  }).lean();

  console.log(`Found ${perplexityOffers.length} Perplexity-related offer(s)\n`);

  for (const offer of perplexityOffers) {
    console.log('────────────────────────────────────────────────────────────────────────────────');
    console.log(`OFFER ID: ${offer._id}`);
    console.log(`Provider: ${offer.providerId || offer.providerName}`);
    console.log(`Partner: ${offer.partner || 'N/A'}`);
    console.log(`Title: ${offer.title}`);
    console.log(`Offer Type: ${offer.offerType || 'N/A'}`);
    console.log(`Is Partner Offer: ${offer.isPartnerOffer}`);
    console.log(`Benefit: ${offer.benefit || offer.discount}`);
    console.log(`Description: ${(offer.description || '').substring(0, 200)}`);
    console.log(`\nStatus: ${offer.status}`);
    console.log(`Is Active: ${offer.isActive}`);
    console.log(`Is Public: ${offer.isPublic}`);
    console.log(`\nOfficial Source URL: ${offer.sourceUrl || offer.officialSourceUrl || 'N/A'}`);
    console.log(`Destination URL: ${offer.destinationUrl || 'N/A'}`);
    console.log(`Source Domain: ${offer.sourceDomain || 'N/A'}`);
    console.log(`\nDetection Method: ${offer.detectionMethod || 'N/A'}`);
    console.log(`Source Type: ${offer.sourceType || 'N/A'}`);
    console.log(`Extractor Version: ${offer.extractorVersion || 'N/A'}`);
    console.log(`\nDetected At: ${offer.detectedAt}`);
    console.log(`Last Confirmed At: ${offer.lastConfirmedAt}`);
    console.log(`Last Checked At: ${offer.lastCheckedAt}`);
    console.log(`Last Successful Check At: ${offer.lastSuccessfulCheckAt || 'N/A'}`);
    console.log(`Consecutive Misses: ${offer.consecutiveMisses}`);
    console.log(`\nEvidence Text: ${(offer.evidenceText || '').substring(0, 300)}`);
    console.log(`Fingerprint: ${offer.fingerprint}`);
    console.log('────────────────────────────────────────────────────────────────────────────────\n');
  }

  // Specific investigations
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('SPECIFIC INVESTIGATIONS');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const unidays = perplexityOffers.find(o => 
    o.partner?.toLowerCase().includes('unidays') || 
    o.title?.toLowerCase().includes('unidays')
  );
  
  const nothing = perplexityOffers.find(o => 
    o.partner?.toLowerCase().includes('nothing')
  );
  
  const airtel = perplexityOffers.find(o => 
    o.partner?.toLowerCase().includes('airtel')
  );

  console.log('1. UNiDAYS Offer:');
  console.log(`   Found: ${!!unidays}`);
  if (unidays) {
    console.log(`   Active: ${unidays.isActive}`);
    console.log(`   Classification: ${unidays.isPartnerOffer ? 'Partner Bundle' : 'Student/Education'}`);
    console.log(`   Source: ${unidays.sourceUrl || unidays.officialSourceUrl}`);
  }
  console.log('');

  console.log('2. Nothing Technology Offer:');
  console.log(`   Found: ${!!nothing}`);
  if (nothing) {
    console.log(`   Active: ${nothing.isActive}`);
    console.log(`   Status: ${nothing.status}`);
    console.log(`   Source: ${nothing.sourceUrl || nothing.officialSourceUrl}`);
    console.log(`   Destination: ${nothing.destinationUrl || 'N/A'}`);
  }
  console.log('');

  console.log('3. Airtel Offer:');
  console.log(`   Found: ${!!airtel}`);
  if (airtel) {
    console.log(`   Active: ${airtel.isActive}`);
    console.log(`   Status: ${airtel.status}`);
    console.log(`   Benefit: ${airtel.benefit || airtel.discount}`);
    console.log(`   Source: ${airtel.sourceUrl || airtel.officialSourceUrl}`);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  investigatePerplexityOffers()
    .then(() => {
      console.log('✅ Investigation complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Investigation failed:', err);
      process.exit(1);
    });
}

export { investigatePerplexityOffers };
