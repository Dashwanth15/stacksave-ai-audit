import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const prefs = { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false };
const domains = ['software-engineering', 'content-communication', 'business-operations', 'general-productivity'];
for (const domain of domains) {
  for (const budget of [0, 200, 500, 2000, null] as any[]) {
    for (const team of [1, 10, 40]) {
      const req = { domain, requirements: ['code-completion'], strategy: 'balanced', monthlyBudget: budget, teamSize: team, preferences: prefs } as any as StackBuilderRequest;
      const s = AIStackRecommendationEngine.run(req).categories.bestOverall.recommendedStack;
      const covered = s.coverageResult.covered.length;
      console.log(`${domain.padEnd(22)} $${String(budget).padEnd(5)} team${String(team).padEnd(4)} -> ${s.tools.map(t => `${t.toolId}(${t.recommendedPlan})`).join(' + ').padEnd(46)} $${String(s.estimatedMonthlyCost).padEnd(7)} covered=${covered}/1 missing=${JSON.stringify(s.coverageResult.missing)}`);
    }
  }
}
