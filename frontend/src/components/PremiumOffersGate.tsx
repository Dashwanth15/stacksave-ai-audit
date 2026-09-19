// ============================================================
// PremiumOffersGate — StackSave AI Premium Intelligence Gate
// Visual Reference: High-end SaaS locked preview section with 3
// multi-tier blurred cards, centered lock badge, and enterprise
// content unlock card connecting to the existing UpgradeModal.
// ============================================================

import { useAuth } from '../context/AuthContext';

interface PremiumOffersGateProps {
  previewCount?: number;
  className?: string;
  onMaybeLater?: () => void;
}

// 3 Curated synthetic card color configurations matching reference
const PREVIEW_CARD_THEMES = [
  {
    avatarBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-100 border-emerald-200/80 text-emerald-700',
    accentBar: 'bg-emerald-500',
    dotColor: 'bg-emerald-500',
  },
  {
    avatarBg: 'bg-gradient-to-br from-amber-50 via-orange-100 to-amber-100 border-amber-200/80 text-amber-700',
    accentBar: 'bg-amber-500',
    dotColor: 'bg-emerald-500',
  },
  {
    avatarBg: 'bg-gradient-to-br from-indigo-50 via-blue-100 to-violet-100 border-indigo-200/80 text-indigo-700',
    accentBar: 'bg-indigo-500',
    dotColor: 'bg-emerald-500',
  },
];

