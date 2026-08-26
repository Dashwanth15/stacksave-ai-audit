import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';
KnowledgeLoader.initialize();
const engine = AIStackRecommendationEngine as any;
const apis = KnowledgeScoringEngine.scoreAll().filter(p => p.category === 'api');
const mkReq = (strategy: string, domain = 'ai-data-ml', monthlyBudget: number | null = 500) => ({
  domain, teamSize: 10, monthlyBudget, requirements: ['developer-api-access','deep-reasoning-analysis'], strategy,
  preferences: { preferOpenSource:false, avoidLockIn:false, maximizeSavings: strategy==='best-value', preferEstablishedVendors:false, requireZeroRetention:false }
} as StackBuilderRequest);
for (const strategy of ['balanced','best-value','max-performance','enterprise-security']) {
  const req = mkReq(strategy);
  const weights = KnowledgeLoader.getRecommendationWeights?.() ?? {};
  console.log('\n== strategy=' + strategy);
  for (const p of apis) {
    const apiFit = engine.featureCapabilityFit(p, 'developer-api-access');
    const reqFit = engine.computeRequirementCapabilityScore(p, req.requirements);
    const perf = engine.domainRelevantBenchmarkScore(p, req.domain) ?? p.capabilityCompositeScore;
    const cost = engine.computeRequestAwareCostEfficiency(p, req);
    const obj = engine.apiLayerObjective(p, req, weights, strategy, req.requirements);
    console.log(`  ${p.id.padEnd(15)} obj=${String(obj).padStart(4)} apiFit=${String(apiFit).padStart(4)} reqFit=${String(Math.round(reqFit)).padStart(3)} perf=${String(Math.round(perf)).padStart(3)} cost=${String(Math.round(cost)).padStart(3)} rel=${Math.round(p.reliabilityScore)} sec=${Math.round(p.securityScore)}`);
  }
}
