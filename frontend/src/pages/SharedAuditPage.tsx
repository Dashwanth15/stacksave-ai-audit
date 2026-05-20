// ============================================================
// SharedAuditPage — Public read-only audit view
//
// Renders the same results view but in "shared" mode:
// - No auto-popup email modal (visitor didn't create this audit)
// - Shows a "Run your own audit" CTA instead
// - Strips private data server-side (GET /api/audits/:id)
// ============================================================

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import type { AuditResult, Insight } from '../types';
import { fetchAudit, triggerReAudit } from '../services/api';
import { formatCurrencyFull, formatRelativeTime, severityLabel, insightTypeLabel } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

// Cohesive chart palette — unified blue/purple/cyan family
const CHART_COLORS = ['#6366f1', '#7c3aed', '#4f46e5', '#06b6d4', '#3b82f6', '#22d3ee'];

function toolAlias(name: string) {
  const n = name.toLowerCase();
  if (n.includes('github') && n.includes('copilot')) return 'GitHub';
  if (n.includes('copilot')) return 'GitHub';
  if (n.includes('anthropic')) return 'Anthropic';
  if (n.includes('openai')) return 'OpenAI';
  if (n.includes('chatgpt')) return 'ChatGPT';
  if (n.includes('claude')) return 'Claude';
  if (n.includes('cursor')) return 'Cursor';
  if (n.includes('gemini')) return 'Gemini';
  if (n.includes('windsurf')) return 'Windsurf';
  return name;
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function SavingsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name?: string }; color?: string }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0];
  const name = row?.payload?.name ?? '';
  const value = typeof row?.value === 'number' ? row.value : 0;
  const color = row?.color || '#818cf8';

  return (
    <div
      className="rounded-xl border border-white/10 bg-[#0f1320]/95 px-3.5 py-3 shadow-[0_16px_60px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ minWidth: 180 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 0 3px ${hexToRgba(color, 0.12)}` }}
        />
        <div className="text-sm font-semibold text-white leading-none">{name}</div>
      </div>
      <div className="text-xs text-[#94a3b8]">Potential recovery</div>
      <div className="text-lg font-bold text-emerald-300 tabular-nums">{`$${value}/mo`}</div>
    </div>
  );
}




