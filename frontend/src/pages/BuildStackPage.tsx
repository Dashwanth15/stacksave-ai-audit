import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { submitStackBuilder } from '../services/api';
import type { StackBuilderRequest } from '../types';
import Logo from '../components/Logo';
import OfferNotificationBell from '../components/OfferNotificationBell';


const WORKFLOWS = [
  { id: 'coding',        label: 'Software Development', icon: '💻', desc: 'Code generation, refactoring, and inline autocomplete' },
  { id: 'frontend',      label: 'Frontend / UI',         icon: '🎨', desc: 'React, Tailwind, visual components & design conversion' },
  { id: 'backend',       label: 'Backend / DevOps',      icon: '⚙️', desc: 'System architecture, API design, databases & terminal' },
  { id: 'fullstack',     label: 'Full-Stack',            icon: '🔧', desc: 'End-to-end web & mobile application engineering' },
  { id: 'ai-engineering',label: 'AI / ML Engineering',   icon: '🤖', desc: 'LLM integrations, agentic workflows, embeddings & RAG' },
  { id: 'data-science',  label: 'Data Science',          icon: '📊', desc: 'Data analysis, Python notebooks, statistics & ML models' },
  { id: 'research',      label: 'Research',              icon: '🔬', desc: 'Recursive search, paper analysis & deep investigation' },
  { id: 'writing',       label: 'Writing / Content',     icon: '✍️', desc: 'Documentation, specs, copywriting & technical blogs' },
];

const FOCUS_OPTIONS = [
  'Coding', 'Frontend', 'Backend', 'Full-Stack',
  'AI/ML Engineering', 'Data Science', 'Research',
  'Writing', 'DevOps', 'Security',
];

const FEATURE_OPTIONS = [
  { id: 'code-completion',    label: 'Code Completion',        icon: '⚡', desc: 'Inline IDE completions' },
  { id: 'chat-interface',     label: 'Chat Interface',         icon: '💬', desc: 'Interactive chat' },
  { id: 'code-review',        label: 'Code Review',            icon: '🔍', desc: 'Diff & PR review' },
  { id: 'api-access',         label: 'API Access',             icon: '🔌', desc: 'Developer API keys' },
  { id: 'multi-model',        label: 'Multi-Model',            icon: '🧠', desc: 'GPT-4o, Claude, o1' },
  { id: 'enterprise-sso',     label: 'Enterprise SSO',         icon: '🔐', desc: 'SAML / SCIM login' },
  { id: 'private-deployment', label: 'Private Deployment',     icon: '🏢', desc: 'VPC / On-prem' },
  { id: 'hipaa-soc2',         label: 'HIPAA / SOC 2',          icon: '🛡️', desc: 'Compliance certifications' },
  { id: 'long-context',       label: 'Long Context',           icon: '📄', desc: '100k+ token window' },
  { id: 'voice',              label: 'Voice Mode',             icon: '🎙️', desc: 'Real-time audio chat' },
  { id: 'image-understanding',label: 'Image / Vision',         icon: '👁️', desc: 'Diagram & image parsing' },
  { id: 'agent-mode',         label: 'Agentic Tasks',          icon: '🤖', desc: 'Multi-step autonomous execution' },
  { id: 'memory',             label: 'Memory / Retention',     icon: '💾', desc: 'Context persistence' },
  { id: 'github-integration', label: 'GitHub Integration',     icon: '🐙', desc: 'PRs & Actions' },
];

const STEPS = [
  { n: 1, title: 'Monthly Budget',       sub: 'Set your team monthly limit' },
  { n: 2, title: 'Team Size',            sub: 'How many developers on your team?' },
  { n: 3, title: 'Engineering Focus',    sub: 'Select your team specialties' },
  { n: 4, title: 'Primary Workflow',     sub: 'Pick your main day-to-day use case' },
  { n: 5, title: 'Must-Have Features',   sub: 'Non-negotiable requirements' },
  { n: 6, title: 'Preferences',          sub: 'Fine-tune recommendation strategy' },
];

const fadeSlide = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit:    { opacity: 0, y: -12, transition: { duration: 0.15 } },
};

