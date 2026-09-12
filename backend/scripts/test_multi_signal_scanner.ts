import { chromium } from 'playwright';
import { MultiSignalOfferScanner } from '../src/pricing/multiSignalOfferScanner';
import { getProviderSource } from '../src/pricing/sourceRegistry';

const TARGET_PROVIDERS = [
  'mistral',
  'elevenlabs',
  'midjourney',
  'runway',
  'suno',
  'replit-ai',
  'gamma',
  'heygen',
  'synthesia',
  'ideogram',
  'leonardo-ai',
  'poe',
];

async function main() {
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('STACKSAVE AI — MULTI-SIGNAL LIVE DOM OFFER SCANNER AUDIT');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const diagnostics = [];

  for (const pid of TARGET_PROVIDERS) {
    const config = getProviderSource(pid);
    const sourceUrl = config?.pricingUrl || `https://${pid}.com`;
    const displayName = config?.displayName || pid;

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
    });

    const page = await context.newPage();
    const diag = await MultiSignalOfferScanner.scanProviderPage(
      page,
      pid,
      displayName,
      sourceUrl,
      {
        educationUrl: config?.educationUrl,
        startupUrl: config?.startupUrl,
      }
    );

    diagnostics.push(diag);
    await context.close();
  }

  await browser.close();

  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('OFFICIAL MULTI-SIGNAL LIVE EXTRACTION DIAGNOSTIC TABLE');
  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log(
    'Provider'.padEnd(14) +
    'Page Loaded'.padEnd(14) +
    'Candidates'.padEnd(13) +
    'Valid Offers'.padEnd(15) +
    'Status'.padEnd(16) +
    'Outcome / Summary'
  );
  console.log(''.padEnd(120, '-'));

  for (const d of diagnostics) {
    console.log(
      d.providerId.padEnd(14) +
      String(d.pageLoaded).padEnd(14) +
      String(d.candidatesFound).padEnd(13) +
      String(d.qualifyingOffers).padEnd(15) +
      d.status.padEnd(16) +
      d.statusReason
    );
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('EXTRACTED QUALIFYING OFFERS BREAKDOWN:');
  console.log('════════════════════════════════════════════════════════════════════════════════');

  let totalOffers = 0;
  for (const d of diagnostics) {
    if (d.offers.length > 0) {
      console.log(`\n▶ [${d.displayName.toUpperCase()}] (${d.offers.length} offer(s)):`);
      for (const off of d.offers) {
        totalOffers++;
        console.log(`  • Title: "${off.title}"`);
        console.log(`    Discount: ${off.discount} | Eligibility: ${off.eligibility}`);
        console.log(`    Evidence: "${off.evidenceText?.slice(0, 100)}..."`);
        console.log(`    Fingerprint: ${off.fingerprint}`);
      }
    }
  }

  console.log(`\nTOTAL QUALIFYING OFFERS DISCOVERED: ${totalOffers}`);
}

main().catch(console.error);
