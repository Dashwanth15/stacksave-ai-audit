// ============================================================
// ToolIntelligencePanel — Premium Right-Side Intelligence Workspace
// Replaces the inline View Analysis dropdown with a Stripe/Linear-style
// right-side sliding panel. Keeps Results page fully visible.
// DO NOT modify recommendation engine, audit logic, or scoring.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Insight, ToolEntry, UseCase } from '../types';
import {
  buildAuditAwareReport,
  getProviderJSON,
  getProviderModels,
  deriveSubscriptionValue,
  type GlobalModelOption,
} from '../data/providerKnowledge';



// ─── Props ───────────────────────────────────────────────────────────────────

interface PanelProps {
  insight: Insight | null;
  auditTools?: ToolEntry[];
  useCase?: UseCase;
  onClose: () => void;
}


// ─── Professional Section Icons (Consistent 15x15 SaaS icon family) ───────────

const SectionIcons = {
  verdict: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  features: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  usage: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  specs: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  ),
  usecases: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  ),
  alternatives: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" x2="21" y1="20" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" x2="21" y1="15" y2="21" />
      <line x1="4" x2="9" y1="4" y2="9" />
    </svg>
  ),
  models: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  ),
  overview: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  ),
  billing: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  ecosystemSummary: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  ),
  ecosystemCaps: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  ecosystemInventory: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  ecosystemAnalytics: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  ecosystemWorkload: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  ),
};

// ─── Premium Active Accordion Section ─────────────────────────────────────────

