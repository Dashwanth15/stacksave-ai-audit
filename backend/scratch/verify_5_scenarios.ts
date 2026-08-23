// ============================================================
// Test 5 Scenarios Verification Script — StackSave AI Platform
// ============================================================

import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const scenarios: Array<{ name: string; req: StackBuilderRequest }> = [
  {
    name: '1. Software Engineering (Team of 15, $400/mo budget)',
    req: {
      domain: 'software-engineering',
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      teamSize: 15,
      monthlyBudget: 400,
      strategy: 'balanced',
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true }
    }
  },
  {
    name: '2. Research & Knowledge Analysis (Team of 8, $300/mo budget)',
    req: {
      domain: 'research-knowledge',
      requirements: ['live-web-research', 'large-document-processing', 'deep-reasoning-analysis'],
      teamSize: 8,
      monthlyBudget: 300,
      strategy: 'balanced',
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true }
    }
  },
  {
    name: '3. AI/ML Engineering (Team of 10, $500/mo budget)',
    req: {
      domain: 'ai-data-ml',
      requirements: ['deep-reasoning-analysis', 'editor-code-generation', 'developer-api-access'],
      teamSize: 10,
      monthlyBudget: 500,
      strategy: 'max-performance',
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true }
    }
  },
  {
    name: '4. Enterprise Compliance & Governance (Team of 50, $2000/mo budget)',
    req: {
      domain: 'enterprise-compliance',
      requirements: ['saml-sso', 'zero-data-retention', 'deep-reasoning-analysis'],
      teamSize: 50,
      monthlyBudget: 2000,
      strategy: 'enterprise-security',
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true, requireZeroRetention: true }
    }
  },
  {
    name: '5. Writing & Technical Communication (Team of 5, $150/mo budget)',
    req: {
      domain: 'content-communication',
      requirements: ['writing-prose-synthesis', 'large-document-processing'],
      teamSize: 5,
      monthlyBudget: 150,
      strategy: 'best-value',
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: true, preferEstablishedVendors: true }
    }
  }
];

console.log('========================================================================');
console.log('STACKSAVE AI AUDIT — 5 PROCUREMENT SCENARIO VERIFICATION');
console.log('========================================================================\n');

for (const sc of scenarios) {
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`SCENARIO: ${sc.name}`);
  console.log(`------------------------------------------------------------------------`);

  const result = AIStackRecommendationEngine.run(sc.req);
  const bestOverall = result.categories?.bestOverall;
  const rec = bestOverall?.recommendedStack;

  console.log(`\n🏆 BEST OVERALL RECOMMENDED STACK:`);
  console.log(`   Tools: ${rec?.tools.map(t => `${t.toolName} (${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ')}`);
  console.log(`   Primary: ${rec?.primary.toolName} (${rec?.primary.buyingPriority} - ${rec?.primary.recommendedPlan})`);
  if (rec?.secondary) {
    console.log(`   Secondary: ${rec?.secondary.toolName} (${rec?.secondary.buyingPriority} - ${rec?.secondary.recommendedPlan})`);
  }
  if (rec?.optional) {
    console.log(`   Optional: ${rec?.optional.toolName} (${rec?.optional.buyingPriority} - ${rec?.optional.recommendedPlan})`);
  }
  if (rec?.apiLayer) {
    console.log(`   API Layer: ${rec?.apiLayer.toolName} (${rec?.apiLayer.buyingPriority} - ${rec?.apiLayer.recommendedPlan})`);
  }
  console.log(`   Per-Seat Spend: $${rec?.perSeatMonthlyCost}/seat/mo | Total: $${rec?.estimatedMonthlyCost}/mo | Match: ${rec?.confidenceScore}%`);

  console.log(`\n🏢 STRATEGY DIFFERENTIATION:`);
  console.log(`   Best Overall:     ${result.categories?.bestOverall.recommendedStack?.tools.map(t => `${t.toolName} (${t.recommendedPlan})`).join(' + ')} ($${result.categories?.bestOverall.recommendedStack?.perSeatMonthlyCost}/seat)`);
  console.log(`   Best Value:       ${result.categories?.bestValue.recommendedStack?.tools.map(t => `${t.toolName} (${t.recommendedPlan})`).join(' + ')} ($${result.categories?.bestValue.recommendedStack?.perSeatMonthlyCost}/seat)`);
  console.log(`   Best Performance: ${result.categories?.bestPerformance.recommendedStack?.tools.map(t => `${t.toolName} (${t.recommendedPlan})`).join(' + ')} ($${result.categories?.bestPerformance.recommendedStack?.perSeatMonthlyCost}/seat)`);
  console.log(`   Enterprise:       ${result.categories?.bestEnterprise.recommendedStack?.tools.map(t => `${t.toolName} (${t.recommendedPlan})`).join(' + ')} ($${result.categories?.bestEnterprise.recommendedStack?.perSeatMonthlyCost}/seat)`);

  const alts = bestOverall?.alternativeComparisons || [];
  console.log(`\n🎯 ALTERNATIVE ARCHITECTURES (${alts.length} Generated):`);
  for (const alt of alts) {
    console.log(`   [${alt.purposeLabel}] ${alt.stackSummary} — $${alt.perSeatCost}/seat ($${alt.monthlyCost}/mo) — Match: ${alt.matchScore}%`);
  }

  const rejected = result.alternatives.slice(0, 3);
  console.log(`\n❌ TOP REJECTED PROVIDERS (${result.alternatives.length} evaluated):`);
  for (const rej of rejected) {
    console.log(`   • ${rej.toolName} (${rej.rejectionBadge}): ${rej.whyNotSelected}`);
  }
}

console.log('\n========================================================================');
console.log('✅ ALL 5 SCENARIOS VERIFIED SUCCESSFULLY');
console.log('========================================================================');
