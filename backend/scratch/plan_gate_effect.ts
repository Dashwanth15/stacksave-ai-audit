import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const basePrefs = {
  preferOpenSource: false, avoidLockIn: false, maximizeSavings: false,
  preferEstablishedVendors: false, requireZeroRetention: false
};
const build = (o: any): StackBuilderRequest => ({
  domain: 'software-engineering', requirements: [], strategy: 'balanced',
  monthlyBudget: 2000, teamSize: 10, preferences: { ...basePrefs }, ...o
});

const CASES: Array<[string, any]> = [
  ['gov req, ample budget', { domain: 'enterprise-compliance', requirements: ['enterprise-governance', 'enterprise-sso'], teamSize: 20, monthlyBudget: 4000, strategy: 'enterprise-security' }],
  ['gov req, best-value',   { domain: 'enterprise-compliance', requirements: ['enterprise-governance', 'enterprise-sso'], teamSize: 20, monthlyBudget: 4000, strategy: 'best-value' }],
  ['gov req, TINY budget',  { domain: 'enterprise-compliance', requirements: ['enterprise-governance', 'enterprise-sso'], teamSize: 50, monthlyBudget: 200 }],
  ['gov req, $0 budget',    { domain: 'enterprise-compliance', requirements: ['enterprise-governance'], teamSize: 5, monthlyBudget: 0 }],
  ['coder, no gov req',     { domain: 'software-engineering', requirements: ['editor-code-generation'], teamSize: 10, monthlyBudget: 2000 }],
  ['coder, best-value',     { domain: 'software-engineering', requirements: ['editor-code-generation'], teamSize: 10, monthlyBudget: 2000, strategy: 'best-value' }],
];

for (const [label, patch] of CASES) {
  const r = AIStackRecommendationEngine.run(build(patch));
  const s = r.categories.bestOverall.recommendedStack;
  console.log(`\n=== ${label} ===`);
  console.log('  stack:', s.tools.map(t => `${t.toolId}(${t.recommendedPlan} $${t.monthlyCostPerSeat})`).join(' + '), `→ $${s.estimatedMonthlyCost}/mo`);
  console.log('  coverage:', s.requirementCoverage ?? '(n/a)', '  covered:', JSON.stringify(s.tools.map(t => t.featuresCovered)));
  const cov: any = (s as any).coverageAnalysis ?? (s as any).featureCoverage;
  if (cov) console.log('  coverageAnalysis:', JSON.stringify(cov));
  console.log('  gaps:', JSON.stringify((s as any).capabilityGaps ?? (s as any).missingCapabilities ?? []));
}
