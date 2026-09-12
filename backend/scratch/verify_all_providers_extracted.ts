/**
 * Verification Script: Confirm All Providers Are Extracted
 * 
 * This script runs the official extraction and verifies that ALL providers
 * are actually being scanned (not just the old 16).
 */

import { runOfficialExtraction } from '../scripts/official_pricing_extractor';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION: All Providers Extraction Test                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('Running official extraction with pricing focus (skips partner scan)...\n');
  
  const payload = await runOfficialExtraction('pricing');
  
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  EXTRACTION RESULTS                                                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Total Providers Extracted: ${payload.providers.length}\n`);
  
  // Group by tier
  const tier1 = ['cursor', 'github-copilot', 'deepseek'];
  const tier2Existing = ['claude', 'chatgpt', 'gemini', 'windsurf', 'perplexity', 'openai-api', 'anthropic-api', 'kimi', 'grok', 'antigravity', 'glm', 'muse'];
  const tier2New = ['mistral', 'elevenlabs', 'midjourney', 'runway', 'suno', 'replit-ai', 'gamma', 'heygen', 'synthesia', 'ideogram', 'leonardo-ai', 'poe'];
  const tier3 = ['codex', 'github-models'];
  
  console.log('━━━ TIER 1: Fast Structured (3 providers) ━━━');
  for (const pid of tier1) {
    const provider = payload.providers.find(p => p.providerId === pid);
    if (provider) {
      console.log(`  ✓ ${provider.displayName.padEnd(20)} | Plans: ${provider.plans.length} | Offers: ${provider.offers?.length || 0} | ${provider.status}`);
    } else {
      console.log(`  ✗ ${pid.padEnd(20)} | MISSING FROM EXTRACTION`);
    }
  }
  
  console.log('\n━━━ TIER 2: Playwright Multi-Page - EXISTING (12 providers) ━━━');
  for (const pid of tier2Existing) {
    const provider = payload.providers.find(p => p.providerId === pid);
    if (provider) {
      console.log(`  ✓ ${provider.displayName.padEnd(20)} | Plans: ${provider.plans.length} | Offers: ${provider.offers?.length || 0} | ${provider.status}`);
    } else {
      console.log(`  ✗ ${pid.padEnd(20)} | MISSING FROM EXTRACTION`);
    }
  }
  
  console.log('\n━━━ TIER 2: Playwright Multi-Page - NEW (12 providers) ━━━');
  for (const pid of tier2New) {
    const provider = payload.providers.find(p => p.providerId === pid);
    if (provider) {
      console.log(`  ✓ ${provider.displayName.padEnd(20)} | Plans: ${provider.plans.length} | Offers: ${provider.offers?.length || 0} | ${provider.status}`);
    } else {
      console.log(`  ✗ ${pid.padEnd(20)} | MISSING FROM EXTRACTION`);
    }
  }
  
  console.log('\n━━━ TIER 3: Live-Verified Baseline (2 providers) ━━━');
  for (const pid of tier3) {
    const provider = payload.providers.find(p => p.providerId === pid);
    if (provider) {
      console.log(`  ✓ ${provider.displayName.padEnd(20)} | Plans: ${provider.plans.length} | Offers: ${provider.offers?.length || 0} | ${provider.status}`);
    } else {
      console.log(`  ✗ ${pid.padEnd(20)} | MISSING FROM EXTRACTION`);
    }
  }
  
  // Check for missing providers
  const expectedProviders = [...tier1, ...tier2Existing, ...tier2New, ...tier3];
  const missingProviders = expectedProviders.filter(pid => !payload.providers.find(p => p.providerId === pid));
  
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  VERIFICATION SUMMARY                                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Expected providers: ${expectedProviders.length}`);
  console.log(`Extracted providers: ${payload.providers.length}`);
  console.log(`Missing providers: ${missingProviders.length}`);
  
  if (missingProviders.length > 0) {
    console.log(`\n❌ MISSING: ${missingProviders.join(', ')}`);
  }
  
  // Count offers
  const totalOffers = payload.providers.reduce((sum, p) => sum + (p.offers?.length || 0), 0);
  const providersWithOffers = payload.providers.filter(p => (p.offers?.length || 0) > 0);
  
  console.log(`\nTotal offers discovered: ${totalOffers}`);
  console.log(`Providers with offers: ${providersWithOffers.length}/${payload.providers.length}`);
  
  // List the 12 new providers specifically
  console.log('\n━━━ NEW PROVIDER EXTRACTION STATUS ━━━');
  for (const pid of tier2New) {
    const provider = payload.providers.find(p => p.providerId === pid);
    if (provider) {
      const status = provider.status === 'VERIFIED' ? '✅' : '⚠️';
      const offerCount = provider.offers?.length || 0;
      const offerStatus = offerCount > 0 ? `${offerCount} offer(s)` : 'no offers';
      console.log(`  ${status} ${provider.displayName.padEnd(20)} | ${offerStatus.padEnd(12)} | ${provider.status}`);
    }
  }
  
  if (payload.providers.length >= 29 && missingProviders.length === 0) {
    console.log('\n✅ SUCCESS: All 29 providers are being extracted!');
  } else {
    console.log(`\n❌ FAILURE: Expected 29 providers, got ${payload.providers.length}`);
  }
  
  console.log('\nDONE! 🎯\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
