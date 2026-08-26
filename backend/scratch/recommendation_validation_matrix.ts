/**
 * Recommendation scenario validation matrix.
 *
 * Sweeps domains x strategies x budgets x requirement bundles x preferences and reports
 * the resulting provider distribution. Nothing here influences the engine — it only
 * observes which providers the scoring model actually selects.
 */
import fs from 'fs';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();

const DOMAINS = [
  'software-engineering',
  'ai-data-ml',
  'research-knowledge',
  'product-design',
  'business-operations',
  'content-communication',
  'enterprise-compliance',
  'general-productivity'
];

const STRATEGIES: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];
const BUDGETS: Array<number | null> = [0, 50, 100, 300, 500, 1000, 5000, null];

const REQUIREMENT_BUNDLES: Record<string, string[]> = {
  'software-engineering': ['editor-code-generation', 'code-review', 'automated-task-execution'],
  'ai-data-ml': ['developer-api-access', 'deep-reasoning-analysis', 'multi-model'],
  'research-knowledge': ['live-web-research', 'deep-reasoning-analysis', 'large-document-processing'],
  'product-design': ['visual-diagram-understanding', 'chat-interface'],
  'business-operations': ['automated-task-execution', 'chat-interface'],
  'content-communication': ['large-document-processing', 'chat-interface'],
  'enterprise-compliance': ['enterprise-governance', 'enterprise-sso', 'private-deployment'],
  'general-productivity': ['chat-interface', 'memory']
};

// Second sweep: capability sets that deliberately span two product shapes (an in-editor
// capability plus a chat/research capability), which is where a companion tool is
// genuinely required rather than padding.
const CROSS_BUNDLES: Record<string, string[]> = {
  'software-engineering': ['editor-code-generation', 'live-web-research'],
  'ai-data-ml': ['developer-api-access', 'visual-diagram-understanding'],
  'research-knowledge': ['live-web-research', 'code-review'],
  'product-design': ['visual-diagram-understanding', 'editor-code-generation'],
  'business-operations': ['chat-interface', 'code-review'],
  'content-communication': ['large-document-processing', 'code-completion'],
  'enterprise-compliance': ['enterprise-governance', 'editor-code-generation'],
  'general-productivity': ['chat-interface', 'editor-code-generation']
};

const PREF_SETS = [
  { label: 'neutral', preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true, requireZeroRetention: false } },
  { label: 'savings', preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: true, preferEstablishedVendors: false, requireZeroRetention: false } },
  { label: 'open+zdr', preferences: { preferOpenSource: true, avoidLockIn: true, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: true } }
];

const TEAM_SIZES = [1, 5, 10, 40];

interface Tally { primary: number; secondary: number; top3: number; }
const tally = new Map<string, Tally>();
for (const p of KnowledgeScoringEngine.scoreAll()) tally.set(p.id, { primary: 0, secondary: 0, top3: 0 });

const bump = (id: string, field: keyof Tally) => {
  const t = tally.get(id) || { primary: 0, secondary: 0, top3: 0 };
  t[field]++;
  tally.set(id, t);
};

let scenarios = 0;
let coverageFailures = 0;
let constraintDeclared = 0;
const undeclared: string[] = [];
const roleCounts = { secondary: 0, optional: 0, api: 0, primaryHadGap: 0 };
const strategyDivergence: number[] = [];
const perDomainPrimaries = new Map<string, Map<string, number>>();
const perStrategyPrimaries = new Map<string, Map<string, number>>();
const perRequirementPrimaries = new Map<string, Map<string, number>>();
/** scenarioKey -> winning primary provider id, for exact before/after diffing. */
const scenarioWinners: Record<string, string> = {};
for (const s of STRATEGIES) perStrategyPrimaries.set(s, new Map());

const bumpIn = (m: Map<string, Map<string, number>>, outer: string, id: string) => {
  const inner = m.get(outer) || new Map<string, number>();
  inner.set(id, (inner.get(id) || 0) + 1);
  m.set(outer, inner);
};

