// ============================================================
// InteractiveDecisionExplorer.tsx
// Premium decision workspace (expanded state)
// Interactive signals, live calculations, real evidence.
// NOT a report modal.
// ============================================================

import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { ReplaceOpportunity, DecisionReport } from '../../types/intelligence';

interface InteractiveDecisionExplorerProps {
  opportunity: ReplaceOpportunity;
  report: DecisionReport;
  onClose: () => void;
}

type ActiveSignal = 'workflow' | 'capability' | 'financial' | 'migration' | null;

export default function InteractiveDecisionExplorer({
  opportunity,
  report,
  onClose,
}: InteractiveDecisionExplorerProps) {
  const [activeSignal, setActiveSignal] = useState<ActiveSignal>(null);
  const [teamSize, setTeamSize] = useState(
    report.perSeatBreakdown?.seats || 1
  );

  // Financial calculations (live)
  // Use perSeatBreakdown if available, otherwise derive from full costs
  const currentCostPerSeat =
    report.perSeatBreakdown?.currentCostPerSeat ||
    report.currentMonthlyCost / (report.perSeatBreakdown?.seats || 1);
  const recommendedCostPerSeat =
    report.perSeatBreakdown?.replacementCostPerSeat ||
    report.projectedMonthlyCost / (report.perSeatBreakdown?.seats || 1);

  const currentMonthlyTotal = currentCostPerSeat * teamSize;
  const recommendedMonthlyTotal = recommendedCostPerSeat * teamSize;
  const monthlyRecovery = currentMonthlyTotal - recommendedMonthlyTotal;
  const annualRecovery = monthlyRecovery * 12;

  // Determine financial direction
  const isSavings = monthlyRecovery > 0.01;
  const isCostUp = monthlyRecovery < -0.01;

  const opportunityScore = opportunity.opportunityScore?.overall ?? 85;
  const workflowMatch = opportunity.opportunityScore?.technicalOpportunity ?? 85;
  const capabilityCoverage =
    opportunity.opportunityScore?.businessOpportunity ?? 80;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center p-4 overflow-y-auto">
      {/* Close backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-100 shadow-2xl my-8 z-10"
      >
        {/* ──────────────────────────────────────────────────────────────────
            TOP HEADER: The Decision at a Glance
            ────────────────────────────────────────────────────────────────── */}
        <div className="p-4 sm:px-6 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {opportunity.sourceToolName} → {opportunity.targetToolName}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {report.proposedAction || 'Replacement opportunity analysis'}
            </p>
          </div>

          {/* Right side: Financial impact + Score */}
          <div className="flex-shrink-0 text-left sm:text-right">
            <div className="mb-2">
              {isSavings ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Save
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-600">
                    ${monthlyRecovery.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    /mo ({teamSize} seat{teamSize !== 1 ? 's' : ''})
                  </div>
                </div>
              ) : isCostUp ? (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Additional
                  </div>
                  <div className="text-2xl font-black font-mono text-amber-600">
                    ${Math.abs(monthlyRecovery).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-amber-600 font-medium">
                    /mo upgrade cost
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Cost Impact
                  </div>
                  <div className="text-2xl font-black font-mono text-slate-600">
                    $0
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    /mo neutral
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Opportunity
              </div>
              <div className="text-lg font-black font-mono text-slate-900">
                {opportunityScore}
              </div>
              <div className="w-16 h-0.5 bg-slate-200 rounded-full mt-1 ml-auto overflow-hidden">
                <div
                  className="h-full bg-slate-400 rounded-full"
                  style={{ width: `${opportunityScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            DECISION SIGNALS: Interactive Toggle Buttons
            ────────────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            Explore the decision
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                id: 'workflow' as const,
                label: 'Workflow',
                value: `${workflowMatch}%`,
                subtitle: 'Fit',
              },
              {
                id: 'capability' as const,
                label: 'Capability',
                value: `${capabilityCoverage}%`,
                subtitle: 'Retention',
              },
              {
                id: 'financial' as const,
                label: 'Financial',
                value: isSavings
                  ? `$${monthlyRecovery.toFixed(0)}`
                  : isCostUp
                  ? `+$${Math.abs(monthlyRecovery).toFixed(0)}`
                  : '$0',
                subtitle: '/mo',
              },
              {
                id: 'migration' as const,
                label: 'Migration',
                value: report.riskLevel || 'Low',
                subtitle: 'Risk',
              },
            ].map((signal) => (
              <button
                key={signal.id}
                onClick={() =>
                  setActiveSignal(activeSignal === signal.id ? null : signal.id)
                }
                className={`
                  p-3 rounded-lg border transition-all duration-150
                  ${
                    activeSignal === signal.id
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm shadow-indigo-200/40'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                  }
                `}
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {signal.label}
                </div>
                <div
                  className={`text-base font-black font-mono mt-1 ${
                    signal.id === 'financial'
                      ? isSavings
                        ? 'text-emerald-600'
                        : isCostUp
                        ? 'text-amber-600'
                        : 'text-slate-600'
                      : 'text-slate-900'
                  }`}
                >
                  {signal.value}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  {signal.subtitle}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────────────
            EVIDENCE PANEL: What Changes When You Click a Signal
            ────────────────────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {activeSignal && (
            <m.div
              key={activeSignal}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="border-b border-slate-100 bg-indigo-50/30 px-6 py-4"
            >
              {/* Workflow Signal */}
              {activeSignal === 'workflow' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                      Workflow Compatibility
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Strong alignment
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono text-slate-900">
                      {workflowMatch}%
                    </span>
                    <span className="text-sm text-slate-600">
                      of workflow requirements
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {opportunity.sourceToolName} and {opportunity.targetToolName} have strong workflow alignment based on capability analysis.
                  </p>
                  {report.featureMatrix && report.featureMatrix.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                        Key Capabilities
                      </div>
                      <div className="grid gap-1.5">
                        {report.featureMatrix.slice(0, 5).map((feature, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-emerald-600 font-bold mt-0.5 flex-shrink-0">
                              {feature.delta === 'better' || feature.delta === 'same' ? '✓' : '−'}
                            </span>
                            <span className="text-slate-700">
                              {feature.feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Capability Signal */}
              {activeSignal === 'capability' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                      Capability Retention
                    </h4>
                    <span className="text-xs text-slate-500 font-medium">
                      Full coverage maintained
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black font-mono text-slate-900">
                      {capabilityCoverage}%
                    </span>
                    <span className="text-sm text-slate-600">
                      of required capabilities
                    </span>
                  </div>

                  {(report.capabilitiesGained && report.capabilitiesGained.length > 0) ||
                  (report.capabilitiesLost && report.capabilitiesLost.length > 0) ? (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      {report.capabilitiesGained && report.capabilitiesGained.length > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-1.5">
                            Gained
                          </div>
                          <ul className="space-y-1">
                            {report.capabilitiesGained.map((cap, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-emerald-600 mt-0.5 flex-shrink-0">+</span>
                                {cap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.capabilitiesLost && report.capabilitiesLost.length > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1.5">
                            Lost
                          </div>
                          <ul className="space-y-1">
                            {report.capabilitiesLost.map((cap, i) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-amber-600 mt-0.5 flex-shrink-0">−</span>
                                {cap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-200 text-sm text-slate-600">
                      No capability loss. 100% feature retention.
                    </div>
                  )}
                </div>
              )}

              {/* Financial Signal */}
              {activeSignal === 'financial' && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">
                    Financial Breakdown
                  </h4>

                  {/* Team Size Control */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-sm font-bold text-slate-900">
                      Team Size
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTeamSize(Math.max(1, teamSize - 1))}
                        className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-600"
                      >
                        −
                      </button>
                      <span className="text-lg font-black font-mono text-slate-900 w-8 text-center">
                        {teamSize}
                      </span>
                      <button
                        onClick={() => setTeamSize(Math.min(100, teamSize + 1))}
                        className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-600"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Financial Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Current Cost
                      </div>
                      <div className="text-3xl font-black font-mono text-slate-900">
                        ${currentMonthlyTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        per month
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Recommended Cost
                      </div>
                      <div className="text-3xl font-black font-mono text-slate-900">
                        ${recommendedMonthlyTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        per month
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Monthly Impact
                      </div>
                      <div
                        className={`text-3xl font-black font-mono ${
                          isSavings
                            ? 'text-emerald-600'
                            : isCostUp
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {isSavings ? '+' : ''}${monthlyRecovery.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">
                        recovery per month
                      </div>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Annual Impact
                      </div>
                      <div
                        className={`text-3xl font-black font-mono ${
                          isSavings
                            ? 'text-emerald-600'
                            : isCostUp
                            ? 'text-amber-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {isSavings ? '+' : ''}${annualRecovery.toFixed(0)}
                      </div>
                      <div className="text-xs text-slate-500">
                        recovery per year
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Migration Signal */}
              {activeSignal === 'migration' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-sm font-bold text-slate-900">
                      Migration & Risk Assessment
                    </h4>
                    <span
                      className={`text-lg font-black ${
                        report.riskLevel === 'Low'
                          ? 'text-emerald-600'
                          : report.riskLevel === 'Medium'
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {report.riskLevel || 'Low'} Risk
                    </span>
                  </div>

                  {report.migrationChecklist ? (
                    <div className="space-y-2 pt-3 border-t border-slate-200">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
                        Timeline: {report.migrationChecklist.estimatedDays} days
                      </div>
                      <ul className="space-y-2">
                        {report.migrationChecklist.steps.map((step, i) => (
                          <li key={i} className="text-xs flex items-start gap-2">
                            <span className="text-slate-400 font-bold mt-0.5 flex-shrink-0">
                              {i + 1}.
                            </span>
                            <div className="flex-1">
                              <div className="text-slate-900 font-medium">
                                {step.action}
                              </div>
                              <div className="text-slate-500 text-[11px] mt-0.5">
                                {step.priority === 'required' ? '⚠️ Required' : step.priority === 'recommended' ? '✓ Recommended' : '○ Optional'}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-200 text-sm text-slate-600">
                      Minimal migration overhead expected.
                    </div>
                  )}
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* ──────────────────────────────────────────────────────────────────
            FOOTER: Decision Summary
            ────────────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-sm text-slate-700 leading-relaxed">
            {report.executiveSummary ||
              report.recommendation ||
              `Replace ${opportunity.sourceToolName} with ${opportunity.targetToolName} to ${isSavings ? 'save' : isCostUp ? 'invest in' : 'maintain cost parity while gaining'} capability alignment.`}
          </p>
        </div>
      </m.div>
    </div>
  );
}
