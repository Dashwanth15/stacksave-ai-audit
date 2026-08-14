import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import type { StackRecommendation, RankedStack } from '../types';
import Logo from '../components/Logo';

const STACK_TABS = [
  { key: 'bestOverall',     label: '⭐ Best Overall',     color: '#1E3A5F' },
  { key: 'bestBudget',      label: '💰 Best Budget',      color: '#059669' },
  { key: 'bestPerformance', label: '🚀 Best Performance', color: '#D97706' },
  { key: 'bestEnterprise',  label: '🏢 Best Enterprise',  color: '#0EA5E9' },
];

const CONFIDENCE_LABELS: Record<string, string> = {
  workflowMatch: 'Workflow Match',
  featureCoverage: 'Feature Coverage',
  budgetFit: 'Budget Fit',
  capabilitySuperiority: 'Capability',
  securityMatch: 'Security Match',
  vendorStability: 'Vendor Stability',
  futureGrowth: 'Future Growth',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  workflowMatch: '#1E3A5F',
  featureCoverage: '#059669',
  budgetFit: '#D97706',
  capabilitySuperiority: '#475569',
  securityMatch: '#0EA5E9',
  vendorStability: '#DC2626',
  futureGrowth: '#047857',
};

const CATEGORY_ICONS: Record<string, string> = {
  ide: '🖥️', chat: '💬', api: '🔌', search: '🔍',
};

function ScoreGauge({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-2xl font-extrabold font-mono-financial block" style={{ color }}>{score}</span>
        <span className="text-[10px] uppercase font-bold text-slate-400">Score</span>
      </div>
    </div>
  );
}

function ConfidenceBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-xs">
      <span className="text-slate-600 font-medium truncate">{label}</span>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <m.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: color }}
        />
      </div>
      <span className="font-mono-financial font-bold text-right" style={{ color }}>{value}%</span>
    </div>
  );
}

