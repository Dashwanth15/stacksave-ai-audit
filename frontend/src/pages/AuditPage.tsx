import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { TOOLS, USE_CASES } from '../data/tools';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { submitAudit } from '../services/api';
import type { ToolEntry, UseCase } from '../types';

interface FormState {
  tools: ToolEntry[];
  teamSize: number;
  companyName: string;
  useCase: UseCase;
}

const DEFAULT_FORM: FormState = {
  tools: [],
  teamSize: 5,
  companyName: '',
  useCase: 'mixed',
};

export default function AuditPage() {
  const navigate = useNavigate();
  const [form, setForm, clearForm] = useLocalStorage<FormState>('stacksave-audit-form', DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which tools are toggled on
  const selectedToolIds = form.tools.map((t) => t.toolId);

  function toggleTool(toolId: string) {
    const isSelected = selectedToolIds.includes(toolId as ToolEntry['toolId']);
    if (isSelected) {
      setForm((prev) => ({ ...prev, tools: prev.tools.filter((t) => t.toolId !== toolId) }));
    } else {
      const tool = TOOLS.find((t) => t.id === toolId)!;
      const defaultPlan = tool.plans.find((p) => p.id === tool.defaultPlan) || tool.plans[0];
      const newEntry: ToolEntry = {
        toolId: toolId as ToolEntry['toolId'],
        plan: defaultPlan.id,
        monthlySpend: defaultPlan.isPayPerUse ? 0 : (defaultPlan.monthlyPricePerSeat * 1),
        seats: 1,
        useCase: form.useCase,
      };
      setForm((prev) => ({ ...prev, tools: [...prev.tools, newEntry] }));
    }
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
    <div className="min-h-screen grid-bg py-12 px-4 sm:px-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-10 text-center">
        <button
          onClick={() => navigate('/')}
          className="text-indigo-400 text-sm hover:text-indigo-300 mb-6 inline-flex items-center gap-1"
          aria-label="Back to home"
        >
          ← Back to home
        </button>
        <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
          Audit Your <span className="gradient-text">AI Stack</span>
        </h1>
        <p className="text-[#94a3b8] text-lg">
          Select your tools, enter what you're paying, and we'll find where you're overspending.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
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
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-bold flex items-center justify-center">2</span>
            Which AI tools do you pay for?
          </h2>
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
                  <div className="text-[10px] text-[#475569] mt-1">{tool.category}</div>
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

                  return (
                    <div key={entry.toolId} className="border border-white/8 rounded-xl p-5 bg-white/2">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xl" role="img" aria-hidden="true">{tool.icon}</span>
                        <span className="font-semibold text-white">{tool.name}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Plan */}
                        <div>
                          <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`plan-${entry.toolId}`}>
                            Current plan
                          </label>
                          <select
                            id={`plan-${entry.toolId}`}
                            value={entry.plan}
                            onChange={(e) => {
                              const plan = tool.plans.find((p) => p.id === e.target.value);
                              updateToolEntry(entry.toolId, {
                                plan: e.target.value,
                                monthlySpend: plan?.isPayPerUse ? entry.monthlySpend : (plan?.monthlyPricePerSeat || 0) * entry.seats,
                              });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                            aria-label={`Plan for ${tool.name}`}
                          >
                            {tool.plans.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#1a1a2e]">
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Monthly spend */}
                        <div>
                          <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`spend-${entry.toolId}`}>
                            Monthly spend ($)
                          </label>
                          <input
                            id={`spend-${entry.toolId}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={entry.monthlySpend}
                            onChange={(e) => updateToolEntry(entry.toolId, { monthlySpend: parseFloat(e.target.value) || 0 })}
                            placeholder={isPayPerUse ? 'Enter actual spend' : 'Auto-calculated'}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none placeholder-[#475569]"
                            aria-label={`Monthly spend for ${tool.name}`}
                          />
                        </div>

                        {/* Seats */}
                        {!isPayPerUse && (
                          <div>
                            <label className="block text-xs text-[#64748b] mb-1.5" htmlFor={`seats-${entry.toolId}`}>
                              Seats / licenses
                            </label>
                            <input
                              id={`seats-${entry.toolId}`}
                              type="number"
                              min={1}
                              value={entry.seats}
                              onChange={(e) => {
                                const seats = parseInt(e.target.value) || 1;
                                const plan = tool.plans.find((p) => p.id === entry.plan);
                                updateToolEntry(entry.toolId, {
                                  seats,
                                  monthlySpend: plan?.isPayPerUse ? entry.monthlySpend : (plan?.monthlyPricePerSeat || 0) * seats,
                                });
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500/50 focus:outline-none"
                              aria-label={`Seats for ${tool.name}`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
  );
}
