// ============================================================
// Re-Audit Diff Dashboard — AI Spend Intelligence
// Premium B2B SaaS Change Intelligence Interface
// ============================================================

import { useEffect, useState, useRef } from 'react';
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
import Logo from '../components/Logo';

interface ReAuditDiffPageProps {
  auditId?: string;
  isOwner?: boolean;
}

// ── SVG icon set (restrained enterprise icons, no emojis) ──────
const IconArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const IconChevronDown = ({ size = 12, rotated = false }: { size?: number; rotated?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: rotated ? 'rotate(180deg)' : 'none', transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const IconPlus = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M8 3v10M3 8h10" />
  </svg>
);

const IconMinus = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M3 8h10" />
  </svg>
);

const IconModify = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 12l8-8 3 3-8 8H2v-3z" />
  </svg>
);

const IconSwap = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h10M10 3l3 3-3 3M13 10H3M6 7l-3 3 3 3" />
  </svg>
);

const IconTrendUp = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 11l4-4 3 3 5-5" />
    <path d="M10 5h4v4" />
  </svg>
);

const IconTrendDown = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 5l4 4 3-3 5 5" />
    <path d="M10 11h4V7" />
  </svg>
);

export default function ReAuditDiffPage({ auditId, isOwner: _isOwner }: ReAuditDiffPageProps = {}) {
  const { id: paramId } = useParams<{ id: string }>();
  const id = auditId || paramId;
  const navigate = useNavigate();

  const [data, setData] = useState<ReAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const lastLoadedIdRef = useRef<string | null>(null);
  const recSectionRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!id) return;
    let isMounted = true;
    if (lastLoadedIdRef.current && lastLoadedIdRef.current !== id && compareWith !== 'previous') {
      setCompareWith('previous');
      setData(null);
      setLoading(true);
      return;
    }
    const loadDiff = async () => {
      if (isMounted) setLoading(true);
      try {
        const result = await fetchAuditDiff(id, compareWith);
        if (isMounted) { setData(result); setError(null); lastLoadedIdRef.current = id; }
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : 'Failed to load re-audit details.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (lastLoadedIdRef.current !== id) { setData(null); setError(null); }
    loadDiff();
    return () => { isMounted = false; };
  }, [id, compareWith]);

  // ── Loading Skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="border-b border-slate-200 bg-white" style={{ height: 52 }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
          <div className="rounded-xl bg-white border border-slate-200 p-6 space-y-4">
            <div className="skel-block h-3 w-32 rounded" />
            <div className="skel-block h-8 w-64 rounded" />
            <div className="skel-block h-3 w-96 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="space-y-2 p-3">
                  <div className="skel-block h-2.5 w-16 rounded" />
                  <div className="skel-block h-8 w-24 rounded" />
                  <div className="skel-block h-2.5 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="skel-block h-24 rounded-xl" />
          <div className="skel-block h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error / Not Found ────────────────────────────────────────
  const oldAudit = data?.oldAudit;
  const newAudit = data?.newAudit;
  const diff = data?.diff;
  const allVersions = data?.allVersions;

  if (error || !data || !oldAudit || !newAudit || !diff) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#f8fafc]">
        <div className="text-center max-w-sm w-full p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-900 mb-1">Re-Audit Not Found</h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            {error || 'This comparison link may be invalid. Make sure the audit has been re-audited at least once.'}
          </p>
          <button onClick={() => navigate('/')} className="w-full py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors">
            Go to home
          </button>
        </div>
      </div>
    );
  }

  // ── Data Derivations (preserving 100% existing business logic) ─
  const recommendationDiffs = diff?.recommendationDiffs || [];
  const pricingDiffs = diff?.pricingDiffs || [];
  const savingsDelta = diff?.savingsDelta || 0;
  const spendDelta = (newAudit?.totalMonthlySpend ?? 0) - (oldAudit?.totalMonthlySpend ?? 0);
  const sd = diff?.stackDiff;

  const oldToolCount = sd?.oldToolCount ?? (oldAudit.tools?.length || 0);
  const newToolCount = sd?.newToolCount ?? (newAudit.tools?.length || 0);
  const toolCountDelta = sd?.toolCountDelta ?? (newToolCount - oldToolCount);

  const oldOverlapCount = sd?.oldOverlapCount ?? 0;
  const newOverlapCount = sd?.newOverlapCount ?? 0;
  const overlapCountDelta = sd?.overlapCountDelta ?? (newOverlapCount - oldOverlapCount);

  const oldOptCount = sd?.oldOptCount ?? (oldAudit.insights?.filter(i => i.potentialMonthlySaving > 0).length || 0);
  const newOptCount = sd?.newOptCount ?? (newAudit.insights?.filter(i => i.potentialMonthlySaving > 0).length || 0);
  const optCountDelta = sd?.optCountDelta ?? (newOptCount - oldOptCount);

  const biggestPricingChange = pricingDiffs.length > 0
    ? [...pricingDiffs].sort((a, b) => Math.abs(b.monthlyDelta) - Math.abs(a.monthlyDelta))[0]
    : null;
  const biggestRecChange = recommendationDiffs.length > 0
    ? [...recommendationDiffs].sort((a, b) => Math.abs(b.savingDelta ?? 0) - Math.abs(a.savingDelta ?? 0))[0]
    : null;

  const addedRecs = (recommendationDiffs || []).filter(r => r?.status === 'added');
  const removedRecs = (recommendationDiffs || []).filter(r => r?.status === 'removed');
  const changedRecs = (recommendationDiffs || []).filter(r => r?.status === 'changed');

  const newInsightKeys = new Set((recommendationDiffs || []).map(r => r ? `${r.toolId}:${r.type}` : ''));
  const unchangedInsights = (newAudit?.insights || []).filter(ins => ins && !newInsightKeys.has(`${ins.toolId}:${ins.type}`));

  const hasChanges = recommendationDiffs.length > 0 || pricingDiffs.length > 0 || savingsDelta !== 0;
  const isBaseline = oldAudit?.auditVersion === newAudit?.auditVersion;

  // Dynamic context sentence
  const summaryParts: string[] = [];
  if (sd?.added?.length) summaryParts.push(`${sd.added.length} tool${sd.added.length > 1 ? 's' : ''} added`);
  if (sd?.removed?.length) summaryParts.push(`${sd.removed.length} tool${sd.removed.length > 1 ? 's' : ''} removed`);
  if (sd?.replaced?.length) summaryParts.push(`${sd.replaced.length} replacement${sd.replaced.length > 1 ? 's' : ''}`);
  if (spendDelta > 0) summaryParts.push(`monthly spend increased by ${formatCurrencyFull(spendDelta)}`);
  else if (spendDelta < 0) summaryParts.push(`monthly spend decreased by ${formatCurrencyFull(Math.abs(spendDelta))}`);
  if (savingsDelta > 0) summaryParts.push(`recovery opportunities increased by ${formatCurrencyFull(savingsDelta)}/mo`);
  else if (savingsDelta < 0) summaryParts.push(`recovery opportunities adjusted by -${formatCurrencyFull(Math.abs(savingsDelta))}/mo`);
  if (addedRecs.length) summaryParts.push(`${addedRecs.length} new recommendation${addedRecs.length > 1 ? 's' : ''}`);
  const summaryLine = summaryParts.length > 0 ? summaryParts.join(' · ') : 'No changes detected since the previous audit version.';

  // ── Shared UI Primitives ─────────────────────────────────────
  const SectionHeader = ({
    title,
    badge,
  }: {
    title: string;
    badge?: string;
  }) => (
    <div className="flex items-center justify-between pb-2 pt-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">{title}</h3>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  );

  const StatusDot = ({ status }: { status: 'added' | 'removed' | 'changed' | 'replaced' }) => {
    const config = {
      added: { bg: 'bg-emerald-500', icon: <IconPlus /> },
      removed: { bg: 'bg-rose-500', icon: <IconMinus /> },
      changed: { bg: 'bg-amber-500', icon: <IconModify /> },
      replaced: { bg: 'bg-indigo-500', icon: <IconSwap /> },
    }[status];
    return (
      <span className={`w-4 h-4 rounded-full ${config.bg} text-white flex items-center justify-center shrink-0`}>
        {config.icon}
      </span>
    );
  };

  return (
    <div className="min-h-screen pb-24 bg-[#f8fafc] text-slate-900">

      {/* ── Top App Bar ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="focus:outline-none shrink-0 cursor-pointer">
              <Logo asDiv />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200 min-w-0 text-[11px]">
              <span className="text-slate-400 font-medium">Diff Report</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">
                v{oldAudit?.auditVersion || 1} → v{newAudit?.auditVersion || 2}
              </span>
              {newAudit?.createdAt && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-400">{formatRelativeTime(newAudit.createdAt)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isOwner && (
              <>
                <button
                  onClick={handleRunReAudit}
                  disabled={reAuditing}
                  className="h-7 px-3 text-[11px] font-semibold rounded-md bg-amber-50/80 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  aria-label="Re-Audit"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {reAuditing ? 'Refreshing…' : 'Re-Audit'}
                </button>
                <button
                  onClick={() => navigate(`/audit?reAuditOf=${newAudit?.auditId}`)}
                  className="h-7 px-3 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  aria-label="Edit Stack"
                >
                  Edit Stack
                </button>
              </>
            )}
            <button
              onClick={() => generateReAuditDiffPDF(oldAudit, newAudit, diff)}
              className="h-7 px-3 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              aria-label="Export PDF"
            >
              Export PDF
            </button>
            <button
              onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`, { state: { isOwner } })}
              className="h-7 px-3 text-[11px] font-semibold rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
              aria-label="Full Audit"
            >
              Full Audit →
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 space-y-4">

        {/* ═══════════════════════════════════════════════════════
            1. CHANGE INTELLIGENCE HERO + DOMINANT KPI GRID
            ═══════════════════════════════════════════════════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
        >
          {/* Header Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  AI Stack Evolution
                </span>
                {!isBaseline && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.25 rounded">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Live Diff
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">
                {isBaseline ? 'Baseline Stack Snapshot' : `Version ${oldAudit?.auditVersion || 1} → Version ${newAudit?.auditVersion || 2}`}
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed max-w-2xl pt-0.5">
                {summaryLine}
              </p>
            </div>

            {/* Compare Mode Switcher */}
            {newAudit?.auditVersion && newAudit.auditVersion > 2 && (
              <div className="inline-flex p-0.5 rounded-lg bg-slate-100 border border-slate-200 gap-0.5 shrink-0 self-start">
                <button
                  onClick={() => setCompareWith('previous')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    compareWith === 'previous'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  vs Previous (v{(newAudit.auditVersion ?? 2) - 1})
                </button>
                <button
                  onClick={() => setCompareWith('root')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    compareWith === 'root'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  vs Baseline (v1)
                </button>
              </div>
            )}
          </div>

          {/* 5-KPI Intelligence Grid with Strong Typographic Hierarchy */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">

            {/* 1. POTENTIAL SAVINGS (PRIMARY ACTIONABLE METRIC) */}
            <div className="p-4 sm:p-5 bg-emerald-50/40 relative col-span-2 sm:col-span-1 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-800 block">
                Potential Savings
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-mono line-through tabular-nums">
                  {formatCurrencyFull(oldAudit?.estimatedMonthlySavings ?? 0)}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight tabular-nums leading-none">
                  {formatCurrencyFull(newAudit?.estimatedMonthlySavings ?? 0)}
                </span>
              </div>
              <div className="pt-1">
                {savingsDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">Steady</span>
                ) : (
                  <span className={`text-[11px] font-bold font-mono inline-flex items-center gap-0.5 ${savingsDelta > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {savingsDelta > 0 ? '↑ +' : '↓ -'}{formatCurrencyFull(Math.abs(savingsDelta))}/mo recovery
                  </span>
                )}
              </div>
              {savingsDelta > 0 && (
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500" />
              )}
            </div>

            {/* 2. MONTHLY SPEND (PRIMARY FINANCIAL METRIC) */}
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 block">
                Monthly Spend
              </span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-mono line-through tabular-nums">
                  {formatCurrencyFull(oldAudit?.totalMonthlySpend ?? 0)}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums leading-none">
                  {formatCurrencyFull(newAudit?.totalMonthlySpend ?? 0)}
                </span>
              </div>
              <div className="pt-1">
                {spendDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">No change</span>
                ) : (
                  <span className={`text-[11px] font-bold font-mono inline-flex items-center gap-0.5 ${spendDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {spendDelta > 0 ? <IconTrendUp /> : <IconTrendDown />}
                    {spendDelta > 0 ? '+' : ''}{formatCurrencyFull(spendDelta)}/mo
                  </span>
                )}
              </div>
            </div>

            {/* 3. TOTAL TOOLS (SECONDARY) */}
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 block">
                Total Tools
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-mono line-through tabular-nums">
                  {oldToolCount}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums leading-none">
                  {newToolCount}
                </span>
              </div>
              <div className="pt-1">
                {toolCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">No change</span>
                ) : (
                  <span className="text-[11px] font-bold font-mono text-slate-700">
                    {toolCountDelta > 0 ? `+${toolCountDelta}` : toolCountDelta} tool{Math.abs(toolCountDelta) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* 4. OPPORTUNITIES (SECONDARY) */}
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 block">
                Opportunities
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-mono line-through tabular-nums">
                  {oldOptCount}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums leading-none">
                  {newOptCount}
                </span>
              </div>
              <div className="pt-1">
                {optCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">No change</span>
                ) : (
                  <span className="text-[11px] font-bold font-mono text-emerald-700">
                    {optCountDelta > 0 ? `+${optCountDelta}` : optCountDelta} actionable
                  </span>
                )}
              </div>
            </div>

            {/* 5. REDUNDANCIES (SECONDARY) */}
            <div className="p-4 sm:p-5 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 block">
                Redundancies
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {oldOverlapCount}
                </span>
                <span className="text-xs text-slate-300">→</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight tabular-nums leading-none">
                  {newOverlapCount}
                </span>
              </div>
              <div className="pt-1">
                {overlapCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">No change</span>
                ) : (
                  <span className={`text-[11px] font-bold font-mono ${overlapCountDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {overlapCountDelta > 0 ? `+${overlapCountDelta}` : overlapCountDelta} overlap{Math.abs(overlapCountDelta) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Drivers (Contextual Intelligence Strip) */}
          <div className="border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50">
            {/* Pricing Driver */}
            <div className="p-4 sm:p-5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block">
                Key Pricing Driver
              </span>
              {biggestPricingChange ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{biggestPricingChange.toolName}</span>
                    <span className={`text-[11px] font-bold font-mono tabular-nums ${biggestPricingChange.monthlyDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {biggestPricingChange.monthlyDelta > 0 ? '+' : ''}{formatCurrencyFull(biggestPricingChange.monthlyDelta)}/mo
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {biggestPricingChange.planLabel} plan rate updated from{' '}
                    <span className="line-through text-slate-400">{formatCurrencyFull(biggestPricingChange.oldMonthlyPrice)}</span> to{' '}
                    <span className="font-semibold text-slate-700">{formatCurrencyFull(biggestPricingChange.newMonthlyPrice)}/mo</span>.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-slate-700">No vendor pricing changes detected</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Spend movements are driven by stack configuration adjustments rather than vendor catalog changes.
                  </p>
                </div>
              )}
            </div>

            {/* Recommendation Driver */}
            <div className="p-4 sm:p-5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block">
                Key Recommendation Driver
              </span>
              {biggestRecChange ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{biggestRecChange.toolName}</span>
                    {(biggestRecChange.savingDelta ?? 0) > 0 && (
                      <span className="text-[11px] font-bold font-mono text-emerald-700 tabular-nums">
                        +{formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}/mo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {biggestRecChange.status === 'added' ? (
                      <>
                        New optimization opportunity discovered with potential recovery of{' '}
                        <span className="font-semibold text-emerald-700">+{formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}/mo</span>.
                      </>
                    ) : biggestRecChange.status === 'removed' ? (
                      <>Prior recommendation resolved or no longer applicable.</>
                    ) : (
                      <>Optimization potential revised across versions.</>
                    )}
                  </p>
                  <button
                    onClick={() => recSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    Review recommendation <IconArrowRight size={11} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Recommendation set remained steady across this version.</p>
              )}
            </div>
          </div>
        </m.div>

        {/* ═══════════════════════════════════════════════════════
            2. LIVING AUDIT TIMELINE
            ═══════════════════════════════════════════════════════ */}
        {allVersions && allVersions.length > 1 && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-slate-800">Living Audit History</h3>
                <span className="text-[11px] text-slate-400 font-medium">({allVersions.length} versions tracked)</span>
              </div>
              <button
                onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`, { state: { isOwner } })}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                View Full Audit Graph →
              </button>
            </div>

            {/* Timeline Track */}
            <div className="relative pt-2 pb-1">
              <div className="absolute top-[20px] left-4 right-4 h-0.5 bg-slate-200 z-0" />
              <div className="relative z-10 flex items-center gap-8 sm:gap-12 overflow-x-auto px-2 py-1">
                {allVersions.map((v, idx) => {
                  const isNew = v.auditId === newAudit?.auditId;
                  const isOld = v.auditId === oldAudit?.auditId;
                  const isSame = oldAudit?.auditId === newAudit?.auditId;

                  let nodeBg = 'bg-slate-200 text-slate-600';
                  let ring = 'ring-2 ring-white';
                  let badge = '';

                  if (isSame && isNew) {
                    nodeBg = 'bg-indigo-600 text-white';
                    ring = 'ring-4 ring-indigo-100';
                    badge = 'Baseline';
                  } else if (isNew) {
                    nodeBg = 'bg-emerald-600 text-white';
                    ring = 'ring-4 ring-emerald-100';
                    badge = 'After';
                  } else if (isOld) {
                    nodeBg = 'bg-amber-500 text-white';
                    ring = 'ring-4 ring-amber-100';
                    badge = 'Before';
                  }

                  return (
                    <button
                      key={v.auditId}
                      onClick={() => navigate(`/audit/${v.auditId}?view=single`, { state: { isOwner } })}
                      className="group flex flex-col items-center shrink-0 cursor-pointer focus:outline-none"
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-110 ${nodeBg} ${ring}`}>
                        {v.auditVersion || (idx + 1)}
                      </div>
                      <div className="mt-2 text-center">
                        <span className={`text-[11px] font-bold block leading-tight ${isNew ? 'text-slate-900' : 'text-slate-600'}`}>
                          v{v.auditVersion || (idx + 1)} {badge && <span className="text-[10px] text-slate-400 font-semibold">({badge})</span>}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {formatRelativeTime(v.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </m.div>
        )}

        {/* ── Baseline / Up-to-date banner ───────────────────────── */}
        {isBaseline ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center space-y-3 shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Baseline Snapshot</span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">Initial Audit Version Recorded</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Total monthly outlay is <span className="font-semibold text-slate-900">{formatCurrencyFull(newAudit.totalMonthlySpend)}</span> with{' '}
                <span className="font-bold text-emerald-600">{formatCurrencyFull(newAudit.estimatedMonthlySavings)}/mo</span> in potential recovery.
              </p>
            </div>
            {isOwner && (
              <button
                onClick={handleRunReAudit}
                disabled={reAuditing}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {reAuditing ? 'Recalculating…' : 'Run Pricing Re-Audit Now →'}
              </button>
            )}
          </div>
        ) : !hasChanges ? (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 text-sm font-bold">
              ✓
            </div>
            <h3 className="text-sm font-bold text-slate-900">Audit Fully Up to Date</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No tool pricing changes or new recommendations were detected in this re-audit version.
            </p>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════
            3. WHAT CHANGED (ACTIVITY FEED)
            ═══════════════════════════════════════════════════════ */}
        {sd && sd.summaries && sd.summaries.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
          >
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Change Activity Feed
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {sd.summaries.length} event{sd.summaries.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {sd.summaries.map((s, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-start gap-3 hover:bg-slate-50/70 transition-colors group"
                >
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono flex items-center justify-center">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {s}
                  </p>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            4. STACK COMPONENT CHANGES (CHANGE LEDGER)
            ═══════════════════════════════════════════════════════ */}
        {sd && (sd.added.length > 0 || sd.removed.length > 0 || sd.replaced.length > 0 || sd.changed.length > 0) && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="space-y-3"
          >
            <SectionHeader title="Stack Component Changes" />

            {/* Replacements (Before → After Split Card) */}
            {sd.replaced.length > 0 && (
              <div className="space-y-2">
                {sd.replaced.map((rep) => (
                  <div
                    key={`${rep.removedToolId}->${rep.addedToolId}`}
                    className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-xs"
                  >
                    <div className="px-4 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusDot status="replaced" />
                        <span className="text-xs font-bold text-indigo-950">Tool Replacement</span>
                      </div>
                      {rep.addedSpend !== rep.removedSpend && (
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          rep.addedSpend < rep.removedSpend ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rep.addedSpend < rep.removedSpend ? '↓ Saves' : '↑ Increases'} ${Math.abs(rep.addedSpend - rep.removedSpend).toFixed(0)}/mo
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-[1fr_32px_1fr] items-center gap-2 p-4">
                      <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-500 block">Before</span>
                        <p className="font-bold text-xs text-rose-900 line-through">{rep.removedToolName}</p>
                        <p className="text-[11px] text-slate-500">{rep.removedPlanLabel} Plan</p>
                        <p className="text-xs font-mono font-bold text-rose-700/80 mt-1">${rep.removedSpend.toFixed(0)}/mo</p>
                      </div>
                      <div className="flex justify-center text-slate-300">
                        <IconArrowRight size={16} />
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 space-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 block">After</span>
                        <p className="font-bold text-xs text-emerald-900">{rep.addedToolName}</p>
                        <p className="text-[11px] text-slate-500">{rep.addedPlanLabel} Plan</p>
                        <p className="text-xs font-mono font-bold text-emerald-700 mt-1">${rep.addedSpend.toFixed(0)}/mo</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Added / Removed / Modified Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {/* Added items */}
              {sd.added.map((tool) => (
                <div
                  key={tool.toolId}
                  className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusDot status="added" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{tool.toolName}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.25 rounded">
                          Added
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {tool.planLabel} Plan · {tool.seats} seat{tool.seats !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-mono text-emerald-700 shrink-0">
                    +${tool.monthlySpend.toFixed(0)}/mo
                  </span>
                </div>
              ))}

              {/* Removed items */}
              {sd.removed.map((tool) => (
                <div
                  key={tool.toolId}
                  className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusDot status="removed" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-400 line-through">{tool.toolName}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.25 rounded">
                          Removed
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {tool.planLabel} Plan · {tool.seats} seat{tool.seats !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold font-mono text-rose-500/70 line-through shrink-0">
                    ${tool.monthlySpend.toFixed(0)}/mo
                  </span>
                </div>
              ))}

              {/* Modified items */}
              {sd.changed.map((tool) => (
                <div
                  key={tool.toolId}
                  className="px-4 py-3.5 hover:bg-slate-50/70 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusDot status="changed" />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{tool.toolName}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.25 rounded">
                          Modified
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-xs">
                      <span className="text-slate-400 line-through">${tool.oldSpend.toFixed(0)}</span>
                      <span className="text-slate-300">→</span>
                      <span className="font-bold text-slate-900">${tool.newSpend.toFixed(0)}/mo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-7 text-[11px] text-slate-500">
                    {tool.oldPlanId !== tool.newPlanId && (
                      <span>
                        Plan: <span className="line-through text-slate-400">{tool.oldPlanLabel}</span> → <span className="font-semibold text-slate-800">{tool.newPlanLabel}</span>
                      </span>
                    )}
                    {tool.oldSeats !== tool.newSeats && (
                      <span>
                        Seats: <span className="line-through text-slate-400">{tool.oldSeats}</span> → <span className="font-semibold text-slate-800">{tool.newSeats}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            5. PRICING MODEL ADJUSTMENTS
            ═══════════════════════════════════════════════════════ */}
        {pricingDiffs.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.12 }}
            className="space-y-3"
          >
            <SectionHeader title={`Pricing Model Adjustments (${pricingDiffs.length})`} />
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {pricingDiffs.map((pDiff, idx) => (
                <div
                  key={`${pDiff.toolId}-${pDiff.planId}-${idx}`}
                  className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-1 h-8 rounded-full shrink-0 ${pDiff.monthlyDelta > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{pDiff.toolName}</span>
                        <span className="text-[11px] text-slate-500">{pDiff.planLabel} Plan</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <span className="line-through text-slate-400 font-mono">{formatCurrencyFull(pDiff.oldMonthlyPrice)}/mo</span>
                        <span className="text-slate-300">→</span>
                        <span className="font-bold font-mono text-slate-800">{formatCurrencyFull(pDiff.newMonthlyPrice)}/mo</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold font-mono tabular-nums shrink-0 ${pDiff.monthlyDelta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {pDiff.monthlyDelta > 0 ? '+' : ''}{formatCurrencyFull(pDiff.monthlyDelta)}/mo
                  </span>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            6. ACTIONABLE RECOMMENDATION INTELLIGENCE
            ═══════════════════════════════════════════════════════ */}
        {recommendationDiffs.length > 0 && (
          <m.div
            ref={recSectionRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.14 }}
            className="space-y-4"
          >
            <SectionHeader title="Recommendation Intelligence" />

            {/* ── NEW OPPORTUNITIES DISCOVERED ───────────────────── */}
            {addedRecs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      New Opportunities Identified
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {addedRecs.length} New in v{newAudit?.auditVersion || 2}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {addedRecs.map((diffItem, i) => {
                    const saving = diffItem.newInsight?.potentialMonthlySaving ?? 0;
                    return (
                      <div
                        key={`added-${diffItem.toolId}-${i}`}
                        className="bg-white border border-slate-200 hover:border-emerald-300 rounded-xl overflow-hidden shadow-xs hover:shadow-sm transition-all group"
                      >
                        {/* Top Header Bar with Integrated Financial Metric */}
                        <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/70 to-white">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {diffItem.toolName}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                              {insightTypeLabel(diffItem.newInsight?.type || '')}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              + Added in v{newAudit?.auditVersion || 2}
                            </span>
                          </div>

                          {saving > 0 ? (
                            <div className="text-right shrink-0">
                              <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Recovery:</span>
                                <span className="text-base sm:text-lg font-black font-mono text-emerald-700 tracking-tight tabular-nums">
                                  +{formatCurrencyFull(saving)}<span className="text-xs font-bold text-emerald-600">/mo</span>
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-emerald-600/80 block">
                                +{formatCurrencyFull(saving * 12)}/year potential
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                              Optimal Tier Verified
                            </span>
                          )}
                        </div>

                        {/* Narrative Content */}
                        <div className="p-4 sm:p-5 space-y-3">
                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            {diffItem.newInsight?.message}
                          </p>

                          {/* Action Rail */}
                          {diffItem.newInsight?.suggestion && (
                            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 shrink-0">
                                  Recommended Action:
                                </span>
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {diffItem.newInsight.suggestion}
                                </span>
                              </div>

                              <button
                                onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`, { state: { isOwner } })}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 self-start sm:self-auto shrink-0 cursor-pointer"
                              >
                                View Tool Details <IconArrowRight size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REVISED / MODIFIED RECOMMENDATIONS ─────────────── */}
            {changedRecs.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Revised Recommendations
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {changedRecs.length} Modified
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {changedRecs.map((diffItem, i) => {
                    const oldSaving = diffItem.oldInsight?.potentialMonthlySaving ?? 0;
                    const newSaving = diffItem.newInsight?.potentialMonthlySaving ?? 0;
                    const savingDelta = diffItem.savingDelta ?? (newSaving - oldSaving);

                    return (
                      <div
                        key={`changed-${diffItem.toolId}-${i}`}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
                      >
                        {/* Header */}
                        <div className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                              {diffItem.toolName}
                            </h4>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                              {insightTypeLabel(diffItem.newInsight?.type || '')}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.25 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Modified in v{newAudit?.auditVersion || 2}
                            </span>
                          </div>

                          {savingDelta !== 0 && (
                            <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-md border ${
                              savingDelta > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {savingDelta > 0 ? '↑ +' : '↓ '}{formatCurrencyFull(savingDelta)}/mo delta
                            </span>
                          )}
                        </div>

                        {/* Side-by-Side Diff Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                          {/* Left: Original (v1) */}
                          <div className="p-4 sm:p-5 space-y-2 bg-slate-50/30">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Baseline (v{oldAudit?.auditVersion || 1})
                              </span>
                              <span className="text-xs font-mono font-semibold text-slate-500 tabular-nums">
                                {formatCurrencyFull(oldSaving)}/mo
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {diffItem.oldInsight?.message}
                            </p>
                            {diffItem.oldInsight?.suggestion && (
                              <div className="text-[11px] text-slate-500 pt-1">
                                <span className="font-semibold text-slate-600">Action:</span> {diffItem.oldInsight.suggestion}
                              </div>
                            )}
                          </div>

                          {/* Right: Updated (v2) */}
                          <div className="p-4 sm:p-5 space-y-2 bg-indigo-50/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-700">
                                Updated (v{newAudit?.auditVersion || 2})
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                                {formatCurrencyFull(newSaving)}/mo
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 font-medium leading-relaxed">
                              {diffItem.newInsight?.message}
                            </p>
                            {diffItem.newInsight?.suggestion && (
                              <div className="text-[11px] text-indigo-950 font-semibold pt-1">
                                <span className="text-indigo-600 font-bold">Updated Action:</span> {diffItem.newInsight.suggestion}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REMOVED RECOMMENDATIONS ────────────────────────── */}
            {removedRecs.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                      Recommendations Resolved / Removed
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      {removedRecs.length} Resolved
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {removedRecs.map((diffItem, i) => (
                    <div
                      key={`removed-${diffItem.toolId}-${i}`}
                      className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-400 line-through">
                            {diffItem.toolName}
                          </h4>
                          <span className="text-[10px] text-slate-400">· {insightTypeLabel(diffItem.oldInsight?.type || '')}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.25 rounded">
                            Resolved
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {diffItem.oldInsight?.message}
                        </p>
                      </div>
                      {diffItem.oldInsight && diffItem.oldInsight.potentialMonthlySaving > 0 && (
                        <div className="text-right shrink-0">
                          <span className="text-[9px] text-slate-400 block">Prior Recovery</span>
                          <span className="text-xs font-mono font-semibold text-slate-400 line-through">
                            {formatCurrencyFull(diffItem.oldInsight.potentialMonthlySaving)}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            7. UNCHANGED RECOMMENDATIONS (PREMIUM LEDGER TABLE)
            ═══════════════════════════════════════════════════════ */}
        {unchangedInsights.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {/* Header Accordion Bar */}
            <button
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="w-full p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors cursor-pointer group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    Unchanged Recommendations
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                    {unchangedInsights.length} Active
                  </span>
                  {unchangedInsights.reduce((sum, ins) => sum + (ins.potentialMonthlySaving || 0), 0) > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      +{formatCurrencyFull(unchangedInsights.reduce((sum, ins) => sum + (ins.potentialMonthlySaving || 0), 0))}/mo steady recovery
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  These optimization opportunities remain active and consistent with your previous audit baseline.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {showUnchanged ? 'Hide Details' : `View ${unchangedInsights.length} Unchanged`}
                </span>
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                  <IconChevronDown rotated={showUnchanged} size={13} />
                </span>
              </div>
            </button>

            {/* Structured Table View */}
            <AnimatePresence>
              {showUnchanged && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-slate-200"
                >
                  {/* Table Header Row */}
                  <div className="hidden sm:grid sm:grid-cols-[160px_1fr_110px_130px] gap-4 px-5 py-2.5 bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                    <div>Tool & Category</div>
                    <div>Optimization & Action</div>
                    <div className="text-center">Severity</div>
                    <div className="text-right">Monthly Recovery</div>
                  </div>

                  {/* Table Rows */}
                  <div className="divide-y divide-slate-100">
                    {unchangedInsights.map((insight) => {
                      const sev = insight.severity;
                      const sevConfig = {
                        high: { dot: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' },
                        medium: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
                        low: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
                        info: { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
                      }[sev || 'low'] || { dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600 border-slate-200' };

                      const saving = insight.potentialMonthlySaving || 0;

                      return (
                        <div
                          key={`${insight.toolId}-${insight.type}`}
                          className="p-4 sm:px-5 sm:py-4 hover:bg-slate-50/80 transition-colors grid grid-cols-1 sm:grid-cols-[160px_1fr_110px_130px] gap-3 sm:gap-4 items-start"
                        >
                          {/* Col 1: Tool & Category */}
                          <div className="space-y-1">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                              {insight.toolName}
                            </h4>
                            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                              {insightTypeLabel(insight.type)}
                            </span>
                          </div>

                          {/* Col 2: Optimization Insight & Action */}
                          <div className="space-y-2 min-w-0">
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {insight.message}
                            </p>
                            {insight.suggestion && (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-xs font-semibold max-w-full">
                                <span className="text-indigo-600 font-bold shrink-0">→</span>
                                <span className="truncate">{insight.suggestion}</span>
                              </div>
                            )}
                          </div>

                          {/* Col 3: Severity */}
                          <div className="flex sm:justify-center items-center">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded border ${sevConfig.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`} />
                              {severityLabel(sev)}
                            </span>
                          </div>

                          {/* Col 4: Recovery Amount */}
                          <div className="sm:text-right flex sm:flex-col justify-between items-baseline sm:items-end">
                            {saving > 0 ? (
                              <div className="space-y-0.5">
                                <span className="text-sm sm:text-base font-black font-mono text-emerald-700 tracking-tight block">
                                  +{formatCurrencyFull(saving)}/mo
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600/80 block">
                                  +{formatCurrencyFull(saving * 12)}/yr
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">
                                Plan Verified
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            8. NEXT ACTIONS — COMMAND CENTER
            ═══════════════════════════════════════════════════════ */}
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.16 }}
          className="space-y-3"
        >
          <SectionHeader title="Next Actions" />

          <div className={`grid grid-cols-1 ${isOwner ? 'sm:grid-cols-2' : ''} gap-3`}>
            {/* PRIMARY: Continue Audit */}
            {isOwner && (
              <div className="p-5 rounded-xl bg-slate-900 text-white flex flex-col justify-between space-y-4 shadow-sm group">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">
                      Continue Audit · v{(newAudit?.auditVersion ?? 1) + 1}
                    </span>
                    <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-slate-300 group-hover:translate-x-0.5 transition-transform">
                      <IconArrowRight size={11} />
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">Re-Audit Existing Stack</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Refreshes catalog pricing and appends version <span className="font-bold text-white">v{(newAudit?.auditVersion ?? 1) + 1}</span> to this living audit timeline.
                  </p>
                </div>
                <button
                  onClick={handleRunReAudit}
                  disabled={reAuditing}
                  className="w-full py-2.5 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  aria-label="Re-Audit Existing Stack"
                >
                  {reAuditing ? 'Recalculating…' : 'Re-Audit Existing Stack →'}
                </button>
              </div>
            )}

            {/* SECONDARY: Start Fresh */}
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs group">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">
                    Fresh Start · v1
                  </span>
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:translate-x-0.5 transition-transform">
                    <IconArrowRight size={11} />
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">Start New Independent Audit</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Start an independent audit from scratch (<span className="font-bold text-slate-700">v1</span>) without modifying this audit's history.
                </p>
              </div>
              <button
                onClick={() => navigate('/audit')}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors text-center cursor-pointer"
                aria-label="Start New Independent Audit"
              >
                Start New Independent Audit →
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 text-xs">
            {isOwner && (
              <button
                onClick={() => navigate(`/audit?reAuditOf=${newAudit?.auditId}`)}
                className="font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Edit stack composition →
              </button>
            )}
            <button
              onClick={() => navigate(`/audit/${newAudit?.auditId || ''}?view=single`)}
              className="font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer ml-auto"
            >
              ← Back to Results Dashboard
            </button>
          </div>
        </m.div>

      </main>
    </div>
  );
}
