import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();
const scored = KnowledgeScoringEngine.scoreAll();
const weights = KnowledgeLoader.getRecommendationWeights();

const req: StackBuilderRequest = {
  domain: 'ai-data-ml',
  teamSize: 15,
  monthlyBudget: 400,
  requirements: ['developer-api-access', 'deep-reasoning-analysis'],
  strategy: 'max-performance',
  preferences: {
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: true,
    requireZeroRetention: false
  }
};

for (const p of scored) {
  const score = AIStackRecommendationEngine.getCompositeScore(p, req, weights, 'max-performance');
  console.log(`${p.id.padEnd(16)} (cat: ${p.category}) -> composite: ${score}, coding: ${p.codingScore}, reasoning: ${p.reasoningScore}, stab: ${p.vendorStabilityScore}, benchmark: ${p.benchmarkScore}`);
}

const rec = AIStackRecommendationEngine.run(req);
console.log('\n--- RECOMMENDATION ---');
console.log('PRIMARY:', rec.categories.bestOverall.recommendedStack.primary.toolName);
if (rec.categories.bestOverall.recommendedStack.secondary) {
  console.log('SECONDARY:', rec.categories.bestOverall.recommendedStack.secondary.toolName);
}
if (rec.categories.bestOverall.recommendedStack.apiLayer) {
  console.log('API LAYER:', rec.categories.bestOverall.recommendedStack.apiLayer.toolName);
}
console.log('TOTAL COST:', rec.categories.bestOverall.recommendedStack.estimatedMonthlyCost);
console.log('TOTAL ALTS:', rec.categories.bestOverall.alternativeComparisons.length);
rec.categories.bestOverall.alternativeComparisons.forEach((alt, i) => {
  console.log(` Alt #${i+1}: [${alt.purposeLabel}] ${alt.stackSummary} ($${alt.perSeatCost}/seat, $${alt.monthlyCost}/mo) - ${alt.matchScore}% Match`);
});
