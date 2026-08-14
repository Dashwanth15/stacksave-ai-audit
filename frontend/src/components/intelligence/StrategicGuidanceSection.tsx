import { useNavigate } from 'react-router-dom';
import type { StackIntelligenceResult } from '../../types/intelligence';

interface StrategicGuidanceSectionProps {
  intelligence: StackIntelligenceResult | null;
  auditId?: string;
}

export default function StrategicGuidanceSection({
  intelligence,
  auditId,
}: StrategicGuidanceSectionProps) {
  const navigate = useNavigate();

  if (!intelligence) return null;

  const { replacements = [], consolidations = [], removals = [] } = intelligence;

  // Replacements stats
  const repCount = replacements.length;
  const repTopScore = Math.max(0, ...replacements.map((r) => r.opportunityScore?.overall ?? 85));
  const repMaxSavings = Math.max(0, ...replacements.map((r) => r.monthlySavings));

  // Consolidations stats
  const consCount = consolidations.length;
  const consTopScore = Math.max(0, ...consolidations.map((c) => c.opportunityScore?.overall ?? 85));
  const consMaxSavings = Math.max(0, ...consolidations.map((c) => c.monthlySavings));

  // Removals stats
  const remCount = removals.length;
  const remTopScore = Math.max(0, ...removals.map((r) => r.opportunityScore?.overall ?? 85));
  const remMaxSavings = Math.max(0, ...removals.map((r) => r.monthlySavings));

  const buildUrl = (path: string) => (auditId ? `/audit/${auditId}/${path}` : `/results/${path}`);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-200/60">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-overline block">AI Decision Intelligence Platform</span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Strategic Decision Guidance</h3>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono-financial">
          Deterministic Strategy Engine
        </span>
      </div>

      {/* 3 Compact Explorer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* 1. Replacement Explorer */}
        <div className="p-6 border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg">
              🔁
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900">AI Replacement Explorer</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  {repCount} Path(s)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Evaluate directional tool swaps ($Tool_A \rightarrow Tool_B$) with capability delta matrix and migration checklists.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score:</span>
              <span className="font-black text-emerald-600 font-mono-financial">{repTopScore}/100</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings:</span>
              <span className="font-black text-slate-900 font-mono-financial">${repMaxSavings}/mo</span>
            </div>

            <button
              onClick={() => navigate(buildUrl('replacements'), { state: { intelligence, auditId } })}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Explore Replacements ➔
            </button>
          </div>
        </div>

        {/* 2. Consolidation Explorer */}
        <div className="p-6 border border-slate-200 rounded-2xl bg-white hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg">
              ⚡
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900">AI Consolidation Explorer</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                  {consCount} Option(s)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Discover multi-tool stack absorption ($2 \rightarrow 1, 3 \rightarrow 1$) to eliminate licensing overlap and vendor fragmentation.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score:</span>
              <span className="font-black text-amber-600 font-mono-financial">{consTopScore}/100</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings:</span>
              <span className="font-black text-slate-900 font-mono-financial">${consMaxSavings}/mo</span>
            </div>

            <button
              onClick={() => navigate(buildUrl('consolidation'), { state: { intelligence, auditId } })}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Explore Consolidations ➔
            </button>
          </div>
        </div>

        {/* 3. Removal Explorer */}
        <div className="p-6 border border-slate-200 rounded-2xl bg-white hover:border-rose-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg">
              🗑️
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-base text-slate-900">AI Removal Explorer</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                  {remCount} Evaluated
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                4-tier removal risk assessment comparing each tool against remaining stack capability coverage.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score:</span>
              <span className="font-black text-rose-600 font-mono-financial">{remTopScore}/100</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings:</span>
              <span className="font-black text-slate-900 font-mono-financial">${remMaxSavings}/mo</span>
            </div>

            <button
              onClick={() => navigate(buildUrl('removal'), { state: { intelligence, auditId } })}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-600 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
            >
              Explore Tool Removals ➔
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
