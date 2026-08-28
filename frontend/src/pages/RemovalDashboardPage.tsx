import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StackIntelligenceResult, DecisionReport, RemoveOpportunity } from '../types/intelligence';
import Logo from '../components/Logo';
import DecisionReportModal from '../components/intelligence/DecisionReportModal';
import PlatformLogo from '../components/intelligence/PlatformLogo';
import OfferNotificationBell from '../components/OfferNotificationBell';


export default function RemovalDashboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const locationState = location.state as { intelligence?: StackIntelligenceResult } | null;
  const intelligence: StackIntelligenceResult | null = locationState?.intelligence || null;
  const [activeReport, setActiveReport] = useState<DecisionReport | null>(null);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'savings' | 'coverage'>('score');

  const rawRemovals: RemoveOpportunity[] = useMemo(
    () => intelligence?.removals || [],
    [intelligence]
  );

  const filtered = useMemo(() => {
    return rawRemovals
      .filter((opp) => {
        const matchesSearch = opp.toolName.toLowerCase().includes(search.toLowerCase());
        const matchesClass = classFilter === 'all' || opp.classification === classFilter;
        return matchesSearch && matchesClass;
      })
      .sort((a, b) => {
        if (sortBy === 'savings') return b.monthlySavings - a.monthlySavings;
        if (sortBy === 'coverage') return b.remainingCoveragePercent - a.remainingCoveragePercent;
        return (b.opportunityScore?.overall ?? 85) - (a.opportunityScore?.overall ?? 85);
      });
  }, [rawRemovals, search, classFilter, sortBy]);

  const maxSavings = Math.max(0, ...rawRemovals.map((r) => r.monthlySavings));
  const topScore = Math.max(0, ...rawRemovals.map((r) => r.opportunityScore?.overall ?? 85));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans selection:bg-rose-500 selection:text-white">
      {/* ── Header Bar ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider">AI Decision Intelligence</span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>🗑️</span> AI Removal Dashboard
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <OfferNotificationBell />
            <button
              onClick={() => {
                if (id) navigate(`/audit/${id}`);
                else navigate(-1);
              }}
              className="px-3 sm:px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span className="hidden sm:inline">← Back to Audit Results</span>
              <span className="inline sm:hidden">← Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* ── Stats KPI Bar ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Evaluated Tools</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">{rawRemovals.length}</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Highest Opportunity Score</span>
            <span className="text-3xl font-black text-rose-600 font-mono-financial">{topScore}<span className="text-sm font-normal text-slate-400">/100</span></span>
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
              placeholder="Search tool name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-rose-500 bg-slate-50/50"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap justify-between md:justify-end">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Tier:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer"
              >
                <option value="all">All Classifications</option>
                <option value="safe_to_remove">🟢 Safe to Remove</option>
                <option value="replace_before_removing">🟡 Replace Before Removing</option>
                <option value="optional_tool">🔵 Optional Tool</option>
                <option value="critical_tool">🔴 Critical Tool</option>
              </select>
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
                <option value="coverage">Remaining Coverage</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Removals List ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {filtered.map((opp, idx) => {
            const savingsAmount = Math.max(0, Number(opp.monthlySavings) || 0);
            const annualAmount = savingsAmount * 12;
            const score = opp.opportunityScore?.overall ?? 85;

            const isSafe = opp.classification === 'safe_to_remove';
            const isReplaceFirst = opp.classification === 'replace_before_removing';
            const isCritical = opp.classification === 'critical_tool';

            const statusDot = isSafe ? '🟢' : isReplaceFirst ? '🟡' : isCritical ? '🔴' : '🔵';
            const statusTextColor = isSafe
              ? 'text-emerald-700'
              : isReplaceFirst
              ? 'text-amber-700'
              : isCritical
              ? 'text-rose-700'
              : 'text-blue-700';

            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all hover:border-rose-300"
              >
                {/* ── SECTION 1: TOP ROW (CURRENT TOOL + STATUS & OPP SCORE / SAVINGS) ── */}
                <div className="p-4 sm:px-6 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
                  {/* Left: Platform removal identity (REAL LOGOS, NO PILL, NO BORDER) */}
                  <div className="flex items-center gap-4 sm:gap-8 flex-wrap">
                    {/* Current Tool */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Current Tool
                      </div>
                      <div className="flex items-center gap-2">
                        <PlatformLogo name={opp.toolName} />
                        <span className="text-base font-bold text-slate-900 tracking-tight">
                          {opp.toolName}
                        </span>
                      </div>
                    </div>

                    {/* Separator */}
                    <div className="text-slate-300 text-lg font-light flex items-center justify-center pt-3">
                      •
                    </div>

                    {/* Status */}
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Assessment Status
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{statusDot}</span>
                        <span className={`text-base font-bold tracking-tight uppercase ${statusTextColor}`}>
                          {opp.classificationLabel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Opportunity Score & Financial Impact */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    {/* Opportunity Score */}
                    <div className="text-right">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Opportunity Score
                      </div>
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span className="text-2xl font-black font-mono-financial text-rose-600">
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
                  {/* Col 1: Remaining Coverage */}
                  <div className="text-left md:border-r border-slate-200 md:pr-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Remaining Coverage
                    </div>
                    <div className="text-base font-black text-indigo-700 font-mono-financial">
                      {opp.remainingCoveragePercent}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Stack overlap
                    </div>
                  </div>

                  {/* Col 2: Removal Confidence */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Removal Confidence
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {opp.removalConfidence}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Confidence level
                    </div>
                  </div>

                  {/* Col 3: Uncovered Gaps */}
                  <div className="text-left md:border-r border-slate-200 md:px-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Uncovered Gaps
                    </div>
                    <div className={`text-base font-black ${opp.capabilitiesLost.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {opp.capabilitiesLost.length} {opp.capabilitiesLost.length === 1 ? 'capability' : 'capabilities'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Unique to this tool
                    </div>
                  </div>

                  {/* Col 4: Decommission Risk */}
                  <div className="text-left md:pl-6">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Decommission Risk
                    </div>
                    <div className={`text-base font-black ${isSafe ? 'text-emerald-600' : isReplaceFirst ? 'text-amber-600' : 'text-rose-600'}`}>
                      {isSafe ? 'Low Risk' : isReplaceFirst ? 'Medium Risk' : 'High Risk'}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {opp.classificationLabel}
                    </div>
                  </div>
                </div>

                {/* ── SECTION 3: FOOTER (CONCISE RECOMMENDATION + VIEW DECISION REPORT) ── */}
                <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Recommendation sentence */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      <strong>{opp.toolName}</strong>: {opp.recommendation}
                    </p>
                  </div>

                  {/* Right: View Decision Report Action Button */}
                  <div className="shrink-0">
                    <button
                      onClick={() => setActiveReport(opp.decisionReport)}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
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
              <h3 className="font-bold text-slate-800 text-sm">No matching removal opportunities found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try adjusting your search query or classification filters to view all tools.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setClassFilter('all');
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
