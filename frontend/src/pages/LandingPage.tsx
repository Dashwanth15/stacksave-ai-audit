import { m } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

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

const tools = ['⚡ Cursor', '🐙 Copilot', '🤖 Claude', '💬 ChatGPT', '✨ Gemini', '🏄 Windsurf', '🌐 OpenAI API', '🔬 Anthropic API'];

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const },
  }),
};

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen grid-bg">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="border-b border-white/5 backdrop-blur-sm sticky top-0 z-50 bg-[#0b0b15]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold gradient-text">StackSave</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">AI Audit</span>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="px-4 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-sm font-medium transition-all"
            aria-label="Start free audit"
          >
            Start Free Audit →
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Free · No login required · Results in 60 seconds
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Stop Overpaying for{' '}
            <span className="gradient-text">AI Tools</span>
          </h1>

          <p className="text-xl text-[#94a3b8] max-w-2xl mx-auto mb-10 leading-relaxed">
            Most startups waste 30–40% of their AI budget on wrong plans, unused seats, and overlapping tools.
            StackSave audits your stack and tells you exactly where to cut.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <m.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/audit')}
              className="px-8 py-4 rounded-xl font-semibold text-lg text-white glow-primary"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              aria-label="Audit my AI stack for free"
              id="hero-cta"
            >
              Audit My AI Stack — Free →
            </m.button>
            <p className="text-sm text-[#64748b]">Takes 2 minutes · No signup needed</p>
          </div>
        </m.div>

        {/* Tool pills */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-16 flex flex-wrap gap-3 justify-center"
        >
          {tools.map((tool) => (
            <span
              key={tool}
              className="px-4 py-2 rounded-full glass-card text-sm text-[#94a3b8] font-medium"
            >
              {tool}
            </span>
          ))}
        </m.div>
      </section>

      {/* ── Stats ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <m.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="glass-card p-6 text-center"
            >
              <div className="text-4xl font-extrabold gradient-text-green mb-2">{stat.value}</div>
              <div className="text-sm text-[#94a3b8]">{stat.label}</div>
            </m.div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-bold text-center mb-4"
        >
          How it works
        </m.h2>
        <p className="text-center text-[#94a3b8] mb-12 max-w-xl mx-auto">
          Three steps from landing here to knowing exactly where your AI budget is leaking.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Enter your stack', desc: 'Tell us which AI tools you pay for, which plan, how many seats, and your team size.' },
            { step: '02', title: 'Run the audit', desc: 'Our engine checks for overpaid plans, unused seats, tool overlap, and cheaper alternatives.' },
            { step: '03', title: 'See your savings', desc: 'Get per-tool recommendations with exact dollar amounts. Share your report or book a Credex consultation.' },
          ].map((step, i) => (
            <m.div
              key={step.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="glass-card p-8 relative"
            >
              <div className="text-5xl font-black text-[#1e1e35] mb-4 select-none">{step.step}</div>
              <h3 className="text-xl font-semibold mb-3 text-white">{step.title}</h3>
              <p className="text-[#94a3b8] leading-relaxed">{step.desc}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <m.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-bold text-center mb-12"
        >
          Everything you need to right-size your AI spend
        </m.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <m.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="glass-card p-6"
            >
              <div className="text-3xl mb-4" role="img" aria-label={feature.title}>{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2 text-white">{feature.title}</h3>
              <p className="text-[#94a3b8] text-sm leading-relaxed">{feature.description}</p>
            </m.div>
          ))}
        </div>
      </section>

      {/* ── Social Proof ───────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="glass-card p-8 sm:p-12 text-center border-[var(--border-accent)]" style={{ borderColor: 'rgba(129, 140, 248, 0.2)' }}>
          <div className="text-sm text-[#64748b] mb-2 uppercase tracking-wider font-medium">Why This Exists</div>
          <blockquote className="text-2xl sm:text-3xl font-semibold text-white max-w-3xl mx-auto leading-snug mb-6">
            "Most startups don't know they're overspending on AI tools. They look at their monthly bill, sigh, and pay it."
          </blockquote>
          <p className="text-[#94a3b8]">There's no "Mint for AI tool spend." <strong className="text-white">StackSave is that tool.</strong></p>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-extrabold mb-6">
            Find out what you're{' '}
            <span className="gradient-text">actually spending</span>
          </h2>
          <p className="text-[#94a3b8] text-lg mb-10 max-w-xl mx-auto">
            Free audit. No credit card. No login. Your results in under 60 seconds.
          </p>
          <m.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/audit')}
            className="px-10 py-4 rounded-xl font-bold text-xl text-white glow-primary"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            aria-label="Start your free AI spend audit"
            id="bottom-cta"
          >
            Start My Free Audit →
          </m.button>
        </m.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#475569]">
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
              className="text-indigo-400 hover:text-indigo-300"
            >
              Credex
            </a>{' '}
            · Discounted AI infrastructure credits
          </div>
        </div>
      </footer>
    </div>
  );
}
