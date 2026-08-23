import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';

KnowledgeLoader.initialize();

console.log('\n========================================================================================');
console.log('TEST GROUP 1: DOMAIN SENSITIVITY (Team: 15, Budget: $400, Req: [deep-reasoning-analysis], Strategy: balanced)');
console.log('========================================================================================');
const domains = [
  { id: 'software-engineering', label: 'Software Engineering' },
  { id: 'ai-data-ml', label: 'AI & Machine Learning' },
  { id: 'research-knowledge', label: 'Research & Knowledge' },
  { id: 'product-design', label: 'Product & Design' },
  { id: 'business-operations', label: 'Business Operations' },
  { id: 'content-communication', label: 'Content & Communication' },
  { id: 'enterprise-compliance', label: 'Enterprise Governance' },
  { id: 'general-productivity', label: 'General Productivity' }
];

for (const d of domains) {
  const rec = AIStackRecommendationEngine.run({
    domain: d.id, teamSize: 15, monthlyBudget: 400, requirements: ['deep-reasoning-analysis'], strategy: 'balanced', preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  console.log(`| ${d.label.padEnd(25)} | ${(stack.primary.toolName + ' (' + stack.primary.recommendedPlan + ')').padEnd(20)} | ${(stack.secondary ? stack.secondary.toolName + ' (' + stack.secondary.recommendedPlan + ')' : 'None').padEnd(20)} | ${('$' + stack.estimatedMonthlyCost + '/mo').padEnd(10)} | ${top3} |`);
}

console.log('\n========================================================================================');
console.log('TEST GROUP 2: REQUIREMENT SENSITIVITY (Domain: Software Eng, Team: 15, Budget: $400, Strategy: balanced)');
console.log('========================================================================================');
const singleReqs = [
  'editor-code-generation',
  'deep-reasoning-analysis',
  'large-document-processing',
  'live-web-research',
  'visual-design',
  'autonomous-terminal',
  'developer-api-access',
  'enterprise-governance'
];

for (const r of singleReqs) {
  const rec = AIStackRecommendationEngine.run({
    domain: 'software-engineering', teamSize: 15, monthlyBudget: 400, requirements: [r], strategy: 'balanced', preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  const specialLayer = stack.apiLayer ? `API: ${stack.apiLayer.toolName}` : stack.optional ? `Optional: ${stack.optional.toolName}` : 'None';
  console.log(`| ${r.padEnd(26)} | ${(stack.primary.toolName + ' (' + stack.primary.recommendedPlan + ')').padEnd(20)} | ${(stack.secondary ? stack.secondary.toolName : 'None').padEnd(12)} | ${specialLayer.padEnd(22)} | ${top3} |`);
}

console.log('\n========================================================================================');
console.log('TEST GROUP 3: STRATEGY SENSITIVITY (Domain: Content, Team: 5, Budget: $100, Req: [large-document-processing, deep-reasoning-analysis])');
console.log('========================================================================================');
const strategies = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];

for (const s of strategies) {
  const rec = AIStackRecommendationEngine.run({
    domain: 'content-communication', teamSize: 5, monthlyBudget: 100, requirements: ['large-document-processing', 'deep-reasoning-analysis'], strategy: s as any, preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  console.log(`| ${s.padEnd(20)} | ${(stack.primary.toolName + ' (' + stack.primary.recommendedPlan + ' · $' + stack.primary.monthlyCostPerSeat + '/seat)').padEnd(30)} | ${('$' + stack.estimatedMonthlyCost + '/mo').padEnd(10)} | ${stack.budgetStatus.padEnd(8)} | ${top3} |`);
}
