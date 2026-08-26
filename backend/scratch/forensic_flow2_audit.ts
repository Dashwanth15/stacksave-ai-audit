/**
 * Forensic Flow 2 influence audit. Measurement only — not a product change.
 */
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { WorkflowEngine } from '../src/audit-engine/services/WorkflowEngine';
import { StackBuilderRequest, StackStrategy } from '../src/types/stackBuilder';

KnowledgeLoader.initialize();

const NEUTRAL = {
  preferOpenSource: false,
  avoidLockIn: false,
  maximizeSavings: false,
  preferEstablishedVendors: false,
  requireZeroRetention: false,
};

const REQ_IDS = [
  'editor-code-generation',
  'deep-reasoning-analysis',
  'large-document-processing',
  'live-web-research',
  'visual-diagram-understanding',
  'automated-task-execution',
  'developer-api-access',
  'enterprise-governance',
] as const;

const DOMAINS = [
  'software-engineering',
  'ai-data-ml',
  'research-knowledge',
  'product-design',
  'business-operations',
  'content-communication',
  'enterprise-compliance',
  'general-productivity',
] as const;

const STRATEGIES: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];

function base(over: Partial<StackBuilderRequest> = {}): StackBuilderRequest {
  return {
    domain: 'software-engineering',
    teamSize: 5,
    monthlyBudget: 100,
    requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
    strategy: 'balanced',
    preferences: { ...NEUTRAL },
    debug: true,
    ...over,
  };
}

function summarize(req: StackBuilderRequest) {
  const r = AIStackRecommendationEngine.run(req);
  const s = r.categories.bestOverall.recommendedStack;
  const alts = (r.categories.bestOverall.alternativeComparisons || []).slice(0, 6).map(a => ({
    purpose: a.purposeLabel,
    tools: (a.stack?.tools || []).map(t => t.toolId).join('+') || a.stackSummary,
    cost: a.monthlyCost,
  }));
  return {
    primary: s.primary?.toolId,
    primaryPlan: s.primary?.recommendedPlan,
    primarySeat: s.primary?.monthlyCostPerSeat,
    secondary: s.secondary?.toolId || s.tools.find(t => t.buyingPriority === '02 SECONDARY')?.toolId || null,
    optional: s.tools.filter(t => t.buyingPriority === '03 OPTIONAL').map(t => t.toolId),
    api: s.apiLayer?.toolId || s.tools.find(t => t.buyingPriority === '04 API LAYER')?.toolId || null,
    tools: s.tools.map(t => `${t.buyingPriority}:${t.toolId}`),
    cost: s.estimatedMonthlyCost,
    perSeat: s.perSeatMonthlyCost,
    coverage: s.coverageResult.coverageScore,
    confidence: s.confidenceScore,
    alts,
    altSigs: alts.map(a => a.tools).join(' || '),
    topTrace: (r.trace?.allProviderScores || []).filter(p => p.category !== 'api').slice(0, 5).map(p => `${p.providerId}:${p.compositeScore}`),
  };
}

function delta(a: ReturnType<typeof summarize>, b: ReturnType<typeof summarize>) {
  return {
    primaryChanged: a.primary !== b.primary,
    secondaryChanged: a.secondary !== b.secondary,
    apiChanged: a.api !== b.api,
    optionalChanged: a.optional.join() !== b.optional.join(),
    planChanged: a.primaryPlan !== b.primaryPlan,
    costChanged: a.cost !== b.cost,
    coverageChanged: a.coverage !== b.coverage,
    confidenceChanged: a.confidence !== b.confidence,
    altsChanged: a.altSigs !== b.altSigs,
    rankingChanged: a.topTrace.join() !== b.topTrace.join(),
  };
}

const report: string[] = [];
const log = (s: string) => { report.push(s); console.log(s); };

log('=== PROVIDERS LOADED ===');
const providers = KnowledgeLoader.getAllProviders();
log(`count=${providers.length} ids=${providers.map(p => p.id).join(',')}`);
const kv = KnowledgeLoader.getKnowledgeVersionMetadata();
log(`knowledgeVersion generatedAt=${kv.generatedAt} featureMap=${kv.featureMapVersion}`);
for (const p of providers) {
  log(`  ${p.id} cat=${p.category} lastVerified=${kv.lastVerifiedDates[p.id]} knowledge=${kv.knowledgeVersions[p.id]} coding=${p.capabilities.coding?.score} reasoning=${p.capabilities.reasoning?.score} api=${p.capabilities.api?.score} research=${p.capabilities.research?.score} ide=${p.capabilities.ideIntegration?.score}`);
}

