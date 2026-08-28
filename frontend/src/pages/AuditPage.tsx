import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { TOOLS, USE_CASES } from '../data/tools';
import { submitAudit, fetchAudit } from '../services/api';
import type { ToolEntry, UseCase, AuditRequest } from '../types';
import Logo from '../components/Logo';
import ToolBrowser from '../components/ToolBrowser';
import OfferNotificationBell from '../components/OfferNotificationBell';
import { getUserScopedKey } from '../utils/userSession';
import './AuditPage.css';


const logoMap: Record<string, string> = {
  'cursor': '/logos/cursor.svg',
  'github-copilot': '/logos/copilot.svg',
  'claude': '/logos/claude.svg',
  'chatgpt': '/logos/chatgpt.svg',
  'anthropic-api': '/logos/anthropic.svg',
  'openai-api': '/logos/openai.svg',
  'gemini': '/logos/gemini.svg',
  'windsurf': '/logos/windsurf.svg',
  'kimi': '/logos/kimi.svg',
};

type BillingPeriod = 'monthly' | 'annual';

const LOADING_STAGES = [
  'Analyzing your stack…',
  'Checking plan pricing…',
  'Finding overlapping tools…',
  'Calculating savings…',
  'Generating AI summary…',
];

function useLoadingStage(isLoading: boolean) {
  const [stage, setStage] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (isLoading) {
      intervalRef.current = setInterval(() => {
        setStage((prev) => Math.min(prev + 1, LOADING_STAGES.length - 1));
      }, 1500);
      return () => {
        clearInterval(intervalRef.current);
        setStage(0);
      };
    }
    clearInterval(intervalRef.current);
  }, [isLoading]);

  return isLoading ? LOADING_STAGES[stage] : LOADING_STAGES[0];
}

interface FormState {
  tools: ToolEntry[];
  teamSize: number;
  companyName: string;
  useCase: UseCase;
  billingPeriod: BillingPeriod;
  optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance';
}

const DEFAULT_FORM: FormState = {
  tools: [],
  teamSize: 5,
  companyName: '',
  useCase: 'mixed',
  billingPeriod: 'monthly',
  optimizationGoal: 'balanced',
};

// Helper: clamp description text via CSS class
// (line-clamp applied in JSX)

type StepBadgeProps = {
  n: number;
  done: boolean;
};

function StepBadge({ n, done }: StepBadgeProps) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono-financial font-bold shrink-0 transition-all"
      style={
        done
          ? { background: 'var(--color-success-bg)', color: 'var(--color-success-t)', border: '1px solid rgba(16,185,129,0.2)' }
          : { background: 'rgba(30,58,95,0.06)', color: 'var(--color-primary)', border: '1px solid rgba(30,58,95,0.1)' }
      }
    >
      {done ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        n
      )}
    </span>
  );
}



