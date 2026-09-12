/**
 * Quick diagnostic to verify 29 providers are being extracted
 */

import { runOfficialExtraction } from './official_pricing_extractor';

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('EXTRACTION COUNT DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const payload = await runOfficialExtraction('both');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`RESULT: ${payload.providers.length} providers extracted`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Provider List:');
  payload.providers.forEach((p, i) => {
    console.log(`${String(i + 1).padStart(2)}. ${p.displayName.padEnd(25)} (${p.providerId.padEnd(20)}) - ${p.status}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (payload.providers.length >= 29) {
    console.log('✅ SUCCESS: All 29 providers are being extracted');
  } else if (payload.providers.length >= 26) {
    console.log(`⚠️  WARNING: ${payload.providers.length} providers extracted (expected 29)`);
  } else {
    console.log(`❌ FAILURE: Only ${payload.providers.length} providers extracted (expected 29)`);
    process.exit(1);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
