/**
 * FINAL BEHAVIORAL AUDIT — StackSave Recommendation Engine
 * Runs 6 requirement scenarios (A–F) + budget sensitivity + requirement ablation
 * to verify: requirement influence, budget ceiling, and scoring determinism.
 */

import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';

KnowledgeLoader.initialize();

function header(title: string) {
  const line = '═'.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}`);
}

function runScenario(label: string, params: any) {
  const rec = AIStackRecommendationEngine.run({ ...params, debug: true });
  const stack = rec.categories.bestOverall.recommendedStack;
  const primary = stack.primary;
  const secondary = stack.secondary;
  const optional = stack.optional;
  const apiLayer = stack.apiLayer;
  const trace = rec.trace!;

  const totalCost = stack.estimatedMonthlyCost;
  const budget = params.monthlyBudget;
  const overBudget = budget !== null && totalCost > budget;
  const overBy = overBudget ? totalCost - budget : 0;

  console.log(`\n  SCENARIO: ${label}`);
  console.log(`  Domain: ${params.domain} | Team: ${params.teamSize} | Budget: ${budget !== null ? `$${budget}/mo` : 'Unlimited'} | Strategy: ${params.strategy || 'balanced'}`);
  console.log(`  Requirements: [${(params.requirements || []).join(', ')}]`);
  console.log(`  ─────────────────────────────────────────────────────────────────`);
  console.log(`  PRIMARY   : ${primary.toolName} (${primary.recommendedPlan}) — $${primary.estimatedMonthlyCostPerTeam}/mo | ${primary.category}`);
  if (secondary) console.log(`  SECONDARY : ${secondary.toolName} (${secondary.recommendedPlan}) — $${secondary.estimatedMonthlyCostPerTeam}/mo | ${secondary.category}`);
  if (optional)  console.log(`  OPTIONAL  : ${optional.toolName} (${optional.recommendedPlan}) — $${optional.estimatedMonthlyCostPerTeam}/mo | ${optional.category}`);
  if (apiLayer)  console.log(`  API LAYER : ${apiLayer.toolName} (${apiLayer.recommendedPlan}) — $${apiLayer.estimatedMonthlyCostPerTeam}/mo | ${apiLayer.category}`);
  console.log(`  TOTAL     : $${totalCost}/mo`);
  if (budget !== null) {
    if (overBudget) {
      console.log(`  ⚠ OVER BUDGET by $${overBy} (budget: $${budget}/mo) — FAIL`);
    } else {
      console.log(`  ✓ WITHIN BUDGET ($${totalCost}/$${budget}) — PASS`);
    }
  }
  
  const appRanking = trace.applicationRanking.slice(0, 5);
  console.log(`\n  APPLICATION RANKING (top 5):`);
  for (const p of appRanking) {
    console.log(`    ${p.providerName.padEnd(24)} score=${p.compositeScore}`);
  }

  const apiRanking = trace.apiRanking.slice(0, 3);
  console.log(`\n  API RANKING (top 3):`);
  for (const p of apiRanking) {
    console.log(`    ${p.providerName.padEnd(24)} score=${p.compositeScore}`);
  }

  return { stack, trace, overBudget, totalCost, budget };
}

// ────────────────────────────────────────────────────────────────────────────
// MATRIX A — 6 REQUIREMENT SCENARIOS
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX A — REQUIREMENT SCENARIO COVERAGE');

const scenarios: Record<string, any> = {
  'A. software-engineering + editor-code-generation': {
    domain: 'software-engineering', teamSize: 10, monthlyBudget: 300,
    requirements: ['editor-code-generation'], strategy: 'balanced'
  },
  'B. software-engineering + visual-design': {
    domain: 'software-engineering', teamSize: 10, monthlyBudget: 300,
    requirements: ['visual-design'], strategy: 'balanced'
  },
  'C. research-knowledge + live-web-research': {
    domain: 'research-knowledge', teamSize: 10, monthlyBudget: 300,
    requirements: ['live-web-research'], strategy: 'balanced'
  },
  'D. ai-data-ml + developer-api-access': {
    domain: 'ai-data-ml', teamSize: 10, monthlyBudget: 300,
    requirements: ['developer-api-access'], strategy: 'balanced'
  },
  'E. enterprise-compliance + enterprise-governance': {
    domain: 'enterprise-compliance', teamSize: 20, monthlyBudget: 1000,
    requirements: ['enterprise-governance'], strategy: 'enterprise-security'
  },
  'F. research-knowledge + large-document-processing': {
    domain: 'research-knowledge', teamSize: 10, monthlyBudget: 300,
    requirements: ['large-document-processing'], strategy: 'balanced'
  },
};

let matrixAOverBudget = 0;
for (const [label, params] of Object.entries(scenarios)) {
  const result = runScenario(label, params);
  if (result.overBudget) matrixAOverBudget++;
}

// ────────────────────────────────────────────────────────────────────────────
// MATRIX B — REQUIREMENT ABLATION
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX B — REQUIREMENT ABLATION: Score delta (WITH - WITHOUT requirement)');

const ablationTargets = [
  { requirement: 'live-web-research',         expectedBoostProvider: 'perplexity',    baseParams: { domain: 'research-knowledge', teamSize: 10, monthlyBudget: 500, strategy: 'balanced' } },
  { requirement: 'developer-api-access',       expectedBoostProvider: 'anthropic-api', baseParams: { domain: 'ai-data-ml', teamSize: 10, monthlyBudget: 500, strategy: 'balanced' } },
  { requirement: 'enterprise-governance',      expectedBoostProvider: 'chatgpt',       baseParams: { domain: 'enterprise-compliance', teamSize: 20, monthlyBudget: 2000, strategy: 'enterprise-security' } },
  { requirement: 'visual-design',              expectedBoostProvider: 'chatgpt',       baseParams: { domain: 'product-design', teamSize: 10, monthlyBudget: 500, strategy: 'balanced' } },
  { requirement: 'large-document-processing',  expectedBoostProvider: 'kimi',          baseParams: { domain: 'research-knowledge', teamSize: 10, monthlyBudget: 500, strategy: 'balanced' } },
];

let ablationPassed = 0;
let ablationFailed = 0;

for (const target of ablationTargets) {
  const withoutRec = AIStackRecommendationEngine.run({ ...target.baseParams, requirements: [], debug: true });
  const withoutScore = withoutRec.trace!.allProviderScores.find(p => p.providerId === target.expectedBoostProvider)?.compositeScore ?? 0;

  const withRec = AIStackRecommendationEngine.run({ ...target.baseParams, requirements: [target.requirement], debug: true });
  const withScore = withRec.trace!.allProviderScores.find(p => p.providerId === target.expectedBoostProvider)?.compositeScore ?? 0;

  const delta = withScore - withoutScore;
  const pass = delta > 0;

  console.log(`\n  Requirement: ${target.requirement}`);
  console.log(`  Expected boost → ${target.expectedBoostProvider}`);
  console.log(`  Score WITHOUT req: ${withoutScore}  | Score WITH req: ${withScore}  | Delta: ${delta >= 0 ? '+' : ''}${delta}`);
  console.log(`  ${pass ? '✓ PASS — requirement materially boosts target provider' : '✗ FAIL — requirement has no positive effect on target provider'}`);

  if (pass) ablationPassed++; else ablationFailed++;
}

console.log(`\n  ABLATION SUMMARY: ${ablationPassed} PASS | ${ablationFailed} FAIL`);

// ────────────────────────────────────────────────────────────────────────────
// MATRIX C — HARD BUDGET SENSITIVITY (15 seats, balanced strategy)
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX C — HARD BUDGET SENSITIVITY (15 seats, ai-data-ml, balanced)');
console.log('  [All costs MUST be <= budget since strategy=balanced (non-max-performance)]');
console.log();

const budgetTiers = [0, 50, 100, 200, 400, 1000, 2000];
let budgetPassed = 0;
let budgetFailed = 0;

for (const budget of budgetTiers) {
  const rec = AIStackRecommendationEngine.run({
    domain: 'ai-data-ml',
    teamSize: 15,
    monthlyBudget: budget,
    requirements: ['developer-api-access', 'deep-reasoning-analysis'],
    strategy: 'balanced',
  });

  const stack = rec.categories.bestOverall.recommendedStack;
  const total = stack.estimatedMonthlyCost;
  const overBudget = total > budget;
  const tools = stack.tools.map(t => `${t.toolName}(${t.recommendedPlan}/$${t.estimatedMonthlyCostPerTeam})`).join(' + ');

  const status = overBudget ? '✗ FAIL OVER BUDGET' : '✓ PASS WITHIN';
  const marker = overBudget ? `+$${total - budget}` : `$${budget - total} remaining`;

  console.log(`  Budget $${String(budget).padEnd(6)} → Total $${String(total).padEnd(8)} | ${status} [${marker}]`);
  console.log(`           Stack: ${tools}`);

  if (overBudget) budgetFailed++; else budgetPassed++;
}

console.log(`\n  BUDGET SENSITIVITY SUMMARY: ${budgetPassed} PASS | ${budgetFailed} FAIL`);

// ────────────────────────────────────────────────────────────────────────────
// MATRIX D — MAX-PERFORMANCE
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX D — MAX-PERFORMANCE STRATEGY (budget ceiling is advisory)');

const mpRec = AIStackRecommendationEngine.run({
  domain: 'ai-data-ml',
  teamSize: 15,
  monthlyBudget: 400,
  requirements: ['developer-api-access', 'deep-reasoning-analysis'],
  strategy: 'max-performance',
});

const mpStack = mpRec.categories.bestOverall.recommendedStack;
const mpTotal = mpStack.estimatedMonthlyCost;
const mpBudgetStatus = mpStack.budgetStatus;

console.log(`\n  Max-Performance | 15 seats | $400 budget (advisory)`);
console.log(`  Total Cost: $${mpTotal}/mo`);
console.log(`  Budget Status: ${mpBudgetStatus}`);
console.log(`  ${mpTotal > 400 ? `⚠ OVER BUDGET — expected (max-performance ignores ceiling)` : '✓ Within budget even on max-performance'}`);
console.log(`  Stack: ${mpStack.tools.map(t => `${t.toolName}(${t.recommendedPlan}/$${t.estimatedMonthlyCostPerTeam})`).join(' + ')}`);

// ────────────────────────────────────────────────────────────────────────────
// MATRIX E — DETERMINISM CHECK
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX E — DETERMINISM CHECK (same request → same output x3)');

const deterministicParams = {
  domain: 'software-engineering',
  teamSize: 15,
  monthlyBudget: 400,
  requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
  strategy: 'balanced',
};

const d1 = AIStackRecommendationEngine.run(deterministicParams);
const d2 = AIStackRecommendationEngine.run(deterministicParams);
const d3 = AIStackRecommendationEngine.run(deterministicParams);

const sig1 = d1.categories.bestOverall.recommendedStack.canonicalSignature;
const sig2 = d2.categories.bestOverall.recommendedStack.canonicalSignature;
const sig3 = d3.categories.bestOverall.recommendedStack.canonicalSignature;

console.log(`\n  Run 1: ${sig1}`);
console.log(`  Run 2: ${sig2}`);
console.log(`  Run 3: ${sig3}`);
console.log(`  Determinism: ${sig1 === sig2 && sig2 === sig3 ? '✓ PASS — identical outputs' : '✗ FAIL — non-deterministic'}`);

// ────────────────────────────────────────────────────────────────────────────
// MATRIX F — ZERO BUDGET EDGE CASE
// ────────────────────────────────────────────────────────────────────────────
header('MATRIX F — ZERO BUDGET EDGE CASE (15 seats, $0 budget)');

const zeroRec = AIStackRecommendationEngine.run({
  domain: 'software-engineering',
  teamSize: 15,
  monthlyBudget: 0,
  requirements: ['editor-code-generation'],
  strategy: 'balanced',
});

const zeroStack = zeroRec.categories.bestOverall.recommendedStack;
console.log(`\n  $0 Budget | 15 seats`);
console.log(`  Total Cost: $${zeroStack.estimatedMonthlyCost}/mo`);
console.log(`  Budget Status: ${zeroStack.budgetStatus}`);
console.log(`  Stack: ${zeroStack.tools.map(t => `${t.toolName}(${t.recommendedPlan}/$${t.estimatedMonthlyCostPerTeam})`).join(' + ')}`);
console.log(`  ${zeroStack.estimatedMonthlyCost === 0 ? '✓ PASS — $0 total for $0 budget' : `✗ FAIL — $0 budget returns $${zeroStack.estimatedMonthlyCost} recommendation`}`);

// ────────────────────────────────────────────────────────────────────────────
// FINAL SUMMARY
// ────────────────────────────────────────────────────────────────────────────
header('FINAL AUDIT SUMMARY');
console.log(`  Matrix A — Requirement Scenarios: 6 scenarios | ${matrixAOverBudget === 0 ? '✓ ALL WITHIN BUDGET' : `✗ ${matrixAOverBudget} OVER BUDGET`}`);
console.log(`  Matrix B — Requirement Ablation : ${ablationPassed} PASS | ${ablationFailed} FAIL`);
console.log(`  Matrix C — Budget Sensitivity   : ${budgetPassed} PASS | ${budgetFailed} FAIL`);
console.log(`  Matrix D — Max-Performance      : ${mpTotal > 400 ? '⚠ OVER (expected)' : '✓ WITHIN'}`);
console.log(`  Matrix E — Determinism          : ${sig1 === sig2 && sig2 === sig3 ? '✓ PASS' : '✗ FAIL'}`);
console.log(`  Matrix F — Zero Budget          : ${zeroStack.estimatedMonthlyCost === 0 ? '✓ PASS' : '✗ FAIL'}`);
console.log();

const overallFails = matrixAOverBudget + ablationFailed + budgetFailed
  + (sig1 !== sig2 || sig2 !== sig3 ? 1 : 0)
  + (zeroStack.estimatedMonthlyCost !== 0 ? 1 : 0);

console.log(`  OVERALL: ${overallFails === 0 ? '✓ ALL MATRICES PASS' : `✗ ${overallFails} ISSUE(S) FOUND`}`);
console.log();
