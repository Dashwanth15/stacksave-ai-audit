import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import type { AuditResult, Insight } from '../types';
import type { StackIntelligenceResult } from '../types/intelligence';
import { fetchAudit, captureLead, triggerReAudit } from '../services/api';
import { fetchStackIntelligence } from '../services/intelligence';
import { formatCurrencyFull, insightTypeLabel, formatRelativeTime } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { generateAuditPDF } from '../services/pdfService';
import ReAuditDiffPage from './ReAuditDiffPage';
import Logo from '../components/Logo';
import StrategicGuidanceSection from '../components/intelligence/StrategicGuidanceSection';
import ToolIntelligencePanel from '../components/ToolIntelligencePanel';
import OfferNotificationBell from '../components/OfferNotificationBell';
import AuditedConfigurationBadge from '../components/audit/AuditedConfigurationBadge';
import { getUserScopedKey } from '../utils/userSession';





function SavingsTooltip({
  active,
  payload,
  savingsBreakdown,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { name?: string; label?: string; fill?: string }; color?: string }>;
  savingsBreakdown?: Array<{ toolName: string; saving: number }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0];
  const name = row?.payload?.name || row?.payload?.label || '';
  const value = typeof row?.value === 'number' ? row.value : 0;
  const color = row?.payload?.fill || '#3B82F6';
  const isSavings = name.toLowerCase().includes('savings');

  return (
    <div
      className="rounded-xl border p-3.5 bg-white shadow-xl border-slate-100 min-w-[200px]"
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <div className="text-xs font-bold text-slate-800">
          {name}
        </div>
      </div>
      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        Amount
      </div>
      <div
        className="text-base font-bold font-mono"
        style={{ color: color }}
      >
        {`$${value}/mo`}
      </div>

      {isSavings && savingsBreakdown && savingsBreakdown.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
            Savings Breakdown by Tool:
          </span>
          {savingsBreakdown.map((item) => (
            <div key={item.toolName} className="flex justify-between items-center text-[10.5px]">
              <span className="font-semibold text-slate-700">{item.toolName}</span>
              <span className="font-mono font-bold text-emerald-600">+${item.saving}/mo</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function useAnimatedCounter(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = 0;
    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

function SavingsCounter({ amount }: { amount: number }) {
  const animatedValue = useAnimatedCounter(amount);
  return (
    <div
      className="mb-2 font-mono-financial tracking-tight font-bold"
      style={{
        fontSize: 'clamp(48px, 8vw, 84px)',
        color: 'var(--color-success)',
        lineHeight: '1',
      }}
    >
      ${animatedValue.toLocaleString()}
    </div>
  );
}

const toolLogoMap: Record<string, string> = {
  cursor: '/logos/cursor.svg',
  'github-copilot': '/logos/copilot.svg',
  claude: '/logos/claude.svg',
  chatgpt: '/logos/chatgpt.svg',
  'anthropic-api': '/logos/anthropic.svg',
  'openai-api': '/logos/openai.svg',
  gemini: '/logos/gemini.svg',
  windsurf: '/logos/windsurf.svg',
  kimi: '/logos/kimi.svg',
};

function InsightCard({
  insight,
  index,
  isActive,
  onViewAnalysis,
}: {
  insight: Insight;
  index: number;
  isActive: boolean;
  onViewAnalysis: (insight: Insight) => void;
}) {
  const isAllStack = insight.toolName === 'All Stack Tools' || insight.toolId === 'all-stack-tools';
  const logoSrc = toolLogoMap[insight.toolId.toLowerCase()];

  // Clean, non-button status indicator with subtle dot
  const renderStatusIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 tracking-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            Fix First
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 tracking-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Worth Reviewing
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 tracking-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Plan Verified
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 tracking-normal">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            Optional
          </span>
        );
    }
  };

  const reasonText = isAllStack
    ? "Your current AI stack is already well optimized for your team's workflow. Current subscriptions are appropriately configured with zero redundant software licenses."
    : insight.reason;

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={() => onViewAnalysis(insight)}
      className={`p-5 sm:p-6 bg-white border rounded-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer group ${
        isActive
          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-md'
          : 'border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="space-y-4">
        {/* Top Header: Logo + Name + Category vs. Financial Impact */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Logo Container */}
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150">
              {logoSrc ? (
                <img src={logoSrc} alt="" className="w-full h-full object-contain" />
              ) : (
                <span className="text-slate-800 font-black text-sm">
                  {isAllStack ? '★' : insight.toolName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-extrabold text-lg tracking-tight text-slate-900 leading-tight">
                  {isAllStack ? 'Stack Intelligence' : insight.toolName}
                </h3>
                <span className="text-slate-300">·</span>
                {renderStatusIndicator(insight.severity)}
              </div>
              <span className="text-[11px] font-semibold text-slate-400 block mt-0.5">
                {insight.recommendationType || insightTypeLabel(insight.type)}
              </span>
            </div>
          </div>

          {/* Savings Metric Hero */}
          <div className="text-right shrink-0">
            {isAllStack ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Fully Optimized
              </span>
            ) : insight.potentialMonthlySaving > 0 ? (
              <div>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-xs font-bold text-emerald-700">Save</span>
                  <span className="text-2xl font-black font-mono text-emerald-600 tracking-tight leading-none">
                    ${insight.potentialMonthlySaving}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">/mo</span>
                </div>
                <span className="text-[11px] font-medium text-slate-400 block mt-1">
                  ≈ ${insight.potentialMonthlySaving * 12}/year
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400">Validated Plan</span>
            )}
          </div>
        </div>

        {/* Structured Recommendation Box */}
        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/70 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-sm text-slate-900 tracking-tight">
              {insight.suggestion}
            </span>
          </div>
          {reasonText && (
            <p className="text-xs text-slate-600 leading-relaxed font-medium pl-4">
              {reasonText}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Action CTA on LEFT (prevents drawer overlap) & Metadata on RIGHT */}
      <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between flex-wrap gap-3">
        {/* Left Side: Action CTA Button (Safe from right drawer overlap!) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewAnalysis(insight);
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs ${
            isActive
              ? 'bg-slate-900 text-white ring-2 ring-slate-800 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow'
          }`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 15v-4M12 15V9M17 15v-2" />
          </svg>
          <span>
            {isActive
              ? 'Close Analysis'
              : isAllStack
                ? 'Open Stack Analysis'
                : 'Open Tool Analysis'}
          </span>
          <span className="transition-transform duration-150 group-hover:translate-x-0.5">
            →
          </span>
        </button>

        {/* Right Side: Quality & Confidence Metadata */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Confidence:</span>
            <span className="font-bold text-slate-800 font-mono">
              {insight.confidenceScore ? `${insight.confidenceScore}%` : (insight.confidence || 'High')}
            </span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Impact:</span>
            <span className="font-semibold text-slate-700">{insight.productivityImpact || 'Minimal'}</span>
          </div>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            Verified ✓
          </span>
        </div>
      </div>
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
  const [hp, setHp] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Email is required'); return; }
    setLoading(true);
    setError('');
    try {
      await captureLead({ email, auditId, companyName: company, role, _hp: hp });
      setSent(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-heading)',
  } as const;

  const inputClass = 'w-full px-4 py-3 text-sm focus:outline-none placeholder:text-[#94A3B8] rounded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Save your audit report">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.4)' }}
        onClick={onClose}
      />
      <m.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-[var(--color-bg-card)] border p-8 rounded-lg"
        style={{
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {sent ? (
          <div className="text-center py-6">
            <h3 className="text-xl font-bold mb-2 text-[var(--color-success)]">
              Report Saved
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              A public bookmark link has been dispatched to {email}.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-1.5 text-[var(--color-text-heading)]">
                Save Audit Report
              </h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                We'll email you a secure link to this audit report so you can refer back to it.
              </p>
            </div>
            {error && (
              <p
                className="text-xs p-3 rounded mb-4 font-semibold"
                style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger-t)' }}
                role="alert"
              >
                {error}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }} htmlFor="lead-email">
                  Email Address *
                </label>
                <input
                  id="lead-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className={inputClass}
                  style={inputStyle}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-primary)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }} htmlFor="lead-company">
                    Company
                  </label>
                  <input
                    id="lead-company"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-primary)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }} htmlFor="lead-role">
                    Role
                  </label>
                  <input
                    id="lead-role"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-primary)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? 'Processing…' : 'Save Report'}
              </button>
            </form>
          </>
        )}
      </m.div>
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const isOwner = !!(
    (location.state as { isOwner?: boolean })?.isOwner ||
    (id && localStorage.getItem(getUserScopedKey(`owned_${id}`)) === 'true')
  );

  const queryParams = new URLSearchParams(location.search);
  const viewSingle = queryParams.get('view') === 'single';

  const [audit, setAudit] = useState<AuditResult | null>(
    (location.state as { audit?: AuditResult })?.audit || null
  );
  const [loading, setLoading] = useState(!audit);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [reAuditing, setReAuditing] = useState(false);
  const [prevId, setPrevId] = useState<string | undefined>(id);
  const [intelligence, setIntelligence] = useState<StackIntelligenceResult | null>(null);
  const [activeInsight, setActiveInsight] = useState<Insight | null>(null);

  const handleViewAnalysis = (insight: Insight) => {
    setActiveInsight((prev) =>
      prev && prev.toolId === insight.toolId && prev.type === insight.type ? null : insight
    );
  };

  const handleClosePanel = () => setActiveInsight(null);

  if (id !== prevId) {
    setPrevId(id);
    setAudit(null);
    setIntelligence(null);
    setLoading(true);
    setError(null);
  }

  async function handleRunReAudit() {
    if (!audit) return;
    setReAuditing(true);
    try {
      const result = await triggerReAudit(audit.auditId);
      // Mark re-audit as owned by this user session (user-scoped, not global)
      localStorage.setItem(getUserScopedKey(`owned_${result.newAuditId}`), 'true');
      if (result.ownerToken) {
        localStorage.setItem(getUserScopedKey(`audit_token_${result.newAuditId}`), result.ownerToken);
      }
      navigate(`/audit/${result.newAuditId}/diff`, { state: { isOwner: true } });
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

  useEffect(() => {
    if (audit) {
      try {
        // Store in user-scoped sessionStorage key so it doesn't leak to other users
        const auditKey = getUserScopedKey('currentAudit');
        sessionStorage.setItem(auditKey, JSON.stringify(audit));
      } catch (err) {
        // ignore storage errors
      }
    }
    if (audit && audit.tools && audit.tools.length > 0) {
      fetchStackIntelligence(audit.tools, audit.useCase || 'coding')
        .then(setIntelligence)
        .catch((err) => console.error('Failed to fetch stack intelligence:', err));
    }
  }, [audit]);

  useEffect(() => {
    if (isOwner && audit && !emailCaptured) {
      const timer = setTimeout(() => setShowEmailModal(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [audit, emailCaptured, isOwner]);

  function copyShareUrl() {
    if (!audit) return;
    navigator.clipboard.writeText(audit.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownloadPDF() {
    if (!audit) return;
    setGeneratingPDF(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      generateAuditPDF(audit);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  }

  /* ── Loading state ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--color-bg-base)' }}>
        <div style={{ borderBottom: '1px solid var(--color-border)', height: '64px', background: 'var(--color-bg-card)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-5">
          <div className="glass-card-static p-8 sm:p-12 space-y-4">
            <div className="skel-block h-3 w-32 mx-auto" />
            <div className="skel-block h-20 w-56 mx-auto" />
            <div className="skel-block h-4 w-52 mx-auto" />
          </div>
          <div className="glass-card-static p-6 space-y-4">
            <div className="skel-block h-4 w-44" />
            <div className="flex items-end gap-4 h-36 pt-4">
              {[70, 50, 35, 55].map((h, i) => (
                <div key={i} className="skel-block flex-1" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Error state ────────────────────────────────────────── */
  if (error || !audit) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg-base)' }}>
        <div className="text-center max-w-sm w-full p-8 rounded-xl border" style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-lg)' }}>
          <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--color-text-heading)' }}>Audit report not resolved</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>{error || 'The requested URL has expired or does not resolve.'}</p>
          <button onClick={() => navigate('/audit')} className="btn-primary w-full py-3 text-xs">Run new audit</button>
        </div>
      </div>
    );
  }

  if (!viewSingle && ((audit.auditVersion ?? 1) > 1 || audit.reAuditOf)) {
    return <ReAuditDiffPage auditId={audit.auditId} isOwner={isOwner} />;
  }

  const rawInsights = audit ? audit.insights : [];
  // Deduplicate All Stack Tools card if duplicate strategy insights exist
  const filteredInsights = rawInsights.filter((insight, index, self) => {
    const isAllStack = insight.toolName === 'All Stack Tools' || insight.toolId === 'all-stack-tools';
    if (!isAllStack) return true;
    return self.findIndex((i) => i.toolName === 'All Stack Tools' || i.toolId === 'all-stack-tools') === index;
  });

  const estimatedMonthlySavings = filteredInsights.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);
  const savingsBreakdown = filteredInsights
    .filter((i) => i.potentialMonthlySaving > 0 && i.toolId !== 'all-stack-tools')
    .map((i) => ({ toolName: i.toolName, saving: i.potentialMonthlySaving }));
  const optimizedMonthlySpend = audit ? audit.totalMonthlySpend - estimatedMonthlySavings : 0;
  const estimatedAnnualSavings = estimatedMonthlySavings * 12;
  const savingsPercentage = audit && audit.totalMonthlySpend > 0
    ? Math.round((estimatedMonthlySavings / audit.totalMonthlySpend) * 100)
    : 0;
  const isAlreadyOptimal = estimatedMonthlySavings <= 0;

  const chartData = [
    { name: 'Current Spend', label: 'Current', value: audit?.totalMonthlySpend || 0, fill: '#94A3B8' },
    { name: 'Projected Spend', label: 'Projected', value: optimizedMonthlySpend || 0, fill: '#3B82F6' },
    { name: 'Monthly Savings', label: 'Savings', value: estimatedMonthlySavings || 0, fill: '#10B981' },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--color-bg-base)' }}>
      {/* ── Navbar ────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="focus:outline-none"
          >
            <Logo asDiv />
          </button>

          <div className="flex items-center gap-2.5">
            <OfferNotificationBell />
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="px-3 py-1.5 rounded border text-xs font-semibold transition-all flex items-center gap-1.5"
              style={{
                background: 'var(--color-success-bg)',
                color: 'var(--color-success-t)',
                borderColor: 'rgba(16,185,129,0.25)',
              }}
            >
              {generatingPDF ? 'Exporting…' : 'Export PDF'}
            </button>
            <button
              onClick={copyShareUrl}
              className="px-3 py-1.5 rounded border text-xs font-semibold transition-all"
              style={{
                background: 'var(--color-bg-surface)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-heading)',
              }}
            >
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>
      </nav>


      {audit?.allVersions && audit.allVersions.length > 1 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
          <div className="timeline-section relative overflow-hidden mb-8" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-5">
              <div className="space-y-1">
                <h3 className="text-[15px] sm:text-[17px] font-bold tracking-[-0.03em] text-[var(--color-text-heading)]">
                  Living Audit History
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Navigate between full audit versions.
                </p>
              </div>
              <button
                onClick={() => navigate(`/audit/${audit.auditId}/diff`, { state: { isOwner } })}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-200/80 bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-600 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-[0_6px_14px_rgba(79,70,229,0.08)]"
              >
                View Changes (Diff)
              </button>
            </div>

            <div className="relative pb-4 pt-1">
              <div className="timeline-connecting-line" style={{ top: '18px', left: '16px', right: '16px' }} />

              <div className="relative z-10 w-full flex items-start justify-between gap-3 px-1 pb-1">
                {audit.allVersions.map((v, idx) => {
                  const isActive = v.auditId === audit.auditId;
                  const isBaseline = v.auditVersion === 1;

                  let dotStyle: React.CSSProperties = { background: 'var(--color-text-muted)' };
                  let ringStyle: React.CSSProperties = {
                    background: 'rgba(255,255,255,0.85)',
                    borderColor: 'rgba(148, 163, 184, 0.7)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
                  };
                  let textColor = 'var(--color-text-heading)';

                  if (isActive) {
                    dotStyle = { background: '#fff' };
                    ringStyle = {
                      background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9))',
                      borderColor: 'rgba(15, 23, 42, 0.65)',
                      boxShadow: '0 0 0 4px rgba(30, 58, 95, 0.10), inset 0 1px 0 rgba(255,255,255,0.15)',
                    };
                    textColor = 'var(--color-primary)';
                  }

                  return (
                    <button
                      key={v.auditId}
                      onClick={() => {
                        if (!isActive) {
                          navigate(`/audit/${v.auditId}?view=single`, { state: { isOwner } });
                        }
                      }}
                      className="timeline-node group flex-1"
                      style={{ opacity: isActive ? 1 : 0.88 }}
                    >
                      <div className="relative flex items-center justify-center">
                        {isActive && (
                          <span className="absolute inline-flex h-7 w-7 rounded-full opacity-20" style={{ background: 'var(--color-primary)' }} />
                        )}
                        <div className="timeline-node-ring" style={ringStyle}>
                          <span className="timeline-node-dot" style={dotStyle} />
                        </div>
                      </div>
                      <div className="timeline-node-label" style={{ top: '26px' }}>
                        <div className="text-[11px] sm:text-[13px] font-bold whitespace-nowrap tracking-[-0.02em]" style={{ color: textColor }}>
                          Version {v.auditVersion || (idx + 1)}{isBaseline ? ' (Baseline)' : ''}
                        </div>
                        <div className="text-[9px] sm:text-[10px] whitespace-nowrap uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
                          {formatRelativeTime(v.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        {/* ── Audited Configuration Badge ──────────────────────────── */}
        {audit && <AuditedConfigurationBadge audit={audit} filteredInsights={filteredInsights} />}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column Area: Savings Chart & Recommendations List */}
          <div className="lg:col-span-8 space-y-6">

            {/* ── Savings / Spend Chart ──────────────────────── */}
            {chartData.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs"
              >
                <span className="text-overline mb-4 block">
                  Savings Breakdown
                </span>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                      <CartesianGrid stroke="#F8FAFC" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#64748B', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#94A3B8', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip content={<SavingsTooltip savingsBreakdown={savingsBreakdown} />} cursor={{ fill: 'rgba(30,58,95,0.02)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.fill}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </m.div>
            )}

            {/* ── Action Line Items ───────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-overline">Optimization Line Items</span>
                <span className="text-xs font-bold text-slate-400 font-mono-financial">{filteredInsights.length} Issues Found</span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredInsights.map((insight, i) => {
                  const insightId = `${insight.toolId}-${insight.type}`;
                  const activeId = activeInsight ? `${activeInsight.toolId}-${activeInsight.type}` : null;
                  return (
                    <InsightCard
                      key={i}
                      insight={insight}
                      index={i}
                      isActive={insightId === activeId}
                      onViewAnalysis={handleViewAnalysis}
                    />
                  );
                })}
              </div>
            </div>

            {/* ── AI Decision Intelligence Platform — Strategic Decision Guidance ──── */}
            {intelligence && (
              <StrategicGuidanceSection
                intelligence={intelligence}
                auditId={audit?.auditId}
              />
            )}




          </div>

          {/* Right Column Area: Sticky KPI Card & Timeline Actions */}
          <div className="lg:col-span-4 sticky-panel space-y-6">

            {/* ── Savings Summary Panel ───────────────────────── */}
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 border border-slate-100 rounded-2xl bg-white text-center flex flex-col items-center justify-center shadow-xs"
            >
              <span className="text-overline mb-3 block">Simulated Savings Result</span>

              {isAlreadyOptimal ? (
                <div className="space-y-2 text-center py-4">
                  <h2 className="text-xl font-bold text-[var(--color-success)]">Optimized Stack</h2>
                  <p className="text-xs text-[var(--color-text-muted)] max-w-xs mx-auto leading-relaxed">
                    Your AI tool stack is optimal. We did not detect any duplicate licenses or overpaid seat counts.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <SavingsCounter amount={estimatedMonthlySavings} />

                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Recovers {formatCurrencyFull(estimatedAnnualSavings)}/yr · <span className="text-[var(--color-success)]">{savingsPercentage}% waste reduction</span>
                  </div>

                  <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 text-xs font-mono-financial text-left bg-slate-50/50">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-[9px] uppercase tracking-wider">Original Spend</span>
                      <span className="font-bold text-slate-700">{formatCurrencyFull(audit.totalMonthlySpend)}/mo</span>
                    </div>
                    <div className="border-t border-slate-200/50 border-dashed" />
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--color-success)] text-[9px] uppercase tracking-wider">Optimized Target</span>
                      <span className="font-bold text-[var(--color-success)]">{formatCurrencyFull(optimizedMonthlySpend)}/mo</span>
                    </div>
                  </div>

                  {/* Audited Config Receipt */}
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Audited Configuration</span>
                    <div className="flex flex-wrap gap-1.5">
                      {/* Billing cycle badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        audit.billingCycle === 'annual'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80'
                          : 'bg-slate-50 text-slate-600 border-slate-200/80'
                      }`}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        <span>{audit.billingCycle === 'annual' ? 'Annual Billing' : 'Monthly Billing'}</span>
                      </span>
                      {/* Optimization goal badge */}
                      {audit.optimizationGoal && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200/80 capitalize">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-rose-500">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                          <span>{audit.optimizationGoal}</span>
                        </span>
                      )}
                      {/* Use case badge */}
                      {audit.useCase && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200/80 capitalize">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-indigo-500">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                          <span>{audit.useCase}</span>
                        </span>
                      )}
                      {/* Tools count */}
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-slate-50 text-slate-600 border-slate-200/80">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-500">
                          <rect width="7" height="7" x="3" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="3" rx="1" />
                          <rect width="7" height="7" x="14" y="14" rx="1" />
                          <rect width="7" height="7" x="3" y="14" rx="1" />
                        </svg>
                        <span>{audit.tools?.length ?? 0} tool{(audit.tools?.length ?? 0) !== 1 ? 's' : ''}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </m.div>


            {/* ── Version & Workspace Actions ─────────────────── */}
            {isOwner && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-slate-100 rounded-2xl bg-white space-y-4 shadow-xs"
              >
                <div className="border-b pb-3 border-slate-100">
                  <span className="text-overline">Living Timeline Options</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage timeline versions and trigger calculations.</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => navigate(`/audit?reAuditOf=${audit.auditId}`)}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
                  >
                    Edit & Re-Audit
                  </button>
                  <button
                    onClick={handleRunReAudit}
                    disabled={reAuditing}
                    className="w-full py-2.5 rounded-xl border border-amber-200/80 bg-amber-100/90 text-amber-900 text-xs font-bold hover:bg-amber-200/80 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {reAuditing ? 'Recalculating…' : 'Refresh Pricing'}
                  </button>
                  <button
                    onClick={() => navigate('/audit')}
                    className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    New Audit
                  </button>
                </div>
              </m.div>
            )}

          </div>

        </div>
      </div>

      {/* ── Intelligence Panel ────────────────────────────── */}
      <ToolIntelligencePanel
        insight={activeInsight}
        auditTools={audit?.tools}
        useCase={audit?.useCase}
        onClose={handleClosePanel}
      />

      {/* ── Save Modal ──────────────────────────────────────── */}
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
