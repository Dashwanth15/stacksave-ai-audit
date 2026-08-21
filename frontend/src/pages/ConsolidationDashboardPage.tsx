import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StackIntelligenceResult, DecisionReport, ConsolidateOpportunity } from '../types/intelligence';
import Logo from '../components/Logo';
import DecisionReportModal from '../components/intelligence/DecisionReportModal';
import PlatformLogo from '../components/intelligence/PlatformLogo';

export default function ConsolidationDashboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const locationState = location.state as { intelligence?: StackIntelligenceResult } | null;
  const intelligence: StackIntelligenceResult | null = locationState?.intelligence || null;
  const [activeReport, setActiveReport] = useState<DecisionReport | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'savings' | 'coverage'>('score');

  const rawConsolidations: ConsolidateOpportunity[] = useMemo(
    () => intelligence?.consolidations || [],
    [intelligence]
  );

  const filtered = useMemo(() => {
    return rawConsolidations
      .filter((opp) => {
        const matchesSearch =
          opp.decommissionedToolNames.some((n) => n.toLowerCase().includes(search.toLowerCase())) ||
          opp.absorbingToolName.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'savings') return b.monthlySavings - a.monthlySavings;
        if (sortBy === 'coverage') return b.coverageRetainedPercent - a.coverageRetainedPercent;
        return (b.opportunityScore?.overall ?? 85) - (a.opportunityScore?.overall ?? 85);
      });
  }, [rawConsolidations, search, sortBy]);

  const maxSavings = Math.max(0, ...rawConsolidations.map((c) => c.monthlySavings));
  const topScore = Math.max(0, ...rawConsolidations.map((c) => c.opportunityScore?.overall ?? 85));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-amber-500 selection:text-white">
      {/* ── Header Bar ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">AI Decision Intelligence</span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>⚡</span> AI Consolidation Dashboard
              </h1>
            </div>
          </div>

          <button
            onClick={() => {
              if (id) navigate(`/audit/${id}`);
              else navigate(-1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            ← Back to Audit Results
          </button>

        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* ── Stats KPI Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Discovered Options</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">{rawConsolidations.length}</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Highest Opportunity Score</span>
            <span className="text-3xl font-black text-amber-600 font-mono-financial">{topScore}<span className="text-sm font-normal text-slate-400">/100</span></span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Max Monthly Savings</span>
            <span className="text-3xl font-black text-emerald-600 font-mono-financial">${maxSavings.toFixed(2)}/mo</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Max Annual Impact</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">${(maxSavings * 12).toFixed(0)}/yr</span>
          </div>
        </div>

        {/* ── Filters & Search Toolbar ──────────────────────────────── */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 bg-slate-50/50"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'savings' | 'coverage')}
              className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
            >

              <option value="score">Highest Opportunity Score</option>
              <option value="savings">Highest Savings</option>
              <option value="coverage">Coverage Retained</option>
            </select>
          </div>
        </div>

        {/* ── Consolidations List ───────────────────────────────────── */}
        <div className="space-y-6">
          {filtered.map((opp, idx) => {
            const savingsAmount = Math.max(0, Number(opp.monthlySavings) || 0);
            const annualAmount = savingsAmount * 12;
            const score = opp.opportunityScore?.overall ?? 85;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all hover:border-amber-300"
              >
                {/* ── SECTION 1: TOP ROW (CURRENT STACK -> TARGET + OPP SCORE & FINANCIAL IMPACT) ── */}
                <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Platform consolidation identity (REAL LOGOS, NO PILL, NO BORDER) */}
                  <div className="flex items-center gap-6 sm:gap-8 flex-wrap">
                    {/* Current Stack */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Current Stack
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {opp.decommissionedToolNames.map((toolName, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-1.5">
                            {tIdx > 0 && <span className="text-slate-400 font-black text-sm mr-1">+</span>}
                            <PlatformLogo name={toolName} />
                            <span className="text-base font-bold text-slate-900 tracking-tight">
                              {toolName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-amber-500 text-lg font-light flex items-center justify-center pt-3">
                      →
                    </div>

                    {/* Target Platform */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1.5">
                        Recommended Target
                      </div>
                      <div className="flex items-center gap-2">
                        <PlatformLogo name={opp.absorbingToolName} />
                        <span className="text-base font-bold text-amber-700 tracking-tight">
                          {opp.absorbingToolName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Opportunity Score & Financial Impact */}
                  <div className="flex items-center gap-8 self-end md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {/* Opportunity Score */}
                    <div className="text-right">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Opportunity Score
                      </div>
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span className="text-2xl font-black font-mono-financial text-amber-600">
                          {score}
                        </span>
                        <span className="text-xs font-normal text-slate-400">/100</span>
                      </div>
                    </div>

                    {/* Financial Impact */}
                    <div className="text-right">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Financial Impact
                      </div>
                      <div>
                        <div className="text-2xl font-black font-mono-financial text-emerald-600">
                          Save ${savingsAmount.toFixed(2)}/mo
                        </div>
                        <div className="text-xs font-medium text-slate-400">
                          ≈ ${annualAmount.toFixed(0)}/year
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: 4-COLUMN METRICS ROW (WITH VERTICAL DIVIDERS) ── */}
                <div className="px-6 py-4 border-t border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
                  {/* Col 1: Coverage Retained */}
                  <div className="text-left md:border-r border-slate-200 md:pr-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Coverage Retained
                    </div>
                    <div className="text-base font-black text-indigo-700 font-mono-financial">
                      {opp.coverageRetainedPercent}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Capability overlap
                    </div>
                  </div>

                  {/* Col 2: Workflow Match */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Workflow Match
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono-financial">
                      {opp.workflowMatchPercent}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Good fit
                    </div>
                  </div>

                  {/* Col 3: Business Score */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Business Score
                    </div>
                    <div className="text-base font-black text-emerald-700 font-mono-financial">
                      {opp.businessValueScore}/100
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      ROI value
                    </div>
                  </div>

                  {/* Col 4: Redundancy Eliminated */}
                  <div className="text-left md:pl-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Redundancy Eliminated
                    </div>
                    <div className="text-base font-black text-amber-600">
                      {opp.decommissionedToolNames.length} Tools
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Licenses absorbed
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: FOOTER (CONCISE RECOMMENDATION + VIEW DECISION REPORT) ── */}
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Recommendation sentence */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      Consolidate <strong>{opp.decommissionedToolNames.join(' + ')}</strong> into <strong className="text-amber-700">{opp.absorbingToolName}</strong> to eliminate redundant licensing and save <strong className="text-emerald-600 font-mono-financial">${savingsAmount.toFixed(2)}/mo</strong>.
                    </p>
                  </div>

                  {/* Right: View Decision Report Action Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => setActiveReport(opp.decisionReport)}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
                    >
                      <span>View Decision Report</span>
                      <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="text-3xl">🔍</div>
              <h3 className="font-bold text-slate-800 text-sm">No matching consolidation opportunities found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query or sorting options to view all options.
              </p>
              <button
                onClick={() => setSearch('')}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Full Decision Report Drawer Modal ──────────────────────── */}
      <DecisionReportModal report={activeReport} onClose={() => setActiveReport(null)} />
    </div>
  );
}
