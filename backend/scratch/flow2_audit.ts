/**
 * FLOW 2 FORENSIC AUDIT HARNESS — read-only measurement.
 *
 * One-variable-at-a-time sweeps over exactly the inputs the Build My Stack
 * wizard can produce (8 domains, 8 requirement ids, 4 strategies, 4 preference
 * booleans, team size, budget). Observes only; changes nothing.
 */
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();

// Exactly the ids DOMAIN_OPTIONS exposes in the UI.
const UI_DOMAINS = [
  'software-engineering', 'ai-data-ml', 'research-knowledge', 'product-design',
  'business-operations', 'content-communication', 'enterprise-compliance', 'general-productivity'
];

// Exactly the ids REQUIREMENT_OPTIONS exposes in the UI.
const UI_REQUIREMENTS = [
  'editor-code-generation', 'deep-reasoning-analysis', 'large-document-processing',
  'live-web-research', 'visual-diagram-understanding', 'automated-task-execution',
  'developer-api-access', 'enterprise-governance'
];

const UI_STRATEGIES: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];

const NEUTRAL_PREFS = {
  preferOpenSource: false, avoidLockIn: false, maximizeSavings: false,
  preferEstablishedVendors: false, requireZeroRetention: false
};

function mk(over: Partial<StackBuilderRequest> = {}): StackBuilderRequest {
  return {
    domain: 'software-engineering',
    requirements: ['editor-code-generation'],
    strategy: 'balanced',
    teamSize: 10,
    monthlyBudget: 1000,
    preferences: { ...NEUTRAL_PREFS },
    debug: true,
    ...over
  } as StackBuilderRequest;
}

interface Snap {
  primary: string; secondary: string; optional: string; api: string;
  plan: string; total: number; perSeat: number; coverage: number; confidence: number;
  alts: string[]; altCount: number; rank: string[]; budgetStatus: string;
}

function best(r: any) { return r.categories.bestOverall.recommendedStack; }
function altsOf(r: any): any[] { return r.categories.bestOverall.alternativeComparisons || []; }

function run(req: StackBuilderRequest): Snap {
  const r: any = AIStackRecommendationEngine.run(req);
  const s: any = best(r);
  const alts = altsOf(r);
  const trace: any = r.trace || {};
  return {
    primary: s.primary?.toolId ?? '-',
    secondary: s.secondary?.toolId ?? '-',
    optional: s.optional?.toolId ?? '-',
    api: s.apiLayer?.toolId ?? '-',
    plan: s.primary?.recommendedPlan ?? '-',
    total: s.estimatedMonthlyCost,
    perSeat: s.perSeatMonthlyCost,
    coverage: s.coverageResult?.coverageScore ?? -1,
    confidence: s.confidenceScore,
    alts: alts.map(a => a.stack.tools.map((t: any) => t.toolId).join('+')),
    altCount: alts.length,
    rank: (trace.applicationRanking || []).slice(0, 5).map((x: any) => `${x.id}:${x.composite}`),
    budgetStatus: s.budgetStatus
  };
}

const line = (t: string) => console.log('\n' + '='.repeat(78) + '\n' + t + '\n' + '='.repeat(78));
const fmt = (s: Snap) =>
  `P=${s.primary} S=${s.secondary} O=${s.optional} API=${s.api} plan=${s.plan} ` +
  `$${s.total}/mo perSeat=$${s.perSeat} cov=${s.coverage}% conf=${s.confidence} alts=${s.altCount} [${s.budgetStatus}]`;

// ─── SECTION 1a: DOMAIN ONLY ────────────────────────────────────────────────
line('SECTION 1a — DOMAIN SWEEP (only domain varies; reqs=[deep-reasoning-analysis], balanced, 10 seats, $1000)');
for (const d of UI_DOMAINS) {
  const s = run(mk({ domain: d, requirements: ['deep-reasoning-analysis'] }));
  console.log(`${d.padEnd(24)} ${fmt(s)}`);
  console.log(`${' '.repeat(24)} top5: ${s.rank.join('  ')}`);
}

