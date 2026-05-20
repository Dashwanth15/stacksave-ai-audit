// ============================================================
// Re-Audit Comparison Dashboard (Batch 4)
// ============================================================
// UI experience to visual comparison of original vs updated audits.
// Integrates with backend `/api/audits/:id/diff` endpoint.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { fetchAuditDiff } from '../services/api';
import type { ReAuditResponse } from '../types';
import {
  formatCurrencyFull,
  formatRelativeTime,
  insightTypeLabel,
  severityLabel,
} from '../utils/formatters';

export default function ReAuditDiffPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError(null);
      fetchAuditDiff(id)
        .then(setData)
        .catch((err) => {
          console.error('Error fetching audit diff:', err);
          setError(err.message || 'Failed to load re-audit details.');
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen grid-bg">
        {/* Skeleton Nav */}
        <div className="border-b border-white/5 h-16" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
          {/* Skeleton Hero */}
          <div className="glass-card-static p-8 sm:p-12 space-y-4">
            <div className="skel-block h-4 w-48 mx-auto" />
            <div className="skel-block h-20 w-56 mx-auto" />
            <div className="skel-block h-5 w-64 mx-auto" />
          </div>
          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card-static p-6 h-36 skel-block" />
            <div className="glass-card-static p-6 h-36 skel-block" />
          </div>
          {/* Skeleton Recommendation */}
          <div className="glass-card-static p-6 space-y-3">
            <div className="flex justify-between">
              <div className="skel-block h-5 w-32" />
              <div className="skel-block h-5 w-20" />
            </div>
            <div className="skel-block h-4 w-full" />
            <div className="skel-block h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Re-Audit Not Found</h2>
          <p className="text-[#94a3b8] mb-6">{error || 'This comparison link may be invalid.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all font-medium"
          >
            Go to home →
          </button>
        </div>
      </div>
    );
  }

  const { oldAudit, newAudit, diff } = data;
  const { recommendationDiffs, pricingDiffs, savingsDelta } = diff;

  // Split recommendation changes
  const addedRecs = recommendationDiffs.filter((r) => r.status === 'added');
  const removedRecs = recommendationDiffs.filter((r) => r.status === 'removed');
  const changedRecs = recommendationDiffs.filter((r) => r.status === 'changed');

  // Unchanged recommendations
  const newInsightKeys = new Set(recommendationDiffs.map((r) => `${r.toolId}:${r.type}`));
  const unchangedInsights = (newAudit.insights || []).filter(
    (ins) => !newInsightKeys.has(`${ins.toolId}:${ins.type}`)
  );

  const hasChanges = recommendationDiffs.length > 0 || pricingDiffs.length > 0 || savingsDelta !== 0;

  return (
    <div className="min-h-screen grid-bg pb-20">
      {/* Navigation */}
      <nav className="border-b border-white/[0.07] backdrop-blur-xl sticky top-0 z-40 bg-[#0a0a14]/88 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-indigo-400 font-bold text-lg tracking-tight hover:text-indigo-300 transition-colors"
            >
              StackSave
            </button>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#94a3b8] font-medium">
              Re-Audited {formatRelativeTime(newAudit.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/results/${newAudit.auditId}`)}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-sm font-medium transition-all"
            >
              View Full Audit →
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        {/* Version & Context Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v{newAudit.auditVersion || 2} Update
              </span>
              {newAudit.isLatestVersion && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Latest Version
                </span>
              )}
            </div>
            <p className="text-xs text-[#94a3b8]">
              Comparing original audit (v1) with current re-audit results.
            </p>
          </div>
          <div className="text-left sm:text-right text-[11px] text-[#6b7b93] space-y-0.5">
            <div>Original: {new Date(oldAudit.createdAt).toLocaleString()}</div>
            <div>Re-audited: {new Date(newAudit.createdAt).toLocaleString()}</div>
          </div>
        </div>

        {/* ── 1. Savings Delta Hero Section ─────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-8 sm:p-10 text-center relative overflow-hidden glow-savings"
          style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          <p className="text-[#94a3b8] text-xs font-bold uppercase tracking-wider mb-2">
            Pricing Impact Summary
          </p>

          <div className="my-6">
            {savingsDelta > 0 ? (
              <>
                <div className="text-5xl sm:text-6xl font-black text-emerald-400 mb-2 tabular-nums">
                  +{formatCurrencyFull(savingsDelta)}/mo
                </div>
                <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                  Catalog pricing adjustments have **increased** your potential optimizations by{' '}
                  <span className="text-emerald-300 font-semibold">{formatCurrencyFull(savingsDelta)}/mo</span>.
                </p>
              </>
            ) : savingsDelta < 0 ? (
              <>
                <div className="text-5xl sm:text-6xl font-black text-amber-400 mb-2 tabular-nums">
                  {formatCurrencyFull(savingsDelta)}/mo
                </div>
                <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                  Catalog pricing changes have **reduced** your potential optimized savings delta by{' '}
                  <span className="text-amber-300 font-semibold">{formatCurrencyFull(Math.abs(savingsDelta))}/mo</span>.
                </p>
              </>
            ) : (
              <>
                <div className="text-5xl sm:text-6xl font-black text-slate-300 mb-2 tabular-nums">
                  No Savings Delta
                </div>
                <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                  Overall potential optimizations remain identical to the previous analysis.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-6 border-t border-white/5">
            <div>
              <div className="text-xs text-[#6b7b93] uppercase tracking-wider mb-0.5">Previous Savings</div>
              <div className="text-xl font-bold text-slate-300 tabular-nums">
                {formatCurrencyFull(oldAudit.estimatedMonthlySavings)}/mo
              </div>
            </div>
            <div>
              <div className="text-xs text-[#6b7b93] uppercase tracking-wider mb-0.5">Current Savings</div>
              <div className="text-xl font-bold text-white tabular-nums">
                {formatCurrencyFull(newAudit.estimatedMonthlySavings)}/mo
              </div>
            </div>
          </div>
        </m.div>

        {/* Empty State: No pricing or recommendation updates */}
        {!hasChanges && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card-static p-8 text-center"
          >
            <div className="text-3xl mb-3">✅</div>
            <h3 className="text-lg font-bold text-white mb-2">No pricing or savings changes</h3>
            <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
              Your audit is fully up-to-date. No tool pricing changes or new recommendations were detected in this re-audit.
            </p>
          </m.div>
        )}

        {/* ── 2. Pricing Change Visualization ─────────────────────── */}
        {pricingDiffs.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-bold text-white">Pricing Model Adjustments</h3>
            <p className="text-xs text-[#94a3b8]">
              We detected pricing change updates from AI providers since your original audit:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingDiffs.map((diff, idx) => (
                <div
                  key={`${diff.toolId}-${diff.planId}-${idx}`}
                  className="glass-card-static p-5 flex flex-col justify-between"
                  style={{
                    borderColor: diff.monthlyDelta > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(52, 211, 153, 0.15)',
                  }}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-white">{diff.toolName}</h4>
                      <span className="text-[11px] text-[#6b7b93] font-medium block">
                        {diff.planLabel} Plan
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        diff.monthlyDelta > 0
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {diff.monthlyDelta > 0 ? 'Price Increase' : 'Price Drop'}
                    </span>
                  </div>

                  <div className="flex justify-between items-end pt-4 mt-2 border-t border-white/5">
                    <div className="text-xs text-[#94a3b8]">
                      <span className="line-through mr-2 text-[#6b7b93]">
                        {formatCurrencyFull(diff.oldMonthlyPrice)}/mo
                      </span>
                      <span className="text-white font-semibold">
                        {formatCurrencyFull(diff.newMonthlyPrice)}/mo
                      </span>
                    </div>
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        diff.monthlyDelta > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {diff.monthlyDelta > 0 ? '+' : ''}
                      {formatCurrencyFull(diff.monthlyDelta)}/mo
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ── 3. Old vs New Recommendation Comparison ─────────────── */}
        {recommendationDiffs.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Actionable Recommendations Diff</h3>

            {/* Added Recommendations */}
            {addedRecs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  New Recommendations Added ({addedRecs.length})
                </h4>
                <div className="space-y-4">
                  {addedRecs.map((diff, i) => (
                    <div
                      key={`added-${diff.toolId}-${i}`}
                      className="insight-card p-6 border-emerald-500/20"
                      style={{ '--accent-color': '#34d399' } as React.CSSProperties}
                      data-severity={diff.newInsight?.severity || 'info'}
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h5 className="font-bold text-white">{diff.toolName}</h5>
                          <span className="text-[10px] text-[#6b7b93]">
                            {insightTypeLabel(diff.newInsight?.type || '')}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                          Added Recommendation
                        </span>
                      </div>
                      <p className="text-sm text-[#c0cbd6] mb-4 leading-relaxed">
                        {diff.newInsight?.message}
                      </p>

                      <div className="recommendation-box p-4 flex items-start gap-3">
                        <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-indigo-400 text-xs">→</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">
                            Action
                          </p>
                          <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                            {diff.newInsight?.suggestion}
                          </p>
                        </div>
                      </div>

                      {diff.newInsight && diff.newInsight.potentialMonthlySaving > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-[#94a3b8]">
                          <span>Potential Recovery</span>
                          <span className="text-emerald-400 font-bold">
                            +{formatCurrencyFull(diff.newInsight.potentialMonthlySaving)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Changed Recommendations */}
            {changedRecs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Modified Recommendations ({changedRecs.length})
                </h4>
                <div className="space-y-4">
                  {changedRecs.map((diff, i) => (
                    <div
                      key={`changed-${diff.toolId}-${i}`}
                      className="insight-card p-6 border-amber-500/20"
                      style={{ '--accent-color': '#fbbf24' } as React.CSSProperties}
                      data-severity={diff.newInsight?.severity || 'info'}
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h5 className="font-bold text-white">{diff.toolName}</h5>
                          <span className="text-[10px] text-[#6b7b93]">
                            {insightTypeLabel(diff.newInsight?.type || '')}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                          Savings Modified
                        </span>
                      </div>
                      <p className="text-sm text-[#c0cbd6] mb-4 leading-relaxed">
                        {diff.newInsight?.message}
                      </p>

                      <div className="recommendation-box p-4 flex items-start gap-3">
                        <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-indigo-400 text-xs">→</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-0.5">
                            Updated Action
                          </p>
                          <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                            {diff.newInsight?.suggestion}
                          </p>
                        </div>
                      </div>

                      {diff.oldInsight && diff.newInsight && (
                        <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-4 text-xs text-[#94a3b8]">
                          <div>
                            <span>Original Savings</span>
                            <div className="font-bold text-[#6b7b93] tabular-nums mt-0.5">
                              {formatCurrencyFull(diff.oldInsight.potentialMonthlySaving)}/mo
                            </div>
                          </div>
                          <div>
                            <span>Recalculated Savings</span>
                            <div className="font-bold text-white tabular-nums mt-0.5 flex items-center gap-1.5">
                              {formatCurrencyFull(diff.newInsight.potentialMonthlySaving)}/mo
                              {diff.savingDelta && diff.savingDelta !== 0 ? (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.25 rounded ${
                                    diff.savingDelta > 0
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : 'bg-amber-500/10 text-amber-400'
                                  }`}
                                >
                                  {diff.savingDelta > 0 ? '+' : ''}
                                  {formatCurrencyFull(diff.savingDelta)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Removed Recommendations */}
            {removedRecs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  Recommendations Removed ({removedRecs.length})
                </h4>
                <div className="space-y-3 opacity-60">
                  {removedRecs.map((diff, i) => (
                    <div
                      key={`removed-${diff.toolId}-${i}`}
                      className="glass-card-static p-6 border-rose-500/10 bg-rose-950/5 relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <h5 className="font-bold text-slate-300 line-through">{diff.toolName}</h5>
                          <span className="text-[10px] text-[#6b7b93]">
                            {insightTypeLabel(diff.oldInsight?.type || '')}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/20 shrink-0">
                          No Longer Applicable
                        </span>
                      </div>
                      <p className="text-xs text-[#7b8aa0] leading-relaxed mb-1">
                        {diff.oldInsight?.message}
                      </p>
                      <p className="text-[11px] text-[#6b7b93] italic">
                        Removed because new vendor price model or updated volume spend renders this optimization obsolete.
                      </p>

                      {diff.oldInsight && diff.oldInsight.potentialMonthlySaving > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-xs text-[#6b7b93]">
                          <span>Lost Potential Recovery</span>
                          <span className="font-semibold line-through">
                            {formatCurrencyFull(diff.oldInsight.potentialMonthlySaving)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 4. Unchanged Recommendations Accordion ───────────────── */}
        {unchangedInsights.length > 0 && (
          <div className="border-t border-white/5 pt-6">
            <button
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="flex items-center justify-between w-full py-2 text-left text-sm text-[#94a3b8] hover:text-white transition-colors"
            >
              <span className="font-medium">
                {showUnchanged ? 'Hide' : 'Show'} Unchanged Recommendations ({unchangedInsights.length})
              </span>
              <span className="text-xs">{showUnchanged ? '▲' : '▼'}</span>
            </button>

            <AnimatePresence>
              {showUnchanged && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 space-y-4 overflow-hidden"
                >
                  {unchangedInsights.map((insight) => (
                    <div
                      key={`${insight.toolId}-${insight.type}`}
                      className="glass-card-static p-6"
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <div>
                          <h5 className="font-bold text-white">{insight.toolName}</h5>
                          <span className="text-[10px] text-[#6b7b93]">
                            {insightTypeLabel(insight.type)}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium severity-label-${insight.severity}`}
                        >
                          {severityLabel(insight.severity)}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8] mb-4 leading-relaxed">
                        {insight.message}
                      </p>
                      <div className="bg-white/3 p-3 rounded-lg border border-white/5 text-xs">
                        <span className="text-[#6b7b93] font-medium block mb-1">Recommended Action:</span>
                        <span className="text-slate-200">{insight.suggestion}</span>
                      </div>
                    </div>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="text-center pt-8 border-t border-white/5">
          <button
            onClick={() => navigate(`/results/${newAudit.auditId}`)}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
          >
            Go to Results Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
