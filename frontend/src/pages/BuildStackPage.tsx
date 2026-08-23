import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { submitStackBuilder } from '../services/api';
import type { StackBuilderRequest, StackStrategy } from '../types';
import Logo from '../components/Logo';
import OfferNotificationBell from '../components/OfferNotificationBell';

interface DomainOption {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  iconPath: string;
}

const DOMAIN_OPTIONS: DomainOption[] = [
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    subtitle: 'Code creation, refactoring, terminal automation, and full multi-file debugging',
    badge: 'Developer IDE',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
  },
  {
    id: 'ai-data-ml',
    title: 'AI & Machine Learning',
    subtitle: 'Model orchestration, data analysis, embeddings, and API pipeline engineering',
    badge: 'API & Models',
    iconPath: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  },
  {
    id: 'research-knowledge',
    title: 'Research & Knowledge',
    subtitle: 'In-depth market synthesis, live web retrieval, deep citations, and paper analysis',
    badge: 'Search & Citations',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
  },
  {
    id: 'product-design',
    title: 'Product & Design',
    subtitle: 'PRDs, architectural specs, UI mockup analysis, and visual diagram parsing',
    badge: 'Design & Vision',
    iconPath: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    id: 'business-operations',
    title: 'Business Operations',
    subtitle: 'Workflow automation, internal tools, structured extraction, and meeting intelligence',
    badge: 'Automation & Ops',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  {
    id: 'content-communication',
    title: 'Content & Communication',
    subtitle: 'Technical writing, copywriting, documentation, spec creation, and localization',
    badge: 'Drafting & Specs',
    iconPath: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
  },
  {
    id: 'enterprise-compliance',
    title: 'Enterprise Governance',
    subtitle: 'Strict compliance, zero data retention, audit logs, and SAML SSO infrastructure',
    badge: 'Security & SSO',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
  },
  {
    id: 'general-productivity',
    title: 'General Productivity',
    subtitle: 'Broad conversational assistant, daily Q&A, drafting, and rapid task execution',
    badge: 'General Suite',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z'
  }
];

interface RequirementOption {
  id: string;
  title: string;
  description: string;
  tag: string;
}

const REQUIREMENT_OPTIONS: RequirementOption[] = [
  {
    id: 'editor-code-generation',
    title: 'In-Editor Code Generation & Refactoring',
    description: 'Write, refactor, and auto-complete code inline inside development environments',
    tag: 'IDE'
  },
  {
    id: 'deep-reasoning-analysis',
    title: 'Deep Reasoning & Logic Verification',
    description: 'Solve complex algorithmic, mathematical, and logical architecture problems',
    tag: 'Reasoning'
  },
  {
    id: 'large-document-processing',
    title: 'Large Document & Repository Indexing',
    description: 'Process 100k+ token documents, contracts, and full repository vector search',
    tag: 'Context'
  },
  {
    id: 'live-web-research',
    title: 'Live Web Intelligence & Verified Citations',
    description: 'Search real-time internet sources with verified citations and synthetic summaries',
    tag: 'Search'
  },
  {
    id: 'visual-diagram-understanding',
    title: 'Visual, Diagram & UI Design Parsing',
    description: 'Analyze architectural diagrams, UI mockups, charts, and image inputs',
    tag: 'Multimodal'
  },
  {
    id: 'automated-task-execution',
    title: 'Autonomous Multi-Step Terminal Execution',
    description: 'Execute multi-step workflows, command line operations, and tool actions',
    tag: 'Agentic'
  },
  {
    id: 'developer-api-access',
    title: 'Programmatic API & Model Integration',
    description: 'Integrate AI models directly into software stacks via developer APIs',
    tag: 'API'
  },
  {
    id: 'enterprise-governance',
    title: 'Enterprise Security & Zero Retention',
    description: 'Enforce zero data retention, SOC 2 / HIPAA compliance, and SAML SSO',
    tag: 'Security'
  }
];

interface StrategyOption {
  id: StackStrategy;
  title: string;
  subtitle: string;
  focus: string;
}

