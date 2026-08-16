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

// ── Tool Logos Map ──────────────────────────────────────────
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

function ToolLogoBadge({
  toolId,
  toolName,
  size = 'md',
}: {
  toolId: string;
  toolName: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const logoSrc = toolLogoMap[toolId.toLowerCase()];
  const dim =
    size === 'sm'
      ? 'w-8 h-8 p-1.5'
      : size === 'lg'
      ? 'w-11 h-11 p-2'
      : 'w-9 h-9 p-1.5';

  return (
    <div
      className={`${dim} rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-2xs`}
    >
      {logoSrc ? (
        <img src={logoSrc} alt="" className="w-full h-full object-contain" />
      ) : (
        <span className="text-slate-800 font-black text-xs">
          {toolName.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ── SVG icon set ─────────────────────────────────────────────
const IconArrowRight = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const IconChevronDown = ({
  size = 12,
  rotated = false,
}: {
  size?: number;
  rotated?: boolean;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{
      transform: rotated ? 'rotate(180deg)' : 'none',
      transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    }}
  >
    <path d="M4 6l4 4 4-4" />
  </svg>
);

const IconTrendUp = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 11l4-4 3 3 5-5" />
    <path d="M10 5h4v4" />
  </svg>
);

const IconTrendDown = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 5l4 4 3-3 5 5" />
    <path d="M10 11h4V7" />
  </svg>
);

// ── Executive Keyword Highlighting ───────────────────────────
function formatHighlightedDiffText(text: string) {
  if (!text) return null;

  const regex =
    /(\$[\d,]+(?:\/(?:mo|month|year|yr|user\/month|user))?|\b\d+%\b|\bChatGPT\s+(?:Plus|Go|Pro|Team|Enterprise)\b|\bCursor\s+(?:Pro|Business|Enterprise)\b|\bClaude\s+(?:Pro|Team|Enterprise)\b|\bOpenAI\s+API\b|\bAnthropic\s+API\b|\bGoogle\s+AI\s+Plus\b|\bGitHub\s+Copilot\s+(?:Business|Enterprise|Individual)\b|\bGPT-5\.5\s+Thinking\b|\bPay-as-you-go\b|\bover-paying\b|\bnot\s+fully\s+utilize\b|\breduces\s+monthly\s+seat\s+costs\b|\bsaving\s+\$[\d,]+(?:\/mo)?\b|\bannual\s+billing\b|\bannual\s+contract\b|\bdeep\s+research\b|\bpriority\s+access\b|\bcorrectly\s+configured\b|\bOptimal\s+tier\b)/gi;

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;

        // Currency amounts, percentages, and savings -> Crisp monospace bold emerald
        if (
          /^\$[\d,]+/i.test(part) ||
          /^\d+%/i.test(part) ||
          /^saving\s+\$/i.test(part)
        ) {
          return (
            <span
              key={i}
              className="font-extrabold text-emerald-700 font-mono"
            >
              {part}
            </span>
          );
        }

        // Tool and tier names -> High-contrast bold slate-950
        if (
          /^(?:ChatGPT|Cursor|Claude|OpenAI|Anthropic|Google|GitHub|GPT-5\.5|Pay-as-you-go)/i.test(
            part
          )
        ) {
          return (
            <span
              key={i}
              className="font-extrabold text-slate-900"
            >
              {part}
            </span>
          );
        }

        // Optimization trigger terms -> Bold slate emphasis
        if (
          /^(?:over-paying|not\s+fully\s+utilize|reduces\s+monthly|annual|deep\s+research|priority\s+access|correctly\s+configured|Optimal)/i.test(
            part
          )
        ) {
          return (
            <span key={i} className="font-bold text-slate-900">
              {part}
            </span>
          );
        }

        return part;
      })}
    </>
  );
}

