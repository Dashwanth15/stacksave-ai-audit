import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const req: StackBuilderRequest = {
  domain: 'enterprise-compliance',
  requirements: ['enterprise-governance', 'enterprise-sso'],
  strategy: 'best-value',
  monthlyBudget: 4000,
  teamSize: 20,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false },
  debug: true
} as any;

const r = AIStackRecommendationEngine.run(req);
const s = r.categories.bestOverall.recommendedStack;
console.log('tools:', s.tools.map(t => `${t.toolId}(${t.recommendedPlan} $${t.monthlyCostPerSeat}) covers=${JSON.stringify(t.featuresCovered)}`));
console.log('cost:', s.estimatedMonthlyCost, 'coverageScore:', (s as any).coverageScore, 'featureCoveragePercent:', (s as any).featureCoveragePercent);
console.log('\nfull stack keys:', Object.keys(s));
console.log('\ncoverage-ish fields:');
for (const k of Object.keys(s)) {
  if (/cover|gap|missing|requirement/i.test(k)) console.log(' ', k, '=', JSON.stringify((s as any)[k]));
}
console.log('\ntop 6 scores:');
for (const t of (r as any).debug?.allProviderScores?.slice(0, 6) ?? []) {
  console.log(`  ${t.providerId.padEnd(16)} composite=${t.compositeScore} featureCov=${t.featureCoverageScore} budgetFit=${t.budgetFit}`);
}