export default function PremiumOffersGate({
  previewCount = 3,
  className = '',
  onMaybeLater,
}: PremiumOffersGateProps) {
  const { openUpgradeModal } = useAuth();

  const handleUnlock = () => {
    openUpgradeModal('offers');
  };

  const handleDismiss = () => {
    if (onMaybeLater) {
      onMaybeLater();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Real verified product capabilities only (no marketing fluff or emojis)
  const features = [
    'More verified AI offers',
    'New offer email notifications',
    'Instant offer updates',
    'Unlimited saved audits',
    'Advanced AI spending insights',
    'Early access to new features',
  ];

  return (
    <section
      aria-label="Premium AI Offers Section"
      className={`w-full max-w-7xl mx-auto mt-10 sm:mt-14 pt-6 ${className}`}
    >
      {/* ── Outer Surface Container with Subtle Ambient Tint ── */}
      <div className="relative rounded-[22px] sm:rounded-[26px] border border-slate-200/90 bg-gradient-to-b from-slate-50/60 via-white to-emerald-50/15 p-5 sm:p-8 lg:p-9 shadow-xs overflow-hidden">
        
        {/* ── Top Header Row with Subtle Annotation Pointer ── */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-7">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Additional Verified AI Opportunities
            </span>
            <span className="hidden sm:inline-block text-slate-300">•</span>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-slate-400">
              Premium Exclusive Catalog
            </span>
          </div>

          {/* Reference Annotation: "And many more offers inside..." with curved arrow */}
          <div className="hidden lg:flex items-center gap-2 self-end sm:self-auto text-slate-400 select-none">
            <span className="text-[12px] font-medium text-slate-500 italic tracking-tight">
              And many more offers inside...
            </span>
            <svg
              width="28"
              height="24"
              viewBox="0 0 32 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-slate-400 translate-y-1"
              aria-hidden="true"
            >
              <path d="M4 4 C14 2, 24 8, 22 22" />
              <path d="M17 18 L22 23 L26 17" />
            </svg>
          </div>
        </div>

        {/* ── 1. Refined High-End SaaS Blurred Preview Cards (Clickable Interaction) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {Array.from({ length: previewCount }).map((_, idx) => {
            const theme = PREVIEW_CARD_THEMES[idx % PREVIEW_CARD_THEMES.length];
            return (
              <button
                key={idx}
                type="button"
                onClick={handleUnlock}
                aria-label="Unlock Premium Offer Preview"
                className="group relative flex flex-col justify-between rounded-[20px] border border-slate-200/85 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.02)] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.09),0_2px_6px_rgba(15,23,42,0.03)] cursor-pointer text-left overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 min-h-[268px]"
              >
                {/* Subtle top inner edge highlight */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />

                {/* ── Multi-Tiered Protected Content Silhouette ── */}
                <div className="w-full space-y-3.5 select-none pointer-events-none">
                  {/* Layer 1: Header with Avatar & Provider Bar (Light Blur: 1px) */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl ${theme.avatarBg} border flex items-center justify-center shrink-0 shadow-2xs filter blur-[0.8px]`}
                      >
                        <div className="w-3.5 h-3.5 rounded-md bg-white/70" />
                      </div>
                      <div className="space-y-1.5 filter blur-[1.2px]">
                        <div className="h-3.5 w-24 bg-slate-200/90 rounded-md" />
                        <div className="h-2.5 w-16 bg-slate-100 rounded-md" />
                      </div>
                    </div>
                    {/* Status badge simulation */}
                    <div className="h-4.5 w-18 bg-slate-50/90 rounded-md border border-slate-100 flex items-center gap-1.5 px-2 filter blur-[1px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                      <div className="h-2 w-8 bg-slate-200/80 rounded-xs" />
                    </div>
                  </div>

                  {/* Layer 2: Value Highlight Notch & Discount Line (Medium Blur: 1.5px) */}
                  <div className="pt-1.5 flex items-center gap-2 filter blur-[1.5px]">
                    <span className={`h-3.5 w-1 rounded-xs ${theme.accentBar} shrink-0`} />
                    <div className="h-3.5 w-32 bg-slate-200/90 rounded-md" />
                    <div className="h-3 w-12 bg-slate-100 rounded-xs" />
                  </div>

                  {/* Layer 3: Title Area (Medium-Heavy Blur: 2px) */}
                  <div className="space-y-1.5 pt-0.5 filter blur-[2px]">
                    <div className="h-4.5 w-[88%] bg-slate-300/80 rounded-md" />
                    <div className="h-4.5 w-[58%] bg-slate-300/70 rounded-md" />
                  </div>

                  {/* Layer 4: Description Lines (Strong Blur: 2.8px) */}
                  <div className="space-y-1 pt-1 filter blur-[2.8px]">
                    <div className="h-2.5 w-full bg-slate-200/70 rounded-md" />
                    <div className="h-2.5 w-[78%] bg-slate-200/60 rounded-md" />
                  </div>

                  {/* Layer 5: Footer Row (Light-Medium Blur: 1.2px) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="space-y-1 filter blur-[1.2px]">
                      <div className="h-2.5 w-24 bg-slate-100 rounded-md" />
                      <div className="h-2 w-16 bg-slate-100/80 rounded-md" />
                    </div>
                    {/* Simulated View Offer button pill */}
                    <div className="h-8 w-22 bg-slate-900/85 rounded-lg shadow-2xs flex items-center justify-center filter blur-[1.4px]">
                      <div className="h-2.5 w-12 bg-white/70 rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* ── Center Floating Lock Button & Refined "Premium" Badge ── */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 p-4"
                  aria-hidden="true"
                >
                  <div className="flex flex-col items-center gap-1.5 transition-transform duration-200 ease-out group-hover:scale-105">
                    {/* Precision Layered Lock Surface */}
                    <div className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md shadow-[0_4px_16px_-2px_rgba(15,23,42,0.12),0_1px_3px_rgba(15,23,42,0.06)] border border-slate-200/90 flex items-center justify-center transition-all duration-200 group-hover:border-slate-300 group-hover:shadow-[0_6px_20px_-2px_rgba(15,23,42,0.16)]">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-100/90 flex items-center justify-center text-slate-800 shadow-2xs">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-slate-800"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </div>
                    </div>

                    {/* Crisp Floating "Premium" Label Pill */}
                    <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/95 backdrop-blur-md shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] border border-slate-200/90 text-[11px] font-bold text-slate-800 tracking-tight transition-colors duration-200 group-hover:border-slate-300">
                      <span>Premium</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 2. Enterprise SaaS Product Content Unlock Card ── */}
        <div className="rounded-2xl sm:rounded-[22px] border border-slate-200/90 bg-white p-6 sm:p-8 lg:p-9 shadow-xs text-left flex flex-col lg:flex-row lg:items-center justify-between gap-7 sm:gap-8">
          
          {/* Left: Value Proposition & Feature Checklist */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200/80 mb-3">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-amber-500"
                aria-hidden="true"
              >
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
              <span>STACKSAVE PREMIUM</span>
            </div>

            <h2 className="text-2xl sm:text-[26px] font-bold text-slate-950 tracking-tight leading-tight">
              There&apos;s more AI savings waiting.
            </h2>

            <p className="mt-2 text-xs sm:text-[13.5px] text-slate-600 leading-relaxed">
              Unlock Premium to discover additional verified offers, partner benefits, and pricing opportunities across 29+ AI platforms.
            </p>

            {/* Compact 2-Column Feature Checklist (SVG icons, Zero Emojis) */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-700 font-medium">
              {features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-emerald-600 shrink-0"
                    aria-hidden="true"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions (Unlock Premium + Maybe Later) */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-stretch gap-2.5 shrink-0 min-w-[200px] w-full sm:w-auto">
            <button
              type="button"
              onClick={handleUnlock}
              className="group w-full py-3 px-5 rounded-xl bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-xs sm:text-[13px] font-bold shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-amber-400"
                aria-hidden="true"
              >
                <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
              </svg>
              <span>Unlock Premium</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-center"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
