import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StackIntelligenceResult, DecisionReport, ReplaceOpportunity } from '../types/intelligence';
import Logo from '../components/Logo';
import DecisionReportModal from '../components/intelligence/DecisionReportModal';
import PlatformLogo from '../components/intelligence/PlatformLogo';

export default function ReplacementsDashboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const intelligence: StackIntelligenceResult | null = (location.state as any)?.intelligence || null;
  const [activeReport, setActiveReport] = useState<DecisionReport | null>(null);

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'savings' | 'retention'>('score');

  const rawReplacements: ReplaceOpportunity[] = intelligence?.replacements || [];

  const filtered = useMemo(() => {
    return rawReplacements
      .filter((opp) => {
        const matchesSearch =
          opp.sourceToolName.toLowerCase().includes(search.toLowerCase()) ||
          opp.targetToolName.toLowerCase().includes(search.toLowerCase());
        const matchesRisk = riskFilter === 'all' || opp.riskLevel === riskFilter;
        return matchesSearch && matchesRisk;
      })
      .sort((a, b) => {
        if (sortBy === 'savings') return b.monthlySavings - a.monthlySavings;
        if (sortBy === 'retention') return b.capabilityRetentionPercent - a.capabilityRetentionPercent;
        return (b.opportunityScore?.overall ?? 85) - (a.opportunityScore?.overall ?? 85);
      });
  }, [rawReplacements, search, riskFilter, sortBy]);

  const maxSavings = Math.max(0, ...rawReplacements.map((r) => r.monthlySavings));
  const topScore = Math.max(0, ...rawReplacements.map((r) => r.opportunityScore?.overall ?? 85));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-indigo-500 selection:text-white">
      {/* ── Header Bar ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-indigo-600 tracking-wider">AI Decision Intelligence</span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>🔁</span> AI Replacement Dashboard
              </h1>
            </div>
          </div>

          <button
            onClick={() => navigate(id ? `/audit/${id}` : (-1 as any))}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            ← Back to Audit Results
          </button>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* ── Top Stats KPI Bar ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Discovered Paths</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">{rawReplacements.length}</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Highest Opportunity Score</span>
            <span className="text-3xl font-black text-emerald-600 font-mono-financial">{topScore}<span className="text-sm font-normal text-slate-400">/100</span></span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Max Monthly Savings</span>
            <span className="text-3xl font-black text-indigo-600 font-mono-financial">${maxSavings.toFixed(2)}/mo</span>
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
              placeholder="Search tool names..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500 bg-slate-50/50"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Risk:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
              >
                <option value="all">All Risk Tiers</option>
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
              >
                <option value="score">Highest Opportunity Score</option>
                <option value="savings">Highest Savings</option>
                <option value="retention">Capability Retention</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Replacements List ─────────────────────────────────────── */}
        <div className="space-y-6">
          {filtered.map((opp, idx) => {
            const isCostSave = opp.costDirection === 'savings' || (opp.netCostDelta && opp.netCostDelta < -0.01) || (opp.monthlySavings > 0);
            const isCostUp = opp.costDirection === 'increase' || (opp.netCostDelta && opp.netCostDelta > 0.01);

            const savingsAmount = Math.max(0, Number(opp.monthlySavings) || 0);
            const annualAmount = savingsAmount * 12;
            const score = opp.opportunityScore?.overall ?? 85;

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* ── SECTION 1: TOP ROW (CURRENT -> RECOMMENDED + OPP SCORE & FINANCIAL IMPACT) ── */}
                <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Left: Real platform comparison identity (NO PILL, NO BORDER, CLEAN TYPOGRAPHY) */}
                  <div className="flex items-center gap-6 sm:gap-8">
                    {/* Current Platform */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Current
                      </div>
                      <div className="flex items-center gap-2">
                        <PlatformLogo name={opp.sourceToolName} />
                        <span className="text-base font-bold text-slate-900 tracking-tight">
                          {opp.sourceToolName}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-slate-300 text-lg font-light flex items-center justify-center pt-3">
                      →
                    </div>

                    {/* Recommended Platform */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-indigo-600 mb-1.5">
                        Recommended
                      </div>
                      <div className="flex items-center gap-2">
                        <PlatformLogo name={opp.targetToolName} />
                        <span className="text-base font-bold text-indigo-700 tracking-tight">
                          {opp.targetToolName}
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
                        <span className="text-2xl font-black font-mono-financial text-slate-900">
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
                      {isCostSave ? (
                        <div>
                          <div className="text-2xl font-black font-mono-financial text-emerald-600">
                            Save ${savingsAmount.toFixed(2)}/mo
                          </div>
                          <div className="text-xs font-medium text-slate-400">
                            ≈ ${annualAmount.toFixed(0)}/year
                          </div>
                        </div>
                      ) : isCostUp ? (
                        <div>
                          <div className="text-2xl font-black font-mono-financial text-amber-600">
                            +${Math.abs(opp.netCostDelta ?? savingsAmount).toFixed(2)}/mo
                          </div>
                          <div className="text-xs font-bold text-amber-700">
                            Capability Upgrade
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg font-bold font-mono-financial text-slate-700">
                            $0.00
                          </div>
                          <div className="text-xs font-medium text-slate-400">
                            Cost Neutral
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: 4-COLUMN METRICS ROW (WITH VERTICAL DIVIDERS) ── */}
                <div className="px-6 py-4 border-t border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
                  {/* Col 1: Workflow Match */}
                  <div className="text-left md:border-r border-slate-200 md:pr-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Workflow Match
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono-financial">
                      {opp.compatibilityScore}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Good fit
                    </div>
                  </div>

                  {/* Col 2: Capability Retention */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Capability Retention
                    </div>
                    <div className="text-base font-black text-indigo-700 font-mono-financial">
                      {opp.capabilityRetentionPercent}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Full coverage
                    </div>
                  </div>

                  {/* Col 3: Migration Friction */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Migration Friction
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {opp.migrationDifficulty}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {opp.migrationDifficulty}
                    </div>
                  </div>

                  {/* Col 4: Risk */}
                  <div className="text-left md:pl-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Risk
                    </div>
                    <div className={`text-base font-black ${opp.riskLevel === 'Low' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {opp.riskLevel} Risk
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {opp.riskLevel === 'Low' ? 'Low risk' : 'Moderate risk'}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: FOOTER (CONCISE RECOMMENDATION SENTENCE + VIEW DECISION REPORT) ── */}
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Recommendation sentence */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      Replace <strong>{opp.sourceToolName}</strong> with <strong className="text-indigo-700">{opp.targetToolName}</strong> to save <strong className="text-emerald-600 font-mono-financial">${savingsAmount.toFixed(2)}/mo</strong> while retaining <strong>{opp.capabilityRetentionPercent}%</strong> of required capabilities.
                    </p>
                  </div>

                  {/* Right: View Decision Report Action Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => setActiveReport(opp.decisionReport)}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
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
              <h3 className="font-bold text-slate-800 text-sm">No matching replacement opportunities found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query or risk filters to view all replacement paths.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setRiskFilter('all');
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                Reset Filters
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
