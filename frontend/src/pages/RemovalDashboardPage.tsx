import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StackIntelligenceResult, DecisionReport, RemoveOpportunity } from '../types/intelligence';
import Logo from '../components/Logo';
import DecisionReportModal from '../components/intelligence/DecisionReportModal';

export default function RemovalDashboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const intelligence: StackIntelligenceResult | null = (location.state as any)?.intelligence || null;
  const [activeReport, setActiveReport] = useState<DecisionReport | null>(null);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'score' | 'savings' | 'coverage'>('score');

  const rawRemovals: RemoveOpportunity[] = intelligence?.removals || [];

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-rose-600 tracking-wider">AI Decision Intelligence</span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">🗑️ AI Removal Dashboard</h1>
            </div>
          </div>

          <button
            onClick={() => navigate(id ? `/audit/${id}` : -1 as any)}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1.5"
          >
            ← Back to Audit Results
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">

        {/* Stats KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <span className="text-3xl font-black text-emerald-600 font-mono-financial">${maxSavings}/mo</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Max Annual Impact</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">${maxSavings * 12}/yr</span>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
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
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-500">Tier:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
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
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="score">Highest Opportunity Score</option>
                <option value="savings">Highest Savings</option>
                <option value="coverage">Remaining Coverage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Removals List */}
        <div className="space-y-4">
          {filtered.map((opp, idx) => {
            const badgeStyle =
              opp.classification === 'safe_to_remove'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : opp.classification === 'replace_before_removing'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : opp.classification === 'optional_tool'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-800 border-rose-200';

            return (
              <div
                key={idx}
                className="p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-rose-200 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-black text-lg text-slate-900">{opp.toolName}</h3>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-lg border ${badgeStyle}`}>
                      {opp.classificationLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Opp. Score</span>
                      <span className="text-xl font-black text-rose-600 font-mono-financial">{opp.opportunityScore?.overall ?? 85}/100</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black font-mono-financial text-emerald-600 block">
                        Save ${opp.monthlySavings}/mo
                      </span>
                      <span className="text-xs font-medium text-slate-400 block">
                        ≈ ${opp.annualSavings}/year
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Remaining Coverage</span>
                    <span className="font-bold text-indigo-600">{opp.remainingCoveragePercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Removal Confidence</span>
                    <span className="font-bold text-slate-900">{opp.removalConfidence}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Uncovered Gaps</span>
                    <span className="font-bold text-rose-600">{opp.capabilitiesLost.length} capabilities</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">{opp.recommendation}</p>
                  <button
                    onClick={() => setActiveReport(opp.decisionReport)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shrink-0 shadow-2xs"
                  >
                    View Decision Report ➔
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              No tool removal assessments match your active search and filter criteria.
            </div>
          )}
        </div>
      </main>

      {/* Full Decision Report Drawer */}
      <DecisionReportModal report={activeReport} onClose={() => setActiveReport(null)} />
    </div>
  );
}
