// ============================================================
// CompactOpportunitySurface.tsx
// Premium SaaS-grade decision surface (closed state)
// Not a report. Not a card. A decision interface.
// ============================================================

import { useState } from 'react';
import type { ReplaceOpportunity } from '../../types/intelligence';

interface CompactOpportunitySurfaceProps {
  opportunity: ReplaceOpportunity;
  rank: number;
  onExplore: () => void;
}

export default function CompactOpportunitySurface({
  opportunity,
  rank,
  onExplore,
}: CompactOpportunitySurfaceProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Determine financial direction
  const isSavings =
    opportunity.costDirection === 'savings' ||
    (opportunity.netCostDelta !== undefined && opportunity.netCostDelta < -0.01) ||
    opportunity.monthlySavings > 0;

  const isCostUp =
    opportunity.costDirection === 'increase' ||
    (opportunity.netCostDelta !== undefined && opportunity.netCostDelta > 0.01);

  const netDelta = opportunity.netCostDelta !== undefined ? Math.abs(opportunity.netCostDelta) : opportunity.monthlySavings;
  const opportunityScore = opportunity.opportunityScore?.overall ?? 85;

  // Decision signals
  const workflowMatch = opportunity.opportunityScore?.technicalOpportunity ?? 85;
  const capabilityCoverage =
    opportunity.opportunityScore?.businessOpportunity ?? 80;
  const migrationDifficulty = opportunity.opportunityScore?.migrationSimplicity
    ? 100 - opportunity.opportunityScore.migrationSimplicity
    : 25;

  const getDifficultyLabel = (score: number): string => {
    if (score <= 30) return 'Low';
    if (score <= 60) return 'Medium';
    return 'High';
  };

  const getRiskLevel = (level?: string): string => {
    return level || 'Low';
  };

  const isTopOpportunity = rank === 1;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative p-5 rounded-xl border transition-all duration-200 cursor-pointer
        ${isHovered
          ? isTopOpportunity
            ? 'border-indigo-300 bg-indigo-50/60 shadow-md shadow-indigo-200/40'
            : 'border-indigo-200 bg-white shadow-md shadow-slate-200/40'
          : isTopOpportunity
          ? 'border-indigo-200 bg-white shadow-sm'
          : 'border-slate-100 bg-white shadow-xs'}
      `}
      style={{
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top Opportunity Badge */}
      {isTopOpportunity && (
        <div className="absolute -top-2 left-4 px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider">
          🎯 Top Opportunity
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 1: The Replacement Relationship (THE HERO)
          ────────────────────────────────────────────────────────────────── */}
      <div className="space-y-2 pb-3 border-b border-slate-100">
        {/* Current → Recommended with labels */}
        <div className="flex items-center justify-between gap-4">
          {/* Current Platform */}
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Current
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-semibold text-slate-900">
                {opportunity.sourceToolName}
              </span>
            </div>
          </div>

          {/* Arrow Transition */}
          <div className="flex-shrink-0 text-slate-300 text-lg font-light">
            →
          </div>

          {/* Recommended Platform */}
          <div className="flex-1 min-w-0">
            <div className="text-[8px] font-black uppercase tracking-widest text-indigo-600 mb-1.5">
              Recommended
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base font-bold text-indigo-700">
                {opportunity.targetToolName}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Impact (below relationship) */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <div className="text-right">
            {isSavings ? (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Save
                </div>
                <div className="text-base font-black font-mono text-emerald-600 mt-0.5">
                  ${netDelta.toFixed(2)}/mo
                </div>
                <div className="text-[8px] text-slate-400 font-medium">
                  ≈ ${(netDelta * 12).toFixed(0)}/yr
                </div>
              </div>
            ) : isCostUp ? (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Cost
                </div>
                <div className="text-base font-black font-mono text-amber-600 mt-0.5">
                  +${netDelta.toFixed(2)}/mo
                </div>
                <div className="text-[8px] font-medium text-amber-600">
                  Upgrade
                </div>
              </div>
            ) : (
              <div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  Cost
                </div>
                <div className="text-base font-black font-mono text-slate-600 mt-0.5">
                  $0/mo
                </div>
                <div className="text-[8px] text-slate-400 font-medium">
                  Neutral
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 2: Decision Signals (4 Compact Metrics)
          ────────────────────────────────────────────────────────────────── */}
      <div className="py-3 flex items-center justify-between text-xs border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap text-slate-600">
          <span className="flex items-center gap-1 font-medium">
            <span className="font-black text-slate-900">{workflowMatch}%</span>
            <span className="text-slate-400">Match</span>
          </span>

          <span className="text-slate-300">·</span>

          <span className="flex items-center gap-1 font-medium">
            <span className="font-black text-slate-900">{capabilityCoverage}%</span>
            <span className="text-slate-400">Coverage</span>
          </span>

          <span className="text-slate-300">·</span>

          <span className="flex items-center gap-1 font-medium">
            <span className="font-black text-slate-900">
              {getDifficultyLabel(migrationDifficulty)}
            </span>
            <span className="text-slate-400">Migration</span>
          </span>

          <span className="text-slate-300">·</span>

          <span className="flex items-center gap-1 font-medium">
            <span className="font-black text-slate-900">
              {getRiskLevel(opportunity.riskLevel)}
            </span>
            <span className="text-slate-400">Risk</span>
          </span>
        </div>

        {/* Opportunity Score (Secondary) */}
        <div className="flex-shrink-0 text-right ml-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
            Opportunity
          </span>
          <span className="text-sm font-black font-mono text-slate-900">
            {opportunityScore}
          </span>
          <div className="w-12 h-0.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full"
              style={{ width: `${opportunityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 3: One-line Decision Statement
          ────────────────────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 leading-relaxed font-medium py-3">
        {opportunity.recommendation}
      </p>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 4: Primary Interaction
          ────────────────────────────────────────────────────────────────── */}
      <button
        onClick={onExplore}
        className={`
          mt-auto self-end px-4 py-2 rounded-lg
          text-xs font-bold tracking-wide transition-all duration-150
          ${isHovered
            ? 'text-indigo-700 bg-indigo-100 border border-indigo-300'
            : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200'}
        `}
      >
        Explore decision →
      </button>
    </div>
  );
}
