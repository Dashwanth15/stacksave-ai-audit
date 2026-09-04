import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { submitStackBuilder } from '../services/api';
import type { StackBuilderRequest, StackStrategy } from '../types';
import Logo from '../components/Logo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import { setUserSessionItem } from '../utils/userSession';
import { trackBuildStackStarted } from '../utils/analytics';
import {
  DOMAIN_OPTIONS,
  REQUIREMENT_OPTIONS,
  STRATEGY_OPTIONS,
  OPTIMIZATION_GOAL_OPTIONS,
  type OptimizationGoal,
  STEPS,
} from '../components/build-stack/wizardData';
import SelectableCard from '../components/build-stack/SelectableCard';
import PolicyToggle from '../components/build-stack/PolicyToggle';
import StepHeader from '../components/build-stack/StepHeader';
import SpendConfigurator from '../components/build-stack/SpendConfigurator';
import BriefRail from '../components/build-stack/BriefRail';
import WizardProgress from '../components/build-stack/WizardProgress';
import GeneratingOverlay from '../components/build-stack/GeneratingOverlay';

// Governance switches for Step 4. Keys map 1:1 onto the `prefs` state —
// display copy only; the request payload is derived exactly as before.
const GOVERNANCE = [
  {
    key: 'preferOpenSource',
    title: 'Prefer direct API keys & BYOK models',
    desc: 'Favor tools where you can connect your own API keys for model flexibility.',
  },
  {
    key: 'avoidLockIn',
    title: 'Deprioritize high vendor lock-in',
    desc: 'Avoid closed platforms that make migrating to other providers difficult later.',
  },
  {
    key: 'requireZeroRetention',
    title: 'Enforce strict zero data retention',
    desc: 'Only recommend vendors with verifiable zero-retention enterprise privacy policies.',
  },
  {
    key: 'preferEstablishedVendors',
    title: 'Prefer Tier-1 established vendors',
    desc: 'Give priority to mature enterprise providers with high reliability and uptime.',
  },
] as const;

