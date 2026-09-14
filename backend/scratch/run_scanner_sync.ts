import 'dotenv/config';
import { connectDB } from '../src/services/dbService';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';

async function runScan() {
  await connectDB();
  console.log('Running PartnerOfferScanner.runFullScan()...');
  const res = await PartnerOfferScanner.runFullScan(null);
  console.log('Scan completed!');
  console.log('Total Scanned:', res.totalScanned);
  console.log('New Offers:', res.newOffersCount);
  console.log('Updated Offers:', res.updatedOffersCount);
  console.log('Preserved Active:', res.preservedActiveCount);
  console.log('Expired Offers:', res.expiredOffersCount);
  console.log('Errors:', res.errorsCount);
  process.exit(0);
}

runScan().catch(console.error);
