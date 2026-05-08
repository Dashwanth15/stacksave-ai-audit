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
import { fetchAudit } from '../services/api';
import { formatCurrencyFull, formatRelativeTime, severityLabel, insightTypeLabel } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#34d399', '#f472b6', '#818cf8'];

const SEVERITY_COLORS = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
  info: '#818cf8',
};

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
      <p className="text-[#b0bec5] text-sm mb-4 leading-relaxed">{insight.message}</p>
      <div className="recommendation-box p-4 flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-indigo-400 text-xs font-bold">→</span>
        </div>
        <div>
          <p className="text-[11px] text-indigo-400/70 font-medium uppercase tracking-wider mb-1">Recommended Action</p>
          <p className="text-indigo-200 text-sm leading-relaxed font-medium">{insight.suggestion}</p>
        </div>
      </div>
      <p className="text-xs text-[#64748b] mt-4 leading-relaxed border-t border-white/5 pt-3">{insight.reason}</p>
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

  useEffect(() => {
    if (id) {
      fetchAudit(id)
        .then(setAudit)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

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
      saving: i.potentialMonthlySaving,
      severity: i.severity,
    }));

  return (
    <div className="min-h-screen grid-bg pb-20">
      {/* Shared audit banner */}
      <nav className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-40 bg-[#0b0b15]/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-indigo-400 font-bold text-lg">StackSave</button>
          <div className="flex items-center gap-3">
            <button
              onClick={copyShareUrl}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium transition-all"
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
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                    formatter={(value: number) => [`$${value}/mo`, 'Potential saving']}
                  />
                  <Bar dataKey="saving" radius={[8, 8, 0, 0]}>
                    {chartData.map((_entry, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
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
            <p className="text-sm text-[#64748b] mb-8">Per-tool spend analysis and actionable recommendations</p>
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
