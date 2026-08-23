import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';

KnowledgeLoader.initialize();

console.log('========================================================================================');
console.log('STACKSAVE BEHAVIORAL PROCUREMENT VALIDATION — 9 COMPREHENSIVE TEST GROUPS');
console.log('========================================================================================\n');

// ── TEST GROUP 1: DOMAIN SENSITIVITY ──────────────────────────────────────────
console.log('─── TEST GROUP 1: DOMAIN SENSITIVITY (Team: 15, Budget: $400, Req: [deep-reasoning-analysis], Strategy: balanced) ───');
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

const group1Results = domains.map(d => {
  const rec = AIStackRecommendationEngine.run({
    domain: d.id,
    teamSize: 15,
    monthlyBudget: 400,
    requirements: ['deep-reasoning-analysis'],
    strategy: 'balanced',
    preferences: {},
    debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  return {
    domain: d.label,
    primary: `${stack.primary.toolName} (${stack.primary.recommendedPlan})`,
    secondary: stack.secondary ? `${stack.secondary.toolName} (${stack.secondary.recommendedPlan})` : 'None',
    totalCost: `$${stack.estimatedMonthlyCost}/mo`,
    budgetStatus: stack.budgetStatus,
    top3
  };
});
console.table(group1Results);

// ── TEST GROUP 2: REQUIREMENT SENSITIVITY ─────────────────────────────────────
console.log('\n─── TEST GROUP 2: REQUIREMENT SENSITIVITY (Domain: Software Eng, Team: 15, Budget: $400, Strategy: balanced) ───');
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

const group2Results = singleReqs.map(reqName => {
  const rec = AIStackRecommendationEngine.run({
    domain: 'software-engineering',
    teamSize: 15,
    monthlyBudget: 400,
    requirements: [reqName],
    strategy: 'balanced',
    preferences: {},
    debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  return {
    requirement: reqName,
    primary: `${stack.primary.toolName} (${stack.primary.recommendedPlan})`,
    secondary: stack.secondary ? `${stack.secondary.toolName} (${stack.secondary.recommendedPlan})` : 'None',
    apiLayer: stack.apiLayer ? `${stack.apiLayer.toolName} (${stack.apiLayer.recommendedPlan})` : 'None',
    optionalTool: stack.optional ? `${stack.optional.toolName} (${stack.optional.recommendedPlan})` : 'None',
    totalCost: `$${stack.estimatedMonthlyCost}/mo`,
    top3
  };
});
console.table(group2Results);

// ── TEST GROUP 3: STRATEGY SENSITIVITY ─────────────────────────────────────────
console.log('\n─── TEST GROUP 3: STRATEGY SENSITIVITY (Domain: Content, Team: 5, Budget: $100, Req: [large-document-processing, deep-reasoning-analysis]) ───');
const strategies = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];

const group3Results = strategies.map(strat => {
  const rec = AIStackRecommendationEngine.run({
    domain: 'content-communication',
    teamSize: 5,
    monthlyBudget: 100,
    requirements: ['large-document-processing', 'deep-reasoning-analysis'],
    strategy: strat as any,
    preferences: {},
    debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  const top3 = rec.trace?.applicationRanking.slice(0, 3).map(p => `${p.providerName} (${p.compositeScore}%)`).join(', ') || '';
  return {
    strategy: strat,
    primary: `${stack.primary.toolName} (${stack.primary.recommendedPlan} · $${stack.primary.monthlyCostPerSeat}/seat)`,
    secondary: stack.secondary ? `${stack.secondary.toolName} (${stack.secondary.recommendedPlan} · $${stack.secondary.monthlyCostPerSeat}/seat)` : 'None',
    totalCost: `$${stack.estimatedMonthlyCost}/mo`,
    budgetStatus: stack.budgetStatus,
    top3
  };
});
console.table(group3Results);

// ── TEST GROUP 4: BUDGET SENSITIVITY ──────────────────────────────────────────
console.log('\n─── TEST GROUP 4: BUDGET SENSITIVITY (Domain: Software Eng, Team: 15, Req: [editor-code-generation, deep-reasoning-analysis], Strategy: balanced) ───');
const budgets = [0, 50, 100, 200, 400, 1000, 2000];

const group4Results = budgets.map(b => {
  const rec = AIStackRecommendationEngine.run({
    domain: 'software-engineering',
    teamSize: 15,
    monthlyBudget: b,
    requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
    strategy: 'balanced',
    preferences: {},
    debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  return {
    budget: `$${b}/mo`,
    primary: `${stack.primary.toolName} (${stack.primary.recommendedPlan})`,
    secondary: stack.secondary ? `${stack.secondary.toolName} (${stack.secondary.recommendedPlan})` : 'None',
    totalCost: `$${stack.estimatedMonthlyCost}/mo`,
    perSeatCost: `$${stack.perSeatMonthlyCost}/seat`,
    budgetFit: stack.budgetStatus,
    fitScore: `${stack.confidenceBreakdown.budgetFit}%`
  };
});
console.table(group4Results);

// ── TEST GROUP 5: TEAM SIZE SENSITIVITY ───────────────────────────────────────
console.log('\n─── TEST GROUP 5: TEAM SIZE SENSITIVITY (Domain: Enterprise Governance, Budget: $2000, Req: [enterprise-governance], Strategy: enterprise-security) ───');
const teamSizes = [1, 5, 15, 50];

const group5Results = teamSizes.map(sz => {
  const rec = AIStackRecommendationEngine.run({
    domain: 'enterprise-compliance',
    teamSize: sz,
    monthlyBudget: 2000,
    requirements: ['enterprise-governance'],
    strategy: 'enterprise-security',
    preferences: {},
    debug: true
  });
  const stack = rec.categories.bestOverall.recommendedStack;
  return {
    teamSize: `${sz} seats`,
    primaryPlan: `${stack.primary.toolName} (${stack.primary.recommendedPlan} · $${stack.primary.monthlyCostPerSeat}/seat)`,
    totalMonthlyCost: `$${stack.estimatedMonthlyCost}/mo`,
    budgetStatus: stack.budgetStatus,
    utilization: `${Math.round((stack.estimatedMonthlyCost / 2000) * 100)}%`
  };
});
console.table(group5Results);

// ── TEST GROUP 6 & 7: ALTERNATIVE QUALITY & DEDUPLICATION ─────────────────────
console.log('\n─── TEST GROUP 6 & 7: ALTERNATIVE QUALITY & DEDUPLICATION ───');
const sampleRec = AIStackRecommendationEngine.run({
  domain: 'software-engineering',
  teamSize: 15,
  monthlyBudget: 400,
  requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
  strategy: 'balanced',
  preferences: {},
  debug: true
});

const alts = sampleRec.categories.bestOverall.alternativeComparisons;
console.log(`Generated ${alts.length} Alternative Architectures for Software Engineering:`);
alts.forEach((alt, idx) => {
  console.log(`  #${idx + 1} [${alt.architectureType || alt.purposeLabel}]`);
  console.log(`     Stack:       ${alt.stackSummary}`);
  console.log(`     Cost:        $${alt.perSeatCost}/seat ($${alt.monthlyCost}/mo) | ${alt.budgetString}`);
  console.log(`     Best For:    ${alt.bestFor}`);
  console.log(`     Advantage:   ${alt.mainAdvantage}`);
  console.log(`     Tradeoff:    ${alt.mainTradeoff}`);
  console.log(`     Why Choose:  ${alt.whyChooseInstead}`);
});

// Check duplicates:
const recSig = [...sampleRec.categories.bestOverall.recommendedStack.tools.map(t => t.toolId)].sort().join('|');
const altSigs = alts.map(a => [...a.stack.tools.map(t => t.toolId)].sort().join('|'));
const hasRecInAlts = altSigs.includes(recSig);
const uniqueAltSigs = new Set(altSigs);
console.log(`\nDeduplication Assertions:`);
console.log(`  - Recommended stack in alternatives? ${hasRecInAlts ? 'FAIL (duplicate found)' : 'PASS (no duplicate)'}`);
console.log(`  - Total alternatives: ${altSigs.length}, Unique provider sets: ${uniqueAltSigs.size} -> ${altSigs.length === uniqueAltSigs.size ? 'PASS (100% unique)' : 'FAIL (duplicates exist)'}`);