line('SECTION 1a2 — DOMAIN SWEEP WITH NO REQUIREMENTS (isolates pure domain influence)');
for (const d of UI_DOMAINS) {
  const s = run(mk({ domain: d, requirements: [] }));
  console.log(`${d.padEnd(24)} ${fmt(s)}`);
}

line('SECTION 1a3 — DOMAIN SWEEP WITH THE IDE REQUIREMENT SELECTED (editor-code-generation)');
for (const d of UI_DOMAINS) {
  const s = run(mk({ domain: d, requirements: ['editor-code-generation'] }));
  console.log(`${d.padEnd(24)} ${fmt(s)}`);
}

// ─── SECTION 1b / 3: BUDGET ONLY ────────────────────────────────────────────
line('SECTION 3 — BUDGET SWEEP (software-engineering, [editor-code-generation,deep-reasoning-analysis], balanced, 10 seats)');
for (const b of [0, 50, 100, 250, 500, 1000, 2000, 5000, null] as Array<number | null>) {
  const s = run(mk({ monthlyBudget: b, requirements: ['editor-code-generation', 'deep-reasoning-analysis'] }));
  console.log(`$${String(b ?? 'none').padEnd(6)} ${fmt(s)}`);
}

line('SECTION 3b — BUDGET SWEEP, research domain (no IDE requirement)');
for (const b of [0, 50, 100, 250, 500, 1000, 2000, 5000, null] as Array<number | null>) {
  const s = run(mk({ domain: 'research-knowledge', requirements: ['live-web-research', 'deep-reasoning-analysis'], monthlyBudget: b }));
  console.log(`$${String(b ?? 'none').padEnd(6)} ${fmt(s)}`);
}

// ─── SECTION 1b: TEAM SIZE ONLY ─────────────────────────────────────────────
line('SECTION 1b — TEAM SIZE SWEEP (no budget ceiling, so size cannot be masked by budget)');
for (const t of [1, 5, 15, 20, 50, 100, 250]) {
  const s = run(mk({ teamSize: t, monthlyBudget: null, requirements: ['editor-code-generation', 'deep-reasoning-analysis'] }));
  console.log(`seats=${String(t).padEnd(5)} ${fmt(s)}`);
}
line('SECTION 1b2 — TEAM SIZE SWEEP AT A FIXED $500 CEILING (per-seat allowance shrinks)');
for (const t of [1, 5, 15, 20, 50, 100, 250]) {
  const s = run(mk({ teamSize: t, monthlyBudget: 500, requirements: ['editor-code-generation', 'deep-reasoning-analysis'] }));
  console.log(`seats=${String(t).padEnd(5)} ${fmt(s)}`);
}

// ─── SECTION 1c: REQUIREMENT ABLATION ───────────────────────────────────────
line('SECTION 1c — REQUIREMENT ABLATION (WITHOUT vs WITH, one requirement at a time)');
for (const d of ['software-engineering', 'research-knowledge', 'general-productivity']) {
  console.log(`\n--- domain=${d} ---`);
  const base = run(mk({ domain: d, requirements: [], monthlyBudget: 2000 }));
  console.log(`  BASE (no reqs)                        ${fmt(base)}`);
  for (const r of UI_REQUIREMENTS) {
    const withR = run(mk({ domain: d, requirements: [r], monthlyBudget: 2000 }));
    const changed = [
      withR.primary !== base.primary ? 'PRIMARY' : '',
      withR.secondary !== base.secondary ? 'SECONDARY' : '',
      withR.optional !== base.optional ? 'OPTIONAL' : '',
      withR.api !== base.api ? 'API' : '',
      withR.total !== base.total ? 'COST' : ''
    ].filter(Boolean).join(',') || 'NO-CHANGE';
    console.log(`  +${r.padEnd(34)} ${fmt(withR)}`);
    console.log(`   ${' '.repeat(34)} delta: ${changed}`);
  }
}

