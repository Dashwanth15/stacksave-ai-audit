import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { WorkflowEngine } from '../src/audit-engine/services/WorkflowEngine';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

KnowledgeLoader.initialize();
const scored = KnowledgeScoringEngine.scoreAll();
console.log(`Loaded ${scored.length} providers.\n`);

for (const p of scored) {
  console.log(`=== ${p.id.toUpperCase()} (${p.name}) ===`);
  console.log(`  Category: ${p.category} | Vendor: ${p.vendor}`);
  console.log(`  Coding: ${p.codingScore}, Reasoning: ${p.reasoningScore}, Writing: ${p.writingScore}, Research: ${p.researchScore}`);
  console.log(`  LongContext: ${p.longContextScore}, Reliability: ${p.reliabilityScore}, Enterprise: ${p.enterpriseScore}, Security: ${p.securityScore}`);
  console.log(`  Plans:`, p.plans.map(pl => `${pl.id} ($${pl.monthlyPricePerSeat}/mo)`).join(', '));
  console.log(`  All capability keys:`, Object.keys(p.raw.capabilities).join(', '));
  console.log('');
}
