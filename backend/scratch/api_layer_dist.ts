import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { StackBuilderRequest } from '../src/types/stackBuilder';
KnowledgeLoader.initialize();
const DOMAINS = ['software-engineering','ai-data-ml','research-knowledge','enterprise-compliance','general-productivity'];
const STRATEGIES = ['balanced','best-value','max-performance','enterprise-security'];
const BUDGETS: (number|null)[] = [0,100,500,5000,null];
const PREFS = [
  { label:'neutral', preferOpenSource:false, avoidLockIn:false, maximizeSavings:false, preferEstablishedVendors:false, requireZeroRetention:false },
  { label:'savings', preferOpenSource:false, avoidLockIn:false, maximizeSavings:true,  preferEstablishedVendors:false, requireZeroRetention:false },
  { label:'open',    preferOpenSource:true,  avoidLockIn:true,  maximizeSavings:false, preferEstablishedVendors:false, requireZeroRetention:false },
  { label:'estab',   preferOpenSource:false, avoidLockIn:false, maximizeSavings:false, preferEstablishedVendors:true,  requireZeroRetention:false },
];
const dist = new Map<string, number>(); let withApiReq = 0, gotApi = 0;
for (const domain of DOMAINS) for (const strategy of STRATEGIES) for (const monthlyBudget of BUDGETS) for (const p of PREFS) for (const teamSize of [1,10,40]) {
  const { label, ...preferences } = p as any;
  const req = { domain, teamSize, monthlyBudget, requirements: ['developer-api-access','deep-reasoning-analysis'], strategy, preferences } as StackBuilderRequest;
  let r: any; try { r = AIStackRecommendationEngine.run(req); } catch { continue; }
  withApiReq++;
  const api = r.categories.bestOverall.recommendedStack.apiLayer;
  if (api) { gotApi++; dist.set(api.toolId, (dist.get(api.toolId) ?? 0) + 1); }
}
console.log(`api-requirement scenarios=${withApiReq} apiLayerAttached=${gotApi}`);
console.log('api layer picks:', [...dist.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join('  '));