// ─── SECTION 4: API LAYER OFF vs ON ─────────────────────────────────────────
line('SECTION 4 — API REQUIREMENT OFF vs ON, and does the API pick vary with the request?');
const apiCases: Array<[string, Partial<StackBuilderRequest>]> = [
  ['api only / se / balanced', { domain: 'software-engineering', requirements: ['developer-api-access'] }],
  ['api+longdoc / ai-data-ml', { domain: 'ai-data-ml', requirements: ['developer-api-access', 'large-document-processing'] }],
  ['api+vision / product-design', { domain: 'product-design', requirements: ['developer-api-access', 'visual-diagram-understanding'] }],
  ['api+research / research', { domain: 'research-knowledge', requirements: ['developer-api-access', 'live-web-research'] }],
  ['api+gov / enterprise', { domain: 'enterprise-compliance', requirements: ['developer-api-access', 'enterprise-governance'] }],
  ['api best-value', { requirements: ['developer-api-access'], strategy: 'best-value' as StackStrategy }],
  ['api max-performance', { requirements: ['developer-api-access'], strategy: 'max-performance' as StackStrategy }],
  ['api enterprise-security', { requirements: ['developer-api-access'], strategy: 'enterprise-security' as StackStrategy }],
  ['api zdr pref', { requirements: ['developer-api-access'], preferences: { ...NEUTRAL_PREFS, requireZeroRetention: true } }],
  ['api tiny budget $100', { requirements: ['developer-api-access'], monthlyBudget: 100 }],
  ['api no ceiling', { requirements: ['developer-api-access'], monthlyBudget: null }]
];
for (const [label, over] of apiCases) {
  const on = run(mk({ monthlyBudget: 2000, ...over }));
  console.log(`${label.padEnd(30)} ${fmt(on)}`);
}
const offCase = run(mk({ requirements: ['deep-reasoning-analysis'], monthlyBudget: 2000 }));
console.log(`${'API OFF (control)'.padEnd(30)} ${fmt(offCase)}`);

// ─── SECTION 5: SECONDARY CONTRIBUTION ──────────────────────────────────────
line('SECTION 5 — SECONDARY PROVIDER CONTRIBUTION (does it add measurable capability?)');
const secCases: Array<[string, Partial<StackBuilderRequest>]> = [
  ['single-shape reqs (IDE only)', { requirements: ['editor-code-generation'] }],
  ['cross-shape reqs (IDE+research)', { requirements: ['editor-code-generation', 'live-web-research'] }],
  ['cross-shape (IDE+vision+gov)', { requirements: ['editor-code-generation', 'visual-diagram-understanding', 'enterprise-governance'] }],
  ['no reqs at all', { requirements: [] }],
  ['no reqs, best-value', { requirements: [], strategy: 'best-value' as StackStrategy }],
  ['all 8 reqs', { requirements: [...UI_REQUIREMENTS] }]
];
for (const [label, over] of secCases) {
  const req = mk({ monthlyBudget: 5000, ...over });
  const r: any = AIStackRecommendationEngine.run(req);
  const s: any = best(r);
  console.log(`\n${label}`);
  console.log(`  tools: ${s.tools.map((t: any) => `${t.role}=${t.toolId}`).join(' | ')}`);
  console.log(`  primary covers   : ${JSON.stringify(s.primary.featuresCovered)}`);
  console.log(`  secondary covers : ${JSON.stringify(s.secondary?.featuresCovered ?? null)}`);
  console.log(`  optional covers  : ${JSON.stringify(s.optional?.featuresCovered ?? null)}`);
  console.log(`  remaining gaps   : ${JSON.stringify(s.coverageResult.missing)} partial=${JSON.stringify(s.coverageResult.partial.map((p: any) => p.featureKey))}`);
}

