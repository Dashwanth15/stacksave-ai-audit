import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

const all = KnowledgeScoringEngine.scoreAll();
const pad = (s: any, n: number) => String(s ?? '-').padEnd(n);

console.log(pad('id', 16) + pad('cat', 6) + pad('lockIn', 8) + pad('stab', 6) + pad('govOK', 7) + pad('zdr', 6) + pad('models', 8) + pad('api', 5) + pad('exitCost', 10) + pad('switchDiff', 12) + pad('founded', 9) + pad('funding', 10));
for (const p of all) {
  const raw: any = p.raw;
  const fp = raw.financialProfile ?? {};
  const vp = raw.vendorProfile ?? {};
  console.log(
    pad(p.id, 16) + pad(p.category, 6) +
    pad(fp.vendorLockInRisk, 8) +
    pad(p.vendorStabilityScore, 6) +
    pad(p.governanceDataVerified, 7) +
    pad(raw.enterprise?.security?.zeroDataRetention, 6) +
    pad(raw.supportedModels?.length, 8) +
    pad(p.capabilityVector['api'], 5) +
    pad(fp.exitCost ?? fp.switchingCost, 10) +
    pad(fp.switchingDifficulty ?? fp.migrationDifficulty, 12) +
    pad(vp.foundedYear ?? vp.founded, 9) +
    pad(vp.fundingStage ?? vp.funding, 10)
  );
}

console.log('\n--- financialProfile keys union ---');
const keys = new Set<string>();
for (const p of all) Object.keys((p.raw as any).financialProfile ?? {}).forEach(k => keys.add(k));
console.log([...keys].join(', '));

console.log('\n--- vendorProfile keys union ---');
const vkeys = new Set<string>();
for (const p of all) Object.keys((p.raw as any).vendorProfile ?? {}).forEach(k => vkeys.add(k));
console.log([...vkeys].join(', '));

console.log('\n--- full vendorProfile + financialProfile per provider ---');
for (const p of all) {
  const raw: any = p.raw;
  console.log(p.id, JSON.stringify({ vendorProfile: raw.vendorProfile, financialProfile: raw.financialProfile }));
}

console.log('\n--- enterprise.security per provider ---');
for (const p of all) {
  console.log(p.id, 'govOK=' + p.governanceDataVerified, JSON.stringify((p.raw as any).enterprise?.security));
}
