import { chromium } from 'playwright';
import { extractOfficialPartnerOffers } from './official_pricing_extractor';

async function verifyLivePartnerExtraction() {
  console.log('🚀 Starting Forensic Playwright Live Partner Offer Extraction Test...\n');
  const browser = await chromium.launch({ headless: true });

  try {
    const liveOffers = await extractOfficialPartnerOffers(browser);
    console.log('\n📊 FORENSIC LIVE VERIFICATION RESULTS:');
    console.log('------------------------------------------------------------------------------------------------------------------------------------');
    console.log(
      'Provider'.padEnd(12) +
      'Partner'.padEnd(16) +
      'Official Source'.padEnd(50) +
      'Playwright Live?'.padEnd(18) +
      'Evidence Captured'.padEnd(20) +
      'Status'.padEnd(10) +
      'Last Successful Check'
    );
    console.log('------------------------------------------------------------------------------------------------------------------------------------');

    for (const offer of liveOffers) {
      console.log(
        offer.aiProvider.padEnd(12) +
        offer.partner.padEnd(16) +
        offer.officialSourceUrl.slice(0, 48).padEnd(50) +
        (offer.detectionMethod === 'PLAYWRIGHT_LIVE' ? 'YES' : 'NO').padEnd(18) +
        (offer.evidenceText && offer.evidenceText.length >= 20 ? 'YES' : 'NO').padEnd(20) +
        offer.status.padEnd(10) +
        (offer.lastSuccessfulCheckAt ? new Date(offer.lastSuccessfulCheckAt).toISOString() : 'N/A')
      );
    }
    console.log('------------------------------------------------------------------------------------------------------------------------------------\n');
  } finally {
    await browser.close();
  }
}

verifyLivePartnerExtraction().catch(console.error);
