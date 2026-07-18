import { type ReactNode } from 'react';
import { m } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LogoLoop from '../components/LogoLoop';

const techLogos = [
  { src: '/logos/cursor.svg', title: 'Cursor', className: 'logo-cursor' },
  { src: '/logos/copilot.svg', title: 'GitHub Copilot', className: 'logo-copilot' },
  { src: '/logos/claude.svg', title: 'Claude', className: 'logo-claude' },
  { src: '/logos/chatgpt.svg', title: 'ChatGPT', className: 'logo-chatgpt' },
  { src: '/logos/anthropic.svg', title: 'Anthropic API', className: 'logo-anthropic' },
  { src: '/logos/openai.svg', title: 'OpenAI API', className: 'logo-openai' },
  { src: '/logos/gemini.svg', title: 'Gemini', className: 'logo-gemini' },
  { src: '/logos/windsurf.svg', title: 'Windsurf', className: 'logo-windsurf' },
];

const auditRules = [
  { label: 'Overpaid Plan', example: 'Enterprise billing on small teams', saving: 'Save $120/mo' },
  { label: 'Unused Seats', example: 'Inactive licenses auto-detected', saving: 'Save $280/mo' },
  { label: 'Overlapping Tools', example: 'Multiple developers with redundant tools', saving: 'Save $450/mo' },
  { label: 'Cheaper Alternative', example: 'Lower cost APIs or team plans available', saving: 'Save $180/mo' },
  { label: 'Annual vs Monthly', example: 'Unoptimized billing periods', saving: 'Up to 20% off' },
  { label: 'API vs Subscription', example: 'Volumetric spend vs flat seat rate', saving: 'Save $320/mo' },
];

