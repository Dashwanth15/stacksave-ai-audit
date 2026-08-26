import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine, ScoredProviderProfile } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest } from '../src/types/stackBuilder';
KnowledgeLoader.initialize();
const profiles = KnowledgeScoringEngine.scoreAll();
const byId = new Map(profiles.map(p => [p.id, p]));
const engine = AIStackRecommendationEngine as any;
const DOMAINS = ['software-engineering','ai-data-ml','research-knowledge','product-design','business-operations','content-communication','enterprise-compliance','general-productivity'];
const STRATEGIES = ['balanced','best-value','max-performance','enterprise-security'];
const BUDGETS: (number|null)[] = [0,100,500,2000,null];
const TEAMS = [1,10,40];
const REQ_SETS: string[][] = [
  ['editor-code-generation'],['editor-code-generation','live-web-research'],
  ['enterprise-governance','enterprise-sso'],['live-web-research','visual-diagram-understanding','voice'],
  ['editor-code-generation','code-review','github-integration','live-web-research'],['developer-api-access','deep-reasoning-analysis'],
];
let partialOnlyGap = 0, partialOnlyGapWithCloser = 0;
for (const domain of DOMAINS) for (const strategy of STRATEGIES) for (const monthlyBudget of BUDGETS) for (const teamSize of TEAMS) for (const requirements of REQ_SETS) {
  const req = { domain, teamSize, monthlyBudget, requirements, strategy,
    preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false } } as StackBuilderRequest;
  let r: any; try { r = AIStackRecommendationEngine.run(req); } catch { continue; }
  const s = r.categories.bestOverall.recommendedStack;
  const inStack = s.tools.map((t: any) => byId.get(t.toolId)).filter(Boolean) as ScoredProviderProfile[];
  const planByTool = new Map(s.tools.map((t: any) => [t.toolId, t.recommendedPlan]));
  const resolver = (p: ScoredProviderProfile) => ((p.plans as any[]) ?? []).find(pl => pl?.label === planByTool.get(p.id)) ?? null;
  const appReq: string[] = engine.requirementsGatingPrimary(requirements);
  const cov = StackCoverageAnalyzer.analyze(inStack, appReq, resolver as any);
  const partials = cov.partial.map((f: any) => f.featureKey);
  if (cov.missing.length === 0 && partials.length > 0) {
    partialOnlyGap++;
    const ids = new Set(inStack.map(p => p.id));
    const closers = profiles.filter(p => p.category !== 'api' && !ids.has(p.id))
      .filter(p => StackCoverageAnalyzer.fullyCoveredBy(p, inStack, partials, resolver as any).length > 0);
    if (closers.length > 0) partialOnlyGapWithCloser++;
  }
}
console.log('stacks whose only open gap is a PARTIAL:', partialOnlyGap, ' of which a full closer exists:', partialOnlyGapWithCloser);