const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'balanced',
    title: 'Balanced Architecture',
    subtitle: 'Optimal synergy between top-tier capability, team workflow fit, and seat cost efficiency.',
    focus: 'Default Recommendation'
  },
  {
    id: 'best-value',
    title: 'Best Value / Cost Optimized',
    subtitle: 'Maximize cost savings per seat while preserving critical domain requirements and capabilities.',
    focus: 'Lowest Spend'
  },
  {
    id: 'max-performance',
    title: 'Maximum Performance',
    subtitle: 'Uncompromised benchmark scores, deep reasoning, and maximum execution velocity.',
    focus: 'Top Benchmarks'
  },
  {
    id: 'enterprise-security',
    title: 'Enterprise Security & Governance',
    subtitle: 'Zero data retention, SAML SSO, SOC 2/HIPAA compliance, and robust enterprise controls.',
    focus: 'Strict Compliance'
  }
];

const STEPS = [
  { n: 1, title: 'Domain Profile', sub: 'Select your team primary operational domain' },
  { n: 2, title: 'Scale & Budget', sub: 'Configure team size and target monthly spend' },
  { n: 3, title: 'Core Requirements', sub: 'Select your critical business and functional requirements' },
  { n: 4, title: 'Strategy & Governance', sub: 'Fine-tune procurement objective and security posture' },
];