export default function AuditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reAuditOf = searchParams.get('reAuditOf');
  const [parentVersion, setParentVersion] = useState<number | null>(null);
  const [parentToolIds, setParentToolIds] = useState<string[] | null>(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const prefillDone = useRef<string | null>(null);

  // Clean legacy shared form storage if present (removes the old global key that leaked between users)
  useEffect(() => {
    try {
      window.localStorage.removeItem('stacksave-audit-form');
    } catch {
      // ignore
    }
  }, []);

  const freshResetDone = useRef(false);
  useEffect(() => {
    if (!reAuditOf && !freshResetDone.current) {
      freshResetDone.current = true;
      setParentToolIds(null);
      setParentVersion(null);
      setForm(DEFAULT_FORM);
    }
  }, [reAuditOf]);

  const [showHighlight, setShowHighlight] = useState(false);
  const [showFloatingHint, setShowFloatingHint] = useState(false);
  const [guidanceEverTriggered, setGuidanceEverTriggered] = useState(false);

  const tierPlansRef = useRef<HTMLDivElement>(null);

  const dismissGuidance = useCallback(() => {
    setShowHighlight(false);
    setShowFloatingHint(false);
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingText = useLoadingStage(loading);

  const isAnnual = form.billingPeriod === 'annual';

  // Prefill form from parent version if reAuditOf parameter is present
  useEffect(() => {
    if (reAuditOf && prefillDone.current !== reAuditOf) {
      let isMounted = true;

      const fetchAndPrefill = async () => {
        try {
          if (isMounted) setIsPrefilling(true);
          if (isMounted) setError(null);

          const audit = await fetchAudit(reAuditOf);

          if (isMounted) {
            setForm((prev) => ({
              tools: audit.tools,
              teamSize: audit.teamSize,
              companyName: audit.companyName || '',
              useCase: audit.useCase || 'mixed',
              billingPeriod: prev.billingPeriod,
              optimizationGoal: audit.optimizationGoal || 'balanced',
            }));
            setParentVersion(audit.auditVersion || 1);
            setParentToolIds((audit.tools || []).map((t) => t.toolId));
            prefillDone.current = reAuditOf;
          }
        } catch (err) {
          console.error('Failed to prefill audit form:', err);
          if (isMounted) {
            setError('Failed to load parent audit for editing.');
          }
        } finally {
          if (isMounted) {
            setIsPrefilling(false);
          }
        }
      };

      fetchAndPrefill();

      return () => {
        isMounted = false;
      };
    }
  }, [reAuditOf, setForm]);

  const selectedToolIds = form.tools.map((t) => t.toolId);
  const currentVersion = parentVersion !== null ? parentVersion + 1 : 1;

  function getEffectivePrice(plan: { monthlyPricePerSeat: number; annualPrice?: number; isPayPerUse?: boolean; isEnterprise?: boolean }) {
    if (plan.isPayPerUse || plan.isEnterprise) return 0;
    if (isAnnual && plan.annualPrice) return plan.annualPrice;
    return plan.monthlyPricePerSeat;
  }

  function toggleTool(toolId: string) {
    const isSelected = selectedToolIds.includes(toolId as ToolEntry['toolId']);
    if (isSelected) {
      setForm((prev) => ({ ...prev, tools: prev.tools.filter((t) => t.toolId !== toolId) }));
    } else {
      const tool = TOOLS.find((t) => t.id === toolId)!;
      const defaultPlan = tool.plans.find((p) => p.id === tool.defaultPlan) || tool.plans[0];
      const price = getEffectivePrice(defaultPlan);
      const apiDefaults: Record<string, number> = { 'openai-api': 25, 'anthropic-api': 30 };
      const newEntry: ToolEntry = {
        toolId: toolId as ToolEntry['toolId'],
        plan: defaultPlan.id,
        monthlySpend: defaultPlan.isPayPerUse ? (apiDefaults[toolId] || 20) : price * 1,
        seats: 1,
        useCase: form.useCase,
      };
      setForm((prev) => ({ ...prev, tools: [...prev.tools, newEntry] }));

      // Trigger onboarding guidance on first tool selection
      if (selectedToolIds.length === 0 && !guidanceEverTriggered) {
        setGuidanceEverTriggered(true);

        // Wait 400-600ms before highlighting
        setTimeout(() => {
          setShowHighlight(true);
          setShowFloatingHint(true);

          // Remove highlight after 2.5 seconds
          setTimeout(() => {
            setShowHighlight(false);
          }, 2500);

          // Remove floating hint after 3 seconds
          setTimeout(() => {
            setShowFloatingHint(false);
          }, 3000);
        }, 500);

        // Smoothly scroll to center Tier Plans section after 2 seconds
        setTimeout(() => {
          if (tierPlansRef.current) {
            tierPlansRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 2000);
      }
    }
  }

  function toggleBillingPeriod(period: BillingPeriod) {
    setForm((prev) => {
      const updatedTools = prev.tools.map((entry) => {
        const tool = TOOLS.find((t) => t.id === entry.toolId)!;
        const plan = tool.plans.find((p) => p.id === entry.plan);
        if (!plan || plan.isPayPerUse || plan.isEnterprise) return entry;
        const price = period === 'annual' && plan.annualPrice ? plan.annualPrice : plan.monthlyPricePerSeat;
        return { ...entry, monthlySpend: price * entry.seats };
      });
      return { ...prev, billingPeriod: period, tools: updatedTools };
    });
  }

  function updateToolEntry(toolId: string, updates: Partial<ToolEntry>) {
    dismissGuidance();
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.map((t) =>
        t.toolId === toolId ? { ...t, ...updates } : t
      ),
    }));
  }

  const toolSeats = form.tools.map((t) => t.seats || 1);
  const totalLicensedSeats = toolSeats.reduce((sum, s) => sum + s, 0);
  const effectiveTeamSize = toolSeats.length > 0 ? Math.max(...toolSeats) : 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.tools.length === 0) {
      setError('Please select at least one AI tool to audit.');
      return;
    }

    setLoading(true);
    try {
      const payload: AuditRequest = {
        tools: form.tools,
        teamSize: effectiveTeamSize,
        companyName: form.companyName || undefined,
        useCase: form.useCase,
        optimizationGoal: form.optimizationGoal,
        billingCycle: form.billingPeriod,
      };

      if (reAuditOf) {
        payload.reAuditOf = reAuditOf;
      }

      const result = await submitAudit(payload);
      if (!result || !result.auditId) {
        throw new Error('Audit completed but no valid audit identifier was returned.');
      }
      
      // Mark this audit as owned by this user session (scoped — not shared across users)
      localStorage.setItem(getUserScopedKey(`owned_${result.auditId}`), 'true');
      if (result.ownerToken) {
        localStorage.setItem(getUserScopedKey(`audit_token_${result.auditId}`), result.ownerToken);
      }
      setForm(DEFAULT_FORM);

      if (reAuditOf) {
        navigate(`/audit/${result.auditId}/diff`, { state: { isOwner: true } });
      } else {
        navigate(`/audit/${result.auditId}`, { state: { audit: result, isOwner: true } });
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to run audit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = `w-full px-4 py-3 rounded text-sm transition-all focus:outline-none placeholder:text-[#94A3B8]`;

  const inputStyle = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-heading)',
  } as const;

  const inputFocusHandlers = {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--color-primary)';
      e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-bg-base), 0 0 0 4px var(--color-primary)';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--color-border)';
      e.currentTarget.style.boxShadow = 'none';
    },
  };

  const estimatedSpend = form.tools.reduce((total, t) => total + t.monthlySpend, 0);




  const ideSpend = form.tools.filter(t => {
    const tool = TOOLS.find(x => x.id === t.toolId);
    return tool?.category === 'AI IDE';
  }).reduce((acc, curr) => acc + curr.monthlySpend, 0);

  const chatSpend = form.tools.filter(t => {
    const tool = TOOLS.find(x => x.id === t.toolId);
    return tool?.category === 'AI Chat';
  }).reduce((acc, curr) => acc + curr.monthlySpend, 0);

  const apiSpend = form.tools.filter(t => {
    const tool = TOOLS.find(x => x.id === t.toolId);
    return tool?.category === 'API';
  }).reduce((acc, curr) => acc + curr.monthlySpend, 0);

  const idePercent = estimatedSpend > 0 ? Math.round((ideSpend / estimatedSpend) * 100) : 0;
  const chatPercent = estimatedSpend > 0 ? Math.round((chatSpend / estimatedSpend) * 100) : 0;
  const apiPercent = estimatedSpend > 0 ? Math.round((apiSpend / estimatedSpend) * 100) : 0;

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="w-full max-w-[1600px] xl:max-w-[1720px] px-4 sm:px-8 xl:px-12 h-16 flex items-center justify-between mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            aria-label="Back to home"
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <Logo asDiv />
          <div className="flex items-center gap-3">
            <OfferNotificationBell />
          </div>
        </div>
      </header>


      <div className="w-full max-w-[1600px] xl:max-w-[1720px] px-4 sm:px-8 xl:px-12 py-12 mx-auto">

        {/* ── Page Header ─────────────────────────────────── */}
        <div className="mb-12 text-left">
          <span className="text-overline mb-2 block">Zero-Integration Audit</span>
          <h1
            className="text-3xl font-extrabold tracking-tight mb-2"
            style={{ color: 'var(--color-text-heading)', letterSpacing: '-0.02em' }}
          >
            {reAuditOf ? 'Evolve Your AI Stack' : 'Audit Your AI Stack'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-body)' }}>
            {reAuditOf
              ? 'Modify your tools and settings below to append a new version to this timeline.'
              : 'Choose the plans your team pays for. We do not require account access or financial credentials.'}
          </p>
        </div>

        {/* ── Evolution Banner ─────────────────────────────── */}
        {reAuditOf && (
          <div
            className="mb-8 p-4 rounded border flex items-start gap-3"
            style={{
              background: 'var(--color-warning-bg)',
              borderColor: 'rgba(217,119,6,0.2)',
            }}
          >
            <svg
              className="mt-0.5 shrink-0"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: 'var(--color-warning)' }}
            >
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-bold text-xs" style={{ color: 'var(--color-warning-t)' }}>
                {isPrefilling
                  ? 'Loading stack configurations…'
                  : `Evolving Stack — Version ${(parentVersion ?? 1) + 1} Preview`}
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(120,53,15,0.75)' }}>
                Loaded configuration from timeline. Modify tools or counts below to compare baseline results side-by-side.
              </p>
            </div>
          </div>
        )}

        {/* ── Progress Indicators ──────────────────────────── */}
        <div className="flex items-center gap-6 mb-8 border-b pb-6" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { label: 'Metadata', done: true },
            { label: 'Select Tools', done: form.tools.length > 0 },
            { label: 'Invoice Info', done: form.tools.length > 0 && form.tools.every(t => t.monthlySpend > 0) },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <StepBadge n={i + 1} done={step.done} />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: step.done ? 'var(--color-text-heading)' : 'var(--color-text-muted)' }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 xl:gap-12 items-start">
          <div className="flex-1 min-w-0 space-y-8">

            {/* ── Step 1: Team info ─────────────────────────── */}
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-5 border rounded-xl bg-[var(--color-bg-surface)]"
              style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
            >
              <h2
                className="text-sm sm:text-base font-bold mb-3 flex items-center gap-2.5"
                style={{ color: 'var(--color-text-heading)' }}
              >
                <StepBadge n={1} done={true} />
                Team Metadata
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label
                    className="block text-[10.5px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="companyName"
                  >
                    Company Name <span className="font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={form.companyName}
                    onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md text-xs sm:text-sm transition-all focus:outline-none placeholder:text-[#94A3B8] font-medium"
                    style={inputStyle}
                    {...inputFocusHandlers}
                    aria-label="Company name"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label
                    className="block text-[10.5px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="useCase"
                  >
                    Engineering focus / usecase
                  </label>
                  <select
                    id="useCase"
                    value={form.useCase}
                    onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value as UseCase }))}
                    className="w-full px-3 py-2 rounded-md text-xs sm:text-sm transition-all focus:outline-none font-medium cursor-pointer"
                    style={inputStyle}
                    {...inputFocusHandlers}
                    aria-label="Primary use case"
                  >
                    {USE_CASES.map((uc) => (
                      <option key={uc.id} value={uc.id}>{uc.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-[10.5px] font-bold uppercase tracking-wider mb-1"
                    style={{ color: 'var(--color-text-muted)' }}
                    htmlFor="optimizationGoal"
                  >
                    Optimization Goal
                  </label>
                  <select
                    id="optimizationGoal"
                    value={form.optimizationGoal}
                    onChange={(e) => setForm((p) => ({ ...p, optimizationGoal: e.target.value as FormState['optimizationGoal'] }))}
                    className="w-full px-3 py-2 rounded-md text-xs sm:text-sm transition-all focus:outline-none font-medium cursor-pointer"
                    style={inputStyle}
                    {...inputFocusHandlers}
                    aria-label="Optimization goal"
                  >
                    <option value="balanced">Balanced Approach (Recommended)</option>
                    <option value="savings">Save Money (Aggressive Consolidation)</option>
                    <option value="productivity">Maximum Productivity (DX-First)</option>
                    <option value="governance">Enterprise Governance (SSO & Policies)</option>
                  </select>
                </div>
              </div>
            </m.div>

            {/* ── Step 2: Select tools ──────────────────────── */}
            <m.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-6 border rounded-lg bg-[var(--color-bg-surface)]"
              style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2
                      className="text-base font-bold flex items-center gap-3"
                      style={{ color: 'var(--color-text-heading)' }}
                    >
                      <StepBadge n={2} done={form.tools.length > 0} />
                      Choose AI Tools
                    </h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider"
                      style={{
                        background: form.tools.length > 0 ? 'var(--color-success-bg)' : 'rgba(30,58,95,0.05)',
                        color: form.tools.length > 0 ? 'var(--color-success-t)' : 'var(--color-text-muted)',
                        border: form.tools.length > 0 ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--color-border)',
                      }}
                    >
                      {form.tools.length} selected
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Select the AI tools currently used by your team.
                  </p>
                </div>

                {/* Billing Toggle */}
                <div
                  className="flex items-center gap-1 p-1 rounded"
                  style={{ background: 'var(--color-bg-base)', border: '1px solid var(--color-border)' }}
                >
                  <button
                    type="button"
                    onClick={() => toggleBillingPeriod('monthly')}
                    className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all"
                    style={!isAnnual
                      ? { background: 'var(--color-primary)', color: '#fff' }
                      : { color: 'var(--color-text-muted)' }
                    }
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleBillingPeriod('annual')}
                    className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all"
                    style={isAnnual
                      ? { background: 'var(--color-primary)', color: '#fff' }
                      : { color: 'var(--color-text-muted)' }
                    }
                  >
                    Annual
                  </button>
                </div>
              </div>

              <ToolBrowser
                tools={TOOLS}
                selectedToolIds={selectedToolIds}
                onToggle={toggleTool}
                logoMap={logoMap}
                parentToolIds={parentToolIds}
                currentVersion={currentVersion}
              />
            </m.div>

            {/* ── Step 3: Tool details ──────────────────────── */}
            <AnimatePresence>
              {form.tools.length > 0 && (
                <m.div
                  ref={tierPlansRef}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`p-6 border rounded-lg bg-[var(--color-bg-surface)] relative ${showHighlight ? 'onboarding-highlight' : ''}`}
                  style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
                >
                  {showFloatingHint && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -top-[70px] z-50 bg-[#2563eb] text-white px-5 py-3 rounded-xl shadow-lg text-xs font-semibold flex flex-col items-center pointer-events-none animate-tooltip-entry"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>👇</span>
                        <span className="uppercase tracking-wider">Next Step</span>
                      </div>
                      <div className="text-[11px] font-normal text-blue-100 mt-1">
                        Configure your seat count and pricing before running the audit.
                      </div>
                      {/* Downward pointing arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#2563eb]"></div>
                    </div>
                  )}
                  <h2
                    className="text-base font-bold mb-2 flex items-center gap-3"
                    style={{ color: 'var(--color-text-heading)' }}
                  >
                    <StepBadge n={3} done={form.tools.length > 0 && form.tools.every(t => t.monthlySpend > 0)} />
                    Specify Seat Counts & Tier Plans
                  </h2>
                  <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
                    Provide exact seat numbers to ensure calculation precision.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {form.tools.map((entry) => {
                      const tool = TOOLS.find((t) => t.id === entry.toolId)!;
                      const isNewTool = parentToolIds !== null && parentToolIds !== undefined && !parentToolIds.includes(entry.toolId);
                      const currentPlan = tool.plans.find((p) => p.id === entry.plan);
                      const isPayPerUse = currentPlan?.isPayPerUse;
                      const isEnterprise = currentPlan?.isEnterprise;
                      const billingType = currentPlan?.billingType || 'per-seat';
                      const minSeats = currentPlan?.minSeats;
                      const logoSrc = logoMap[entry.toolId];

                      function formatPlanLabel(p: typeof tool.plans[0]) {
                        if (p.isEnterprise) return `${p.label} (Contact Sales)`;
                        if (p.isPayPerUse) return `${p.label} (Usage-based)`;
                        if (p.monthlyPricePerSeat === 0) return `${p.label} (Free)`;
                        const price = getEffectivePrice(p);
                        const suffix = isAnnual && p.annualPrice ? '/mo billed annually' : '/user/mo';
                        return `${p.label} ($${price}${suffix})`;
                      }

                      return (
                        <div
                          key={entry.toolId}
                          className="rounded-lg border p-5 bg-[var(--color-bg-base)] flex flex-col justify-between space-y-4"
                          style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
                        >
                          {/* Header: Logo, Name, Badge */}
                          <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[var(--color-bg-surface)] border flex items-center justify-center shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                <img src={logoSrc} alt="" className="w-4 h-4 object-contain" />
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-sm tracking-tight text-[var(--color-text-heading)] truncate">
                                  {tool.name}
                                </span>
                                {isNewTool && (
                                  <span
                                    className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.25 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0"
                                    title={`Added in Version ${currentVersion}`}
                                  >
                                    NEW
                                  </span>
                                )}
                              </div>
                            </div>

                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                background: 'var(--color-bg-surface)',
                                color: 'var(--color-text-heading)',
                                border: '1px solid var(--color-border)',
                              }}
                            >
                              {billingType}
                            </span>
                          </div>

                          {/* Fields Stack */}
                          <div className="space-y-3">
                            {/* Plan selector */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }} htmlFor={`plan-${entry.toolId}`}>
                                Tier Plan
                              </label>
                              <select
                                id={`plan-${entry.toolId}`}
                                value={entry.plan}
                                onChange={(e) => {
                                  const plan = tool.plans.find((p) => p.id === e.target.value);
                                  const price = plan ? getEffectivePrice(plan) : 0;
                                  updateToolEntry(entry.toolId, {
                                    plan: e.target.value,
                                    monthlySpend: plan?.isPayPerUse || plan?.isEnterprise
                                      ? entry.monthlySpend
                                      : price * entry.seats,
                                  });
                                }}
                                className={inputClass}
                                style={inputStyle}
                                {...inputFocusHandlers}
                              >
                                {tool.plans.map((p) => (
                                  <option key={p.id} value={p.id}>{formatPlanLabel(p)}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Monthly Spend */}
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }} htmlFor={`spend-${entry.toolId}`}>
                                  Spend ($/mo)
                                </label>
                                <input
                                  id={`spend-${entry.toolId}`}
                                  type="number"
                                  min={0}
                                  value={entry.monthlySpend}
                                  onChange={(e) => updateToolEntry(entry.toolId, { monthlySpend: parseFloat(e.target.value) || 0 })}
                                  readOnly={!isPayPerUse && !isEnterprise}
                                  className={inputClass}
                                  style={inputStyle}
                                  {...(!isPayPerUse && !isEnterprise ? {} : inputFocusHandlers)}
                                />
                              </div>

                              {/* Seat Count */}
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--color-text-muted)' }} htmlFor={`seats-${entry.toolId}`}>
                                  Seats
                                </label>
                                {!isPayPerUse && !isEnterprise ? (
                                  <input
                                    id={`seats-${entry.toolId}`}
                                    type="number"
                                    min={minSeats || 1}
                                    value={entry.seats}
                                    onChange={(e) => {
                                      const seats = Math.max(minSeats || 1, parseInt(e.target.value) || 1);
                                      const plan = tool.plans.find((p) => p.id === entry.plan);
                                      const price = plan ? getEffectivePrice(plan) : 0;
                                      updateToolEntry(entry.toolId, { seats, monthlySpend: price * seats });
                                    }}
                                    className={inputClass}
                                    style={inputStyle}
                                    {...inputFocusHandlers}
                                  />
                                ) : (
                                  <div className="text-[11px] font-medium text-slate-400 py-3 px-4 border border-dashed rounded text-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-base)' }}>
                                    N/A
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </m.div>
              )}
            </AnimatePresence>

            {/* ── Error State ───────────────────────────────── */}
            {error && (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded border flex items-start gap-3"
                style={{
                  background: 'var(--color-danger-bg)',
                  borderColor: 'rgba(220,38,38,0.2)',
                }}
                role="alert"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-danger)' }} className="mt-0.5 shrink-0">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: 'var(--color-danger-t)' }}>{error}</span>
              </m.div>
            )}

          </div>

          {/* Right Column Area (Sticky Live Summary Card) */}
          <div className="w-full xl:w-[420px] shrink-0 sticky-panel">
            <div className="summary-sidebar-container bg-white border border-slate-100 rounded-3xl p-8 space-y-7 shadow-sm">
              
              {/* Top: Header & Estimated Spend */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Audit Summary
                  </span>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[12px] font-semibold text-slate-400 block">
                    Estimated Spend
                  </span>
                  <div className="text-[48px] font-black tracking-tight leading-none text-slate-900 font-mono-financial py-2">
                    ${estimatedSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-lg font-sans font-medium text-slate-400">/mo</span>
                  </div>
                </div>

                {/* Cost Distribution bar */}
                {estimatedSpend > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-50 border border-slate-100/50">
                      {idePercent > 0 && (
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={{ width: `${idePercent}%`, background: 'rgb(99, 102, 241)' }}
                          title={`AI IDE: ${idePercent}% ($${ideSpend})`}
                        />
                      )}
                      {chatPercent > 0 && (
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={{ width: `${chatPercent}%`, background: 'rgb(16, 185, 129)' }}
                          title={`AI Chat: ${chatPercent}% ($${chatSpend})`}
                        />
                      )}
                      {apiPercent > 0 && (
                        <div
                          className="h-full transition-all duration-500 ease-out"
                          style={{ width: `${apiPercent}%`, background: 'rgb(168, 85, 247)' }}
                          title={`API: ${apiPercent}% ($${apiSpend})`}
                        />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[10px] text-slate-400 font-semibold">
                      {idePercent > 0 && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(99, 102, 241)' }} /> IDE ({idePercent}%)</span>}
                      {chatPercent > 0 && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(16, 185, 129)' }} /> Chat ({chatPercent}%)</span>}
                      {apiPercent > 0 && <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(168, 85, 247)' }} /> API ({apiPercent}%)</span>}
                    </div>
                  </div>
                )}
              </div>



              {/* Third Section: Metrics Profile */}
              <div className="py-2 border-t border-b border-slate-100">
                <div className="grid grid-cols-3 divide-x divide-slate-100">
                  <div className="text-center px-2 space-y-1">
                    <span className="text-[20px] font-black text-slate-800 tracking-tight leading-none block font-mono-financial">
                      {totalLicensedSeats}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Total Seats
                    </span>
                  </div>
                  <div className="text-center px-2 space-y-1">
                    <span className="text-[14px] font-bold uppercase text-slate-800 tracking-tight leading-none block truncate" title={form.billingPeriod}>
                      {form.billingPeriod}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Billing
                    </span>
                  </div>
                  <div className="text-center px-2 space-y-1">
                    <span className="text-[14px] font-bold text-slate-800 tracking-tight leading-none block truncate capitalize" title={form.useCase}>
                      {form.useCase}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                      Focus
                    </span>
                  </div>
                </div>
              </div>

              {/* Fourth Section: Selected Platforms */}
              {form.tools.length > 0 && (
                <div className="space-y-3 pt-1">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                    Selected Platforms ({form.tools.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {form.tools.map((entry) => {
                      const tool = TOOLS.find(t => t.id === entry.toolId);
                      const logoSrc = logoMap[entry.toolId];
                      if (!tool) return null;
                      return (
                        <div
                          key={entry.toolId}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-100 bg-white hover:border-slate-300 hover:-translate-y-[1.5px] hover:shadow-xs transition-all duration-200 cursor-default shrink-0"
                        >
                          <img src={logoSrc} alt="" className="w-4 h-4 object-contain" />
                          <span className="text-slate-700">{tool.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Section: Run Stack Audit */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                  <span>Estimated Analysis Time</span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-pulse text-slate-400">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    ~5 seconds
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || form.tools.length === 0}
                  id="submit-audit"
                  className="btn-primary w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98] transition-transform shadow-xs"
                >
                  {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {loadingText}
                    </span>
                  ) : (
                    <>
                      Run Stack Audit
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