for (const domain of DOMAINS) {
  perDomainPrimaries.set(domain, new Map());
  for (const strategy of STRATEGIES) {
    for (let i = 0; i < BUDGETS.length; i++) {
      for (const bundle of [REQUIREMENT_BUNDLES[domain], CROSS_BUNDLES[domain]]) {
      const monthlyBudget = BUDGETS[i];
      const pref = PREF_SETS[i % PREF_SETS.length];
      const teamSize = TEAM_SIZES[i % TEAM_SIZES.length];
      const requirements = bundle;

      const req: StackBuilderRequest = {
        domain,
        teamSize,
        monthlyBudget,
        requirements,
        strategy,
        preferences: pref.preferences
      };

      const result = AIStackRecommendationEngine.run(req);
      scenarios++;

      const stack = result.categories.bestOverall.recommendedStack;
      bump(stack.primary.toolId, 'primary');
      if (stack.secondary) bump(stack.secondary.toolId, 'secondary');

      const dm = perDomainPrimaries.get(domain)!;
      dm.set(stack.primary.toolId, (dm.get(stack.primary.toolId) || 0) + 1);
      bumpIn(perStrategyPrimaries, strategy, stack.primary.toolId);
      for (const r of requirements) bumpIn(perRequirementPrimaries, r, stack.primary.toolId);
      scenarioWinners[`${domain}|${strategy}|$${monthlyBudget}|team${teamSize}|${pref.label}|${requirements.join('+')}`] = stack.primary.toolId;

      // Top-3 appearances = distinct providers across the recommended stack plus the two
      // highest-ranked alternative architectures.
      const top3Ids = new Set<string>(stack.tools.map(t => t.toolId));
      for (const alt of result.categories.bestOverall.alternativeComparisons.slice(0, 2)) {
        for (const t of alt.stack.tools) top3Ids.add(t.toolId);
      }
      for (const id of top3Ids) bump(id, 'top3');

      if (stack.coverageResult.missing.length > 0) {
        coverageFailures++;
        if (stack.budgetConstraint) constraintDeclared++;
        else undeclared.push(`${domain}/${strategy}/$${monthlyBudget}/team${teamSize} missing=[${stack.coverageResult.missing.join(',')}]`);
      }
      roleCounts.secondary += stack.secondary ? 1 : 0;
      roleCounts.optional += stack.optional ? 1 : 0;
      roleCounts.api += stack.apiLayer ? 1 : 0;
      const primaryOpen = requirements.length - stack.primary.featuresCovered.filter(f => requirements.includes(f)).length;
      if (primaryOpen > 0) roleCounts.primaryHadGap++;
      }
    }

    // Strategy divergence probe: same inputs, four strategies.
    if (strategy === 'balanced') {
      const sigs = STRATEGIES.map(s => AIStackRecommendationEngine.run({
        domain, teamSize: 10, monthlyBudget: 800,
        requirements: REQUIREMENT_BUNDLES[domain], strategy: s,
        preferences: PREF_SETS[0].preferences
      } as StackBuilderRequest).categories.bestOverall.recommendedStack.canonicalSignature);
      strategyDivergence.push(new Set(sigs).size);
    }
  }
}

console.log(`\nSCENARIOS RUN: ${scenarios}\n`);
console.log('Provider          Primary   Secondary   Top-3   Win %');
console.log('--------------------------------------------------------');
const rows = [...tally.entries()].sort((a, b) => b[1].primary - a[1].primary || a[0].localeCompare(b[0]));
for (const [id, t] of rows) {
  const pct = ((t.primary / scenarios) * 100).toFixed(1).padStart(5);
  console.log(
    `${id.padEnd(17)} ${String(t.primary).padStart(7)} ${String(t.secondary).padStart(11)} ${String(t.top3).padStart(7)} ${pct}%`
  );
}

console.log('\nPRIMARY WINNERS BY DOMAIN');
for (const [domain, m] of perDomainPrimaries) {
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
  console.log(` ${domain.padEnd(23)} ${entries.map(([id, n]) => `${id}(${n})`).join(', ')}`);
}

console.log('\nPRIMARY WINNERS BY STRATEGY');
for (const [strategy, m] of perStrategyPrimaries) {
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
  console.log(` ${strategy.padEnd(23)} ${entries.map(([id, n]) => `${id}(${n})`).join(', ')}`);
}

