/**
 * FLOW 2 MECHANISM PROBES — read-only. Confirms the exact code paths behind
 * the observed behaviour (no-op preferences, IDE gate, plan-tier blindness,
 * budget maximisation, freshness metadata).
 */
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { WorkflowEngine } from '../src/audit-engine/services/WorkflowEngine';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();
const all = KnowledgeScoringEngine.scoreAll();
const line = (t: string) => console.log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));

// ── P1: are the 4 preference booleans discriminating at all? ────────────────
line('P1 — PREFERENCE MODIFIER INPUT DATA (is the predicate ever true/false-varying?)');
console.log('id'.padEnd(16) + 'lockInRisk'.padEnd(14) + 'vendStab'.padEnd(10) + 'portability'.padEnd(13) + 'govVerified'.padEnd(13) + 'zdrFlag');
for (const p of all) {
  const models = Array.isArray((p.raw as any).supportedModels) ? (p.raw as any).supportedModels.length : 0;
  const breadth = Math.min(100, models * 20);
  const apiBonus = (p.raw as any).apiSupport ? 25 : 0;
  const familySize = (p as any).vendorProfile?.productFamily?.length ?? 1;
  const familyPenalty = Math.min(20, Math.max(0, familySize - 1) * 7);
  const portability = Math.max(0, Math.min(100, breadth + apiBonus - familyPenalty));
  console.log(
    p.id.padEnd(16) +
    String((p.raw as any).financialProfile?.vendorLockInRisk ?? 'MISSING').padEnd(14) +
    String(p.vendorStabilityScore).padEnd(10) +
    `${portability} (${portability >= 60 ? 'BONUS' : 'none'})`.padEnd(13) +
    String(p.governanceDataVerified).padEnd(13) +
    String((p.raw as any).enterprise?.security?.zeroDataRetention ?? 'MISSING')
  );
}

// ── P2: the IDE category gate ───────────────────────────────────────────────
line('P2 — WHICH PROVIDERS CAN FULLY COVER EACH UI REQUIREMENT (this is the primary gate)');
const UI_REQS = ['editor-code-generation', 'deep-reasoning-analysis', 'large-document-processing',
  'live-web-research', 'visual-diagram-understanding', 'automated-task-execution',
  'developer-api-access', 'enterprise-governance'];
for (const r of UI_REQS) {
  const covered = all.filter(p => StackCoverageAnalyzer.analyze([p], [r]).covered.length === 1).map(p => `${p.id}(${p.category})`);
  const partial = all.filter(p => StackCoverageAnalyzer.analyze([p], [r]).partial.length === 1).map(p => p.id);
  console.log(`\n${r}`);
  console.log(`  FULL   (${covered.length}): ${covered.join(', ') || 'NONE'}`);
  console.log(`  PARTIAL(${partial.length}): ${partial.join(', ') || 'none'}`);
}

// ── P3: domain fit — does WorkflowEngine discriminate? ──────────────────────
line('P3 — WorkflowEngine.calculateSuitability(provider, domain) MATRIX');
const DOMAINS = ['software-engineering', 'ai-data-ml', 'research-knowledge', 'product-design',
  'business-operations', 'content-communication', 'enterprise-compliance', 'general-productivity'];
console.log('id'.padEnd(16) + DOMAINS.map(d => d.slice(0, 7).padEnd(9)).join(''));
for (const p of all) {
  console.log(p.id.padEnd(16) + DOMAINS.map(d => String(WorkflowEngine.calculateSuitability(p.raw, d)).padEnd(9)).join(''));
}

// ── P4: composite score per domain (balanced, no reqs) ──────────────────────
line('P4 — getCompositeScore PER DOMAIN (balanced, no requirements, 10 seats, $1000)');
const weights = KnowledgeLoader.getRecommendationWeights();
console.log('id'.padEnd(16) + DOMAINS.map(d => d.slice(0, 7).padEnd(9)).join(''));
for (const p of all) {
  console.log(p.id.padEnd(16) + DOMAINS.map(d => {
    const req = { domain: d, requirements: [], strategy: 'balanced', teamSize: 10, monthlyBudget: 1000, preferences: {} } as any;
    return String(AIStackRecommendationEngine.getCompositeScore(p, req, weights, 'balanced')).padEnd(9);
  }).join(''));
}

line('P4b — getCompositeScore PER STRATEGY (software-engineering, reqs=[editor-code-generation], $2000)');
const STRATS: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];
console.log('id'.padEnd(16) + STRATS.map(s => s.slice(0, 10).padEnd(12)).join(''));
for (const p of all) {
  console.log(p.id.padEnd(16) + STRATS.map(st => {
    const req = { domain: 'software-engineering', requirements: ['editor-code-generation'], strategy: st, teamSize: 10, monthlyBudget: 2000, preferences: {} } as any;
    return String(AIStackRecommendationEngine.getCompositeScore(p, req, weights, st)).padEnd(12);
  }).join(''));
}