log('\n=== DOMAIN SUITABILITY (WorkflowEngine) ===');
for (const d of DOMAINS) {
  const ranked = providers
    .map(p => ({ id: p.id, s: WorkflowEngine.calculateSuitability(p, d) }))
    .sort((a, b) => b.s - a.s);
  log(`${d}: ${ranked.slice(0, 5).map(x => `${x.id}:${x.s}`).join('  ')}`);
}

log('\n=== STEP 1 DOMAIN ONLY (team=5, budget=100, req=editor+reasoning, balanced) ===');
const domainRows: Record<string, ReturnType<typeof summarize>> = {};
for (const d of DOMAINS) {
  const s = summarize(base({ domain: d }));
  domainRows[d] = s;
  log(`${d}: P=${s.primary} S=${s.secondary} API=${s.api} OPT=${s.optional.join('|')||'-'} plan=${s.primaryPlan} $${s.cost} cov=${s.coverage} conf=${s.confidence} top=${s.topTrace.join(',')}`);
}
const se = domainRows['software-engineering'];
log('\nDomain vs software-engineering deltas:');
for (const d of DOMAINS) {
  if (d === 'software-engineering') continue;
  const dlt = delta(se, domainRows[d]);
  log(`  ${d}: ${JSON.stringify(dlt)}`);
}

log('\n=== STEP 2 TEAM SIZE (software-eng, budget=500, editor+reasoning) ===');
for (const n of [1, 5, 10, 50]) {
  const s = summarize(base({ teamSize: n, monthlyBudget: 500 }));
  log(`team=${n}: P=${s.primary} plan=${s.primaryPlan} seat=${s.primarySeat} teamCost=${s.cost} S=${s.secondary}`);
}

log('\n=== STEP 2 BUDGET SWEEP (software-eng, team=5, editor+reasoning, balanced) ===');
for (const b of [0, 50, 100, 250, 500, 1000, 2000, 5000, null]) {
  const s = summarize(base({ monthlyBudget: b as number | null }));
  log(`budget=${b}: P=${s.primary} S=${s.secondary} API=${s.api} plan=${s.primaryPlan} seat=${s.primarySeat} team=${s.cost} cov=${s.coverage} conf=${s.confidence}`);
}

log('\n=== SAME REQUEST $100 vs $2000 (ai-data-ml + api + reasoning, team=10) ===');
const low = summarize(base({ domain: 'ai-data-ml', teamSize: 10, monthlyBudget: 100, requirements: ['developer-api-access', 'deep-reasoning-analysis'] }));
const high = summarize(base({ domain: 'ai-data-ml', teamSize: 10, monthlyBudget: 2000, requirements: ['developer-api-access', 'deep-reasoning-analysis'] }));
log(`$100: ${JSON.stringify({ P: low.primary, S: low.secondary, API: low.api, plan: low.primaryPlan, cost: low.cost, cov: low.coverage })}`);
log(`$2000: ${JSON.stringify({ P: high.primary, S: high.secondary, API: high.api, plan: high.primaryPlan, cost: high.cost, cov: high.coverage })}`);
log(`delta: ${JSON.stringify(delta(low, high))}`);

log('\n=== REQUIREMENT ABLATION (software-eng, team=5, $250, no reqs vs each req) ===');
const none = summarize(base({ monthlyBudget: 250, requirements: [] }));
log(`NONE: P=${none.primary} S=${none.secondary} API=${none.api} cov=${none.coverage} top=${none.topTrace.join(',')}`);
for (const rid of REQ_IDS) {
  const withR = summarize(base({ monthlyBudget: 250, requirements: [rid] }));
  const dlt = delta(none, withR);
  log(`${rid}: P=${withR.primary} S=${withR.secondary} API=${withR.api} OPT=${withR.optional.join('|')||'-'} cov=${withR.coverage} ${JSON.stringify(dlt)}`);
}

