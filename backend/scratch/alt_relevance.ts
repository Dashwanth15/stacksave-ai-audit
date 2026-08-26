import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

function build(o: Partial<StackBuilderRequest>): StackBuilderRequest {
  return {
    domain: 'software-engineering', requirements: [], strategy: 'balanced',
    monthlyBudget: 2000, teamSize: 10,
    preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false },
    ...o
  } as StackBuilderRequest;
}

const SCENARIOS: Array<[string, Partial<StackBuilderRequest>]> = [
  ['A lean coder, no reqs', { domain: 'software-engineering', teamSize: 3, monthlyBudget: 150 }],
  ['B coder + editor req', { domain: 'software-engineering', requirements: ['editor-code-generation'], teamSize: 5, monthlyBudget: 500 }],
  ['C research, research req', { domain: 'research-knowledge', requirements: ['live-web-research', 'large-document-processing'], teamSize: 8, monthlyBudget: 800 }],
  ['D enterprise gov, 200 seats', { domain: 'enterprise-compliance', requirements: ['enterprise-governance', 'enterprise-sso'], teamSize: 200, monthlyBudget: 20000, strategy: 'enterprise-security' }],
  ['E lockIn preference on', { domain: 'software-engineering', requirements: [], teamSize: 10, preferences: { preferOpenSource: false, avoidLockIn: true, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false } as any }],
  ['F product-design vision', { domain: 'product-design', requirements: ['visual-diagram-understanding'], teamSize: 6, monthlyBudget: 600 }],
];

const proseByField: Record<string, Set<string>> = { mainAdvantage: new Set(), mainTradeoff: new Set(), whyChooseInstead: new Set(), whyNotRecommended: new Set() };
const archetypesPerScenario: Record<string, string[]> = {};

for (const [label, patch] of SCENARIOS) {
  const r = AIStackRecommendationEngine.run(build(patch));
  const alts = r.categories.bestOverall.alternativeComparisons;
  archetypesPerScenario[label] = alts.map(a => a.architectureType);
  console.log(`\n===== ${label} =====`);
  console.log(`alts=${alts.length} archetypes=${alts.map(a => a.architectureType).join(', ')}`);
  for (const a of alts.slice(0, 3)) {
    console.log(`  [${a.architectureType}] ${a.stackSummary} $${a.monthlyCost}`);
    console.log(`    ADV : ${a.mainAdvantage}`);
    console.log(`    TRD : ${a.mainTradeoff}`);
    console.log(`    WHY : ${a.whyChooseInstead}`);
    console.log(`    NOT : ${a.whyNotRecommended}`);
  }
  for (const a of alts) {
    proseByField.mainAdvantage.add(a.mainAdvantage);
    proseByField.mainTradeoff.add(a.mainTradeoff);
    proseByField.whyChooseInstead.add(a.whyChooseInstead);
    proseByField.whyNotRecommended.add(a.whyNotRecommended);
  }
}

console.log('\n===== ARCHETYPE RELEVANCE (does the ladder differ per request?) =====');
const sigs = new Set(Object.values(archetypesPerScenario).map(a => a.join('|')));
for (const [k, v] of Object.entries(archetypesPerScenario)) console.log(`  ${k.padEnd(28)} ${v.length} → ${v.join(', ')}`);
console.log(`distinct ladders: ${sigs.size} / ${SCENARIOS.length}`);

console.log('\n===== PROSE UNIQUENESS =====');
const totalAlts = Object.values(archetypesPerScenario).reduce((s, a) => s + a.length, 0);
for (const [f, set] of Object.entries(proseByField)) {
  console.log(`  ${f.padEnd(20)} ${set.size} distinct strings across ${totalAlts} alternative entries`);
}

console.log('\n===== IRRELEVANT-ARCHETYPE CHECK =====');
for (const [label, arch] of Object.entries(archetypesPerScenario)) {
  const gov = arch.includes('enterprise-governance');
  const open = arch.includes('open-ecosystem');
  console.log(`  ${label.padEnd(28)} enterprise-governance=${gov} open-ecosystem=${open}`);
}