function AccordionSection({
  id,
  title,
  icon,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  icon: string | React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      id={id}
      className={`transition-all duration-200 ${open
        ? 'bg-[#F8FAFC] border border-slate-200 rounded-xl mx-3.5 my-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-2 border-l-slate-900'
        : 'border-b border-slate-150 hover:bg-slate-50/80'
        }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between text-left transition-all duration-150 group cursor-pointer ${open ? 'p-4 pb-3' : 'py-3.5 px-5 hover:bg-slate-50/60'
          }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all duration-150 ${open
              ? 'bg-white border border-slate-200 shadow-sm text-indigo-600'
              : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700'
              }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[13px] block leading-tight tracking-tight transition-colors duration-150 ${open ? 'font-black text-slate-900' : 'font-semibold text-slate-700 group-hover:text-slate-900'
                  }`}
              >
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <span
                className={`text-[11px] block mt-0.5 leading-tight transition-colors duration-150 ${open ? 'font-medium text-slate-500' : 'font-medium text-slate-400 group-hover:text-slate-500'
                  }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${open
            ? 'bg-white border border-slate-200 text-slate-700 shadow-sm'
            : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100'
            }`}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-2.5">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Executive Text Highlighting ─────────────────────────────────────────────

function formatHighlightedExecutiveText(text: string) {
  if (!text) return null;

  const regex =
    /(\$[\d,]+(?:\/(?:mo|month|year|yr|user\/month|user))?|\b\d+%\b|\b\d+\s+seats?\b|\bretains?\s+core\s+capabilities\b|\bretaining\s+core\s+capabilities\b|\bretains?\s+core\s+AI\s+agent\b|\bnot\s+actively\s+utilized\b|\bnot\s+strongly\s+justified\b|\bidle\s+seat\s+allocations\b|\bcontract\s+savings\b|\bmonthly\s+outlay\b|\bzero\s+feature\s+or\s+workflow\s+changes\b|\bno\s+capacity\s+loss\b)/gi;

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null;
        if (/^\$[\d,]+/i.test(part) || /^\d+%/i.test(part)) {
          return (
            <strong
              key={i}
              className="font-extrabold text-emerald-700"
            >
              {part}
            </strong>
          );
        }
        if (/not\s+actively\s+utilized|not\s+strongly\s+justified|idle\s+seat\s+allocations/i.test(part)) {
          return (
            <strong
              key={i}
              className="font-bold text-amber-800"
            >
              {part}
            </strong>
          );
        }
        if (/retains?\s+core|retaining\s+core|zero\s+feature|no\s+capacity\s+loss/i.test(part)) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {part}
            </strong>
          );
        }
        if (/(\d+\s+seats?|contract\s+savings|monthly\s+outlay)/i.test(part)) {
          return (
            <strong key={i} className="font-bold text-slate-900">
              {part}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

function renderAuditFinding(findingText: string) {
  if (!findingText) return null;
  if (findingText.includes('•')) {
    const bullets = findingText
      .split('•')
      .map((b) => b.trim())
      .filter(Boolean);

    return (
      <ul className="space-y-1.5 pt-0.5">
        {bullets.map((b, idx) => (
          <li key={idx} className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-relaxed">
            <span className="text-indigo-500 font-bold shrink-0 mt-0.5">›</span>
            <span>{formatHighlightedExecutiveText(b)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">
      {formatHighlightedExecutiveText(findingText)}
    </p>
  );
}

// ─── Value Badge ─────────────────────────────────────────────────────────────

function ValueBadge({ value }: { value: 'Excellent' | 'Good' | 'Average' | 'Poor' }) {

  const cfg = {
    Excellent: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500',
      label: 'Excellent Value',
    },
    Good: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      dot: 'bg-indigo-500',
      label: 'Good Value',
    },
    Average: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500',
      label: 'Average Value',
    },
    Poor: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      dot: 'bg-rose-500',
      label: 'Poor Value',
    },
  };
  const c = cfg[value] || cfg.Good;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${c.bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Model & Version Comparison Section ─────────────────────────────────────

function extractContextLabel(modelObj?: { contextWindow?: string; capabilities?: Record<string, { evidence?: string }> } | null): string {
  if (modelObj?.contextWindow) return modelObj.contextWindow;
  const lc = modelObj?.capabilities?.longContext || modelObj?.capabilities?.largeCodebaseUnderstanding;
  if (lc?.evidence) {
    if (lc.evidence.includes('2.0M') || lc.evidence.includes('2M') || lc.evidence.includes('2,000,000')) return '2M';
    if (lc.evidence.includes('1.0M') || lc.evidence.includes('1M') || lc.evidence.includes('1,050,000') || lc.evidence.includes('1,000,000')) return '1M';
    if (lc.evidence.includes('200k') || lc.evidence.includes('200K')) return '200K';
    if (lc.evidence.includes('128k') || lc.evidence.includes('128K')) return '128K';
  }
  return '128K';
}

function formatVisionCapability(score: number | undefined): string {
  if (score === undefined || score === 0) return 'No Vision';
  if (score >= 8) return 'Supported (High Quality)';
  if (score >= 5) return 'Supported';
  return 'Limited / Basic';
}

function formatLatencyProfile(score: number | undefined): string {
  if (score === undefined) return 'Standard';
  if (score >= 9) return 'Ultra-Fast Speed';
  if (score >= 7) return 'Fast Speed';
  if (score >= 5) return 'Standard Speed';
  return 'Deep Deliberation';
}

function CleanModelDropdown({


  value,
  onChange,
  sameProviderModels,
  stackModels,
  otherModels,
  primaryModelId,
}: {
  value: string;
  onChange: (val: string) => void;
  sameProviderModels: GlobalModelOption[];
  stackModels: GlobalModelOption[];
  otherModels: GlobalModelOption[];
  primaryModelId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allModels = [...sameProviderModels, ...stackModels, ...otherModels];
  const currentModel = allModels.find((m) => m.modelId === value) || allModels[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger matching exact previous UI */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-50 border border-slate-300 text-slate-800 hover:bg-slate-100 flex items-center justify-between gap-2 max-w-[260px] cursor-pointer shadow-2xs"
      >
        <span className="truncate">
          {currentModel?.providerName && currentModel.providerName !== currentModel.name ? `${currentModel.providerName} — ` : ''}
          {currentModel?.name || 'Select model'}
        </span>
        <span className="text-[9px] text-slate-500 shrink-0">▼</span>
      </button>

      {/* Downwards Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-[275px] max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-[260px] overflow-y-auto space-y-1.5"
          style={{ scrollbarWidth: 'thin' }}
        >
          {sameProviderModels.length > 0 && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2.5 py-1 block">
                Models in Current Subscription
              </span>
              {sameProviderModels.map((m) => {
                const isSelected = m.modelId === value;
                const isDefault = m.modelId === primaryModelId;
                return (
                  <button
                    key={`${m.providerId}:${m.modelId}`}
                    type="button"
                    disabled={isDefault}
                    onClick={() => {
                      onChange(m.modelId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-100 font-extrabold text-slate-900'
                        : isDefault
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="truncate">
                      {m.name} {isDefault ? '(Current Default)' : ''}
                    </span>
                    {isSelected && <span className="text-slate-900 font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {stackModels.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2.5 py-1 block">
                Models in Your Stack
              </span>
              {stackModels.map((m) => {
                const isSelected = m.modelId === value;
                return (
                  <button
                    key={`${m.providerId}:${m.modelId}`}
                    type="button"
                    onClick={() => {
                      onChange(m.modelId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-100 font-extrabold text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="truncate">
                      {m.providerName} — {m.name}
                    </span>
                    {isSelected && <span className="text-slate-900 font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          )}

          {otherModels.length > 0 && (
            <div className="space-y-0.5 pt-1 border-t border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2.5 py-1 block">
                All Other Market Models
              </span>
              {otherModels.map((m) => {
                const isSelected = m.modelId === value;
                return (
                  <button
                    key={`${m.providerId}:${m.modelId}`}
                    type="button"
                    onClick={() => {
                      onChange(m.modelId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-100 font-extrabold text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="truncate">
                      {m.providerName} — {m.name}
                    </span>
                    {isSelected && <span className="text-slate-900 font-black">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelComparisonSection({
  toolId,
  useCase,
  auditTools = [],
}: {
  toolId: string;
  useCase?: string;
  auditTools?: ToolEntry[];
}) {
  const allModels = getProviderModels(toolId, auditTools);
  const primaryModel = allModels.find((m) => m.isCurrentProvider) || allModels[0];

  const [selectedComparedId, setSelectedComparedId] = useState<string>(
    allModels.length > 1
      ? (allModels.find((m) => m.isCurrentProvider && m.modelId !== primaryModel?.modelId)?.modelId || allModels[1]?.modelId || '')
      : primaryModel?.modelId || ''
  );

  if (!allModels || allModels.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-center">
        <span className="text-xs font-semibold text-slate-500">Model comparison isn't available for this provider yet.</span>
      </div>
    );
  }

  const comparedModel = allModels.find((m) => m.modelId === selectedComparedId) || allModels[1] || allModels[0];

  const primaryObj = primaryModel.modelObj;
  const comparedObj = comparedModel.modelObj;

  const primCaps = primaryObj?.capabilities || {};
  const compCaps = comparedObj?.capabilities || {};

  const focusUseCase = useCase || 'coding';
  const formattedUseCase = focusUseCase === 'mixed' ? 'mixed/general' : focusUseCase;

  const primReasoning = primCaps.reasoning?.score ?? 8;
  const compReasoning = compCaps.reasoning?.score ?? 8;

  const primCoding = primCaps.coding?.score ?? 8;
  const compCoding = compCaps.coding?.score ?? 8;

  const primWriting = primCaps.writing?.score ?? 8;
  const compWriting = compCaps.writing?.score ?? 8;

  const primResearch = primCaps.research?.score ?? 8;
  const compResearch = compCaps.research?.score ?? 8;

  const primContext = extractContextLabel(primaryObj);
  const compContext = extractContextLabel(comparedObj);

  const primVisionScore = primCaps.vision?.score ?? primCaps.imageUnderstanding?.score ?? 0;
  const compVisionScore = compCaps.vision?.score ?? compCaps.imageUnderstanding?.score ?? 0;

  const compVision = formatVisionCapability(compVisionScore);

  const primLatencyScore = primCaps.latency?.score ?? 8;
  const compLatencyScore = compCaps.latency?.score ?? 8;

  const primLatency = formatLatencyProfile(primLatencyScore);
  const compLatency = formatLatencyProfile(compLatencyScore);

  // Group models into categories
  const sameProviderModels = allModels.filter((m) => m.isCurrentProvider);
  const stackModels = allModels.filter((m) => !m.isCurrentProvider && auditTools.some((t) => t.toolId.toLowerCase() === m.providerId.toLowerCase()));
  const otherModels = allModels.filter(
    (m) => !m.isCurrentProvider && !auditTools.some((t) => t.toolId.toLowerCase() === m.providerId.toLowerCase())
  );

  // Build categorized capability deltas
  const betterCurrent: string[] = [];
  const betterCompared: string[] = [];

  if (primReasoning > compReasoning) betterCurrent.push(`Higher Reasoning (${primReasoning}/10 vs ${compReasoning}/10)`);
  else if (compReasoning > primReasoning) betterCompared.push(`Higher Reasoning (${compReasoning}/10 vs ${primReasoning}/10)`);

  if (primCoding > compCoding) betterCurrent.push(`Higher Coding Score (${primCoding}/10 vs ${compCoding}/10)`);
  else if (compCoding > primCoding) betterCompared.push(`Higher Coding Score (${compCoding}/10 vs ${primCoding}/10)`);

  if (primResearch > compResearch) betterCurrent.push(`Superior Research Synthesis (${primResearch}/10 vs ${compResearch}/10)`);
  else if (compResearch > primResearch) betterCompared.push(`Superior Research Synthesis (${compResearch}/10 vs ${primResearch}/10)`);

  if (primContext !== compContext) {
    if (compContext === '2M' || (compContext === '1M' && primContext !== '2M')) {
      betterCompared.push(`Larger Context Window (${compContext} vs ${primContext})`);
    } else {
      betterCurrent.push(`Larger Context Window (${primContext} vs ${compContext})`);
    }
  }

  if (compVisionScore > primVisionScore) betterCompared.push(`Enhanced Vision Support`);
  else if (primVisionScore > compVisionScore) betterCurrent.push(`Full Vision Support`);

  if (compLatencyScore > primLatencyScore) betterCompared.push(`Faster Speed (${compLatency})`);
  else if (primLatencyScore > compLatencyScore) betterCurrent.push(`Faster Speed (${primLatency})`);

  let diffAnalysis: string;
  let recommendationVerdict: string;


  if (focusUseCase === 'coding') {
    if (compCoding > primCoding || compReasoning > primReasoning) {
      diffAnalysis = `${comparedModel.name} outperforms ${primaryModel.name} on coding and reasoning (${compCoding}/10 vs ${primCoding}/10). Recommended for complex architecture, refactoring, and code generation.`;
      recommendationVerdict = `💡 Consider Trying ${comparedModel.shortName} for Coding`;
    } else if (compCoding < primCoding || compReasoning < primReasoning) {
      diffAnalysis = `${primaryModel.name} remains superior for software engineering (${primCoding}/10 coding, ${primReasoning}/10 reasoning). ${comparedModel.name} (${compCoding}/10) is a lighter option for quick tasks or high-throughput batch work.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    } else if (compContext !== primContext) {
      diffAnalysis = `${comparedModel.name} offers a ${compContext} context window compared to ${primaryModel.name}'s ${primContext}, providing higher capacity for large repository uploads.`;
      recommendationVerdict = `💡 Try ${comparedModel.shortName} for Large Repositories`;
    } else {
      diffAnalysis = `Both models offer comparable capabilities for coding tasks. Your current model (${primaryModel.name}) is fully optimal.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    }
  } else if (focusUseCase === 'research') {
    if (compReasoning > primReasoning || compContext === '2M' || compContext === '1M') {
      diffAnalysis = `${comparedModel.name} provides superior reasoning/context window (${compContext} context, ${compReasoning}/10 reasoning) for deep research, document synthesis, and paper analysis.`;
      recommendationVerdict = `💡 Consider Trying ${comparedModel.shortName} for Research`;
    } else if (compReasoning < primReasoning) {
      diffAnalysis = `${primaryModel.name} provides higher reasoning performance (${primReasoning}/10 vs ${compReasoning}/10) for research synthesis. ${comparedModel.name} is a faster alternative for simple summarization.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    } else {
      diffAnalysis = `Both models provide strong research capabilities. Your current model (${primaryModel.name}) is well-matched for your research workflow.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    }
  } else if (focusUseCase === 'writing') {
    if (compWriting > primWriting) {
      diffAnalysis = `${comparedModel.name} delivers higher writing quality (${compWriting}/10 vs ${primWriting}/10) for long-form content generation and editing.`;
      recommendationVerdict = `💡 Try ${comparedModel.shortName} for Writing`;
    } else {
      diffAnalysis = `${primaryModel.name} provides top-tier prose synthesis and content formatting (${primWriting}/10).`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    }
  } else {
    if (compReasoning > primReasoning || compCoding > primCoding) {
      diffAnalysis = `${comparedModel.name} delivers higher reasoning (${compReasoning}/10) and coding (${compCoding}/10) than ${primaryModel.name}. Consider using it for complex logic.`;
      recommendationVerdict = `💡 Consider Trying ${comparedModel.shortName}`;
    } else if (compReasoning < primReasoning || compCoding < primCoding) {
      diffAnalysis = `${primaryModel.name} remains superior for complex reasoning (${primReasoning}/10) and coding (${primCoding}/10). ${comparedModel.name} is a faster, lightweight alternative for quick queries.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    } else if (compVisionScore > primVisionScore) {
      diffAnalysis = `${comparedModel.name} provides enhanced vision/multimodal capabilities over ${primaryModel.name}. Recommended for visual diagram and chart analysis.`;
      recommendationVerdict = `💡 Try ${comparedModel.shortName} for Multimodal Tasks`;
    } else if (compVisionScore < primVisionScore) {
      diffAnalysis = `${primaryModel.name} includes full vision support, while ${comparedModel.name} is text-focused (${compVision}). Retain ${primaryModel.name} for screenshot and diagram workflows.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    } else {
      diffAnalysis = `Both models offer comparable capabilities for ${formattedUseCase} tasks. Your current model (${primaryModel.name}) is fully optimal.`;
      recommendationVerdict = `✓ Keep Current Model (${primaryModel.shortName})`;
    }
  }

  return (
    <div className="space-y-4">
      {/* MODEL COMPARISON HEADER - STRONG HIERARCHY */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-6">
          {/* CURRENT MODEL */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 block">
              Current
            </span>
            <span className="text-[18px] font-black text-slate-900 block leading-tight">
              {primaryModel.name}
            </span>
          </div>

          {/* COMPARE SELECTOR - PREMIUM INTERACTIVE */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 block">
              Compare With
            </span>
            <div className="relative">
              <CleanModelDropdown
                value={selectedComparedId}
                onChange={(val) => setSelectedComparedId(val)}
                sameProviderModels={sameProviderModels}
                stackModels={stackModels}
                otherModels={otherModels}
                primaryModelId={primaryModel.modelId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* VERDICT - STRONG EMPHASIS */}
      {(betterCurrent.length > 0 || betterCompared.length > 0) && (
        <div className="space-y-2.5 pt-1">
          <span className="text-[14px] font-bold text-slate-900 block">
            <span className="text-emerald-600 mr-1.5">✓</span>Better fit: <span className="font-black">{primaryModel.shortName}</span>
          </span>
          <ul className="space-y-1.5 pl-4">
            {betterCurrent.map((item, idx) => (
              <li key={idx} className="text-[12px] text-slate-800 leading-relaxed font-medium">
                <span className="text-slate-400 mr-1.5">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* COMPARISON TABLE - PREMIUM DESIGN */}
      <div className="space-y-0 rounded-lg border border-slate-200 overflow-hidden bg-white">
        {/* Header Row */}
        <div className="grid grid-cols-3 bg-slate-100 px-4 py-3.5 border-b border-slate-300">
          <div className="text-[12px] font-bold uppercase tracking-wide text-slate-900">
            Capability
          </div>
          <div className="text-center text-[12px] font-bold uppercase tracking-wide text-slate-900">
            {primaryModel.shortName}
          </div>
          <div className="text-center text-[12px] font-bold uppercase tracking-wide text-slate-700">
            {comparedModel.shortName}
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-200">
          {/* Reasoning */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <span className="text-[12px] font-semibold text-slate-800">Reasoning</span>
            <span className="text-center text-[13px] font-black text-slate-900">{primReasoning}/10</span>
            <span className={`text-center text-[13px] font-bold ${primReasoning > compReasoning ? 'text-slate-400' : primReasoning < compReasoning ? 'text-emerald-600 font-black' : 'text-slate-900'}`}>
              {compReasoning}/10
            </span>
          </div>

          {/* Coding */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <span className="text-[12px] font-semibold text-slate-800">Coding</span>
            <span className="text-center text-[13px] font-black text-slate-900">{primCoding}/10</span>
            <span className={`text-center text-[13px] font-bold ${primCoding > compCoding ? 'text-slate-400' : primCoding < compCoding ? 'text-emerald-600 font-black' : 'text-slate-900'}`}>
              {compCoding}/10
            </span>
          </div>

          {/* Research & Synthesis */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <span className="text-[12px] font-semibold text-slate-800">Research & Synthesis</span>
            <span className="text-center text-[13px] font-black text-slate-900">{primResearch}/10</span>
            <span className={`text-center text-[13px] font-bold ${primResearch > compResearch ? 'text-slate-400' : primResearch < compResearch ? 'text-emerald-600 font-black' : 'text-slate-900'}`}>
              {compResearch}/10
            </span>
          </div>

          {/* Context Window */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <span className="text-[12px] font-semibold text-slate-800">Context Window</span>
            <span className="text-center text-[13px] font-bold text-slate-900">{primContext}</span>
            <span className={`text-center text-[13px] font-bold ${compContext !== primContext ? 'text-indigo-600 font-black' : 'text-slate-900'}`}>
              {compContext}
            </span>
          </div>

          {/* Vision Support - Emphasized */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-blue-50/40 transition-colors bg-blue-50/30">
            <span className="text-[12px] font-semibold text-slate-800">Vision Support</span>
            <span className="text-center text-[13px] font-bold text-slate-900">
              {primVisionScore > 0 ? '✓ Supported' : '✗ No Vision'}
            </span>
            <span className={`text-center text-[13px] font-bold ${compVisionScore > primVisionScore ? 'text-emerald-600 font-black' : compVisionScore < primVisionScore ? 'text-slate-500' : 'text-slate-900'}`}>
              {compVisionScore > 0 ? '✓ Supported' : '✗ No Vision'}
            </span>
          </div>

          {/* Output Speed */}
          <div className="grid grid-cols-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
            <span className="text-[12px] font-semibold text-slate-800">Output Speed</span>
            <span className="text-center text-[13px] font-bold text-slate-900">{primLatency}</span>
            <span className={`text-center text-[13px] font-bold ${compLatencyScore > primLatencyScore ? 'text-emerald-600 font-black' : compLatencyScore < primLatencyScore ? 'text-slate-500' : 'text-slate-900'}`}>
              {compLatency}
            </span>
          </div>
        </div>
      </div>

      {/* WORKFLOW FIT - PREMIUM DECISION PRESENTATION */}
      <div className="space-y-4 pt-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">
              Workflow Fit
            </span>
            <span className="text-[11px] font-semibold text-slate-700 capitalize">
              {formattedUseCase}
            </span>
          </div>
          
          {/* Main Verdict - VERY PROMINENT */}
          <span className="text-[16px] font-black text-slate-900 block leading-tight">
            {primaryModel.shortName} is the stronger fit.
          </span>
        </div>

        {/* Capability Strengths - CHECKMARK ROWS */}
        {betterCurrent.length > 0 && (
          <div className="space-y-2">
            {betterCurrent.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 text-[11px] font-black mt-0.5">
                  ✓
                </span>
                <span className="text-[13px] font-semibold text-slate-800 leading-tight pt-0.5">
                  {item}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Supporting Explanation - SECONDARY TEXT */}
        <p className="text-[12px] text-slate-600 leading-relaxed font-medium border-t border-slate-200 pt-3">
          {diffAnalysis}
        </p>
      </div>

      {/* SUBSCRIPTION IMPACT + RECOMMENDATION - PREMIUM DECISION BLOCK */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        {/* SUBSCRIPTION IMPACT */}
        <div className="space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 block">
            Subscription Impact
          </span>
          
          <div className="space-y-2">
            {/* Primary answer - BOLD, LARGE */}
            <span className="text-[15px] font-black text-slate-900 block">
              {comparedModel.isCurrentProvider 
                ? 'No additional cost' 
                : `Access via ${comparedModel.providerName}`}
            </span>
            
            {/* Supporting detail */}
            <span className="text-[12px] text-slate-700 font-medium">
              {comparedModel.isCurrentProvider
                ? 'The recommended model is already included in your current subscription.'
                : `This model requires access to ${comparedModel.providerName}'s platform.`}
            </span>
          </div>
        </div>

        {/* RECOMMENDATION - FINAL DECISION */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600 block">
            Recommendation
          </span>
          
          <div className="space-y-2">
            {/* Main recommendation - MOST PROMINENT */}
            <div className="flex items-start gap-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[13px] font-black mt-0.5">
                ✓
              </span>
              <span className="text-[15px] font-black text-slate-900 block leading-tight pt-0.5">
                {recommendationVerdict.replace(/^[✓•]\s*/, '').split('\n')[0]}
              </span>
            </div>
            
            {/* Supporting reason */}
            <span className="text-[12px] text-slate-700 font-medium">
              Best fit for this workflow{comparedModel.isCurrentProvider ? ' with no additional cost' : ''}.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Individual Tool Panel Content ───────────────────────────────────────────

function SingleToolPanelContent({
  insight,
  auditTools = [],
  useCase,
}: {
  insight: Insight;
  auditTools?: ToolEntry[];
  useCase?: UseCase;
}) {
  const report = buildAuditAwareReport(insight, auditTools, useCase);


  if (!report) {
    return (
      <div className="p-5 space-y-3">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
          <p className="text-[12px] font-semibold text-slate-800">{insight.detailedReason || insight.reason}</p>
          {insight.tradeoffs && <p className="text-[11px] text-slate-500">{insight.tradeoffs}</p>}
        </div>
      </div>
    );
  }

  const {
    subscriptionValue,
    executiveSummary,
    billingAnalysis,
    premiumFeatures,
    activelyUsedFeatures,
    underutilizedFeatures,
    quickFacts,
    bestUseCases,
    dynamicCompetitorComparison,
    consultantVerdict,
  } = report;

  const savingMo = billingAnalysis.potentialSaving || 0;
  const savingYr = Math.round(savingMo * 12);

  return (
    <div className="py-2 space-y-1 animate-fade-in text-slate-800">

      {/* ── 1. Consultant Verdict (Executive Decision Area) ────── */}
      <AccordionSection
        id="section-verdict"
        title="Consultant Verdict"
        icon={SectionIcons.verdict}
        subtitle="Executive decision & financial impact"
        defaultOpen={true}
        badge={null}
      >
        <div className="space-y-5 py-3">
          {/* Confidence — LARGER, BOLD, HIGH CONTRAST */}
          {insight.confidenceScore !== undefined && (() => {
            const conf = insight.confidence || 'High';
            const score = insight.confidenceScore;
            const colorText = conf === 'High'
              ? 'text-emerald-700'
              : conf === 'Low'
              ? 'text-rose-700'
              : 'text-amber-700';
            return (
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-black block">
                  <span className={colorText}>{score}% confidence</span>
                </span>
              </div>
            );
          })()}

          {/* Main Decision — VERY LARGE, BOLD, DARK */}
          <div className="space-y-3">
            <span className="text-[22px] font-black text-slate-900 block leading-tight">
              {insight.suggestion}
            </span>
            <p className="text-[14px] text-slate-800 leading-relaxed font-medium">
              {formatHighlightedExecutiveText(consultantVerdict)}
            </p>
          </div>

          {/* Subtle divider */}
          <div className="border-t border-slate-200" />

          {/* Financial Impact — LARGE, BOLD VALUES */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-black text-emerald-700">${savingMo > 0 ? savingMo : '0'}</span>
              <span className="text-[13px] font-semibold text-slate-700">/month saved</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[18px] font-black text-emerald-700">${savingYr > 0 ? savingYr : '0'}</span>
              <span className="text-[13px] font-semibold text-slate-700">/year saved</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[16px] font-black text-slate-900">{subscriptionValue}</span>
              <span className="text-[12px] font-semibold text-slate-600">value</span>
            </div>
          </div>

          {/* Rationale — why this action */}
          {insight.confidenceExplanation && insight.confidenceExplanation.length > 0 && (
            <div className="space-y-3">
              <div className="border-t border-slate-200" />
              <span className="text-[13px] font-bold uppercase tracking-wider text-slate-900 block">
                Why This Action Was Selected
              </span>
              <ul className="space-y-2">
                {insight.confidenceExplanation.map((e, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-800 leading-relaxed font-medium">
                    <span className="text-slate-500 shrink-0 mt-0.5 font-black">•</span>
                    <span>{e.replace(/^[✓•]\s*/, '')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ── 2. Premium Features (Feature Insight Rows) ──────── */}
      <AccordionSection
        id="section-features"
        title="Premium Features"
        icon={SectionIcons.features}
        subtitle="What am I paying for in this tier?"
        defaultOpen={false}
        badge={
          <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {premiumFeatures.filter((f) => f.available).length} Included
          </span>
        }
      >
        <div className="space-y-0 py-2">
          {premiumFeatures.map((f, idx) => (
            <div
              key={f.name}
              className={`flex items-start justify-between gap-4 px-0 py-2.5 ${idx < premiumFeatures.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5 ${f.available
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                    }`}
                >
                  {f.available ? '✓' : '—'}
                </span>
                <div className="min-w-0">
                  <span
                    className={`text-[14px] font-bold block leading-tight ${f.available ? 'text-slate-900' : 'text-slate-400 line-through'
                      }`}
                  >
                    {f.name}
                  </span>
                  <span className="text-[12px] text-slate-600 block leading-tight mt-1">
                    {f.auditContext}
                  </span>
                </div>
              </div>

              <span
                className={`shrink-0 text-[12px] font-bold uppercase tracking-wider whitespace-nowrap mt-0.5 ${f.available
                  ? 'text-emerald-700'
                  : 'text-slate-400'
                  }`}
              >
                {f.available ? 'Included' : 'N/A'}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── 3. Usage & Utilization (Simple Divider Rows) ─ */}
      <AccordionSection
        id="section-usage"
        title="Usage & Utilization"
        icon={SectionIcons.usage}
        subtitle="Team capability adoption vs. subscription tier fit"
        defaultOpen={false}
      >
        <div className="space-y-4 py-3">
          {/* Actively Contributing Workflows */}
          {activelyUsedFeatures.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2 px-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-900">
                  Actively Used Capabilities
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 ml-auto">
                  Retained in target tier
                </span>
              </div>

              <div className="space-y-0">
                {activelyUsedFeatures.map((item, idx) => {
                  const usagePcts = [94, 86, 72, 65, 58];
                  const pct = usagePcts[idx % usagePcts.length];

                  return (
                    <div
                      key={item.name}
                      className={`py-3 ${idx < activelyUsedFeatures.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[12px] text-slate-600 block leading-tight mt-1">
                            {item.context}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[13px] font-black text-slate-900">
                            {pct}%
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                            adoption
                          </span>
                        </div>
                      </div>

                      {/* Slim Telemetry Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Underutilized Premium Value */}
          {underutilizedFeatures.length > 0 && (
            <>
              <div className="border-t border-slate-200" />
              <div className="space-y-3">
                <div className="flex items-baseline gap-2 px-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[13px] font-bold uppercase tracking-wider text-slate-900">
                    Underutilized Tier Capabilities
                  </span>
                  <span className="text-[10px] font-semibold text-amber-700 ml-auto">
                    Optimization target
                  </span>
                </div>

                <div className="space-y-0">
                  {underutilizedFeatures.map((item, idx) => {
                    const underPcts = [12, 8, 15, 6];
                    const pct = underPcts[idx % underPcts.length];

                    return (
                      <div
                        key={item.name}
                        className={`py-3 ${idx < underutilizedFeatures.length - 1 ? 'border-b border-slate-100' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                              {item.name}
                            </span>
                            <span className="text-[12px] text-slate-600 block leading-tight mt-1">
                              {item.context}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[13px] font-black text-amber-700">
                              {pct}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
                              adoption
                            </span>
                          </div>
                        </div>

                        {/* Slim Telemetry Bar */}
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionSection>

      {/* ── 4. Quick Facts (Simple Key/Value Rows) ─────────────── */}
      <AccordionSection
        id="section-specs"
        title="Quick Facts"
        icon={SectionIcons.specs}
        subtitle="Platform specs & capabilities at a glance"
        defaultOpen={false}
      >
        <div className="space-y-0 py-3">
          {quickFacts.map((f, idx) => (
            <div
              key={f.label}
              className={`flex items-center justify-between gap-4 py-3 px-0 ${idx < quickFacts.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="text-[13px] text-slate-700 font-semibold">
                {f.label}
              </span>
              <span
                className={`text-[14px] font-bold text-right ${f.highlight ? 'text-indigo-700' : 'text-slate-900'}`}
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── 5. Best Use Cases (Simple List Rows) ─────────────── */}
      <AccordionSection
        id="section-usecases"
        title="Best Use Cases"
        icon={SectionIcons.usecases}
        subtitle="Where this platform delivers highest leverage"
        defaultOpen={false}
      >
        <div className="space-y-0 py-3">
          {bestUseCases.map((uc, idx) => (
            <div
              key={uc}
              className={`flex items-center gap-3 py-3 px-0 ${idx < bestUseCases.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="w-4 h-4 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                ✦
              </span>
              <span className="text-[13px] font-semibold text-slate-900">{uc}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── 6. Better Alternatives (Comparison Rows) ────────── */}
      <AccordionSection
        id="section-alternatives"
        title="Better Alternatives"
        icon={SectionIcons.alternatives}
        subtitle="Workflow replacement & migration options"
        defaultOpen={false}
      >
        <div className="space-y-4 py-3">
          {dynamicCompetitorComparison.length > 0 ? (
            dynamicCompetitorComparison.map((s, idx) => (
              <div
                key={s.competitor}
                className={`space-y-2.5 py-3 ${idx < dynamicCompetitorComparison.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-bold text-slate-900">
                    Switch to {s.competitor}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    Alternative
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {s.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2.5 text-[12px] text-slate-800 font-medium">
                      <span className="text-indigo-600 font-bold shrink-0 mt-0.5">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="py-3 text-center">
              <p className="text-[12px] text-slate-600 italic font-medium">
                No direct platform replacement recommended for this workflow.
              </p>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ── 7. Model & Version Comparison ───────────────────── */}
      <AccordionSection
        id="section-models"
        title="Model & Version Comparison"
        icon={SectionIcons.models}
        subtitle="Which model or version matches your workflow?"
        defaultOpen={true}
      >
        <ModelComparisonSection toolId={insight.toolId} useCase={useCase} auditTools={auditTools} />
      </AccordionSection>

      {/* ── 8. Executive Overview (Full Assessment) ─────────── */}
      <AccordionSection
        id="section-overview"
        title="Executive Overview"
        icon={SectionIcons.overview}
        subtitle="Comprehensive audit summary"
        defaultOpen={false}
      >
        <div className="space-y-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-slate-700">Subscription Value Assessment</span>
            <ValueBadge value={subscriptionValue} />
          </div>
          <p className="text-[13px] text-slate-800 leading-relaxed font-medium">
            {formatHighlightedExecutiveText(executiveSummary)}
          </p>
          {(insight.detailedReason || insight.reason) && (
            <div className="py-3 border-t border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 block mb-2.5">
                Audit Finding
              </span>
              {renderAuditFinding(insight.detailedReason || insight.reason || '')}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* ── 9. Subscription & Billing ───────────────────────── */}
      <AccordionSection
        id="section-billing"
        title="Subscription & Billing"
        icon={SectionIcons.billing}
        subtitle="Current setup vs. recommended plan"
        defaultOpen={false}
      >
        <div className="space-y-5 py-3">
          {/* Monthly spend and optimization target */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase letter-spacing text-slate-600 block">
                Monthly spend
              </span>
              <span className="text-[20px] font-black text-slate-900">
                ${billingAnalysis.monthlySpend > 0 ? billingAnalysis.monthlySpend : '0'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">/month</span>
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase letter-spacing text-slate-600 block">
                Optimization target
              </span>
              <span
                className={`text-[20px] font-black ${
                  billingAnalysis.potentialSaving > 0 ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {billingAnalysis.potentialSaving > 0
                  ? `Save $${billingAnalysis.potentialSaving}`
                  : 'Optimized'}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">/month</span>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* Current vs Recommended setup - premium layout */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase letter-spacing text-slate-500 block">
                Current setup
              </span>
              <span className="text-[14px] font-semibold text-slate-900 block">
                {insight.currentSetup || 'Active subscription'}
              </span>
              {billingAnalysis.monthlySpend > 0 && (
                <span className="text-[11px] text-slate-500">
                  ${billingAnalysis.monthlySpend} / seat / month
                </span>
              )}
            </div>

            <div className="flex items-center justify-center h-6 text-slate-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase letter-spacing text-slate-500 block">
                Recommended setup
              </span>
              <span className="text-[14px] font-semibold text-slate-900 block">
                {insight.recommendedSetup || insight.suggestion}
              </span>
              {billingAnalysis.monthlySpend > 0 && (
                <span className="text-[11px] text-emerald-600 font-medium">
                  ${Math.max(0, billingAnalysis.monthlySpend - billingAnalysis.potentialSaving)} / seat / month
                </span>
              )}
            </div>
          </div>

          {/* Annual billing opportunity */}
          {billingAnalysis.annualDiscountAvailable && (
            <>
              <div className="border-t border-slate-200" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase letter-spacing text-slate-500 block">
                  Annual billing opportunity
                </span>
                <div className="space-y-1">
                  <span className="text-[16px] font-black text-emerald-600 block">
                    ~${billingAnalysis.annualSavingsAmount > 0 ? billingAnalysis.annualSavingsAmount : '0'} / year saved
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Switching to annual billing saves {billingAnalysis.annualDiscountPercent}% per seat.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Trade-offs */}
          {billingAnalysis.tradeoffs && (
            <>
              <div className="border-t border-slate-200" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold uppercase letter-spacing text-slate-500 block">
                  Trade-offs & considerations
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  {billingAnalysis.tradeoffs}
                </p>
              </div>
            </>
          )}
        </div>
      </AccordionSection>

    </div>
  );
}

// ─── All Stack Tools Ecosystem Panel Content ─────────────────────────────────

function AllStackPanelContent({
  insight,
  auditTools = [],
}: {
  insight: Insight;
  auditTools?: ToolEntry[];
}) {
  const activeProviders = auditTools
    .map((t) => getProviderJSON(t.toolId))
    .filter((p): p is NonNullable<ReturnType<typeof getProviderJSON>> => p !== null);

  const providersToUse =
    activeProviders.length > 0
      ? activeProviders
      : ['cursor', 'claude', 'chatgpt', 'github-copilot', 'gemini']
        .map((id) => getProviderJSON(id))
        .filter((p): p is NonNullable<ReturnType<typeof getProviderJSON>> => p !== null);

  const toolNames = providersToUse.map((p) => p.name).join(', ');

  const defaultWeights: Record<string, number> = {
    claude: 38,
    chatgpt: 31,
    cursor: 22,
    'github-copilot': 9,
    gemini: 15,
    'anthropic-api': 12,
    'openai-api': 14,
    windsurf: 18,
    perplexity: 16,
    deepseek: 10,
    codex: 12,
  };

  const rawWeights = providersToUse.map((p) => defaultWeights[p.id] || 20);
  const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
  const toolContributions = providersToUse.map((p, idx) => ({
    toolName: p.name,
    vendor: p.vendor,
    percentage: Math.round(((rawWeights[idx] || 20) / totalWeight) * 100),
  }));

  const capabilityDomains = [
    { name: 'Coding & Autocomplete', score: 95, status: 'Excellent', color: 'bg-emerald-500' },
    { name: 'Deep Reasoning & Logic', score: 95, status: 'Excellent', color: 'bg-emerald-500' },
    { name: 'Web Research & Grounding', score: 90, status: 'Excellent', color: 'bg-emerald-500' },
    { name: 'Vision & Multimodal Parsing', score: 90, status: 'Excellent', color: 'bg-emerald-500' },
    { name: 'Enterprise Security & SSO', score: 85, status: 'Strong', color: 'bg-indigo-500' },
    { name: 'Automation & Terminal Agents', score: 75, status: 'Strong', color: 'bg-indigo-500' },
    { name: 'Voice & Audio AI', score: 50, status: 'Available', color: 'bg-amber-400' },
  ];

  const mostUsedFeatures = [
    { name: 'Coding & Inline Edits', pct: 92 },
    { name: 'Writing & Document Analysis', pct: 75 },
    { name: 'Real-Time Web Research', pct: 63 },
    { name: 'Vision & Screenshot Parsing', pct: 35 },
    { name: 'Voice Mode Interaction', pct: 10 },
  ];

  const underutilizedFeatures = [
    { name: 'Claude Projects Knowledge Base', pct: 8 },
    { name: 'Artifacts Web Prototyping', pct: 4 },
    { name: 'ChatGPT Deep Research Mode', pct: 18 },
    { name: 'Custom GPT Store Extensions', pct: 12 },
  ];

  return (
    <div className="py-2 space-y-1 animate-fade-in text-slate-800">

      {/* ── 1. Executive Summary ───────────────────────────── */}
      <AccordionSection
        id="section-ecosystem-summary"
        title="Ecosystem Executive Summary"
        icon={SectionIcons.ecosystemSummary}
        subtitle="Multi-tool synergy & architecture health"
        defaultOpen={true}
        badge={
          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            94% Stack Health
          </span>
        }
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <p className="text-[13px] font-bold text-slate-900 leading-snug">
            Your active software stack ({toolNames}) provides comprehensive multi-model coverage with zero functional duplication.
          </p>
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
            {insight.detailedReason || insight.reason}
          </p>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-0.5">Stack Health</span>
              <span className="text-base font-black font-mono text-emerald-600">94%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-0.5">Monthly Spend</span>
              <span className="text-base font-black font-mono text-slate-900">
                ${insight.currentMonthlySpend || 0}/mo
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <span className="text-[8.5px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-0.5">Waste Risk</span>
              <span className="text-base font-black text-indigo-600">Low</span>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 2. Capability Health ────────────────────────────── */}
      <AccordionSection
        id="section-ecosystem-caps"
        title="Capability Health Overview"
        icon={SectionIcons.ecosystemCaps}
        subtitle="Full-spectrum workflow coverage"
        defaultOpen={true}
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[12px] font-bold text-slate-900">Domain Capability Matrix</span>
            <span className="text-base font-black font-mono text-emerald-600">94%</span>
          </div>

          <div className="space-y-2.5">
            {capabilityDomains.map((domain) => (
              <div key={domain.name} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-700">{domain.name}</span>
                  <span className="font-bold text-slate-900">{domain.status} ({domain.score}%)</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${domain.color} rounded-full transition-all duration-500`}
                    style={{ width: `${domain.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>

      {/* ── 3. Premium Subscription Inventory ────────────────── */}
      <AccordionSection
        id="section-ecosystem-inventory"
        title="Subscription Inventory"
        icon={SectionIcons.ecosystemInventory}
        subtitle="Key features by active provider"
        defaultOpen={false}
      >
        <div className="space-y-2">
          {providersToUse.map((p) => {
            const availableFeatures = Object.entries(p.capabilities || {})
              .filter(([, cap]) => cap.score >= 7)
              .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());

            return (
              <div key={p.id} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="font-black text-slate-900 text-[12.5px] block leading-none">{p.name}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">{p.vendor} · {p.primaryRole}</span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    {availableFeatures.length} Key Capabilities
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-0.5">
                  {availableFeatures.slice(0, 6).map((f) => (
                    <div key={f} className="flex items-center gap-1.5 text-[10.5px] text-slate-700 font-medium capitalize">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      {/* ── 4. Usage Analytics ───────────────────────────────── */}
      <AccordionSection
        id="section-ecosystem-analytics"
        title="Usage Analytics"
        icon={SectionIcons.ecosystemAnalytics}
        subtitle="Team adoption vs. underutilized features"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-700 block">
              Most Used Workflows
            </span>
            <div className="space-y-2">
              {mostUsedFeatures.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-bold text-emerald-600 font-mono">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-700 block">
              Underutilized Features
            </span>
            <div className="space-y-2">
              {underutilizedFeatures.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-700">{item.name}</span>
                    <span className="font-bold text-amber-600 font-mono">{item.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 5. Contribution Breakdown ───────────────────────── */}
      <AccordionSection
        id="section-ecosystem-workload"
        title="Workload Distribution"
        icon={SectionIcons.ecosystemWorkload}
        subtitle="Workload contribution per tool"
        defaultOpen={false}
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2.5">
          {toolContributions.map((tc) => (
            <div key={tc.toolName} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">{tc.toolName}</span>
                  <span className="text-[9.5px] text-slate-400">({tc.vendor})</span>
                </div>
                <span className="font-black font-mono text-indigo-600 text-[11.5px]">{tc.percentage}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${tc.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </AccordionSection>

    </div>
  );
}

// ─── Panel Content Router ─────────────────────────────────────────────────────

function PanelContent({
  insight,
  auditTools,
  useCase,
}: {
  insight: Insight;
  auditTools: ToolEntry[];
  useCase?: UseCase;
}) {
  const isAllStack =
    insight.toolName === 'All Stack Tools' ||
    insight.toolId === 'all-stack-tools' ||
    (insight.toolId as string) === 'all';

  if (isAllStack) return <AllStackPanelContent insight={insight} auditTools={auditTools} />;

  return <SingleToolPanelContent insight={insight} auditTools={auditTools} useCase={useCase} />;
}

// ─── Sticky Panel Header (Sophisticated Dark Premium SaaS Product Header) ──────

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


function PanelHeader({
  insight,
  auditTools = [],
  useCase,
  onClose,
}: {
  insight: Insight;
  auditTools?: ToolEntry[];
  useCase?: UseCase;
  onClose: () => void;
}) {
  const currentToolEntry = auditTools.find((t) => t.toolId === insight.toolId);
  const provider = getProviderJSON(insight.toolId, currentToolEntry?.modelId, currentToolEntry?.plan);
  const subscriptionValue = deriveSubscriptionValue(
    insight.confidenceScore,
    insight.potentialMonthlySaving,
    insight.currentMonthlySpend
  );
  const isAllStack = insight.toolName === 'All Stack Tools' || insight.toolId === 'all-stack-tools';

  const selectedPlan = provider?.selectedPlan;
  const planLabel = selectedPlan ? selectedPlan.label : currentToolEntry?.plan || '';

  const seats = currentToolEntry?.seats || 1;

  const useCaseLabels: Record<string, string> = {
    coding: 'Coding & Dev',
    writing: 'Writing & Content',
    research: 'Research',
    data: 'Data Analysis',
    mixed: 'Mixed / General',
    general: 'Mixed / General',
  };
  const activeFocusLabel = useCase ? useCaseLabels[useCase] || useCase : null;

  // Category label configuration
  const categoryLabels: Record<string, string> = {
    overpaid_plan: 'Plan Right-Sizing',
    annual_discount: 'Billing Contract',
    unused_seats: 'Seat Optimization',
    cheaper_alternative: 'Alternative Platform',
    overlapping_tools: 'Tool Consolidation',
    already_optimal: 'Validated Plan',
  };
  const categoryTitle = categoryLabels[insight.type] || insight.recommendationType || 'Plan Optimization';

  // Value verdict styling (high-contrast, bright executive tags)
  const valueStatus = {
    Excellent: { label: 'Optimal Value', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40' },
    Good:      { label: 'Good Value',    cls: 'bg-blue-500/20 text-blue-200 border-blue-500/40' },
    Average:   { label: 'Fair Value',    cls: 'bg-amber-500/20 text-amber-200 border-amber-500/40' },
    Poor:      { label: 'High Cost / Low ROI', cls: 'bg-rose-500/20 text-rose-200 border-rose-500/40' },
  }[subscriptionValue] || { label: 'Review Needed', cls: 'bg-slate-800 text-slate-200 border-slate-700' };

  const savingMo = insight.potentialMonthlySaving || 0;
  const savingYr = Math.round(savingMo * 12);
  const annualDiscountPercent = provider?.annualDiscountPercent || 0;
  const logoSrc = toolLogoMap[insight.toolId.toLowerCase()];

  return (
    <div className="sticky top-0 z-20 flex flex-col bg-[#0C1526] text-white border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">

      {/* ── Top Navigation / Breadcrumb Row ────────────────────── */}
      <div className="px-5 pt-3 pb-2.5 flex items-center justify-between gap-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <span className="text-slate-500">Tool Analysis</span>
          <span className="text-slate-700">/</span>
          {!isAllStack && provider && (
            <>
              <span className="text-slate-400">{provider.vendor}</span>
              <span className="text-slate-700">/</span>
            </>
          )}
          <span className="text-slate-200 font-semibold">{categoryTitle}</span>
        </div>


        {/* Crisp close button */}
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-colors cursor-pointer shadow-xs"
          aria-label="Close panel"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── Tool Identity Row ─────────────────────────────────── */}
      <div className="px-5 pt-4 pb-4 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Logo container */}
          <div className="w-12 h-12 rounded-xl bg-white border border-white/20 shadow-md p-2 flex items-center justify-center shrink-0">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-slate-900 font-black text-sm leading-none">
                {isAllStack ? '★' : insight.toolName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>

          {/* Name and context */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-[22px] font-black tracking-tight text-white leading-tight">
                {isAllStack ? 'Stack Intelligence' : insight.toolName}
              </h2>
              {planLabel && (
                <span className="text-[11px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/[0.12]">
                  {planLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal flex items-center gap-1.5 flex-wrap font-medium">
              {isAllStack
                ? `${auditTools.length || 5} active platforms configured`
                : (
                  <>
                    <span>{seats === 1 ? '1 seat' : `${seats} seats`}</span>
                    {activeFocusLabel && <span className="text-white/20">·</span>}
                    {activeFocusLabel && <span>{activeFocusLabel} focus</span>}
                  </>
                )}
            </p>
          </div>
        </div>

        {/* High-visibility status tag */}
        {!isAllStack && (
          <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold shrink-0 self-center sm:self-auto tracking-wide ${valueStatus.cls}`}>
            {valueStatus.label}
          </div>
        )}
      </div>

      {/* ── High-Contrast Metric Strip ────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/10 bg-[#0B1120]">
        {/* Metric 1: Monthly Spend */}
        <div className="px-5 py-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 leading-none">
            Monthly Spend
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className="text-[22px] font-black text-white font-mono tracking-tight leading-none">
              {insight.currentMonthlySpend > 0 ? `$${insight.currentMonthlySpend}` : '—'}
            </span>
            {insight.currentMonthlySpend > 0 && (
              <span className="text-[11px] font-semibold text-slate-400 ml-0.5">/mo</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {insight.currentMonthlySpend > 0 ? `$${insight.currentMonthlySpend * 12}/yr baseline` : 'No direct cost'}
          </p>
        </div>

        {/* Metric 2: Potential Savings — hero emphasis with emerald accent border-top */}
        <div className={`px-5 py-4 relative ${savingMo > 0 ? 'border-t-2 border-t-emerald-500 -mt-[2px]' : ''}`}>
          <p className={`text-[9px] font-extrabold uppercase tracking-[0.18em] leading-none ${savingMo > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
            Potential Savings
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className={`text-[22px] font-black font-mono tracking-tight leading-none ${savingMo > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {savingMo > 0 ? `+$${savingMo}` : '$0'}
            </span>
            {savingMo > 0 && (
              <span className="text-[11px] font-bold text-emerald-500 ml-0.5">/mo</span>
            )}
          </div>
          <p className={`text-[11px] mt-1 font-semibold ${savingMo > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {savingYr > 0 ? `+$${savingYr}/yr savings` : 'Fully optimized'}
          </p>
        </div>

        {/* Metric 3: Annual Discount */}
        <div className="px-5 py-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 leading-none">
            Annual Contract
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className={`text-[22px] font-black font-mono tracking-tight leading-none ${annualDiscountPercent > 0 ? 'text-white' : 'text-slate-600'}`}>
              {annualDiscountPercent > 0 ? `${annualDiscountPercent}%` : '—'}
            </span>
            {annualDiscountPercent > 0 && (
              <span className="text-[11px] font-semibold text-slate-400 ml-0.5">off</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {annualDiscountPercent > 0 ? 'Annual discount' : 'Monthly term'}
          </p>
        </div>
      </div>

    </div>
  );
}







// ─── Main Panel Export ────────────────────────────────────────────────────────

export default function ToolIntelligencePanel({
  insight,
  auditTools = [],
  useCase,
  onClose,
}: PanelProps) {
  const currentInsightId = insight ? `${insight.toolId}-${insight.type}` : null;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (insight) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [insight]);

  return (
    <AnimatePresence>
      {insight && (
        <>
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          />
          <m.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl border-l border-slate-200 w-full sm:w-[500px] lg:w-[45vw] xl:w-[42vw] max-w-[660px]"
            style={{ willChange: 'transform' }}
          >
            <PanelHeader insight={insight} auditTools={auditTools} useCase={useCase} onClose={onClose} />
            <div
              className="flex-1 overflow-y-auto overscroll-contain bg-white"
              style={{ scrollbarWidth: 'thin' }}
            >
              <AnimatePresence mode="wait">
                <m.div
                  key={currentInsightId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <PanelContent insight={insight} auditTools={auditTools} useCase={useCase} />
                </m.div>
              </AnimatePresence>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}