log('\n=== API OFF vs ON ===');
const apiOff = summarize(base({ monthlyBudget: 400, requirements: ['deep-reasoning-analysis'] }));
const apiOn = summarize(base({ monthlyBudget: 400, requirements: ['deep-reasoning-analysis', 'developer-api-access'] }));
log(`OFF: P=${apiOff.primary} S=${apiOff.secondary} API=${apiOff.api} tools=${apiOff.tools.join(',')}`);
log(`ON:  P=${apiOn.primary} S=${apiOn.secondary} API=${apiOn.api} tools=${apiOn.tools.join(',')}`);
log(`delta: ${JSON.stringify(delta(apiOff, apiOn))}`);

log('\n=== STRATEGY ONLY (software-eng, team=5, $100, editor+reasoning) ===');
const stratRows: Record<string, ReturnType<typeof summarize>> = {};
for (const st of STRATEGIES) {
  const s = summarize(base({
    strategy: st,
    preferences: { ...NEUTRAL, maximizeSavings: st === 'best-value', requireZeroRetention: st === 'enterprise-security' },
  }));
  stratRows[st] = s;
  log(`${st}: P=${s.primary} S=${s.secondary} plan=${s.primaryPlan} $${s.cost} cov=${s.coverage} top=${s.topTrace.join(',')}`);
}

log('\n=== PREFERENCES (software-eng, team=5, $250, editor+reasoning, balanced) ===');
const prefOff = summarize(base({ monthlyBudget: 250 }));
log(`OFF: P=${prefOff.primary} S=${prefOff.secondary} API=${prefOff.api} top=${prefOff.topTrace.join(',')}`);
for (const k of ['preferOpenSource', 'avoidLockIn', 'requireZeroRetention', 'preferEstablishedVendors'] as const) {
  const s = summarize(base({ monthlyBudget: 250, preferences: { ...NEUTRAL, [k]: true } }));
  log(`${k}: P=${s.primary} S=${s.secondary} API=${s.api} top=${s.topTrace.join(',')} ${JSON.stringify(delta(prefOff, s))}`);
}

log('\n=== SECONDARY GAP ANALYSIS (software-eng editor+reasoning $100/5) ===');
{
  const req = base();
  const r = AIStackRecommendationEngine.run(req);
  const stack = r.categories.bestOverall.recommendedStack;
  const scored = KnowledgeScoringEngine.scoreAll();
  const byId = new Map(scored.map(p => [p.id, p]));
  const primary = byId.get(stack.primary.toolId)!;
  const secId = stack.tools.find(t => t.buyingPriority === '02 SECONDARY')?.toolId;
  const sec = secId ? byId.get(secId) : undefined;
  const reqs = req.requirements!;
  const primCov = StackCoverageAnalyzer.analyze([primary], reqs);
  log(`primary=${primary.id} covered=${primCov.covered.map(c => c.featureKey).join(',')} missing=${primCov.missing.join(',')} partial=${primCov.partial.map(p => p.featureKey).join(',')}`);
  if (sec) {
    const added = StackCoverageAnalyzer.fullyCoveredBy(sec, [primary], reqs);
    const both = StackCoverageAnalyzer.analyze([primary, sec], reqs);
    log(`secondary=${sec.id} newFull=${added.join(',')} remainingMissing=${both.missing.join(',')} remainingPartial=${both.partial.map(p => p.featureKey).join(',')}`);
  } else {
    log('NO SECONDARY');
  }
}

log('\n=== ALTERNATIVES SAMPLE (software-eng $100/5 editor+reasoning) ===');
{
  const s = summarize(base());
  for (const a of s.alts) log(`  ${a.purpose} | ${a.tools} | $${a.cost}`);
}

log('\n=== COMPOSITE TRACE TOP 8 BY DOMAIN (no reqs, $null, team=5, balanced) ===');
for (const d of ['software-engineering', 'research-knowledge', 'content-communication', 'ai-data-ml', 'enterprise-compliance'] as const) {
  const s = summarize(base({ domain: d, monthlyBudget: null, requirements: [] }));
  log(`${d}: P=${s.primary} ${s.topTrace.join('  ')}`);
}

log('\n=== HARDCODED ID SCAN NOTES (static) done ===');
log('DONE');
