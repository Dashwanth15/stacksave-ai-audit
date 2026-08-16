import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { ReplaceOpportunity } from '../../types/intelligence';
import CompactOpportunitySurface from './CompactOpportunitySurface';
import InteractiveDecisionExplorer from './InteractiveDecisionExplorer';

interface ReplacementOpportunitiesCardProps {
  opportunities: ReplaceOpportunity[];
}

export default function ReplacementOpportunitiesCard({
  opportunities,
}: ReplacementOpportunitiesCardProps) {
  const [activeExplorerIdx, setActiveExplorerIdx] = useState<number | null>(null);

  if (opportunities.length === 0) return null;

  return (
    <div className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs space-y-4">
      {/* Header */}
      <div className="select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg">
            🔁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg tracking-tight text-slate-900">
                AI Replacement Opportunities
              </h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {opportunities.length} Opportunity
                {opportunities.length !== 1 ? 'ies' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Scan the opportunities below. Click to explore the decision in detail.
            </p>
          </div>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="pt-2 space-y-3">
        {opportunities.map((opp, idx) => (
          <div key={idx}>
            <CompactOpportunitySurface
              opportunity={opp}
              rank={idx + 1}
              onExplore={() => setActiveExplorerIdx(idx)}
            />

            {/* Decision Explorer Modal */}
            <AnimatePresence>
              {activeExplorerIdx === idx && (
                <InteractiveDecisionExplorer
                  opportunity={opp}
                  report={opp.decisionReport}
                  onClose={() => setActiveExplorerIdx(null)}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
