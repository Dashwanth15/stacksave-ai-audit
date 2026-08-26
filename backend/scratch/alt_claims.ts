import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { StackBuilderRequest } from '../src/types/stackBuilder';
KnowledgeLoader.initialize();
const mk = (o: any) => ({ domain: 'software-engineering', teamSize: 10, monthlyBudget: 500, requirements: ['editor-code-generation'], strategy: 'balanced',
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false }, ...o } as StackBuilderRequest);
for (const scen of [
  mk({}),
  mk({ requirements: ['enterprise-governance','enterprise-sso'], domain: 'enterprise-compliance', monthlyBudget: 200, teamSize: 50 }),
  mk({ requirements: ['enterprise-governance','enterprise-sso'], domain: 'enterprise-compliance', monthlyBudget: 6000, teamSize: 20 }),
  mk({ requirements: ['live-web-research','editor-code-generation'], monthlyBudget: null }),
]) {
  const r: any = AIStackRecommendationEngine.run(scen);
  const stack = r.categories.bestOverall.recommendedStack;
  console.log(`\n${scen.domain}/$${scen.monthlyBudget}/team${scen.teamSize} req=[${(scen.requirements||[]).join('+')}]`);
  console.log('  stack:', stack.tools.map((t: any) => `${t.toolId}(${t.role},${t.recommendedPlan})`).join(' '), '$' + stack.estimatedMonthlyCost);
  console.log('  advantages:'); for (const a of stack.advantages ?? r.categories.bestOverall.recommendedStack.advantages ?? []) console.log('    -', a);
  const withClaims = r.alternatives.filter((a: any) => (a.wouldHaveCovered ?? []).length > 0);
  console.log(`  alternatives=${r.alternatives.length} withCoverageClaim=${withClaims.length}`);
  for (const a of withClaims.slice(0, 4)) console.log(`    ${a.providerId ?? a.toolId}: [${a.wouldHaveCovered.join(', ')}]`);
}