export default function BuildStackPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [noBudget, setNoBudget] = useState(false);
  const [budget, setBudget] = useState(200);
  const [teamSize, setTeamSize] = useState(5);
  const [focus, setFocus] = useState<string[]>([]);
  const [workflow, setWorkflow] = useState('coding');
  const [features, setFeatures] = useState<string[]>([]);
  const [prefs, setPrefs] = useState({
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: false,
  });

  const toggleFocus = (f: string) =>
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const toggleFeature = (f: string) =>
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const canNext = () => {
    if (step === 3 && focus.length === 0) return false;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const req: StackBuilderRequest = {
        monthlyBudget: noBudget ? null : budget,
        teamSize,
        engineeringFocus: focus.map(f => f.toLowerCase().replace(/\//g, '-').replace(/\s+/g, '-')),
        primaryWorkflow: workflow,
        mustHaveFeatures: features,
        preferences: prefs,
      };
      const result = await submitStackBuilder(req);
      sessionStorage.setItem('stackRecommendation', JSON.stringify(result));
      navigate('/build-stack/results');
    } catch (e: unknown) {

      const msg = e instanceof Error ? e.message : 'Failed to generate recommendation. Please try again.';
      setError(msg);
      setLoading(false);
    }

  };

  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg-base, #F7F8FA)', color: 'var(--color-text-body, #334155)' }}>
      {/* ── Navigation Bar ── */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-xl border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 h-[72px] flex items-center justify-between">
          <button onClick={() => navigate('/')} className="focus:outline-none">
            <Logo size="md" asDiv />
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Flow 2 · Stack Architect
            </span>
            <OfferNotificationBell />
            <button
              onClick={() => navigate('/audit')}
              className="text-xs font-medium text-slate-500 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
            >
              Audit Existing Stack →
            </button>
          </div>
        </div>
      </header>


      {/* ── Progress Bar ── */}
      <div className="w-full h-1 bg-slate-100">
        <m.div className="h-full bg-[var(--color-primary,#1E3A5F)]" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* ── Wizard Body ── */}
      <main className="flex-1 max-w-[800px] w-full mx-auto px-4 sm:px-6 py-10">
        
        {/* Step Indicator Badges */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2 gap-2">
          {STEPS.map(s => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <div
                key={s.n}
                onClick={() => done && setStep(s.n)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                  active
                    ? 'bg-white shadow-sm border border-slate-300 text-slate-900 font-semibold'
                    : done
                    ? 'text-emerald-700 font-medium cursor-pointer hover:bg-white/60'
                    : 'text-slate-400 font-normal'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    active
                      ? 'bg-[#1E3A5F] text-white'
                      : done
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {done ? '✓' : s.n}
                </span>
                <span className="text-xs whitespace-nowrap">{s.title}</span>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <AnimatePresence mode="wait">
          <m.div
            key={step}
            variants={fadeSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 shadow-sm"
          >
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-[#10B981]">
                Step {step} of 6
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight">
                {STEPS[step - 1].title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {STEPS[step - 1].sub}
              </p>
            </div>

            {/* ── Step 1: Budget ── */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 block">No Budget Limit</span>
                    <span className="text-xs text-slate-500 block">Recommend optimal stack regardless of monthly cost</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoBudget(p => !p)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${noBudget ? 'bg-[#1E3A5F]' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${noBudget ? 'translate-x-6' : ''}`} />
                  </button>
                </div>

                {!noBudget && (
                  <div className="space-y-6 pt-2">
                    <div className="text-center p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-4xl sm:text-5xl font-extrabold text-[#1E3A5F] font-mono-financial">
                        ${budget.toLocaleString()}
                      </div>
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 block">
                        Monthly Team Budget
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range" min={20} max={5000} step={20}
                        value={budget}
                        onChange={e => setBudget(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1E3A5F]"
                      />
                      <div className="flex justify-between text-xs text-slate-400 font-mono-financial">
                        <span>$20</span>
                        <span>$500</span>
                        <span>$1,000</span>
                        <span>$2,500</span>
                        <span>$5,000</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm font-medium text-slate-500">Custom amount: $</span>
                      <input
                        type="number" min={0} max={50000}
                        value={budget}
                        onChange={e => setBudget(Number(e.target.value))}
                        className="w-28 px-3 py-1.5 text-center font-semibold text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
                      />
                      <span className="text-sm text-slate-500">/mo</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Team Size ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-6 p-8 bg-slate-50 border border-slate-200 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setTeamSize(p => Math.max(1, p - 1))}
                    className="w-12 h-12 rounded-xl border border-slate-300 bg-white text-slate-700 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="text-5xl font-extrabold text-[#1E3A5F] font-mono-financial block">
                      {teamSize}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {teamSize === 1 ? 'Developer' : 'Developers'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTeamSize(p => Math.min(10000, p + 1))}
                    className="w-12 h-12 rounded-xl border border-slate-300 bg-white text-slate-700 text-xl font-bold hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    +
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Presets</span>
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 5, 10, 25, 50, 100].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setTeamSize(n)}
                        className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                          teamSize === n
                            ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Engineering Focus ── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2.5">
                  {FOCUS_OPTIONS.map(f => {
                    const sel = focus.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFocus(f)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 ${
                          sel
                            ? 'bg-[#1E3A5F] text-white border-[#1E3A5F] shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {sel && <span>✓</span>}
                        {f}
                      </button>
                    );
                  })}
                </div>
                {focus.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">Please select at least one engineering focus to proceed.</p>
                )}
              </div>
            )}

            {/* ── Step 4: Primary Workflow ── */}
            {step === 4 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORKFLOWS.map(w => {
                  const sel = workflow === w.id;
                  return (
                    <div
                      key={w.id}
                      onClick={() => setWorkflow(w.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                        sel
                          ? 'bg-[#1E3A5F]/5 border-[#1E3A5F] ring-1 ring-[#1E3A5F]'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <span className="text-2xl leading-none">{w.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">{w.label}</h3>
                          {sel && <span className="text-xs font-bold text-[#1E3A5F]">✓</span>}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{w.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Step 5: Must-Have Features ── */}
            {step === 5 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {FEATURE_OPTIONS.map(f => {
                  const sel = features.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => toggleFeature(f.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                        sel
                          ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-lg">{f.icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">{f.label}</span>
                        <span className="text-[11px] text-slate-500 block truncate">{f.desc}</span>
                      </div>
                      {sel && <span className="text-xs font-bold text-emerald-600">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Step 6: Preferences ── */}
            {step === 6 && (
              <div className="space-y-3">
                {([
                  ['preferOpenSource',        '🔓', 'Prefer Open-Source / API-First Tools', 'Prioritizes tools offering direct API keys and open ecosystems.'],
                  ['avoidLockIn',             '🔀', 'Avoid Vendor Lock-in',                  'Penalizes vendors with high migration barriers or closed ecosystems.'],
                  ['maximizeSavings',         '💰', 'Maximize Savings Over Performance',     'Prioritizes lower monthly seat costs over maximum benchmark scores.'],
                  ['preferEstablishedVendors','🏛️', 'Prefer Established Vendors',            'Favors established platforms with enterprise security history.'],
                ] as [keyof typeof prefs, string, string, string][]).map(([key, icon, label, desc]) => {
                  const sel = prefs[key];
                  return (
                    <div
                      key={key}
                      onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        sel ? 'bg-[#1E3A5F]/5 border-[#1E3A5F]' : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{icon}</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{label}</h4>
                          <p className="text-[11px] text-slate-500">{desc}</p>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${sel ? 'bg-[#1E3A5F]' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${sel ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  );
                })}

                {error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            <div className="flex items-center justify-between pt-8 border-t border-slate-100 mt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(s => s - 1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  ← Back
                </button>
              ) : <div />}

              {step < STEPS.length ? (
                <button
                  type="button"
                  onClick={() => canNext() && setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="px-6 py-2.5 bg-[#1E3A5F] hover:bg-[#264D7A] text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-40"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-extrabold uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                >
                  {loading ? 'Building Stack Architecture…' : '🚀 Generate AI Stack'}
                </button>
              )}
            </div>
          </m.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