// ─── SECTION 1d: STRATEGY + PREFERENCES ─────────────────────────────────────
line('SECTION 1d — STRATEGY SWEEP (only strategy varies)');
for (const st of UI_STRATEGIES) {
  const s = run(mk({ strategy: st, requirements: ['editor-code-generation', 'deep-reasoning-analysis'], monthlyBudget: 2000 }));
  console.log(`${st.padEnd(22)} ${fmt(s)}`);
}
line('SECTION 1d2 — PREFERENCE SWEEP (only one boolean flips at a time)');
const baseP = run(mk({ requirements: ['editor-code-generation', 'deep-reasoning-analysis'], monthlyBudget: 2000 }));
console.log(`${'ALL FALSE (base)'.padEnd(28)} ${fmt(baseP)}`);
for (const k of ['preferOpenSource', 'avoidLockIn', 'requireZeroRetention', 'preferEstablishedVendors'] as const) {
  const s = run(mk({
    requirements: ['editor-code-generation', 'deep-reasoning-analysis'], monthlyBudget: 2000,
    preferences: { ...NEUTRAL_PREFS, [k]: true }
  }));
  const delta = s.primary !== baseP.primary || s.secondary !== baseP.secondary || s.total !== baseP.total ? 'CHANGED' : 'no-change';
  console.log(`${k.padEnd(28)} ${fmt(s)}  → ${delta}`);
}

// ─── SECTION 2: WHY DOES CURSOR WIN? RAW SCORE TABLE ────────────────────────
line('SECTION 2 — RAW PROVIDER SCORE TABLE (id, category, key dimensions, cost signals)');
const all = KnowledgeScoringEngine.scoreAll();
console.log(
  'id'.padEnd(16) + 'cat'.padEnd(6) + 'comp'.padEnd(6) + 'code'.padEnd(6) + 'reas'.padEnd(6) +
  'rsch'.padEnd(6) + 'lctx'.padEnd(6) + 'sec'.padEnd(6) + 'cost'.padEnd(6) + 'seat$'.padEnd(8) +
  'costOK'.padEnd(8) + 'bench'.padEnd(7) + 'govOK'
);
for (const p of all) {
  console.log(
    p.id.padEnd(16) + p.category.padEnd(6) +
    String(p.capabilityCompositeScore).padEnd(6) + String(p.codingScore).padEnd(6) +
    String(p.reasoningScore).padEnd(6) + String(p.researchScore).padEnd(6) +
    String(p.longContextScore).padEnd(6) + String(p.securityScore).padEnd(6) +
    String(p.costEfficiencyScore).padEnd(6) + String(p.meaningfulPaidPlanPrice ?? 'null').padEnd(8) +
    String(p.costDataAvailable).padEnd(8) + String(p.benchmarkDataAvailable).padEnd(7) +
    String(p.governanceDataVerified)
  );
}

line('SECTION 2b — capabilityVector keys used by the 8 UI requirements, per provider');
const CAPS = ['autocomplete', 'coding', 'multiFileEditing', 'reasoning', 'planning', 'longContext',
  'largeCodebaseUnderstanding', 'research', 'vision', 'imageUnderstanding', 'aiAgent',
  'functionCalling', 'terminalIntegration', 'api', 'enterpriseSecurity', 'sso'];
console.log('id'.padEnd(16) + CAPS.map(c => c.slice(0, 6).padEnd(7)).join(''));
for (const p of all) {
  console.log(p.id.padEnd(16) + CAPS.map(c => String(p.capabilityVector[c] ?? '-').padEnd(7)).join(''));
}

