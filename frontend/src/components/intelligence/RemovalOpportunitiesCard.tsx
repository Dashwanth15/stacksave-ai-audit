import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { RemoveOpportunity, DecisionReport } from '../../types/intelligence';

interface RemovalOpportunitiesCardProps {
  opportunities: RemoveOpportunity[];
  onOpenReport: (report: DecisionReport) => void;
}

export default function RemovalOpportunitiesCard({
  opportunities,
  onOpenReport,
}: RemovalOpportunitiesCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (opportunities.length === 0) return null;

  return (
    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs space-y-4">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-lg">
            🗑️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg tracking-tight text-slate-900">
                AI Tool Removal Opportunities
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700">
                {opportunities.length} Tool(s) Evaluated
              </span>
            </div>
            <p className="text-xs text-slate-500">
              4-tier risk classification: 🟢 Safe to Remove • 🟡 Replace Before • 🔵 Optional • 🔴 Critical
            </p>
          </div>
        </div>

        <button className="text-slate-400 hover:text-slate-600 font-bold text-sm">
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 pt-2"
          >
            {opportunities.map((opp, idx) => {
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
                  className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-slate-200 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-extrabold text-base text-slate-900">{opp.toolName}</h4>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${badgeStyle}`}>
                        {opp.classificationLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                        <span className="text-[9px] font-extrabold text-slate-400 block uppercase">Opp. Score</span>
                        <span className="text-base font-black text-rose-600 font-mono-financial">{opp.opportunityScore?.overall ?? 85}/100</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-lg font-black font-mono-financial text-emerald-600 block">
                          Save ${opp.monthlySavings}/mo
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 block">
                          ≈ ${opp.annualSavings}/year
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {opp.recommendation}
                    </p>
                    <button
                      onClick={() => onOpenReport(opp.decisionReport)}
                      className="shrink-0 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                    >
                      View Full Decision Report ➔
                    </button>
                  </div>
                </div>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