const steps = [
  {
    step: '01',
    title: 'Input Your Stack',
    desc: 'Enter the AI tools your team uses. No accounts or financial integrations required.',
  },
  {
    step: '02',
    title: 'Precision Audit',
    desc: 'Our engine cross-checks plan types, seats, and overlapping feature categories.',
  },
  {
    step: '03',
    title: 'Recapture Spend',
    desc: 'Get a shareable report with exact savings numbers and optimized steps.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
};

// Reusable section container
function Section({
  children,
  className = '',
  id,
  style,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section id={id} className={`py-20 md:py-24 overflow-hidden ${className}`} style={style}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

// Section heading
function SectionHeading({
  overline,
  title,
  subtitle,
  align = 'center',
}: {
  overline?: string;
  title: ReactNode;
  subtitle?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={`mb-16 ${align === 'center' ? 'text-center' : 'text-left'}`}>
      {overline && (
        <p className="text-overline mb-3">{overline}</p>
      )}
      <m.h2
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="text-3xl sm:text-4xl font-bold tracking-tight mb-4"
        style={{ color: 'var(--color-text-heading)', letterSpacing: '-0.02em' }}
      >
        {title}
      </m.h2>
      {subtitle && (
        <p
          className="text-base sm:text-lg max-w-2xl leading-relaxed"
          style={{
            color: 'var(--color-text-muted)',
            marginLeft: align === 'center' ? 'auto' : '0',
            marginRight: align === 'center' ? 'auto' : '0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* ── Navbar ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50"
        style={{
          background: 'rgba(255, 255, 255, 0.96)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
              aria-label="StackSave home"
            >
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}
              >
                StackSave
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
                style={{
                  background: 'var(--color-success-bg)',
                  color: 'var(--color-success-t)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                }}
              >
                Financial Intel
              </span>
            </button>
          </div>

          <button
            onClick={() => navigate('/audit')}
            className="btn-primary text-xs py-2 px-4"
            aria-label="Start free audit"
          >
            Start Free Audit
          </button>
        </div>
      </header>

      {/* ── 1. Hero with Minimal Premium Preview ────────────── */}
      <section className="pt-16 pb-20 md:pt-24 md:pb-28" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left: Headline & CTA */}
            <div className="lg:col-span-6 space-y-8 text-left">
              <div className="space-y-4">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase"
                  style={{
                    background: 'var(--color-success-bg)',
                    color: 'var(--color-success-t)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  Deterministic Savings Analysis
                </span>
                <h1
                  className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight"
                  style={{
                    color: 'var(--color-text-heading)',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Stop overpaying for your AI stack.
                </h1>
                <p
                  className="text-base sm:text-lg leading-relaxed"
                  style={{ color: 'var(--color-text-body)' }}
                >
                  Most companies waste 30% of their software budget on wrong tiers, duplicate accounts, and idle seats. StackSave performs a zero-integration financial audit in 60 seconds.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => navigate('/audit')}
                  className="btn-cta px-8 py-4 text-sm font-semibold text-center"
                  id="hero-cta"
                >
                  Start Your Audit Free
                </button>
                <div className="flex flex-col justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <span>No login required</span>
                  <span>Results in under 1 minute</span>
                </div>
              </div>
            </div>

            {/* Right: Minimal Premium KPI Preview Card */}
            <div className="lg:col-span-6">
              <m.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="rounded-xl border max-w-md mx-auto"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-xl)',
                  overflow: 'hidden',
                }}
              >
                {/* Mock Browser Header */}
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                  </div>
                  <span className="text-[10px] font-mono-financial text-slate-400">stacksave.ai/summary</span>
                  <div className="w-8" />
                </div>

                {/* Minimal Score Dashboard */}
                <div className="p-8 space-y-6 text-center">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Stack Audit Score</span>
                    <div className="text-6xl font-extrabold tracking-tight font-serif-display text-[var(--color-primary)]">
                      84<span className="text-xl text-slate-400 font-sans font-medium">/100</span>
                    </div>
                  </div>

                  <div className="border-t border-b py-4 space-y-2" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Audited AI Services</span>
                      <span className="font-bold text-[var(--color-text-heading)]">14 active tiers</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Optimization Opportunities</span>
                      <span className="font-bold text-[var(--color-success)] uppercase text-[10px]">3 identified</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-center text-xs font-semibold text-[var(--color-success-t)] bg-[var(--color-success-bg)] py-2 px-3 rounded border" style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Up to 32% waste reduction possible</span>
                  </div>
                </div>
              </m.div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Logo Loop Section (Supported AI Platforms) ── */}
      <section
        className="py-12 border-b"
        style={{ background: 'var(--color-bg-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 text-center space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Supported AI Platforms
          </p>
          <div className="py-2">
            <LogoLoop
              logos={techLogos}
              speed={30}
              gap={24}
              logoHeight={40}
              renderItem={(item) => (
                <div className="logoloop__card">
                  <img
                    src={item.src}
                    alt={item.title}
                    className={`logoloop__logo-img ${item.className || ''}`}
                  />
                  <span className="text-xs font-bold tracking-tight text-[var(--color-text-heading)]">
                    {item.title}
                  </span>
                </div>
              )}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Problem Section ──────────────────────────────── */}
      <Section style={{ borderBottom: '1px solid var(--color-border)' }}>
        <SectionHeading
          overline="The Problem"
          title="Why your AI software bill is leaking"
          subtitle="Startups and growth companies pay for redundant tools and idle seats without realizing it."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 space-y-3">
            <h3 className="font-bold text-base text-[var(--color-text-heading)]">1. Seat Creep</h3>
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Developers get added to Copilot or ChatGPT groups, move to other teams, or leave the company entirely, while recurring seat billing remains active month after month.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <h3 className="font-bold text-base text-[var(--color-text-heading)]">2. Redundant Features</h3>
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Different team members purchase standalone pro subscriptions (Claude, ChatGPT, Midjourney, Cursor) separately, paying multiple times for overlapping LLM features.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <h3 className="font-bold text-base text-[var(--color-text-heading)]">3. Enterprise Contract Locking</h3>
            <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
              Small teams get pushed onto expensive enterprise service contracts with high minimum user counts, paying for high-tier support SLAs they do not use.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 3. How it works ──────────────────────────────────── */}
      <Section style={{ borderBottom: '1px solid var(--color-border)' }}>
        <SectionHeading
          overline="The Flow"
          title="From stack inputs to savings reports"
          subtitle="Three steps to identify where your budget is leaking and get optimized recommendations."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {steps.map((step, i) => (
            <m.div
              key={step.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="p-8 border rounded-lg flex flex-col h-full bg-[var(--color-bg-surface)]"
              style={{
                borderColor: 'var(--color-border)',
                boxShadow: 'var(--shadow-xs)',
              }}
            >
              <div
                className="text-4xl font-mono-financial font-extrabold mb-6 select-none leading-none"
                style={{ color: 'var(--color-border-strong)' }}
              >
                {step.step}
              </div>
              <h3
                className="text-lg font-bold mb-3"
                style={{ color: 'var(--color-text-heading)' }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm leading-relaxed text-[var(--color-text-body)]"
              >
                {step.desc}
              </p>
            </m.div>
          ))}
        </div>
      </Section>

      {/* ── 4. Product Preview (Detailed Dashboard Mockup) ───── */}
      <Section
        style={{
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <SectionHeading
          overline="Product Preview"
          title="Deep-dive spend diagnostics"
          subtitle="Get a clear breakdown of where capital is being lost, original vs optimized target runs, and exact instructions."
        />
        
        <div className="max-w-4xl mx-auto rounded-xl border" style={{ borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-lg)', background: 'var(--color-bg-base)' }}>
          {/* Browser header */}
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            </div>
            <span className="text-[10px] font-mono-financial text-slate-400">stacksave.ai/audit/sample</span>
            <div className="w-8" />
          </div>

          {/* Detailed report mock */}
          <div className="p-8 space-y-6">
            
            {/* Top Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded bg-[var(--color-bg-card)]" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Current Spend</span>
                <span className="text-base font-bold font-mono-financial">$3,840<span className="text-xs text-slate-400">/mo</span></span>
              </div>
              <div className="p-4 border rounded" style={{ background: 'var(--color-success-bg)', borderColor: 'rgba(16,185,129,0.2)' }}>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--color-success-t)] block mb-1">Money Saved</span>
                <span className="text-lg font-bold font-serif-display text-[var(--color-success-t)]">$1,420<span className="text-xs text-[var(--color-success-t)]">/mo</span></span>
              </div>
              <div className="p-4 border rounded bg-[var(--color-bg-card)]" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Optimized Spend</span>
                <span className="text-base font-bold font-mono-financial">$2,420<span className="text-xs text-slate-400">/mo</span></span>
              </div>
            </div>

            {/* Inefficiencies */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Identified Inefficiencies</span>
              
              <div className="p-3 border rounded flex items-center justify-between text-xs bg-[var(--color-bg-card)]" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
                  <span className="font-semibold text-[var(--color-text-heading)]">GitHub Copilot</span>
                  <span className="text-slate-400">· 15 seats inactive for 30+ days</span>
                </div>
                <span className="font-bold text-[var(--color-danger)] font-mono-financial">-$285/mo</span>
              </div>

              <div className="p-3 border rounded flex items-center justify-between text-xs bg-[var(--color-bg-card)]" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)]" />
                  <span className="font-semibold text-[var(--color-text-heading)]">Claude Pro + ChatGPT Plus</span>
                  <span className="text-slate-400">· Overlapping features detected</span>
                </div>
                <span className="font-bold text-[var(--color-danger)] font-mono-financial">-$240/mo</span>
              </div>
            </div>

            {/* Action recommend */}
            <div className="p-4 border rounded-lg bg-[rgba(30,58,95,0.03)]" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[var(--color-primary)]">Optimized Path Action</span>
              </div>
              <p className="text-xs text-[var(--color-text-body)] leading-relaxed">
                Downgrade 15 idle developer licenses on GitHub Copilot. Migrate overlapping writer seats from duplicate standalone subscriptions to Claude Team billing.
              </p>
            </div>

          </div>
        </div>
      </Section>

      {/* ── 5. Features / Audit Rules ───────────────────────── */}
      <Section
        style={{ background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <SectionHeading
          overline="Deterministic Auditing"
          title="Audit checks we run on your stack"
          subtitle="Our calculation engine runs precise checks against current provider pricing schedules to highlight waste."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditRules.map((rule, i) => (
            <m.div
              key={rule.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="p-6 rounded-lg border flex flex-col justify-between"
              style={{
                background: 'var(--color-bg-base)',
                borderColor: 'var(--color-border)',
                borderLeft: '3px solid var(--color-danger)',
              }}
            >
              <div>
                <h3
                  className="font-bold text-sm mb-1.5"
                  style={{ color: 'var(--color-text-heading)' }}
                >
                  {rule.label}
                </h3>
                <p className="text-xs leading-normal mb-4" style={{ color: 'var(--color-text-muted)' }}>
                  {rule.example}
                </p>
              </div>
              <div>
                <span
                  className="text-[10px] font-semibold px-2 py-1 rounded inline-block"
                  style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-t)' }}
                >
                  {rule.saving}
                </span>
              </div>
            </m.div>
          ))}
        </div>
      </Section>

      {/* ── 6. Testimonials / Quote ─────────────────────────── */}
      <Section style={{ borderBottom: '1px solid var(--color-border)' }}>
        <m.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <div
            className="p-10 sm:p-14 border rounded-xl text-center bg-[var(--color-bg-surface)]"
            style={{
              borderColor: 'var(--color-border)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <span className="text-overline block mb-4">Underlying Economics</span>
            <blockquote
              className="text-xl sm:text-2xl font-bold max-w-2xl mx-auto leading-snug mb-6"
              style={{ color: 'var(--color-text-heading)', letterSpacing: '-0.015em' }}
            >
              "Most startups do not know they are overspending on AI infrastructure. They look at their invoice, sigh, and pay it."
            </blockquote>
            <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
              StackSave provides immediate financial clarity so teams can recapture capital.
            </p>
          </div>
        </m.div>
      </Section>

      {/* ── 7. Pricing / Final Call to Action ───────────────── */}
      <section
        className="py-20 md:py-28"
        style={{ background: 'var(--color-bg-dark)' }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto space-y-6"
          >
            <p
              className="text-overline"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Optimization Report
            </p>
            <h2
              className="text-3xl sm:text-4xl font-extrabold tracking-tight"
              style={{ color: '#F8FAFC', letterSpacing: '-0.025em' }}
            >
              Recapture your software spend.
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'rgba(248, 250, 252, 0.6)' }}
            >
              Free audit. No credentials or credentials sharing. Done in 60 seconds.
            </p>
            <m.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/audit')}
              className="btn-cta px-8 py-4 text-sm font-semibold text-center"
              aria-label="Start your free AI spend audit"
              id="bottom-cta"
            >
              Start My Free Audit
            </m.button>
          </m.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer
        style={{
          background: 'var(--color-bg-dark)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        className="py-12 mt-auto text-xs"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span
              className="font-bold text-sm tracking-tight"
              style={{ color: '#F8FAFC', letterSpacing: '-0.02em' }}
            >
              StackSave
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>
              AI spend audit & optimization dashboard
            </span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)' }}>
            Powered by{' '}
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Credex
            </a>
            {' '}· Discounted AI infrastructure credits
          </div>
        </div>
      </footer>
    </div>
  );
}
