import { type ReactNode, useEffect, useRef, useState } from 'react';
import { m, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import LogoLoop from '../components/LogoLoop';
import Logo from '../components/Logo';
import OfferNotificationBell from '../components/OfferNotificationBell';
import InteractiveBackground from '../components/InteractiveBackground';

import './LandingBackground.css';

const navItems = [
  { label: 'Features', id: 'features' },
  { label: 'How It Works', id: 'how-it-works' },
  { label: 'About', id: 'about' },
  { label: 'FAQ', id: 'faq' },
];

const techLogos = [
  { src: '/logos/cursor.svg', title: 'Cursor', className: 'logo-cursor' },
  { src: '/logos/copilot.svg', title: 'GitHub Copilot', className: 'logo-copilot' },
  { src: '/logos/claude.svg', title: 'Claude', className: 'logo-claude' },
  { src: '/logos/chatgpt.svg', title: 'ChatGPT', className: 'logo-chatgpt' },
  { src: '/logos/anthropic.svg', title: 'Anthropic API', className: 'logo-anthropic' },
  { src: '/logos/openai.svg', title: 'OpenAI API', className: 'logo-openai' },
  { src: '/logos/gemini.svg', title: 'Gemini', className: 'logo-gemini' },
  { src: '/logos/windsurf.svg', title: 'Windsurf', className: 'logo-windsurf' },
  { src: '/logos/kimi.svg', title: 'Kimi', className: 'logo-kimi' },
];

const auditChecks = [
  {
    feature: 'Pricing Validation',
    detail: 'Checks plan tiers, hidden rate changes, and billing anomalies across every provider line item.',
    savings: '$295/mo',
  },
  {
    feature: 'Duplicate AI Subscriptions',
    detail: 'Detects overlapping tools and paid seats that cover the same capabilities across teams.',
    savings: '$420/mo',
  },
  {
    feature: 'Inactive Seats',
    detail: 'Flags unused developer seats and contractor licenses that are still being billed.',
    savings: '$215/mo',
  },
  {
    feature: 'API vs Subscription Analysis',
    detail: 'Compares actual usage against flat licenses to recommend the most efficient pricing model.',
    savings: '$190/mo',
  },
  {
    feature: 'Billing Cycle Optimization',
    detail: 'Looks for mismatched annual vs monthly terms that can be consolidated for lower effective cost.',
    savings: '$280/mo',
  },
  {
    feature: 'Cheaper Tier Detection',
    detail: 'Identifies opportunities to move from higher enterprise tiers to fully compatible lower plans.',
    savings: '$270/mo',
  },
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
    <section
      id={id}
      className={`py-20 md:py-24 overflow-hidden ${className}`}
      style={{ scrollMarginTop: '94px', ...style }}
    >
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-16 xl:px-20">{children}</div>
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
/* ─────────────────────────────────────────────────────────────
   AuditDemoCard — Premium product reveal with 3D entrance
───────────────────────────────────────────────────────────── */

/** Animated counting number — counts from 0 to target */
function CountUp({ to, prefix = '', suffix = '', decimals = 0, duration = 1.2, delay = 0 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number; delay?: number;
}) {
  const nodeRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    const t = setTimeout(() => {
      const controls = animate(0, to, {
        duration,
        ease: [0.25, 0.46, 0.45, 0.94],
        onUpdate(value) {
          node.textContent = prefix + value.toFixed(decimals) + suffix;
        },
      });
      return () => controls.stop();
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [to, prefix, suffix, decimals, duration, delay]);
  return <span ref={nodeRef}>{prefix}0{suffix}</span>;
}

function AuditDemoCard() {
  const [showRows, setShowRows] = useState(false);
  const [showGlow, setShowGlow] = useState(false);

  /* Trigger rows + glow after card has fully landed */
  useEffect(() => {
    const glowT = setTimeout(() => setShowGlow(true), 1700);
    const rowsT = setTimeout(() => setShowRows(true), 1900);
    return () => { clearTimeout(glowT); clearTimeout(rowsT); };
  }, []);

  const recommendations = [
    'Duplicate ChatGPT subscription',
    'Unused Cursor seat',
  ];

  return (
    /* perspective wrapper required for rotateY to look 3D */
    <div style={{ perspective: '1200px', width: '100%', maxWidth: '440px', margin: '0 auto' }}>

      {/* Glow that fades in behind the card after it lands */}
      <m.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={showGlow ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
        transition={{ duration: 1.0, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          inset: '-32px',
          borderRadius: '56px',
          background: 'radial-gradient(ellipse at 50% 60%, rgba(16,185,129,0.18) 0%, rgba(30,58,95,0.08) 50%, transparent 80%)',
          filter: 'blur(32px)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      {/* The card itself — 3D spin entrance */}
      <m.div
        initial={{
          opacity: 0,
          scale: 0.75,
          rotateY: 360,
          rotateX: 15,
          filter: 'blur(10px)',
        }}
        animate={{
          opacity: 1,
          scale: 1,
          rotateY: [-5, 0],   /* overshoot then settle */
          rotateX: 0,
          filter: 'blur(0px)',
        }}
        transition={{
          opacity: { duration: 0.6, ease: 'easeOut' },
          scale: { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
          rotateY: { duration: 1.6, ease: [0.16, 1, 0.3, 1], times: [0, 1] },
          rotateX: { duration: 1.6, ease: [0.16, 1, 0.3, 1] },
          filter: { duration: 0.8, ease: 'easeOut' },
        }}
        style={{
          position: 'relative',
          zIndex: 1,
          transformStyle: 'preserve-3d',
          borderRadius: '28px',
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-card)',
          boxShadow: '0 32px 80px -12px rgba(30,58,95,0.18), 0 4px 16px -4px rgba(30,58,95,0.10)',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        {/* Browser chrome bar */}
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          </div>
          <span className="text-[10px] font-mono text-slate-400">stacksave.ai/summary</span>
          <div className="w-8" />
        </div>

        <div className="p-5 space-y-4">
          <span className="text-[10px] uppercase tracking-[0.32em] font-semibold text-slate-400">Example AI Audit</span>

          {/* Spend rows with counting numbers */}
          <div className="space-y-3">
            <div className="rounded-3xl border bg-[var(--color-bg-surface)] px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[9px] uppercase tracking-[0.28em] text-slate-400">Current AI Spend</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--color-text-heading)]">
                $<CountUp to={120} suffix="/mo" delay={1.0} duration={0.8} />
              </div>
            </div>
            <div className="rounded-3xl border bg-[var(--color-bg-surface)] px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[9px] uppercase tracking-[0.28em] text-slate-400">Optimized AI Spend</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--color-success)]">
                $<CountUp to={80} suffix="/mo" delay={1.1} duration={0.8} />
              </div>
            </div>
          </div>

          {/* Savings highlight */}
          <div className="rounded-3xl border bg-[var(--color-bg-surface)] px-4 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-[10px] uppercase tracking-[0.28em] text-slate-400">You Save</div>
            <div className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--color-primary)]">
              $<CountUp to={40} delay={1.3} duration={0.7} />
              <span className="text-base font-semibold text-slate-500">/month</span>
            </div>
          </div>

          {/* Waste reduction label */}
          <div className="flex items-center justify-between text-sm font-semibold text-[var(--color-text-heading)]">
            <span>Waste reduction</span>
            <m.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.4 }}
              className="text-[var(--color-success)]"
            >
              33%
            </m.span>
          </div>

          {/* Recommendation rows — staggered reveal */}
          <div className="space-y-2">
            {recommendations.map((item, index) => (
              <m.div
                key={item}
                initial={{ opacity: 0, x: 16 }}
                animate={showRows ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
                transition={{
                  delay: index * 0.18,
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] font-semibold text-sm">
                  ✓
                </span>
                <p className="text-sm leading-snug text-[var(--color-text-heading)]">{item}</p>
              </m.div>
            ))}
          </div>
        </div>
      </m.div>
    </div>
  );
}

export default function LandingPage() {

  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('features');
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => Number(b.intersectionRatio) - Number(a.intersectionRatio))[0];

        if (visibleSection) {
          setActiveSection(visibleSection.target.id);
        }
      },
      {
        rootMargin: '-35% 0px -55% 0px',
        threshold: [0.15, 0.5, 0.85],
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'var(--color-bg-base)' }}
    >
      {/* ── Navbar ──────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 border-b transition duration-300 ${hasScrolled ? 'border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl' : 'border-transparent bg-white/90 shadow-none'}`}
        style={{ WebkitBackdropFilter: 'blur(18px)' }}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-16 xl:px-20 h-[84px] flex items-center">
          <button
            onClick={() => navigate('/')}
            className="focus:outline-none"
            aria-label="StackSave home"
          >
            <Logo size="lg" asDiv />
          </button>

          <nav className="hidden md:flex items-center gap-[36px] lg:gap-[40px] ml-[40px] lg:ml-[80px]" aria-label="Main navigation">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`text-[15px] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 hover:-translate-y-0.5 ${activeSection === item.id ? 'text-slate-950' : 'text-slate-500 hover:text-slate-900'}`}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3.5 ml-[32px]">
            <OfferNotificationBell />

            <button

              onClick={() => navigate('/audit')}
              className="h-[44px] px-5 flex items-center justify-center rounded-xl font-medium text-[14px] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5"
              style={{ background: 'var(--color-primary)', color: '#ffffff' }}
              aria-label="Start free audit"
            >
              Start Free Audit <span className="ml-2 font-normal opacity-70">→</span>
            </button>
          </div>
        </div>
      </header>


      {/* ── 1. Hero with compact preview teaser ─────────── */}
      <section className="hero-section pt-12 pb-16 md:pt-16 md:pb-20" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {/* Layered continuous background canvas with mouse interaction */}
        <InteractiveBackground />

        <div className="hero-content max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-16 xl:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 xl:gap-24 items-center">

            {/* Left: Headline & CTA */}
            <div className="lg:col-span-6 space-y-6 text-left">
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
                  className="max-w-xl text-base sm:text-lg leading-relaxed"
                  style={{ color: 'var(--color-text-body)' }}
                >
                  Most companies waste 30% of their software budget on wrong tiers, duplicate accounts, and idle seats.
                </p>
              </div>

              {/* ── 3 Action Cards (Audit, Build, Offers) ────────────────── */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3.5">

                {/* 1. Audit Existing Stack (Dark Luxury Card) */}
                <div
                  onClick={() => navigate('/audit')}
                  className="group relative cursor-pointer rounded-2xl bg-slate-950 p-5 flex flex-col justify-between overflow-hidden select-none border border-slate-800 shadow-sm hover:border-slate-700 transition-colors duration-150"
                >
                  {/* Subtle top-light gradient sheen */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />

                  <div>
                    {/* Top Icon */}
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center mb-3.5">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </div>

                    {/* Eyebrow */}
                    <p className="text-[10px] font-bold text-white/50 tracking-widest uppercase">
                      Already using AI tools?
                    </p>

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-white tracking-tight leading-snug mt-1">
                      Audit My Existing Stack
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
                      Get a deterministic breakdown of waste, overlap, and savings opportunities in minutes.
                    </p>

                    {/* Benefit Bullets */}
                    <ul className="mt-4 space-y-2">
                      {['Detect duplicate subscriptions', 'Flag idle seats & unused tiers', 'Identify billing anomalies'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[11px] text-white/75">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Action Footer — Clean Matte Highlighted Button */}
                  <div className="mt-6 pt-3.5 border-t border-white/10">
                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-white text-slate-950 text-xs font-bold flex items-center justify-between shadow-2xs group-hover:bg-slate-100 transition-colors duration-150">
                      <span className="tracking-tight">Start Free Audit</span>
                      <span className="w-6 h-6 rounded-full bg-slate-950 text-white flex items-center justify-center text-xs font-bold group-hover:translate-x-0.5 transition-transform duration-150">
                        →
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Build AI Stack (Light Glass Card) */}
                <div
                  onClick={() => navigate('/build-stack')}
                  className="group relative cursor-pointer rounded-2xl p-5 flex flex-col justify-between overflow-hidden select-none border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs hover:border-slate-300 transition-colors duration-150"
                >
                  <div>
                    {/* Top Icon */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center mb-3.5">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>

                    {/* Eyebrow */}
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                      Starting from scratch?
                    </p>

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-slate-950 tracking-tight leading-snug mt-1">
                      Build My AI Stack
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Tell us your budget, team size, and workflow. Get a curated, cost-optimised AI tool suite.
                    </p>

                    {/* Benefit Bullets */}
                    <ul className="mt-4 space-y-2">
                      {['Personalised tool recommendations', 'Compare plans side-by-side', 'Avoid vendor lock-in from day 1'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Action Footer — Clean Matte Highlighted Button */}
                  <div className="mt-6 pt-3.5 border-t border-slate-100">
                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-slate-950 text-white text-xs font-bold flex items-center justify-between shadow-2xs group-hover:bg-slate-800 transition-colors duration-150">
                      <span className="tracking-tight">Build My AI Stack</span>
                      <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold group-hover:translate-x-0.5 transition-transform duration-150">
                        →
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. AI Offers & Pricing (Emerald Accent Glass Card) */}
                <div
                  onClick={() => navigate('/offers')}
                  className="group relative cursor-pointer rounded-2xl p-5 flex flex-col justify-between overflow-hidden select-none border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs hover:border-emerald-300 transition-colors duration-150"
                >
                  <div>
                    {/* Top Icon */}
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-3.5">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                      </svg>
                    </div>

                    {/* Eyebrow */}
                    <p className="text-[10px] font-bold text-emerald-700 tracking-widest uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Intelligence
                    </p>

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-slate-950 tracking-tight leading-snug mt-1">
                      AI Offers &amp; Pricing
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                      Track verified vendor discounts, promotions, and price shifts across 13 providers.
                    </p>

                    {/* Benefit Bullets */}
                    <ul className="mt-4 space-y-2">
                      {['13 AI providers monitored 24/7', 'Live discounts & batch promotions', 'Direct official vendor feeds'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Bottom Action Footer — Clean Matte Highlighted Button */}
                  <div className="mt-6 pt-3.5 border-t border-slate-100">
                    <div className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between shadow-2xs group-hover:bg-emerald-700 transition-colors duration-150">
                      <span className="tracking-tight">View AI Offers</span>
                      <span className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold group-hover:translate-x-0.5 transition-transform duration-150">
                        →
                      </span>
                    </div>
                  </div>
                </div>



              </div>
            </div>





            {/* Right: Premium AI Audit Demo Card with entrance animation */}
            <div className="lg:col-span-6 lg:flex lg:justify-end">
              <div className="hero-card-stage w-full">
                <div className="hero-card-wrapper mx-auto lg:mx-0">
                  <AuditDemoCard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo Loop Section (Supported AI Platforms) ── */}
      <section
        className="py-12 border-b section-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-[1800px] w-[95vw] mx-auto text-center space-y-6 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Supported AI Platforms
          </p>
          <div className="py-2 w-full">
            <LogoLoop
              logos={techLogos}
              speed={30}
              gap={36}
              logoHeight={40}
              fadeOutColor="#ffffff"
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
      <Section className="section-white" style={{ borderBottom: '1px solid var(--color-border)' }}>
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

      {/* ── 3. About StackSave ─────────────────────────────── */}
      <Section
        id="about"
        className="section-offwhite"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <SectionHeading
          overline="About StackSave"
          title="A lean AI audit engine built for modern teams"
          subtitle="StackSave combines provider pricing intelligence, seat-level analysis, and usage patterns to find savings without revealing your sensitive account data."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="rounded-3xl border bg-white p-8" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-heading)' }}>
              What we analyze
            </h3>
            <ul className="space-y-3 text-sm text-[var(--color-text-body)]">
              <li>Current plan selection, seat counts, and enterprise contracts</li>
              <li>Overlapping AI tools across teams and duplicated feature sets</li>
              <li>Annual vs monthly pricing, usage tiers, and seat churn risk</li>
            </ul>
          </div>
          <div className="rounded-3xl border bg-[var(--color-bg-surface)] p-8" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text-heading)' }}>
              Why it matters
            </h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-body)]">
              Every month, teams overpay on AI infrastructure because vendor pricing is opaque and seat usage is fragmented. StackSave makes spend visible and gives teams a clear path to reduce recurring costs.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 4. How it works ──────────────────────────────────── */}
      <Section id="how-it-works" className="section-white" style={{ borderBottom: '1px solid var(--color-border)' }}>
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

      {/* ── 4. Product Preview (Audit Report Walkthrough) ───── */}
      <Section
        className="section-offwhite"
        style={{
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <SectionHeading
          overline="Audit Report"
          title="What your StackSave report looks like"
          subtitle="This is the exact summary generated after your audit, with clear spend, waste, and actions."
          align="left"
        />

        <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-semibold">Report walkthrough</p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  Read the report at a glance
                </h3>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                Built for audits
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border bg-[var(--color-bg-surface)] p-5" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Current spend</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">$3,840</p>
                <p className="mt-2 text-sm text-[var(--color-text-body)]">Baseline monthly AI cost</p>
              </div>
              <div className="rounded-3xl border bg-[var(--color-bg-surface)] p-5" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Potential savings</p>
                <p className="mt-3 text-3xl font-semibold text-[var(--color-primary)]">$1,420</p>
                <p className="mt-2 text-sm text-[var(--color-text-body)]">Avoidable cost per month</p>
              </div>
              <div className="rounded-3xl border bg-[var(--color-bg-surface)] p-5" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Optimized spend</p>
                <p className="mt-3 text-3xl font-semibold text-slate-950">$2,420</p>
                <p className="mt-2 text-sm text-[var(--color-text-body)]">Expected spend after changes</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <m.div
                whileHover={{ y: -2 }}
                className="group rounded-[28px] border bg-[var(--color-bg-surface)] p-6 transition-shadow duration-200"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-slate-900 group-hover:text-white">
                    <span className="font-semibold">1</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-slate-950">Spend visibility</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                      The report begins with your actual spend so every recommendation is anchored to a real cost baseline.
                    </p>
                  </div>
                </div>
              </m.div>

              <m.div
                whileHover={{ y: -2 }}
                className="group rounded-[28px] border bg-[var(--color-bg-surface)] p-6 transition-shadow duration-200"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-slate-900 group-hover:text-white">
                    <span className="font-semibold">2</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-slate-950">Waste detection</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                      Identifies inactive seats, duplicate subscriptions, and pricing mismatches with clear labels and savings impact.
                    </p>
                  </div>
                </div>
              </m.div>

              <m.div
                whileHover={{ y: -2 }}
                className="group rounded-[28px] border bg-[var(--color-bg-surface)] p-6 transition-shadow duration-200"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-slate-900 group-hover:text-white">
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-semibold text-slate-950">Recommended action</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                      Ends with concrete guidance on which subscriptions to downgrade, consolidate, or cancel first.
                    </p>
                  </div>
                </div>
              </m.div>
            </div>
          </div>

          <div className="space-y-4">
            <m.div
              whileHover={{ y: -2 }}
              className="rounded-[32px] border bg-white p-7 shadow-sm transition-shadow duration-200"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-semibold">Report detail</p>
                  <h4 className="mt-3 text-xl font-semibold text-slate-950">How to interpret this section</h4>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Key takeaway</span>
              </div>
              <div className="mt-6 space-y-4 text-sm text-[var(--color-text-body)] leading-relaxed">
                <p><strong className="text-slate-950">Start with spend.</strong> The control figure is the baseline that makes savings actionable.</p>
                <p><strong className="text-slate-950">Focus on waste.</strong> The report calls out the exact inefficiencies to remove first.</p>
                <p><strong className="text-slate-950">Use next steps.</strong> The final recommendations are built to be executable, not abstract.</p>
              </div>
            </m.div>

            <m.div
              whileHover={{ y: -2 }}
              className="rounded-[32px] border bg-white p-7 shadow-sm transition-shadow duration-200"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-semibold">Why this matters</p>
                  <h4 className="mt-3 text-xl font-semibold text-slate-950">This feels like real product output</h4>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">Report-first</span>
              </div>
              <div className="mt-6 space-y-4 text-sm text-[var(--color-text-body)] leading-relaxed">
                <p>We removed fake browser framing and oversized screenshots so the focus is on the data and the story it tells.</p>
                <p>Every element is intended to feel like a real audit summary, not a landing page mockup.</p>
              </div>
            </m.div>
          </div>
        </div>
      </Section>

      {/* ── 5. Features / Audit Rules ───────────────────────── */}
      <Section
        id="features"
        className="section-white"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <SectionHeading
          overline="Audit Engine"
          title="A clearer view of what StackSave analyzes"
          subtitle="This section is an inspection dashboard, not a feature list. Each item represents a real cost check our engine performs against your AI bill."
          align="left"
        />

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl">
                <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-slate-400">
                  6 Audit Checks
                </p>
                <h3 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                  Total potential savings
                  <span className="block mt-3 text-4xl font-extrabold text-[var(--color-primary)]">
                    $1,670/mo
                  </span>
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-body)]">
                  StackSave validates pricing, subscription overlap, idle seats, contract terms, and plan efficiency so finance and engineering teams can prioritize exactly where to save.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-1">
                <div className="rounded-3xl bg-[var(--color-bg-surface)] p-4 border" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Engine confidence</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">92%</p>
                </div>
                <div className="rounded-3xl bg-[var(--color-bg-surface)] p-4 border" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">Checks completed</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">6</p>
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-4">
              {auditChecks.slice(0, 2).map((check, index) => (
                <m.div
                  key={check.feature}
                  whileHover={{ y: -2 }}
                  className="group rounded-[24px] border bg-[var(--color-bg-surface)] p-5 transition-shadow duration-200"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-slate-900 group-hover:text-white">
                        <span className="font-semibold">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Inspection</p>
                        <h4 className="mt-2 text-lg font-semibold text-slate-950">{check.feature}</h4>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-950">{check.savings}</p>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-body)]">
                    {check.detail}
                  </p>
                </m.div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border bg-white p-8 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] font-semibold text-slate-400">
                  Inspection Checklist
                </p>
                <h4 className="mt-3 text-2xl font-semibold text-slate-950">What the audit reviews</h4>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">
                Live
              </div>
            </div>

            <div className="mt-8 space-y-4">
              {auditChecks.map((check) => (
                <m.div
                  key={check.feature}
                  whileHover={{ y: -2 }}
                  className="group rounded-3xl border bg-[var(--color-bg-surface)] p-5 transition-shadow duration-200 hover:shadow-sm"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-200 group-hover:bg-slate-900 group-hover:text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <h5 className="text-base font-semibold text-slate-950">{check.feature}</h5>
                        <span className="text-sm font-semibold text-slate-700">{check.savings}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-body)]">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── 6. FAQ ─────────────────────────────────────────── */}
      <Section id="faq" className="section-offwhite" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <SectionHeading
          overline="FAQ"
          title="Quick answers before your audit starts"
          subtitle="Common questions about our AI savings audit and what you can expect from the results."
          align="left"
        />
        <div className="grid gap-6 max-w-4xl mx-auto">
          {[
            {
              question: 'Do I need to share cloud credentials?',
              answer: 'No. StackSave only needs your active AI tool list and plan details to identify savings opportunities.',
            },
            {
              question: 'How fast is the audit?',
              answer: 'Most audits complete within a minute and return an actionable summary report.',
            },
            {
              question: 'Can I use this for team budgeting?',
              answer: 'Yes. Results are designed for finance and engineering teams to decide where to downsize or consolidate tools.',
            },
          ].map((item) => (
            <div key={item.question} className="rounded-3xl border bg-[var(--color-bg-surface)] p-6" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text-heading)' }}>
                {item.question}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-body)]">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── 7. Testimonials / Quote ─────────────────────────── */}
      <Section className="section-white" style={{ borderBottom: '1px solid var(--color-border)' }}>
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
            <div className="brightness-0 invert opacity-90">
              <Logo asDiv />
            </div>
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
