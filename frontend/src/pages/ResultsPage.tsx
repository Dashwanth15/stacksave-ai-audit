import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import type { AuditResult, Insight } from '../types';
import { fetchAudit, captureLead } from '../services/api';
import { formatCurrencyFull, formatRelativeTime, severityLabel, insightTypeLabel } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEVERITY_COLORS = {
  high: '#f87171',
  medium: '#fbbf24',
  low: '#34d399',
  info: '#818cf8',
};

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-semibold text-white text-lg">{insight.toolName}</div>
            <div className="text-xs text-[#64748b]">{insightTypeLabel(insight.type)}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-1 rounded-full font-medium badge-${insight.severity}`}>
            {severityLabel(insight.severity)}
          </span>
          {insight.potentialMonthlySaving > 0 && (
            <span className="text-emerald-400 font-bold text-sm">
              Save {formatCurrencyFull(insight.potentialMonthlySaving)}/mo
            </span>
          )}
        </div>
      </div>
      <p className="text-[#94a3b8] text-sm mb-3 leading-relaxed">{insight.message}</p>
      <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
        <span className="text-indigo-400 text-sm font-medium shrink-0">→</span>
        <p className="text-indigo-300 text-sm leading-relaxed">{insight.suggestion}</p>
      </div>
      <p className="text-xs text-[#475569] mt-3 italic leading-relaxed">{insight.reason}</p>
    </m.div>
  );
}

function EmailCaptureModal({
  auditId,
  onClose,
  onSuccess,
}: {
  auditId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hp, setHp] = useState(''); // honeypot

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    try {
      await captureLead({ email, auditId, companyName: company, role, _hp: hp });
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Save your audit report">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative glass-card p-8 max-w-md w-full border border-indigo-500/20 glow-primary"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[#475569] hover:text-white text-xl" aria-label="Close">×</button>
        <h3 className="text-2xl font-bold mb-2">Save your report ✉️</h3>
        <p className="text-[#94a3b8] text-sm mb-6">
          We'll email you a link to this audit and notify you when new optimizations apply to your stack.
        </p>
        {error && <p className="text-red-400 text-sm mb-4 p-3 bg-red-500/10 rounded-lg" role="alert">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot — hidden from real users */}
          <input
            type="text"
            name="_hp"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
            autoComplete="off"
          />
          <div>
            <label className="block text-sm text-[#94a3b8] mb-1.5" htmlFor="lead-email">Email address *</label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@startup.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#475569] focus:border-indigo-500/50 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5" htmlFor="lead-company">Company</label>
              <input
                id="lead-company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#475569] focus:border-indigo-500/50 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-1.5" htmlFor="lead-role">Role</label>
              <input
                id="lead-role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Optional"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#475569] focus:border-indigo-500/50 focus:outline-none text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            aria-label="Submit email to save audit"
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {loading ? 'Saving…' : 'Send me the report →'}
          </button>
          <p className="text-xs text-[#475569] text-center">No spam. One email with your audit link.</p>
        </form>
      </m.div>
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [audit, setAudit] = useState<AuditResult | null>(
    (location.state as { audit?: AuditResult })?.audit || null
  );
  const [loading, setLoading] = useState(!audit);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!audit && id) {
      fetchAudit(id)
        .then(setAudit)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, audit]);

  // Show email modal after 3s if not already captured
  useEffect(() => {
    if (audit && !emailCaptured) {
      const timer = setTimeout(() => setShowEmailModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [audit, emailCaptured]);

  function copyShareUrl() {
    if (!audit) return;
    navigator.clipboard.writeText(audit.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#94a3b8]">Loading your audit…</p>
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
          <p className="text-[#94a3b8] mb-6">{error || 'This audit link may have expired.'}</p>
          <button onClick={() => navigate('/audit')} className="px-6 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
            Run a new audit →
          </button>
        </div>
      </div>
    );
  }

  // Chart data
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
      {/* Nav */}
      <nav className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-40 bg-[#0b0b15]/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-indigo-400 font-bold text-lg">StackSave</button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium transition-all"
              aria-label="Save audit report"
            >
              Save Report
            </button>
            <button
              onClick={copyShareUrl}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/10 text-sm font-medium transition-all"
              aria-label="Copy share link"
            >
              {copied ? '✓ Copied!' : '🔗 Share'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 space-y-8">
        {/* ── Savings Hero ──────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={`glass-card p-8 sm:p-12 text-center ${audit.isAlreadyOptimal ? 'border-emerald-500/20' : 'border-indigo-500/20 glow-primary'}`}
          style={{ borderColor: audit.isAlreadyOptimal ? 'rgba(52, 211, 153, 0.2)' : 'rgba(129, 140, 248, 0.2)' }}
        >
          <div className="text-sm text-[#64748b] uppercase tracking-wider mb-2">
            {audit.companyName || 'Your AI Stack'} · Audited {formatRelativeTime(audit.createdAt)}
          </div>
          {audit.isAlreadyOptimal ? (
            <>
              <div className="text-6xl mb-4">🏆</div>
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 text-emerald-400">
                You're spending well
              </h1>
              <p className="text-[#94a3b8] text-lg max-w-xl mx-auto">
                Your AI stack is well-optimized for your team size and use case. We didn't find any significant waste. Nice work.
              </p>
            </>
          ) : (
            <>
              <p className="text-[#94a3b8] text-sm mb-2">Potential monthly savings</p>
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

        {/* ── Credex CTA for high savings ───────────────────── */}
        {audit.isHighSavings && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 sm:p-8 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))', border: '1px solid rgba(99, 102, 241, 0.3)' }}
          >
            <div className="text-3xl mb-3">💡</div>
            <h2 className="text-2xl font-bold mb-2">You could save even more with Credex</h2>
            <p className="text-[#94a3b8] mb-6 max-w-lg mx-auto">
              Credex sources discounted AI infrastructure credits — Cursor, Claude, ChatGPT Enterprise — from companies that overforecast. The discount is real: 20–40% below retail.
            </p>
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              aria-label="Book a free Credex consultation"
            >
              Book a Free Credex Consultation →
            </a>
          </m.div>
        )}

        {/* ── Savings Chart ─────────────────────────────────── */}
        {chartData.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6"
          >
            <h2 className="text-xl font-semibold mb-6">Savings breakdown by tool</h2>
            <div className="h-48" aria-label="Savings chart by tool">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                    formatter={(value: number) => [`$${value}/mo`, 'Potential saving']}
                  />
                  <Bar dataKey="saving" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS] || '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </m.div>
        )}

        {/* ── AI Summary ────────────────────────────────────── */}
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

        {/* ── Insights ─────────────────────────────────────── */}
        {audit.insights.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              Per-tool recommendations
              <span className="ml-3 text-sm font-normal text-[#64748b]">({audit.insights.length} finding{audit.insights.length > 1 ? 's' : ''})</span>
            </h2>
            <div className="space-y-4">
              {audit.insights.map((insight, i) => (
                <InsightCard key={`${insight.toolId}-${insight.type}`} insight={insight} index={i} />
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-[#94a3b8]">No specific issues found — your stack is well-optimized.</p>
          </div>
        )}

        {/* ── "Notify me" CTA for optimal stacks ───────────── */}
        {audit.isAlreadyOptimal && !emailCaptured && (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <h3 className="text-xl font-semibold mb-2">Stay ahead of price changes</h3>
            <p className="text-[#94a3b8] mb-5 text-sm">We'll notify you when new optimizations apply to your exact stack.</p>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-8 py-3 rounded-xl font-semibold text-white border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all"
              aria-label="Get notified about new optimizations"
            >
              Notify me when this changes →
            </button>
          </m.div>
        )}

        {/* ── Share CTA ─────────────────────────────────────── */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-8 text-center"
        >
          <h3 className="text-xl font-semibold mb-2">Share this audit</h3>
          <p className="text-[#94a3b8] text-sm mb-5">
            Your public audit URL — company name and email are not included in the shared version.
          </p>
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <input
              type="text"
              value={audit.publicUrl}
              readOnly
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-[#94a3b8] text-sm focus:outline-none"
              aria-label="Shareable audit URL"
            />
            <button
              onClick={copyShareUrl}
              className="px-5 py-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium whitespace-nowrap transition-all"
              aria-label="Copy share URL to clipboard"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <a
              href={`https://twitter.com/intent/tweet?text=I%20just%20found%20out%20my%20team%20could%20save%20%24${audit.estimatedMonthlySavings}%2Fmonth%20on%20AI%20tools%20with%20%40StackSaveAI%20%F0%9F%A4%AF&url=${encodeURIComponent(audit.publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-sm font-medium transition-all"
              aria-label="Share on Twitter/X"
            >
              Share on X/Twitter
            </a>
          </div>
        </m.div>

        <div className="text-center pb-4">
          <button
            onClick={() => navigate('/audit')}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
            aria-label="Run a new audit"
          >
            ← Run a new audit
          </button>
        </div>
      </div>

      {/* ── Email Modal ───────────────────────────────────────  */}
      <AnimatePresence>
        {showEmailModal && !emailCaptured && (
          <EmailCaptureModal
            auditId={audit.auditId}
            onClose={() => setShowEmailModal(false)}
            onSuccess={() => {
              setEmailCaptured(true);
              setShowEmailModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