export default function ReAuditDiffPage({
  auditId,
  isOwner: _isOwner,
}: ReAuditDiffPageProps = {}) {
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
    if (
      lastLoadedIdRef.current &&
      lastLoadedIdRef.current !== id &&
      compareWith !== 'previous'
    ) {
      setCompareWith('previous');
      setData(null);
      setLoading(true);
      return;
    }
    const loadDiff = async () => {
      if (isMounted) setLoading(true);
      try {
        const result = await fetchAuditDiff(id, compareWith);
        if (isMounted) {
          setData(result);
          setError(null);
          lastLoadedIdRef.current = id;
        }
      } catch (err) {
        if (isMounted)
          setError(
            err instanceof Error ? err.message : 'Failed to load re-audit details.'
          );
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (lastLoadedIdRef.current !== id) {
      setData(null);
      setError(null);
    }
    loadDiff();
    return () => {
      isMounted = false;
    };
  }, [id, compareWith]);

  // ── Loading Skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="border-b border-slate-200 bg-white" style={{ height: 56 }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="skel-block h-3 w-32 rounded" />
            <div className="skel-block h-8 w-64 rounded" />
            <div className="skel-block h-3 w-96 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2 p-3">
                  <div className="skel-block h-2.5 w-16 rounded" />
                  <div className="skel-block h-8 w-24 rounded" />
                  <div className="skel-block h-2.5 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="skel-block h-24 rounded-2xl" />
          <div className="skel-block h-48 rounded-2xl" />
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
        <div className="text-center max-w-sm w-full p-8 rounded-2xl bg-white border border-slate-200 shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <h2 className="text-base font-extrabold text-slate-900 mb-1">
            Re-Audit Not Found
          </h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            {error ||
              'This comparison link may be invalid. Make sure the audit has been re-audited at least once.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Data Derivations ──────────────────────────────────────────
  // Filter out phantom all-stack-tools from recommendation diffs
  const rawRecommendationDiffs = diff?.recommendationDiffs || [];
  const recommendationDiffs = rawRecommendationDiffs.filter(
    (r) =>
      r &&
      r.toolId !== 'all-stack-tools' &&
      r.toolName !== 'All Stack Tools' &&
      r.oldInsight?.toolId !== 'all-stack-tools' &&
      r.newInsight?.toolId !== 'all-stack-tools'
  );

  const pricingDiffs = diff?.pricingDiffs || [];
  const savingsDelta = diff?.savingsDelta || 0;
  const spendDelta =
    (newAudit?.totalMonthlySpend ?? 0) - (oldAudit?.totalMonthlySpend ?? 0);
  const sd = diff?.stackDiff;

  const oldToolCount = sd?.oldToolCount ?? (oldAudit.tools?.length || 0);
  const newToolCount = sd?.newToolCount ?? (newAudit.tools?.length || 0);
  const toolCountDelta = sd?.toolCountDelta ?? (newToolCount - oldToolCount);

  const oldOverlapCount = sd?.oldOverlapCount ?? 0;
  const newOverlapCount = sd?.newOverlapCount ?? 0;
  const overlapCountDelta =
    sd?.overlapCountDelta ?? (newOverlapCount - oldOverlapCount);

  const oldOptCount =
    sd?.oldOptCount ??
    (oldAudit.insights?.filter((i) => i.potentialMonthlySaving > 0).length || 0);
  const newOptCount =
    sd?.newOptCount ??
    (newAudit.insights?.filter((i) => i.potentialMonthlySaving > 0).length || 0);
  const optCountDelta = sd?.optCountDelta ?? (newOptCount - oldOptCount);

  const biggestPricingChange =
    pricingDiffs.length > 0
      ? [...pricingDiffs].sort(
          (a, b) => Math.abs(b.monthlyDelta) - Math.abs(a.monthlyDelta)
        )[0]
      : null;
  const biggestRecChange =
    recommendationDiffs.length > 0
      ? [...recommendationDiffs].sort(
          (a, b) =>
            Math.abs(b.savingDelta ?? 0) - Math.abs(a.savingDelta ?? 0)
        )[0]
      : null;

  // Decommissioned tool IDs set to avoid duplicating deleted tools as "Resolved Recommendations"
  const decommissionedToolIds = new Set(
    (sd?.removed || []).map((t) => t.toolId.toLowerCase())
  );

  const addedRecs = (recommendationDiffs || []).filter((r) => r?.status === 'added');
  const changedRecs = (recommendationDiffs || []).filter(
    (r) => r?.status === 'changed'
  );

  // Genuinely resolved recommendations: tools that were NOT decommissioned, with actual savings > 0, and non-boilerplate
  const resolvedRecs = (recommendationDiffs || []).filter(
    (r) =>
      r?.status === 'removed' &&
      !decommissionedToolIds.has(r.toolId.toLowerCase()) &&
      (r.oldInsight?.potentialMonthlySaving ?? 0) > 0 &&
      r.oldInsight?.severity !== 'info' &&
      !r.oldInsight?.message?.toLowerCase().includes('plan verified')
  );

  const newInsightKeys = new Set(
    (recommendationDiffs || []).map((r) => (r ? `${r.toolId}:${r.type}` : ''))
  );
  const unchangedInsights = (newAudit?.insights || []).filter(
    (ins) =>
      ins &&
      ins.toolId !== 'all-stack-tools' &&
      ins.toolName !== 'All Stack Tools' &&
      !newInsightKeys.has(`${ins.toolId}:${ins.type}`)
  );

  const actionableUnchanged = unchangedInsights.filter(
    (ins) => (ins.potentialMonthlySaving || 0) > 0
  );
  const verifiedUnchanged = unchangedInsights.filter(
    (ins) => (ins.potentialMonthlySaving || 0) <= 0
  );
  const totalSteadySavings = actionableUnchanged.reduce(
    (sum, ins) => sum + (ins.potentialMonthlySaving || 0),
    0
  );

  const hasChanges =
    recommendationDiffs.length > 0 ||
    pricingDiffs.length > 0 ||
    savingsDelta !== 0 ||
    (sd &&
      (sd.added.length > 0 ||
        sd.removed.length > 0 ||
        sd.replaced.length > 0 ||
        sd.changed.length > 0));

  const isBaseline = oldAudit?.auditVersion === newAudit?.auditVersion;

  // Dynamic evolution summary narrative
  const summaryParts: string[] = [];
  if (sd?.added?.length)
    summaryParts.push(
      `${sd.added.length} tool${sd.added.length > 1 ? 's' : ''} added`
    );
  if (sd?.removed?.length)
    summaryParts.push(
      `${sd.removed.length} tool${sd.removed.length > 1 ? 's' : ''} decommissioned`
    );
  if (sd?.replaced?.length)
    summaryParts.push(
      `${sd.replaced.length} replacement${sd.replaced.length > 1 ? 's' : ''}`
    );
  if (spendDelta < 0)
    summaryParts.push(
      `monthly spend reduced by ${formatCurrencyFull(Math.abs(spendDelta))}/mo`
    );
  else if (spendDelta > 0)
    summaryParts.push(
      `monthly spend increased by ${formatCurrencyFull(spendDelta)}/mo`
    );
  if (savingsDelta > 0)
    summaryParts.push(
      `potential recovery unlocked by +${formatCurrencyFull(savingsDelta)}/mo`
    );
  else if (savingsDelta < 0)
    summaryParts.push(
      `optimization target adjusted by -${formatCurrencyFull(Math.abs(savingsDelta))}/mo`
    );
  if (addedRecs.length)
    summaryParts.push(
      `${addedRecs.length} new recommendation${addedRecs.length > 1 ? 's' : ''}`
    );

  const summaryLine =
    summaryParts.length > 0
      ? summaryParts.join(' · ')
      : 'Stack architecture and pricing models remain consistent across versions.';

  return (
    <div className="min-h-screen pb-24 bg-[#f8fafc] text-slate-900">
      {/* ── Top Navigation Bar ──────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-[0_1px_4px_0_rgba(0,0,0,0.07)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-3">

          {/* ── Left: Logo + Report Identity (single row) ── */}
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="focus:outline-none shrink-0 cursor-pointer"
            >
              <Logo asDiv />
            </button>

            {/* Vertical divider */}
            <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0" />

            {/* Identity: Evolution Report · v2 → v3 · timestamp */}
            <div className="hidden sm:flex flex-col justify-center gap-0.5">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-slate-400 leading-none">
                Evolution Report
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold text-slate-700 leading-none">
                  v{oldAudit?.auditVersion || 1}
                </span>
                <span className="text-slate-400 text-xs leading-none">→</span>
                <span className="text-sm font-extrabold text-indigo-600 leading-none">
                  v{newAudit?.auditVersion || 2}
                </span>
                {newAudit?.createdAt && (
                  <span className="hidden lg:inline text-[11px] font-medium text-slate-400 leading-none">
                    · {formatRelativeTime(newAudit.createdAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-2">

            {/* View toggle pill */}
            <div className="hidden lg:flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200 gap-0.5">
              <span className="px-3 py-1.5 text-[11px] font-bold rounded-md bg-white text-slate-900 shadow-sm whitespace-nowrap leading-none">
                Diff Report
              </span>
              <button
                onClick={() =>
                  navigate(`/audit/${newAudit?.auditId || ''}?view=single`, {
                    state: { isOwner },
                  })
                }
                className="px-3 py-1.5 text-[11px] font-semibold rounded-md text-slate-500 hover:text-slate-900 hover:bg-white/60 transition-all cursor-pointer whitespace-nowrap leading-none"
              >
                Full Dashboard
              </button>
            </div>

            {/* Separator */}
            {isOwner && <div className="hidden lg:block w-px h-6 bg-slate-200" />}

            {/* Edit Stack — primary */}
            {isOwner && (
              <button
                onClick={() => navigate(`/audit?reAuditOf=${newAudit?.auditId}`)}
                className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-[12px] font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                aria-label="Edit Stack"
              >
                Edit Stack
                <span className="text-indigo-300 text-[11px]">v{(newAudit?.auditVersion ?? 1) + 1}</span>
                <span className="text-indigo-200">→</span>
              </button>
            )}

            {/* Refresh Pricing */}
            {isOwner && (
              <button
                onClick={handleRunReAudit}
                disabled={reAuditing}
                className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[12px] font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap shadow-sm"
                aria-label="Refresh Pricing"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className={`absolute inset-0 rounded-full ${reAuditing ? 'animate-ping bg-amber-400 opacity-60' : ''}`} />
                  <span className={`relative rounded-full h-2 w-2 ${reAuditing ? 'bg-amber-500' : 'bg-slate-300'}`} />
                </span>
                {reAuditing ? 'Refreshing…' : 'Refresh Pricing'}
              </button>
            )}

            {/* Export PDF */}
            <button
              onClick={() => generateReAuditDiffPDF(oldAudit, newAudit, diff)}
              className="h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-[12px] font-semibold transition-colors cursor-pointer shadow-sm whitespace-nowrap"
              aria-label="Export PDF"
            >
              Export PDF
            </button>

            {/* Full Audit — secondary CTA */}
            <button
              onClick={() =>
                navigate(`/audit/${newAudit?.auditId || ''}?view=single`, {
                  state: { isOwner },
                })
              }
              className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 text-white text-[12px] font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              aria-label="Full Audit"
            >
              Full Audit →
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* ═══════════════════════════════════════════════════════
            1. CHANGE INTELLIGENCE HERO + DOMINANT KPI GRID
            ═══════════════════════════════════════════════════════ */}
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
        >
          {/* Header Bar */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  AI Stack Evolution Intelligence
                </span>
                {!isBaseline && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    Live Diff
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
                {isBaseline
                  ? 'Baseline Stack Snapshot'
                  : `Version ${oldAudit?.auditVersion || 1} → Version ${
                      newAudit?.auditVersion || 2
                    }`}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-3xl pt-0.5">
                {summaryLine}
              </p>
            </div>

            {/* Compare Mode Switcher */}
            {newAudit?.auditVersion && newAudit.auditVersion > 2 && (
              <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1 shrink-0 self-start">
                <button
                  onClick={() => setCompareWith('previous')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    compareWith === 'previous'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  vs Previous (v{(newAudit.auditVersion ?? 2) - 1})
                </button>
                <button
                  onClick={() => setCompareWith('root')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

          {/* 5-KPI Intelligence Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
            {/* 1. POTENTIAL SAVINGS */}
            <div className="p-5 bg-emerald-50/30 relative col-span-2 sm:col-span-1 space-y-1">
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
              <div className="pt-1.5">
                {savingsDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Steady
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-bold font-mono inline-flex items-center gap-0.5 ${
                      savingsDelta > 0 ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {savingsDelta > 0 ? '↑ +' : '↓ -'}
                    {formatCurrencyFull(Math.abs(savingsDelta))}/mo recovery
                  </span>
                )}
              </div>
            </div>

            {/* 2. MONTHLY SPEND */}
            <div className="p-5 space-y-1">
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
              <div className="pt-1.5">
                {spendDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">
                    No change
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-bold font-mono inline-flex items-center gap-1 ${
                      spendDelta > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {spendDelta > 0 ? <IconTrendUp /> : <IconTrendDown />}
                    {spendDelta > 0 ? '+' : ''}
                    {formatCurrencyFull(spendDelta)}/mo
                  </span>
                )}
              </div>
            </div>

            {/* 3. TOTAL TOOLS */}
            <div className="p-5 space-y-1">
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
              <div className="pt-1.5">
                {toolCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">
                    No change
                  </span>
                ) : (
                  <span className="text-[11px] font-bold font-mono text-slate-700">
                    {toolCountDelta > 0 ? `+${toolCountDelta}` : toolCountDelta} tool
                    {Math.abs(toolCountDelta) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* 4. OPPORTUNITIES */}
            <div className="p-5 space-y-1">
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
              <div className="pt-1.5">
                {optCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">
                    No change
                  </span>
                ) : (
                  <span className="text-[11px] font-bold font-mono text-emerald-700">
                    {optCountDelta > 0 ? `+${optCountDelta}` : optCountDelta} actionable
                  </span>
                )}
              </div>
            </div>

            {/* 5. REDUNDANCIES */}
            <div className="p-5 space-y-1">
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
              <div className="pt-1.5">
                {overlapCountDelta === 0 ? (
                  <span className="text-[11px] font-semibold text-slate-400">
                    No change
                  </span>
                ) : (
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      overlapCountDelta > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {overlapCountDelta > 0
                      ? `+${overlapCountDelta}`
                      : overlapCountDelta}{' '}
                    overlap{Math.abs(overlapCountDelta) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Key Drivers Intelligence Strip */}
          <div className="border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50">
            {/* Pricing Driver */}
            <div className="p-5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block">
                Key Pricing Driver
              </span>
              {biggestPricingChange ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {biggestPricingChange.toolName}
                    </span>
                    <span
                      className={`text-[11px] font-bold font-mono tabular-nums ${
                        biggestPricingChange.monthlyDelta > 0
                          ? 'text-rose-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {biggestPricingChange.monthlyDelta > 0 ? '+' : ''}
                      {formatCurrencyFull(biggestPricingChange.monthlyDelta)}/mo
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {biggestPricingChange.planLabel} plan rate updated from{' '}
                    <span className="line-through text-slate-400">
                      {formatCurrencyFull(biggestPricingChange.oldMonthlyPrice)}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-slate-700">
                      {formatCurrencyFull(biggestPricingChange.newMonthlyPrice)}
                      /mo
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    No vendor pricing changes detected
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    Spend movements are driven by stack configuration adjustments
                    rather than vendor catalog price changes.
                  </p>
                </div>
              )}
            </div>

            {/* Recommendation Driver */}
            <div className="p-5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 block">
                Key Recommendation Driver
              </span>
              {biggestRecChange ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {biggestRecChange.toolName}
                    </span>
                    {(biggestRecChange.savingDelta ?? 0) > 0 && (
                      <span className="text-[11px] font-bold font-mono text-emerald-700 tabular-nums">
                        +{formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}/mo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {biggestRecChange.status === 'added' ? (
                      <>
                        New optimization opportunity discovered with potential
                        recovery of{' '}
                        <span className="font-semibold text-emerald-700">
                          +{formatCurrencyFull(biggestRecChange.savingDelta ?? 0)}
                          /mo
                        </span>
                        .
                      </>
                    ) : biggestRecChange.status === 'removed' ? (
                      <>Prior recommendation resolved or no longer applicable.</>
                    ) : (
                      <>Optimization potential revised across versions.</>
                    )}
                  </p>
                  <button
                    onClick={() =>
                      recSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 cursor-pointer pt-0.5"
                  >
                    Review recommendation <IconArrowRight size={11} />
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Recommendation set remained steady across this version.
                </p>
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
            className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Living Audit History
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  ({allVersions.length} versions tracked)
                </span>
              </div>
              <button
                onClick={() =>
                  navigate(`/audit/${newAudit?.auditId || ''}?view=single`, {
                    state: { isOwner },
                  })
                }
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer flex items-center gap-1"
              >
                View Full Audit Dashboard <IconArrowRight size={11} />
              </button>
            </div>

            {/* Timeline Track */}
            <div className="relative pt-2 pb-1">
              <div className="absolute top-[22px] left-4 right-4 h-0.5 bg-slate-200 z-0" />
              <div className="relative z-10 flex items-center gap-8 sm:gap-12 overflow-x-auto px-2 py-1">
                {allVersions.map((v, idx) => {
                  const isNew = v.auditId === newAudit?.auditId;
                  const isOld = v.auditId === oldAudit?.auditId;
                  const isSame = oldAudit?.auditId === newAudit?.auditId;

                  let nodeBg = 'bg-slate-100 text-slate-700 border-slate-300';
                  let ring = 'ring-2 ring-white';
                  let badge = '';

                  if (isSame && isNew) {
                    nodeBg = 'bg-indigo-600 text-white border-indigo-600';
                    ring = 'ring-4 ring-indigo-100';
                    badge = 'Baseline';
                  } else if (isNew) {
                    nodeBg = 'bg-emerald-600 text-white border-emerald-600';
                    ring = 'ring-4 ring-emerald-100';
                    badge = 'Active (After)';
                  } else if (isOld) {
                    nodeBg = 'bg-amber-500 text-white border-amber-500';
                    ring = 'ring-4 ring-amber-100';
                    badge = 'Before';
                  }

                  return (
                    <button
                      key={v.auditId}
                      onClick={() =>
                        navigate(`/audit/${v.auditId}?view=single`, {
                          state: { isOwner },
                        })
                      }
                      className="group flex flex-col items-center shrink-0 cursor-pointer focus:outline-none"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-transform group-hover:scale-110 border ${nodeBg} ${ring}`}
                      >
                        {v.auditVersion || idx + 1}
                      </div>
                      <div className="mt-2 text-center">
                        <span
                          className={`text-xs font-bold block leading-tight ${
                            isNew ? 'text-slate-900' : 'text-slate-600'
                          }`}
                        >
                          v{v.auditVersion || idx + 1}{' '}
                          {badge && (
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              ({badge})
                            </span>
                          )}
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
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Baseline Snapshot
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                Initial Audit Version Recorded
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Total monthly outlay is{' '}
                <span className="font-semibold text-slate-900">
                  {formatCurrencyFull(newAudit.totalMonthlySpend)}
                </span>{' '}
                with{' '}
                <span className="font-bold text-emerald-600">
                  {formatCurrencyFull(newAudit.estimatedMonthlySavings)}/mo
                </span>{' '}
                in potential recovery.
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() =>
                  navigate(`/audit?reAuditOf=${newAudit.auditId}`)
                }
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                Edit Stack & Create v2 →
              </button>
            )}
          </div>
        ) : !hasChanges ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2 shadow-xs">
            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 text-sm font-bold">
              ✓
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Audit Fully Up to Date
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              No tool pricing changes or new recommendations were detected in this
              re-audit version.
            </p>
          </div>
        ) : null}

        {/* ═══════════════════════════════════════════════════════
            3. CHANGE ACTIVITY FEED
            ═══════════════════════════════════════════════════════ */}
        {sd && sd.summaries && sd.summaries.length > 0 && (
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.08 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                Change Activity Feed
              </span>
              <span className="text-xs font-bold text-slate-400">
                {sd.summaries.length} event{sd.summaries.length !== 1 ? 's' : ''}{' '}
                detected
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {sd.summaries.map((s, i) => (
                <div
                  key={i}
                  className="px-6 py-3.5 flex items-start gap-3.5 hover:bg-slate-50/70 transition-colors group"
                >
                  <span className="shrink-0 mt-0.5 w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs font-black font-mono flex items-center justify-center border border-slate-200/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                    {formatHighlightedDiffText(s)}
                  </p>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            4. STACK ARCHITECTURE ADJUSTMENTS (PREMIUM ENTERPRISE LEDGER)
            ═══════════════════════════════════════════════════════ */}
        {sd &&
          (sd.added.length > 0 ||
            sd.removed.length > 0 ||
            sd.replaced.length > 0 ||
            sd.changed.length > 0) && (
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-600">
                    Stack Architecture Adjustments
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {sd.added.length +
                      sd.removed.length +
                      sd.changed.length +
                      sd.replaced.length}{' '}
                    changes
                  </span>
                </div>
              </div>

              {/* Replacements (Before → After Split Card) */}
              {sd.replaced.length > 0 && (
                <div className="p-5 bg-indigo-50/20 border-b border-slate-100 space-y-3">
                  {sd.replaced.map((rep) => (
                    <div
                      key={`${rep.removedToolId}->${rep.addedToolId}`}
                      className="bg-white border border-indigo-200/80 rounded-xl overflow-hidden shadow-2xs"
                    >
                      <div className="px-4 py-2.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-950">
                          Tool Replacement Executed
                        </span>
                        {rep.addedSpend !== rep.removedSpend && (
                          <span
                            className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                              rep.addedSpend < rep.removedSpend
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rep.addedSpend < rep.removedSpend
                              ? `↓ Saves $${Math.abs(
                                  rep.addedSpend - rep.removedSpend
                                ).toFixed(0)}/mo`
                              : `↑ Increases $${Math.abs(
                                  rep.addedSpend - rep.removedSpend
                                ).toFixed(0)}/mo`}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_30px_1fr] items-center gap-3 p-4">
                        {/* Before */}
                        <div className="flex items-center gap-3 min-w-0">
                          <ToolLogoBadge
                            toolId={rep.removedToolId}
                            toolName={rep.removedToolName}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                              Previous
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {rep.removedToolName}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium">
                              {rep.removedPlanLabel} · ${rep.removedSpend.toFixed(0)}/mo
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center text-slate-300">
                          <IconArrowRight size={16} />
                        </div>

                        {/* After */}
                        <div className="flex items-center gap-3 min-w-0">
                          <ToolLogoBadge
                            toolId={rep.addedToolId}
                            toolName={rep.addedToolName}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <span className="text-[10px] font-semibold text-emerald-700 block uppercase">
                              Replacement
                            </span>
                            <h4 className="font-bold text-sm text-slate-900 truncate">
                              {rep.addedToolName}
                            </h4>
                            <p className="text-xs text-slate-600 font-medium">
                              {rep.addedPlanLabel} ·{' '}
                              <span className="font-bold text-emerald-700 font-mono">
                                ${rep.addedSpend.toFixed(0)}/mo
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Unified Premium Ledger Rows */}
              <div className="divide-y divide-slate-100">
                {/* 1. Decommissioned / Removed Tools (Refined Slate Tag + Monospace Delta) */}
                {sd.removed.map((tool) => (
                  <div
                    key={`rem-${tool.toolId}`}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ToolLogoBadge
                        toolId={tool.toolId}
                        toolName={tool.toolName}
                        size="md"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {tool.toolName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Decommissioned
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {tool.planLabel} Plan · {tool.seats} seat
                          {tool.seats !== 1 ? 's' : ''} removed
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 block">
                        Spend Eliminated
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-emerald-700 tracking-tight">
                        -${tool.monthlySpend.toFixed(0)}/mo
                      </span>
                    </div>
                  </div>
                ))}

                {/* 2. Newly Added Tools */}
                {sd.added.map((tool) => (
                  <div
                    key={`add-${tool.toolId}`}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ToolLogoBadge
                        toolId={tool.toolId}
                        toolName={tool.toolName}
                        size="md"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {tool.toolName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Added to Stack
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">
                          {tool.planLabel} Plan · {tool.seats} seat
                          {tool.seats !== 1 ? 's' : ''} provisioned
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 block">
                        New Outlay
                      </span>
                      <span className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight">
                        +${tool.monthlySpend.toFixed(0)}/mo
                      </span>
                    </div>
                  </div>
                ))}

                {/* 3. Configuration Modified Tools */}
                {sd.changed.map((tool) => (
                  <div
                    key={`chg-${tool.toolId}`}
                    className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <ToolLogoBadge
                        toolId={tool.toolId}
                        toolName={tool.toolName}
                        size="md"
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {tool.toolName}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Config Modified
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
                          {tool.oldPlanId !== tool.newPlanId && (
                            <span>
                              Plan:{' '}
                              <span className="line-through text-slate-400">
                                {tool.oldPlanLabel}
                              </span>{' '}
                              →{' '}
                              <span className="font-bold text-slate-800">
                                {tool.newPlanLabel}
                              </span>
                            </span>
                          )}
                          {tool.oldSeats !== tool.newSeats && (
                            <span>
                              Seats:{' '}
                              <span className="line-through text-slate-400">
                                {tool.oldSeats}
                              </span>{' '}
                              →{' '}
                              <span className="font-bold text-slate-800">
                                {tool.newSeats}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono text-xs">
                      <span className="text-slate-400 line-through">
                        ${tool.oldSpend.toFixed(0)}
                      </span>
                      <span className="text-slate-300 mx-1.5">→</span>
                      <span className="font-black text-slate-900 text-sm sm:text-base">
                        ${tool.newSpend.toFixed(0)}/mo
                      </span>
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
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Pricing Model Adjustments ({pricingDiffs.length})
              </h3>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {pricingDiffs.map((pDiff, idx) => (
                <div
                  key={`${pDiff.toolId}-${pDiff.planId}-${idx}`}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <ToolLogoBadge
                      toolId={pDiff.toolId}
                      toolName={pDiff.toolName}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {pDiff.toolName}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {pDiff.planLabel} Plan
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="line-through text-slate-400 font-mono">
                          {formatCurrencyFull(pDiff.oldMonthlyPrice)}/mo
                        </span>
                        <span className="text-slate-300">→</span>
                        <span className="font-bold font-mono text-slate-900">
                          {formatCurrencyFull(pDiff.newMonthlyPrice)}/mo
                        </span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-black font-mono tabular-nums shrink-0 ${
                      pDiff.monthlyDelta > 0
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {pDiff.monthlyDelta > 0 ? '+' : ''}
                    {formatCurrencyFull(pDiff.monthlyDelta)}/mo
                  </span>
                </div>
              ))}
            </div>
          </m.div>
        )}

        {/* ═══════════════════════════════════════════════════════
            6. ACTIONABLE RECOMMENDATION INTELLIGENCE
            ═══════════════════════════════════════════════════════ */}
        {(addedRecs.length > 0 ||
          changedRecs.length > 0 ||
          resolvedRecs.length > 0) && (
          <m.div
            ref={recSectionRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.14 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Recommendation Intelligence
              </h3>
            </div>

            {/* ── NEW OPPORTUNITIES DISCOVERED ───────────────────── */}
            {addedRecs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    New Opportunities Identified
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {addedRecs.length} New in v{newAudit?.auditVersion || 2}
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
                  {addedRecs.map((diffItem, i) => {
                    const saving =
                      diffItem.newInsight?.potentialMonthlySaving ?? 0;
                    return (
                      <div
                        key={`added-${diffItem.toolId}-${i}`}
                        className="p-5 hover:bg-slate-50/50 transition-all space-y-3"
                      >
                        <div className="flex items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 flex-wrap">
                            <ToolLogoBadge
                              toolId={diffItem.toolId}
                              toolName={diffItem.toolName}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                                  {diffItem.toolName}
                                </h4>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  {insightTypeLabel(
                                    diffItem.newInsight?.type || ''
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {saving > 0 ? (
                            <div className="text-right shrink-0">
                              <span className="text-base sm:text-lg font-black font-mono text-emerald-700 tracking-tight tabular-nums">
                                +{formatCurrencyFull(saving)}
                                <span className="text-xs font-bold text-emerald-600">
                                  /mo
                                </span>
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-600/80 block">
                                +{formatCurrencyFull(saving * 12)}/yr potential
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                              Optimal Tier Verified
                            </span>
                          )}
                        </div>

                        {/* Narrative with Executive Keyword Highlighting */}
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                          {formatHighlightedDiffText(
                            diffItem.newInsight?.message || ''
                          )}
                        </p>

                        {/* Suggestion Action */}
                        {diffItem.newInsight?.suggestion && (
                          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {diffItem.newInsight.suggestion}
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                navigate(
                                  `/audit/${newAudit?.auditId || ''}?view=single`,
                                  { state: { isOwner } }
                                )
                              }
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
                            >
                              View Details <IconArrowRight size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── REVISED / MODIFIED RECOMMENDATIONS ─────────────── */}
            {changedRecs.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Revised Recommendations
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {changedRecs.length} Modified
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {changedRecs.map((diffItem, i) => {
                    const oldSaving =
                      diffItem.oldInsight?.potentialMonthlySaving ?? 0;
                    const newSaving =
                      diffItem.newInsight?.potentialMonthlySaving ?? 0;
                    const savingDelta =
                      diffItem.savingDelta ?? (newSaving - oldSaving);

                    return (
                      <div
                        key={`changed-${diffItem.toolId}-${i}`}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
                      >
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
                          <div className="flex items-center gap-3.5 flex-wrap">
                            <ToolLogoBadge
                              toolId={diffItem.toolId}
                              toolName={diffItem.toolName}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                                  {diffItem.toolName}
                                </h4>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200/80 shadow-2xs">
                                  {insightTypeLabel(
                                    diffItem.newInsight?.type || ''
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          {savingDelta !== 0 && (
                            <span
                              className={`text-xs font-black font-mono px-3 py-1 rounded-full border ${
                                savingDelta > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {savingDelta > 0 ? '↑ +' : '↓ '}
                              {formatCurrencyFull(savingDelta)}/mo delta
                            </span>
                          )}
                        </div>

                        {/* Side-by-Side Diff Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                          {/* Left: Baseline */}
                          <div className="p-5 space-y-2 bg-slate-50/30">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Baseline (v{oldAudit?.auditVersion || 1})
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                                {formatCurrencyFull(oldSaving)}/mo
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {formatHighlightedDiffText(
                                diffItem.oldInsight?.message || ''
                              )}
                            </p>
                            {diffItem.oldInsight?.suggestion && (
                              <div className="text-xs text-slate-500 pt-1">
                                <span className="font-bold text-slate-700">
                                  Action:
                                </span>{' '}
                                {diffItem.oldInsight.suggestion}
                              </div>
                            )}
                          </div>

                          {/* Right: Updated */}
                          <div className="p-5 space-y-2 bg-indigo-50/20">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-indigo-700">
                                Updated (v{newAudit?.auditVersion || 2})
                              </span>
                              <span className="text-xs font-mono font-black text-slate-900 tabular-nums">
                                {formatCurrencyFull(newSaving)}/mo
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                              {formatHighlightedDiffText(
                                diffItem.newInsight?.message || ''
                              )}
                            </p>
                            {diffItem.newInsight?.suggestion && (
                              <div className="text-xs text-indigo-950 font-bold pt-1">
                                <span className="text-indigo-600">
                                  Updated Action:
                                </span>{' '}
                                {diffItem.newInsight.suggestion}
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

            {/* ── GENUINE RESOLVED RECOMMENDATIONS ──────────────── */}
            {resolvedRecs.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Recommendations Resolved
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {resolvedRecs.length} Resolved
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
                  {resolvedRecs.map((diffItem, i) => (
                    <div
                      key={`resolved-${diffItem.toolId}-${i}`}
                      className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <ToolLogoBadge
                          toolId={diffItem.toolId}
                          toolName={diffItem.toolName}
                          size="md"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {diffItem.toolName}
                            </h4>
                            <span className="text-xs text-slate-400 font-medium">
                              · {insightTypeLabel(diffItem.oldInsight?.type || '')}
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                              Resolved ✓
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            {formatHighlightedDiffText(
                              diffItem.oldInsight?.message || ''
                            )}
                          </p>
                        </div>
                      </div>

                      {diffItem.oldInsight &&
                        diffItem.oldInsight.potentialMonthlySaving > 0 && (
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                              Captured Recovery
                            </span>
                            <span className="text-sm font-black font-mono text-emerald-700">
                              {formatCurrencyFull(
                                diffItem.oldInsight.potentialMonthlySaving
                              )}
                              /mo
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
            7. UNCHANGED RECOMMENDATIONS (EXECUTIVE LEDGER TABLE)
            ═══════════════════════════════════════════════════════ */}
        {unchangedInsights.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* Header Accordion Bar */}
            <button
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="w-full p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50/60 transition-colors cursor-pointer group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Unchanged Stack Optimizations
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                    {actionableUnchanged.length} Actionable Target
                    {actionableUnchanged.length !== 1 ? 's' : ''}
                  </span>
                  {totalSteadySavings > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      +{formatCurrencyFull(totalSteadySavings)}/mo active recovery
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {actionableUnchanged.length > 0
                    ? `These optimization opportunities remain active and deliver up to ${formatCurrencyFull(
                        totalSteadySavings * 12
                      )}/year in potential cost recovery.`
                    : 'All tools remain verified and configured optimally for your current workflow.'}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {showUnchanged
                    ? 'Hide Details'
                    : `View ${unchangedInsights.length} Recommendations`}
                </span>
                <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-200 transition-colors">
                  <IconChevronDown rotated={showUnchanged} size={14} />
                </span>
              </div>
            </button>

            {/* Structured Table & Ledger View */}
            <AnimatePresence>
              {showUnchanged && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden border-t border-slate-200"
                >
                  {/* Actionable Opportunities List */}
                  {actionableUnchanged.length > 0 && (
                    <div className="divide-y divide-slate-100">
                      {actionableUnchanged.map((insight) => {
                        const sev = insight.severity;
                        const sevConfig = {
                          high: {
                            dot: 'bg-rose-500',
                            badge: 'bg-rose-50 text-rose-700 border-rose-200',
                          },
                          medium: {
                            dot: 'bg-amber-500',
                            badge: 'bg-amber-50 text-amber-800 border-amber-200',
                          },
                          low: {
                            dot: 'bg-slate-400',
                            badge: 'bg-slate-100 text-slate-600 border-slate-200',
                          },
                          info: {
                            dot: 'bg-slate-400',
                            badge: 'bg-slate-100 text-slate-600 border-slate-200',
                          },
                        }[sev || 'low'] || {
                          dot: 'bg-slate-400',
                          badge: 'bg-slate-100 text-slate-600 border-slate-200',
                        };

                        const saving = insight.potentialMonthlySaving || 0;

                        return (
                          <div
                            key={`${insight.toolId}-${insight.type}`}
                            className="p-5 sm:p-6 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-5"
                          >
                            {/* Left: Tool Details, Narrative & Action */}
                            <div className="space-y-3 min-w-0 max-w-2xl">
                              <div className="flex items-center gap-3 flex-wrap">
                                <ToolLogoBadge
                                  toolId={insight.toolId}
                                  toolName={insight.toolName}
                                  size="md"
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-base text-slate-900 tracking-tight">
                                    {insight.toolName}
                                  </h4>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                                    {insightTypeLabel(insight.type)}
                                  </span>
                                  <span
                                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sevConfig.badge}`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${sevConfig.dot}`}
                                    />
                                    {severityLabel(sev)}
                                  </span>
                                </div>
                              </div>

                              {/* Clean Highlighted Narrative */}
                              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                                {formatHighlightedDiffText(insight.message)}
                              </p>

                              {/* Clickable Action Button */}
                              {insight.suggestion && (
                                <div className="pt-0.5">
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/audit/${newAudit?.auditId || ''}?view=single`,
                                        { state: { isOwner } }
                                      )
                                    }
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer group"
                                  >
                                    <span className="text-emerald-400 font-bold">
                                      →
                                    </span>
                                    <span>{insight.suggestion}</span>
                                    <IconArrowRight
                                      size={11}
                                    />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Right: Recovery Metric */}
                            {saving > 0 && (
                              <div className="md:text-right shrink-0 flex md:flex-col items-baseline md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 block">
                                    Monthly Recovery
                                  </span>
                                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tracking-tight tabular-nums block mt-0.5">
                                    +{formatCurrencyFull(saving)}/mo
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-600/80 block mt-1">
                                  +{formatCurrencyFull(saving * 12)}/year potential
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Verified Optimal Configurations Strip */}
                  {verifiedUnchanged.length > 0 && (
                    <div className="p-5 bg-slate-50/80 border-t border-slate-200/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                          Verified Optimal Configurations ({verifiedUnchanged.length})
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          No adjustments needed · Analyzed & confirmed for current workflow
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {verifiedUnchanged.map((ins) => (
                          <div
                            key={`${ins.toolId}-${ins.type}`}
                            className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <ToolLogoBadge
                                toolId={ins.toolId}
                                toolName={ins.toolName}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-xs text-slate-900 truncate">
                                  {ins.toolName}
                                </h5>
                                <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                  {ins.message?.replace(/^Plan Verified:\s*/i, '') ||
                                    'Optimal tier configured for workflow'}
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                              <span className="text-emerald-600 font-black">✓</span>
                              <span>Optimal</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              Next Actions
            </h3>
          </div>

          <div
            className={`grid grid-cols-1 ${
              isOwner ? 'sm:grid-cols-2' : ''
            } gap-4`}
          >
            {/* PRIMARY: Evolve Stack (Add / Remove AI Tools) */}
            {isOwner && (
              <div className="p-6 rounded-2xl bg-slate-900 text-white flex flex-col justify-between space-y-4 shadow-md group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400">
                      Evolve Stack · Version v{(newAudit?.auditVersion ?? 1) + 1}
                    </span>
                    <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-slate-300 group-hover:translate-x-0.5 transition-transform">
                      <IconArrowRight size={12} />
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-white">
                    Edit Stack (Add / Remove AI Tools)
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Add newly adopted tools, remove decommissioned apps, or modify seats & plans to generate version{' '}
                    <span className="font-bold text-white">
                      v{(newAudit?.auditVersion ?? 1) + 1}
                    </span>{' '}
                    with instant live ROI diff intelligence.
                  </p>
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() =>
                      navigate(`/audit?reAuditOf=${newAudit?.auditId}`)
                    }
                    className="w-full py-3 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    aria-label="Edit Stack & Create Next Version"
                  >
                    <span>Edit Stack & Create v{(newAudit?.auditVersion ?? 1) + 1}</span>
                    <span>→</span>
                  </button>
                  <button
                    onClick={handleRunReAudit}
                    disabled={reAuditing}
                    className="w-full py-1.5 px-3 text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {reAuditing
                        ? 'Refreshing pricing…'
                        : 'Or quick-refresh pricing for current stack without editing'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* SECONDARY: Start Fresh */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs group">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-indigo-600">
                    Fresh Start · v1
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:translate-x-0.5 transition-transform">
                    <IconArrowRight size={12} />
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900">
                  Start New Independent Audit
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Start an independent audit from scratch (
                  <span className="font-bold text-slate-700">v1</span>) without
                  modifying this audit's history.
                </p>
              </div>
              <button
                onClick={() => navigate('/audit')}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-extrabold text-xs transition-all text-center cursor-pointer"
                aria-label="Start New Independent Audit"
              >
                Start New Independent Audit →
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 text-xs">
            {isOwner && (
              <button
                onClick={() =>
                  navigate(`/audit?reAuditOf=${newAudit?.auditId}`)
                }
                className="font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Edit stack composition →
              </button>
            )}
            <button
              onClick={() =>
                navigate(`/audit/${newAudit?.auditId || ''}?view=single`)
              }
              className="font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ml-auto"
            >
              ← Back to Full Audit Dashboard
            </button>
          </div>
        </m.div>
      </main>
    </div>
  );
}
