import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

KnowledgeLoader.initialize();
const all = KnowledgeScoringEngine.scoreAll();
const K = ['ideIntegration', 'vscodeSupport', 'jetbrainsSupport', 'autocomplete', 'multiFileEditing',
  'coding', 'terminalIntegration', 'api', 'aiAgent', 'functionCalling', 'embeddings',
  'enterpriseSecurity', 'sso', 'research', 'reasoning', 'vision'];

console.log('id'.padEnd(16) + 'cat'.padEnd(6) + K.map(k => k.slice(0, 6).padEnd(7)).join(''));
for (const p of all) {
  console.log(p.id.padEnd(16) + p.category.padEnd(6) + K.map(k => String(p.capabilityVector[k] ?? '-').padEnd(7)).join(''));
}

console.log('\n--- raw provider.json editor-surface fields ---');
for (const p of all) {
  const raw: any = p.raw;
  console.log(
    p.id.padEnd(16) +
    `cat=${String(p.category).padEnd(5)} ` +
    `deliveryModel=${String(raw.deliveryModel ?? raw.productType ?? raw.type ?? 'MISSING').padEnd(14)} ` +
    `surfaces=${JSON.stringify(raw.surfaces ?? raw.interfaces ?? raw.clients ?? null)}`
  );
}
