// ============================================================
// UpgradeModal — Refined SaaS Premium Upgrade Experience
// Production-grade 2-column modal inspired by Linear, Stripe, Vercel,
// and Notion. Zero emojis, restrained editorial typography, soft-square
// feature containers, and clean SVG icons throughout.
// ============================================================

import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { createBillingSubscription, verifyBillingPayment, fetchBillingStatus } from '../services/api';
import { launchRazorpaySubscriptionCheckout } from '../utils/razorpay';
import type { SubscriptionPlanKey, BillingStatusResponse } from '../types';
import {
  PROMOTION_CONFIG,
  isPromotionActive,
  formatDiscountBadge,
  formatOriginalPrice,
  formatCurrentPrice,
  formatMonthlyBreakdown,
  formatYearlySavingsBadge,
} from '../utils/billingConstants';
import { dismissUpgradePrompt } from '../utils/upgradePromptControl';

export type UpgradeModalTrigger =
  | 'save'
  | 'share'
  | 'audit'
  | 'stack'
  | 'stack-save'
  | 'offers'
  | 'scroll'
  | 'general';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: UpgradeModalTrigger;
  onUpgradeSuccess?: () => void;
}

type CheckoutStatus =
  | 'idle'
  | 'creating'
  | 'checkout_open'
  | 'verifying'
  | 'confirming'
  | 'success'
  | 'error';