// ── P5: does coverage depend on the PLAN the user is told to buy? ───────────
line('P5 — PLAN-TIER BLINDNESS: same provider, free vs paid plan, same claimed coverage?');
for (const b of [0, 100, 2000] as number[]) {
  const r: any = AIStackRecommendationEngine.run({
    domain: 'software-engineering', requirements: ['editor-code-generation', 'automated-task-execution'],
    strategy: 'balanced', teamSize: 10, monthlyBudget: b,
    preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false },
    debug: true
  } as StackBuilderRequest);
  const s = r.categories.bestOverall.recommendedStack;
  console.log(`$${String(b).padEnd(6)} ${s.primary.toolId} plan="${s.primary.recommendedPlan}" $${s.primary.monthlyCostPerSeat}/seat  coverage=${s.coverageResult.coverageScore}%  covered=${JSON.stringify(s.coverageResult.covered.map((c: any) => c.featureKey))}`);
}
console.log('\nCursor plan catalogue:');
for (const pl of all.find(p => p.id === 'cursor')!.plans) {
  console.log(`  ${String(pl.id).padEnd(14)} ${String(pl.label).padEnd(22)} $${pl.monthlyPricePerSeat}/seat payPerUse=${(pl as any).isPayPerUse}`);
}

// ── P6: budget maximisation under max-performance ───────────────────────────
line('P6 — DOES A BIGGER BUDGET GET SPENT? (max-performance plan selection)');
for (const b of [100, 250, 500, 1000, 2000, 3000, 5000, null] as Array<number | null>) {
  const r: any = AIStackRecommendationEngine.run({
    domain: 'software-engineering', requirements: ['editor-code-generation'],
    strategy: 'max-performance', teamSize: 10, monthlyBudget: b,
    preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false },
    debug: true
  } as StackBuilderRequest);
  const s = r.categories.bestOverall.recommendedStack;
  const util = b ? Math.round((s.estimatedMonthlyCost / b) * 100) : 0;
  console.log(`budget=$${String(b ?? 'none').padEnd(6)} → ${s.primary.toolId} "${s.primary.recommendedPlan}" $${s.estimatedMonthlyCost}/mo  utilisation=${b ? util + '%' : 'n/a'}  conf=${s.confidenceScore}`);
}

// ── P7: freshness metadata + cache identity ────────────────────────────────
line('P7 — KNOWLEDGE FRESHNESS METADATA AS RETURNED TO THE FRONTEND');
const probe: any = AIStackRecommendationEngine.run({
  domain: 'software-engineering', requirements: ['editor-code-generation'], strategy: 'balanced',
  teamSize: 10, monthlyBudget: 1000, preferences: {}, debug: true
} as StackBuilderRequest);
console.log(JSON.stringify(probe.knowledgeVersion, null, 2));
console.log('\ntrace.domainResolution:', JSON.stringify(probe.trace?.domainResolution));
console.log('trace.inputs        :', JSON.stringify(probe.trace?.inputs));
console.log('\nscoreAll() identity stability (cache):');
const a1 = KnowledgeScoringEngine.scoreAll();
const a2 = KnowledgeScoringEngine.scoreAll();
console.log('  same object identity for cursor across two calls:', a1.find(p => p.id === 'cursor') === a2.find(p => p.id === 'cursor'));

// ── P8: mutate a price in memory, does scoring notice without clearCache? ──
line('P8 — DYNAMIC-DATA PROPAGATION: patch a plan price, re-score WITHOUT clearCache()');
const before = KnowledgeScoringEngine.scoreAll().find(p => p.id === 'cursor')!;
console.log(`cursor BEFORE: meaningfulPaidPlanPrice=${before.meaningfulPaidPlanPrice} costEfficiencyScore=${before.costEfficiencyScore}`);
KnowledgeLoader.patchPlansFromDB('cursor', [
  { id: 'pro', label: 'Pro', monthlyPricePerSeat: 999, annualPricePerSeat: 9990, currency: 'USD', features: [], seatMinimum: 1 } as any
]);
const afterNoClear = KnowledgeScoringEngine.scoreAll().find(p => p.id === 'cursor')!;
console.log(`cursor AFTER patch, no clearCache: meaningfulPaidPlanPrice=${afterNoClear.meaningfulPaidPlanPrice} costEfficiencyScore=${afterNoClear.costEfficiencyScore}`);
KnowledgeScoringEngine.clearCache();
const afterClear = KnowledgeScoringEngine.scoreAll().find(p => p.id === 'cursor')!;
console.log(`cursor AFTER clearCache()        : meaningfulPaidPlanPrice=${afterClear.meaningfulPaidPlanPrice} costEfficiencyScore=${afterClear.costEfficiencyScore}`);