function SharedInsightCard({ insight, index }: { insight: Insight; index: number }) {
  const severityCopy: Record<string, string> = {
    high: 'High Confidence',
    medium: 'Optimization Opportunity',
    low: 'Worth Exploring',
    info: 'Insight',
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="insight-card p-6 sm:p-7"
      data-severity={insight.severity}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-bold text-white text-xl tracking-tight">{insight.toolName}</h3>
          <span className="text-xs text-[#64748b] mt-0.5 block">{insightTypeLabel(insight.type)}</span>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium severity-label-${insight.severity}`}>
            {severityCopy[insight.severity] || severityLabel(insight.severity)}
          </span>
          {insight.potentialMonthlySaving > 0 && (
            <span className="savings-badge text-emerald-400 font-bold text-sm whitespace-nowrap">
              Recover {formatCurrencyFull(insight.potentialMonthlySaving)}/mo
            </span>
          )}
        </div>
      </div>
      <p className="text-[#c0cbd6] text-sm mb-4 leading-relaxed">{insight.message}</p>
      <div className="recommendation-box p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-indigo-400 text-xs font-bold">→</span>
        </div>
        <div>
          <p className="text-[11px] text-indigo-400/70 font-medium uppercase tracking-wider mb-1">Recommended Action</p>
          <p className="text-indigo-200 text-sm leading-relaxed font-medium">{insight.suggestion}</p>
        </div>
      </div>
      <p className="text-xs text-[#76879f] mt-4 leading-relaxed border-t border-white/5 pt-3">{insight.reason}</p>
    </m.div>
  );
}

export default function SharedAuditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [reAuditing, setReAuditing] = useState(false);
  const [prevId, setPrevId] = useState<string | undefined>(id);

  if (id !== prevId) {
    setPrevId(id);
    setAudit(null);
    setLoading(true);
    setError(null);
  }

  async function handleRunReAudit() {
    if (!audit) return;
    setReAuditing(true);
    try {
      const result = await triggerReAudit(audit.auditId);
      navigate(`/audit/${result.newAuditId}/diff`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to trigger re-audit');
    } finally {
      setReAuditing(false);
    }
  }

  useEffect(() => {
    if (!audit && id) {
      fetchAudit(id)
        .then(setAudit)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, audit]);

  function copyShareUrl() {
    if (!audit) return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg">
        <div className="border-b border-white/5 h-16" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
          <div className="glass-card-static p-8 sm:p-12 space-y-4">
            <div className="skel-block h-4 w-48 mx-auto" />
            <div className="skel-block h-20 w-56 mx-auto" />
            <div className="skel-block h-5 w-64 mx-auto" />
          </div>
          <div className="glass-card-static p-6 space-y-4">
            <div className="skel-block h-5 w-52" />
            <div className="flex items-end gap-4 h-40 pt-4">
              {[70, 50, 35, 55].map((h, i) => (
                <div key={i} className="skel-block flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="glass-card-static p-6 space-y-3">
              <div className="flex justify-between"><div className="skel-block h-5 w-32" /><div className="skel-block h-5 w-20" /></div>
              <div className="skel-block h-4 w-full" /><div className="skel-block h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Audit not found</h2>
          <p className="text-[#94a3b8] mb-6">{error || 'This audit link may have expired or is invalid.'}</p>
          <button
            onClick={() => navigate('/audit')}
            className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            Run Your Own Free Audit →
          </button>
        </div>
      </div>
    );
  }

  const chartData = audit.insights
    .filter((i) => i.potentialMonthlySaving > 0)
    .slice(0, 6)
    .map((i) => ({
      name: i.toolName,
      label: toolAlias(i.toolName),
      saving: i.potentialMonthlySaving,
      severity: i.severity,
    }));

  const highCount = audit.insights.filter((i) => i.severity === 'high').length;
  const overlapCount = audit.insights.filter((i) => i.type === 'overlapping_tools').length;
  const supportingInsight =
    overlapCount > 0
      ? 'Largest opportunity detected in overlapping AI subscriptions.'
      : highCount > 0
        ? `${highCount} high-confidence optimization opportunit${highCount === 1 ? 'y' : 'ies'} detected.`
        : `${audit.insights.length} actionable optimization finding${audit.insights.length === 1 ? '' : 's'} identified.`;

  return (
    <div className="min-h-screen grid-bg pb-20">
      {/* Shared audit banner */}
      <nav className="border-b border-white/[0.07] backdrop-blur-xl sticky top-0 z-40 bg-[#0a0a14]/88 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-indigo-400 font-bold text-lg tracking-tight">StackSave</button>
            <span className="hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#94a3b8] font-medium">
              Shared report
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyShareUrl}
              className="px-4 py-2 rounded-lg bg-white/[0.045] hover:bg-white/10 text-slate-100 border border-white/10 text-sm font-medium transition-all"
              aria-label="Copy share link"
            >
              {copied ? '✓ Copied!' : '🔗 Share'}
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              aria-label="Start your own audit"
            >
              Audit My Stack →
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        {/* ── Batch 4: Re-audit Banner & Newer Version Notice ── */}
        {audit.pricingChanged && (audit.isLatestVersion ?? true) && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-bold">Provider pricing changes detected.</span>{' '}
                {audit.outdatedReason || 'Some tools in your stack have updated pricing models.'}
              </div>
            </div>
            <button
              onClick={handleRunReAudit}
              disabled={reAuditing}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors shrink-0 disabled:opacity-50 text-xs"
            >
              {reAuditing ? 'Recalculating...' : 'Update & View Diff'}
            </button>
          </m.div>
        )}

        {audit.isLatestVersion === false && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">ℹ️</span>
              <div>
                <span className="font-bold">This is an older version of the audit (v{audit.auditVersion || 1}).</span>{' '}
                A newer re-audit version is available with current pricing.
              </div>
            </div>
            <button
              onClick={() => navigate(`/audit/${audit.reAuditOf || audit.auditId}/diff`)}
              className="px-4 py-1.5 rounded-lg bg-indigo-500 text-white font-bold hover:bg-indigo-400 transition-colors shrink-0 text-xs"
            >
              View Latest Diff
            </button>
          </m.div>
        )}

        {/* ── Audit Version Timeline & Living History ── */}
        {audit.allVersions && audit.allVersions.length > 1 && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  Living Audit Timeline
                </h3>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  Click below to switch dashboards, or compare changes side-by-side.
                </p>
              </div>
              <button
                onClick={() => navigate(`/audit/${audit.auditId}/diff`)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 transition-all text-center sm:text-right cursor-pointer"
              >
                📊 Compare Baseline vs Latest Diff →
              </button>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-thin">
              {audit.allVersions.map((v) => {
                const isActive = v.auditId === audit.auditId;
                return (
                  <button
                    key={v.auditId}
                    onClick={() => {
                      if (!isActive) {
                        navigate(`/audit/${v.auditId}`);
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                        : 'bg-white/3 border-white/5 hover:bg-white/8 text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-400' : 'bg-slate-500'}`} />
                    <span>v{v.auditVersion || 1} {isActive ? '(Current View)' : ''}</span>
                    <span className="text-[10px] text-[#6b7b93] font-normal">
                      ({formatRelativeTime(v.createdAt)})
                    </span>
                  </button>
                );
              })}
            </div>
          </m.div>
        )}

        {/* Shared badge */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            📊 Shared Audit Report
          </span>
        </div>

        {/* Savings Hero */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card-static p-8 sm:p-12 text-center ${audit.isAlreadyOptimal ? 'border-emerald-500/20' : 'savings-hero-card glow-savings'}`}
          style={{ borderColor: audit.isAlreadyOptimal ? 'rgba(52, 211, 153, 0.2)' : 'rgba(52, 211, 153, 0.15)' }}
        >
          <div className="text-sm text-[#64748b] uppercase tracking-wider mb-2">
            AI Stack Audit · {formatRelativeTime(audit.createdAt)}
          </div>
          {audit.isAlreadyOptimal ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 text-emerald-400">
                Stack is well-optimized
              </h1>
              <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
                This team's AI stack is appropriately sized. No significant waste found.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#94a3b8] text-sm mb-2">Potential monthly savings found</p>
              <div className="text-6xl sm:text-8xl font-black gradient-text-green mb-2">
                {formatCurrencyFull(audit.estimatedMonthlySavings)}
              </div>
              <div className="text-2xl text-[#94a3b8] mb-4">
                {formatCurrencyFull(audit.estimatedAnnualSavings)}/year · {audit.savingsPercentage}% reduction
              </div>
              <div className="flex items-center justify-center gap-6 text-sm text-[#64748b]">
                <span>Current: <strong className="text-white">{formatCurrencyFull(audit.totalMonthlySpend)}/mo</strong></span>
                <span>→</span>
                <span>Optimized: <strong className="text-emerald-400">{formatCurrencyFull(audit.optimizedMonthlySpend)}/mo</strong></span>
              </div>
              <div className="mt-4 text-sm text-[#7b8aa0]">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/70" />
                  {supportingInsight}
                </span>
              </div>
            </>
          )}
        </m.div>

        {/* Credex CTA for high savings */}
        {audit.isHighSavings && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 sm:p-8 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))', border: '1px solid rgba(99, 102, 241, 0.3)' }}
          >
            <div className="text-3xl mb-3">💡</div>
            <h2 className="text-2xl font-bold mb-2">Save even more with Credex</h2>
            <p className="text-[#94a3b8] mb-6 max-w-lg mx-auto">
              Credex sources discounted AI infrastructure credits — 20–40% below retail.
            </p>
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Book a Free Consultation →
            </a>
          </m.div>
        )}

        {/* Savings Chart */}
        {chartData.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold mb-6">Savings breakdown by tool</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap="26%">
                  <defs>
                    {chartData.map((_entry, i) => {
                      const base = CHART_COLORS[i % CHART_COLORS.length];
                      return (
                        <linearGradient key={i} id={`ss-bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={hexToRgba(base, 0.98)} />
                          <stop offset="65%" stopColor={hexToRgba(base, 0.78)} />
                          <stop offset="100%" stopColor={hexToRgba(base, 0.58)} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.045)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(v) => String(v)}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    height={38}
                  />
                  <YAxis
                    tick={{ fill: '#7b8aa0', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v}`}
                    width={46}
                  />
                  <Tooltip content={<SavingsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar
                    dataKey="saving"
                    radius={[12, 12, 6, 6]}
                    isAnimationActive
                    animationDuration={850}
                    animationEasing="ease-out"
                    barSize={34}
                  >
                    {chartData.map((_entry, i) => (
                      <Cell
                        key={i}
                        fill={`url(#ss-bar-grad-${i})`}
                        stroke={hexToRgba(CHART_COLORS[i % CHART_COLORS.length], 0.28)}
                        strokeWidth={1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </m.div>
        )}

        {/* AI Summary */}
        {audit.aiSummary && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 border border-indigo-500/10"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-indigo-400 text-sm font-medium px-2 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                🤖 AI Summary
              </span>
            </div>
            <p className="text-[#c7d2fe] leading-relaxed text-lg italic">"{audit.aiSummary}"</p>
          </m.div>
        )}

        {/* Insights */}
        {audit.insights.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold">Optimization Report</h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-[#94a3b8] font-medium">
                {audit.insights.length} finding{audit.insights.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-[#73849c] mb-8">Per-tool spend analysis and actionable recommendations</p>
            <div className="space-y-5">
              {audit.insights.map((insight, i) => (
                <SharedInsightCard key={`${insight.toolId}-${insight.type}`} insight={insight} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[#94a3b8]">No specific issues found — this stack is well-optimized.</p>
          </div>
        )}

        {/* CTA for visitors */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 text-center"
          style={{ borderColor: 'rgba(129, 140, 248, 0.2)' }}
        >
          <h3 className="text-2xl font-bold mb-2">Want to audit your own AI stack?</h3>
          <p className="text-[#94a3b8] text-sm mb-6">Free · No login · Results in 60 seconds</p>
          <button
            onClick={() => navigate('/audit')}
            className="px-10 py-4 rounded-xl font-bold text-lg text-white glow-primary transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            aria-label="Start your own AI spend audit"
          >
            Start My Free Audit →
          </button>
        </m.div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-white/5">
          <p className="text-sm text-[#475569]">
            Powered by{' '}
            <a href="https://credex.rocks" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300">
              Credex
            </a>{' '}
            · Discounted AI infrastructure credits
          </p>
        </div>
      </div>
    </div>
  );
}
