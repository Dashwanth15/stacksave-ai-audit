// ============================================================
// ProcurementIntelligenceDrawer — StackSave AI Platform
//
// DESIGN SYSTEM: Mirrors ToolIntelligencePanel from the Audit dashboard.
//   - bg-[#0C1526] dark header with breadcrumb + close button
//   - bg-[#0B1120] metric strip (3-col KPIs)
//   - AccordionSection for progressive disclosure
//   - Logo in white rounded-xl container
//   - Thin horizontal separators, no box-in-box nesting
//   - Spring animation entry, Escape key close
// ============================================================

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import type {
  StructuredStack,
  ToolInStack,
  RejectedAlternative
} from '../../types';
import ProviderLogo from '../ProviderLogo';

export type DrawerSelection =
  | {
      type: 'tool';
      tool: ToolInStack;
      isPrimary?: boolean;
      allRequirements?: string[];
      teamSize: number;
      budgetFormatted?: string;
    }
  | {
      type: 'evaluated';
      item: RejectedAlternative;
      primaryToolName?: string;
      teamSize: number;
    }
  | {
      type: 'stack';
      stack: StructuredStack;
      rankTitle: string;
      purposeLabel?: string;
      recommendedStack?: StructuredStack;
      teamSize: number;
      onApplyStack?: (stack: StructuredStack) => void;
    };

interface ProcurementIntelligenceDrawerProps {
  selection: DrawerSelection | null;
  onClose: () => void;
}

// ─── Drawer Section Icons (Consistent 15x15 SaaS icon family) ─────────────────

const DrawerSectionIcons = {
  decision: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" x2="8" y1="13" y2="13" />
      <line x1="16" x2="8" y1="17" y2="17" />
    </svg>
  ),
  requirements: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  strengths: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  gaps: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  ),
  synergy: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  pricing: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  tradeoffs: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  ),
  target: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  guidance: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  stackOverview: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
};

// ─── Accordion Section (mirrors ToolIntelligencePanel's AccordionSection) ─────

