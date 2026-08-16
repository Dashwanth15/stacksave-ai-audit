import { useNavigate } from 'react-router-dom';
import type { StackIntelligenceResult } from '../../types/intelligence';

interface StrategicGuidanceSectionProps {
  intelligence: StackIntelligenceResult | null;
  auditId?: string;
}

// Premium SVG icon: Replacement (bidirectional arrows)
function IconReplacement() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

// Premium SVG icon: Consolidation (funnel merge)
function IconConsolidation() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V4" />
      <path d="M5 9l7-5 7 5" />
      <path d="M5 15l7 5 7-5" />
    </svg>
  );
}

// Premium SVG icon: Removal (trash/bin)
function IconRemoval() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
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
        <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 tracking-widest">
          Strategy Engine
        </span>
      </div>

      {/* 3 Explorer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 1. Replacement Explorer — Indigo accent */}
        <div
          className="group p-5 border border-slate-200/80 rounded-2xl bg-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/80 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          onClick={() => navigate(buildUrl('replacements'), { state: { intelligence, auditId } })}
        >
          <div className="space-y-4">
            {/* Icon + Count */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-200">
                <IconReplacement />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {repCount} path{repCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Title + Description */}
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-[15px] text-slate-900 tracking-tight leading-snug">
                AI Replacement Explorer
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Evaluate directional tool swaps (Tool A → Tool B) with capability delta matrix and migration checklists.
              </p>
            </div>
          </div>

          {/* Stats + CTA */}
          <div className="space-y-3 pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score</span>
              <span className="font-black text-indigo-600 font-mono tabular-nums">
                {repTopScore}<span className="text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings</span>
              <span className="font-black text-slate-900 font-mono tabular-nums">
                ${repMaxSavings}<span className="text-slate-400 font-normal">/mo</span>
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(buildUrl('replacements'), { state: { intelligence, auditId } }); }}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-indigo-200"
            >
              Explore Replacements
              <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        {/* 2. Consolidation Explorer — Emerald accent */}
        <div
          className="group p-5 border border-slate-200/80 rounded-2xl bg-white hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-50/80 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          onClick={() => navigate(buildUrl('consolidation'), { state: { intelligence, auditId } })}
        >
          <div className="space-y-4">
            {/* Icon + Count */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all duration-200">
                <IconConsolidation />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {consCount} option{consCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Title + Description */}
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-[15px] text-slate-900 tracking-tight leading-snug">
                AI Consolidation Explorer
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Discover multi-tool stack absorption (2→1, 3→1) to eliminate licensing overlap and vendor fragmentation.
              </p>
            </div>
          </div>

          {/* Stats + CTA */}
          <div className="space-y-3 pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score</span>
              <span className="font-black text-emerald-600 font-mono tabular-nums">
                {consTopScore}<span className="text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings</span>
              <span className="font-black text-slate-900 font-mono tabular-nums">
                ${consMaxSavings}<span className="text-slate-400 font-normal">/mo</span>
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(buildUrl('consolidation'), { state: { intelligence, auditId } }); }}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-emerald-200"
            >
              Explore Consolidations
              <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

        {/* 3. Removal Explorer — Rose accent */}
        <div
          className="group p-5 border border-slate-200/80 rounded-2xl bg-white hover:border-rose-300 hover:shadow-lg hover:shadow-rose-50/80 transition-all duration-200 flex flex-col justify-between cursor-pointer"
          onClick={() => navigate(buildUrl('removal'), { state: { intelligence, auditId } })}
        >
          <div className="space-y-4">
            {/* Icon + Count */}
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-200">
                <IconRemoval />
              </div>
              <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                {remCount} evaluated
              </span>
            </div>

            {/* Title + Description */}
            <div className="space-y-1.5">
              <h4 className="font-extrabold text-[15px] text-slate-900 tracking-tight leading-snug">
                AI Removal Explorer
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                4-tier removal risk assessment comparing each tool against remaining stack capability coverage.
              </p>
            </div>
          </div>

          {/* Stats + CTA */}
          <div className="space-y-3 pt-4 mt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Top Opp. Score</span>
              <span className="font-black text-rose-600 font-mono tabular-nums">
                {remTopScore}<span className="text-slate-400 font-normal">/100</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Max Monthly Savings</span>
              <span className="font-black text-slate-900 font-mono tabular-nums">
                ${remMaxSavings}<span className="text-slate-400 font-normal">/mo</span>
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(buildUrl('removal'), { state: { intelligence, auditId } }); }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-rose-200"
            >
              Explore Tool Removals
              <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}


