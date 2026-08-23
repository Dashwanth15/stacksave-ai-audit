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

type StrategyKey = 'bestOverall' | 'bestValue' | 'bestPerformance' | 'bestEnterprise';

interface StrategyTabMeta {
  key: StrategyKey;
  label: string;
  badge: string;
  icon: string;
  description: string;
}

const STRATEGY_TABS: StrategyTabMeta[] = [
  {
    key: 'bestOverall',
    label: 'Best Overall',
    badge: 'Recommended',
    icon: '🌟',
    description: 'Optimal balance of core domain execution, complementary reasoning, and seat cost efficiency.'
  },
  {
    key: 'bestValue',
    label: 'Best Value',
    badge: 'Cost Optimized',
    icon: '💡',
    description: 'Maximizes capability retention per dollar while keeping total spend strictly constrained.'
  },
  {
    key: 'bestPerformance',
    label: 'Max Performance',
    badge: 'Frontier Benchmarks',
    icon: '⚡',
    description: 'Uncompromised frontier reasoning depth, top benchmark models, and maximum execution velocity.'
  },
  {
    key: 'bestEnterprise',
    label: 'Enterprise Security',
    badge: 'Strict Security',
    icon: '🛡',
    description: 'Zero data retention, SAML SSO, SOC 2/HIPAA compliance, and centralized admin governance.'
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
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Generating Procurement Intelligence…</p>
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
      `Procurement Goal: ${STRATEGY_TABS.find(t => t.key === selectedStrategyKey)?.label} Architecture`,
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased font-sans">
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

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-200/80 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                AI Stack Advisor
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                StackSave Procurement Intelligence
              </span>
              {customActiveStack && (
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Custom Applied Architecture
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              Recommended AI Procurement Stack
            </h1>

            {context && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 font-medium pt-0.5">
                <span className="font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                  {context.domainLabel}
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-bold text-slate-700">{teamSize} {teamSize === 1 ? 'Seat' : 'Seats'}</span>
                <span className="text-slate-300">·</span>
                <span>Procurement Ceiling: <strong className="text-slate-900 font-bold">{context.budgetFormatted}</strong></span>
                <span className="text-slate-300">·</span>
                <span>{context.requirementCount} Specified Requirements</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Total Team Spend
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 leading-none">
                ${activeStack.estimatedMonthlyCost.toLocaleString()}
                <span className="text-xs font-normal text-slate-500">/mo</span>
              </span>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono font-medium">
                ${activeStack.perSeatMonthlyCost}/user/mo (${(activeStack.estimatedAnnualCost).toLocaleString()}/yr)
              </span>
            </div>

            <div className="w-[1px] h-12 bg-slate-100" />

            <div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Match Score
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 leading-none">
                {activeStack.confidenceScore}%
              </span>
              <span className="text-[11px] text-emerald-700 font-bold block mt-1">
                {activeStack.coverageResult.coverageScore}% Requirements Met
              </span>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 block">
              SELECT PROCUREMENT STRATEGY DIMENSION
            </span>
            {customActiveStack && (
              <button
                onClick={() => {
                  setCustomActiveStack(null);
                  showToast('Reset to default strategy recommendation.');
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                ↺ Reset to Default Recommendation
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {STRATEGY_TABS.map(tab => {
              const isSelected = selectedStrategyKey === tab.key && !customActiveStack;
              const catData = rec.categories?.[tab.key];
              const cost = catData?.recommendedStack?.estimatedMonthlyCost ?? 0;

              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedStrategyKey(tab.key);
                    setCustomActiveStack(null);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{tab.icon}</span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.badge}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <h3 className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {tab.label}
                    </h3>
                    <span className={`text-[11px] font-mono block mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      ${cost.toLocaleString()}/mo
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 font-medium px-1">
            {STRATEGY_TABS.find(t => t.key === selectedStrategyKey)?.description}
          </p>
        </section>

        {monthlyBudget !== null && (
          <div className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
            isOverBudget
              ? 'bg-amber-50/70 border-amber-200 text-amber-950'
              : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                isOverBudget ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isOverBudget ? '⚠' : '✓'}
              </span>
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  {isOverBudget ? `Advisory Procurement Limit Exceeded (+$${budgetOverrun.toLocaleString()}/mo)` : 'Procurement Ceiling Compliant'}
                </span>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isOverBudget
                    ? `This ${STRATEGY_TABS.find(t => t.key === selectedStrategyKey)?.label} setup totals $${activeStack.estimatedMonthlyCost.toLocaleString()}/mo against your $${monthlyBudget.toLocaleString()}/mo target. Switch to Best Value or pick a single-tool alternative below to fit strictly.`
                    : `Architecture total of $${activeStack.estimatedMonthlyCost.toLocaleString()}/mo is fully within your $${monthlyBudget.toLocaleString()}/mo ceiling ($${(monthlyBudget - activeStack.estimatedMonthlyCost).toLocaleString()} budget headroom remaining).`
                  }
                </p>
              </div>
            </div>

            {isOverBudget && selectedStrategyKey !== 'bestValue' && (
              <button
                onClick={() => {
                  setSelectedStrategyKey('bestValue');
                  setCustomActiveStack(null);
                }}
                className="text-xs font-bold bg-amber-900 text-white px-3 py-1.5 rounded-lg hover:bg-amber-800 transition-colors shrink-0 cursor-pointer shadow-2xs"
              >
                Switch to Best Value →
              </button>
            )}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 block mb-0.5">
                ACTIVE PROCUREMENT ARCHITECTURE
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {customActiveStack ? customActiveStack.rankTitle || 'Selected Custom Architecture' : `${STRATEGY_TABS.find(t => t.key === selectedStrategyKey)?.label} Architecture`}
              </h2>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500">Combined Monthly Commitment:</span>
              <span className="text-base font-black font-mono text-slate-900 ml-1.5">
                ${activeStack.estimatedMonthlyCost.toLocaleString()}/mo
              </span>
            </div>
          </div>

          {activeStack.whyThisStack && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Strategic Rationale
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {activeStack.whyThisStack}
              </p>
            </div>
          )}

          {primaryTool && (
            <PrimaryRecommendationCard
              tool={primaryTool}
              teamSize={teamSize}
              coverageScore={activeStack.coverageResult.coverageScore}
              isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === primaryTool.toolId}
              onViewAnalysis={() => openToolDrawer(primaryTool, true)}
            />
          )}

          {secondaryTool && (
            <SecondaryRecommendationCard
              tool={secondaryTool}
              teamSize={teamSize}
              isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === secondaryTool.toolId}
              onViewAnalysis={() => openToolDrawer(secondaryTool, false)}
            />
          )}

          {optionalTools.map(tool => (
            <SupportingToolCard
              key={tool.toolId}
              tool={tool}
              teamSize={teamSize}
              isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === tool.toolId}
              onViewAnalysis={() => openToolDrawer(tool, false)}
            />
          ))}

          {apiTools.map(tool => (
            <SupportingToolCard
              key={tool.toolId}
              tool={tool}
              teamSize={teamSize}
              isActive={drawerSelection?.type === 'tool' && drawerSelection.tool.toolId === tool.toolId}
              onViewAnalysis={() => openToolDrawer(tool, false)}
            />
          ))}
        </section>

        {comparisons.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Alternative AI Stacks ({comparisons.length} Commercial Architectures)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore ranked alternatives. Click any architecture card to inspect full intelligence or set it as active.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollAlts('left')}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                  aria-label="Scroll left"
                >
                  ←
                </button>
                <button
                  onClick={() => scrollAlts('right')}
                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
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
                    className={`shrink-0 p-5 rounded-2xl border transition-all duration-200 group flex flex-col justify-between space-y-4 cursor-pointer ${
                      isCurrentActive
                        ? 'bg-white border-slate-900 ring-2 ring-slate-900/10 shadow-md'
                        : 'bg-white border-slate-200/90 hover:border-slate-400 hover:shadow-md shadow-xs'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white font-mono">
                              #{alt.rank || idx + 2}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                              {alt.purposeLabel || alt.architectureType || alt.rankTitle}
                            </span>
                          </div>
                        </div>

                        {alt.budgetFit && alt.budgetFit !== 'no-limit' && (
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shrink-0 font-mono ${
                            isAltOverBudget
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {isAltOverBudget ? 'Over Budget' : 'Within Budget'}
                          </span>
                        )}
                      </div>

                      {matchedStack?.tools && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {matchedStack.tools.map(t => (
                            <div key={t.toolId} className="w-7 h-7 rounded-md bg-slate-50 border border-slate-200 p-1 flex items-center justify-center" title={t.toolName}>
                              <ProviderLogo providerId={t.toolId} size="sm" className="w-full h-full object-contain" />
                            </div>
                          ))}
                        </div>
                      )}

                      <h4 className="text-sm font-black tracking-tight text-slate-900 leading-snug">
                        {alt.stackSummary}
                      </h4>

                      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 font-mono">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                          <span className="text-sm font-black text-slate-900">${alt.monthlyCost.toLocaleString()}/mo</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Per Seat</span>
                          <span className="text-xs font-bold text-slate-600">${alt.perSeatCost}/user</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-600">
                        <span>Domain: <strong className="text-slate-900">{alt.domainFit || alt.matchScore}%</strong></span>
                        <span className="text-slate-300">·</span>
                        <span>Match: <strong className="text-emerald-700">{alt.matchScore}%</strong></span>
                      </div>

                      <div className="space-y-1.5 pt-1 text-xs text-slate-600 font-medium">
                        {alt.bestFor && (
                          <p className="line-clamp-2">
                            <strong className="text-slate-800">Best for:</strong> {alt.bestFor}
                          </p>
                        )}
                        {alt.whyChooseInstead && (
                          <p className="line-clamp-2">
                            <strong className="text-indigo-700">Why choose:</strong> {alt.whyChooseInstead}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400 font-sans">
                        {alt.costDeltaVsPrimary !== undefined && alt.costDeltaVsPrimary !== 0
                          ? (alt.costDeltaVsPrimary < 0 ? `Saves $${Math.abs(alt.costDeltaVsPrimary)}/mo` : `+$${alt.costDeltaVsPrimary}/mo premium`)
                          : 'Baseline price'}
                      </span>
                      <span className="font-extrabold text-slate-900 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
                        Inspect →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Requirement Coverage Verification</h3>
                <p className="text-xs text-slate-500 mt-0.5">Verification of your requested operational capabilities</p>
              </div>
              <span className={`text-xs font-black font-mono px-3 py-1 rounded-full border ${
                activeStack.coverageResult.coverageScore >= 80
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
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
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            {primaryCovered && (
                              <span>
                                <strong className="text-slate-700">Primary Core:</strong> {primaryTool?.toolName}
                              </span>
                            )}
                            {secondaryCovered && (
                              <span>
                                <strong className="text-slate-700">Companion:</strong> {secondaryTool?.toolName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
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
                        <p className="text-[11px] text-amber-700 mt-0.5">Partially covered by {f.coveredBy.join(', ')}.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
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
                          Not satisfied by the core tools. Consider adding a specialized tool from the catalog.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      Missing
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Procurement Decision Intelligence ({activeStack.confidenceScore}%)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">7-factor confidence and stability evaluation</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Overall Score</span>
                <span className="text-sm font-black font-mono text-slate-900">{activeStack.confidenceScore}%</span>
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
                        <span className="font-bold text-slate-800">{item.label}</span>
                        <span className="text-[11px] text-slate-400 hidden sm:inline">· {item.note}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 shrink-0">{item.val}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.val >= 80 ? 'bg-emerald-500' : item.val >= 60 ? 'bg-indigo-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-900 block font-bold mb-0.5">Procurement Verdict:</strong>
                {isOverBudget ? (
                  <span>
                    This stack delivers maximum functional velocity for {context?.domainLabel || 'your team'}, but exceeds your target monthly spend. If strict budget adherence is required, evaluate the <strong>Best Value</strong> tab above.
                  </span>
                ) : (
                  <span>
                    Strong functional synergy and domain velocity within target financial parameters. Recommended for immediate team rollout.
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        {growthSim && (
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Team Scaling Simulation</h3>
                <p className="text-xs text-slate-500 mt-0.5">Projected subscription growth and tier upgrade milestones</p>
              </div>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                {(['2x', '5x', '10x'] as const).map(v => {
                  const targetSeats = v === '2x' ? growthSim.projection2x.teamSize : v === '5x' ? growthSim.projection5x.teamSize : teamSize * 10;
                  return (
                    <button
                      key={v}
                      onClick={() => setGrowthView(v)}
                      className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        growthView === v ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">{stat.label}</span>
                      <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">{stat.val}</span>
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
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Why Weren't Other Providers Selected? ({rec.alternatives.length} Evaluated)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Competitive intelligence breakdown for providers considered but not chosen
                </p>
              </div>

              <button
                onClick={() => setShowEvaluated(v => !v)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
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
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                        evaluatedFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      All ({rec.alternatives.length})
                    </button>
                    {rejectionCategories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setEvaluatedFilter(cat)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
                          evaluatedFilter === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
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
                        <p className="text-[11.5px] text-slate-500 truncate mt-0.5">{alt.whyNotSelected}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-mono font-bold text-xs ${
                          alt.compositeScore >= 70 ? 'text-indigo-600' : 'text-slate-500'
                        }`}>
                          {alt.compositeScore}% fit
                        </span>
                        <span className="text-[11px] text-slate-400 block group-hover:text-indigo-600 transition-colors">
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

function PrimaryRecommendationCard({
  tool,
  teamSize,
  coverageScore,
  isActive,
  onViewAnalysis,
}: {
  tool: ToolInStack;
  teamSize: number;
  coverageScore: number;
  isActive: boolean;
  onViewAnalysis: () => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onViewAnalysis}
      className={`p-5 sm:p-6 bg-white border-2 rounded-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer group ${
        isActive
          ? 'border-slate-900 ring-4 ring-slate-900/10 shadow-lg'
          : 'border-slate-900 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150">
              <ProviderLogo providerId={tool.toolId} size="md" className="w-full h-full object-contain" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span>01 Primary · Core Workspace Driver</span>
                <span className="text-slate-300">·</span>
                <span className="text-emerald-700 font-extrabold">Buy First</span>
              </div>
              <h3 className="font-black text-2xl tracking-tight text-slate-900 leading-tight mt-0.5">
                {tool.toolName}
              </h3>
              <span className="text-xs font-bold text-slate-500 block mt-0.5">
                {tool.vendor} · <strong className="text-indigo-600 font-extrabold">{tool.recommendedPlan} Plan</strong>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-xs font-bold text-slate-500 mr-0.5">$</span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight leading-none">
                {tool.monthlyCostPerSeat}
              </span>
              <span className="text-xs font-semibold text-slate-500">/seat/mo</span>
            </div>
            <span className="text-xs font-bold text-slate-500 block mt-1 font-mono">
              ${tool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo ({teamSize} seats)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-200/70 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-slate-900 tracking-tight">
              Primary Workflow Execution
            </span>
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="text-emerald-700">{tool.workflowFitScore}% Domain Fit</span>
              <span className="text-slate-300">·</span>
              <span className="text-indigo-700">{coverageScore}% Requirements</span>
            </div>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {tool.whyRecommended}
          </p>

          {tool.featuresCovered && tool.featuresCovered.length > 0 && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-600 font-medium flex-wrap">
              <span className="font-bold text-slate-700">Covers:</span>
              {tool.featuresCovered.map((f, i) => (
                <span key={f} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-300 mr-1">·</span>}
                  <span className="text-emerald-600 font-bold text-[11px]">✓</span>
                  <span className="capitalize">{f.replace(/-/g, ' ')}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewAnalysis();
          }}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer shadow-xs ${
            isActive
              ? 'bg-slate-900 text-white ring-2 ring-slate-800 shadow-sm'
              : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 15v-4M12 15V9M17 15v-2" />
          </svg>
          <span>{isActive ? 'Close Analysis' : 'Open Tool Analysis'}</span>
          <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1">
            <span className="text-slate-400">Suitability:</span>
            <span className="font-extrabold font-mono text-emerald-700">{tool.workflowFitScore}%</span>
          </div>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-700 font-bold flex items-center gap-1">
            Procurement Verified ✓
          </span>
        </div>
      </div>
    </m.div>
  );
}

function SecondaryRecommendationCard({
  tool,
  teamSize,
  isActive,
  onViewAnalysis,
}: {
  tool: ToolInStack;
  teamSize: number;
  isActive: boolean;
  onViewAnalysis: () => void;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05, duration: 0.25 }}
      onClick={onViewAnalysis}
      className={`p-5 sm:p-6 bg-white border rounded-2xl transition-all duration-200 flex flex-col justify-between cursor-pointer group ${
        isActive
          ? 'border-slate-800 ring-2 ring-slate-800/10 shadow-md'
          : 'border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-150">
              <ProviderLogo providerId={tool.toolId} size="sm" className="w-full h-full object-contain" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                <span>02 Secondary · Recommended Companion</span>
              </div>
              <h3 className="font-extrabold text-xl tracking-tight text-slate-900 leading-tight mt-0.5">
                {tool.toolName}
              </h3>
              <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                {tool.vendor} · <strong className="text-slate-700 font-bold">{tool.recommendedPlan} Plan</strong>
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-baseline justify-end gap-0.5">
              <span className="text-xs font-bold text-slate-500 mr-0.5">$</span>
              <span className="text-2xl font-black font-mono text-slate-900 tracking-tight leading-none">
                {tool.monthlyCostPerSeat}
              </span>
              <span className="text-xs font-semibold text-slate-500">/seat/mo</span>
            </div>
            <span className="text-xs font-medium text-slate-400 block mt-1 font-mono">
              ${tool.estimatedMonthlyCostPerTeam.toLocaleString()}/mo ({teamSize} seats)
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1.5">
          <span className="font-bold text-sm text-slate-900 tracking-tight block">
            Reasoning &amp; Architectural Companion
          </span>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {tool.whyRecommended}
          </p>
          {tool.whatItComplements && (
            <p className="text-xs text-slate-500 leading-relaxed pt-1 border-t border-slate-200/50">
              <strong className="text-slate-700">Complements:</strong> {tool.whatItComplements}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewAnalysis();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-xs cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 15v-4M12 15V9M17 15v-2" />
          </svg>
          <span>{isActive ? 'Close Analysis' : 'Open Tool Analysis'}</span>
          <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>Domain Fit:</span>
          <span className="font-bold font-mono text-slate-800">{tool.workflowFitScore}%</span>
          <span className="text-slate-300">·</span>
          <span className="text-emerald-700 font-semibold">Verified ✓</span>
        </div>
      </div>
    </m.div>
  );
}

function SupportingToolCard({
  tool,
  teamSize,
  isActive,
  onViewAnalysis,
}: {
  tool: ToolInStack;
  teamSize: number;
  isActive: boolean;
  onViewAnalysis: () => void;
}) {
  const isApi = tool.buyingPriority === '04 API LAYER' || tool.category === 'api';

  return (
    <div
      onClick={onViewAnalysis}
      className={`p-4 sm:p-5 bg-white border rounded-xl transition-all duration-200 cursor-pointer flex flex-col justify-between ${
        isActive
          ? 'border-slate-800 ring-2 ring-slate-800/10 shadow-sm'
          : 'border-slate-200 shadow-2xs hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
            <ProviderLogo providerId={tool.toolId} size="sm" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                isApi ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
                {isApi ? '04 API LAYER' : '03 OPTIONAL'}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{tool.toolName}</h4>
              <span className="text-xs text-slate-400">({tool.recommendedPlan})</span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{tool.whyRecommended}</p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="font-mono font-bold text-xs text-slate-900 block">${tool.monthlyCostPerSeat}/seat</span>
          <span className="font-mono text-[10px] text-slate-400 block">${(tool.estimatedMonthlyCostPerTeam || tool.monthlyCostPerSeat * teamSize).toLocaleString()}/mo</span>
          <button
            type="button"
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-0.5 cursor-pointer"
          >
            Inspect →
          </button>
        </div>
      </div>
    </div>
  );
}
