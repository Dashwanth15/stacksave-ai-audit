import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { TOOLS, USE_CASES } from '../data/tools';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { submitAudit } from '../services/api';
import type { ToolEntry, UseCase, BillingType } from '../types';

type BillingPeriod = 'monthly' | 'annual';

interface FormState {
  tools: ToolEntry[];
  teamSize: number;
  companyName: string;
  useCase: UseCase;
  billingPeriod: BillingPeriod;
}

const DEFAULT_FORM: FormState = {
  tools: [],
  teamSize: 5,
  companyName: '',
  useCase: 'mixed',
  billingPeriod: 'monthly',
};

export default function AuditPage() {
  const navigate = useNavigate();
  const [form, setForm, clearForm] = useLocalStorage<FormState>('stacksave-audit-form', DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnnual = form.billingPeriod === 'annual';

  // Which tools are toggled on
  const selectedToolIds = form.tools.map((t) => t.toolId);

  // Get effective price for a plan based on billing period
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
      const newEntry: ToolEntry = {
        toolId: toolId as ToolEntry['toolId'],
        plan: defaultPlan.id,
        monthlySpend: defaultPlan.isPayPerUse ? 0 : price * 1,
        seats: 1,
        useCase: form.useCase,
      };
      setForm((prev) => ({ ...prev, tools: [...prev.tools, newEntry] }));
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
    setForm((prev) => ({
      ...prev,
      tools: prev.tools.map((t) =>
        t.toolId === toolId ? { ...t, ...updates } : t
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.tools.length === 0) {
      setError('Please select at least one AI tool to audit.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitAudit({
        tools: form.tools,
        teamSize: form.teamSize,
        companyName: form.companyName || undefined,
        useCase: form.useCase,
      });
      clearForm();
      navigate(`/results/${result.auditId}`, { state: { audit: result } });
    } catch (err) {
      setError((err as Error).message || 'Failed to run audit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      {/* Header */}
      <div className="mb-12 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-indigo-400 text-sm hover:text-indigo-300 mb-6 inline-flex items-center gap-1 transition-colors"
          aria-label="Back to home"
        >
          ← Back to home
        </button>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
          Audit Your <span className="gradient-text">AI Stack</span>
        </h1>
        <p className="text-[#94a3b8] text-lg max-w-xl mx-auto leading-relaxed">
          Select your tools, enter what you're paying, and we'll find where you're overspending.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {[
          { label: 'Team Info', done: form.teamSize > 0 },
          { label: 'Select Tools', done: form.tools.length > 0 },
          { label: 'Plan Details', done: form.tools.length > 0 && form.tools.every(t => t.monthlySpend > 0) },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step.done
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/5 text-[#64748b] border border-white/10'
            }`}>
              {step.done ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step.done ? 'text-emerald-400' : 'text-[#64748b]'}`}>
              {step.label}
            </span>
            {i < 2 && <div className={`w-8 h-0.5 ${step.done ? 'bg-emerald-500/30' : 'bg-white/8'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Team info */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center">1</span>
            Tell us about your team
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2" htmlFor="teamSize">
                Team size (total people)
              </label>
              <input
                id="teamSize"
                type="number"
                min={1}
                max={10000}
                value={form.teamSize}
                onChange={(e) => setForm((p) => ({ ...p, teamSize: parseInt(e.target.value) || 1 }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#475569] focus:border-indigo-500/50 focus:outline-none focus:bg-white/8 transition-all"
                aria-label="Team size"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#94a3b8] mb-2" htmlFor="companyName">
                Company name <span className="text-[#475569] font-normal">(optional)</span>
              </label>
              <input
                id="companyName"
                type="text"
                placeholder="Acme Inc."
                value={form.companyName}
                onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-[#475569] focus:border-indigo-500/50 focus:outline-none transition-all"
                aria-label="Company name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#94a3b8] mb-2" htmlFor="useCase">
                Primary use case
              </label>
              <select
                id="useCase"
                value={form.useCase}
                onChange={(e) => setForm((p) => ({ ...p, useCase: e.target.value as UseCase }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                aria-label="Primary use case"
              >
                {USE_CASES.map((uc) => (
                  <option key={uc.id} value={uc.id} className="bg-[#1a1a2e]">
                    {uc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </m.div>

        {/* Step 2: Select tools */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center">2</span>
              Which AI tools do you pay for?
            </h2>

            {/* Monthly / Annual toggle */}
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/10">
              <button
                type="button"
                onClick={() => toggleBillingPeriod('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !isAnnual
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => toggleBillingPeriod('annual')}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isAnnual
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-[#64748b] hover:text-white'
                }`}
              >
                Annual
                {!isAnnual && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Save up to 20%</span>
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-[#64748b] mb-6">Select all that apply. You can add details for each below.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TOOLS.map((tool) => {
              const selected = selectedToolIds.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleTool(tool.id)}
                  id={`tool-toggle-${tool.id}`}
                  aria-pressed={selected}
                  aria-label={`Toggle ${tool.name}`}
                  className={`p-4 rounded-xl border transition-all text-center ${
                    selected
                      ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                      : 'border-white/8 bg-white/3 text-[#64748b] hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="text-2xl mb-1" role="img" aria-hidden="true">{tool.icon}</div>
                  <div className="text-xs font-medium leading-tight">{tool.name}</div>
                  <div className="text-[9px] text-[#475569] mt-0.5 leading-tight">{tool.description}</div>
                  <div className={`text-[10px] mt-1.5 px-2 py-0.5 rounded-full inline-block ${
                    selected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-[#475569]'
                  }`}>{tool.category}</div>
                </button>
              );
            })}
          </div>
        </m.div>

        {/* Step 3: Tool details */}
        <AnimatePresence>
          {form.tools.length > 0 && (
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card p-6"
            >
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center">3</span>
                Enter your plan details
              </h2>
              <p className="text-sm text-[#64748b] mb-6">Be as accurate as possible — the audit quality depends on real numbers.</p>
              <div className="space-y-5">
                {form.tools.map((entry) => {
                  const tool = TOOLS.find((t) => t.id === entry.toolId)!;
                  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
                  const isPayPerUse = currentPlan?.isPayPerUse;
                  const isEnterprise = currentPlan?.isEnterprise;
                  const billingType = currentPlan?.billingType || 'per-seat';
                  const minSeats = currentPlan?.minSeats;
                  const hasAnnualDiscount = currentPlan?.annualPrice && currentPlan.annualPrice < currentPlan.monthlyPricePerSeat;

                  // Format plan label with price based on billing period
                  function formatPlanLabel(p: typeof tool.plans[0]) {
                    if (p.isEnterprise) return `${p.label} (Contact Sales)`;
                    if (p.isPayPerUse) return `${p.label} (Usage-based)`;
                    if (p.monthlyPricePerSeat === 0) return `${p.label} (Free)`;
                    const price = getEffectivePrice(p);
                    const suffix = isAnnual && p.annualPrice ? '/mo billed annually' : '/user/mo';
                    if (isAnnual && p.annualPrice && p.annualPrice < p.monthlyPricePerSeat) {
                      return `${p.label} ($${price}${suffix})`;
                    }
                    return `${p.label} ($${price}/user/mo)`;
                  }

                  return (
                    <div key={entry.toolId} className="border border-white/8 rounded-xl p-5 bg-white/2">
                      {/* Tool header with description */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl" role="img" aria-hidden="true">{tool.icon}</span>
                          <div>
                            <span className="font-semibold text-white">{tool.name}</span>
                            <p className="text-[10px] text-[#64748b] leading-tight">{tool.description}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          billingType === 'usage-based' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          billingType === 'custom' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {billingType === 'usage-based' ? '📊 Usage-based' :
                           billingType === 'custom' ? '🏢 Enterprise' :
                           billingType === 'flat' ? '💳 Flat rate' : '👥 Per-seat'}
                        </span>
                      </div>

                      {/* Enterprise notice */}
                      {isEnterprise && (
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 mb-4 text-center">
                          <p className="text-purple-300 text-sm font-medium">Enterprise — Contact Sales for pricing</p>
                          <p className="text-[#64748b] text-xs mt-1">Enter your estimated monthly spend below</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Plan selector */}
                        <div>
                          <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`plan-${entry.toolId}`}>
                            Current plan
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
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                            aria-label={`Plan for ${tool.name}`}
                          >
                            {tool.plans.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#1a1a2e]">
                                {formatPlanLabel(p)}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Monthly spend — always shown */}
                        <div>
                          <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`spend-${entry.toolId}`}>
                            {isPayPerUse ? 'Monthly API spend ($)' : 'Monthly spend ($)'}
                          </label>
                          <input
                            id={`spend-${entry.toolId}`}
                            type="number"
                            min={0}
                            step={isPayPerUse ? 1 : 0.01}
                            value={entry.monthlySpend}
                            onChange={(e) => updateToolEntry(entry.toolId, { monthlySpend: parseFloat(e.target.value) || 0 })}
                            placeholder={isPayPerUse ? 'e.g. 500' : isEnterprise ? 'Estimated spend' : 'Auto-calculated'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none placeholder-[#475569]"
                            aria-label={`Monthly spend for ${tool.name}`}
                          />
                          {isPayPerUse && (
                            <p className="text-[10px] text-amber-400/60 mt-1">Enter your actual monthly API bill</p>
                          )}
                        </div>

                        {/* Seats — only for seat-based plans */}
                        {!isPayPerUse && !isEnterprise && currentPlan && currentPlan.monthlyPricePerSeat > 0 && (
                          <div>
                            <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`seats-${entry.toolId}`}>
                              Seats / licenses
                            </label>
                            <input
                              id={`seats-${entry.toolId}`}
                              type="number"
                              min={minSeats || 1}
                              value={entry.seats}
                              onChange={(e) => {
                                const seats = Math.max(minSeats || 1, parseInt(e.target.value) || 1);
                                const plan = tool.plans.find((p) => p.id === entry.plan);
                                const price = plan ? getEffectivePrice(plan) : 0;
                                updateToolEntry(entry.toolId, {
                                  seats,
                                  monthlySpend: price * seats,
                                });
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                              aria-label={`Seats for ${tool.name}`}
                            />
                            {minSeats && (
                              <p className="text-[10px] text-[#64748b] mt-1">Min {minSeats} seats required</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Annual discount hint */}
                      {hasAnnualDiscount && !isPayPerUse && !isEnterprise && (
                        <div className="mt-3 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                          <span className="text-emerald-400 text-xs">💡</span>
                          <p className="text-emerald-400/80 text-xs">
                            Annual billing available at ${currentPlan!.annualPrice}/user/mo — saves {Math.round(((currentPlan!.monthlyPricePerSeat - currentPlan!.annualPrice!) / currentPlan!.monthlyPricePerSeat) * 100)}%
                          </p>
                        </div>
                      )}

                      {/* Annual not available notice */}
                      {isAnnual && !isPayPerUse && !isEnterprise && currentPlan && currentPlan.monthlyPricePerSeat > 0 && !currentPlan.annualPrice && (
                        <div className="mt-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 flex items-center gap-2">
                          <span className="text-amber-400 text-xs">⚠️</span>
                          <p className="text-amber-400/80 text-xs">
                            Annual billing not available for {tool.name} {currentPlan.label}. Subscribe monthly at ${currentPlan.monthlyPricePerSeat}/mo.
                          </p>
                        </div>
                      )}

                      {/* Plan features */}
                      {currentPlan?.features && currentPlan.features.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-white/2 border border-white/5">
                          {currentPlan.tagline && (
                            <p className="text-xs text-[#94a3b8] mb-2 font-medium">{currentPlan.tagline}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                            {currentPlan.features.map((feature, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <span className="text-emerald-400 text-[10px] mt-0.5 shrink-0">✓</span>
                                <span className="text-[11px] text-[#64748b] leading-tight">{feature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-tool use case */}
                      <div className="mt-3">
                        <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`usecase-${entry.toolId}`}>
                          How does your team primarily use {tool.name}?
                        </label>
                        <select
                          id={`usecase-${entry.toolId}`}
                          value={entry.useCase}
                          onChange={(e) => updateToolEntry(entry.toolId, { useCase: e.target.value as UseCase })}
                          className="w-full sm:w-1/2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                          aria-label={`Use case for ${tool.name}`}
                        >
                          {USE_CASES.map((uc) => (
                            <option key={uc.id} value={uc.id} className="bg-[#1a1a2e]">
                              {uc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live cost summary */}
              {form.tools.length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/8">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#94a3b8]">
                      Total monthly AI spend ({form.tools.length} tool{form.tools.length > 1 ? 's' : ''})
                    </span>
                    <span className="text-2xl font-bold text-white">
                      ${form.tools.reduce((sum, t) => sum + t.monthlySpend, 0).toLocaleString()}<span className="text-sm font-normal text-[#64748b]">/mo</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (form.tools.reduce((sum, t) => sum + t.monthlySpend, 0) / 500) * 100)}%`,
                        background: 'linear-gradient(90deg, #34d399, #6366f1, #f87171)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#475569] mt-1">
                    {form.tools.reduce((sum, t) => sum + t.monthlySpend, 0) > 200
                      ? '💡 Higher spend = more optimization opportunities'
                      : 'Enter accurate numbers for the best audit results'}
                  </p>
                </div>
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm"
            role="alert"
          >
            {error}
          </m.div>
        )}

        {/* Submit */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center pb-8"
        >
          <button
            type="submit"
            disabled={loading || form.tools.length === 0}
            id="submit-audit"
            aria-label="Run AI spend audit"
            className="px-10 py-4 rounded-xl font-bold text-lg text-white glow-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:glow-none transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {loading ? (
              <span className="flex items-center gap-3 justify-center">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing your stack…
              </span>
            ) : (
              `Run Audit → ${form.tools.length > 0 ? `(${form.tools.length} tool${form.tools.length > 1 ? 's' : ''})` : ''}`
            )}
          </button>
          {form.tools.length === 0 && (
            <p className="text-sm text-[#475569] mt-3">Select at least one tool above to continue</p>
          )}
        </m.div>
      </form>
      </div>
    </div>
  );
}
