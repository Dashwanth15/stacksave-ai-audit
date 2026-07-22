import { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import type { AuditResult, Insight } from '../types';
import { fetchAudit, captureLead, triggerReAudit } from '../services/api';
import { formatCurrencyFull, insightTypeLabel, formatRelativeTime } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { generateAuditPDF } from '../services/pdfService';
import ReAuditDiffPage from './ReAuditDiffPage';
import Logo from '../components/Logo';

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

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

  return (
    <div
      className="rounded border p-3"
      style={{
        background: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-md)',
        minWidth: 160,
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: 'var(--color-primary)' }}
        />
        <div className="text-xs font-bold text-[var(--color-text-heading)]">
          {name}
        </div>
      </div>
      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Potential Savings</div>
      <div className="text-base font-bold font-mono-financial" style={{ color: 'var(--color-success)' }}>
        {`$${value}/mo`}
      </div>
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

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  // Map severity to premium SaaS priority labels
  const getPriorityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100/50">
            Fix First
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100/50">
            Worth Reviewing
          </span>
        );
      case 'info':
        return (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/50 animate-fade-in">
            Plan Verified
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100/50">
            Optional Optimization
          </span>
        );
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="p-6 sm:p-7 bg-white border border-slate-100 rounded-2xl shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-300"
    >
      <div>
        {/* Top Row: Tool Name + Priority Badge & Potential Savings */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-black text-lg tracking-tight text-slate-800">
                {insight.toolName}
              </h3>
              {getPriorityBadge(insight.severity)}
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              {insight.recommendationType || insightTypeLabel(insight.type)}
            </span>
          </div>
          
          <div className="text-right shrink-0">
            {insight.potentialMonthlySaving > 0 ? (
              <div className="space-y-0.5">
                <span className="text-xl font-black font-mono-financial text-emerald-600 block">
                  Save ${insight.potentialMonthlySaving}/mo
                </span>
                <span className="text-[10px] font-bold text-slate-400 block">
                  ≈ ${insight.potentialMonthlySaving * 12}/year
                </span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-400 italic">No waste</span>
            )}
          </div>
        </div>

        {/* Clear Recommendation Action */}
        <div className="flex items-center gap-2 mb-3 bg-slate-50/50 border border-slate-100/50 rounded-xl px-3.5 py-2 max-w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-extrabold text-xs text-slate-700 tracking-tight">
            {insight.suggestion}
          </span>
        </div>

        {/* Short explanation (max 2 lines) */}
        <p 
          className="text-xs leading-relaxed text-slate-500 mb-4 line-clamp-2 max-w-2xl text-left"
          title={insight.reason}
        >
          {insight.reason}
        </p>

        {/* Expandable View Analysis Link */}
        <div className="mb-4 text-left">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 inline-flex focus:outline-none"
          >
            {expanded ? 'Hide Analysis' : 'View Analysis'}
            <svg 
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
              className={`transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {expanded && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-100/50 space-y-3 text-[11px] text-slate-600 leading-relaxed"
            >
              {insight.confidenceScore !== undefined && (
                <div className="p-3 rounded-xl border border-indigo-100/50 bg-indigo-50/20 mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                    <span>Recommendation Confidence</span>
                    <span className="font-mono-financial text-indigo-600">{insight.confidenceScore}%</span>
                  </div>
                  {insight.confidenceExplanation && insight.confidenceExplanation.length > 0 && (
                    <div className="space-y-1 mt-1 text-[10px] text-indigo-950 font-medium">
                      {insight.confidenceExplanation.map((exp, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-left leading-normal">
                          <span className="text-indigo-500">✓</span>
                          <span>{exp.replace(/^✓\s*/, '')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider block mb-0.5">Current Setup</span>
                  <span className="text-slate-800 font-semibold block">{insight.currentSetup || 'Paid subscription'}</span>
                </div>
                <div>
                  <span className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider block mb-0.5">Recommended Setup</span>
                  <span className="text-slate-800 font-semibold block">{insight.recommendedSetup || insight.suggestion}</span>
                </div>
              </div>
              <div className="border-t border-slate-200/50 my-1" />
              <div>
                <span className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider block mb-0.5">Reason</span>
                <span className="text-slate-700 block">{insight.detailedReason || insight.reason}</span>
              </div>
              {insight.tradeoffs && (
                <>
                  <div className="border-t border-slate-200/50 my-1" />
                  <div>
                    <span className="font-extrabold uppercase text-[9px] text-slate-400 tracking-wider block mb-0.5">Trade-offs</span>
                    <span className="text-slate-700 block">{insight.tradeoffs}</span>
                  </div>
                </>
              )}
              {insight.decisionLog && (
                <>
                  <div className="border-t border-slate-200/50 my-1" />
                  <div className="p-3 rounded-lg border border-slate-200 bg-white/40 shadow-sm space-y-2">
                    <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Strategic Optimization Log</div>
                    <div className="text-[11px] text-slate-700">
                      <div className="flex items-center justify-between text-xs font-semibold mb-2">
                        <span>Baseline Stack Score: <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded font-bold">{insight.decisionLog.baselineScore}</span></span>
                        <span>Optimized Stack Score: <span className="font-mono text-emerald-600 bg-emerald-50 border border-emerald-100/30 px-1.5 py-0.5 rounded font-bold">{insight.decisionLog.finalScore}</span></span>
                      </div>
                      <div className="space-y-1">
                        {insight.decisionLog.proposalsEvaluated.map((prop: any) => {
                          const isSelected = insight.decisionLog?.selectedProposals?.includes(prop.id) || (prop.id === 'keep-current' && insight.decisionLog?.selectedProposals?.length === 0);
                          return (
                            <div key={prop.id} className="flex justify-between items-center text-[10px] border-t border-slate-100/60 pt-1">
                              <span className={isSelected ? "font-bold text-emerald-600 flex items-center gap-1" : prop.isValid ? "text-slate-600" : "text-slate-400 line-through"}>
                                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />}
                                {prop.name}
                              </span>
                              <span className="font-mono font-bold text-slate-700">
                                {prop.isValid ? `Value Score: ${prop.businessValueScore}` : 'Constraint Fail'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </m.div>
          )}
        </div>
      </div>

      {/* Small Footer: Confidence and Productivity Impact */}
      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold border-t border-slate-100/60 pt-3">
        <span className="flex items-center gap-1.5">
          Confidence:
          <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide text-[9px] ${
            insight.confidence === 'High' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100/30' 
              : 'bg-amber-50 text-amber-700 border border-amber-100/30'
          }`}>
            {insight.confidence || 'High'}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          Productivity Impact:
          <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wide text-[9px] ${
            insight.productivityImpact === 'No Impact' 
              ? 'bg-slate-100 text-slate-700' 
              : insight.productivityImpact === 'Minimal Impact'
              ? 'bg-amber-50 text-amber-700 border border-amber-100/30'
              : 'bg-rose-50 text-rose-700 border border-rose-100/30'
          }`}>
            {insight.productivityImpact || 'No Impact'}
          </span>
        </span>
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
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
    (id && localStorage.getItem(`owned_${id}`) === 'true')
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
  const [strategy, setStrategy] = useState<'performance' | 'savings'>('performance');

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
      localStorage.setItem(`owned_${result.newAuditId}`, 'true');
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
      generateAuditPDF(audit, strategy);
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

  const filteredInsights = audit
    ? audit.insights.filter((i) => !i.strategy || i.strategy === strategy || i.strategy === 'both')
    : [];

  const estimatedMonthlySavings = filteredInsights.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);
  const optimizedMonthlySpend = audit ? audit.totalMonthlySpend - estimatedMonthlySavings : 0;
  const estimatedAnnualSavings = estimatedMonthlySavings * 12;
  const savingsPercentage = audit && audit.totalMonthlySpend > 0
    ? Math.round((estimatedMonthlySavings / audit.totalMonthlySpend) * 100)
    : 0;
  const isAlreadyOptimal = estimatedMonthlySavings < 20;

  const chartData = filteredInsights
    .filter((i) => i.potentialMonthlySaving > 0)
    .slice(0, 6)
    .map((i) => ({
      name: i.toolName,
      label: toolAlias(i.toolName),
      saving: i.potentialMonthlySaving,
      severity: i.severity,
    }));

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
          
          <div className="flex items-center gap-2">
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold tracking-tight text-[var(--color-text-heading)]">
                  Living Audit History
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Navigate between full audit versions.
                </p>
              </div>
              <button
                onClick={() => navigate(`/audit/${audit.auditId}/diff`, { state: { isOwner } })}
                className="text-[10px] px-2.5 py-1.5 rounded font-bold uppercase tracking-wider bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition-colors"
              >
                View Changes (Diff)
              </button>
            </div>
            
            <div className="relative flex items-center justify-between pb-6">
              <div className="timeline-connecting-line" style={{ top: '24px' }} />
              
              <div className="relative z-10 w-full flex items-center justify-start gap-10 sm:gap-14 md:gap-16 overflow-x-auto px-1">
                {audit.allVersions.map((v, idx) => {
                  const isActive = v.auditId === audit.auditId;
                  const isBaseline = v.auditVersion === 1;

                  let dotStyle: React.CSSProperties = { background: 'var(--color-text-muted)' };
                  let ringStyle: React.CSSProperties = { background: 'var(--color-bg-card)', borderColor: 'var(--color-border-strong)' };
                  let textColor = 'var(--color-text-muted)';
                  
                  if (isActive) {
                    dotStyle = { background: '#fff' };
                    ringStyle = { background: 'var(--color-primary)', borderColor: 'rgba(30,58,95,0.5)', boxShadow: '0 0 0 3px rgba(30,58,95,0.15)' };
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
                      className="timeline-node group"
                    >
                      <div className="relative flex items-center justify-center">
                        {isActive && (
                          <span className="absolute animate-ping inline-flex h-7 w-7 rounded-full opacity-20" style={{ background: 'var(--color-primary)' }} />
                        )}
                        <div className="timeline-node-ring" style={ringStyle}>
                          <span className="timeline-node-dot" style={dotStyle} />
                        </div>
                      </div>
                      <div className="timeline-node-label" style={{ top: '32px' }}>
                        <div className="text-xs sm:text-sm font-bold whitespace-nowrap" style={{ color: textColor }}>
                          Version {v.auditVersion || (idx + 1)}{isBaseline ? ' (Baseline)' : ''}
                        </div>
                        <div className="text-[10px] sm:text-xs whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column Area: Savings Chart & Recommendations List */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Strategy Toggle Tab Row */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/50 max-w-sm">
              <button
                type="button"
                onClick={() => setStrategy('performance')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all text-center uppercase tracking-wider ${
                  strategy === 'performance'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ⚡ Performance Optimized
              </button>
              <button
                type="button"
                onClick={() => setStrategy('savings')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-extrabold transition-all text-center uppercase tracking-wider ${
                  strategy === 'savings'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                💰 Smart Savings
              </button>
            </div>

            {/* Strategy-Aware AI Consultant Summary */}
            {audit && (
              <m.div
                key={strategy}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs text-left"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: strategy === 'performance' ? 'var(--color-primary)' : 'var(--color-success)' }} />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    {strategy === 'performance' ? 'CTO Executive Briefing' : 'CFO Cost Optimization Summary'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 font-medium italic">
                  "{strategy === 'performance' ? audit.aiSummary : (audit.aiSummarySavings || audit.aiSummary)}"
                </p>
              </m.div>
            )}

            {/* ── Savings Chart ──────────────────────────────── */}
            {chartData.length > 0 && (
              <m.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border border-slate-100 rounded-2xl bg-white shadow-xs"
              >
                <span className="text-overline mb-4 block">Savings Breakdown</span>
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
                      <Tooltip content={<SavingsTooltip />} cursor={{ fill: 'rgba(30,58,95,0.02)' }} />
                      <Bar dataKey="saving" radius={[4, 4, 0, 0]} barSize={28}>
                        {chartData.map((_entry, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
                {filteredInsights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} index={i} />
                ))}
              </div>
            </div>
 
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
                    className="w-full py-2.5 rounded border text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: 'rgba(30,58,95,0.06)',
                      color: 'var(--color-primary)',
                      borderColor: 'rgba(30,58,95,0.2)',
                    }}
                  >
                    Edit & Re-Audit
                  </button>
                  <button
                    onClick={handleRunReAudit}
                    disabled={reAuditing}
                    className="w-full py-2.5 rounded border text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: 'var(--color-warning-bg)',
                      color: 'var(--color-warning-t)',
                      borderColor: 'rgba(217,119,6,0.25)',
                    }}
                  >
                    {reAuditing ? 'Recalculating…' : 'Refresh Pricing'}
                  </button>
                  <button
                    onClick={() => navigate('/audit')}
                    className="w-full py-2.5 rounded border text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    style={{
                      background: 'var(--color-bg-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-heading)',
                    }}
                  >
                    New Audit
                  </button>
                </div>
              </m.div>
            )}

          </div>

        </div>
      </div>

      {/* ── Save Modal ──────────────────────────────────── */}
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
