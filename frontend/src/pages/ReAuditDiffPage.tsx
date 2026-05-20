// ============================================================
// Re-Audit Comparison Dashboard (Batch 4)
// ============================================================
// UI experience to visual comparison of original vs updated audits.
// Integrates with backend `/api/audits/:id/diff` endpoint.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { fetchAuditDiff, triggerReAudit } from '../services/api';
import { generateReAuditDiffPDF } from '../services/pdfService';
import type { ReAuditResponse } from '../types';
import {
  formatCurrencyFull,
  formatRelativeTime,
  insightTypeLabel,
  severityLabel,
} from '../utils/formatters';

interface ReAuditDiffPageProps {
  auditId?: string;
  isOwner?: boolean;
}

export default function ReAuditDiffPage({ auditId, isOwner: _isOwner }: ReAuditDiffPageProps = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = auditId || paramId;
  const navigate = useNavigate();

  const [data, setData] = useState<ReAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [prevId, setPrevId] = useState<string | undefined>(id);

  const isOwner = !!(
    _isOwner ||
    (id && localStorage.getItem(`owned_${id}`) === 'true')
  );
  const [reAuditing, setReAuditing] = useState(false);

  async function handleRunReAudit() {
    if (!id) return;
    setReAuditing(true);
    try {
      const result = await triggerReAudit(id);
      localStorage.setItem(`owned_${result.newAuditId}`, 'true');
      navigate(`/audit/${result.newAuditId}/diff`, { state: { isOwner: true } });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to trigger re-audit');
    } finally {
      setReAuditing(false);
    }
  }

  if (id !== prevId) {
    setPrevId(id);
    setData(null);
    setLoading(true);
    setError(null);
  }

  useEffect(() => {
    if (id) {
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

  const oldAudit = data?.oldAudit;
  const newAudit = data?.newAudit;
  const diff = data?.diff;
  const allVersions = data?.allVersions;

  if (error || !data || !oldAudit || !newAudit || !diff) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Re-Audit Not Found</h2>
          <p className="text-[#94a3b8] mb-6">
            {error || 'This comparison link may be invalid or incomplete. Make sure the audit has been re-audited.'}
          </p>
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

  const recommendationDiffs = diff?.recommendationDiffs || [];
  const pricingDiffs = diff?.pricingDiffs || [];
  const savingsDelta = diff?.savingsDelta || 0;
  const spendDelta = (newAudit?.totalMonthlySpend ?? 0) - (oldAudit?.totalMonthlySpend ?? 0);

  const biggestPricingChange = pricingDiffs.length > 0
    ? [...pricingDiffs].sort((a, b) => Math.abs(b.monthlyDelta) - Math.abs(a.monthlyDelta))[0]
    : null;

  const biggestRecChange = recommendationDiffs.length > 0
    ? [...recommendationDiffs].sort((a, b) => Math.abs(b.savingDelta ?? 0) - Math.abs(a.savingDelta ?? 0))[0]
    : null;

  // Split recommendation changes
  const addedRecs = (recommendationDiffs || []).filter((r) => r && r.status === 'added');
  const removedRecs = (recommendationDiffs || []).filter((r) => r && r.status === 'removed');
  const changedRecs = (recommendationDiffs || []).filter((r) => r && r.status === 'changed');

  // Unchanged recommendations
  const newInsightKeys = new Set((recommendationDiffs || []).map((r) => r ? `${r.toolId}:${r.type}` : ''));
  const unchangedInsights = (newAudit?.insights || []).filter(
    (ins) => ins && !newInsightKeys.has(`${ins.toolId}:${ins.type}`)
  );

  const hasChanges = (recommendationDiffs || []).length > 0 || (pricingDiffs || []).length > 0 || savingsDelta !== 0;

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
              Re-Audited {newAudit?.createdAt ? formatRelativeTime(newAudit.createdAt) : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                onClick={handleRunReAudit}
                disabled={reAuditing}
                className="px-4 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Re-Audit / Refresh stack"
              >
                {reAuditing ? 'Recalculating...' : '🔄 Refresh Audit'}
              </button>
            )}
            <button
              onClick={() => generateReAuditDiffPDF(oldAudit, newAudit, diff)}
              className="px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-sm font-medium transition-all flex items-center gap-1.5"
            >
              📄 Download PDF
            </button>
            <button
              onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`, { state: { isOwner } })}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-sm font-medium transition-all"
            >
              View Full Audit →
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        {/* Version Timeline Selector */}
        {allVersions && allVersions.length > 1 && (
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <span className="text-8xl">📊</span>
            </div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#818cf8] uppercase tracking-widest">
                  Living Audit History
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1">
                  Trace catalog pricing updates and optimization changes across audit versions.
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase tracking-wider self-start sm:self-auto">
                Comparison Mode Active
              </span>
            </div>
            <div className="relative flex items-center justify-between py-4">
              {/* Horizontal Connecting Track Line */}
              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-800 top-1/2 -translate-y-1/2" />
              
              <div className="relative z-10 w-full flex items-center justify-start gap-8 sm:gap-12 overflow-x-auto py-2 px-1 scrollbar-thin">
                {allVersions.map((v, idx) => {
                  const isActive = v.auditId === newAudit?.auditId;
                  return (
                    <button
                      key={v.auditId}
                      onClick={() => {
                        if (!isActive) {
                          navigate(`/audit/${v.auditId}`, { state: { isOwner } });
                        }
                      }}
                      className="group flex flex-col items-center gap-2.5 shrink-0 transition-all focus:outline-none cursor-pointer"
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Glowing ring for active node */}
                        {isActive && (
                          <span className="absolute animate-ping inline-flex h-7 w-7 rounded-full bg-indigo-400 opacity-20" />
                        )}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isActive
                              ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                              : 'bg-[#0f111a] border-slate-700 group-hover:border-slate-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-slate-500 group-hover:bg-slate-300'}`} />
                        </div>
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className={`text-xs font-bold transition-all ${isActive ? 'text-indigo-300' : 'text-[#6b7b93] group-hover:text-slate-200'}`}>
                          Version {v.auditVersion || (idx + 1)} {isActive ? '(Active)' : ''}
                        </div>
                        <div className="text-[10px] text-[#475569] group-hover:text-[#64748b] transition-all">
                          {formatRelativeTime(v.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 1. Living Audit Comparison Centerpiece ─────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-[#0c0d1b] shadow-[0_15px_50px_rgba(0,0,0,0.3)]"
        >
          {/* Decorative neon top gradient bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          
          <div className="p-8 sm:p-10 space-y-8">
            <div className="text-center sm:text-left space-y-1.5">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase tracking-wider">
                Living Audit Comparison
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight pt-1">
                Your AI stack changed over time
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Catalog updates and usage changes generated optimization adjustments between v{oldAudit?.auditVersion || 1} ({oldAudit?.createdAt ? new Date(oldAudit.createdAt).toLocaleDateString() : ''}) and v{newAudit?.auditVersion || 2} ({newAudit?.createdAt ? new Date(newAudit.createdAt).toLocaleDateString() : ''}).
              </p>
            </div>

            {/* Core Comparative Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stack Spend Dynamics Card */}
              <div className="glass-card-static p-6 border-white/5 bg-white/[0.01] hover:border-white/10 transition-all rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#6b7b93] uppercase tracking-wider block">
                    Stack Monthly Spend
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-400 line-through tabular-nums">
                      {formatCurrencyFull(oldAudit?.totalMonthlySpend ?? 0)}
                    </span>
                    <span className="text-xs text-[#6b7b93]">➔</span>
                    <span className="text-3xl font-black text-white tabular-nums">
                      {formatCurrencyFull(newAudit?.totalMonthlySpend ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {spendDelta < 0 ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span>↓</span> {formatCurrencyFull(Math.abs(spendDelta))}/mo savings
                    </span>
                  ) : spendDelta > 0 ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <span>↑</span> {formatCurrencyFull(spendDelta)}/mo increase
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      No spend change
                    </span>
                  )}
                  <span className="text-[10px] text-[#6b7b93]">
                    in raw stack cost
                  </span>
                </div>
              </div>

              {/* Identified Savings Evolution Card */}
              <div className="glass-card-static p-6 border-white/5 bg-white/[0.01] hover:border-white/10 transition-all rounded-2xl flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#6b7b93] uppercase tracking-wider block">
                    Potential Savings Opportunities
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-slate-400 line-through tabular-nums">
                      {formatCurrencyFull(oldAudit?.estimatedMonthlySavings ?? 0)}
                    </span>
                    <span className="text-xs text-[#6b7b93]">➔</span>
                    <span className="text-3xl font-black text-emerald-400 tabular-nums">
                      {formatCurrencyFull(newAudit?.estimatedMonthlySavings ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {savingsDelta > 0 ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span>+</span> {formatCurrencyFull(savingsDelta)}/mo more recovery
                    </span>
                  ) : savingsDelta < 0 ? (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <span>-</span> {formatCurrencyFull(Math.abs(savingsDelta))}/mo recovery delta
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                      Savings level steady
                    </span>
                  )}
                  <span className="text-[10px] text-[#6b7b93]">
                    vs original baseline
                  </span>
                </div>
              </div>
            </div>

            {/* Drivers of Change Subgrid */}
            <div className="pt-6 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Biggest Pricing Driver */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  🏷️ Key Pricing Driver
                </h4>
                {biggestPricingChange ? (
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white block">
                        {biggestPricingChange.toolName}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        biggestPricingChange.monthlyDelta > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {biggestPricingChange.monthlyDelta > 0 ? 'Price Inc' : 'Price Drop'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1 leading-relaxed">
                      {biggestPricingChange.planLabel} Plan updated from{' '}
                      <span className="line-through text-[#6b7b93]">{formatCurrencyFull(biggestPricingChange.oldMonthlyPrice)}</span> to{' '}
                      <span className="text-white font-semibold">{formatCurrencyFull(biggestPricingChange.newMonthlyPrice)}</span>/mo{' '}
                      <span className={`font-semibold ${biggestPricingChange.monthlyDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ({biggestPricingChange.monthlyDelta > 0 ? '+' : ''}{formatCurrencyFull(biggestPricingChange.monthlyDelta)})
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/5 p-4 rounded-xl text-center">
                    <p className="text-xs text-[#6b7b93]">No pricing changes detected in catalog pricing rates.</p>
                  </div>
                )}
              </div>

              {/* Biggest Recommendation Driver */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  💡 Key Recommendation Driver
                </h4>
                {biggestRecChange ? (
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-white block">
                        {biggestRecChange.toolName}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        biggestRecChange.status === 'added'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : biggestRecChange.status === 'removed'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {biggestRecChange.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94a3b8] mt-1 leading-relaxed">
                      {biggestRecChange.status === 'added' ? (
                        <>
                          New optimization opportunity identified, yielding potential savings of{' '}
                          <span className="text-emerald-400 font-bold">+{formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}/mo</span>.
                        </>
                      ) : biggestRecChange.status === 'removed' ? (
                        <>
                          Prior recommendation resolved or no longer applicable, reducing savings potential by{' '}
                          <span className="text-rose-400 font-bold">-{formatCurrencyFull(Math.abs(biggestRecChange.savingDelta ?? 0))}/mo</span>.
                        </>
                      ) : (
                        <>
                          Optimization recommendation revised, modifying savings potential by{' '}
                          <span className={`${(biggestRecChange.savingDelta ?? 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'} font-bold`}>
                            {biggestRecChange.savingDelta && biggestRecChange.savingDelta > 0 ? '+' : ''}
                            {formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}/mo
                          </span>.
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white/[0.01] border border-dashed border-white/5 p-4 rounded-xl text-center">
                    <p className="text-xs text-[#6b7b93]">Recommendations list remained stable.</p>
                  </div>
                )}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-left">
                        <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-3">
                          <div>
                            <span className="text-[10px] text-[#6b7b93] font-bold uppercase tracking-wider block mb-1">
                              Original Recommendation (v1)
                            </span>
                            <p className="text-xs text-[#94a3b8] leading-relaxed">
                              {diff.oldInsight?.message}
                            </p>
                          </div>
                          {diff.oldInsight?.suggestion && (
                            <div className="p-3 bg-white/[0.02] rounded border border-white/5">
                              <span className="text-[9px] text-[#6b7b93] font-bold block uppercase tracking-wider mb-0.5">
                                Proposed Action
                              </span>
                              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                {diff.oldInsight.suggestion}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-[#6b7b93] block">Potential Recovery</span>
                            <div className="font-bold text-[#6b7b93] text-sm tabular-nums mt-0.5">
                              {formatCurrencyFull(diff.oldInsight?.potentialMonthlySaving ?? 0)}/mo
                            </div>
                          </div>
                        </div>

                        <div className="bg-indigo-500/[0.02] border border-indigo-500/10 p-4 rounded-xl space-y-3">
                          <div>
                            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block mb-1">
                              Updated Recommendation (v{newAudit?.auditVersion || 2})
                            </span>
                            <p className="text-xs text-[#c0cbd6] leading-relaxed">
                              {diff.newInsight?.message}
                            </p>
                          </div>
                          {diff.newInsight?.suggestion && (
                            <div className="p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
                              <span className="text-[9px] text-indigo-400 font-bold block uppercase tracking-wider mb-0.5">
                                Updated Action
                              </span>
                              <p className="text-xs text-indigo-200 font-semibold leading-relaxed">
                                {diff.newInsight.suggestion}
                              </p>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-indigo-400 block">Recalculated Recovery</span>
                            <div className="font-bold text-white text-sm tabular-nums mt-0.5 flex items-center gap-1.5">
                              {formatCurrencyFull(diff.newInsight?.potentialMonthlySaving ?? 0)}/mo
                              {diff.savingDelta && diff.savingDelta !== 0 ? (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.25 rounded ${
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
                      </div>
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
            onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`)}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold"
          >
            Go to Results Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
