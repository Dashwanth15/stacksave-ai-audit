import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { WorkflowEngine } from '../src/audit-engine/services/WorkflowEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();
const allProviders = KnowledgeScoringEngine.scoreAll();
const weights = KnowledgeLoader.getRecommendationWeights();

function printScenario(label: string, req: StackBuilderRequest) {
  console.log(`\n======================================================`);
  console.log(`${label}`);
  console.log(`======================================================`);
  const result = AIStackRecommendationEngine.run(req);

  for (const [key, cat] of Object.entries(result.categories)) {
    const s = cat.recommendedStack;
    const tools = s.tools.map(t => `${t.toolName} [${t.buyingPriority}] (${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ');
    console.log(`\n  --- [${cat.title}] (Strategy: ${cat.strategyUsed}) ---`);
    console.log(`    Primary:     ${s.primary.toolName} (${s.primary.recommendedPlan}, $${s.primary.monthlyCostPerSeat}/seat)`);
    if (s.secondary) {
      console.log(`    Secondary:   ${s.secondary.toolName} (${s.secondary.recommendedPlan}, $${s.secondary.monthlyCostPerSeat}/seat)`);
    }
    if (s.optional) {
      console.log(`    Optional:    ${s.optional.toolName} (${s.optional.recommendedPlan}, $${s.optional.monthlyCostPerSeat}/seat)`);
    }
    if (s.apiLayer) {
      console.log(`    API Layer:   ${s.apiLayer.toolName} (${s.apiLayer.recommendedPlan}, $${s.apiLayer.monthlyCostPerSeat}/seat)`);
    }
    console.log(`    Total Cost:  $${s.perSeatMonthlyCost}/user/mo ($${s.estimatedMonthlyCost}/mo team) | Match: ${s.confidenceScore}%`);
    console.log(`    Why:         ${s.whyThisStack}`);
    
    if (cat.alternativeComparisons && cat.alternativeComparisons.length > 1) {
      console.log(`    Alternatives:`);
      for (const alt of cat.alternativeComparisons.slice(1)) {
        console.log(`      • ${alt.rankTitle}: ${alt.stackSummary} ($${alt.perSeatCost}/user/mo) -> ${alt.mainAdvantage}`);
      }
    }
  }
}

// TEST A: Software Developer
printScenario('TEST A: Software Developer ($500/mo, 10 devs, coding + review)', {
  domain: 'software-engineering',
  requirements: ['editor-code-generation', 'code-completion', 'code-review'],
  strategy: 'balanced',
  teamSize: 10,
  monthlyBudget: 500,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST B: Research / Analysis
printScenario('TEST B: Research / Analysis ($200/mo, 5 users, research + reasoning)', {
  domain: 'research-knowledge',
  requirements: ['live-web-research', 'deep-reasoning-analysis', 'large-document-processing'],
  strategy: 'balanced',
  teamSize: 5,
  monthlyBudget: 200,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST C: AI/ML Engineer
printScenario('TEST C: AI/ML Engineer ($400/mo, 15 users, API access + model integration)', {
  domain: 'ai-data-ml',
  requirements: ['developer-api-access', 'api-access', 'deep-reasoning-analysis'],
  strategy: 'balanced',
  teamSize: 15,
  monthlyBudget: 400,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST D: Enterprise
printScenario('TEST D: Enterprise ($2000/mo, 50 users, security + governance)', {
  domain: 'enterprise-compliance',
  requirements: ['enterprise-governance', 'enterprise-sso', 'hipaa-soc2'],
  strategy: 'enterprise-security',
  teamSize: 50,
  monthlyBudget: 2000,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: true }
});