const fadeSlide = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export default function BuildStackPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [domain, setDomain] = useState('software-engineering');
  const [teamSize, setTeamSize] = useState(10);
  const [noBudget, setNoBudget] = useState(false);
  const [budget, setBudget] = useState(0);
  const [requirements, setRequirements] = useState<string[]>([]);
  const [strategy, setStrategy] = useState<StackStrategy>('balanced');
  const [prefs, setPrefs] = useState({
    preferOpenSource: false,
    avoidLockIn: false,
    requireZeroRetention: false,
    preferEstablishedVendors: false,
  });

  const toggleRequirement = (id: string) => {
    setRequirements(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const req: StackBuilderRequest = {
        domain,
        requirements,
        strategy,
        teamSize,
        monthlyBudget: noBudget ? null : budget,
        preferences: {
          ...prefs,
          maximizeSavings: strategy === 'best-value',
          requireZeroRetention: prefs.requireZeroRetention || strategy === 'enterprise-security'
        },
        debug: true
      };

      const result = await submitStackBuilder(req);
      sessionStorage.setItem('stackRecommendation', JSON.stringify(result));
      navigate('/build-stack/results');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to generate stack intelligence. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  const progressPercent = ((step - 1) / (STEPS.length - 1)) * 100;
  const targetPerSeatSpend = noBudget ? null : Math.round(budget / Math.max(1, teamSize));

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-md border-slate-200">
        <div className="max-w-[1300px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="focus:outline-none flex items-center gap-2">
            <Logo size="md" asDiv />
          </button>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
              Stack Architect Engine
            </span>
            <OfferNotificationBell />
            <button
              onClick={() => navigate('/audit')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md border border-slate-200 hover:border-slate-300 transition-all bg-white"
            >
              Audit Existing Stack →
            </button>
          </div>
        </div>
      </header>

      {/* ── Progress Strip ── */}
      <div className="w-full h-1 bg-slate-100">
        <m.div
          className="h-full bg-slate-900"
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* ── Wizard Container ── */}
      <main className="flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Step Indicator Header */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Step {step} of 4 · {STEPS[step - 1].title}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 tracking-tight">
              {STEPS[step - 1].sub}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.n}
                onClick={() => s.n < step && setStep(s.n)}
                disabled={s.n > step}
                className={`h-2 rounded-full transition-all ${
                  s.n === step
                    ? 'w-8 bg-slate-900'
                    : s.n < step
                    ? 'w-4 bg-emerald-600 cursor-pointer'
                    : 'w-2 bg-slate-200 cursor-not-allowed'
                }`}
                title={s.title}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Step View */}
        <AnimatePresence mode="wait">
          <m.div
            key={step}
            variants={fadeSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-sm"
          >
            {/* ── Step 1: Domain Selection ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DOMAIN_OPTIONS.map(d => {
                    const isSelected = domain === d.id;
                    return (
                      <div
                        key={d.id}
                        onClick={() => setDomain(d.id)}
                        className={`p-4 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-md ${isSelected ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'}`}>
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d.iconPath} />
                              </svg>
                            </div>
                            <h3 className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {d.title}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {d.badge}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                          {d.subtitle}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Step 2: Scale & Budget ── */}
            {step === 2 && (
              <div className="space-y-8">
                {/* Team Scale */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Team Scale
                    </label>
                    <span className="text-xs font-mono-financial font-bold text-slate-900">
                      {teamSize} {teamSize === 1 ? 'Seat' : 'Seats'}
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {[1, 5, 15, 50, 100, 250].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTeamSize(n)}
                        className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                          teamSize === n
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {n} {n === 250 ? '+' : ''}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-slate-500">Custom count:</span>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={teamSize}
                      onChange={e => setTeamSize(Math.max(1, Number(e.target.value)))}
                      className="w-24 px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    <span className="text-xs text-slate-400">active developers or team members</span>
                  </div>
                </div>

                {/* Target Budget */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        Monthly Team Budget
                      </span>
                      <span className="text-xs text-slate-400">Set total spend ceiling across all seats</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">No Budget Ceiling</span>
                      <button
                        type="button"
                        onClick={() => setNoBudget(p => !p)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors ${noBudget ? 'bg-slate-900' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${noBudget ? 'translate-x-4' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {!noBudget && (
                    <div className="space-y-4 bg-slate-50 border border-slate-200/80 rounded-xl p-5">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-3xl font-extrabold text-slate-900 font-mono-financial tracking-tight">
                            ${budget.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-normal ml-1">/month</span>
                        </div>
                        {targetPerSeatSpend !== null && (
                          <div className="text-right">
                            <span className="text-xs text-slate-400 uppercase font-bold block">Target Per Seat</span>
                            <span className="text-sm font-bold text-emerald-700 font-mono-financial">
                              ~${targetPerSeatSpend}/seat/mo
                            </span>
                          </div>
                        )}
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={5000}
                        step={25}
                        value={budget}
                        onChange={e => setBudget(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                      />

                      <div className="flex justify-between text-[11px] font-mono-financial text-slate-400">
                        <span>$0/mo</span>
                        <span>$500/mo</span>
                        <span>$1,500/mo</span>
                        <span>$3,000/mo</span>
                        <span>$5,000/mo</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Requirements ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {REQUIREMENT_OPTIONS.map(req => {
                    const isChecked = requirements.includes(req.id);
                    return (
                      <div
                        key={req.id}
                        onClick={() => toggleRequirement(req.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'bg-slate-900/5 border-slate-900 ring-1 ring-slate-900'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 tracking-tight">{req.title}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {req.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {req.description}
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          isChecked ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {requirements.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium pt-1">
                    Please select at least one requirement to help the architect score suitable tools.
                  </p>
                )}
              </div>
            )}

            {/* ── Step 4: Strategy & Governance ── */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Procurement Strategy Cards */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Procurement Strategy
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {STRATEGY_OPTIONS.map(opt => {
                      const isSelected = strategy === opt.id;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => setStrategy(opt.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-bold tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {opt.title}
                            </h4>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isSelected ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt.focus}
                            </span>
                          </div>
                          <p className={`text-[11px] leading-snug ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                            {opt.subtitle}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Additional Governance & Architecture Preferences */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Security & Ecosystem Preferences
                  </span>
                  <div className="space-y-2">
                    {[
                      { key: 'preferOpenSource', title: 'Prefer Direct API Key & Open Ecosystems', desc: 'Prioritize tools allowing custom API key integration and BYO models.' },
                      { key: 'avoidLockIn', title: 'Penalize High Vendor Lock-in', desc: 'Deprioritize closed platforms with proprietary file formats or high switching friction.' },
                      { key: 'requireZeroRetention', title: 'Enforce Strict Zero Data Retention', desc: 'Only recommend providers with verifiable enterprise zero data retention policies.' },
                      { key: 'preferEstablishedVendors', title: 'Prefer Tier-1 Established Enterprise Vendors', desc: 'Give preference to mature platforms with multi-year SOC 2 Type II compliance.' },
                    ].map(item => {
                      const k = item.key as keyof typeof prefs;
                      const isChecked = prefs[k];
                      return (
                        <div
                          key={item.key}
                          onClick={() => setPrefs(p => ({ ...p, [k]: !p[k] }))}
                          className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                            isChecked ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{item.title}</span>
                            <span className="text-[11px] text-slate-500 block">{item.desc}</span>
                          </div>
                          <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 ml-3 ${isChecked ? 'bg-slate-900' : 'bg-slate-300'}`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-3.5' : ''}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Wizard Controls ── */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                >
                  ← Previous Step
                </button>
              ) : <div />}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-sm transition-all"
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || requirements.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm transition-all disabled:opacity-60"
                >
                  {loading ? 'Evaluating Knowledge Graph…' : 'Generate AI Stack Architecture'}
                </button>
              )}
            </div>
          </m.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
