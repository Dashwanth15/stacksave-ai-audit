import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const req = {
  domain: 'enterprise-compliance',
  requirements: ['enterprise-governance', 'enterprise-sso'],
  strategy: 'balanced',
  monthlyBudget: 200,
  teamSize: 50,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false }
} as any as StackBuilderRequest;

const r = AIStackRecommendationEngine.run(req);
const s = r.categories.bestOverall.recommendedStack;
for (const t of s.tools) {
  console.log(`${t.role} | ${t.toolId}(${t.recommendedPlan}) covers=${JSON.stringify(t.featuresCovered)}`);
}
console.log('coverageScore', s.coverageResult.coverageScore);
console.log('covered', JSON.stringify(s.coverageResult.covered.map(c => [c.featureKey, c.coveredBy])));
console.log('partial', JSON.stringify(s.coverageResult.partial.map(c => c.featureKey)));
console.log('missing', JSON.stringify(s.coverageResult.missing));
console.log('planGated', JSON.stringify(s.coverageResult.planGated));