// ─── SECTION 6: ALTERNATIVES QUALITY ───────────────────────────────────────
line('SECTION 6 — ALTERNATIVE ARCHITECTURES for two very different requests');
for (const [label, over] of [
  ['software-engineering / IDE+reasoning / balanced / $2000', { domain: 'software-engineering', requirements: ['editor-code-generation', 'deep-reasoning-analysis'], monthlyBudget: 2000 }],
  ['research-knowledge / research+longdoc / best-value / $300', { domain: 'research-knowledge', requirements: ['live-web-research', 'large-document-processing'], strategy: 'best-value' as StackStrategy, monthlyBudget: 300 }]
] as Array<[string, Partial<StackBuilderRequest>]>) {
  const r: any = AIStackRecommendationEngine.run(mk(over));
  console.log(`\n### ${label}`);
  console.log(`RECOMMENDED: ${best(r).tools.map((t: any) => t.toolId).join('+')}`);
  for (const a of altsOf(r)) {
    console.log(`  [${a.rankTitle}] ${a.stack.tools.map((t: any) => t.toolId).join('+')} $${a.monthlyCost}/mo cov=${a.requirementCoverage}% match=${a.matchScore} budget=${a.budgetFit}`);
    console.log(`      purposeLabel     : ${a.purposeLabel} / ${a.architectureType}`);
    console.log(`      whyChooseInstead : ${(a.whyChooseInstead || '').slice(0, 120)}`);
    console.log(`      mainAdvantage    : ${(a.mainAdvantage || '').slice(0, 120)}`);
    console.log(`      mainTradeoff     : ${(a.mainTradeoff || '').slice(0, 120)}`);
  }
}

// ─── SECTION 9: DISTRIBUTION OVER THE UI-REACHABLE INPUT SPACE ─────────────
line('SECTION 9 — PRIMARY-WINNER DISTRIBUTION over the FULL UI-reachable space');
const winners = new Map<string, number>();
const secWinners = new Map<string, number>();
const apiWinners = new Map<string, number>();
let n = 0, noSecondary = 0;
const REQ_SUBSETS: string[][] = [
  ['editor-code-generation'],
  ['deep-reasoning-analysis'],
  ['live-web-research'],
  ['large-document-processing'],
  ['visual-diagram-understanding'],
  ['automated-task-execution'],
  ['developer-api-access'],
  ['enterprise-governance'],
  ['editor-code-generation', 'deep-reasoning-analysis'],
  ['live-web-research', 'deep-reasoning-analysis'],
  ['visual-diagram-understanding', 'large-document-processing'],
  ['automated-task-execution', 'developer-api-access'],
  ['enterprise-governance', 'deep-reasoning-analysis']
];
for (const d of UI_DOMAINS) {
  for (const st of UI_STRATEGIES) {
    for (const b of [100, 500, 2000, null] as Array<number | null>) {
      for (const rq of REQ_SUBSETS) {
        const s = run(mk({ domain: d, strategy: st, monthlyBudget: b, requirements: rq, teamSize: 10 }));
        winners.set(s.primary, (winners.get(s.primary) ?? 0) + 1);
        secWinners.set(s.secondary, (secWinners.get(s.secondary) ?? 0) + 1);
        apiWinners.set(s.api, (apiWinners.get(s.api) ?? 0) + 1);
        if (s.secondary === '-') noSecondary++;
        n++;
      }
    }
  }
}
console.log(`scenarios: ${n}`);
console.log('\nPRIMARY:');
[...winners.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`  ${k.padEnd(18)} ${String(v).padStart(5)}  ${((v / n) * 100).toFixed(1)}%`));
console.log(`\nSECONDARY (none in ${noSecondary}/${n} = ${((noSecondary / n) * 100).toFixed(1)}%):`);
[...secWinners.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`  ${k.padEnd(18)} ${String(v).padStart(5)}  ${((v / n) * 100).toFixed(1)}%`));
console.log('\nAPI LAYER:');
[...apiWinners.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) =>
  console.log(`  ${k.padEnd(18)} ${String(v).padStart(5)}  ${((v / n) * 100).toFixed(1)}%`));
