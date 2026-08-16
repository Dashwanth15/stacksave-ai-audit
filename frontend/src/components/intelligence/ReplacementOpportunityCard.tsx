// ============================================================
// ReplacementOpportunityCard.tsx
// Full report-style replacement opportunity card
// Matches clean 3-section executive decision card with real platform logos
// ============================================================

import type { ReplaceOpportunity, DecisionReport } from '../../types/intelligence';
import PlatformLogo from './PlatformLogo';

interface ReplacementOpportunityCardProps {
  opportunity: ReplaceOpportunity;
  report: DecisionReport;
  onViewReport?: () => void;
}

export default function ReplacementOpportunityCard({
  opportunity,
  report: _report,
  onViewReport,
}: ReplacementOpportunityCardProps) {
  const savingsAmount = Math.max(0, Number(opportunity.monthlySavings) || 0);
  const annualAmount = savingsAmount * 12;
  const isCostSave = opportunity.costDirection === 'savings' || (opportunity.netCostDelta && opportunity.netCostDelta < -0.01) || (opportunity.monthlySavings > 0);
  const isCostUp = opportunity.costDirection === 'increase' || (opportunity.netCostDelta && opportunity.netCostDelta > 0.01);

  // Scores
  const opportunityScore = opportunity.opportunityScore?.overall ?? 85;
  const workflowMatch = opportunity.compatibilityScore ?? 85;
  const capabilityCoverage = opportunity.capabilityRetentionPercent ?? 100;
  const migrationFriction = opportunity.migrationDifficulty ?? 'Medium';
  const riskLevel = opportunity.riskLevel ?? 'Low';

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-2xs overflow-hidden transition-all hover:border-slate-300">
      {/* ──────────────────────────────────────────────────────────────────
          SECTION 1: CURRENT → RECOMMENDED + OPP SCORE & FINANCIAL IMPACT
          ────────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Platform comparison identity (REAL LOGOS, NO PILL, NO BORDER) */}
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Current Platform */}
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
              Current
            </div>
            <div className="flex items-center gap-2">
              <PlatformLogo name={opportunity.sourceToolName} />
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {opportunity.sourceToolName}
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
              <PlatformLogo name={opportunity.targetToolName} />
              <span className="text-base font-bold text-indigo-700 tracking-tight">
                {opportunity.targetToolName}
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
                {opportunityScore}
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
                  +${Math.abs(opportunity.netCostDelta ?? savingsAmount).toFixed(2)}/mo
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

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 2: 4-COLUMN METRICS ROW (WITH VERTICAL DIVIDERS)
          ────────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-0">
        {/* Workflow Match */}
        <div className="text-left md:border-r border-slate-200 md:pr-6">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Workflow Match
          </div>
          <div className="text-base font-black text-slate-900 font-mono-financial">{workflowMatch}%</div>
          <div className="text-xs text-slate-500 font-medium">Good fit</div>
        </div>

        {/* Capability Retention */}
        <div className="text-left md:border-r border-slate-200 md:px-6">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Capability Retention
          </div>
          <div className="text-base font-black text-indigo-700 font-mono-financial">{capabilityCoverage}%</div>
          <div className="text-xs text-slate-500 font-medium">Full coverage</div>
        </div>

        {/* Migration Friction */}
        <div className="text-left md:border-r border-slate-200 md:px-6">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Migration Friction
          </div>
          <div className="text-base font-black text-slate-900">
            {migrationFriction}
          </div>
          <div className="text-xs text-slate-500 font-medium">{migrationFriction}</div>
        </div>

        {/* Risk */}
        <div className="text-left md:pl-6">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Risk
          </div>
          <div className={`text-base font-black ${riskLevel === 'Low' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {riskLevel} Risk
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {riskLevel === 'Low' ? 'Low risk' : 'Moderate risk'}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          SECTION 3: FOOTER (CONCISE RECOMMENDATION + VIEW DECISION REPORT)
          ────────────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-700 leading-relaxed">
            Replace <strong>{opportunity.sourceToolName}</strong> with <strong className="text-indigo-700">{opportunity.targetToolName}</strong> to save{' '}
            <strong className="text-emerald-600 font-mono-financial">${savingsAmount.toFixed(2)}/mo</strong> while retaining{' '}
            <strong>{capabilityCoverage}%</strong> of required capabilities.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={onViewReport}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5 cursor-pointer group/btn"
          >
            <span>View Decision Report</span>
            <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
