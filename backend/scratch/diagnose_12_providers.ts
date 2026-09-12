/**
 * Diagnostic Script: Audit 12 New Providers - Why Zero Offers?
 * 
 * This script runs actual Playwright extraction for the 12 new providers
 * and generates a detailed diagnostic report showing:
 * - HTTP/navigation success
 * - Page loaded status
 * - Body text length
 * - Keywords found
 * - Candidates detected
 * - Qualifying offers
 * - Rejected candidates with reasons
 * - Final extracted offers
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import { MultiSignalOfferScanner, ProviderExtractionDiagnostics } from '../src/pricing/multiSignalOfferScanner';

// Stealth context helper
async function createStealthContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    javaScriptEnabled: true,
  });
}

// Provider configurations
const PROVIDERS_TO_TEST = [
  { id: 'mistral', displayName: 'Mistral AI', sourceUrl: 'https://mistral.ai/technology/#pricing' },
  { id: 'elevenlabs', displayName: 'ElevenLabs', sourceUrl: 'https://elevenlabs.io/pricing' },
  { id: 'midjourney', displayName: 'Midjourney', sourceUrl: 'https://docs.midjourney.com/docs/plans' },
  { id: 'runway', displayName: 'Runway', sourceUrl: 'https://runwayml.com/pricing' },
  { id: 'suno', displayName: 'Suno', sourceUrl: 'https://suno.com/pricing' },
  { id: 'replit-ai', displayName: 'Replit AI', sourceUrl: 'https://replit.com/pricing' },
  { id: 'gamma', displayName: 'Gamma', sourceUrl: 'https://gamma.app/pricing' },
  { id: 'heygen', displayName: 'HeyGen', sourceUrl: 'https://www.heygen.com/pricing' },
  { id: 'synthesia', displayName: 'Synthesia', sourceUrl: 'https://www.synthesia.io/pricing' },
  { id: 'ideogram', displayName: 'Ideogram', sourceUrl: 'https://ideogram.ai/pricing' },
  { id: 'leonardo-ai', displayName: 'Leonardo AI', sourceUrl: 'https://leonardo.ai/pricing' },
  { id: 'poe', displayName: 'Poe', sourceUrl: 'https://poe.com/subscribe' },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  DIAGNOSTIC AUDIT: 12 New Providers - Offer Discovery Pipeline           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const diagnostics: ProviderExtractionDiagnostics[] = [];

  try {
    for (const provider of PROVIDERS_TO_TEST) {
      console.log(`\n┌─ ${provider.displayName} (${provider.id}) ─────────────────────────────────`);
      console.log(`│  Source: ${provider.sourceUrl}`);
      
      const context = await createStealthContext(browser);
      const page = await context.newPage();
      
      try {
        const diag = await MultiSignalOfferScanner.scanProviderPage(
          page,
          provider.id,
          provider.displayName,
          provider.sourceUrl,
          {}
        );
        diagnostics.push(diag);
        
        // Print immediate results
        console.log(`│  ✓ Navigation: ${diag.navSuccess ? 'SUCCESS' : 'FAILED'}`);
        if (diag.navError) {
          console.log(`│    Error: ${diag.navError}`);
        }
        console.log(`│  ✓ Page Loaded: ${diag.pageLoaded ? 'YES' : 'NO'}`);
        console.log(`│  ✓ HTTP Status: ${diag.httpStatus || 'N/A'}`);
        console.log(`│  ✓ Body Text Length: ${diag.bodyTextLength.toLocaleString()} chars`);
        console.log(`│  ✓ Keywords Found: ${diag.keywordsFound.length} (${diag.keywordsFound.slice(0, 5).join(', ')}${diag.keywordsFound.length > 5 ? '...' : ''})`);
        console.log(`│  ✓ Candidates Found: ${diag.candidatesFound}`);
        console.log(`│  ✓ Qualifying Offers: ${diag.qualifyingOffers}`);
        console.log(`│  ✓ Status: ${diag.status} - ${diag.statusReason}`);
        
        if (diag.rejectedCandidates.length > 0) {
          console.log(`│  ✗ Rejected Candidates: ${diag.rejectedCandidates.length}`);
          for (const rejected of diag.rejectedCandidates.slice(0, 3)) {
            console.log(`│    - "${rejected.snippet.slice(0, 60)}..."`);
            console.log(`│      Reason: ${rejected.reason}`);
          }
        }
        
        if (diag.offers.length > 0) {
          console.log(`│  ✓ Extracted Offers:`);
          for (const offer of diag.offers) {
            console.log(`│    - ${offer.title}`);
            console.log(`│      Discount: ${offer.discount}`);
            console.log(`│      Eligibility: ${offer.eligibility}`);
            console.log(`│      Evidence: "${offer.evidenceText?.slice(0, 80)}..."`);
          }
        } else {
          console.log(`│  ℹ No qualifying offers extracted`);
        }
        
      } catch (err: any) {
        console.log(`│  ✗ EXTRACTION ERROR: ${err.message || String(err)}`);
        diagnostics.push({
          providerId: provider.id,
          displayName: provider.displayName,
          sourceUrl: provider.sourceUrl,
          navSuccess: false,
          navError: err.message || String(err),
          pageLoaded: false,
          bodyTextLength: 0,
          keywordsFound: [],
          candidatesFound: 0,
          qualifyingOffers: 0,
          rejectedCandidates: [{ snippet: provider.sourceUrl, reason: `Exception: ${err.message}` }],
          status: 'FETCH_BLOCKED',
          statusReason: err.message || 'Extraction exception',
          offers: [],
          plans: [],
        });
      } finally {
        await context.close();
      }
      
      console.log(`└─────────────────────────────────────────────────────────────────────────┘`);
    }
  } finally {
    await browser.close();
  }

  // Generate summary table
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY TABLE                                                            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log('Provider          | Nav | Loaded | BodyLen | Keywords | Candidates | Offers | Status');
  console.log('------------------|-----|--------|---------|----------|------------|--------|------------------');
  
  for (const diag of diagnostics) {
    const nav = diag.navSuccess ? ' ✓ ' : ' ✗ ';
    const loaded = diag.pageLoaded ? ' ✓ ' : ' ✗ ';
    const bodyLen = `${Math.floor(diag.bodyTextLength / 1000)}k`.padStart(7);
    const keywords = diag.keywordsFound.length.toString().padStart(8);
    const candidates = diag.candidatesFound.toString().padStart(10);
    const offers = diag.qualifyingOffers.toString().padStart(6);
    const status = diag.status.padEnd(12);
    
    console.log(
      `${diag.providerId.padEnd(17)} | ${nav} | ${loaded} | ${bodyLen} | ${keywords} | ${candidates} | ${offers} | ${status}`
    );
  }
  
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ANALYSIS                                                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  
  const successfulNavs = diagnostics.filter(d => d.navSuccess).length;
  const pagesLoaded = diagnostics.filter(d => d.pageLoaded).length;
  const withKeywords = diagnostics.filter(d => d.keywordsFound.length > 0).length;
  const withCandidates = diagnostics.filter(d => d.candidatesFound > 0).length;
  const withOffers = diagnostics.filter(d => d.qualifyingOffers > 0).length;
  
  console.log(`✓ Successful navigations: ${successfulNavs}/12 (${Math.round(successfulNavs/12*100)}%)`);
  console.log(`✓ Pages loaded: ${pagesLoaded}/12 (${Math.round(pagesLoaded/12*100)}%)`);
  console.log(`✓ Keywords detected: ${withKeywords}/12 (${Math.round(withKeywords/12*100)}%)`);
  console.log(`✓ Candidates found: ${withCandidates}/12 (${Math.round(withCandidates/12*100)}%)`);
  console.log(`✓ Qualifying offers: ${withOffers}/12 (${Math.round(withOffers/12*100)}%)`);
  
  console.log('\n\nDETAILED REJECTION REASONS:\n');
  
  const rejectionReasons = new Map<string, number>();
  for (const diag of diagnostics) {
    for (const rejected of diag.rejectedCandidates) {
      const count = rejectionReasons.get(rejected.reason) || 0;
      rejectionReasons.set(rejected.reason, count + 1);
    }
  }
  
  const sortedReasons = Array.from(rejectionReasons.entries()).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of sortedReasons) {
    console.log(`  ${count}x: ${reason}`);
  }
  
  console.log('\n\nDONE! 🎯\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
