import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const testReq: StackBuilderRequest = {
  domain: 'ai-data-ml',
  requirements: [
    'editor-code-generation',
    'deep-reasoning-analysis',
    'large-document-processing'
  ],
  strategy: 'balanced',
  teamSize: 15,
  monthlyBudget: 400,
  preferences: {
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: false,
    requireZeroRetention: false
  },
  debug: true
};

const result = AIStackRecommendationEngine.run(testReq);
console.log('=== BEST OVERALL STACK ===');
console.log('Primary:', result.categories.bestOverall.recommendedStack.primary.toolName, `(${result.categories.bestOverall.recommendedStack.primary.recommendedPlan})`, `$${result.categories.bestOverall.recommendedStack.primary.monthlyCostPerSeat}/seat`);
if (result.categories.bestOverall.recommendedStack.secondary) {
  console.log('Secondary:', result.categories.bestOverall.recommendedStack.secondary.toolName, `(${result.categories.bestOverall.recommendedStack.secondary.recommendedPlan})`, `$${result.categories.bestOverall.recommendedStack.secondary.monthlyCostPerSeat}/seat`);
}
if (result.categories.bestOverall.recommendedStack.optional) {
  console.log('Optional:', result.categories.bestOverall.recommendedStack.optional.toolName);
}
if (result.categories.bestOverall.recommendedStack.apiLayer) {
  console.log('API Layer:', result.categories.bestOverall.recommendedStack.apiLayer.toolName);
}
console.log('Total Monthly Cost:', `$${result.categories.bestOverall.recommendedStack.estimatedMonthlyCost}/mo`);
console.log('Per Seat Cost:', `$${result.categories.bestOverall.recommendedStack.perSeatMonthlyCost}/user/mo`);
console.log('Match Score:', `${result.categories.bestOverall.recommendedStack.confidenceScore}%`);

console.log('\n=== BEST VALUE STACK ===');
console.log('Primary:', result.categories.bestValue.recommendedStack.primary.toolName, `(${result.categories.bestValue.recommendedStack.primary.recommendedPlan})`, `$${result.categories.bestValue.recommendedStack.primary.monthlyCostPerSeat}/seat`);
if (result.categories.bestValue.recommendedStack.secondary) {
  console.log('Secondary:', result.categories.bestValue.recommendedStack.secondary.toolName, `(${result.categories.bestValue.recommendedStack.secondary.recommendedPlan})`, `$${result.categories.bestValue.recommendedStack.secondary.monthlyCostPerSeat}/seat`);
}
console.log('Total Monthly Cost:', `$${result.categories.bestValue.recommendedStack.estimatedMonthlyCost}/mo`);

console.log('\n=== BEST PERFORMANCE STACK ===');
console.log('Primary:', result.categories.bestPerformance.recommendedStack.primary.toolName, `(${result.categories.bestPerformance.recommendedStack.primary.recommendedPlan})`, `$${result.categories.bestPerformance.recommendedStack.primary.monthlyCostPerSeat}/seat`);
if (result.categories.bestPerformance.recommendedStack.secondary) {
  console.log('Secondary:', result.categories.bestPerformance.recommendedStack.secondary.toolName, `(${result.categories.bestPerformance.recommendedStack.secondary.recommendedPlan})`, `$${result.categories.bestPerformance.recommendedStack.secondary.monthlyCostPerSeat}/seat`);
}
console.log('Total Monthly Cost:', `$${result.categories.bestPerformance.recommendedStack.estimatedMonthlyCost}/mo`);

console.log('\n=== ENTERPRISE STACK ===');
console.log('Primary:', result.categories.bestEnterprise.recommendedStack.primary.toolName, `(${result.categories.bestEnterprise.recommendedStack.primary.recommendedPlan})`, `$${result.categories.bestEnterprise.recommendedStack.primary.monthlyCostPerSeat}/seat`);
if (result.categories.bestEnterprise.recommendedStack.secondary) {
  console.log('Secondary:', result.categories.bestEnterprise.recommendedStack.secondary.toolName, `(${result.categories.bestEnterprise.recommendedStack.secondary.recommendedPlan})`, `$${result.categories.bestEnterprise.recommendedStack.secondary.monthlyCostPerSeat}/seat`);
}
console.log('Total Monthly Cost:', `$${result.categories.bestEnterprise.recommendedStack.estimatedMonthlyCost}/mo`);

console.log('\n=== COVERAGE CHECK ===');
for (const c of result.categories.bestOverall.recommendedStack.coverageResult.covered) {
  console.log(`Covered: ${c.featureLabel} -> by ${c.coveredBy.join(', ')}`);
}
