import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';

KnowledgeLoader.initialize();

const req = {
  domain: 'ai-data-ml',
  teamSize: 5,
  monthlyBudget: 100,
  requirements: ['deep-reasoning-analysis', 'editor-code-generation', 'large-document-processing'],
  strategy: 'balanced' as const,
  preferences: {
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: false
  },
  debug: true
};

const res = AIStackRecommendationEngine.run(req);
console.log('BEST OVERALL:');
console.log('Primary:', res.stacks.bestOverall.primary?.toolName, `(${res.stacks.bestOverall.primary?.toolId})`, res.stacks.bestOverall.primary?.recommendedPlan, '$' + res.stacks.bestOverall.primary?.monthlyCostPerSeat);
console.log('Secondary:', res.stacks.bestOverall.secondary?.toolName, `(${res.stacks.bestOverall.secondary?.toolId})`, res.stacks.bestOverall.secondary?.recommendedPlan, '$' + res.stacks.bestOverall.secondary?.monthlyCostPerSeat);
console.log('Total Cost: $' + res.stacks.bestOverall.estimatedMonthlyCost);
console.log('Budget Status:', res.stacks.bestOverall.budgetStatus);
console.log('\nTop 8 Application Providers:');
const trace = (res.trace as any);
for (const p of trace.applicationRanking.slice(0, 8)) {
  console.log(`- ${p.providerId.padEnd(16)}: compositeScore=${p.compositeScore} workflow=${p.workflowScore} featCoverage=${p.featureCoverageScore} costEff=${p.costEfficiencyScore}`);
}