function AccordionSection({
  title,
  icon,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
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
      className={`transition-all duration-200 ${
        open
          ? 'bg-[#F8FAFC] border border-slate-200 rounded-xl mx-3.5 my-2 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border-l-2 border-l-slate-900'
          : 'border-b border-slate-150 hover:bg-slate-50/80'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between text-left transition-all duration-150 group cursor-pointer ${
          open ? 'p-4 pb-3' : 'py-3.5 px-5 hover:bg-slate-50/60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all duration-150 ${
              open
                ? 'bg-white border border-slate-200 shadow-sm text-indigo-600'
                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200/70 group-hover:text-slate-700'
            }`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-[13px] block leading-tight tracking-tight transition-colors duration-150 ${
                  open
                    ? 'font-black text-slate-900'
                    : 'font-semibold text-slate-700 group-hover:text-slate-900'
                }`}
              >
                {title}
              </span>
              {badge}
            </div>
            {subtitle && (
              <span
                className={`text-[11px] block mt-0.5 leading-tight transition-colors duration-150 ${
                  open
                    ? 'font-medium text-slate-500'
                    : 'font-medium text-slate-400 group-hover:text-slate-500'
                }`}
              >
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
            open
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

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function ProcurementIntelligenceDrawer({
  selection,
  onClose,
}: ProcurementIntelligenceDrawerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (selection) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [selection]);

  const selectionKey = selection
    ? selection.type === 'tool'
      ? `tool-${selection.tool.toolId}`
      : selection.type === 'evaluated'
      ? `eval-${selection.item.toolId}`
      : `stack-${selection.stack.tools.map(t => t.toolId).join('-')}`
    : null;

  return (
    <AnimatePresence>
      {selection && (
        <>
          {/* Backdrop */}
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          />

          {/* Panel */}
          <m.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white shadow-2xl border-l border-slate-200 w-full sm:w-[500px] lg:w-[45vw] xl:w-[42vw] max-w-[660px]"
            style={{ willChange: 'transform' }}
          >
            {/* Header — mirrors ToolIntelligencePanel PanelHeader */}
            <DrawerHeader selection={selection} onClose={onClose} />

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain bg-white"
              style={{ scrollbarWidth: 'thin' }}
            >
              <AnimatePresence mode="wait">
                <m.div
                  key={selectionKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  {selection.type === 'tool' && (
                    <ToolProcurementContent tool={selection.tool} teamSize={selection.teamSize} />
                  )}
                  {selection.type === 'evaluated' && (
                    <EvaluatedProviderContent
                      item={selection.item}
                      primaryToolName={selection.primaryToolName}
                      teamSize={selection.teamSize}
                    />
                  )}
                  {selection.type === 'stack' && (
                    <StackIntelligenceContent
                      stack={selection.stack}
                      rankTitle={selection.rankTitle}
                      purposeLabel={selection.purposeLabel}
                      recommendedStack={selection.recommendedStack}
                      teamSize={selection.teamSize}
                      onApply={selection.onApplyStack}
                      onClose={onClose}
                    />
                  )}
                </m.div>
              </AnimatePresence>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── DrawerHeader — mirrors bg-[#0C1526] PanelHeader ─────────────────────────

function DrawerHeader({
  selection,
  onClose,
}: {
  selection: DrawerSelection;
  onClose: () => void;
}) {
  // Determine breadcrumb and metrics
  let breadcrumb2: string;
  let breadcrumb3: string;
  let toolName: string;
  let planLabel: string;
  let seatCost: number;
  let teamCost: number;
  let fitScore: number;
  let teamSize: number;
  let logoId: string;
  let valueLabel: string;
  let valueCls: string;

  if (selection.type === 'tool') {
    const t = selection.tool;
    breadcrumb2 = t.vendor || 'Provider';
    breadcrumb3 = selection.isPrimary ? 'Primary Recommendation' : 'Supporting Tool';
    toolName = t.toolName;
    planLabel = t.recommendedPlan;
    seatCost = t.monthlyCostPerSeat;
    teamCost = t.estimatedMonthlyCostPerTeam;
    fitScore = t.workflowFitScore;
    teamSize = selection.teamSize;
    logoId = t.toolId;
    const fit = t.workflowFitScore;
    if (fit >= 85) { valueLabel = 'Strong Fit'; valueCls = 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'; }
    else if (fit >= 70) { valueLabel = 'Good Fit'; valueCls = 'bg-blue-500/20 text-blue-200 border-blue-500/40'; }
    else { valueLabel = 'Partial Fit'; valueCls = 'bg-amber-500/20 text-amber-200 border-amber-500/40'; }
  } else if (selection.type === 'evaluated') {
    const it = selection.item;
    breadcrumb2 = it.vendor || 'Provider';
    breadcrumb3 = 'Evaluated — Not Selected';
    toolName = it.toolName;
    planLabel = it.category.toUpperCase();
    seatCost = it.estimatedMonthlyCostPerSeat;
    teamCost = it.estimatedMonthlyCostPerSeat * selection.teamSize;
    fitScore = it.compositeScore;
    teamSize = selection.teamSize;
    logoId = it.toolId;
    valueLabel = 'Not Selected';
    valueCls = 'bg-rose-500/20 text-rose-200 border-rose-500/40';
  } else {
    const s = selection.stack;
    breadcrumb2 = `${s.tools.length} Tools`;
    breadcrumb3 = selection.rankTitle;
    toolName = s.tools.map(t => t.toolName).join(' + ');
    planLabel = '';
    seatCost = s.perSeatMonthlyCost;
    teamCost = s.estimatedMonthlyCost;
    fitScore = s.confidenceScore;
    teamSize = selection.teamSize;
    logoId = s.tools[0]?.toolId || '';
    valueLabel = selection.purposeLabel || selection.rankTitle;
    valueCls = 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40';
  }

  return (
    <div className="sticky top-0 z-20 flex flex-col bg-[#0C1526] text-white border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      {/* Breadcrumb Row */}
      <div className="px-5 pt-3 pb-2.5 flex items-center justify-between gap-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <span className="text-slate-500">Stack Advisor</span>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400">{breadcrumb2}</span>
          <span className="text-slate-700">/</span>
          <span className="text-slate-200 font-semibold">{breadcrumb3}</span>
        </div>
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

      {/* Tool Identity Row */}
      <div className="px-5 pt-4 pb-4 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-white border border-white/20 shadow-md p-2 flex items-center justify-center shrink-0">
            <ProviderLogo providerId={logoId} size="md" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h2 className="text-[18px] sm:text-[22px] font-black tracking-tight text-white leading-tight truncate max-w-[200px] sm:max-w-md">
                {toolName}
              </h2>
              {planLabel && (
                <span className="text-[11px] font-bold text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-md border border-white/[0.12]">
                  {planLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-normal font-medium">
              {teamSize} {teamSize === 1 ? 'seat' : 'seats'} · ${teamCost.toLocaleString()}/mo team total
            </p>
          </div>
        </div>

        {/* Value Status Tag */}
        <div className={`px-3 py-1.5 rounded-lg border text-[11px] font-extrabold shrink-0 self-center tracking-wide ${valueCls}`}>
          {valueLabel}
        </div>
      </div>

      {/* Metric Strip — mirrors bg-[#0B1120] strip */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/10 bg-[#0B1120]">
        <div className="px-5 py-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 leading-none">
            Seat Cost
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className="text-[22px] font-black text-white font-mono tracking-tight leading-none">
              ${seatCost}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 ml-0.5">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            ${seatCost * 12}/yr per seat
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 leading-none">
            Team Total
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className="text-[22px] font-black text-white font-mono tracking-tight leading-none">
              ${teamCost.toLocaleString()}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 ml-0.5">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            ${(teamCost * 12).toLocaleString()}/yr run-rate
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 leading-none">
            {selection.type === 'evaluated' ? 'Suitability' : 'Domain Fit'}
          </p>
          <div className="flex items-baseline gap-0.5 mt-2">
            <span className={`text-[22px] font-black font-mono tracking-tight leading-none ${
              fitScore >= 80 ? 'text-emerald-400' : fitScore >= 65 ? 'text-blue-400' : 'text-amber-400'
            }`}>
              {fitScore}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            for your workflow
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Procurement Content ─────────────────────────────────────────────────

function ToolProcurementContent({ tool, teamSize }: { tool: ToolInStack; teamSize: number }) {
  return (
    <div className="py-2 space-y-1 animate-fade-in text-slate-800">

      {/* 1. Procurement Decision */}
      <AccordionSection
        title="Procurement Decision"
        icon={DrawerSectionIcons.decision}
        subtitle="Why this tool was selected for your specific context"
        defaultOpen={true}
        badge={
          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800">
            {tool.buyingPriority === '01 PRIMARY' ? 'Primary Buy' :
             tool.buyingPriority === '02 SECONDARY' ? 'Secondary' :
             tool.buyingPriority === '03 OPTIONAL' ? 'Optional' : 'API Layer'}
          </span>
        }
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          {/* Role + Priority header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                Why Selected
              </span>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              tool.buyingPriority === '01 PRIMARY' ? 'bg-slate-900 text-white border-slate-800' :
              tool.buyingPriority === '02 SECONDARY' ? 'bg-slate-100 text-slate-700 border-slate-200' :
              'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {tool.priorityLabel || 'Recommended'}
            </span>
          </div>

          <p className="text-[13px] font-semibold text-slate-900 leading-snug">
            {tool.whyRecommended}
          </p>

          {/* Domain fit metrics */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">
                Domain Fit
              </span>
              <span className={`text-[15px] font-black font-mono leading-none block ${
                tool.workflowFitScore >= 80 ? 'text-emerald-600' : tool.workflowFitScore >= 65 ? 'text-indigo-600' : 'text-amber-600'
              }`}>
                {tool.workflowFitScore}%
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">
                Seat Cost
              </span>
              <span className="text-[15px] font-black font-mono leading-none block text-slate-900">
                ${tool.monthlyCostPerSeat}
              </span>
              <span className="text-[9px] font-medium text-slate-400">/mo</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">
                Plan Tier
              </span>
              <span className="text-[12px] font-black text-slate-800 block leading-tight mt-0.5">
                {tool.recommendedPlan}
              </span>
            </div>
          </div>

          {/* Procurement fit reasons */}
          {(tool.procurementFitReasons?.domainFit || tool.procurementFitReasons?.teamFit) && (
            <div className="pt-2.5 border-t border-slate-100 space-y-2">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 block">
                Fit Analysis
              </span>
              {tool.procurementFitReasons.domainFit && (
                <div className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                  <span className="text-emerald-500 font-extrabold shrink-0 mt-0.5 text-[10px]">✓</span>
                  <span>{tool.procurementFitReasons.domainFit}</span>
                </div>
              )}
              {tool.procurementFitReasons.teamFit && (
                <div className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                  <span className="text-emerald-500 font-extrabold shrink-0 mt-0.5 text-[10px]">✓</span>
                  <span>{tool.procurementFitReasons.teamFit}</span>
                </div>
              )}
              {tool.procurementFitReasons.budgetFit && (
                <div className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                  <span className="text-emerald-500 font-extrabold shrink-0 mt-0.5 text-[10px]">✓</span>
                  <span>{tool.procurementFitReasons.budgetFit}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </AccordionSection>

      {/* 2. Requirements Covered */}
      {tool.featuresCovered && tool.featuresCovered.length > 0 && (
        <AccordionSection
          title="Requirements Covered"
          icon={DrawerSectionIcons.requirements}
          subtitle="Exactly which requirements this tool satisfies"
          defaultOpen={false}
          badge={
            <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {tool.featuresCovered.length} Satisfied
            </span>
          }
        >
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 shadow-sm">
            {tool.featuresCovered.map((feat, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-200">
                    ✓
                  </span>
                  <span className="text-[12px] font-semibold text-slate-900 capitalize">
                    {feat.replace(/-/g, ' ')}
                  </span>
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 shrink-0">
                  Covered
                </span>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* 3. Capability Strengths */}
      {tool.capabilityHighlights && tool.capabilityHighlights.length > 0 && (
        <AccordionSection
          title="Capability Strengths"
          icon={DrawerSectionIcons.strengths}
          subtitle="Most relevant capabilities for your workflow"
          defaultOpen={false}
        >
          <div className="space-y-2">
            {tool.capabilityHighlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-white border border-slate-200 text-[11.5px] text-slate-700 leading-relaxed">
                <span className="text-indigo-500 font-bold shrink-0 mt-0.5">›</span>
                <span>{h}</span>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* 4. Capability Gaps */}
      {tool.missingCapabilities && tool.missingCapabilities.length > 0 && (
        <AccordionSection
          title="Capability Gaps"
          icon={DrawerSectionIcons.gaps}
          subtitle="What this tool does NOT cover — handled by other stack tools"
          defaultOpen={false}
        >
          <div className="space-y-1.5">
            {tool.missingCapabilities.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11.5px] text-slate-600 leading-relaxed">
                <span className="text-slate-400 font-bold shrink-0 mt-0.5 text-[10px]">—</span>
                <span>{c}</span>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* 5. Stack Synergy */}
      {tool.whatItComplements && (
        <AccordionSection
          title="Stack Synergy"
          icon={DrawerSectionIcons.synergy}
          subtitle="How it works with the rest of your stack"
          defaultOpen={false}
        >
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">
              {tool.whatItComplements}
            </p>
          </div>
        </AccordionSection>
      )}

      {/* 6. Plan Intelligence */}
      <AccordionSection
        title="Plan Intelligence"
        icon={DrawerSectionIcons.pricing}
        subtitle="Pricing, plan rationale, and seat model"
        defaultOpen={false}
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 shadow-sm">
          {[
            { label: 'Recommended Plan', val: `${tool.recommendedPlan} Tier`, bold: true },
            { label: 'Per-Seat Monthly', val: `$${tool.monthlyCostPerSeat}/user/mo`, bold: true },
            { label: `Team Total (${teamSize} seats)`, val: `$${tool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo`, bold: true },
            { label: 'Annual Run-Rate', val: `$${(tool.estimatedMonthlyCostPerTeam * 12).toLocaleString()}/yr`, bold: false },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="text-[12px] font-semibold text-slate-600">{row.label}</span>
              <span className={`text-[12px] font-mono ${row.bold ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                {row.val}
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* 7. Tradeoffs & Risks */}
      {(tool.mainTradeoff || (tool.procurementRisks && tool.procurementRisks.length > 0)) && (
        <AccordionSection
          title="Tradeoffs & Risks"
          icon={DrawerSectionIcons.tradeoffs}
          subtitle="What you give up and risks to consider"
          defaultOpen={false}
        >
          <div className="space-y-2.5">
            {tool.mainTradeoff && (
              <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-[11.5px] text-amber-950 leading-relaxed font-medium">
                {tool.mainTradeoff}
              </div>
            )}
            {tool.procurementRisks && tool.procurementRisks.length > 0 && (
              <div className="space-y-1.5">
                {tool.procurementRisks.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                    <span className="text-amber-500 font-extrabold shrink-0 mt-0.5 text-[10px]">!</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 8. Best For / Not Ideal For */}
      {(tool.bestFor || tool.notIdealFor) && (
        <AccordionSection
          title="Who Should Choose This"
          icon={DrawerSectionIcons.target}
          subtitle="Best for and when to look elsewhere"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {tool.bestFor && (
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-1.5">✓ Best For</span>
                <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">{tool.bestFor}</p>
              </div>
            )}
            {tool.notIdealFor && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-1.5">— Not Ideal For</span>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">{tool.notIdealFor}</p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 9. Purchase Guidance */}
      <AccordionSection
        title="Purchase Guidance"
        icon={DrawerSectionIcons.guidance}
        subtitle="Clear final recommendation for your team"
        defaultOpen={false}
      >
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-emerald-400">
              {tool.purchaseDecision?.replace(/_/g, ' ') || 'RECOMMENDED — BUY'}
            </span>
            <span className="font-mono font-black text-sm">${tool.monthlyCostPerSeat}/seat/mo</span>
          </div>
          <p className="text-[12px] text-slate-300 leading-relaxed">
            Procure <strong className="text-white">{tool.toolName} ({tool.recommendedPlan} Plan)</strong> for your {teamSize}-person team.
            Total monthly investment: <strong className="text-white">${tool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo</strong>.
          </p>
        </div>
      </AccordionSection>

    </div>
  );
}

// ─── Evaluated Provider Content ───────────────────────────────────────────────

function EvaluatedProviderContent({
  item,
  primaryToolName,
  teamSize,
}: {
  item: RejectedAlternative;
  primaryToolName?: string;
  teamSize: number;
}) {
  return (
    <div className="py-2 space-y-1 animate-fade-in text-slate-800">

      {/* 1. Evaluation Decision */}
      <AccordionSection
        title="Evaluation Decision"
        icon={DrawerSectionIcons.decision}
        subtitle="Why it was considered and why it wasn't selected"
        defaultOpen={true}
        badge={
          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100/80 text-rose-800">
            {item.rejectionBadge || 'Not Selected'}
          </span>
        }
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          {/* Why Considered */}
          {item.consideredFor && (
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 block mb-1.5">
                Why It Was Considered
              </span>
              <p className="text-[12px] text-slate-700 leading-relaxed font-medium">{item.consideredFor}</p>
            </div>
          )}

          {/* Main rejection reason — highlighted */}
          <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200/60">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-rose-600 block mb-1.5">
              Primary Rejection Reason
            </span>
            <p className="text-[12px] text-rose-950 leading-relaxed font-medium">{item.whyNotSelected}</p>
          </div>

          {/* Suitability score bar */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Suitability Score</span>
              <span className="font-mono font-black text-slate-900">{item.compositeScore}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${item.compositeScore >= 70 ? 'bg-indigo-500' : 'bg-rose-400'}`}
                style={{ width: `${item.compositeScore}%` }}
              />
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* 2. Head-to-Head */}
      <AccordionSection
        title={`Head-to-Head vs ${primaryToolName || 'Recommended Stack'}`}
        icon={DrawerSectionIcons.tradeoffs}
        subtitle="Where each tool wins and the deciding factor"
        defaultOpen={false}
      >
        <div className="space-y-2.5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
              Where {item.toolName} Wins
            </span>
            <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">
              {item.whereItWins || 'Competitive pricing and specialized model selection for certain use cases.'}
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/60 shadow-sm">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 block mb-2">
              Why {primaryToolName || 'Recommended Tool'} Won
            </span>
            <p className="text-[11.5px] text-emerald-950 leading-relaxed font-medium">
              {item.whyWinnerWon || 'Higher domain velocity, stronger requirement coverage, and better workflow alignment.'}
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* 3. What It Would Have Covered */}
      {item.wouldHaveCovered && item.wouldHaveCovered.length > 0 && (
        <AccordionSection
          title="Requirements It Covers"
          icon={DrawerSectionIcons.requirements}
          subtitle="Features this tool would have satisfied"
          defaultOpen={false}
        >
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100">
            {item.wouldHaveCovered.map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span className="text-[12px] font-semibold text-slate-700 capitalize">{feat.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </AccordionSection>
      )}

      {/* 4. Best For / Not Ideal For */}
      {(item.bestFor || item.notIdealFor) && (
        <AccordionSection
          title="When To Choose This Instead"
          icon={DrawerSectionIcons.target}
          subtitle="Scenarios where this tool is the better choice"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {item.bestFor && (
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 block mb-1.5">Best For</span>
                <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">{item.bestFor}</p>
              </div>
            )}
            {item.notIdealFor && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block mb-1.5">Not Ideal For</span>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">{item.notIdealFor}</p>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 5. Pricing Reference */}
      <AccordionSection
        title="Pricing Reference"
        icon={DrawerSectionIcons.pricing}
        subtitle="Cost comparison with the recommended stack"
        defaultOpen={false}
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 shadow-sm">
          {[
            { label: 'Base Seat Cost', val: `$${item.estimatedMonthlyCostPerSeat}/user/mo` },
            { label: `Team Total (${teamSize} seats)`, val: `$${(item.estimatedMonthlyCostPerSeat * teamSize).toLocaleString()}/mo` },
            { label: 'Annual Run-Rate', val: `$${(item.estimatedMonthlyCostPerSeat * teamSize * 12).toLocaleString()}/yr` },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-[12px] font-semibold text-slate-600">{row.label}</span>
              <span className="text-[12px] font-mono font-black text-slate-900">{row.val}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

    </div>
  );
}

// ─── Stack Intelligence Content ───────────────────────────────────────────────

function StackIntelligenceContent({
  stack,
  rankTitle,
  purposeLabel,
  recommendedStack,
  teamSize,
  onApply,
  onClose,
}: {
  stack: StructuredStack;
  rankTitle: string;
  purposeLabel?: string;
  recommendedStack?: StructuredStack;
  teamSize: number;
  onApply?: (stack: StructuredStack) => void;
  onClose: () => void;
}) {
  const costDelta = recommendedStack
    ? stack.estimatedMonthlyCost - recommendedStack.estimatedMonthlyCost
    : 0;

  return (
    <div className="py-2 space-y-1 animate-fade-in text-slate-800">

      {/* 1. Stack Overview */}
      <AccordionSection
        title="Stack Overview"
        icon={DrawerSectionIcons.stackOverview}
        subtitle={`${rankTitle} · ${purposeLabel || 'Alternative Architecture'}`}
        defaultOpen={true}
        badge={
          <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800">
            {stack.tools.length} Tools
          </span>
        }
      >
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          {/* Rationale */}
          {stack.whyThisStack && (
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-400 block mb-1.5">
                Why This Architecture
              </span>
              <p className="text-[12px] text-slate-800 leading-relaxed font-semibold">{stack.whyThisStack}</p>
            </div>
          )}

          {/* Financial comparison vs recommended */}
          {recommendedStack && costDelta !== 0 && (
            <div className={`p-2.5 rounded-lg border ${costDelta < 0 ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'}`}>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className={`font-semibold ${costDelta < 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                  vs #1 Recommendation:
                </span>
                <span className={`font-mono font-black ${costDelta < 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {costDelta < 0
                    ? `Saves $${Math.abs(costDelta).toLocaleString()}/mo (${Math.round((Math.abs(costDelta) / Math.max(1, recommendedStack.estimatedMonthlyCost)) * 100)}% cheaper)`
                    : `+$${costDelta.toLocaleString()}/mo more`}
                </span>
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">Per Seat</span>
              <span className="text-[15px] font-black font-mono leading-none block text-slate-900">
                ${stack.perSeatMonthlyCost}
              </span>
              <span className="text-[9px] font-medium text-slate-400">/mo</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">Team Total</span>
              <span className="text-[15px] font-black font-mono leading-none block text-slate-900">
                ${stack.estimatedMonthlyCost.toLocaleString()}
              </span>
              <span className="text-[9px] font-medium text-slate-400">/mo</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-400 block mb-1">Match</span>
              <span className={`text-[15px] font-black font-mono leading-none block ${
                stack.confidenceScore >= 80 ? 'text-emerald-600' : stack.confidenceScore >= 65 ? 'text-indigo-600' : 'text-amber-600'
              }`}>
                {stack.confidenceScore}%
              </span>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* 2. Architecture Composition */}
      <AccordionSection
        title="Architecture Composition"
        icon={DrawerSectionIcons.synergy}
        subtitle="Tool roles and division of responsibility"
        defaultOpen={true}
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 shadow-sm">
          {stack.tools.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-3 hover:bg-slate-50/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                <ProviderLogo providerId={t.toolId} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-slate-900">{t.toolName}</span>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.3 rounded ${
                    t.buyingPriority === '01 PRIMARY' ? 'bg-slate-900 text-white' :
                    t.buyingPriority === '02 SECONDARY' ? 'bg-slate-100 text-slate-700' :
                    'bg-emerald-50 text-emerald-700'
                  }`}>
                    {t.buyingPriority?.replace(/^\d+\s/, '') || t.role?.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-400">({t.recommendedPlan})</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t.whyRecommended}</p>
              </div>
              <span className="font-mono font-black text-[12px] text-slate-900 shrink-0 ml-2">
                ${t.monthlyCostPerSeat}/seat
              </span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* 3. Advantages & Tradeoffs */}
      {((stack.advantages?.length || 0) > 0 || (stack.tradeoffs?.length || 0) > 0) && (
        <AccordionSection
          title="Advantages & Tradeoffs"
          icon={DrawerSectionIcons.tradeoffs}
          subtitle="What you gain and what you give up"
          defaultOpen={false}
        >
          <div className="space-y-3">
            {stack.advantages && stack.advantages.length > 0 && (
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 block mb-2">What You Gain</span>
                <ul className="space-y-1.5">
                  {stack.advantages.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11.5px] text-slate-700 leading-relaxed">
                      <span className="text-emerald-500 font-extrabold shrink-0 mt-0.5 text-[10px]">✓</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {stack.tradeoffs && stack.tradeoffs.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2">Tradeoffs</span>
                <ul className="space-y-1.5">
                  {stack.tradeoffs.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11.5px] text-slate-600 leading-relaxed">
                      <span className="text-slate-400 font-bold shrink-0 mt-0.5">—</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 4. Financial Summary */}
      <AccordionSection
        title="Financial Summary"
        icon={DrawerSectionIcons.pricing}
        subtitle="Full cost breakdown and annual run-rate"
        defaultOpen={false}
      >
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white divide-y divide-slate-100 shadow-sm">
          {[
            { label: `Per Seat (${teamSize} seats)`, val: `$${stack.perSeatMonthlyCost}/user/mo` },
            { label: 'Team Monthly', val: `$${stack.estimatedMonthlyCost.toLocaleString()}/mo` },
            { label: 'Annual Run-Rate', val: `$${stack.estimatedAnnualCost.toLocaleString()}/yr` },
            ...(recommendedStack && costDelta !== 0 ? [{
              label: 'Delta vs Recommended',
              val: costDelta < 0 ? `-$${Math.abs(costDelta).toLocaleString()}/mo (cheaper)` : `+$${costDelta.toLocaleString()}/mo (premium)`,
            }] : []),
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-3.5 py-2.5">
              <span className="text-[12px] font-semibold text-slate-600">{row.label}</span>
              <span className="text-[12px] font-mono font-black text-slate-900">{row.val}</span>
            </div>
          ))}
        </div>
      </AccordionSection>

      {/* 5. Best For */}
      {stack.bestFor && (
        <AccordionSection
          title="Who Should Choose This"
          icon={DrawerSectionIcons.target}
          subtitle="The ideal buyer for this architecture"
          defaultOpen={false}
        >
          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium">{stack.bestFor}</p>
          </div>
        </AccordionSection>
      )}

      {/* Apply Action */}
      {onApply && (
        <div className="px-5 py-4 border-t border-slate-100">
          <button
            onClick={() => { onApply(stack); onClose(); }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Set as Active Architecture Selection</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