export default function UpgradeModal({
  isOpen,
  onClose,
  type = 'general',
  onUpgradeSuccess,
}: UpgradeModalProps) {
  const navigate = useNavigate();
  const { user, authenticated, openAuthModal, refreshUser, startDirectSubscription } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('yearly');
  const [status, setStatus] = useState<CheckoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingStatusResponse | null>(null);
  const [loadingBilling, setLoadingBilling] = useState<boolean>(false);

  const isPremiumUser = user?.plan === 'PREMIUM';
  const promoActive = isPromotionActive();

  // Fetch live billing info when opened for a Premium user & lock scroll
  useEffect(() => {
    if (isOpen && isPremiumUser) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setLoadingBilling(true);
      fetchBillingStatus()
        .then((res) => {
          setBillingInfo(res);
        })
        .catch((err) => {
          console.error('Failed to load billing status for premium popup:', err);
        })
        .finally(() => {
          setLoadingBilling(false);
        });
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isPremiumUser]);

  // Close on Escape when not actively processing payment
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen && status !== 'verifying' && status !== 'creating') {
        handleDismiss();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, status]);

  // Reset state on modal open & lock body scroll for non-premium
  useEffect(() => {
    if (isOpen && !isPremiumUser) {
      setStatus('idle');
      setErrorMessage(null);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, isPremiumUser]);

  const handleDismiss = () => {
    // Record frequency dismissal cooldown
    if (type === 'scroll' || type === 'offers') {
      dismissUpgradePrompt(type);
    } else if (type === 'audit' || type === 'stack') {
      dismissUpgradePrompt(type);
    }
    onClose();
  };

  const startSubscriptionCheckout = async (
    targetUser: { name: string; email: string },
    planToSubscribe: SubscriptionPlanKey = selectedPlan
  ) => {
    try {
      setStatus('creating');
      setErrorMessage(null);

      // 2. Call backend to create Razorpay Subscription
      const checkoutConfig = await createBillingSubscription(planToSubscribe);

      setStatus('checkout_open');

      // 3. Open official Razorpay Checkout popup
      await launchRazorpaySubscriptionCheckout({
        keyId: checkoutConfig.keyId,
        subscriptionId: checkoutConfig.subscriptionId,
        name: checkoutConfig.name,
        description: checkoutConfig.description,
        userName: targetUser.name,
        userEmail: targetUser.email,
        onSuccess: async (rzpResponse) => {
          try {
            setStatus('verifying');

            // 4. Server-side signature verification & state sync
            await verifyBillingPayment({
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_subscription_id: rzpResponse.razorpay_subscription_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            // 5. Refresh authenticated user in context
            await refreshUser();

            setStatus('success');

            if (onUpgradeSuccess) {
              onUpgradeSuccess();
            }

            // Auto-close after brief confirmation
            setTimeout(() => {
              onClose();
            }, 1800);
          } catch (verifyErr: any) {
            console.error('Subscription verification failed:', verifyErr);
            setStatus('confirming');
            setTimeout(async () => {
              await refreshUser();
              onClose();
            }, 3000);
          }
        },
        onDismiss: () => {
          setStatus('idle');
        },
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Unable to launch checkout. Please try again.');
    }
  };

  const handleSubscribe = async () => {
    // 1. If guest, close ads modal first, trigger Google authentication with warning notice, then redirect directly to payment
    if (!authenticated || !user) {
      const planToSubscribe = selectedPlan;
      // Close the ads/upgrade modal first as requested
      onClose();

      openAuthModal({
        reason: 'Sign in with Google to subscribe to StackSave Premium',
        isPremiumIntent: true,
        selectedPlan: planToSubscribe,
        onAuthSuccess: async (authedUser) => {
          if (authedUser) {
            await startDirectSubscription(planToSubscribe, authedUser);
          }
        },
      });
      return;
    }

    startSubscriptionCheckout(user, selectedPlan);
  };

  // 6 Premium Features: Soft-square containers with restrained palette
  const features = [
    {
      title: 'New offer email notifications',
      desc: 'Get notified when new AI offers are discovered.',
      containerStyle: 'bg-blue-50/80 border border-blue-100/90 text-blue-600',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      ),
    },
    {
      title: 'Instant offer updates',
      desc: 'Stay updated on important pricing and offer changes.',
      containerStyle: 'bg-emerald-50/80 border border-emerald-100/90 text-emerald-600',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
    },
    {
      title: 'More AI offers',
      desc: 'Get access to additional Premium opportunities where supported.',
      containerStyle: 'bg-purple-50/80 border border-purple-100/90 text-purple-600',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h12l4 6-10 13L2 9Z" />
          <path d="M11 3 8 9l4 13 4-13-3-6" />
          <path d="M2 9h20" />
        </svg>
      ),
    },
    {
      title: 'Unlimited saved audits',
      desc: 'Keep your complete audit history.',
      containerStyle: 'bg-amber-50/80 border border-amber-100/90 text-amber-700',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
        </svg>
      ),
    },
    {
      title: 'Advanced AI spending insights',
      desc: 'Get deeper analysis and recommendations.',
      containerStyle: 'bg-rose-50/80 border border-rose-100/90 text-rose-600',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
      ),
    },
    {
      title: 'Early access to new features',
      desc: 'Get access to selected new StackSave capabilities earlier.',
      containerStyle: 'bg-indigo-50/80 border border-indigo-100/90 text-indigo-600',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  // Contextual modal headings & copy based on trigger event
  const isLimitAction = type === 'save' || type === 'share' || type === 'stack-save';

  let eyebrowContent = null;
  let headlineContent = null;
  let subheadlineContent = null;

  if (type === 'save') {
    eyebrowContent = (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-[10.5px] font-bold text-amber-800 tracking-wider uppercase">
        <span>FREE PLAN LIMIT REACHED</span>
        <span className="text-amber-300 font-normal">|</span>
        <span className="text-amber-700 font-semibold text-[10px]">2 SAVED AUDITS INCLUDED</span>
      </div>
    );
    headlineContent = (
      <>
        Upgrade to <span className="text-emerald-600 font-black">Premium</span> for unlimited audit history
      </>
    );
    subheadlineContent =
      'Your Free plan includes 2 saved audits. Upgrade to Premium for unlimited audit history, version diffs, and automatic price change tracking.';
  } else if (type === 'share') {
    eyebrowContent = (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-[10.5px] font-bold text-amber-800 tracking-wider uppercase">
        <span>FREE PLAN LIMIT REACHED</span>
        <span className="text-amber-300 font-normal">|</span>
        <span className="text-amber-700 font-semibold text-[10px]">5 SHARE LINKS INCLUDED</span>
      </div>
    );
    headlineContent = (
      <>
        Upgrade to <span className="text-emerald-600 font-black">Premium</span> for unlimited audit sharing
      </>
    );
    subheadlineContent =
      'Your Free plan includes 5 audit share links. Upgrade to Premium for unlimited audit sharing, collaborative reports, and permanent links.';
  } else if (type === 'stack-save') {
    eyebrowContent = (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-[10.5px] font-bold text-amber-800 tracking-wider uppercase">
        <span>FREE PLAN LIMIT REACHED</span>
        <span className="text-amber-300 font-normal">|</span>
        <span className="text-amber-700 font-semibold text-[10px]">3 SAVED STACKS INCLUDED</span>
      </div>
    );
    headlineContent = (
      <>
        Upgrade to <span className="text-emerald-600 font-black">Premium</span> for unlimited AI stack history
      </>
    );
    subheadlineContent =
      'Your Free plan includes 3 saved AI stacks. Upgrade to Premium for unlimited stack history, architecture versioning, and automatic tool price drop alerts.';
  } else if (type === 'audit') {
    eyebrowContent = promoActive ? (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>{PROMOTION_CONFIG.promotionLabel}</span>
        <span className="text-emerald-300 font-normal">|</span>
        <span className="text-emerald-600 font-semibold text-[10px]">UPGRADE SMARTER</span>
      </div>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">
        <span>STACKSAVE PREMIUM</span>
      </span>
    );
    headlineContent = promoActive && formatDiscountBadge('yearly') ? (
      <>
        Get <span className="text-emerald-600 font-black">{formatDiscountBadge('yearly').replace('OFF', 'Off')}</span> StackSave Premium
      </>
    ) : (
      'StackSave Premium'
    );
  } else if (type === 'offers') {
    eyebrowContent = promoActive ? (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>{PROMOTION_CONFIG.promotionLabel}</span>
        <span className="text-emerald-300 font-normal">|</span>
        <span className="text-emerald-600 font-semibold text-[10px]">PREMIUM OFFERS</span>
      </div>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">
        <span>STACKSAVE PREMIUM</span>
      </span>
    );
    headlineContent = (
      <>
        Unlock more AI savings with <span className="text-emerald-600 font-black">StackSave Premium</span>
      </>
    );
    subheadlineContent =
      'Discover additional verified AI offers, partner benefits, and pricing opportunities across 29+ AI platforms.';
  } else if (type === 'stack') {
    eyebrowContent = promoActive ? (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>{PROMOTION_CONFIG.promotionLabel}</span>
        <span className="text-emerald-300 font-normal">|</span>
        <span className="text-emerald-600 font-semibold text-[10px]">UPGRADE SMARTER</span>
      </div>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">
        <span>STACKSAVE PREMIUM</span>
      </span>
    );
    headlineContent = promoActive && formatDiscountBadge('yearly') ? (
      <>
        Get <span className="text-emerald-600 font-black">{formatDiscountBadge('yearly').replace('OFF', 'Off')}</span> StackSave Premium
      </>
    ) : (
      'StackSave Premium'
    );
    subheadlineContent =
      'Save your AI stack history, track multi-seat license negotiations, and never miss price drops.';
  } else {
    eyebrowContent = promoActive ? (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[10.5px] font-bold text-emerald-800 tracking-wider uppercase">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span>{PROMOTION_CONFIG.promotionLabel}</span>
        <span className="text-emerald-300 font-normal">|</span>
        <span className="text-emerald-600 font-semibold text-[10px]">UPGRADE SMARTER</span>
      </div>
    ) : (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 border border-slate-200">
        <span>STACKSAVE PREMIUM</span>
      </span>
    );
    headlineContent = promoActive && formatDiscountBadge('yearly') ? (
      <>
        Get <span className="text-emerald-600 font-black">{formatDiscountBadge('yearly').replace('OFF', 'Off')}</span> StackSave Premium
      </>
    ) : (
      'StackSave Premium'
    );
    subheadlineContent = promoActive
      ? PROMOTION_CONFIG.subheadline
      : 'Get unlimited access, full history, and instant price intelligence.';
  }

  const memberSinceFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active Member';

  const validityDateFormatted = billingInfo?.currentPeriodEnd
    ? new Date(billingInfo.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const planIntervalLabel =
    billingInfo?.billingInterval === 'yearly'
      ? 'Yearly · ₹199 / year'
      : billingInfo?.billingInterval === 'quarterly'
      ? 'Quarterly · ₹59 / 3 months'
      : 'Premium Plan';

  // ══════════════════════════════════════════════════════════════
  // PREMIUM USER VIEW: Active Subscription & Validity Dialog
  // ══════════════════════════════════════════════════════════════
  if (isPremiumUser) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs cursor-pointer"
              onClick={handleDismiss}
              aria-hidden="true"
            />

            {/* Centered Modal Card */}
            <m.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="premium-status-modal-title"
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-[720px] my-auto bg-white rounded-3xl border border-slate-200/80 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.2)] overflow-hidden z-10 text-left focus:outline-none p-6 sm:p-8"
            >
              {/* Header: Logo & Close */}
              <div className="flex items-center justify-between">
                <Logo size="sm" asDiv />
                <button
                  onClick={handleDismiss}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100/90 hover:bg-slate-200/90 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                  aria-label="Close dialog"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="mt-5">
                <h3 id="premium-status-modal-title" className="text-2xl sm:text-[27px] font-black text-slate-950 tracking-tight leading-tight">
                  You're on <span className="text-[#057A55]">StackSave Premium</span>
                </h3>
                <p className="mt-1.5 text-xs sm:text-[13.5px] text-slate-500 leading-relaxed max-w-2xl">
                  Your account has active unlimited access to all AI tool audit intelligence, real-time price monitoring, and exclusive features.
                </p>
              </div>

              {/* Elevated Mint/Emerald Membership Hero Card */}
              <div className="mt-5 rounded-2xl bg-gradient-to-br from-[#E7F8F0] via-[#F0FAF5] to-[#DDF5EB] border border-[#BDE8D6] p-5 sm:p-6 relative overflow-hidden shadow-2xs">
                {/* Decorative Top-Right Watermark */}
                <div className="absolute top-4 right-5 sm:right-6 hidden sm:flex flex-col items-center select-none pointer-events-none opacity-40">
                  <span className="font-serif italic text-lg lg:text-xl font-bold text-[#057A55] tracking-tight -rotate-3">
                    Smarter
                  </span>
                  <span className="font-serif italic text-lg lg:text-xl font-bold text-[#057A55] tracking-tight -rotate-3 -mt-1">
                    Spending
                  </span>
                  <span className="font-serif italic text-lg lg:text-xl font-bold text-[#057A55] tracking-tight -rotate-3 -mt-1">
                    Ahead
                  </span>
                  <div className="w-8 h-[1.5px] bg-[#057A55] rounded-full mt-1.5" />
                </div>

                {/* Top Section: Crown Icon, Plan Info & Active Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    {/* Forest Green Crown Icon Tile */}
                    <div className="w-11 h-11 rounded-xl bg-[#086F52] text-white flex items-center justify-center shadow-xs shrink-0">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                      </svg>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#057A55] block leading-none">
                        PREMIUM MEMBERSHIP
                      </span>
                      <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                          StackSave Premium
                        </span>
                        {/* Status Badge (inline next to plan title) */}
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                            billingInfo?.cancelAtPeriodEnd
                              ? 'bg-amber-50 border border-amber-200 text-amber-800'
                              : 'bg-emerald-100/80 border border-emerald-200/90 text-emerald-800'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              billingInfo?.cancelAtPeriodEnd ? 'bg-amber-500' : 'bg-[#10B981]'
                            }`}
                          />
                          <span>{billingInfo?.cancelAtPeriodEnd ? 'Cancels at Period End' : 'Active'}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        {planIntervalLabel}
                        {billingInfo?.cancelAtPeriodEnd && (
                          <span className="text-amber-700 ml-1.5 font-medium">
                            · Active until {validityDateFormatted || 'period end'}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Row: Renews & Member Since */}
                <div className="mt-5 pt-4 border-t border-[#CCEBE0]/90 grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/90 border border-[#CCEBE0] text-slate-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {billingInfo?.cancelAtPeriodEnd ? 'VALID UNTIL' : 'NEXT RENEWAL'}
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 mt-0.5 block truncate">
                        {loadingBilling ? (
                          <span className="text-slate-400 font-normal">Loading...</span>
                        ) : validityDateFormatted ? (
                          validityDateFormatted
                        ) : (
                          'Active Subscription'
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white/90 border border-[#CCEBE0] text-slate-500 flex items-center justify-center shrink-0 shadow-2xs">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        MEMBER SINCE
                      </span>
                      <span className="text-xs sm:text-[13px] font-bold text-slate-800 mt-0.5 block truncate">
                        {memberSinceFormatted}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* YOUR PREMIUM BENEFITS Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    YOUR PREMIUM BENEFITS
                  </span>
                  <span className="text-xs font-semibold text-[#057A55] flex items-center gap-1.5">
                    <span>All features unlocked</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                </div>

                {/* 4 Capability Tiles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Tile 1: Unlimited Saved Audits */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors duration-150 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-3">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                        </svg>
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-900 block leading-tight">
                        Unlimited<br className="hidden sm:inline" /> Saved Audits
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-2 leading-relaxed">
                      Keep your full audit history, forever.
                    </span>
                  </div>

                  {/* Tile 2: Unlimited Sharing */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors duration-150 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-blue-100/80 text-blue-700 flex items-center justify-center mb-3">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-900 block leading-tight">
                        Unlimited<br className="hidden sm:inline" /> Sharing
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-2 leading-relaxed">
                      Permanent share links for your reports.
                    </span>
                  </div>

                  {/* Tile 3: Live Intelligence */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors duration-150 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-amber-100/80 text-amber-700 flex items-center justify-center mb-3">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-900 block leading-tight">
                        Live Intelligence
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-2 leading-relaxed">
                      Instant price-drop alerts and opportunities.
                    </span>
                  </div>

                  {/* Tile 4: Version Diffing */}
                  <div className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors duration-150 flex flex-col justify-between">
                    <div>
                      <div className="w-8 h-8 rounded-full bg-purple-100/80 text-purple-700 flex items-center justify-center mb-3">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <span className="text-[12.5px] font-bold text-slate-900 block leading-tight">
                        Version Diffing
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-2 leading-relaxed">
                      Track changes across audit versions.
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer / Member Confirmation & Action Buttons */}
              <div className="mt-7 pt-4.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Thank You Note */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="w-7 h-7 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      Thank you for being a valued StackSave Premium member.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                      Together, we make cloud spending smarter.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto h-9.5 px-4 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/90 text-xs font-semibold transition-colors duration-150 cursor-pointer text-center"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleDismiss();
                      navigate('/dashboard/settings');
                    }}
                    className="w-full sm:w-auto h-9.5 px-4.5 rounded-xl bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Manage in Settings</span>
                    <span className="text-slate-400">→</span>
                  </button>
                </div>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  const isVisible = isOpen && !isPremiumUser;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs cursor-pointer"
          onClick={() => {
            if (status !== 'verifying' && status !== 'creating') {
              handleDismiss();
            }
          }}
          aria-hidden="true"
        />

        {/* Centered Modal Card */}
        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-[860px] my-auto bg-white rounded-[20px] sm:rounded-[22px] border border-slate-200/90 shadow-[0_24px_64px_-12px_rgba(15,23,42,0.18)] overflow-y-auto md:overflow-hidden max-h-[92dvh] flex flex-col md:flex-row z-10 text-left focus:outline-none"
        >
          {/* Close Action (Subtle circle button on top-right) */}
          <button
            onClick={handleDismiss}
            disabled={status === 'verifying' || status === 'creating'}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/90 transition-colors duration-150 cursor-pointer disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-0"
            aria-label="Close dialog"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* ══════════════════════════════════════════════════════════════
              LEFT COLUMN: Desktop-Only Brand Marketing & Product Preview
              ══════════════════════════════════════════════════════════════ */}
          <div className="hidden md:flex md:w-[44%] p-6 sm:p-7 md:p-8 bg-gradient-to-b from-slate-50/90 via-slate-50/40 to-emerald-50/25 border-r border-slate-100 flex-col justify-between shrink-0">
            <div>
              {/* Logo */}
              <div className="flex items-center">
                <Logo size="sm" asDiv />
              </div>

              {/* Small Refined PREMIUM label with SVG Crown */}
              <div className="mt-3.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10.5px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50/90 border border-amber-200/80 shadow-2xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                  <span>PREMIUM</span>
                </span>
              </div>

              {/* Bold Headline */}
              <h2 className="text-2xl sm:text-[28px] lg:text-[32px] font-black text-slate-950 tracking-tight leading-[1.12] mt-3">
                Unlock the <br />
                full power of <br />
                <span className="text-emerald-600">StackSave</span>
              </h2>

              {/* Supporting Value Copy */}
              <p className="mt-2.5 text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-xs">
                Stay ahead of AI pricing changes, save your analysis, and never miss a valuable offer again.
              </p>
            </div>

            {/* 3D Premium Dashboard & Floating Insights Visual Preview */}
            <div className="mt-4 pt-1 flex items-center justify-center">
              <div className="relative w-full rounded-2xl overflow-hidden flex items-center justify-center">
                <img
                  src="/premium-dashboard-preview.svg"
                  alt="StackSave Premium Intelligence Preview"
                  className="w-full h-auto object-contain max-w-[340px] drop-shadow-[0_12px_24px_rgba(16,185,129,0.08)] select-none pointer-events-none"
                  loading="eager"
                />
              </div>
            </div>

            {/* Sub-accent Footer Eyebrow */}
            <div className="mt-2 pt-2 text-slate-400">
              <div className="w-9 h-[2.5px] bg-emerald-500 rounded-full mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Smarter AI spending starts here
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
              RIGHT COLUMN / RECOMPOSED MOBILE COLUMN
              ══════════════════════════════════════════════════════════════ */}
          <div className="w-full md:w-[56%] p-4.5 sm:p-7 md:p-8 flex flex-col justify-between bg-white md:overflow-y-auto">
            <div>
              {/* Mobile-Only Header: Logo + PREMIUM label */}
              <div className="md:hidden flex items-center justify-between gap-2 pr-8 mb-3">
                <Logo size="sm" asDiv />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200/80">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
                    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                  </svg>
                  <span>PREMIUM</span>
                </span>
              </div>

              {/* Editorial Eyebrow Tag: Contextual or Promo */}
              <div className="flex items-center justify-between gap-2 pr-8">
                {eyebrowContent}
              </div>

              {/* Heading: Strong typographic emphasis with StackSave green */}
              <h3 id="upgrade-modal-title" className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-3 leading-tight">
                {headlineContent}
              </h3>
              <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-normal">
                {subheadlineContent}
              </p>

              {/* 6 Feature Rows: Soft square containers with 1px border */}
              <div className="mt-4 space-y-2.5">
                {features.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 group">
                    <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-150 ${item.containerStyle}`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-normal mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing Cards Selector (2 Options: 14-16px radius, subtle selected state) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Quarterly Card */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('quarterly')}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    selectedPlan === 'quarterly'
                      ? 'border-emerald-600 bg-emerald-50/20 ring-1 ring-emerald-600/20 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      selectedPlan === 'quarterly' ? 'border-emerald-600 bg-white' : 'border-slate-300'
                    }`}>
                      {selectedPlan === 'quarterly' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Quarterly</span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-lg font-black text-slate-950">
                      {formatCurrentPrice('quarterly')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ 3 months</span>
                  </div>

                  <p className="text-[10.5px] text-slate-500 mt-0.5">
                    {formatMonthlyBreakdown('quarterly')}
                  </p>
                </button>

                {/* Yearly Card: Refined corner badge, typography savings, no pills */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('yearly')}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer overflow-hidden ${
                    selectedPlan === 'yearly'
                      ? 'border-emerald-600 bg-emerald-50/25 ring-1 ring-emerald-600/20 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  {/* Refined Corner Label: 50% OFF (Crisp corner treatment, not a pill) */}
                  {promoActive && formatDiscountBadge('yearly') && (
                    <span className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-lg text-[9.5px] font-black uppercase tracking-wider text-white bg-emerald-600 shadow-2xs">
                      {formatDiscountBadge('yearly')}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      selectedPlan === 'yearly' ? 'border-emerald-600 bg-white' : 'border-slate-300'
                    }`}>
                      {selectedPlan === 'yearly' && (
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-900">Yearly</span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-1.5">
                    {promoActive && formatOriginalPrice('yearly') && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatOriginalPrice('yearly')}
                      </span>
                    )}
                    <span className="text-lg font-black text-slate-950">
                      {formatCurrentPrice('yearly')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/ year</span>
                  </div>

                  {/* Supporting Savings & Best Value: Pure typography + star SVG */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-emerald-700">
                      {formatYearlySavingsBadge()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-800">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      <span>Best Value</span>
                    </span>
                  </div>
                </button>
              </div>

              {/* Status Banners */}
              {status === 'confirming' && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Payment received. Confirming your subscription…</span>
                </div>
              )}

              {status === 'success' && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="font-bold">Premium activated! Unlimited saves and intelligence are now unlocked.</span>
                </div>
              )}

              {status === 'error' && errorMessage && (
                <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="text-rose-700 underline font-bold ml-2 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Actions: Primary Upgrade Button with Crown SVG + Arrow Right + Maybe Later */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={status === 'verifying' || status === 'creating' || status === 'success'}
                className="group w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-[13.5px] font-bold shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-950/20"
              >
                {status === 'creating' ? (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Connecting with Razorpay…</span>
                  </div>
                ) : status === 'verifying' ? (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying subscription…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                      </svg>
                      <span>{isLimitAction ? 'Try Premium' : 'Upgrade to Premium'}</span>
                    </div>
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-150"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                disabled={status === 'verifying' || status === 'creating'}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors duration-150 mt-2.5 mx-auto block cursor-pointer disabled:opacity-40"
              >
                {isLimitAction ? 'Not now' : 'Maybe later'}
              </button>
            </div>
          </div>
        </m.div>
      </div>
    )}
  </AnimatePresence>
  );
}
