import { useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { StackIntelligenceResult, DecisionReport, ConsolidateOpportunity } from '../types/intelligence';
import Logo from '../components/Logo';
import DecisionReportModal from '../components/intelligence/DecisionReportModal';

export default function ConsolidationDashboardPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const intelligence: StackIntelligenceResult | null = (location.state as any)?.intelligence || null;
  const [activeReport, setActiveReport] = useState<DecisionReport | null>(null);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'savings' | 'coverage'>('score');

  const rawConsolidations: ConsolidateOpportunity[] = intelligence?.consolidations || [];

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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-600 tracking-wider">AI Decision Intelligence</span>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">⚡ AI Consolidation Dashboard</h1>
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
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Discovered Options</span>
            <span className="text-3xl font-black text-slate-900 font-mono-financial">{rawConsolidations.length}</span>
          </div>
          <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">Highest Opportunity Score</span>
            <span className="text-3xl font-black text-amber-600 font-mono-financial">{topScore}<span className="text-sm font-normal text-slate-400">/100</span></span>
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
              placeholder="Search tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500 bg-slate-50/50"
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
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
              <option value="coverage">Coverage Retained</option>
            </select>
          </div>
        </div>

        {/* Consolidations List */}
        <div className="space-y-4">
          {filtered.map((opp, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:border-amber-200 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-sm font-black text-slate-900 flex-wrap">
                  <span className="px-4 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                    {opp.decommissionedToolNames.join(' + ')}
                  </span>
                  <span className="text-amber-600 font-bold text-sm">➔ Absorb Into</span>
                  <span className="px-4 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                    {opp.absorbingToolName}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                    <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Opp. Score</span>
                    <span className="text-xl font-black text-amber-600 font-mono-financial">{opp.opportunityScore?.overall ?? 85}/100</span>
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
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Coverage Retained</span>
                  <span className="font-bold text-indigo-600">{opp.coverageRetainedPercent}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Workflow Match</span>
                  <span className="font-bold text-slate-900">{opp.workflowMatchPercent}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Business Score</span>
                  <span className="font-bold text-emerald-700">{opp.businessValueScore}/100</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">{opp.recommendation}</p>
                <button
                  onClick={() => setActiveReport(opp.decisionReport)}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors shrink-0 shadow-2xs"
                >
                  View Decision Report ➔
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              No consolidation opportunities match your active search criteria.
            </div>
          )}
        </div>
      </main>

      {/* Full Decision Report Drawer */}
      <DecisionReportModal report={activeReport} onClose={() => setActiveReport(null)} />
    </div>
  );
}
