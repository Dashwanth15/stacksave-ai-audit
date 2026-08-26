// ============================================================
// Build AI Stack Results Page — StackSave AI Platform
//
// Premium SaaS Procurement Intelligence Dashboard:
//   - Interactive Strategy Architecture Switcher (Best Overall, Best Value, Max Performance, Enterprise Security)
//   - Clear 4-tier procurement hierarchy (01 PRIMARY, 02 SECONDARY, 03 OPTIONAL, 04 API LAYER)
//   - Real-time budget compliance indicators and over-budget advisory guidance
//   - Horizontal Alternative Architecture Carousel (6-10 diverse paid configurations)
//   - Deep Requirement Coverage Verification matrix
//   - 7-Factor Procurement Decision Intelligence breakdown
//   - Team Scaling Simulation with Enterprise upgrade triggers
//   - Filterable "Why Not Selected?" competitive intelligence table
//   - Deep right-side intelligence drawer for tools & stacks
//   - One-click Executive Brief copy & Print / PDF export
// ============================================================

import type { ReactNode } from 'react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import type {
  StackRecommendation,
  CategoryResult,
  StructuredStack,
  ToolInStack,
  AlternativeStackComparison
} from '../types';
import Logo from '../components/Logo';
import ProviderLogo from '../components/ProviderLogo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import ProcurementIntelligenceDrawer from '../components/intelligence/ProcurementIntelligenceDrawer';
import type { DrawerSelection } from '../components/intelligence/ProcurementIntelligenceDrawer';
import RecommendationReveal, { getProviderRole } from '../components/build-stack/RecommendationReveal';

type StrategyKey = 'bestOverall' | 'bestValue' | 'bestPerformance' | 'bestEnterprise';

interface StrategyTabConfig {
  key: StrategyKey;
  icon: (props: { className?: string }) => ReactNode;
}

