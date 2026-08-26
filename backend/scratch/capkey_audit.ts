import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

KnowledgeLoader.initialize();
const profiles = KnowledgeScoringEngine.scoreAll();
const vectorKeys = new Set<string>();
for (const p of profiles) for (const k of Object.keys(p.capabilityVector)) vectorKeys.add(k);

const fm = KnowledgeLoader.getFeatureMap();
console.log('vector keys:', [...vectorKeys].sort().join(', '));
console.log('\nfeature-map capabilityKeys missing from EVERY provider vector:');
for (const [key, entry] of Object.entries(fm.features)) {
  const missing = (entry.capabilityKeys || []).filter(k => !vectorKeys.has(k));
  if (missing.length > 0) console.log(`  ${key.padEnd(34)} declares [${(entry.capabilityKeys||[]).join(', ')}]  MISSING: ${missing.join(', ')}`);
}
console.log('\nper-provider undefined counts for declared keys:');
for (const p of profiles) {
  const undef = new Set<string>();
  for (const entry of Object.values(fm.features)) {
    for (const k of entry.capabilityKeys || []) if (p.capabilityVector[k] === undefined) undef.add(k);
  }
  if (undef.size) console.log(`  ${p.id.padEnd(16)} ${[...undef].join(', ')}`);
}
