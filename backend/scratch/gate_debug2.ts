import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const req: StackBuilderRequest = {
  domain: 'enterprise-compliance',
  requirements: ['enterprise-governance', 'enterprise-sso'],
  strategy: 'best-value',
  monthlyBudget: 4000,
  teamSize: 20,
  preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false }
} as any;

const r = AIStackRecommendationEngine.run(req);
for (const [name, cat] of Object.entries(r.categories as any)) {
  const s: any = (cat as any).recommendedStack;
  if (!s) continue;
  console.log(`${name.padEnd(18)} ${s.tools.map((t: any) => `${t.toolId}(${t.recommendedPlan})`).join(' + ').padEnd(52)} $${s.estimatedMonthlyCost} covScore=${s.coverageResult?.coverageScore} gated=${(s.coverageResult?.planGated ?? []).length}`);
}

console.log('\n--- plan-aware SSO closure by candidate (teamSize 20, best-value, $4000) ---');
const engine: any = AIStackRecommendationEngine;
const profiles = KnowledgeScoringEngine.scoreAll().filter(p => p.category !== 'api');
for (const p of profiles) {
  const plan = engine.selectOptimalPlan(p, 20, 'best-value', 4000, req.requirements);
  const resolver = () => plan;
  const covers = StackCoverageAnalyzer.fullyCoveredBy(p, [], ['enterprise-sso'], resolver as any);
  const coversGov = StackCoverageAnalyzer.fullyCoveredBy(p, [], ['enterprise-governance'], resolver as any);
  console.log(`  ${p.id.padEnd(16)} plan=${String(plan?.label).padEnd(14)} $${plan?.monthlyPricePerSeat} rank=${plan?.tierRank} sso=${covers.length > 0} gov=${coversGov.length > 0}`);
}
