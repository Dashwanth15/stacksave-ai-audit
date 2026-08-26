import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine, ScoredProviderProfile } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();
const profiles = KnowledgeScoringEngine.scoreAll();
const byId = new Map(profiles.map(p => [p.id, p]));
const engine = AIStackRecommendationEngine as any;

const DOMAINS = ['software-engineering', 'data-analytics', 'content-communication', 'enterprise-compliance', 'research-analysis', 'design-product', 'devops-infrastructure', 'general-productivity'];
const STRATEGIES = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];
const BUDGETS: (number | null)[] = [0, 100, 500, 2000, null];
const TEAMS = [1, 10, 40];
const REQ_SETS: string[][] = [
  ['editor-code-generation'],
  ['editor-code-generation', 'live-web-research'],
  ['enterprise-governance', 'enterprise-sso'],
  ['live-web-research', 'visual-diagram-understanding', 'voice'],
  ['editor-code-generation', 'code-review', 'github-integration', 'live-web-research'],
];

let scenarios = 0;
let openAfterStack = 0;
let closerExists = 0;
const examples: string[] = [];

for (const domain of DOMAINS) {
  for (const strategy of STRATEGIES) {
    for (const monthlyBudget of BUDGETS) {
      for (const teamSize of TEAMS) {
        for (const requirements of REQ_SETS) {
          scenarios++;
          const req = {
            domain, teamSize, monthlyBudget, requirements, strategy,
            preferences: { preferOpenSource: false, avoidLockIn: false, maximizeSavings: false, preferEstablishedVendors: false, requireZeroRetention: false }
          } as StackBuilderRequest;

          let result: any;
          try { result = AIStackRecommendationEngine.run(req); } catch { continue; }
          const stack = result.categories.bestOverall.recommendedStack;
          const tools: any[] = stack.tools;
          const inStack = tools.map(t => byId.get(t.toolId)).filter(Boolean) as ScoredProviderProfile[];
          const planByTool = new Map(tools.map(t => [t.toolId, t.recommendedPlan]));
          const resolver = (p: ScoredProviderProfile) => {
            const label = planByTool.get(p.id);
            return ((p.plans as any[]) ?? []).find(pl => pl?.label === label) ?? null;
          };

          const appReq: string[] = engine.requirementsGatingPrimary(requirements);
          const cov = StackCoverageAnalyzer.analyze(inStack, appReq, resolver as any);
          const open = [...cov.missing, ...cov.partial.map((f: any) => f.featureKey)];
          if (open.length === 0) continue;
          openAfterStack++;

          const ids = new Set(inStack.map(p => p.id));
          const closers = profiles
            .filter(p => p.category !== 'api' && !ids.has(p.id))
            .map(p => ({ id: p.id, closes: StackCoverageAnalyzer.fullyCoveredBy(p, inStack, open, resolver as any) }))
            .filter(e => e.closes.length > 0);
          if (closers.length > 0) {
            closerExists++;
            if (examples.length < 12) {
              examples.push(
                `${domain}/${strategy}/$${monthlyBudget}/team${teamSize} req=[${requirements.join('+')}] ` +
                `stack=[${tools.map(t => t.toolId + '(' + t.role + ')').join(',')}] open=[${open.join(',')}] ` +
                `closers=${closers.map(c => c.id + ':' + c.closes.join('|')).join(' ')}`
              );
            }
          } else if (examples.length < 12 && cov.partial.length > 0) {
            examples.push(`NO-CLOSER ${domain}/${strategy}/$${monthlyBudget}/team${teamSize} open=[${open.join(',')}] stack=[${tools.map(t => t.toolId).join(',')}]`);
          }
        }
      }
    }
  }
}

console.log(`scenarios=${scenarios} stacksWithOpenGap=${openAfterStack} ofWhichAClosingProviderExists=${closerExists}`);
for (const e of examples) console.log(' ', e);
