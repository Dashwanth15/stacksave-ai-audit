import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();

const scenarios: Array<{ name: string; req: any }> = [
  {
    name: 'SCENARIO 1: Software Engineering ($400/mo, 15 seats, Balanced)',
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
    name: 'SCENARIO 2 (REQUEST A): AI & Machine Learning ($400/mo, 15 seats, Max Performance)',
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
    name: 'SCENARIO 3 (REQUEST B): Research & Knowledge ($200/mo, 5 seats, Balanced)',
    req: {
      domain: 'research-knowledge',
      teamSize: 5,
      monthlyBudget: 200,
      requirements: ['live-web-research', 'large-document-processing'],
      strategy: 'balanced',
      preferences: { preferEstablishedVendors: true },
      debug: true
    }
  },
  {
    name: 'SCENARIO 4 (REQUEST C): Content & Communication ($100/mo, 5 seats, Best Value)',
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
    name: 'SCENARIO 5 (REQUEST D): Enterprise Governance ($2000/mo, 50 seats, Enterprise Security)',
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
  console.log('======================================================================');
  console.log(sc.name);
  console.log('======================================================================');
  const rec = AIStackRecommendationEngine.run(sc.req);
  const best = rec.categories.bestOverall.recommendedStack;

  console.log(`1. Normalized Domain: ${rec.userContextSummary.domainLabel} (${rec.userContextSummary.domain})`);
  console.log(`2. Strategy Used: ${rec.userContextSummary.strategyLabel}`);
  console.log(`3. Team Size: ${rec.userContextSummary.teamSize} seats | Budget: ${rec.userContextSummary.budgetFormatted}`);
  console.log(`4. Top 5 Provider Scores:`);
  if (rec.trace?.allProviderScores) {
    rec.trace.allProviderScores.slice(0, 5).forEach((p, idx) => {
      console.log(`   #${idx+1} ${p.providerName.padEnd(16)} (cat: ${p.category}) -> Composite Score: ${p.compositeScore}%`);
    });
  }

  console.log(`\n5. RECOMMENDED STACK ARCHITECTURE:`);
  console.log(`   - 01 PRIMARY: ${best.primary.toolName} (${best.primary.recommendedPlan}) - $${best.primary.monthlyCostPerSeat}/seat`);
  if (best.secondary) {
    console.log(`   - 02 SECONDARY: ${best.secondary.toolName} (${best.secondary.recommendedPlan}) - $${best.secondary.monthlyCostPerSeat}/seat`);
  }
  if (best.optional) {
    console.log(`   - 03 OPTIONAL: ${best.optional.toolName} (${best.optional.recommendedPlan}) - $${best.optional.monthlyCostPerSeat}/seat`);
  }
  if (best.apiLayer) {
    console.log(`   - 04 API LAYER: ${best.apiLayer.toolName} (${best.apiLayer.recommendedPlan}) - $${best.apiLayer.monthlyCostPerSeat}/seat`);
  }
  console.log(`   - TOTAL MONTHLY SPEND: $${best.estimatedMonthlyCost.toLocaleString()}/mo ($${best.perSeatMonthlyCost}/user/mo)`);
  console.log(`   - BUDGET STATUS: ${best.budgetStatus} (Fit Score: ${best.confidenceBreakdown.budgetFit}%)`);
  console.log(`   - REQUIREMENTS COVERED: ${best.coverageResult.coverageScore}% (${best.coverageResult.covered.map(c => c.featureLabel).join(', ')})`);

  const alts = rec.categories.bestOverall.alternativeComparisons;
  console.log(`\n6. DIVERSE ALTERNATIVE ARCHITECTURES (${alts.length} Generated):`);
  alts.forEach((alt, idx) => {
    console.log(`   [Alt #${idx+1}] [${alt.purposeLabel}] ${alt.stackSummary} | $${alt.perSeatCost}/seat ($${alt.monthlyCost.toLocaleString()}/mo) | Match: ${alt.matchScore}%`);
  });
  console.log('\n');
}
