import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const PREFS = ['preferOpenSource', 'avoidLockIn', 'requireZeroRetention', 'preferEstablishedVendors'] as const;
const DOMAINS = ['software-engineering', 'research-knowledge', 'data-analytics', 'enterprise-operations'];
const REQ_SETS: Array<[string, string[]]> = [
  ['no reqs', []],
  ['editor+reason', ['editor-code-generation', 'deep-reasoning-analysis']],
  ['gov+longdoc', ['enterprise-governance', 'large-document-processing']],
];

function build(domain: string, reqs: string[], prefOn: string | null, strategy = 'balanced'): StackBuilderRequest {
  const preferences: any = {
    preferOpenSource: false, avoidLockIn: false, maximizeSavings: false,
    preferEstablishedVendors: false, requireZeroRetention: false
  };
  if (prefOn) preferences[prefOn] = true;
  return { domain, requirements: reqs, strategy: strategy as any, monthlyBudget: 2000, teamSize: 10, preferences, debug: true };
}

function shape(r: any) {
  const s = r.categories.bestOverall.recommendedStack;
  return {
    p: s.primary?.toolId ?? '-',
    s: s.secondary?.toolId ?? '-',
    o: s.optional?.toolId ?? '-',
    a: s.apiLayer?.toolId ?? '-',
    cost: s.estimatedMonthlyCost,
    plan: s.primary?.recommendedPlan
  };
}

console.log('=== PREFERENCE MODIFIER SPREAD (raw modifier per provider, one toggle on) ===');
const all = KnowledgeScoringEngine.scoreAll();
const weights = require('../src/knowledge/recommendation-weights.json');
const getMod = (AIStackRecommendationEngine as any).getPreferenceModifiersNet.bind(AIStackRecommendationEngine);
const hdr = 'provider'.padEnd(16) + PREFS.map(k => k.slice(0, 10).padEnd(12)).join('');
console.log(hdr);
for (const p of all) {
  let line = p.id.padEnd(16);
  for (const k of PREFS) {
    const m = getMod(p, build('software-engineering', [], k), weights);
    line += m.toFixed(2).padEnd(12);
  }
  console.log(line);
}
for (const k of PREFS) {
  const vals = all.map(p => getMod(p, build('software-engineering', [], k), weights));
  console.log(`${k.padEnd(26)} min=${Math.min(...vals).toFixed(2)} max=${Math.max(...vals).toFixed(2)} spread=${(Math.max(...vals) - Math.min(...vals)).toFixed(2)}`);
}

console.log('\n=== SELECTION EFFECT (per domain x requirement set) ===');
let changedCells = 0, totalCells = 0;
const changedBy: Record<string, number> = {};
for (const domain of DOMAINS) {
  for (const [label, reqs] of REQ_SETS) {
    const base = shape(AIStackRecommendationEngine.run(build(domain, reqs, null)));
    console.log(`\n-- ${domain} / ${label} --`);
    console.log(`  BASE                       P=${base.p} S=${base.s} O=${base.o} API=${base.a} $${base.cost} plan=${base.plan}`);
    for (const k of PREFS) {
      const r = shape(AIStackRecommendationEngine.run(build(domain, reqs, k)));
      const diff: string[] = [];
      if (r.p !== base.p) diff.push('PRIMARY');
      if (r.s !== base.s) diff.push('SECONDARY');
      if (r.o !== base.o) diff.push('OPTIONAL');
      if (r.a !== base.a) diff.push('API');
      if (r.cost !== base.cost) diff.push('COST');
      if (r.plan !== base.plan) diff.push('PLAN');
      totalCells++;
      if (diff.length) { changedCells++; changedBy[k] = (changedBy[k] ?? 0) + 1; }
      console.log(`  ${k.padEnd(26)} P=${r.p} S=${r.s} O=${r.o} API=${r.a} $${r.cost} plan=${r.plan} ${diff.length ? '→ ' + diff.join(',') : '→ no-change'}`);
    }
  }
}
console.log(`\nSELECTION-CHANGING CELLS: ${changedCells}/${totalCells}`);
console.log('by toggle:', JSON.stringify(changedBy));
