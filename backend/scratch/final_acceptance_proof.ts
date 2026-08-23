import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';

KnowledgeLoader.initialize();

console.log('========================================================================================');
console.log('STACKSAVE FINAL PROCUREMENT ACCEPTANCE VERIFICATION');
console.log('========================================================================================\n');

// 1. HARD BUDGET CONSTRAINT VERIFICATION
console.log('─── 1. HARD BUDGET CEILING VALIDATION (15 seats) ───');
const budgetCases = [
  { domain: 'software-engineering', budget: 400, reqs: ['editor-code-generation', 'deep-reasoning-analysis'], strat: 'balanced' },
  { domain: 'ai-data-ml', budget: 400, reqs: ['developer-api-access', 'deep-reasoning-analysis'], strat: 'balanced' },
  { domain: 'content-communication', budget: 100, reqs: ['large-document-processing'], strat: 'best-value' },
  { domain: 'research-knowledge', budget: 300, reqs: ['live-web-research'], strat: 'balanced' }
];

for (const b of budgetCases) {
  const rec = AIStackRecommendationEngine.run({
    domain: b.domain, teamSize: 15, monthlyBudget: b.budget, requirements: b.reqs, strategy: b.strat as any, preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const toolsDesc = stack.tools.map(t => `${t.toolName} (${t.recommendedPlan} · $${t.monthlyCostPerSeat}/seat)`).join(' + ');
  const status = stack.estimatedMonthlyCost <= b.budget ? 'PASS (<= Budget)' : 'FAIL (> Budget)';
  console.log(`[${b.domain}] Budget: $${b.budget}/mo | Stack: ${toolsDesc} | Total: $${stack.estimatedMonthlyCost}/mo | Status: ${status}`);
}

// 2. REQUIREMENT CAPABILITY PROOF (Software Engineering with different requirements)
console.log('\n─── 2. REQUIREMENT SENSITIVITY IN SOFTWARE ENGINEERING ───');
const reqCases = [
  { name: 'editor-code-generation', expected: 'IDE (Cursor/Windsurf)' },
  { name: 'live-web-research', expected: 'Search/Chat (Perplexity/ChatGPT/Claude)' },
  { name: 'visual-design', expected: 'Multimodal (ChatGPT/Claude/Gemini)' },
  { name: 'large-document-processing', expected: 'Long Context (Gemini/Claude)' },
  { name: 'developer-api-access', expected: 'Developer API (Anthropic/OpenAI API)' },
  { name: 'autonomous-terminal', expected: 'Agentic IDE (Windsurf/Cursor)' }
];

for (const r of reqCases) {
  const rec = AIStackRecommendationEngine.run({
    domain: 'software-engineering', teamSize: 15, monthlyBudget: 400, requirements: [r.name], strategy: 'balanced', preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const apiInfo = stack.apiLayer ? ` + API: ${stack.apiLayer.toolName}` : '';
  const optInfo = stack.optional ? ` + Opt: ${stack.optional.toolName}` : '';
  console.log(`Requirement: ${r.name.padEnd(28)} -> Primary: ${stack.primary.toolName.padEnd(12)} (Category: ${stack.primary.category})${apiInfo}${optInfo}`);
}

// 3. DOMAIN DIFFERENTIATION PROOF
console.log('\n─── 3. DOMAIN DIFFERENTIATION PROOF ───');
const testDomains = [
  'software-engineering',
  'research-knowledge',
  'ai-data-ml',
  'content-communication',
  'enterprise-compliance'
];

for (const d of testDomains) {
  const rec = AIStackRecommendationEngine.run({
    domain: d, teamSize: 15, monthlyBudget: 400, requirements: ['deep-reasoning-analysis'], strategy: 'balanced', preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  console.log(`Domain: ${d.padEnd(24)} -> Primary: ${stack.primary.toolName} (${stack.primary.category}) · Total: $${stack.estimatedMonthlyCost}/mo`);
}

// 4. STRATEGY DIFFERENTIATION PROOF
console.log('\n─── 4. STRATEGY DIFFERENTIATION PROOF (Content & Communication, 5 seats, $200 budget) ───');
const testStrats = ['best-value', 'balanced', 'max-performance', 'enterprise-security'];
for (const s of testStrats) {
  const rec = AIStackRecommendationEngine.run({
    domain: 'content-communication', teamSize: 5, monthlyBudget: 200, requirements: ['large-document-processing', 'deep-reasoning-analysis'], strategy: s as any, preferences: {}, debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  console.log(`Strategy: ${s.padEnd(20)} -> Primary: ${stack.primary.toolName} (${stack.primary.recommendedPlan} · $${stack.primary.monthlyCostPerSeat}/seat) · Total: $${stack.estimatedMonthlyCost}/mo`);
}