const STRATEGY_CONFIGS: StrategyTabConfig[] = [
  {
    key: 'bestOverall',
    icon: ({ className = 'w-4 h-4' }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-8-6l8 6 8-6M4 9l8-6 8 6" />
      </svg>
    ),
  },
  {
    key: 'bestValue',
    icon: ({ className = 'w-4 h-4' }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'bestPerformance',
    icon: ({ className = 'w-4 h-4' }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: 'bestEnterprise',
    icon: ({ className = 'w-4 h-4' }: { className?: string }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  }
];

export default function BuildStackResultsPage() {
  const navigate = useNavigate();
  const [rec] = useState<StackRecommendation | null>(() => {
    const raw = sessionStorage.getItem('stackRecommendation');
    if (!raw) return null;
    try { return JSON.parse(raw) as StackRecommendation; } catch { return null; }
  });

  const initialStrategyKey = useMemo<StrategyKey>(() => {
    const strategy = rec?.userContextSummary?.strategy;
    if (strategy === 'best-value') return 'bestValue';
    if (strategy === 'max-performance') return 'bestPerformance';
    if (strategy === 'enterprise-security') return 'bestEnterprise';
    return 'bestOverall';
  }, [rec]);

  const [selectedStrategyKey, setSelectedStrategyKey] = useState<StrategyKey>(initialStrategyKey);
  const [customActiveStack, setCustomActiveStack] = useState<StructuredStack | null>(null);
  const [growthView, setGrowthView] = useState<'2x' | '5x' | '10x'>('2x');
  const [showEvaluated, setShowEvaluated] = useState(false);
  const [evaluatedFilter, setEvaluatedFilter] = useState<string>('ALL');
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const altScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rec) navigate('/build-stack', { replace: true });
  }, [rec, navigate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  if (!rec) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-slate-500 gap-3">
        <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Generating your recommendations…</p>
      </div>
    );
  }

  const context = rec.userContextSummary;
  const currentCategory: CategoryResult | undefined = rec.categories?.[selectedStrategyKey] || rec.categories?.bestOverall;
  const activeStack: StructuredStack = customActiveStack || currentCategory?.recommendedStack || currentCategory?.rank1 || rec.stacks.bestOverall;

  const stackTools: ToolInStack[] = activeStack.tools || [];
  const primaryTool = activeStack.primary || stackTools.find(t => t.buyingPriority === '01 PRIMARY') || stackTools[0];
  const secondaryTool = activeStack.secondary || stackTools.find(t => t.buyingPriority === '02 SECONDARY' && t.toolId !== primaryTool?.toolId);
  const optionalTools = stackTools.filter(t => t.buyingPriority === '03 OPTIONAL' && t.toolId !== primaryTool?.toolId && t.toolId !== secondaryTool?.toolId);
  const apiTools = stackTools.filter(t => t.buyingPriority === '04 API LAYER' && t.toolId !== primaryTool?.toolId && t.toolId !== secondaryTool?.toolId);

  const comparisons: AlternativeStackComparison[] = currentCategory?.alternativeComparisons || [];
  const growthSim = activeStack.growthSimulation || rec.stacks.bestOverall.growthSimulation;

  const teamSize = context?.teamSize || 1;
  const monthlyBudget = rec.trace && typeof rec.trace === 'object' && 'inputs' in rec.trace
    ? (rec.trace as any).inputs?.monthlyBudget
    : (context?.budgetFormatted && context.budgetFormatted !== 'No Hard Limit' ? parseInt(context.budgetFormatted.replace(/\D/g, ''), 10) : null);

  const isOverBudget = activeStack.budgetStatus === 'over';
  const budgetOverrun = isOverBudget && monthlyBudget !== null ? activeStack.estimatedMonthlyCost - monthlyBudget : 0;

  const scrollAlts = (direction: 'left' | 'right') => {
    if (!altScrollRef.current) return;
    const scrollAmount = 360;
    altScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  const openToolDrawer = (tool: ToolInStack, isPrimary = false) => {
    setDrawerSelection({
      type: 'tool',
      tool,
      isPrimary,
      teamSize,
      budgetFormatted: context?.budgetFormatted
    });
  };

  const openStackDrawer = (alt: AlternativeStackComparison, matchedStack?: StructuredStack) => {
    if (!matchedStack) return;
    setDrawerSelection({
      type: 'stack',
      stack: matchedStack,
      rankTitle: alt.rankTitle,
      purposeLabel: alt.purposeLabel,
      recommendedStack: currentCategory?.recommendedStack,
      teamSize,
      onApplyStack: (applied) => {
        setCustomActiveStack(applied);
        showToast(`Applied "${alt.rankTitle}" as active architecture.`);
      }
    });
  };

  const copyExecutiveBrief = () => {
    const lines = [
      `============================================================`,
      `STACKSAVE AI PROCUREMENT SPECIFICATION — EXECUTIVE BRIEF`,
      `============================================================`,
      `Domain Workflow : ${context?.domainLabel || 'Custom Workflow'}`,
      `Team Scale      : ${teamSize} Seats`,
      `Procurement Goal: ${currentCategory?.title || selectedStrategyKey}`,
      `Monthly Spend   : $${activeStack.estimatedMonthlyCost.toLocaleString()}/mo ($${activeStack.perSeatMonthlyCost}/seat/mo)`,
      `Annual Run-Rate : $${activeStack.estimatedAnnualCost.toLocaleString()}/yr`,
      `Match Score     : ${activeStack.confidenceScore}% (Requirements Met: ${activeStack.coverageResult.coverageScore}%)`,
      `Budget Status   : ${activeStack.budgetStatus.toUpperCase()}${isOverBudget ? ` (+$${budgetOverrun}/mo over ceiling)` : ''}`,
      ``,
      `ARCHITECTURE COMPOSITION:`,
      `01 PRIMARY   : ${primaryTool?.toolName} (${primaryTool?.recommendedPlan}) — $${primaryTool?.estimatedMonthlyCostPerTeam.toLocaleString()}/mo`,
      secondaryTool ? `02 SECONDARY : ${secondaryTool.toolName} (${secondaryTool.recommendedPlan}) — $${secondaryTool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo` : `02 SECONDARY : None (Single-tool unified workspace)`,
      ...optionalTools.map(t => `03 OPTIONAL  : ${t.toolName} (${t.recommendedPlan}) — $${t.estimatedMonthlyCostPerTeam.toLocaleString()}/mo`),
      ...apiTools.map(t => `04 API LAYER : ${t.toolName} (${t.recommendedPlan}) — $${t.estimatedMonthlyCostPerTeam.toLocaleString()}/mo`),
      ``,
      `STRATEGIC RATIONALE:`,
      `${activeStack.whyThisStack || 'Optimal configuration for domain execution velocity and requirement coverage.'}`,
      `============================================================`,
      `Generated by StackSave AI Procurement Engine · ${new Date().toLocaleDateString()}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Executive procurement brief copied to clipboard!');
  };

  const stackToolNames = useMemo(() => {
    const names: string[] = [];
    if (primaryTool) names.push(primaryTool.toolName);
    if (secondaryTool) names.push(secondaryTool.toolName);
    optionalTools.forEach(t => names.push(t.toolName));
    apiTools.forEach(t => names.push(t.toolName));
    return names;
  }, [primaryTool, secondaryTool, optionalTools, apiTools]);

  const recommendationRevealKey = `${selectedStrategyKey}-${customActiveStack?.canonicalSignature ?? 'default'}-${activeStack.estimatedMonthlyCost}-${activeStack.confidenceScore}-${activeStack.coverageResult.coverageScore}`;

  const filteredAlternatives = useMemo(() => {
    if (evaluatedFilter === 'ALL') return rec.alternatives;
    return rec.alternatives.filter(a => a.rejectionCategory === evaluatedFilter);
  }, [rec.alternatives, evaluatedFilter]);

  const rejectionCategories = useMemo(() => {
    const cats = new Set<string>();
    rec.alternatives.forEach(a => {
      if (a.rejectionCategory) cats.add(a.rejectionCategory);
    });
    return Array.from(cats);
  }, [rec.alternatives]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-800 antialiased font-sans">
      <ProcurementIntelligenceDrawer
        selection={drawerSelection}
        onClose={() => setDrawerSelection(null)}
      />
      <AnimatePresence>
        {toastMessage && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs font-bold font-sans"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{toastMessage}</span>
          </m.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md border-slate-200 shadow-2xs">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="focus:outline-none flex items-center gap-2 cursor-pointer">
              <Logo size="md" asDiv />
            </button>
            <span className="hidden lg:inline-block text-slate-300 font-light">|</span>
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span className="text-slate-900 font-extrabold">{context?.domainLabel}</span>
              <span>·</span>
              <span>{teamSize} {teamSize === 1 ? 'Seat' : 'Seats'}</span>
              <span>·</span>
              <span>{context?.budgetFormatted}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={copyExecutiveBrief}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-2xs cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy Brief</span>
            </button>

            <button
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-2xs cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Export PDF</span>
            </button>

            <OfferNotificationBell />

            <button
              onClick={() => navigate('/build-stack')}
              className="text-xs font-extrabold text-slate-900 hover:text-indigo-600 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all bg-white shadow-2xs cursor-pointer"
            >
              ← Edit Specs
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6">
        {/* ── Page Header: Executive Summary Hero (0ms stagger) ── */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="pb-6 border-b border-slate-200/80"
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0">
              {customActiveStack && (
                <>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Custom Stack Applied
                  </span>
                </>
              )}

              <h1 className="text-2xl sm:text-[1.85rem] font-bold text-slate-950 tracking-tight leading-tight">
                Your Recommended AI Stack
              </h1>

              {context && (
                <div className="mt-3.5 flex items-stretch gap-0 divide-x divide-slate-200 border border-slate-200/90 rounded-xl overflow-hidden bg-white w-fit shadow-xs">
                  <div className="px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 block leading-none mb-1.5">Operating Domain</span>
                    <span className="text-[14px] font-extrabold text-slate-950 leading-none">{context.domainLabel}</span>
                  </div>
                  <div className="px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 block leading-none mb-1.5">Team Scale</span>
                    <span className="text-[14px] font-extrabold text-slate-950 leading-none tabular-nums">{teamSize} {teamSize === 1 ? 'Seat' : 'Seats'}</span>
                  </div>
                  <div className="px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 block leading-none mb-1.5">Monthly Budget</span>
                    <span className="text-[14px] font-extrabold text-slate-950 leading-none tabular-nums">{context.budgetFormatted}</span>
                  </div>
                  <div className="px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 block leading-none mb-1.5">Your Requirements</span>
                    <span className="text-[14px] font-extrabold text-slate-950 leading-none tabular-nums">{context.requirementCount} Specified</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dark hero metrics panel */}
            <m.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.08, ease: 'easeOut' }}
              className="flex items-stretch gap-0 divide-x divide-white/10 rounded-2xl overflow-hidden shrink-0 shadow-lg border border-slate-900"
              style={{ background: 'linear-gradient(135deg, #0A1320 0%, #152A45 50%, #1E3A5F 100%)' }}
            >
              <div className="px-6 py-4.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 block leading-none mb-2">
                  Total Team Spend
                </span>
                <AnimatePresence mode="wait">
                  <m.div
                    key={activeStack.estimatedMonthlyCost}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-baseline gap-0.5"
                  >
                    <span className="text-sm font-bold text-white/50 mr-0.5">$</span>
                    <span className="text-[2rem] font-bold text-white leading-none tabular-nums font-sans">
                      {activeStack.estimatedMonthlyCost.toLocaleString()}
                    </span>
                    <span className="text-sm text-white/40 ml-0.5">/mo</span>
                  </m.div>
                </AnimatePresence>
                <span className="text-[11.5px] text-white/60 block mt-1.5 tabular-nums font-medium">
                  ${activeStack.perSeatMonthlyCost}/seat/mo · ${activeStack.estimatedAnnualCost.toLocaleString()}/yr
                </span>
              </div>
              <div className="px-6 py-4.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50 block leading-none mb-2">
                  Stack Fit
                </span>
                <AnimatePresence mode="wait">
                  <m.span
                    key={activeStack.confidenceScore}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="text-[2rem] font-bold text-emerald-400 leading-none tabular-nums block font-sans"
                  >
                    {activeStack.confidenceScore}%
                  </m.span>
                </AnimatePresence>
                <span className="text-[11.5px] text-emerald-400 font-semibold block mt-1.5 tabular-nums">
                  {activeStack.coverageResult.coverageScore}% Requirements Met
                </span>
              </div>
            </m.div>
          </div>
        </m.div>

        {/* ── Strategy Command Hub: Segmented Navigation Rail (160ms stagger) ── */}
        <m.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.16, ease: 'easeOut' }}
          className="space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#1E3A5F]">
                Procurement Strategies
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-600 font-medium">
                Select an architectural lens to balance execution speed, reasoning depth & cost
              </span>
            </div>
            {customActiveStack && (
              <button
                onClick={() => {
                  setCustomActiveStack(null);
                  showToast('Reset to default strategy recommendation.');
                }}
                className="text-xs font-bold text-[#1E3A5F] hover:underline transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>↺</span>
                <span>Reset to Default Recommendation</span>
              </button>
            )}
          </div>

          {/* Distinct Segmented Strategy Tab Rail */}
          <div className="bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/80 grid grid-cols-2 md:grid-cols-4 gap-1.5 shadow-2xs">
            {STRATEGY_CONFIGS.map((tab, idx) => {
              const isSelected = selectedStrategyKey === tab.key && !customActiveStack;
              const catData = rec.categories?.[tab.key];
              const title = catData?.title || 'Architecture';
              const badge = catData?.badge || 'Strategy';
              const cost = catData?.recommendedStack?.estimatedMonthlyCost ?? 0;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSelectedStrategyKey(tab.key);
                    setCustomActiveStack(null);
                  }}
                  className={`relative p-3.5 sm:p-4 rounded-xl text-left cursor-pointer transition-all duration-150 flex flex-col justify-between group select-none ${isSelected
                      ? 'bg-white shadow-sm border border-slate-300/90 text-slate-950 ring-2 ring-[#1E3A5F]/20'
                      : 'hover:bg-white/70 text-slate-700 hover:text-slate-950 border border-transparent'
                    }`}
                >
                  {isSelected && (
                    <m.div
                      layoutId="strategy-active-tab-glow"
                      className="absolute inset-0 rounded-xl bg-white -z-10 shadow-sm border border-slate-300/90"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}

                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${isSelected
                        ? 'bg-[#1E3A5F] text-white shadow-xs'
                        : 'bg-slate-300/70 text-slate-700 group-hover:bg-[#1E3A5F]/10 group-hover:text-[#1E3A5F]'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {badge && (
                      <span className={`text-[10px] font-black uppercase tracking-[0.1em] px-2.5 py-0.5 rounded-full transition-colors ${isSelected
                          ? 'bg-[#1E3A5F]/10 text-[#1E3A5F] border border-[#1E3A5F]/25'
                          : 'bg-slate-200/90 text-slate-600'
                        }`}>
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-0.5">
                    <span className="text-[10px] font-bold text-slate-600 block leading-none mb-1">
                      0{idx + 1}
                    </span>
                    <h3 className={`text-[14px] font-extrabold tracking-tight leading-snug transition-colors ${isSelected ? 'text-slate-950' : 'text-slate-800 group-hover:text-slate-950'
                      }`}>
                      {title}
                    </h3>
                    <div className="flex items-baseline gap-1 mt-1.5">
                      <span className={`text-xs tabular-nums font-black transition-colors ${isSelected ? 'text-[#1E3A5F]' : 'text-slate-600'
                        }`}>
                        ${cost.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-600 font-medium">/mo total</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </m.section>

        {/* ── Recommendation Reveal + Provider Stack ── */}
        <m.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.32, ease: 'easeOut' }}
          className="space-y-3"
        >
          <RecommendationReveal
            revealKey={recommendationRevealKey}
            strategyTitle={currentCategory?.title}
            strategyDescription={currentCategory?.description}
            domainLabel={context?.domainLabel || 'your'}
            toolNames={stackToolNames}
            monthlyCost={activeStack.estimatedMonthlyCost}
            alignmentScore={activeStack.confidenceScore}
            coverageScore={activeStack.coverageResult.coverageScore}
            deeperExplanation={activeStack.whyThisStack}
          />

          <div className="space-y-2.5 pt-0.5">
            {primaryTool && (
              <PrimaryRecommendationCard
                tool={primaryTool}
                teamSize={teamSize}
                isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === primaryTool.toolId}
                onViewAnalysis={() => openToolDrawer(primaryTool, true)}
                animationDelay={0.08}
              />
            )}

            {secondaryTool && (
              <SecondaryRecommendationCard
                tool={secondaryTool}
                teamSize={teamSize}
                isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === secondaryTool.toolId}
                onViewAnalysis={() => openToolDrawer(secondaryTool, false)}
                animationDelay={0.14}
              />
            )}

            {optionalTools.map((tool, idx) => (
              <SupportingToolCard
                key={tool.toolId}
                tool={tool}
                teamSize={teamSize}
                roleIndex={3 + idx}
                isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === tool.toolId}
                onViewAnalysis={() => openToolDrawer(tool, false)}
                animationDelay={0.2 + idx * 0.05}
              />
            ))}

            {apiTools.map((tool, idx) => (
              <SupportingToolCard
                key={tool.toolId}
                tool={tool}
                teamSize={teamSize}
                roleIndex={3 + optionalTools.length + idx}
                isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === tool.toolId}
                onViewAnalysis={() => openToolDrawer(tool, false)}
                animationDelay={0.25 + idx * 0.05}
              />
            ))}
          </div>

          {/* Active Mandate Summary Block — positioned below the assembled architecture */}
          <div className="bg-white border-l-4 border-l-[#1E3A5F] border-y border-r border-slate-200/90 rounded-xl px-4.5 py-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1.5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-[#1E3A5F]">
                  Active Strategy Mandate
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-black text-slate-950">
                  {currentCategory?.title || 'Selected Architecture'}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {currentCategory?.description}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-[#1E3A5F] bg-[#1E3A5F]/10 px-3 py-1 rounded-full border border-[#1E3A5F]/20">
                ${activeStack.estimatedMonthlyCost.toLocaleString()}/mo total spend
              </span>
            </div>
          </div>
        </m.section>

        {comparisons.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950 tracking-tight">
                  Alternative Commercial Architectures ({comparisons.length})
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  Explore ranked alternatives. Click any architecture card to inspect full intelligence or set it as active.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollAlts('left')}
                  className="w-8 h-8 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  aria-label="Scroll left"
                >
                  ←
                </button>
                <button
                  onClick={() => scrollAlts('right')}
                  className="w-8 h-8 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  aria-label="Scroll right"
                >
                  →
                </button>
              </div>
            </div>

            <div
              ref={altScrollRef}
              className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-1 px-1"
              style={{ scrollbarWidth: 'thin', scrollSnapType: 'x mandatory' }}
            >
              {comparisons.map((alt, idx) => {
                const matchedStack = alt.stack || (alt.rank === 1
                  ? currentCategory?.recommendedStack
                  : alt.rank === 2
                    ? currentCategory?.alternativeA
                    : currentCategory?.alternativeB);

                const isAltOverBudget = alt.budgetFit === 'over';
                const isCurrentActive = customActiveStack?.canonicalSignature === matchedStack?.canonicalSignature;

                return (
                  <div
                    key={alt.rank || idx}
                    onClick={() => openStackDrawer(alt, matchedStack)}
                    style={{ scrollSnapAlign: 'start', minWidth: '330px', maxWidth: '370px' }}
                    className={`shrink-0 p-5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between space-y-4 cursor-pointer ${isCurrentActive
                        ? 'bg-white border-2 border-[#1E3A5F] ring-1 ring-[#1E3A5F]/15 shadow-sm'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md shadow-xs'
                      }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E3A5F] text-white tabular-nums">
                              #{alt.rank || idx + 2}
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                              {alt.purposeLabel || alt.architectureType || alt.rankTitle}
                            </span>
                          </div>
                        </div>

                        {alt.budgetFit && alt.budgetFit !== 'no-limit' && (
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 tabular-nums ${isAltOverBudget
                              ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                            }`}>
                            {isAltOverBudget ? 'Over Budget' : 'Within Budget'}
                          </span>
                        )}
                      </div>

                      {matchedStack?.tools && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {matchedStack.tools.map(t => (
                            <div key={t.toolId} className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center" title={t.toolName}>
                              <ProviderLogo providerId={t.toolId} size="sm" className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      )}

                      <h4 className="text-[14px] font-bold tracking-tight text-slate-950 leading-snug">
                        {alt.stackSummary}
                      </h4>

                      <div className="flex items-baseline justify-between pt-1.5 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none mb-0.5">Total Spend</span>
                          <span className="text-[14px] font-extrabold text-slate-950 tabular-nums">${alt.monthlyCost.toLocaleString()}/mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none mb-0.5">Per Seat</span>
                          <span className="text-xs font-bold text-slate-700 tabular-nums">${alt.perSeatCost}/user</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 font-medium">
                        <span>Domain: <strong className="text-slate-950 tabular-nums font-bold">{alt.domainFit || alt.matchScore}%</strong></span>
                        <span className="text-slate-300">·</span>
                        <span>Match: <strong className="text-emerald-700 tabular-nums font-bold">{alt.matchScore}%</strong></span>
                      </div>

                      <div className="space-y-1.5 pt-1 text-[12.5px] text-slate-700 leading-relaxed font-normal">
                        {alt.bestFor && (
                          <p className="line-clamp-2">
                            <strong className="text-slate-950 font-bold">Best for:</strong> {alt.bestFor}
                          </p>
                        )}
                        {alt.whyChooseInstead && (
                          <p className="line-clamp-2">
                            <strong className="text-[#1E3A5F] font-bold">Why choose:</strong> {alt.whyChooseInstead}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 gap-2">
                      <span className="text-[11.5px] text-slate-600 font-medium tabular-nums">
                        {alt.costDeltaVsPrimary !== undefined && alt.costDeltaVsPrimary !== 0
                          ? (alt.costDeltaVsPrimary < 0 ? `Saves $${Math.abs(alt.costDeltaVsPrimary)}/mo` : `+$${alt.costDeltaVsPrimary}/mo premium`)
                          : 'Baseline price'}
                      </span>
                      <div className="flex items-center gap-2">
                        {!isCurrentActive && matchedStack && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomActiveStack(matchedStack);
                              showToast(`Applied ${alt.purposeLabel || 'Architecture'} as active.`);
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 hover:bg-[#1E3A5F] hover:text-white text-slate-800 transition-colors cursor-pointer"
                          >
                            Apply Stack
                          </button>
                        )}
                        <span className="font-bold text-[#1E3A5F] group-hover:underline flex items-center gap-0.5 transition-colors text-[11.5px]">
                          Inspect →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Requirement Coverage Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Verification of requested operational capabilities</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border tabular-nums ${activeStack.coverageResult.coverageScore >= 80
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                  : 'bg-amber-50 text-amber-800 border-amber-200/80'
                }`}>
                {activeStack.coverageResult.coverageScore}% Satisfied
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeStack.coverageResult.covered.map(f => {
                const primaryCovered = f.coveredBy.includes(primaryTool?.toolName || '');
                const secondaryCovered = secondaryTool && f.coveredBy.includes(secondaryTool.toolName);

                return (
                  <div key={f.featureKey} className="p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{f.featureLabel}</h4>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            {primaryCovered && (
                              <span>
                                <strong className="text-slate-700 font-semibold">Primary Core:</strong> {primaryTool?.toolName}
                              </span>
                            )}
                            {secondaryCovered && (
                              <span>
                                <strong className="text-slate-700 font-semibold">Companion:</strong> {secondaryTool?.toolName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                        {primaryCovered ? 'Direct' : 'Full'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {activeStack.coverageResult.partial?.map(f => (
                <div key={f.featureKey} className="p-4 bg-amber-50/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="font-bold text-xs">~</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{f.featureLabel}</h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">Partially covered by {f.coveredBy.join(', ')}.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      Partial
                    </span>
                  </div>
                </div>
              ))}

              {activeStack.coverageResult.missing?.map(f => (
                <div key={f} className="p-4 bg-rose-50/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="font-bold text-xs">✕</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 capitalize">{f.replace(/-/g, ' ')}</h4>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          Not satisfied by core tools. Consider adding a specialized tool from catalog.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      Missing
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  How We Scored This Stack ({activeStack.confidenceScore}%)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">7-factor confidence and stability evaluation</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Score</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">{activeStack.confidenceScore}%</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {[
                  {
                    label: 'Domain & Workflow Velocity',
                    val: activeStack.confidenceBreakdown.workflowMatch,
                    note: activeStack.confidenceBreakdown.workflowMatch >= 80 ? `Optimized for ${context?.domainLabel || 'your workflow'}` : 'Moderate workflow alignment'
                  },
                  {
                    label: 'Functional Requirement Coverage',
                    val: activeStack.confidenceBreakdown.featureCoverage,
                    note: activeStack.confidenceBreakdown.featureCoverage === 100 ? 'All requested requirements covered' : `${activeStack.coverageResult.covered.length} of ${context?.requirementCount || 0} requirements covered`
                  },
                  {
                    label: 'Budget Ceiling Compliance',
                    val: activeStack.confidenceBreakdown.budgetFit,
                    note: activeStack.budgetStatus === 'within'
                      ? 'Within your target monthly budget ceiling'
                      : activeStack.budgetStatus === 'over'
                        ? `Exceeds target budget ceiling`
                        : 'Predictable per-seat subscription'
                  },
                  {
                    label: 'Capability Benchmarks & Depth',
                    val: activeStack.confidenceBreakdown.capabilitySuperiority,
                    note: 'Frontier reasoning and execution benchmark score'
                  },
                  {
                    label: 'Enterprise Security & Governance',
                    val: activeStack.confidenceBreakdown.securityMatch,
                    note: 'Meets InfoSec, privacy, and compliance posture'
                  },
                  {
                    label: 'Vendor Reliability & Stability',
                    val: activeStack.confidenceBreakdown.vendorStability,
                    note: 'Established enterprise vendor foundation'
                  },
                  {
                    label: 'Future Scaling & Growth',
                    val: activeStack.confidenceBreakdown.futureGrowth,
                    note: 'Team licensing and upgrade flexibility'
                  }
                ].map(item => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{item.label}</span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">· {item.note}</span>
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums shrink-0">{item.val}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${item.val >= 80 ? 'bg-emerald-500' : item.val >= 60 ? 'bg-[#1E3A5F]' : 'bg-amber-500'
                          }`}
                        style={{ width: `${item.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed font-normal">
                <strong className="text-slate-900 block font-bold mb-0.5">Bottom Line:</strong>
                {isOverBudget ? (
                  <span>
                    This stack delivers maximum functional velocity for {context?.domainLabel || 'your team'}, but exceeds your target monthly spend. If strict budget adherence is required, evaluate the <strong>Best Value</strong> strategy above.
                  </span>
                ) : (
                  <span>
                    Strong functional synergy and domain velocity within target financial parameters. Recommended for immediate team procurement.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        {growthSim && (
          <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Team Scaling Simulation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Projected subscription growth and tier upgrade milestones</p>
              </div>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                {(['2x', '5x', '10x'] as const).map(v => {
                  const targetSeats = v === '2x' ? growthSim.projection2x.teamSize : v === '5x' ? growthSim.projection5x.teamSize : teamSize * 10;
                  return (
                    <button
                      key={v}
                      onClick={() => setGrowthView(v)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${growthView === v ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {v} ({targetSeats} seats)
                    </button>
                  );
                })}
              </div>
            </div>

            {(() => {
              const multiplier = growthView === '2x' ? 2 : growthView === '5x' ? 5 : 10;
              const projectedSeats = teamSize * multiplier;
              const projectedMonthly = activeStack.perSeatMonthlyCost * projectedSeats;
              const projectedAnnual = projectedMonthly * 12;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100">
                  {[
                    { label: 'Projected Team Scale', val: `${projectedSeats} seats` },
                    { label: 'Estimated Monthly', val: `$${projectedMonthly.toLocaleString()}/mo` },
                    { label: 'Annual Run-Rate', val: `$${projectedAnnual.toLocaleString()}/yr` },
                    { label: 'Per Seat Cost', val: `$${activeStack.perSeatMonthlyCost}/user/mo` },
                  ].map(stat => (
                    <div key={stat.label} className="px-6 py-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">{stat.label}</span>
                      <span className="text-lg font-bold text-slate-900 mt-0.5 block tabular-nums">{stat.val}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {growthSim.projection2x.recommendedUpgrades && growthSim.projection2x.recommendedUpgrades.length > 0 && (
              <div className="px-6 py-3 bg-slate-50/80 border-t border-slate-100 text-xs text-slate-600 flex items-center gap-2">
                <span className="font-bold text-slate-900">Scaling Milestone:</span>
                <span>{growthSim.projection2x.recommendedUpgrades[0].triggerCondition}</span>
              </div>
            )}
          </section>
        )}

        {rec.alternatives.length > 0 && (
          <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Why Weren't Other Providers Selected? ({rec.alternatives.length} Evaluated)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Competitive intelligence breakdown for providers considered but not chosen
                </p>
              </div>

              <button
                onClick={() => setShowEvaluated(v => !v)}
                className="text-xs font-bold text-[#1E3A5F] hover:underline transition-colors cursor-pointer"
              >
                {showEvaluated ? '▲ Collapse Matrix' : '▼ Expand Matrix'}
              </button>
            </div>

            <AnimatePresence>
              {showEvaluated && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="divide-y divide-slate-100 overflow-hidden"
                >
                  <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Filter:</span>
                    <button
                      onClick={() => setEvaluatedFilter('ALL')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${evaluatedFilter === 'ALL' ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      All ({rec.alternatives.length})
                    </button>
                    {rejectionCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setEvaluatedFilter(cat)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer shrink-0 ${evaluatedFilter === cat ? 'bg-slate-900 text-white font-bold' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        {cat.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>

                  {filteredAlternatives.map(alt => (
                    <div
                      key={alt.toolId}
                      onClick={() => setDrawerSelection({
                        type: 'evaluated',
                        item: alt,
                        primaryToolName: primaryTool?.toolName,
                        teamSize
                      })}
                      className="flex items-center gap-4 px-6 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-center shrink-0">
                        <ProviderLogo providerId={alt.toolId} size="sm" className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{alt.toolName}</span>
                          <span className="text-xs text-slate-400">({alt.category.toUpperCase()})</span>
                        </div>
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5 font-normal">{alt.whyNotSelected}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold text-xs tabular-nums ${alt.compositeScore >= 70 ? 'text-[#1E3A5F]' : 'text-slate-500'
                          }`}>
                          {alt.compositeScore}% fit
                        </span>
                        <span className="text-[11px] text-slate-400 block group-hover:text-[#1E3A5F] transition-colors">
                          Inspect →
                        </span>
                      </div>
                    </div>
                  ))}
                </m.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </main>
    </div>
  );
}

function ProviderRoleBadge({
  role,
}: {
  role: ReturnType<typeof getProviderRole>;
}) {
  const isPrimary = role.variant === 'primary';
  const isSecondary = role.variant === 'secondary';
  const isApi = role.variant === 'api';

  const badgeBg = isPrimary
    ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
    : isSecondary
      ? 'bg-slate-800 text-white border-slate-800'
      : isApi
        ? 'bg-indigo-900 text-white border-indigo-900'
        : 'bg-slate-700 text-white border-slate-700';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-black tracking-wider uppercase shadow-2xs ${badgeBg}`}
      >
        <span className="opacity-60 text-[10.5px] font-mono tracking-normal">{role.index}</span>
        <span className="w-1 h-1 rounded-full bg-white/40" />
        <span className="text-[11.5px] font-bold">{role.label}</span>
      </span>
    </div>
  );
}

function PrimaryRecommendationCard({
  tool,
  teamSize,
  isActive,
  onViewAnalysis,
  animationDelay = 0,
}: {
  tool: ToolInStack;
  teamSize: number;
  isActive: boolean;
  onViewAnalysis: () => void;
  animationDelay?: number;
}) {
  const role = getProviderRole(tool.buyingPriority, 1);
  const fitScore = tool.workflowFitScore ?? 80;
  const qualitativeFit = fitScore >= 90 ? 'Exceptional Fit' : fitScore >= 80 ? 'Strong Domain Fit' : fitScore >= 65 ? 'Good Domain Fit' : 'Moderate Fit';

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
      className={`p-4 sm:p-5 bg-white border-2 rounded-2xl transition-all duration-200 flex flex-col ${isActive
          ? 'border-[#1E3A5F] ring-2 ring-[#1E3A5F]/15 shadow-md'
          : 'border-slate-300 shadow-xs hover:border-slate-400 hover:shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
            <ProviderLogo providerId={tool.toolId} size="md" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <ProviderRoleBadge role={role} />
            <h3 className="font-black text-xl sm:text-[1.45rem] tracking-tight text-slate-950 leading-tight mt-1">
              {tool.toolName}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {tool.recommendedPlan} Plan
            </p>
          </div>
        </div>

        {/* Compact Structured pricing block */}
        <div className="text-right shrink-0 bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-2 shadow-2xs">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-950 leading-none tabular-nums font-sans">
              ${tool.monthlyCostPerSeat}
            </span>
            <span className="text-[11px] font-bold text-slate-500">/user/mo</span>
          </div>
          <span className="text-[11px] font-medium text-slate-600 block mt-0.5 tabular-nums">
            ${(tool.estimatedMonthlyCostPerTeam || tool.monthlyCostPerSeat * teamSize).toLocaleString()}/mo ({teamSize} {teamSize === 1 ? 'seat' : 'seats'})
          </span>
        </div>
      </div>

      {/* Compact Grey Information Panel */}
      {(tool.whyRecommended || (tool.featuresCovered && tool.featuresCovered.length > 0)) && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200/60 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F]" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-[#1E3A5F]">
                Architectural Rationale
              </h4>
            </div>

            {/* Compact Inline Domain Fit Block */}
            <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-md px-2.5 py-1 shadow-2xs">
              <span className="text-xs font-black text-slate-950 tabular-nums">
                {fitScore}%
              </span>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Domain Fit
              </span>
              <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${fitScore >= 80 ? 'bg-emerald-500' : fitScore >= 65 ? 'bg-[#1E3A5F]' : 'bg-amber-500'
                    }`}
                  style={{ width: `${fitScore}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-600">
                {qualitativeFit}
              </span>
            </div>
          </div>

          {tool.whyRecommended && (
            <p className="text-[13.5px] sm:text-[14px] text-slate-800 leading-snug font-normal">
              {tool.whyRecommended}
            </p>
          )}

          {tool.featuresCovered && tool.featuresCovered.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
                Fulfills Requirements
              </span>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {tool.featuresCovered.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium leading-tight">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="capitalize">{f.replace(/-/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compact Card Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onViewAnalysis}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
              ? 'bg-[#1E3A5F] text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 hover:text-slate-950 border border-slate-200/90'
            }`}
        >
          <span>{isActive ? 'Close Analysis Drawer' : 'View Full Architecture Analysis'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-150 ${isActive ? 'rotate-180' : 'group-hover:translate-x-0.5'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
        <span className="text-xs font-bold text-slate-600 tabular-nums">
          Domain Suitability: <strong className="text-slate-950 font-black">{fitScore}%</strong>
        </span>
      </div>
    </m.div>
  );
}

function SecondaryRecommendationCard({
  tool,
  teamSize,
  isActive,
  onViewAnalysis,
  animationDelay = 0,
}: {
  tool: ToolInStack;
  teamSize: number;
  isActive: boolean;
  onViewAnalysis: () => void;
  animationDelay?: number;
}) {
  const role = getProviderRole(tool.buyingPriority, 2);
  const fitScore = tool.workflowFitScore ?? 80;
  const qualitativeFit = fitScore >= 90 ? 'Exceptional Fit' : fitScore >= 80 ? 'Strong Domain Fit' : fitScore >= 65 ? 'Good Domain Fit' : 'Moderate Fit';

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
      className={`p-4 sm:p-5 bg-white border rounded-2xl transition-all duration-200 flex flex-col ${isActive
          ? 'border-slate-800 ring-2 ring-slate-800/15 shadow-md'
          : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
            <ProviderLogo providerId={tool.toolId} size="sm" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0 flex-1">
            <ProviderRoleBadge role={role} />
            <h3 className="font-bold text-lg sm:text-[1.35rem] tracking-tight text-slate-950 leading-tight mt-1">
              {tool.toolName}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {tool.recommendedPlan} Plan
            </p>
          </div>
        </div>

        {/* Compact Structured pricing block */}
        <div className="text-right shrink-0 bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-2 shadow-2xs">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-xl sm:text-2xl font-black text-slate-950 leading-none tabular-nums font-sans">
              ${tool.monthlyCostPerSeat}
            </span>
            <span className="text-[11px] font-bold text-slate-500">/user/mo</span>
          </div>
          <span className="text-[11px] font-medium text-slate-600 block mt-0.5 tabular-nums">
            ${(tool.estimatedMonthlyCostPerTeam || tool.monthlyCostPerSeat * teamSize).toLocaleString()}/mo ({teamSize} {teamSize === 1 ? 'seat' : 'seats'})
          </span>
        </div>
      </div>

      {/* Compact Grey Information Panel */}
      {(tool.whyRecommended || (tool.featuresCovered && tool.featuresCovered.length > 0)) && (
        <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-200/60 pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Companion Synergy & Capability Role
              </h4>
            </div>

            {/* Compact Inline Domain Fit Block */}
            <div className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-md px-2.5 py-1 shadow-2xs">
              <span className="text-xs font-black text-slate-950 tabular-nums">
                {fitScore}%
              </span>
              <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                Domain Fit
              </span>
              <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${fitScore >= 80 ? 'bg-emerald-500' : fitScore >= 65 ? 'bg-[#1E3A5F]' : 'bg-amber-500'
                    }`}
                  style={{ width: `${fitScore}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-600">
                {qualitativeFit}
              </span>
            </div>
          </div>

          {tool.whyRecommended && (
            <p className="text-[13.5px] text-slate-800 leading-snug font-normal">
              {tool.whyRecommended}
            </p>
          )}

          {tool.featuresCovered && tool.featuresCovered.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 block">
                Fulfills Requirements
              </span>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {tool.featuresCovered.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[13px] text-slate-900 font-medium leading-tight">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="capitalize">{f.replace(/-/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Compact Card Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onViewAnalysis}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${isActive
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 hover:text-slate-950 border border-slate-200/90'
            }`}
        >
          <span>{isActive ? 'Close Analysis Drawer' : 'View Full Architecture Analysis'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-150 ${isActive ? 'rotate-180' : 'group-hover:translate-x-0.5'}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
        <span className="text-xs font-bold text-slate-600 tabular-nums">
          Domain Suitability: <strong className="text-slate-950 font-black">{fitScore}%</strong>
        </span>
      </div>
    </m.div>
  );
}

function SupportingToolCard({
  tool,
  teamSize,
  roleIndex,
  isActive,
  onViewAnalysis,
  animationDelay = 0,
}: {
  tool: ToolInStack;
  teamSize: number;
  roleIndex: number;
  isActive: boolean;
  onViewAnalysis: () => void;
  animationDelay?: number;
}) {
  const role = getProviderRole(tool.buyingPriority, roleIndex);
  const fitScore = tool.workflowFitScore ?? 80;

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: animationDelay, ease: [0.22, 1, 0.36, 1] }}
      className={`p-4 sm:p-4.5 bg-white border rounded-xl transition-all duration-200 flex flex-col ${isActive
          ? 'border-slate-700 ring-1 ring-slate-700/15 shadow-sm'
          : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
        }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-50 border border-slate-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
            <ProviderLogo providerId={tool.toolId} size="sm" />
          </div>

          <div className="min-w-0 flex-1">
            <ProviderRoleBadge role={role} />
            <h4 className="font-bold text-base sm:text-lg text-slate-950 leading-tight mt-1">
              {tool.toolName}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {tool.recommendedPlan} Plan
            </p>
          </div>
        </div>

        {/* Compact Structured pricing block */}
        <div className="text-right shrink-0 bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-1.5 shadow-2xs">
          <div className="flex items-baseline justify-end gap-1">
            <span className="text-base sm:text-lg font-black text-slate-950 tabular-nums">${tool.monthlyCostPerSeat}</span>
            <span className="text-[10.5px] font-bold text-slate-500">/user/mo</span>
          </div>
          <span className="text-[10.5px] font-medium text-slate-600 block mt-0.5 tabular-nums">
            ${(tool.estimatedMonthlyCostPerTeam || tool.monthlyCostPerSeat * teamSize).toLocaleString()}/mo total
          </span>
        </div>
      </div>

      {/* Compact Grey Information Panel */}
      {(tool.whyRecommended || (tool.featuresCovered && tool.featuresCovered.length > 0)) && (
        <div className="mt-2.5 p-3 sm:p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 shadow-2xs space-y-2">
          {tool.whyRecommended && (
            <p className="text-xs sm:text-[13px] text-slate-800 leading-snug font-normal">
              {tool.whyRecommended}
            </p>
          )}

          {tool.featuresCovered && tool.featuresCovered.length > 0 && (
            <div className="pt-1.5 border-t border-slate-200/60 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Fulfills Requirements
              </span>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {tool.featuresCovered.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-900 font-medium leading-tight">
                    <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="capitalize">{f.replace(/-/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onViewAnalysis}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 transition-all cursor-pointer"
        >
          <span>View Full Architecture Analysis</span>
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
        <span className="text-xs font-bold text-slate-600 tabular-nums">
          Domain Fit: <strong className="text-slate-950 font-black">{fitScore}%</strong>
        </span>
      </div>
    </m.div>
  );
}

