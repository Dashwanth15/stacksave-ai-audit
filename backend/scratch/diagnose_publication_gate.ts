/**
 * Diagnostic Script: Check Publication Gate
 * 
 * For each extracted offer from the 12 providers, check if it would pass
 * the publication gate (isPubliclyVerifiableOffer).
 */

import { chromium, Browser, BrowserContext } from 'playwright';
import { MultiSignalOfferScanner, ProviderExtractionDiagnostics } from '../src/pricing/multiSignalOfferScanner';
import { isPubliclyVerifiableOffer } from '../src/pricing/offerTrust';
import type { NormalizedOffer } from '../src/pricing/types';
import { getProviderSource } from '../src/pricing/sourceRegistry';
import { extractRootDomain } from '../src/pricing/partnerSourceRegistry';

// Local implementation of isRegisteredOfficialSource that includes getProviderSource
function isRegisteredOfficialSource(providerId: string, sourceUrl: string): boolean {
  if (!sourceUrl) return false;
  
  const config = getProviderSource(providerId);
  if (!config) return false;

  const allowedUrls = [
    config.pricingUrl,
    config.offersUrl,
    config.promotionUrl,
    config.educationUrl,
    config.startupUrl,
    config.apiPromotionsUrl,
    config.partnerUrl,
    ...(config.secondaryOfferUrls || []).map((source) => source.url),
  ].filter((url): url is string => Boolean(url));

  const targetHost = extractRootDomain(sourceUrl);
  if (!targetHost) return false;

  for (const allowed of allowedUrls) {
    const allowedHost = extractRootDomain(allowed);
    if (allowedHost && (targetHost === allowedHost || targetHost.endsWith(`.${allowedHost}`))) {
      return true;
    }
  }

  return false;
}

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

interface OfferCheck {
  providerId: string;
  providerDisplayName: string;
  offerTitle: string;
  sourceUrl: string;
  isRegisteredSource: boolean;
  providerStatus: string;
  hasEvidence: boolean;
  evidenceLength: number;
  hasDetectedAt: boolean;
  passesGate: boolean;
  failureReason?: string;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  DIAGNOSTIC AUDIT: Publication Gate Check                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const browser = await chromium.launch({ headless: true });
  const offerChecks: OfferCheck[] = [];

  try {
    for (const provider of PROVIDERS_TO_TEST) {
      console.log(`\n┌─ Checking ${provider.displayName} (${provider.id})`);
      
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
        
        if (diag.offers.length > 0) {
          console.log(`│  Found ${diag.offers.length} offer(s)`);
          
          for (const offer of diag.offers) {
            // Check publication gate components
            const isRegistered = isRegisteredOfficialSource(offer.providerId, offer.sourceUrl);
            const hasEvidence = Boolean(offer.evidenceText?.trim());
            const evidenceLength = offer.evidenceText?.trim().length || 0;
            const hasDetectedAt = Boolean(offer.detectedAt);
            
            // Check if it passes the full gate
            const passesGate = isPubliclyVerifiableOffer(offer, { providerStatus: 'VERIFIED' });
            
            let failureReason: string | undefined;
            if (!passesGate) {
              if (diag.status !== 'VERIFIED') {
                failureReason = `Provider status is ${diag.status}, not VERIFIED`;
              } else if (!isRegistered) {
                failureReason = `Source URL not registered: ${offer.sourceUrl}`;
              } else if (!hasEvidence || evidenceLength < 20) {
                failureReason = `Evidence too short: ${evidenceLength} chars (need >=20)`;
              } else if (!hasDetectedAt) {
                failureReason = 'Missing detectedAt timestamp';
              } else {
                failureReason = 'Unknown validation failure';
              }
            }
            
            offerChecks.push({
              providerId: provider.id,
              providerDisplayName: provider.displayName,
              offerTitle: offer.title,
              sourceUrl: offer.sourceUrl,
              isRegisteredSource: isRegistered,
              providerStatus: diag.status,
              hasEvidence,
              evidenceLength,
              hasDetectedAt,
              passesGate,
              failureReason,
            });
            
            const gateStatus = passesGate ? '✓ PASS' : '✗ FAIL';
            console.log(`│    ${gateStatus} - ${offer.title}`);
            if (!passesGate) {
              console.log(`│       Reason: ${failureReason}`);
            }
            console.log(`│       Registered: ${isRegistered ? '✓' : '✗'}`);
            console.log(`│       Evidence: ${evidenceLength} chars ${hasEvidence && evidenceLength >= 20 ? '✓' : '✗'}`);
            console.log(`│       Timestamp: ${hasDetectedAt ? '✓' : '✗'}`);
          }
        } else {
          console.log(`│  No offers extracted`);
        }
        
      } catch (err: any) {
        console.log(`│  ✗ ERROR: ${err.message}`);
      } finally {
        await context.close();
      }
      
      console.log(`└─────────────────────────────────────────────────────────────────────────┘`);
    }
  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  PUBLICATION GATE SUMMARY                                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
  
  const totalOffers = offerChecks.length;
  const passing = offerChecks.filter(o => o.passesGate).length;
  const failing = offerChecks.filter(o => !o.passesGate).length;
  
  console.log(`Total offers extracted: ${totalOffers}`);
  console.log(`✓ Passing publication gate: ${passing}/${totalOffers} (${Math.round(passing/totalOffers*100)}%)`);
  console.log(`✗ Failing publication gate: ${failing}/${totalOffers} (${Math.round(failing/totalOffers*100)}%)`);
  
  if (failing > 0) {
    console.log('\n\nFAILURE BREAKDOWN:\n');
    const failureReasons = new Map<string, number>();
    for (const check of offerChecks.filter(o => !o.passesGate)) {
      const reason = check.failureReason || 'Unknown';
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
    }
    
    for (const [reason, count] of Array.from(failureReasons.entries()).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count}x: ${reason}`);
    }
    
    console.log('\n\nFAILED OFFERS DETAIL:\n');
    for (const check of offerChecks.filter(o => !o.passesGate)) {
      console.log(`  ✗ ${check.providerId} - ${check.offerTitle}`);
      console.log(`    Reason: ${check.failureReason}`);
      console.log(`    Source: ${check.sourceUrl}`);
    }
  }
  
  if (passing > 0) {
    console.log('\n\n✓ PASSING OFFERS (ready for publication):\n');
    for (const check of offerChecks.filter(o => o.passesGate)) {
      console.log(`  ✓ ${check.providerId} - ${check.offerTitle}`);
    }
  }
  
  console.log('\n\nDONE! 🎯\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
