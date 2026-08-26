import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const basePrefs = { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false };
const makeReq = (o: any): StackBuilderRequest => ({
  domain: 'software-engineering', requirements: [], strategy: 'balanced',
  monthlyBudget: 900, teamSize: 10, preferences: { ...basePrefs }, ...o
});

const lax = AIStackRecommendationEngine.run(makeReq({
  strategy: 'balanced', requirements: ['editor-code-generation', 'enterprise-governance'], monthlyBudget: 900
}));
const strict = AIStackRecommendationEngine.run(makeReq({
  strategy: 'enterprise-security', requirements: ['editor-code-generation', 'enterprise-governance'],
  monthlyBudget: 900, preferences: { ...basePrefs, requireZeroRetention: true }
}));

for (const [label, r] of [['LAX', lax], ['STRICT', strict]] as const) {
  const s = r.categories.bestEnterprise.recommendedStack;
  console.log(`\n=== ${label} ===`);
  console.log('stack:', s.tools.map(t => `${t.toolId}(${t.recommendedPlan})`).join(' + '), '$' + s.estimatedMonthlyCost);
  console.log('confidenceScore:', s.confidenceScore);
  console.log('breakdown:', JSON.stringify(s.confidenceBreakdown, null, 2));
}
