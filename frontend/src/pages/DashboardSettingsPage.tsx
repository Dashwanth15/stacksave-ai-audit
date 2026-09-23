// ============================================================
// DashboardSettingsPage — StackSave User Account Settings
// Manages profile, security, live database usage, and Razorpay Live
// subscription billing, plan upgrades, and period-end cancellation.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserUsage,
  fetchBillingStatus,
  createBillingSubscription,
  verifyBillingPayment,
  cancelBillingSubscription,
} from '../services/api';
import { launchRazorpaySubscriptionCheckout } from '../utils/razorpay';
import type {
  UserUsageResponse,
  BillingStatusResponse,
  SubscriptionPlanKey,
} from '../types';
import {
  formatDiscountBadge,
  formatOriginalPrice,
  formatCurrentPrice,
  formatMonthlyBreakdown,
  formatYearlySavingsBadge,
} from '../utils/billingConstants';

export default function DashboardSettingsPage() {
  const { user, authenticated, loading: authLoading, logout, refreshUser, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UserUsageResponse | null>(null);
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);

  // Upgrade & Checkout State
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>('yearly');
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelLoading, setCancelLoading] = useState<boolean>(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const loadData = () => {
    if (authenticated) {
      fetchUserUsage()
        .then(setUsage)
        .catch((err) => console.error('Failed to load usage:', err));

      fetchBillingStatus()
        .then(setBilling)
        .catch((err) => console.error('Failed to load billing status:', err));
    }
  };

  useEffect(() => {
    loadData();
  }, [authenticated]);

  // Redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !authenticated) {
      navigate('/');
    }
  }, [authLoading, authenticated, navigate]);

  if (!user) {
    return null;
  }

  const creationDateStr = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  const isPremium = user.plan === 'PREMIUM' || billing?.isPremium;

  const currentPeriodEndFormatted = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const planIntervalStr =
    billing?.billingInterval === 'yearly'
      ? 'Yearly Plan · ₹199 / year'
      : billing?.billingInterval === 'quarterly'
      ? 'Quarterly Plan · ₹59 / 3 months'
      : 'Premium Plan';

  const startSubscriptionProcess = async (targetUser: { name: string; email: string }) => {
    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      setCheckoutNotice(null);

      // 1. Create subscription with backend
      const config = await createBillingSubscription(selectedPlan);

      // 2. Open Razorpay Checkout popup
      await launchRazorpaySubscriptionCheckout({
        keyId: config.keyId,
        subscriptionId: config.subscriptionId,
        name: config.name,
        description: config.description,
        userName: targetUser.name,
        userEmail: targetUser.email,
        onSuccess: async (rzpResponse) => {
          try {
            setCheckoutNotice('Verifying payment with bank...');
            await verifyBillingPayment({
              razorpay_payment_id: rzpResponse.razorpay_payment_id,
              razorpay_subscription_id: rzpResponse.razorpay_subscription_id,
              razorpay_signature: rzpResponse.razorpay_signature,
            });

            await refreshUser();
            loadData();
            setCheckoutNotice('Subscription activated! Welcome to StackSave Premium.');
            setTimeout(() => setCheckoutNotice(null), 5000);
          } catch (verifyErr: any) {
            console.error('Verification warning:', verifyErr);
            setCheckoutNotice("Payment received. We're confirming your Premium subscription.");
            setTimeout(async () => {
              await refreshUser();
              loadData();
            }, 3000);
          } finally {
            setCheckoutLoading(false);
          }
        },
        onDismiss: () => {
          setCheckoutLoading(false);
        },
      });
    } catch (err: any) {
      console.error('Checkout error:', err);
      setCheckoutError(err.message || 'Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const handleUpgradeCheckout = async () => {
    if (!authenticated || !user) {
      openAuthModal({
        reason: 'Sign in with Google to subscribe to StackSave Premium',
        isPremiumIntent: true,
        selectedPlan: selectedPlan,
        onAuthSuccess: (authedUser) => {
          if (authedUser) {
            startSubscriptionProcess(authedUser);
          }
        },
      });
      return;
    }

    startSubscriptionProcess(user);
  };

  const handleConfirmCancel = async () => {
    try {
      setCancelLoading(true);
      const res = await cancelBillingSubscription(true);
      setIsCancelModalOpen(false);
      setCancelMessage(res.message);
      await refreshUser();
      loadData();
    } catch (err: any) {
      console.error('Cancel error:', err);
      setCancelMessage(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <DashboardLayout
      activeTab="settings"
      pageTitle="Account Settings"
      pageSubtitle="Manage your profile, security, and StackSave membership"
    >
      <div className="max-w-4xl space-y-6">
        {/* ── Unified Settings Surface ───────────────────────── */}
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] divide-y divide-slate-100 overflow-hidden">
          {/* ── 1. User Profile Section ──────────────────────── */}
          <section className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                User Profile
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Account ID: <span className="font-mono text-slate-700">{user.email?.split('@')[0]}</span>
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm ring-4 ring-slate-50 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-bold shadow-sm shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-slate-950 leading-snug">
                    {user.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {user.email}
                  </p>
                  {/* Identity Status Pill */}
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-700">
                      <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24Z" />
                        <path fill="#FBBC05" d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.58H1.26a11.98 11.98 0 0 0 0 10.84l4.02-3.15Z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                      </svg>
                      <span>Google Account</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean Detail Tiles */}
            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                  Display Name
                </span>
                <span className="mt-1 text-[13.5px] font-bold text-slate-900 block truncate">
                  {user.name}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/70">
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="mt-1 text-[13.5px] font-bold text-slate-900 block truncate">
                  {user.email}
                </span>
              </div>
            </div>
          </section>

          {/* ── 2. Plan & Membership Section ─────────────────── */}
          <section className="p-6 sm:p-8">
            {isPremium ? (
              /* ── PRESTIGIOUS PREMIUM MEMBERSHIP SURFACE ── */
              <div>
                {/* Mint/Emerald Hero Card */}
                <div className="rounded-2xl bg-gradient-to-br from-[#E7F8F0] via-[#F0FAF5] to-[#DDF5EB] border border-[#BDE8D6] p-5 sm:p-7 relative overflow-hidden shadow-2xs">
                  {/* Decorative Top-Right Watermark (Positioned clean and non-colliding) */}
                  <div className="absolute top-4 right-5 sm:right-7 hidden sm:flex flex-col items-center select-none pointer-events-none opacity-30">
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="flex items-center gap-3.5">
                      {/* Forest Green Crown Icon Tile */}
                      <div className="w-12 h-12 rounded-xl bg-[#086F52] text-white flex items-center justify-center shadow-xs shrink-0">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
                        </svg>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#057A55] block leading-none">
                          PREMIUM MEMBERSHIP
                        </span>
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                            StackSave Premium
                          </h3>
                          {/* Status Badge */}
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                              billing?.cancelAtPeriodEnd
                                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                : 'bg-emerald-100/80 border border-emerald-200/90 text-emerald-800'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                billing?.cancelAtPeriodEnd ? 'bg-amber-500' : 'bg-[#10B981]'
                              }`}
                            />
                            <span>{billing?.cancelAtPeriodEnd ? 'Cancels at Period End' : 'Active'}</span>
                          </div>
                        </div>
                        {/* Plan interval + clean cancel button placement */}
                        <div className="flex items-center gap-2.5 mt-0.5">
                          <span className="text-xs text-slate-500 font-medium">
                            {planIntervalStr}
                          </span>
                          {!billing?.cancelAtPeriodEnd ? (
                            <>
                              <span className="text-slate-300">·</span>
                              <button
                                type="button"
                                onClick={() => setIsCancelModalOpen(true)}
                                className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-medium underline underline-offset-2"
                              >
                                Cancel subscription
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-xs text-amber-700 font-medium">
                                Active until {currentPeriodEndFormatted || 'period end'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata Row: Renews & Member Since */}
                  <div className="mt-6 pt-5 border-t border-[#CCEBE0]/90 grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
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
                          {billing?.cancelAtPeriodEnd ? 'ACCESS ACTIVE UNTIL' : 'NEXT RENEWAL DATE'}
                        </span>
                        <span className="text-xs sm:text-[13.5px] font-bold text-slate-800 mt-0.5 block truncate">
                          {currentPeriodEndFormatted || 'Active Subscription'}
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
                          ACCOUNT CREATED / MEMBER SINCE
                        </span>
                        <span className="text-xs sm:text-[13.5px] font-bold text-slate-800 mt-0.5 block truncate">
                          {creationDateStr}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Unlocked Product Capabilities Grid */}
                <div className="mt-7 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      UNLOCKED PRODUCT CAPABILITIES
                    </span>
                    <span className="text-xs font-semibold text-[#057A55] flex items-center gap-1.5">
                      <span>All features unlocked</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Tile 1: Saved Audits */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <ellipse cx="12" cy="5" rx="9" ry="3" />
                          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                          <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                          Unlimited Saved Audits
                        </span>
                        <span className="text-xs text-slate-500 block mt-1 leading-relaxed">
                          Full historical timeline &amp; instant retrieval
                        </span>
                      </div>
                    </div>

                    {/* Tile 2: Share Links */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                          Unlimited Audit Sharing
                        </span>
                        <span className="text-xs text-slate-500 block mt-1 leading-relaxed">
                          Permanent public links &amp; team reports
                        </span>
                      </div>
                    </div>

                    {/* Tile 3: Live Intelligence */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                          Live AI Deals &amp; Price Alerts
                        </span>
                        <span className="text-xs text-slate-500 block mt-1 leading-relaxed">
                          Real-time email notifications on price drops
                        </span>
                      </div>
                    </div>

                    {/* Tile 4: Version Diff */}
                    <div className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300/80 transition-colors flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <div>
                        <span className="text-[13px] font-bold text-slate-900 block leading-tight">
                          Multi-Version Diff &amp; Insights
                        </span>
                        <span className="text-xs text-slate-500 block mt-1 leading-relaxed">
                          Cross-audit analytics &amp; spending shifts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ── FREE PLAN INTERFACE ── */
              <div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      StackSave Free
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Member since {creationDateStr}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                    <span>Free Tier</span>
                  </div>
                </div>

                {/* Real Database Usage Metrics */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3.5">
                    Free Plan Usage
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Metric 1: Saved Audits */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700">Saved audits</span>
                        <span className="font-bold text-slate-900">
                          {usage ? usage.savedAudits.current : 0} / 2
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, ((usage?.savedAudits.current || 0) / 2) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric 2: Saved AI Stacks */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700">Saved stacks</span>
                        <span className="font-bold text-slate-900">
                          {usage?.savedStacks ? usage.savedStacks.current : 0} / 3
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (((usage?.savedStacks?.current || 0) / 3) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Metric 3: Audit Share Links */}
                    <div className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700">Share links</span>
                        <span className="font-bold text-slate-900">
                          {usage ? usage.shareLinks.current : 0} / 5
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, ((usage?.shareLinks.current || 0) / 5) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upgrade to Premium Selector */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Upgrade to Premium
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Cancel anytime · Official Razorpay Checkout
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Quarterly Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('quarterly')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedPlan === 'quarterly'
                          ? 'border-slate-900 bg-slate-50/80 ring-2 ring-slate-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Quarterly</span>
                        <span className="text-[10.5px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                          {formatDiscountBadge('quarterly')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatOriginalPrice('quarterly')}
                        </span>
                        <span className="text-xl font-black text-slate-900">
                          {formatCurrentPrice('quarterly')}
                        </span>
                        <span className="text-xs text-slate-500">/ 3 mo</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatMonthlyBreakdown('quarterly')}
                      </p>
                    </button>

                    {/* Yearly Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('yearly')}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedPlan === 'yearly'
                          ? 'border-slate-900 bg-slate-50/80 ring-2 ring-slate-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Yearly</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {formatYearlySavingsBadge()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatOriginalPrice('yearly')}
                        </span>
                        <span className="text-xl font-black text-slate-900">
                          {formatCurrentPrice('yearly')}
                        </span>
                        <span className="text-xs text-slate-500">/ year</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatMonthlyBreakdown('yearly')}
                      </p>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleUpgradeCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 px-4 rounded-xl bg-slate-950 hover:bg-slate-900 active:bg-black text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {checkoutLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Connecting with Razorpay...</span>
                      </>
                    ) : (
                      <span>
                        Subscribe to Premium ({selectedPlan === 'quarterly' ? `Quarterly – ${formatCurrentPrice('quarterly')}` : `Yearly – ${formatCurrentPrice('yearly')}`})
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Notice / Error banners */}
            {cancelMessage && (
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span>{cancelMessage}</span>
                <button
                  type="button"
                  onClick={() => setCancelMessage(null)}
                  className="text-slate-400 hover:text-slate-600 ml-2 font-semibold cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {checkoutNotice && (
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{checkoutNotice}</span>
              </div>
            )}

            {checkoutError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <span>{checkoutError}</span>
                <button
                  type="button"
                  onClick={() => setCheckoutError(null)}
                  className="text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}
          </section>

          {/* ── 3. Security & Session Section ────────────────── */}
          <section className="p-6 sm:p-8">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-4">
              Security &amp; Session
            </span>
            <div className="divide-y divide-slate-100 text-xs">
              {/* Row 1: SSO */}
              <div className="flex items-center justify-between py-4 first:pt-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Single Sign-On</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">Connected with Google Identity Services</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 rounded-full shrink-0 ml-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Active</span>
                </div>
              </div>

              {/* Row 2: Session Protection */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Session Protection</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">HttpOnly cryptographic signed cookie</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2.5 py-0.5 rounded-full shrink-0 ml-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Secured</span>
                </div>
              </div>

              {/* Row 3: Sign Out Everywhere */}
              <div className="flex items-center justify-between py-4 last:pb-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">Sign Out Everywhere</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">Terminate your current StackSave session</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="h-8.5 px-3.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/70 text-slate-700 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer shrink-0 ml-4 focus:outline-none focus:ring-2 focus:ring-rose-200"
                >
                  Sign out
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ── Cancel Subscription Confirmation Dialog ───────────── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
            onClick={() => !cancelLoading && setIsCancelModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 z-10 text-left">
            <h3 className="text-base font-semibold text-slate-900">
              Cancel Subscription?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              If you cancel, you will continue to have full access to StackSave Premium until{' '}
              <span className="font-semibold text-slate-900">
                {currentPeriodEndFormatted || 'the end of your current billing period'}
              </span>
              . After that date, your subscription will not renew, and your account will transition to the Free plan.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={cancelLoading}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Keep subscription
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center gap-2"
              >
                {cancelLoading ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