export default function BuildStackResultsPage() {
  const navigate = useNavigate();
  const [rec, setRec] = useState<StackRecommendation | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bestOverall');
  const [growthView, setGrowthView] = useState<'2x' | '5x'>('2x');
  const [showAlts, setShowAlts] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('stackRecommendation');
    if (!raw) { navigate('/build-stack'); return; }
    try { setRec(JSON.parse(raw)); } catch { navigate('/build-stack'); }
  }, [navigate]);

  if (!rec) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-[#1E3A5F] rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading recommendation architecture…</p>
      </div>
    );
  }

  const stacks = rec.stacks;
  const availableTabs = STACK_TABS.filter(t => stacks[t.key as keyof typeof stacks]);
  const currentStack = stacks[activeTab as keyof typeof stacks] as RankedStack | undefined;

  if (!currentStack) return null;

  const growthSim = stacks.bestOverall.growthSimulation;
  const growthTarget = growthView === '2x' ? growthSim?.projection2x : growthSim?.projection5x;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-base, #F7F8FA)', color: 'var(--color-text-body, #334155)' }}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-xl border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 h-[72px] flex items-center justify-between">
          <button onClick={() => navigate('/')} className="focus:outline-none">
            <Logo size="md" asDiv />
          </button>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Flow 2 Architecture
            </span>
            <button
              onClick={() => navigate('/build-stack')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white"
            >
              ← Rebuild Form
            </button>
          </div>
        </div>
      </header>

      {/* Metadata Bar */}
      <div className="bg-white border-b border-slate-200 py-2 px-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 flex-wrap">
        <span className="font-semibold text-slate-700">Knowledge Engine v{rec.knowledgeVersion.featureMapVersion}</span>
        <span className="opacity-40">·</span>
        <span>{rec.knowledgeVersion.providerCount} Providers Cross-Scored</span>
        <span className="opacity-40">·</span>
        <span>Generated {new Date(rec.createdAt).toLocaleTimeString()}</span>
      </div>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* ── Section 1: Stack Tabs ── */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableTabs.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-white shadow-sm border-slate-300 text-slate-900 ring-2 ring-[#1E3A5F]/20'
                    : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* ── Section 2: Recommended Suite Cards ── */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#10B981]">
                    {currentStack.label} Suite Architecture
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">Recommended Stack Tools</h2>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-semibold block">Total Estimated Cost</span>
                    <span className="text-2xl font-extrabold font-mono-financial text-[#059669]">
                      ${currentStack.estimatedMonthlyCost.toLocaleString()}
                      <span className="text-xs font-normal text-slate-500">/mo</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentStack.tools.map(tool => (
                  <div key={tool.toolId} className="border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm rounded-xl p-5 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{CATEGORY_ICONS[tool.category] || '⚙️'}</span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">{tool.toolName}</h3>
                            <span className="text-xs text-slate-400 block">{tool.vendor}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-200/60 text-slate-700">
                          {tool.recommendedPlan}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Workflow Fit</span>
                          <span className="font-bold text-[#1E3A5F]">{tool.workflowFitScore}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Team Cost</span>
                          <span className="font-bold font-mono-financial text-slate-800">${tool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo</span>
                        </div>
                      </div>

                      {tool.capabilityHighlights.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {tool.capabilityHighlights.slice(0, 2).map((h, i) => (
                            <div key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5 leading-snug">
                              <span className="text-emerald-600 font-bold shrink-0">✓</span>
                              <span>{h}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {currentStack.tradeoffs.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/60 text-amber-900 text-xs space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block">Tradeoff Considerations</span>
                  {currentStack.tradeoffs.map((t, i) => (
                    <p key={i}>• {t}</p>
                  ))}
                </div>
              )}
            </section>

            {/* ── Section 3: Confidence & Feature Coverage Side-by-Side ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Confidence Score Panel */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-base font-extrabold text-slate-900">Deterministic Confidence Score</h3>
                <div className="flex items-center gap-6">
                  <ScoreGauge score={currentStack.confidenceScore} />
                  <div className="flex-1 space-y-2.5">
                    {Object.entries(currentStack.confidenceBreakdown)
                      .filter(([k]) => k !== 'overall')
                      .map(([key, val]) => (
                        <ConfidenceBar
                          key={key}
                          label={CONFIDENCE_LABELS[key] || key}
                          value={val as number}
                          color={CONFIDENCE_COLORS[key] || '#1E3A5F'}
                        />
                      ))}
                  </div>
                </div>
              </section>

              {/* Feature Coverage Map */}
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900">Feature Coverage Analysis</h3>
                  <span className="text-xs font-bold font-mono-financial text-[#059669]">
                    {currentStack.coverageResult.coverageScore}% Covered
                  </span>
                </div>

                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {currentStack.coverageResult.covered.map(f => (
                    <div key={f.featureKey} className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="font-semibold text-slate-800">{f.featureLabel}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">by {f.coveredBy.join(', ')}</span>
                    </div>
                  ))}
                  {currentStack.coverageResult.partial.map(f => (
                    <div key={f.featureKey} className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 font-bold">~</span>
                        <span className="font-semibold text-slate-800">{f.featureLabel}</span>
                      </div>
                      <span className="text-[11px] text-amber-700 font-medium">Partial</span>
                    </div>
                  ))}
                  {currentStack.coverageResult.missing.map(f => (
                    <div key={f} className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span className="font-semibold text-slate-800">{f.replace(/-/g, ' ')}</span>
                      </div>
                      <span className="text-[11px] text-rose-600 font-medium">Missing</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </m.div>
        </AnimatePresence>

        {/* ── Section 4: Growth Projections ── */}
        {growthSim && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Scaling & Growth Simulation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Projected plan upgrades as your engineering team grows</p>
              </div>
              <div className="flex gap-2">
                {(['2x', '5x'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setGrowthView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      growthView === v ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {v} Team ({v === '2x' ? growthSim.projection2x.teamSize : growthSim.projection5x.teamSize} devs)
                  </button>
                ))}
              </div>
            </div>

            {growthTarget && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Projected Monthly Spend</span>
                  <div className="text-3xl font-extrabold font-mono-financial text-slate-900">
                    ${growthTarget.estimatedMonthlyCost.toLocaleString()}
                  </div>
                </div>
                <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Projected Annual Spend</span>
                  <div className="text-3xl font-extrabold font-mono-financial text-slate-900">
                    ${growthTarget.estimatedAnnualCost.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── Section 5: Budget Tier Matrix ── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-extrabold text-slate-900">Budget Scenario Simulation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rec.budgetSimulation.tiers.map((tier, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">{tier.budgetLabel}</span>
                <div className="text-xl font-extrabold font-mono-financial text-slate-900">
                  ${tier.estimatedMonthlyCost.toLocaleString()}/mo
                </div>
                <div className="text-xs font-semibold text-[#059669]">{tier.confidenceScore}% Confidence</div>
                <div className="pt-2 border-t border-slate-200/80 space-y-1 text-xs text-slate-600">
                  {tier.stackSummary.map((s, i) => (
                    <div key={i} className="truncate">• {s}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Section 6: Alternatives Panel ── */}
        {rec.alternatives.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <button
              onClick={() => setShowAlts(v => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <span>{showAlts ? '▲ Hide Rejection Reasons' : '▼ Why Weren\'t Other Tools Selected?'} ({rec.alternatives.length} Alternatives)</span>
            </button>
            <AnimatePresence>
              {showAlts && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 pt-2"
                >
                  {rec.alternatives.map(alt => (
                    <div key={alt.toolId} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{alt.toolName} ({alt.category})</span>
                        <span className="text-slate-500 font-mono-financial">Score: {alt.compositeScore}%</span>
                      </div>
                      <p className="text-slate-600">{alt.whyNotSelected}</p>
                    </div>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </section>
        )}

      </main>
    </div>
  );
}
