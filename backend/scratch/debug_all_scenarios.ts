// ============================================================
// Comprehensive Pipeline Debugger & Trace Script
// ============================================================

import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { WorkflowEngine } from '../src/audit-engine/services/WorkflowEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();
const allProviders = KnowledgeScoringEngine.scoreAll();
const weights = KnowledgeLoader.getRecommendationWeights();

function debugScenario(name: string, req: StackBuilderRequest) {
  console.log(`\n========================================================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Domain: ${req.domain} | Team: ${req.teamSize} | Budget: $${req.monthlyBudget ?? 'Unlimited'} | Reqs: ${req.requirements?.join(', ')}`);
  console.log(`========================================================================`);

  const strategies: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];

  for (const strategy of strategies) {
    console.log(`\n--- STRATEGY: ${strategy.toUpperCase()} ---`);

    // Rank all providers
    const scoredList = allProviders.map(p => {
      const isApi = p.category === 'api';
      const wantsApi = req.requirements?.includes('developer-api-access') || req.requirements?.includes('api-access');
      const isEligiblePrimary = !isApi || wantsApi;

      const domainScore = WorkflowEngine.calculateSuitability(p.raw, req.domain || 'general');
      const reqScore = StackCoverageAnalyzer.computeProviderCoverageScore(p, req.requirements || []);
      const compScore = AIStackRecommendationEngine.getCompositeScore(p, req, weights, strategy);

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        isEligiblePrimary,
        domainScore,
        reqScore,
        costEff: p.costEfficiencyScore,
        security: p.securityScore,
        benchmarks: p.benchmarkScore,
        compScore,
        rejectReason: !isEligiblePrimary ? 'Developer API (cannot be primary for human workflow)' : ''
      };
    }).sort((a, b) => b.compScore - a.compScore);

    console.log(`Provider Rankings:`);
    for (const p of scoredList) {
      console.log(`  • ${p.name.padEnd(16)} [${p.category.padEnd(6)}] | Final: ${String(p.compScore).padStart(3)}% | Domain: ${String(p.domainScore).padStart(3)}% | Reqs: ${String(p.reqScore).padStart(3)}% | CostEff: ${String(p.costEff).padStart(3)}% | Sec: ${String(p.security).padStart(3)}% | PrimaryEligible: ${p.isEligiblePrimary ? 'YES' : 'NO (' + p.rejectReason + ')'}`);
    }
  }

  // Run full recommendation pipeline
  const result = AIStackRecommendationEngine.run(req);

  console.log(`\n>>> FINAL ASSEMBLED STACKS <<<`);
  for (const [catKey, cat] of Object.entries(result.categories)) {
    const stack = cat.recommendedStack;
    const toolsStr = stack.tools.map(t => `${t.toolName} (${t.buyingPriority}, ${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ');
    console.log(`  [${cat.title}]`);
    console.log(`    Stack: ${toolsStr}`);
    console.log(`    Total: $${stack.perSeatMonthlyCost}/user/mo ($${stack.estimatedMonthlyCost}/mo team) | Match: ${stack.confidenceScore}%`);
    console.log(`    Why:   ${stack.whyThisStack}`);
    if (cat.alternativeComparisons && cat.alternativeComparisons.length > 1) {
      console.log(`    Alternatives:`);
      for (const alt of cat.alternativeComparisons.slice(1)) {
        console.log(`      ${alt.rankTitle}: ${alt.stackSummary} ($${alt.perSeatCost}/user/mo) -> ${alt.mainAdvantage}`);
      }
    }
  }
}

// ── TEST CASES ───────────────────────────────────────────────────────────────

// TEST A: Software Developer
debugScenario('TEST A: Software Developer ($500/mo, 10 devs, in-editor coding)', {
  domain: 'software-engineering',
  requirements: ['editor-code-generation', 'code-completion', 'code-review'],
  strategy: 'balanced',
  teamSize: 10,
  monthlyBudget: 500,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST B: Research / Analysis
debugScenario('TEST B: Research / Analysis ($200/mo, 5 users, research + reasoning)', {
  domain: 'research-knowledge',
  requirements: ['live-web-research', 'deep-reasoning-analysis', 'large-document-processing'],
  strategy: 'balanced',
  teamSize: 5,
  monthlyBudget: 200,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST C: AI/ML Engineer
debugScenario('TEST C: AI/ML Engineer ($400/mo, 15 users, API access + model integration)', {
  domain: 'ai-data-ml',
  requirements: ['developer-api-access', 'api-access', 'deep-reasoning-analysis'],
  strategy: 'balanced',
  teamSize: 15,
  monthlyBudget: 400,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});

// TEST D: Enterprise
debugScenario('TEST D: Enterprise ($2000/mo, 50 users, security + governance)', {
  domain: 'enterprise-compliance',
  requirements: ['enterprise-governance', 'enterprise-sso', 'hipaa-soc2'],
  strategy: 'enterprise-security',
  teamSize: 50,
  monthlyBudget: 2000,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: true }
});

// TEST E: Writing / Content
debugScenario('TEST E: Writing / Content ($100/mo, 5 users, writing + research)', {
  domain: 'content-communication',
  requirements: ['live-web-research', 'deep-reasoning-analysis'],
  strategy: 'balanced',
  teamSize: 5,
  monthlyBudget: 100,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
});
