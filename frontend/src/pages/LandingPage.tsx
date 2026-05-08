import { type ReactNode, useState, useEffect, useRef, useCallback } from 'react';
import { m, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Animated counter — counts up when element scrolls into view
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const numericPart = value.replace(/[^0-9]/g, '');
  const prefix = value.match(/^[^0-9]*/)?.[0] || '';
  const suffix = value.match(/[^0-9]*$/)?.[0] || '';
  const target = parseInt(numericPart) || 0;

  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  const animate = useCallback((timestamp: number) => {
    if (!startRef.current) startRef.current = timestamp;
    const progress = Math.min((timestamp - startRef.current) / 1000, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setCurrent(Math.round(eased * target));
    if (progress < 1) frameRef.current = requestAnimationFrame(animate);
  }, [target]);

  useEffect(() => {
    if (isInView && target > 0) {
      startRef.current = 0;
      frameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(frameRef.current);
    }
  }, [isInView, animate, target]);

  return (
    <div ref={ref}>
      <div className="text-3xl md:text-4xl font-extrabold gradient-text-green mb-2 tabular-nums">
        {target > 0 ? `${prefix}${current.toLocaleString()}${suffix}` : value}
      </div>
      <div className="text-sm text-[#94a3b8]">{label}</div>
    </div>
  );
}

const features = [
  {
    icon: '🔍',
    title: 'Instant Stack Audit',
    description: 'Input your AI tools in 2 minutes. Get a detailed breakdown of where you\'re overspending.',
  },
  {
    icon: '💡',
    title: 'Smart Recommendations',
    description: 'Finance-defensible suggestions based on your team size, use case, and actual pricing data.',
  },
  {
    icon: '📊',
    title: 'Real Savings Numbers',
    description: 'Monthly and annual savings estimates grounded in current vendor pricing — not estimates.',
  },
  {
    icon: '🔗',
    title: 'Shareable Reports',
    description: 'Every audit gets a unique public URL. Share your results with your team or CFO.',
  },
  {
    icon: '🤖',
    title: 'AI-Generated Summary',
    description: 'Personalized paragraph summarizing your audit written by AI — in plain English.',
  },
  {
    icon: '🔒',
    title: 'No Login Required',
    description: 'Start your audit immediately. We only ask for your email after you see your results.',
  },
];

const stats = [
  { value: '$340', label: 'avg monthly savings found' },
  { value: '8', label: 'AI tools audited' },
  { value: '2min', label: 'to complete an audit' },
  { value: '100%', label: 'free, no credit card' },
];

const tools = [
  '⚡ Cursor', '🐙 Copilot', '🤖 Claude', '💬 ChatGPT',
  '✨ Gemini', '🏄 Windsurf', '🌐 OpenAI API', '🔬 Anthropic API',
];

const steps = [
  {
    step: '01',
    title: 'Enter your stack',
    desc: 'Tell us which AI tools you pay for, which plan, how many seats, and your team size.',
  },
  {
    step: '02',
    title: 'Run the audit',
    desc: 'Our engine checks for overpaid plans, unused seats, tool overlap, and cheaper alternatives.',
  },
  {
    step: '03',
    title: 'See your savings',
    desc: 'Get per-tool recommendations with exact dollar amounts. Share your report or book a Credex consultation.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
};

// ── Reusable section container ────────────────────────────────
function Section({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`py-20 md:py-28 lg:py-32 overflow-hidden ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

// ── Section heading with consistent spacing ───────────────────
function SectionHeading({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="text-center mb-14 md:mb-20">
      <m.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-5"
      >
        {title}
      </m.h2>
      {subtitle && (
        <p className="text-[#94a3b8] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid-bg flex flex-col overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 backdrop-blur-md bg-[#0b0b15]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold gradient-text">StackSave</span>
            <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              AI Audit
            </span>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium transition-all"
            aria-label="Start free audit"
          >
            Start Free Audit →
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-24 pb-20 md:pt-32 md:pb-28 lg:pt-40 lg:pb-32 hero-glow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <m.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-10"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Free · No login required · Results in 60 seconds
            </m.div>

            {/* Headline */}
            <m.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight text-white mb-8"
            >
              Stop Overpaying for{' '}
              <span className="gradient-text">AI Tools</span>
            </m.h1>

            {/* Subheadline */}
            <m.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto mb-12 leading-relaxed"
            >
              Most startups waste 30–40% of their AI budget on wrong plans, unused seats,
              and overlapping tools. StackSave audits your stack and tells you exactly where to cut.
            </m.p>

            {/* CTA */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <m.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/audit')}
                className="px-8 py-4 rounded-xl font-semibold text-lg text-white glow-primary w-full sm:w-auto"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                aria-label="Audit my AI stack for free"
                id="hero-cta"
              >
                Audit My AI Stack — Free →
              </m.button>
              <p className="text-sm text-[#64748b]">Takes 2 minutes · No signup needed</p>
            </m.div>

            {/* Tool pills */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="flex flex-wrap gap-2 sm:gap-3 justify-center"
            >
              {tools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 rounded-full glass-card text-sm text-[#94a3b8] font-medium"
                >
                  {tool}
                </span>
              ))}
            </m.div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {stats.map((stat, i) => (
              <m.div
                key={stat.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="glass-card p-6 md:p-8 text-center"
              >
                <AnimatedStat value={stat.value} label={stat.label} />
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <Section>
        <SectionHeading
          title="How it works"
          subtitle="Three steps from landing here to knowing exactly where your AI budget is leaking."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {steps.map((step, i) => (
            <m.div
              key={step.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="glass-card p-8 relative flex flex-col h-full"
            >
              <div className="text-5xl font-black text-white/5 mb-4 select-none leading-none">
                {step.step}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">{step.title}</h3>
              <p className="text-[#94a3b8] leading-relaxed text-sm flex-1">{step.desc}</p>
            </m.div>
          ))}
        </div>
      </Section>

      {/* ── Features Grid ───────────────────────────────────── */}
      <Section className="bg-white/[0.015]">
        <SectionHeading
          title="Everything you need to right-size your AI spend"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8 items-stretch">
          {features.map((feature, i) => (
            <m.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="glass-card p-6 md:p-8 flex flex-col h-full"
            >
              <div className="text-3xl mb-4" role="img" aria-label={feature.title}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed flex-1">
                {feature.description}
              </p>
            </m.div>
          ))}
        </div>
      </Section>

      {/* ── Social Proof / Quote ─────────────────────────────── */}
      <Section>
        <m.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-10 sm:p-14 text-center max-w-4xl mx-auto"
          style={{ borderColor: 'rgba(129, 140, 248, 0.2)' }}
        >
          <div className="text-sm text-[#64748b] mb-4 uppercase tracking-wider font-medium">
            Why This Exists
          </div>
          <blockquote className="text-xl sm:text-2xl md:text-3xl font-semibold text-white max-w-3xl mx-auto leading-snug mb-6">
            "Most startups don't know they're overspending on AI tools. They look at their
            monthly bill, sigh, and pay it."
          </blockquote>
          <p className="text-[#94a3b8]">
            There's no "Mint for AI tool spend."{' '}
            <strong className="text-white">StackSave is that tool.</strong>
          </p>
        </m.div>
      </Section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <Section className="bg-white/[0.015]">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 text-white leading-tight">
            Find out what you're{' '}
            <span className="gradient-text">actually spending</span>
          </h2>
          <p className="text-[#94a3b8] text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Free audit. No credit card. No login. Your results in under 60 seconds.
          </p>
          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/audit')}
            className="px-10 py-4 rounded-xl font-bold text-xl text-white glow-primary"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            aria-label="Start your free AI spend audit"
            id="bottom-cta"
          >
            Start My Free Audit →
          </m.button>
        </m.div>
      </Section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#475569]">
          <div className="flex items-center gap-2">
            <span className="font-bold gradient-text text-base">StackSave</span>
            <span>· Free AI spend optimization for startups</span>
          </div>
          <div>
            Powered by{' '}
            <a
              href="https://credex.rocks"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
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
