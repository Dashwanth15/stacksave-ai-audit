// ============================================================
// PremiumUpgradeNudge — StackSave Production-Grade Upsell Surface
// Coordinates contextual upgrade prompts and triggers the centered
// high-attention SaaS Upgrade Modal:
// - 'scroll': Landing/public experience (5s delay + 300px scroll) -> Centered Modal
// - 'offers': Offers page experience (once per session) -> Centered Modal
// - 'audit': Contextual horizontal card placed below audit results
// - 'stack': Contextual horizontal card placed below Build My Stack recommendations
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  shouldShowUpgradePrompt,
  recordUpgradePromptShown,
  dismissUpgradePrompt,
  type UpgradePromptVariant,
} from '../utils/upgradePromptControl';
import {
  formatDiscountBadge,
  formatYearlySavingsBadge,
} from '../utils/billingConstants';

interface PremiumUpgradeNudgeProps {
  variant: UpgradePromptVariant;
  id?: string;
  onClose?: () => void;
  className?: string;
}

export default function PremiumUpgradeNudge({
  variant,
  id,
  onClose,
  className = '',
}: PremiumUpgradeNudgeProps) {
  const { user, openUpgradeModal } = useAuth();
  const isPremium = user?.plan === 'PREMIUM';
  const shouldReduceMotion = useReducedMotion();
  const hasTriggeredModalRef = useRef(false);

  const isInline = variant === 'audit' || variant === 'stack';

  // Internal visibility state for inline card variants ('audit', 'stack')
  const [isInlineVisible, setIsInlineVisible] = useState<boolean>(() => {
    if (isPremium || !isInline) return false;
    return shouldShowUpgradePrompt(variant, id, isPremium);
  });

  // Keep inline visibility updated when props (variant, id, isPremium) change
  useEffect(() => {
    if (isPremium || !isInline) {
      setIsInlineVisible(false);
      return;
    }
    setIsInlineVisible(shouldShowUpgradePrompt(variant, id, isPremium));
  }, [variant, id, isPremium, isInline]);

  // ────────────────────────────────────────────────────────────
  // 1. Landing Page Trigger ('scroll') -> Automatic after 5s
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== 'scroll' || isPremium || hasTriggeredModalRef.current) return;
    if (!shouldShowUpgradePrompt('scroll', id, isPremium)) return;

    const timerId = window.setTimeout(() => {
      if (!hasTriggeredModalRef.current && shouldShowUpgradePrompt('scroll', id, isPremium)) {
        hasTriggeredModalRef.current = true;
        recordUpgradePromptShown('scroll', id);
        openUpgradeModal('scroll');
      }
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [variant, id, isPremium, openUpgradeModal]);

  // ────────────────────────────────────────────────────────────
  // 2. Offers Page Trigger ('offers') -> Centered Modal after 5s
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== 'offers' || isPremium || hasTriggeredModalRef.current) return;
    if (!shouldShowUpgradePrompt('offers', id, isPremium)) return;

    const timerId = window.setTimeout(() => {
      if (!hasTriggeredModalRef.current && shouldShowUpgradePrompt('offers', id, isPremium)) {
        hasTriggeredModalRef.current = true;
        recordUpgradePromptShown('offers', id);
        openUpgradeModal('offers');
      }
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [variant, id, isPremium, openUpgradeModal]);

  // ────────────────────────────────────────────────────────────
  // 3. Audit Results Trigger ('audit') -> Centered Modal after 5s
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== 'audit' || isPremium || hasTriggeredModalRef.current) return;
    if (!shouldShowUpgradePrompt('audit', id, isPremium)) return;

    const timerId = window.setTimeout(() => {
      if (!hasTriggeredModalRef.current && shouldShowUpgradePrompt('audit', id, isPremium)) {
        hasTriggeredModalRef.current = true;
        recordUpgradePromptShown('audit', id);
        openUpgradeModal('audit');
      }
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [variant, id, isPremium, openUpgradeModal]);

  // ────────────────────────────────────────────────────────────
  // 4. Build My Stack Results Trigger ('stack') -> Centered Modal after 5s
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (variant !== 'stack' || isPremium || hasTriggeredModalRef.current) return;
    if (!shouldShowUpgradePrompt('stack', id, isPremium)) return;

    const timerId = window.setTimeout(() => {
      if (!hasTriggeredModalRef.current && shouldShowUpgradePrompt('stack', id, isPremium)) {
        hasTriggeredModalRef.current = true;
        recordUpgradePromptShown('stack', id);
        openUpgradeModal('stack');
      }
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [variant, id, isPremium, openUpgradeModal]);

  // Listen for global dismissal events to sync state across duplicate components
  useEffect(() => {
    const handleGlobalDismiss = (e: Event) => {
      const customEvent = e as CustomEvent<{ variant: string; id?: string }>;
      if (customEvent.detail?.variant === variant) {
        setIsInlineVisible(false);
      }
    };

    window.addEventListener('stacksave:upgrade_prompt_dismissed', handleGlobalDismiss);
    return () => {
      window.removeEventListener('stacksave:upgrade_prompt_dismissed', handleGlobalDismiss);
    };
  }, [variant]);

  // Handle dismissal of inline card
  const handleInlineDismiss = useCallback(() => {
    dismissUpgradePrompt(variant, id);
    setIsInlineVisible(false);
    if (onClose) {
      onClose();
    }
  }, [variant, id, onClose]);

  // Handle inline card CTA click -> open Centered Modal
  const handleInlineUpgrade = useCallback(() => {
    openUpgradeModal(variant);
  }, [openUpgradeModal, variant]);

  // Immediate bail-out:
  // - Premium users see zero upgrade prompts
  // - Modal triggers ('scroll', 'offers') do not render inline DOM
  if (isPremium || !isInline || !isInlineVisible) {
    return null;
  }

  // Contextual copy for inline cards
  const headline =
    variant === 'audit'
      ? 'Want to keep this analysis?'
      : 'Make your AI stack history permanent';

  const benefit =
    variant === 'audit'
      ? 'Save this audit and build your personal AI spending history with Premium.'
      : 'Save your configurations and revisit them anytime with Premium.';

  const yearlyDiscount = formatDiscountBadge('yearly');
  const yearlySavings = formatYearlySavingsBadge();

  // ────────────────────────────────────────────────────────────
  // 3. INLINE CONTEXTUAL CARD (audit, stack)
  // Clean horizontal card placed below results, non-blocking
  // ────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isInlineVisible && (
        <m.aside
          role="region"
          aria-label="Premium upgrade opportunity"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full p-4.5 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors my-6 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${className}`}
        >
          {/* Information & Value Proposition */}
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {headline}
              </h3>
              {yearlySavings && (
                <span className="inline-flex items-center text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                  {yearlySavings}
                </span>
              )}
              {yearlyDiscount && (
                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                  {yearlyDiscount}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-2xl">
              {benefit}
            </p>
          </div>

          {/* Action CTAs: Maybe Later + Try Premium */}
          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleInlineDismiss}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Maybe later
            </button>
            <button
              type="button"
              onClick={handleInlineUpgrade}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>Try Premium</span>
            </button>
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  );
}
