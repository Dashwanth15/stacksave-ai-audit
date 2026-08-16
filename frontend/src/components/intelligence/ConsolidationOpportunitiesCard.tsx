import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { ConsolidateOpportunity, DecisionReport } from '../../types/intelligence';

interface ConsolidationOpportunitiesCardProps {
  opportunities: ConsolidateOpportunity[];
  onOpenReport: (report: DecisionReport) => void;
}

export default function ConsolidationOpportunitiesCard({
  opportunities,
  onOpenReport,
}: ConsolidationOpportunitiesCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (opportunities.length === 0) return null;

  return (
    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs space-y-4">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg tracking-tight text-slate-900">
                AI Consolidation Opportunities
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {opportunities.length} Multi-Tool Option(s)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Auto-discovered stack consolidations (2→1, 3→1) with composite Opportunity Scores.
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
            {opportunities.map((opp, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:border-amber-100 hover:bg-amber-50/10 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Consolidate
                      </div>
                      <div className="font-semibold text-slate-900">
                        {opp.decommissionedToolNames.join(' + ')}
                      </div>
                    </div>
                    <div className="text-amber-600 font-light text-lg flex-shrink-0">
                      →
                    </div>
                    <div className="min-w-0">
                      <div className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-1">
                        Absorb Into
                      </div>
                      <div className="font-bold text-amber-900">
                        {opp.absorbingToolName}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <span className="text-[8px] font-extrabold text-slate-400 block uppercase">Opp. Score</span>
                      <span className="text-base font-black text-amber-600 font-mono-financial mt-1">{opp.opportunityScore?.overall ?? 85}</span>
                      <span className="text-[8px] text-slate-400 block">/100</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-400 block">Save</span>
                      <span className="text-lg font-black font-mono-financial text-emerald-600 block mt-1">
                        ${opp.monthlySavings}
                      </span>
                      <span className="text-[8px] font-medium text-slate-400 block">
                        /mo
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
                    className="shrink-0 text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors flex items-center gap-1"
                  >
                    View Full Decision Report ➔
                  </button>
                </div>
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