console.log('\nPRIMARY WINNERS BY REQUIREMENT KEY');
for (const [reqKey, m] of [...perRequirementPrimaries.entries()].sort()) {
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
  console.log(` ${reqKey.padEnd(30)} ${entries.map(([id, n]) => `${id}(${n})`).join(', ')}`);
}

console.log('\nSTRATEGY DIVERGENCE (distinct stacks out of 4 strategies, per domain)');
console.log(` ${strategyDivergence.join(', ')}  — mean ${(strategyDivergence.reduce((a, b) => a + b, 0) / strategyDivergence.length).toFixed(2)}`);

console.log(`\nUNCOVERED-REQUIREMENT SCENARIOS: ${coverageFailures} (declared via budgetConstraint: ${constraintDeclared})`);
for (const u of undeclared) console.log(`   undeclared: ${u}`);
console.log(`\nROLE OCCUPANCY  secondary=${roleCounts.secondary}  optional=${roleCounts.optional}  api=${roleCounts.api}  primaryHadGap=${roleCounts.primaryHadGap}`);
console.log(`DISTINCT PRIMARY WINNERS: ${rows.filter(r => r[1].primary > 0).length} of ${rows.length} providers`);

// ── Scenario-level dump for exact before/after diffing ──────────────────────
const outFile = process.env.MATRIX_OUT || '';
if (outFile) {
  fs.writeFileSync(outFile, JSON.stringify(scenarioWinners, null, 0));
  console.log(`\nscenario winners written to ${outFile} (${Object.keys(scenarioWinners).length} keys)`);
}

// ── Input-sensitivity proof: vary ONE axis at a time from a fixed base ──────
const BASE: StackBuilderRequest = {
  domain: 'software-engineering',
  teamSize: 10,
  monthlyBudget: 500,
  requirements: ['editor-code-generation', 'code-review'],
  strategy: 'balanced',
  preferences: PREF_SETS[0].preferences
};
const sig = (r: StackBuilderRequest) => {
  const s = AIStackRecommendationEngine.run(r).categories.bestOverall.recommendedStack;
  return `${s.primary.toolId}${s.secondary ? ' + ' + s.secondary.toolId : ''}${s.apiLayer ? ' + ' + s.apiLayer.toolId : ''}  $${s.estimatedMonthlyCost}`;
};

console.log('\nINPUT SENSITIVITY (one axis varied, all else fixed)');
console.log(` base                                    -> ${sig(BASE)}`);
console.log(' -- domain --');
for (const d of DOMAINS) console.log(`  domain=${d.padEnd(32)} -> ${sig({ ...BASE, domain: d, requirements: REQUIREMENT_BUNDLES[d] })}`);
console.log(' -- strategy --');
for (const s of STRATEGIES) console.log(`  strategy=${s.padEnd(30)} -> ${sig({ ...BASE, strategy: s })}`);
console.log(' -- budget --');
for (const b of BUDGETS) console.log(`  budget=${String(b).padEnd(32)} -> ${sig({ ...BASE, monthlyBudget: b })}`);
console.log(' -- team size --');
for (const t of [1, 5, 10, 40, 200]) console.log(`  teamSize=${String(t).padEnd(30)} -> ${sig({ ...BASE, teamSize: t })}`);
console.log(' -- preferences --');
for (const p of PREF_SETS) console.log(`  prefs=${p.label.padEnd(33)} -> ${sig({ ...BASE, preferences: p.preferences })}`);
console.log(' -- requirements --');
const REQ_PROBES = [
  ['editor-code-generation'],
  ['editor-code-generation', 'code-review'],
  ['developer-api-access'],
  ['live-web-research'],
  ['deep-reasoning-analysis'],
  ['large-document-processing'],
  ['visual-diagram-understanding'],
  ['automated-task-execution'],
  ['enterprise-governance'],
  ['enterprise-sso'],
  ['multi-model'],
  ['hipaa-soc2'],
  ['private-deployment'],
  ['offline-mode'],
  ['voice'],
  ['github-integration'],
  ['editor-code-generation', 'live-web-research'],
  ['editor-code-generation', 'enterprise-governance']
];
for (const r of REQ_PROBES) console.log(`  req=${r.join('+').padEnd(35)} -> ${sig({ ...BASE, requirements: r })}`);
