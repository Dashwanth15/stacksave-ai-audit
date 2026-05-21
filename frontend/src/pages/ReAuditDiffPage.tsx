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

  const [compareWith, setCompareWith] = useState<'previous' | 'root'>('previous');

  if (id !== prevId) {
    setPrevId(id);
    setData(null);
    setLoading(true);
    setError(null);
    setCompareWith('previous');
  }

  useEffect(() => {
    if (id) {
      const loadDiff = async () => {
        setLoading(true);
        try {
          const result = await fetchAuditDiff(id, compareWith);
          setData(result);
          setError(null);
        } catch (err) {
          console.error('Error fetching audit diff:', err);
          setError(err instanceof Error ? err.message : 'Failed to load re-audit details.');
        } finally {
          setLoading(false);
        }
      };

      loadDiff();
    }
  }, [id, compareWith]);

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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-0 sm:h-[68px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
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
          <div className="action-button-group w-full sm:w-auto">
            {isOwner && (
              <>
                <button
                  onClick={handleRunReAudit}
                  disabled={reAuditing}
                  className="action-button bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                  aria-label="Pricing Refresh"
                >
                  {reAuditing ? '⏳ Updating...' : '🔄 Pricing Refresh'}
                </button>
                <button
                  onClick={() => navigate(`/audit?reAuditOf=${newAudit?.auditId}`)}
                  className="action-button bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/20 flex-1 sm:flex-none"
                  aria-label="Edit Stack and Re-Audit"
                >
                  🛠️ Edit Stack
                </button>
              </>
            )}
            <button
              onClick={() => generateReAuditDiffPDF(oldAudit, newAudit, diff)}
              className="action-button bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20 flex-1 sm:flex-none"
              aria-label="Download PDF"
            >
              📄 Download PDF
            </button>
            <button
              onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`, { state: { isOwner } })}
              className="action-button bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20 flex-1 sm:flex-none"
              aria-label="View Full Audit"
            >
              📋 Full Audit
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        {/* Version Timeline Selector */}
        {allVersions && allVersions.length > 1 && (
          <div className="timeline-section space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  Living Audit History
                </h3>
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Trace catalog pricing updates and optimization changes across audit versions.
                </p>
              </div>
              <span className="text-[10px] px-2.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase tracking-wider self-start sm:self-auto whitespace-nowrap">
                ✓ Comparison Mode Active
              </span>
            </div>
            <div className="relative flex items-center justify-between py-6">
              {/* Horizontal Connecting Track Line */}
              <div className="timeline-connecting-line" />
              
              <div className="relative z-10 w-full flex items-center justify-start gap-10 sm:gap-14 md:gap-16 overflow-x-auto py-3 px-1">
                {allVersions.map((v, idx) => {
                  const isNew = v.auditId === newAudit?.auditId;
                  const isOld = v.auditId === oldAudit?.auditId;
                  const isSame = oldAudit?.auditId === newAudit?.auditId;
                  const isActive = isNew;

                  let dotColorClass = 'bg-slate-500 group-hover:bg-slate-300';
                  let ringColorClass = 'bg-[#0f111a] border-slate-700 group-hover:border-slate-500';
                  let textColorClass = 'text-[#6b7b93] group-hover:text-slate-200';
                  let labelSuffix = '';

                  if (isSame) {
                    if (isNew) {
                      dotColorClass = 'bg-white';
                      ringColorClass = 'bg-indigo-600 border-[#818cf8] shadow-[0_0_12px_rgba(129,140,248,0.5)]';
                      textColorClass = 'text-indigo-300';
                      labelSuffix = ' (Baseline)';
                    }
                  } else {
                    if (isNew) {
                      dotColorClass = 'bg-white';
                      ringColorClass = 'bg-emerald-600 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]';
                      textColorClass = 'text-emerald-300';
                      labelSuffix = ' (After)';
                    } else if (isOld) {
                      dotColorClass = 'bg-amber-400';
                      ringColorClass = 'bg-[#0f111a] border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]';
                      textColorClass = 'text-amber-300';
                      labelSuffix = ' (Before)';
                    }
                  }

                  return (
                    <button
                      key={v.auditId}
                      onClick={() => {
                        if (!isActive) {
                          const isDiffRoute = window.location.pathname.endsWith('/diff');
                          const targetUrl = v.auditVersion === 1
                            ? `/audit/${v.auditId}?view=single`
                            : (isDiffRoute ? `/audit/${v.auditId}/diff` : `/audit/${v.auditId}`);
                          navigate(targetUrl, { state: { isOwner } });
                        }
                      }}
                      className="timeline-node"
                    >
                      <div className="relative flex items-center justify-center">
                        {/* Glowing ring for active node */}
                        {isActive && (
                          <span className={`absolute animate-ping inline-flex h-7 w-7 rounded-full opacity-20 ${isSame ? 'bg-indigo-400' : 'bg-emerald-400'}`} />
                        )}
                        <div
                          className={`timeline-node-ring ${ringColorClass}`}
                        >
                          <span className={`timeline-node-dot ${dotColorClass}`} />
                        </div>
                      </div>
                      <div className="timeline-node-label">
                        <div className={`text-xs sm:text-sm font-bold transition-all ${textColorClass}`}>
                          Version {v.auditVersion || (idx + 1)}{labelSuffix}
                        </div>
                        <div className="text-[10px] sm:text-xs text-[#475569] group-hover:text-[#64748b] transition-all whitespace-nowrap">
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
          className="living-audit-hero p-8 sm:p-10 space-y-8"
        >
            <div className="text-center sm:text-left space-y-2 sm:space-y-3">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold uppercase tracking-wider inline-block">
                Living Audit Comparison
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
                Your AI stack changed over time
              </h2>
              {oldAudit?.auditVersion === newAudit?.auditVersion ? (
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Viewing the initial baseline snapshot of your stack. Click subsequent versions in the timeline above to see what changes occurred over time.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Catalog updates and usage changes generated optimization adjustments between{' '}
                  <span className="text-white font-semibold">v{oldAudit?.auditVersion || 1}</span> ({oldAudit?.createdAt ? new Date(oldAudit.createdAt).toLocaleDateString() : ''}) and{' '}
                  <span className="text-white font-semibold">v{newAudit?.auditVersion || 2}</span> ({newAudit?.createdAt ? new Date(newAudit.createdAt).toLocaleDateString() : ''}).
                </p>
              )}
              {newAudit && newAudit.auditVersion && newAudit.auditVersion > 2 && (
                <div className="flex justify-center sm:justify-start pt-2 sm:pt-3">
                  <div className="inline-flex p-0.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md gap-1">
                    <button
                      onClick={() => setCompareWith('previous')}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        compareWith === 'previous'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <span className="hidden sm:inline">Compare Previous</span>
                      <span className="sm:hidden">Previous</span>
                    </button>
                    <button
                      onClick={() => setCompareWith('root')}
                      className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        compareWith === 'root'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      <span className="hidden sm:inline">Compare Baseline</span>
                      <span className="sm:hidden">Baseline</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Core Comparative Metrics Grid */}
            <div className="metrics-grid">
              {/* Stack Spend Dynamics Card */}
              <div className="metric-card">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#6b7b93] uppercase tracking-wider block">
                    Stack Monthly Spend
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 line-through tabular-nums">
                        {formatCurrencyFull(oldAudit?.totalMonthlySpend ?? 0)}
                      </span>
                      <span className="text-xs text-[#6b7b93]">→</span>
                      <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                        {formatCurrencyFull(newAudit?.totalMonthlySpend ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {spendDelta < 0 ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap">
                      <span>↓</span> {formatCurrencyFull(Math.abs(spendDelta))}/mo
                    </span>
                  ) : spendDelta > 0 ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 whitespace-nowrap">
                      <span>↑</span> {formatCurrencyFull(spendDelta)}/mo
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap">
                      No change
                    </span>
                  )}
                  <span className="text-[10px] text-[#6b7b93]">
                    in raw stack cost
                  </span>
                </div>
              </div>

              {/* Identified Savings Evolution Card */}
              <div className="metric-card">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#6b7b93] uppercase tracking-wider block">
                    Potential Savings Opportunities
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold text-slate-400 line-through tabular-nums">
                        {formatCurrencyFull(oldAudit?.estimatedMonthlySavings ?? 0)}
                      </span>
                      <span className="text-xs text-[#6b7b93]">→</span>
                      <span className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums">
                        {formatCurrencyFull(newAudit?.estimatedMonthlySavings ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {savingsDelta > 0 ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap">
                      <span>+</span> {formatCurrencyFull(savingsDelta)}/mo
                    </span>
                  ) : savingsDelta < 0 ? (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 whitespace-nowrap">
                      <span>-</span> {formatCurrencyFull(Math.abs(savingsDelta))}/mo
                    </span>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap">
                      Steady
                    </span>
                  )}
                  <span className="text-[10px] text-[#6b7b93]">
                    recovery delta
                  </span>
                </div>
              </div>
            </div>

            {/* Drivers of Change Subgrid */}
            <div className="pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
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
        </m.div>

        {oldAudit?.auditVersion === newAudit?.auditVersion ? (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-static p-8 text-center border border-white/5 space-y-6"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
              🎯
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Original Audit Baseline</h3>
              <p className="text-sm text-[#94a3b8] max-w-md mx-auto leading-relaxed">
                This is the original version of your AI spend audit. You have a total monthly spend of{' '}
                <span className="text-white font-semibold">{formatCurrencyFull(newAudit.totalMonthlySpend)}</span>, with{' '}
                <span className="text-emerald-400 font-semibold">{formatCurrencyFull(newAudit.estimatedMonthlySavings)}/mo</span> in potential savings.
              </p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto pt-4 border-t border-white/5">
              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
                <span className="text-[10px] text-[#6b7b93] font-semibold uppercase block">Monthly Spend</span>
                <span className="text-sm font-bold text-white block mt-0.5">{formatCurrencyFull(newAudit.totalMonthlySpend)}</span>
              </div>
              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
                <span className="text-[10px] text-[#6b7b93] font-semibold uppercase block">Est. Savings</span>
                <span className="text-sm font-bold text-emerald-400 block mt-0.5">{formatCurrencyFull(newAudit.estimatedMonthlySavings)}</span>
              </div>
              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
                <span className="text-[10px] text-[#6b7b93] font-semibold uppercase block">Saving Level</span>
                <span className="text-sm font-bold text-indigo-400 block mt-0.5">{newAudit.savingsPercentage}%</span>
              </div>
              <div className="p-3 bg-white/[0.01] rounded-xl border border-white/5">
                <span className="text-[10px] text-[#6b7b93] font-semibold uppercase block">Total Tools</span>
                <span className="text-sm font-bold text-purple-400 block mt-0.5">{(newAudit.tools || []).length}</span>
              </div>
            </div>

            {allVersions && allVersions.length > 1 ? (
              <p className="text-xs text-[#94a3b8] pt-2">
                Select version 2 or newer in the timeline above to view savings changes and re-audit diffs.
              </p>
            ) : (
              isOwner && (
                <div className="pt-2">
                  <button
                    onClick={handleRunReAudit}
                    disabled={reAuditing}
                    className="px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-sm font-semibold transition-all flex items-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                  >
                    {reAuditing ? 'Recalculating...' : '🔄 Run Pricing Re-Audit Now'}
                  </button>
                </div>
              )
            )}
          </m.div>
        ) : (
          !hasChanges && (
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
          )
        )}

        {/* ── 2. AI Stack Evolution Panel ──────────────────────────── */}
        {(() => {
          const sd = diff?.stackDiff;
          if (!sd) return null;
          const hasStackChanges =
            sd.added.length > 0 ||
            sd.removed.length > 0 ||
            sd.replaced.length > 0 ||
            sd.changed.length > 0 ||
            sd.summaries.length > 0;
          if (!hasStackChanges) return null;

          return (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="text-xl">🔬</span> AI Stack Evolution
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    How your actual AI toolset changed between v{oldAudit?.auditVersion || 1} → v{newAudit?.auditVersion || 2}
                  </p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold uppercase tracking-wider">
                  Stack Diff Active
                </span>
              </div>

              {/* Storytelling Summaries */}
              {sd.summaries.length > 0 && (
                <div className="bg-gradient-to-br from-[#0f1023] to-[#0c0e1a] border border-indigo-500/20 rounded-2xl p-6 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500" />
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    Stack Story
                  </h4>
                  <ul className="space-y-2">
                    {sd.summaries.map((s, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-[#c0cbd6] leading-relaxed">
                        <span className="shrink-0 mt-1 w-4 h-4 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-400">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metric Evolution Grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Total Tools',
                    old: sd.oldToolCount,
                    new: sd.newToolCount,
                    delta: sd.toolCountDelta,
                    positiveIsGood: true,
                    icon: '🧰',
                  },
                  {
                    label: 'Redundancies',
                    old: sd.oldOverlapCount,
                    new: sd.newOverlapCount,
                    delta: sd.overlapCountDelta,
                    positiveIsGood: false,
                    icon: '⚠️',
                  },
                  {
                    label: 'Opt. Opportunities',
                    old: sd.oldOptCount,
                    new: sd.newOptCount,
                    delta: sd.optCountDelta,
                    positiveIsGood: true,
                    icon: '💡',
                  },
                ].map((metric) => {
                  const improved = metric.positiveIsGood ? metric.delta > 0 : metric.delta < 0;
                  const worsened = metric.positiveIsGood ? metric.delta < 0 : metric.delta > 0;
                  return (
                    <div key={metric.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 text-center space-y-1.5 hover:border-white/10 transition-all">
                      <span className="text-xl">{metric.icon}</span>
                      <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold tabular-nums">
                        <span className="text-[#6b7b93]">{metric.old}</span>
                        <span className="text-[#475569] text-xs">➔</span>
                        <span className="text-white">{metric.new}</span>
                      </div>
                      <span className="text-[10px] text-[#6b7b93] font-semibold uppercase tracking-wide block">
                        {metric.label}
                      </span>
                      {metric.delta !== 0 && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                          improved
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : worsened
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-slate-500/10 text-slate-400'
                        }`}>
                          {metric.delta > 0 ? '+' : ''}{metric.delta}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Replaced Tools — Before → After Cards */}
              {sd.replaced.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    Tool Replacements ({sd.replaced.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    {sd.replaced.map((rep) => (
                      <div
                        key={`${rep.removedToolId}->${rep.addedToolId}`}
                        className="bg-white/[0.02] border border-purple-500/15 rounded-2xl p-5 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500 via-purple-500 to-emerald-500" />
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          {/* Removed side */}
                          <div className="bg-rose-950/30 border border-rose-500/15 rounded-xl p-4 space-y-1.5 opacity-80">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400 block">Before</span>
                            <p className="font-bold text-sm text-rose-200 line-through">{rep.removedToolName}</p>
                            <p className="text-[11px] text-[#6b7b93]">{rep.removedPlanLabel} Plan</p>
                            <p className="text-xs font-bold text-rose-400/70 tabular-nums">${rep.removedSpend.toFixed(0)}/mo</p>
                          </div>
                          {/* Arrow */}
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-purple-400 text-lg">⇒</span>
                            <span className="text-[9px] text-[#6b7b93] font-bold uppercase tracking-wider">Replaced</span>
                          </div>
                          {/* Added side */}
                          <div className="bg-emerald-950/30 border border-emerald-500/15 rounded-xl p-4 space-y-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 block">After</span>
                            <p className="font-bold text-sm text-emerald-200">{rep.addedToolName}</p>
                            <p className="text-[11px] text-[#94a3b8]">{rep.addedPlanLabel} Plan</p>
                            <p className="text-xs font-bold text-emerald-400 tabular-nums">${rep.addedSpend.toFixed(0)}/mo</p>
                          </div>
                        </div>
                        {/* Spend delta */}
                        {rep.addedSpend !== rep.removedSpend && (
                          <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              rep.addedSpend < rep.removedSpend
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {rep.addedSpend < rep.removedSpend ? '↓' : '↑'} ${Math.abs(rep.addedSpend - rep.removedSpend).toFixed(0)}/mo spend {rep.addedSpend < rep.removedSpend ? 'saved' : 'increase'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Added Tools */}
              {sd.added.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Added to Stack ({sd.added.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sd.added.map((tool) => (
                      <div
                        key={tool.toolId}
                        className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-5 space-y-2 hover:border-emerald-500/35 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-emerald-200">{tool.toolName}</p>
                            <p className="text-[11px] text-[#94a3b8]">{tool.planLabel} Plan · {tool.seats} seat{tool.seats !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0">+ Added</span>
                        </div>
                        <div className="pt-2 border-t border-emerald-500/10 flex justify-between items-center">
                          <span className="text-[10px] text-[#6b7b93]">Monthly spend</span>
                          <span className="text-xs font-bold text-emerald-400 tabular-nums">${tool.monthlySpend.toFixed(0)}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Removed Tools */}
              {sd.removed.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Removed from Stack ({sd.removed.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 opacity-70">
                    {sd.removed.map((tool) => (
                      <div
                        key={tool.toolId}
                        className="bg-rose-950/20 border border-rose-500/15 rounded-xl p-5 space-y-2 relative overflow-hidden"
                      >
                        {/* Diagonal strikethrough feel */}
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-900/5 to-transparent pointer-events-none" />
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-sm text-rose-300 line-through">{tool.toolName}</p>
                            <p className="text-[11px] text-[#6b7b93]">{tool.planLabel} Plan · {tool.seats} seat{tool.seats !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/25 shrink-0">− Removed</span>
                        </div>
                        <div className="pt-2 border-t border-rose-500/10 flex justify-between items-center">
                          <span className="text-[10px] text-[#6b7b93]">Was costing</span>
                          <span className="text-xs font-bold text-rose-400/70 tabular-nums line-through">${tool.monthlySpend.toFixed(0)}/mo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified Tools (seat or plan changes) */}
              {sd.changed.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Modified Tools ({sd.changed.length})
                  </h4>
                  <div className="space-y-3">
                    {sd.changed.map((tool) => (
                      <div
                        key={tool.toolId}
                        className="bg-amber-950/10 border border-amber-500/15 rounded-xl p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-white">{tool.toolName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/25">~ Modified</span>
                        </div>
                        <div className="grid grid-cols-3 text-xs gap-3 text-center">
                          {/* Plan change */}
                          {tool.oldPlanId !== tool.newPlanId && (
                            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
                              <span className="text-[9px] text-[#6b7b93] font-bold uppercase block">Plan</span>
                              <span className="text-[#6b7b93] line-through block text-[11px]">{tool.oldPlanLabel}</span>
                              <span className="text-amber-300 font-semibold block text-[11px]">{tool.newPlanLabel}</span>
                            </div>
                          )}
                          {/* Seat change */}
                          {tool.oldSeats !== tool.newSeats && (
                            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
                              <span className="text-[9px] text-[#6b7b93] font-bold uppercase block">Seats</span>
                              <span className="text-[#6b7b93] line-through block text-[11px]">{tool.oldSeats}</span>
                              <span className="text-amber-300 font-semibold block text-[11px]">{tool.newSeats}</span>
                            </div>
                          )}
                          {/* Spend change */}
                          {Math.abs(tool.spendDelta) > 0.01 && (
                            <div className="bg-white/[0.02] rounded-lg p-3 space-y-1">
                              <span className="text-[9px] text-[#6b7b93] font-bold uppercase block">Spend</span>
                              <span className="text-[#6b7b93] line-through block text-[11px]">${tool.oldSpend.toFixed(0)}/mo</span>
                              <div className="flex items-center justify-center gap-0.5">
                                <span className="text-amber-300 font-semibold text-[11px]">${tool.newSpend.toFixed(0)}/mo</span>
                                <span className={`text-[8px] font-bold ${
                                  tool.spendDelta > 0 ? 'text-rose-400' : 'text-emerald-400'
                                }`}>
                                  ({tool.spendDelta > 0 ? '+' : ''}{tool.spendDelta.toFixed(0)})
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider to next section */}
              <div className="border-t border-white/5" />
            </m.div>
          );
        })()}

        {/* ── 3. Pricing Change Visualization ─────────────────────── */}
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

        {/* ── Audit Workspace Actions Dual-Flow Control ── */}
        <m.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-static p-8 border border-white/5 rounded-3xl bg-gradient-to-br from-[#0c0e18]/80 to-[#121020]/90 shadow-[0_20px_60px_rgba(0,0,0,0.4)] relative overflow-hidden"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -right-20 -bottom-20 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -left-20 -top-20 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl" />

          <h3 className="text-lg font-bold text-white mb-6 text-center sm:text-left tracking-tight">
            Audit Workspace Actions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Flow 1: Re-Audit Existing Stack */}
            {isOwner && (
              <div className="flex flex-col justify-between p-6 rounded-2xl bg-white/[0.015] border border-white/5 hover:border-indigo-500/20 transition-all group text-left">
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 text-lg">🔄</span>
                    <h4 className="font-extrabold text-sm text-amber-300 uppercase tracking-widest">
                      Flow 1: Evolution
                    </h4>
                  </div>
                  <h5 className="text-base font-bold text-white tracking-tight">
                    Re-Audit Existing Stack
                  </h5>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    Preserves this timeline's root identity and appends a new version (<span className="text-indigo-400 font-semibold">v{(newAudit?.auditVersion ?? 1) + 1}</span>) to the timeline. Recommended if provider pricing rates have updated or you adjusted team configurations.
                  </p>
                </div>
                <button
                  onClick={handleRunReAudit}
                  disabled={reAuditing}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  aria-label="Re-Audit Existing Stack"
                >
                  {reAuditing ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Recalculating...
                    </>
                  ) : (
                    'Re-Audit Existing Stack →'
                  )}
                </button>
              </div>
            )}

            {/* Flow 2: Start New Independent Audit */}
            <div className={`flex flex-col justify-between p-6 rounded-2xl bg-white/[0.015] border border-white/5 hover:border-indigo-500/20 transition-all group text-left ${!isOwner ? 'md:col-span-2 max-w-md mx-auto w-full' : ''}`}>
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400 text-lg">✨</span>
                  <h4 className="font-extrabold text-sm text-indigo-400 uppercase tracking-widest">
                    Flow 2: Standalone
                  </h4>
                </div>
                <h5 className="text-base font-bold text-white tracking-tight">
                  Start New Independent Audit
                </h5>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Start a completely fresh standalone audit from scratch (<span className="text-indigo-400 font-semibold">v1</span>). Creates a separate stack history and does not affect the timeline or version lineage of this audit.
                </p>
              </div>
              <button
                onClick={() => navigate('/audit')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-bold transition-all text-center cursor-pointer"
                aria-label="Start New Independent Audit"
              >
                Start New Independent Audit →
              </button>
            </div>
          </div>
        </m.div>

        <div className="text-center pt-8 border-t border-white/5">
          <button
            onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`)}
            className="text-[#94a3b8] hover:text-white text-sm font-semibold cursor-pointer"
          >
            ← Back to Results Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
