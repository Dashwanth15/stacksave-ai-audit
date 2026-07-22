import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { RelationshipEngine } from '../src/audit-engine/services/RelationshipEngine';
import { ProposalEngine } from '../src/audit-engine/services/ProposalEngine';
import { ToolEntry } from '../src/types';

KnowledgeLoader.initialize();

// Debug ProposalEngine savings test
const mockTools: ToolEntry[] = [
  { toolId: 'cursor', plan: 'pro', monthlySpend: 20, seats: 1, useCase: 'coding' },
  { toolId: 'github-copilot', plan: 'pro', monthlySpend: 10, seats: 1, useCase: 'coding' }
];

console.log('=== ProposalEngine savings test ===');
const clusters = RelationshipEngine.clusterByOverlap(['cursor', 'github-copilot'], 'coding');
console.log('clusters:', JSON.stringify(clusters));

const res = ProposalEngine.evaluateStack(mockTools, 'coding', 'savings');
console.log('\nDecommissioned:', res.decommissionedTools);
console.log('Proposals evaluated:');
res.decisionLog.proposalsEvaluated.forEach(p => {
  console.log(`  ${p.id}: score=${p.businessValueScore}, valid=${p.isValid}, kept=${JSON.stringify(p.keptTools)}`);
  if (p.failedConstraints?.length) console.log(`    FAILED: ${p.failedConstraints.join(', ')}`);
});
