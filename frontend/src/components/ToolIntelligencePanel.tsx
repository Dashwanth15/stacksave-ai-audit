// ============================================================
// ToolIntelligencePanel — Premium Right-Side Intelligence Workspace
// Replaces the inline View Analysis dropdown with a Stripe/Linear-style
// right-side sliding panel. Keeps Results page fully visible.
// DO NOT modify recommendation engine, audit logic, or scoring.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type { Insight, ToolEntry } from '../types';
import {
  buildAuditAwareReport,
  getProviderJSON,
  getProviderModels,
  deriveSubscriptionValue,
  type GlobalModelOption,
} from '../data/providerKnowledge';
import { insightTypeLabel } from '../utils/formatters';

// ─── Props ───────────────────────────────────────────────────────────────────

interface PanelProps {
  insight: Insight | null;
  auditTools?: ToolEntry[];
  useCase?: string;
  onClose: () => void;
}

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
        ? 'bg-[#F8FAFC] border border-slate-200/90 rounded-2xl mx-3.5 my-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] border-l-[3px] border-l-slate-900'
        : 'border-b border-slate-100/90 hover:bg-slate-50/60'
        }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between text-left transition-colors group ${open ? 'p-4 pb-3' : 'py-3.5 px-5'
          }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all ${open
              ? 'bg-white border border-slate-200/80 shadow-2xs text-indigo-600 scale-105'
              : 'bg-slate-100/80 text-slate-600'
              }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[13px] block leading-tight tracking-tight ${open ? 'font-black text-slate-900' : 'font-bold text-slate-800 group-hover:text-slate-900'
                  }`}
              >
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <span
                className={`text-[11px] font-medium block mt-0.5 leading-tight ${open ? 'text-slate-500' : 'text-slate-400'
                  }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${open ? 'bg-white border border-slate-200/80 text-slate-800' : 'text-slate-400 group-hover:text-slate-600'
            }`}
        >
          <svg
            width="12"
            height="12"
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
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
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
              className="font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-1 py-0.5 rounded font-mono text-[11.5px]"
            >
              {part}
            </strong>
          );
        }
        if (/not\s+actively\s+utilized|not\s+strongly\s+justified|idle\s+seat\s+allocations/i.test(part)) {
          return (
            <strong
              key={i}
              className="font-bold text-amber-900 bg-amber-50 border border-amber-200/50 px-1 py-0.5 rounded"
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

function extractContextLabel(modelObj: any): string {
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
  return 'Limited';
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
          className="absolute right-0 top-full mt-1 z-50 w-[275px] bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 max-h-[260px] overflow-y-auto space-y-1.5"
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

  const primVision = formatVisionCapability(primVisionScore);
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

  let diffAnalysis = '';
  let recommendationVerdict = '';

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

  const costNote = comparedModel.isCurrentProvider
    ? 'Included in plan — no extra subscription cost'
    : `Cross-provider model — accessible via ${comparedModel.providerName}`;

  return (
    <div className="space-y-3">
      {/* Model Selection Header */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-500">Current Default Model:</span>
          <span className="font-extrabold text-slate-900">{primaryModel.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
          <label htmlFor={`compare-model-${toolId}`} className="font-semibold text-slate-700 shrink-0">
            Compare With Model:
          </label>
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


      {/* Categorized Capability Badges */}
      {(betterCurrent.length > 0 || betterCompared.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {betterCurrent.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs space-y-1">
              <span className="font-extrabold text-emerald-800 uppercase tracking-wider text-[9px] block">
                Better with {primaryModel.shortName} (Current)
              </span>
              <ul className="space-y-0.5 text-emerald-900 font-medium">
                {betterCurrent.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {betterCompared.length > 0 && (
            <div className="p-2.5 rounded-xl bg-white border border-indigo-200/80 shadow-2xs space-y-1">
              <span className="font-extrabold text-indigo-800 uppercase tracking-wider text-[9px] block">
                Better with {comparedModel.shortName}
              </span>
              <ul className="space-y-0.5 text-indigo-900 font-medium">
                {betterCompared.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <span className="text-indigo-600 font-bold">⚡</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Comparison Grid */}
      <div className="rounded-xl border border-slate-200/90 overflow-hidden text-xs bg-white shadow-2xs">
        <div className="grid grid-cols-3 bg-slate-100/80 p-2.5 font-extrabold text-slate-700 border-b border-slate-200/80 text-[10.5px]">
          <div>Capability</div>
          <div className="text-center">{primaryModel.shortName} (Current)</div>
          <div className="text-center">{comparedModel.shortName}</div>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Reasoning</span>
            <span className="text-center font-bold text-slate-800">{primReasoning}/10</span>
            <span
              className={`text-center font-bold ${compReasoning > primReasoning ? 'text-emerald-600' : compReasoning < primReasoning ? 'text-rose-600' : 'text-slate-800'
                }`}
            >
              {compReasoning}/10 {compReasoning > primReasoning ? '↑' : compReasoning < primReasoning ? '↓' : ''}
            </span>
          </div>
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Coding</span>
            <span className="text-center font-bold text-slate-800">{primCoding}/10</span>
            <span
              className={`text-center font-bold ${compCoding > primCoding ? 'text-emerald-600' : compCoding < primCoding ? 'text-rose-600' : 'text-slate-800'
                }`}
            >
              {compCoding}/10 {compCoding > primCoding ? '↑' : compCoding < primCoding ? '↓' : ''}
            </span>
          </div>
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Research & Synthesis</span>
            <span className="text-center font-bold text-slate-800">{primResearch}/10</span>
            <span
              className={`text-center font-bold ${compResearch > primResearch ? 'text-emerald-600' : compResearch < primResearch ? 'text-rose-600' : 'text-slate-800'
                }`}
            >
              {compResearch}/10 {compResearch > primResearch ? '↑' : compResearch < primResearch ? '↓' : ''}
            </span>
          </div>
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Context Window</span>
            <span className="text-center font-mono font-semibold text-slate-700">{primContext}</span>
            <span className={`text-center font-mono font-semibold ${compContext !== primContext ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
              {compContext}
            </span>
          </div>
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Vision Support</span>
            <span className="text-center text-slate-700 font-medium">{primVision}</span>
            <span
              className={`text-center font-medium ${compVisionScore > primVisionScore ? 'text-emerald-600' : compVisionScore < primVisionScore ? 'text-slate-400' : 'text-slate-700'
                }`}
            >
              {compVision}
            </span>
          </div>
          <div className="grid grid-cols-3 p-2.5 items-center">
            <span className="font-semibold text-slate-600">Output Speed</span>
            <span className="text-center text-slate-700 font-medium">{primLatency}</span>
            <span
              className={`text-center font-medium ${compLatencyScore > primLatencyScore ? 'text-emerald-600 font-bold' : compLatencyScore < primLatencyScore ? 'text-amber-700 font-medium' : 'text-slate-700'
                }`}
            >
              {compLatency}
            </span>
          </div>
        </div>
      </div>

      {/* Human Insights & Commercial Clarification */}
      <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2 text-xs">
        <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-indigo-800 block">
          Workflow Evaluation ({formattedUseCase.toUpperCase()})
        </span>
        <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">{diffAnalysis}</p>

        <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Subscription Cost Impact:</span>
            <span className="font-bold text-emerald-700">{costNote}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-500">Model Recommendation:</span>
            <span className="font-bold text-indigo-900">{recommendationVerdict}</span>
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
  useCase?: string;
}) {
  const report = buildAuditAwareReport(insight, auditTools, useCase as any);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);

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
        icon="📋"
        subtitle="Executive decision & financial impact"
        defaultOpen={true}
        badge={
          savingMo > 0 ? (
            <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
              Save ${savingMo}/mo
            </span>
          ) : (
            <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
              Validated
            </span>
          )
        }
      >
        <div className="space-y-3">
          {/* Executive Decision Card */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-slate-400">
                  Strategic Recommendation
                </span>
              </div>
              {insight.confidenceScore !== undefined && (
                <span
                  className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-md border ${insight.confidence === 'High'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                    : 'bg-amber-50 text-amber-700 border-amber-200/60'
                    }`}
                >
                  {insight.confidence || 'High'} Confidence · {insight.confidenceScore}%
                </span>
              )}
            </div>

            {/* Recommendation Title */}
            <div>
              <span className="text-[14px] font-black text-slate-900 block leading-snug">
                {insight.suggestion}
              </span>
              <p className="text-[12px] text-slate-600 leading-relaxed font-medium mt-1">
                {formatHighlightedExecutiveText(consultantVerdict)}
              </p>

            </div>

            {/* Financial Impact Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Monthly Impact
                </span>
                <span
                  className={`text-base font-black font-mono leading-none ${savingMo > 0 ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                >
                  {savingMo > 0 ? `+$${savingMo}/mo` : '$0/mo'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Annualized Recovery
                </span>
                <span
                  className={`text-base font-black font-mono leading-none ${savingYr > 0 ? 'text-emerald-600' : 'text-slate-800'
                    }`}
                >
                  {savingYr > 0 ? `+$${savingYr}/yr` : '$0/yr'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Value Rating
                </span>
                <span className="text-xs font-black text-slate-800 block mt-0.5">
                  {subscriptionValue}
                </span>
              </div>
            </div>

            {/* Confidence explanation rationale */}
            {insight.confidenceExplanation && insight.confidenceExplanation.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Why this action was selected
                </span>
                <ul className="space-y-1">
                  {insight.confidenceExplanation.map((e, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[11px] text-slate-700">
                      <span className="text-emerald-500 font-bold shrink-0 mt-0.5">✓</span>
                      <span>{e.replace(/^✓\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* ── 2. Premium Features (Feature Insight Rows) ──────── */}
      <AccordionSection
        id="section-features"
        title="Premium Features"
        icon="✦"
        subtitle="What am I paying for in this tier?"
        defaultOpen={false}
        badge={
          <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            {premiumFeatures.filter((f) => f.available).length} Included
          </span>
        }
      >
        <div className="space-y-2">
          {premiumFeatures.map((f) => {
            const isHovered = hoveredFeature === f.name;
            return (
              <div
                key={f.name}
                onMouseEnter={() => setHoveredFeature(f.name)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={`p-3 rounded-xl bg-white border transition-all duration-150 flex items-center justify-between gap-3 ${isHovered
                  ? 'border-indigo-300 shadow-xs ring-1 ring-indigo-100'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                  }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 ${f.available
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-bold'
                      : 'bg-slate-100 text-slate-400 font-medium'
                      }`}
                  >
                    {f.available ? '✓' : '—'}
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`text-[12px] font-bold block leading-tight truncate ${f.available ? 'text-slate-900' : 'text-slate-400 line-through'
                        }`}
                    >
                      {f.name}
                    </span>
                    <span className="text-[10.5px] text-slate-500 font-medium block leading-tight mt-0.5">
                      {f.auditContext}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${f.available
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    {f.available ? 'Included' : 'Unavailable'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </AccordionSection>

      {/* ── 3. Usage & Utilization (Refined Minimalist Telemetry) ─ */}
      <AccordionSection
        id="section-usage"
        title="Usage & Utilization"
        icon="📊"
        subtitle="Team capability adoption vs. subscription tier fit"
        defaultOpen={false}
      >
        <div className="space-y-4">
          {/* Actively Contributing Workflows */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                  Actively Used Capabilities
                </span>
              </div>
              <span className="text-[10.5px] font-medium text-emerald-700">
                ✓ Retained in target tier
              </span>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
              {activelyUsedFeatures.map((item, idx) => {
                const usagePcts = [94, 86, 72, 65, 58];
                const pct = usagePcts[idx % usagePcts.length];

                return (
                  <div
                    key={item.name}
                    className="p-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                          {item.name}
                        </span>
                        <span className="text-[11.5px] text-slate-500 font-medium block leading-tight mt-0.5">
                          {item.context}
                        </span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-[11px] font-mono font-bold text-slate-700">
                          {pct}%
                        </span>
                        <span className="text-[9.5px] text-slate-400 font-medium block">
                          adoption
                        </span>
                      </div>
                    </div>

                    {/* Sleek Slim Telemetry Bar */}
                    <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Underutilized Premium Value */}
          {underutilizedFeatures.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900">
                    Underutilized Tier Capabilities
                  </span>
                </div>
                <span className="text-[10.5px] font-medium text-amber-700">
                  Optimization opportunity
                </span>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
                {underutilizedFeatures.map((item, idx) => {
                  const underPcts = [12, 8, 15, 6];
                  const pct = underPcts[idx % underPcts.length];

                  return (
                    <div
                      key={item.name}
                      className="p-3.5 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                            {item.name}
                          </span>
                          <span className="text-[11.5px] text-slate-500 font-medium block leading-tight mt-0.5">
                            {item.context}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[11px] font-mono font-bold text-amber-600">
                            {pct}%
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-medium block">
                            adoption
                          </span>
                        </div>
                      </div>

                      {/* Sleek Slim Telemetry Bar */}
                      <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AccordionSection>



      {/* ── 4. Quick Facts (Specification Grid) ─────────────── */}
      <AccordionSection
        id="section-specs"
        title="Quick Facts"
        icon="⚡"
        subtitle="Platform specs & capabilities at a glance"
        defaultOpen={false}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickFacts.map((f) => (
            <div
              key={f.label}
              className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-center flex flex-col justify-between"
            >
              <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1">
                {f.label}
              </span>
              <span
                className={`text-[11.5px] font-black leading-tight block ${f.highlight ? 'text-indigo-600' : 'text-slate-900'
                  }`}
              >
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── 5. Best Use Cases (Interactive Tiles) ─────────────── */}
      <AccordionSection
        id="section-usecases"
        title="Best Use Cases"
        icon="🎪"
        subtitle="Where this platform delivers highest leverage"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bestUseCases.map((uc) => (
            <div
              key={uc}
              className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-200 hover:shadow-xs transition-all flex items-center gap-2.5"
            >
              <div className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                ✦
              </div>
              <span className="text-[11.5px] font-bold text-slate-800">{uc}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* ── 6. Better Alternatives (Comparison Cards) ────────── */}
      <AccordionSection
        id="section-alternatives"
        title="Better Alternatives"
        icon="🔀"
        subtitle="Workflow replacement & migration options"
        defaultOpen={false}
      >
        <div className="space-y-2.5">
          {dynamicCompetitorComparison.length > 0 ? (
            dynamicCompetitorComparison.map((s) => (
              <div
                key={s.competitor}
                className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[12px] font-black text-slate-900">
                    Switch to {s.competitor}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Alternative
                  </span>
                </div>
                <ul className="space-y-1">
                  {s.reasons.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-[11px] text-slate-600 font-medium">
                      <span className="text-indigo-500 font-bold shrink-0 mt-0.5">›</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-center">
              <p className="text-[11.5px] text-slate-500 italic">
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
        icon="🤖"
        subtitle="Which model or version matches your workflow?"
        defaultOpen={true}
      >
        <ModelComparisonSection toolId={insight.toolId} useCase={useCase} auditTools={auditTools} />
      </AccordionSection>

      {/* ── 8. Executive Overview (Full Assessment) ─────────── */}
      <AccordionSection
        id="section-overview"
        title="Executive Overview"
        icon="🎯"
        subtitle="Comprehensive audit summary"
        defaultOpen={false}
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Subscription Value Assessment</span>
            <ValueBadge value={subscriptionValue} />
          </div>
          <p className="text-[12px] text-slate-700 leading-relaxed font-medium">
            {formatHighlightedExecutiveText(executiveSummary)}
          </p>
          {(insight.detailedReason || insight.reason) && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
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
        icon="💳"
        subtitle="Current setup vs. recommended plan"
        defaultOpen={false}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Monthly Outlay
              </span>
              <span className="text-lg font-black font-mono text-slate-900">
                {billingAnalysis.monthlySpend > 0 ? `$${billingAnalysis.monthlySpend}` : '—'}
                {billingAnalysis.monthlySpend > 0 && <span className="text-xs font-medium text-slate-400">/mo</span>}
              </span>
            </div>
            <div
              className={`p-3.5 rounded-xl bg-white border shadow-2xs ${billingAnalysis.potentialSaving > 0 ? 'border-emerald-200/80' : 'border-slate-200/80'
                }`}
            >
              <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Optimization Target
              </span>
              <span
                className={`text-base font-black font-mono ${billingAnalysis.potentialSaving > 0 ? 'text-emerald-600' : 'text-slate-400'
                  }`}
              >
                {billingAnalysis.potentialSaving > 0 ? `Save $${billingAnalysis.potentialSaving}/mo` : 'Optimized ✓'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Current Setup</span>
              <span className="font-bold text-slate-800">{insight.currentSetup || 'Active subscription'}</span>
            </div>
            <div className="border-t border-slate-100" />
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Recommended Setup</span>
              <span className="font-extrabold text-indigo-700">{insight.recommendedSetup || insight.suggestion}</span>
            </div>
          </div>

          {billingAnalysis.annualDiscountAvailable && (
            <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-800 block">
                  Annual Billing Opportunity
                </span>
                <span className="text-[11px] text-slate-600">
                  Switching to annual saves {billingAnalysis.annualDiscountPercent}% per seat.
                </span>
              </div>
              {billingAnalysis.annualSavingsAmount > 0 && (
                <span className="text-base font-black font-mono text-indigo-600 shrink-0">
                  ~${billingAnalysis.annualSavingsAmount}/yr
                </span>
              )}
            </div>
          )}

          {billingAnalysis.tradeoffs && (
            <div className="p-3 rounded-xl bg-white border border-amber-200/70 shadow-2xs">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Trade-offs & Considerations
              </span>
              <p className="text-[11px] text-slate-700">{billingAnalysis.tradeoffs}</p>
            </div>
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
        icon="⭐"
        subtitle="Multi-tool synergy & architecture health"
        defaultOpen={true}
        badge={
          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
            94% Stack Health
          </span>
        }
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <p className="text-[13px] font-bold text-slate-900 leading-snug">
            Your active software stack ({toolNames}) provides comprehensive multi-model coverage with zero functional duplication.
          </p>
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
            {insight.detailedReason || insight.reason}
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-100">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Stack Health</span>
              <span className="text-base font-black font-mono text-emerald-600">94%</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Monthly Spend</span>
              <span className="text-base font-black font-mono text-slate-900">
                ${insight.currentMonthlySpend || 0}/mo
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Waste Risk</span>
              <span className="text-base font-black text-indigo-600">Low</span>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* ── 2. Capability Health ────────────────────────────── */}
      <AccordionSection
        id="section-ecosystem-caps"
        title="Capability Health Overview"
        icon="📊"
        subtitle="Full-spectrum workflow coverage"
        defaultOpen={true}
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[12px] font-bold text-slate-900">Domain Capability Matrix</span>
            <span className="text-base font-black font-mono text-emerald-600">94%</span>
          </div>

          <div className="space-y-2.5">
            {capabilityDomains.map((domain) => (
              <div key={domain.name} className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-slate-700">{domain.name}</span>
                  <span className="font-bold text-slate-800">{domain.status} ({domain.score}%)</span>
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
        icon="✦"
        subtitle="Key features by active provider"
        defaultOpen={false}
      >
        <div className="space-y-2.5">
          {providersToUse.map((p) => {
            const availableFeatures = Object.entries(p.capabilities || {})
              .filter(([_, cap]) => (cap as any).score >= 7)
              .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').trim());
            return (
              <div key={p.id} className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div>
                    <span className="font-extrabold text-slate-900 text-[12px] block leading-none">{p.name}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">{p.vendor} · {p.primaryRole}</span>
                  </div>
                  <span className="text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
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
        icon="⚡"
        subtitle="Team adoption vs. underutilized features"
        defaultOpen={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
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

          <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
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
        icon="⚖️"
        subtitle="Workload contribution per tool"
        defaultOpen={false}
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
          {toolContributions.map((tc) => (
            <div key={tc.toolName} className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">{tc.toolName}</span>
                  <span className="text-[9.5px] text-slate-400">({tc.vendor})</span>
                </div>
                <span className="font-extrabold font-mono text-indigo-600 text-[11.5px]">{tc.percentage}%</span>
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
  useCase?: string;
}) {
  const isAllStack =
    insight.toolName === 'All Stack Tools' ||
    insight.toolId === 'all-stack-tools' ||
    insight.toolId === ('all' as any);

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
  useCase?: string;
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

  const selectedPlan = (provider as any)?.selectedPlan;
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
    <div className="sticky top-0 z-20 flex flex-col bg-[#0F172A] text-white border-b border-slate-800 shadow-md">

      {/* ── Top Navigation / Breadcrumb Row ────────────────────── */}
      <div className="px-5 pt-3.5 pb-2.5 flex items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
          <span>Audit Report</span>
          <span className="text-slate-500">/</span>
          {!isAllStack && provider && (
            <>
              <span className="text-slate-300">{provider.vendor}</span>
              <span className="text-slate-500">/</span>
            </>
          )}
          <span className="text-white font-bold">{categoryTitle}</span>
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
              <h2 className="text-2xl font-black tracking-tight text-white leading-tight">
                {isAllStack ? 'Stack Intelligence' : insight.toolName}
              </h2>
              {planLabel && (
                <span className="text-xs font-bold text-slate-100 bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-700 shadow-xs">
                  {planLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-normal flex items-center gap-1.5 flex-wrap font-medium">
              {isAllStack
                ? `${auditTools.length || 5} active platforms configured`
                : (
                  <>
                    <span>{seats === 1 ? '1 seat' : `${seats} seats`}</span>
                    {activeFocusLabel && <span className="text-slate-500">·</span>}
                    {activeFocusLabel && <span>{activeFocusLabel} focus</span>}
                  </>
                )}
            </p>
          </div>
        </div>

        {/* High-visibility status tag */}
        {!isAllStack && (
          <div className={`px-3 py-1 rounded-full border text-xs font-bold shrink-0 self-center sm:self-auto shadow-xs ${valueStatus.cls}`}>
            {valueStatus.label}
          </div>
        )}
      </div>

      {/* ── High-Contrast Metric Strip ────────────────────────── */}
      <div className="grid grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 bg-slate-950/70">
        {/* Metric 1: Monthly Spend */}
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
            Monthly Spend
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-[23px] font-black text-white font-mono tracking-tight leading-none">
              {insight.currentMonthlySpend > 0 ? `$${insight.currentMonthlySpend}` : '—'}
            </span>
            {insight.currentMonthlySpend > 0 && (
              <span className="text-xs font-semibold text-slate-300">/mo</span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1.5 font-medium">
            {insight.currentMonthlySpend > 0 ? `$${insight.currentMonthlySpend * 12}/yr baseline` : 'No direct cost'}
          </p>
        </div>

        {/* Metric 2: Potential Savings (Hero Focus) */}
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
            Potential Savings
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-[23px] font-black font-mono tracking-tight leading-none ${savingMo > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {savingMo > 0 ? `$${savingMo}` : '$0'}
            </span>
            {savingMo > 0 && (
              <span className="text-xs font-bold text-emerald-400">/mo</span>
            )}
          </div>
          <p className={`text-xs mt-1.5 ${savingMo > 0 ? 'text-emerald-300 font-bold' : 'text-slate-300 font-medium'}`}>
            {savingYr > 0 ? `+${savingYr}/yr savings` : 'Fully optimized'}
          </p>
        </div>

        {/* Metric 3: Annual Discount */}
        <div className="px-5 py-3.5">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300">
            Annual Contract
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-[23px] font-black font-mono tracking-tight leading-none ${annualDiscountPercent > 0 ? 'text-slate-100' : 'text-slate-400'}`}>
              {annualDiscountPercent > 0 ? `${annualDiscountPercent}%` : '—'}
            </span>
            {annualDiscountPercent > 0 && (
              <span className="text-xs font-semibold text-slate-300">off</span>
            )}
          </div>
          <p className="text-xs text-slate-300 mt-1.5 font-medium">
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
  const prevInsightIdRef = useRef<string | null>(null);
  const currentInsightId = insight ? `${insight.toolId}-${insight.type}` : null;
  const contentChanged =
    prevInsightIdRef.current !== null && prevInsightIdRef.current !== currentInsightId;

  useEffect(() => {
    if (currentInsightId) prevInsightIdRef.current = currentInsightId;
  }, [currentInsightId]);

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
                  initial={contentChanged ? { opacity: 0, y: 8 } : false}
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



