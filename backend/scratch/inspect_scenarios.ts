import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const scenarios: Array<{ name: string; req: StackBuilderRequest }> = [
  {
    name: '1. Software Engineering + Coding Requirements',
    req: {
      domain: 'software-engineering',
      requirements: ['editor-code-generation', 'automated-task-execution'],
      strategy: 'balanced',
      teamSize: 10,
      monthlyBudget: 500,
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
    }
  },
  {
    name: '2. Research & Knowledge + Web Research',
    req: {
      domain: 'research-knowledge',
      requirements: ['live-web-research', 'large-document-processing', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      teamSize: 5,
      monthlyBudget: 300,
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
    }
  },
  {
    name: '3. Content & Communication + Writing',
    req: {
      domain: 'content-communication',
      requirements: ['deep-reasoning-analysis', 'large-document-processing'],
      strategy: 'balanced',
      teamSize: 5,
      monthlyBudget: 250,
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
    }
  },
  {
    name: '4. AI & Data + API Requirements',
    req: {
      domain: 'ai-data-ml',
      requirements: ['developer-api-access', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      teamSize: 8,
      monthlyBudget: 600,
      preferences: { preferOpenSource: true, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false }
    }
  },
  {
    name: '5. Enterprise & Compliance + Security',
    req: {
      domain: 'enterprise-compliance',
      requirements: ['enterprise-governance'],
      strategy: 'enterprise-security',
      teamSize: 50,
      monthlyBudget: 3000,
      preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: true, requireZeroRetention: true }
    }
  }
];

for (const sc of scenarios) {
  console.log(`\n======================================================`);
  console.log(`SCENARIO: ${sc.name}`);
  console.log(`======================================================`);
  const res = AIStackRecommendationEngine.run(sc.req);
  
  for (const catKey of ['bestOverall', 'bestValue', 'bestPerformance', 'bestEnterprise'] as const) {
    const cat = res.categories[catKey];
    console.log(`\n  --- [${cat.title}] (Strategy: ${cat.strategyUsed}) ---`);
    console.log(`    Rank #1: ${cat.rank1.tools.map(t => `${t.toolName} (${t.role}, Plan: ${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ')} | Total: $${cat.rank1.estimatedMonthlyCost}/mo | Match: ${cat.rank1.confidenceScore}%`);
    if (cat.rank2) {
      console.log(`    Rank #2: ${cat.rank2.tools.map(t => `${t.toolName} (${t.role}, Plan: ${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ')} | Total: $${cat.rank2.estimatedMonthlyCost}/mo | Match: ${cat.rank2.confidenceScore}%`);
    }
    if (cat.rank3) {
      console.log(`    Rank #3: ${cat.rank3.tools.map(t => `${t.toolName} (${t.role}, Plan: ${t.recommendedPlan}, $${t.monthlyCostPerSeat}/seat)`).join(' + ')} | Total: $${cat.rank3.estimatedMonthlyCost}/mo | Match: ${cat.rank3.confidenceScore}%`);
    }
  }
}