export default function BuildStackPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const [step, setStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1); // UI-only: enables click-to-edit
  const [briefOpen, setBriefOpen] = useState(false); // mobile "Review choices" disclosure
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    trackBuildStackStarted();
  }, []);

  // Scroll to top instantly on every step change (forward and backward).
  // Tied directly to [step] so it fires for handleNext, handleBack, and jumpToStep.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Belt-and-suspenders for browsers that don't support behavior:'instant'
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  // Form State
  const [domain, setDomain] = useState('');
  const [teamSize, setTeamSize] = useState(10);
  const [noBudget, setNoBudget] = useState(false);
  const [budget, setBudget] = useState(0);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<StackStrategy>('balanced');
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal>('balanced');
  const [prefs, setPrefs] = useState({
    preferOpenSource: false,
    avoidLockIn: false,
    requireZeroRetention: false,
    preferEstablishedVendors: false,
  });

  const toggleRequirement = (id: string) => {
    setRequirements((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const togglePref = (k: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const handleNext = () => {
    // Require an explicit domain choice before leaving Step 1 — no biased default.
    if (step === 1 && !domain) return;
    if (step < 4) {
      const next = step + 1;
      setStep(next);
      setMaxStepReached((m) => Math.max(m, next));
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Jump straight to any already-visited step (from the Brief rail / stepper).
  const jumpToStep = (n: number) => {
    if (n >= 1 && n <= maxStepReached) setStep(n);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const startedAt = performance.now();

    try {
      const req: StackBuilderRequest = {
        domain,
        requirements,
        strategy,
        optimizationGoal,
        teamSize,
        monthlyBudget: noBudget ? null : budget,
        preferences: {
          ...prefs,
          maximizeSavings: strategy === 'best-value' || optimizationGoal === 'savings',
          requireZeroRetention: prefs.requireZeroRetention || strategy === 'enterprise-security' || optimizationGoal === 'governance'
        },
        debug: true
      };

      const result = await submitStackBuilder(req);
      // Store recommendation scoped to this user session — not shared across users
      setUserSessionItem('stackRecommendation', JSON.stringify(result));

      // Let the "assembling" moment land, then hand off. (Skipped under reduced motion.)
      const minMs = reduce ? 0 : 1600;
      const elapsed = performance.now() - startedAt;
      if (elapsed < minMs) {
        await new Promise((r) => setTimeout(r, minMs - elapsed));
      }
      navigate('/build-stack/results');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate stack intelligence. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  const meta = STEPS[step - 1];

  const fadeSlide = reduce
    ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.15 } },
      exit: { opacity: 0, transition: { duration: 0.1 } },
    }
    : {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
      exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
    };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-slate-800 antialiased font-sans">
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md border-slate-200">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="focus:outline-none flex items-center gap-2">
            <Logo size="md" asDiv />
          </button>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-[0.08em] bg-[rgba(30,58,95,0.06)] text-[#1E3A5F]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Stack Architect
            </span>
            <OfferNotificationBell />
            <button
              onClick={() => navigate('/audit')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors bg-white"
            >
              Audit Existing Stack →
            </button>
          </div>
        </div>
      </header>

      {/* ── Progress (slim bar always; compact stepper on mobile/tablet) ── */}
      <WizardProgress
        steps={STEPS}
        step={step}
        maxStepReached={maxStepReached}
        onStepClick={jumpToStep}
      />

      {/* ── Wizard Console ── */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Mobile / tablet: collapsible Stack Brief */}
        <div className="lg:hidden mb-6">
          <button
            type="button"
            onClick={() => setBriefOpen((o) => !o)}
            aria-expanded={briefOpen}
            className="w-full flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3 shadow-xs"
          >
            <span className="flex items-center gap-2">
              <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#1E3A5F] to-emerald-500" />
              <span className="text-sm font-black text-slate-950">Your Stack Brief</span>
              <span className="font-mono-financial text-xs font-black text-[#1E3A5F] bg-[#1E3A5F]/10 px-2 py-0.5 rounded border border-[#1E3A5F]/20">
                {Math.min(maxStepReached, 4)}/4
              </span>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${briefOpen ? 'rotate-180' : ''}`}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <AnimatePresence initial={false}>
            {briefOpen && (
              <m.div
                key="brief"
                initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <BriefRail
                    step={step}
                    maxStepReached={maxStepReached}
                    onStepClick={(n) => {
                      jumpToStep(n);
                      setBriefOpen(false);
                    }}
                    domain={domain}
                    teamSize={teamSize}
                    noBudget={noBudget}
                    budget={budget}
                    requirements={requirements}
                    strategy={strategy}
                  />
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-10 items-start">
          {/* ── LEFT: decision canvas ── */}
          <div>
            <AnimatePresence mode="wait">
              <m.div key={step} variants={fadeSlide} initial="hidden" animate="visible" exit="exit">
                <StepHeader
                  numeral={meta.numeral}
                  eyebrow={meta.eyebrow}
                  title={meta.title}
                  aside={
                    step === 3 ? (
                      <span
                        className={`font-mono-financial text-xs font-black px-3 py-1 rounded-lg border-2 ${requirements.length > 0
                            ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                            : 'text-slate-700 bg-slate-100 border-slate-300'
                          }`}
                      >
                        {requirements.length} selected
                      </span>
                    ) : undefined
                  }
                />

                {/* ── Step 1: Domain ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {DOMAIN_OPTIONS.map((d) => (
                        <SelectableCard
                          key={d.id}
                          selected={domain === d.id}
                          onSelect={() => setDomain(d.id)}
                          title={d.title}
                          iconPath={d.iconPath}
                          overline={d.badge}
                          description={d.subtitle}
                        />
                      ))}
                    </div>
                    <p className="text-[13.5px] text-slate-700 font-medium pt-1.5">
                      This choice drives your entire recommendation — pick where your team does most of its work.
                    </p>
                  </div>
                )}

                {/* ── Step 2: Scale & Budget ── */}
                {step === 2 && (
                  <SpendConfigurator
                    teamSize={teamSize}
                    setTeamSize={setTeamSize}
                    noBudget={noBudget}
                    setNoBudget={setNoBudget}
                    budget={budget}
                    setBudget={setBudget}
                  />
                )}

                {/* ── Step 3: Capability profile ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {REQUIREMENT_OPTIONS.map((req) => (
                        <SelectableCard
                          key={req.id}
                          multi
                          selected={requirements.includes(req.id)}
                          onSelect={() => toggleRequirement(req.id)}
                          title={req.title}
                          iconPath={req.iconPath}
                          overline={req.tag}
                          description={req.description}
                        />
                      ))}
                    </div>
                    {requirements.length === 0 && (
                      <p className="text-xs sm:text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
                        Select at least one capability so the architect can score suitable tools.
                      </p>
                    )}
                  </div>
                )}

                {/* ── Step 4: Strategy & Governance ── */}
                {step === 4 && (
                  <div className="space-y-6">
                    {/* Optimization Goal Selection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#1E3A5F]">
                          Primary Optimization Goal
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Fine-tunes scoring weights for your team</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {OPTIMIZATION_GOAL_OPTIONS.map((g) => {
                          const isSelected = optimizationGoal === g.id;
                          return (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => setOptimizationGoal(g.id)}
                              className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? 'border-[#1E3A5F] bg-[#1E3A5F]/5 shadow-xs ring-1 ring-[#1E3A5F]/20'
                                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {g.badge}
                                </span>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-[#1E3A5F] bg-[#1E3A5F]' : 'border-slate-300'
                                }`}>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                              </div>
                              <div>
                                <span className="block text-xs font-black text-slate-900 leading-tight">
                                  {g.title}
                                </span>
                                <span className="block text-[11px] text-slate-600 font-medium leading-snug mt-1 line-clamp-2">
                                  {g.subtitle}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-200/80">
                      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#1E3A5F]">
                        Procurement stance
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {STRATEGY_OPTIONS.map((opt) => (
                          <SelectableCard
                            key={opt.id}
                            selected={strategy === opt.id}
                            onSelect={() => setStrategy(opt.id)}
                            title={opt.title}
                            overline={opt.focus}
                            description={opt.subtitle}
                          >
                            <div className="space-y-1.5 border-t border-slate-200/80 pt-3">
                              <div className="flex items-baseline gap-2 text-xs">
                                <span className="font-bold text-slate-800 shrink-0">Trade-off:</span>
                                <span className="text-slate-700 font-medium">{opt.tradeoff}</span>
                              </div>
                              <div className="flex items-baseline gap-2 text-xs">
                                <span className="font-bold text-emerald-800 shrink-0">Best when:</span>
                                <span className="text-slate-800 font-semibold">{opt.bestWhen}</span>
                              </div>
                            </div>
                          </SelectableCard>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-200/80">
                      <span className="block text-xs font-bold uppercase tracking-[0.1em] text-[#1E3A5F]">
                        Governance policies
                      </span>

                      {strategy === 'best-value' && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-semibold leading-relaxed text-emerald-950 shadow-xs">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m0-8c1.11 0 2.08.402 2.599 1M12 16c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cost optimization is active — the engine maximizes savings per seat while protecting your required capabilities.
                        </div>
                      )}

                      <div className="space-y-2.5">
                        {GOVERNANCE.map((item) => {
                          const k = item.key;
                          const locked = k === 'requireZeroRetention' && strategy === 'enterprise-security';
                          return (
                            <PolicyToggle
                              key={k}
                              checked={prefs[k]}
                              onChange={() => togglePref(k)}
                              title={item.title}
                              description={item.desc}
                              locked={locked}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {error && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </m.div>
            </AnimatePresence>

            {/* ── Controls ── */}
            <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-slate-200">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-1.5 px-6 py-2.5 sm:py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:text-slate-950 hover:border-slate-400 hover:shadow-xs text-sm font-bold transition-all cursor-pointer"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 && !domain}
                  className="inline-flex items-center gap-2 px-8 py-2.5 sm:py-3 rounded-xl bg-[#1E3A5F] hover:bg-[#264D7A] text-white text-sm font-bold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || requirements.length === 0}
                  className="inline-flex items-center gap-2 px-9 py-2.5 sm:py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? 'Assembling…' : 'Build my stack →'}
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT: persistent Stack Brief (desktop) ── */}
          <aside className="hidden lg:block sticky top-24">
            <BriefRail
              step={step}
              maxStepReached={maxStepReached}
              onStepClick={jumpToStep}
              domain={domain}
              teamSize={teamSize}
              noBudget={noBudget}
              budget={budget}
              requirements={requirements}
              strategy={strategy}
            />
          </aside>
        </div>
      </main>

      {/* ── Submit hand-off ── */}
      <AnimatePresence>
        {loading && <GeneratingOverlay key="overlay" domain={domain} strategy={strategy} />}
      </AnimatePresence>
    </div>
  );
}
