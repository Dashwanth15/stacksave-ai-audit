import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';

KnowledgeLoader.initialize();

const scenarios = [
  {
    code: 'A',
    title: 'Scenario A: Software Engineering (15 seats, $400, Editor coding + deep reasoning, Balanced)',
    req: {
      domain: 'software-engineering',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: { preferEstablishedVendors: true },
      debug: true
    }
  },
  {
    code: 'B',
    title: 'Scenario B: AI & Machine Learning (15 seats, $400, API integration + reasoning, Maximum Performance)',
    req: {
      domain: 'ai-data-ml',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['developer-api-access', 'deep-reasoning-analysis'],
      strategy: 'max-performance',
      preferences: { preferOpenSource: true },
      debug: true
    }
  },
  {
    code: 'C',
    title: 'Scenario C: Research & Knowledge (5 seats, $200, Web research + citations + long context, Balanced)',
    req: {
      domain: 'research-knowledge',
      teamSize: 5,
      monthlyBudget: 200,
      requirements: ['live-web-research', 'large-document-processing', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: { preferEstablishedVendors: true },
      debug: true
    }
  },
  {
    code: 'D',
    title: 'Scenario D: Content & Communication (5 seats, $100, Writing + long context, Best Value)',
    req: {
      domain: 'content-communication',
      teamSize: 5,
      monthlyBudget: 100,
      requirements: ['large-document-processing', 'deep-reasoning-analysis'],
      strategy: 'best-value',
      preferences: { maximizeSavings: true },
      debug: true
    }
  },
  {
    code: 'E',
    title: 'Scenario E: Enterprise Governance (50 seats, $2000, SSO + security + zero retention, Enterprise Security)',
    req: {
      domain: 'enterprise-compliance',
      teamSize: 50,
      monthlyBudget: 2000,
      requirements: ['enterprise-governance'],
      strategy: 'enterprise-security',
      preferences: {
        strictZeroDataRetention: true,
        requireZeroRetention: true,
        preferTier1Vendors: true,
        preferEstablishedVendors: true
      },
      debug: true
    }
  }
];

for (const sc of scenarios) {
  console.log('================================================================================');
  console.log(`[${sc.code}] ${sc.title}`);
  console.log('================================================================================');

  const rec = AIStackRecommendationEngine.run(sc.req as any);
  const best = rec.categories.bestOverall.recommendedStack;
  const trace = rec.trace!;

  console.log(`INPUTS:`);
  console.log(`  Domain:       ${rec.userContextSummary.domainLabel} (${rec.userContextSummary.domain})`);
  console.log(`  Team Size:    ${rec.userContextSummary.teamSize} seats`);
  console.log(`  Budget:       ${rec.userContextSummary.budgetFormatted}`);
  console.log(`  Requirements: ${sc.req.requirements.join(', ')}`);
  console.log(`  Strategy:     ${rec.userContextSummary.strategyLabel} (${sc.req.strategy})`);

  console.log(`\nAPPLICATION / WORKSPACE RANKING (Top 5 Human Workspace Products):`);
  trace.applicationRanking.slice(0, 5).forEach((p, idx) => {
    const scoredProf = KnowledgeScoringEngine.getScored(p.providerId);
    console.log(`  ${idx + 1}. ${p.providerName.padEnd(16)} [${p.category.toUpperCase()}] -> Composite: ${p.compositeScore}% (Workflow: ${p.workflowScore}%, Req Coverage: ${p.featureCoverageScore}%, Cost Eff: ${p.costEfficiencyScore}%)`);
    if (scoredProf) {
      console.log(`     Capabilities -> Coding: ${scoredProf.codingScore}, Reasoning: ${scoredProf.reasoningScore}, Research: ${scoredProf.researchScore}, LongContext: ${scoredProf.longContextScore}, Enterprise: ${scoredProf.enterpriseScore}, Security: ${scoredProf.securityScore}`);
    }
  });

  console.log(`\nAPI / DEVELOPER INFRASTRUCTURE RANKING (Top 3 Backend Endpoints):`);
  trace.apiRanking.slice(0, 3).forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p.providerName.padEnd(16)} [API] -> Composite: ${p.compositeScore}% (Workflow: ${p.workflowScore}%, Req Coverage: ${p.featureCoverageScore}%)`);
  });

  console.log(`\nRECOMMENDED STACK COMPOSITION:`);
  console.log(`  PRIMARY:    ${best.primary.toolName} (${best.primary.recommendedPlan}) - $${best.primary.monthlyCostPerSeat}/seat ($${best.primary.estimatedMonthlyCostPerTeam}/mo total)`);
  console.log(`              Why: ${best.primary.whyRecommended}`);
  if (best.secondary) {
    console.log(`  SECONDARY:  ${best.secondary.toolName} (${best.secondary.recommendedPlan}) - $${best.secondary.monthlyCostPerSeat}/seat ($${best.secondary.estimatedMonthlyCostPerTeam}/mo total)`);
    console.log(`              Why: ${best.secondary.whyRecommended}`);
    console.log(`              Complements: ${best.secondary.whatItComplements}`);
  }
  if (best.optional) {
    console.log(`  OPTIONAL:   ${best.optional.toolName} (${best.optional.recommendedPlan}) - $${best.optional.monthlyCostPerSeat}/seat ($${best.optional.estimatedMonthlyCostPerTeam}/mo total)`);
    console.log(`              Why: ${best.optional.whyRecommended}`);
  }
  if (best.apiLayer) {
    console.log(`  API LAYER:  ${best.apiLayer.toolName} (${best.apiLayer.recommendedPlan}) - $${best.apiLayer.monthlyCostPerSeat}/seat ($${best.apiLayer.estimatedMonthlyCostPerTeam}/mo total)`);
    console.log(`              Why: ${best.apiLayer.whyRecommended}`);
  }
  console.log(`  TOTAL SPEND: $${best.estimatedMonthlyCost.toLocaleString()}/mo ($${best.perSeatMonthlyCost}/seat/mo)`);
  console.log(`  BUDGET FIT:  ${best.budgetStatus.toUpperCase()} (Fit Score: ${best.confidenceBreakdown.budgetFit}%)`);
  console.log(`  COVERAGE:    ${best.coverageResult.coverageScore}% Satisfied (${best.coverageResult.covered.map(c => c.featureLabel).join(', ')})`);

  console.log(`\nSTRATEGICALLY DISTINCT ALTERNATIVE ARCHITECTURES (${rec.categories.bestOverall.alternativeComparisons.length} Generated):`);
  rec.categories.bestOverall.alternativeComparisons.forEach((alt, idx) => {
    console.log(`  #${idx + 1} [${alt.purposeLabel}]`);
    console.log(`     Stack:       ${alt.stackSummary}`);
    console.log(`     Cost:        $${alt.perSeatCost}/seat ($${alt.monthlyCost.toLocaleString()}/mo team) | Match: ${alt.matchScore}%`);
    console.log(`     Best For:    ${alt.bestFor}`);
    console.log(`     Advantage:   ${alt.mainAdvantage}`);
    console.log(`     Tradeoff:    ${alt.mainTradeoff}`);
  });

  console.log(`\nEVALUATED PROVIDER REJECTIONS (${rec.alternatives.length} Providers Analyzed):`);
  rec.alternatives.slice(0, 4).forEach((alt) => {
    console.log(`  - ${alt.toolName} (${alt.category}): ${alt.whyNotSelected} [${alt.rejectionBadge}]`);
  });
  console.log('\n');
}
