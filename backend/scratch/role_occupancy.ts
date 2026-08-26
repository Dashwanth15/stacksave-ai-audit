import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { StackBuilderRequest } from '../src/types/stackBuilder';
KnowledgeLoader.initialize();
const DOMAINS = ['software-engineering','ai-data-ml','research-knowledge','product-design','business-operations','content-communication','enterprise-compliance','general-productivity'];
const STRATEGIES = ['balanced','best-value','max-performance','enterprise-security'];
const BUDGETS: (number|null)[] = [0,100,500,2000,null];
const TEAMS = [1,10,40];
const REQ_SETS: string[][] = [
  ['editor-code-generation'],
  ['editor-code-generation','live-web-research'],
  ['enterprise-governance','enterprise-sso'],
  ['live-web-research','visual-diagram-understanding','voice'],
  ['editor-code-generation','code-review','github-integration','live-web-research'],
  ['developer-api-access','deep-reasoning-analysis'],
];
const roles = { total: 0, secondary: 0, optional: 0, api: 0 };
const optProviders = new Map<string, number>();
for (const domain of DOMAINS) for (const strategy of STRATEGIES) for (const monthlyBudget of BUDGETS) for (const teamSize of TEAMS) for (const requirements of REQ_SETS) {
  const req = { domain, teamSize, monthlyBudget, requirements, strategy,
    preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false } } as StackBuilderRequest;
  let r: any; try { r = AIStackRecommendationEngine.run(req); } catch { continue; }
  for (const [, cat] of Object.entries<any>(r.categories)) {
    const s = cat?.recommendedStack; if (!s) continue;
    roles.total++;
    if (s.secondary) roles.secondary++;
    if (s.apiLayer) roles.api++;
    if (s.optional) { roles.optional++; optProviders.set(s.optional.toolId, (optProviders.get(s.optional.toolId) ?? 0) + 1); }
  }
}
console.log('stacks=' + roles.total, 'secondary=' + roles.secondary, 'optional=' + roles.optional, 'api=' + roles.api);
console.log('optional providers:', [...optProviders.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+'='+v).join(' ') || '(none)');
