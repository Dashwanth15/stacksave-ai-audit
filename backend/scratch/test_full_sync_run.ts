import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../src/services/dbService';
import { runPricingSync } from '../src/pricing/syncOrchestrator';



async function main() {
  console.log('STARTING FULL 13-PROVIDER LIVE PRICING SYNC...\n');
  await connectDB();

  const result = await runPricingSync('test_script');

  console.log('\n========================================================================================');
  console.log('LIVE 13-PROVIDER SYNC EXECUTION SUMMARY');
  console.log('========================================================================================');
  console.log(`Sync Run ID:        ${result.syncRunId}`);
  console.log(`Total Attempted:    ${result.totalProviders} / 13`);
  console.log(`Verified Count:     ${result.successCount}`);
  console.log(`Price Changes:      ${result.priceChangeCount}`);
  console.log(`Failure/Blocked:    ${result.failureCount}`);
  console.log('----------------------------------------------------------------------------------------');

  console.log(
    'Provider'.padEnd(16) +
    'Status'.padEnd(28) +
    'Strategy'.padEnd(18) +
    'Plans'.padEnd(8) +
    'Duration'.padEnd(12) +
    'Reason'
  );
  console.log(''.padEnd(95, '-'));

  for (const p of result.providers) {
    console.log(
      p.displayName.padEnd(16) +
      p.status.padEnd(28) +
      p.strategy.padEnd(18) +
      String(p.plansCount).padEnd(8) +
      `${p.durationMs}ms`.padEnd(12) +
      (p.failureReason?.slice(0, 45) ?? 'Verified')
    );
  }
  console.log('========================================================================================\n');

  await mongoose.disconnect();
  process.exit(0);
}



main().catch((err) => {
  console.error(err);
  process.exit(1);
});
