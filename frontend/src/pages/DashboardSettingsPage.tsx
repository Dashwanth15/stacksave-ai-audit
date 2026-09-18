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
  const { user, authenticated, loading: authLoading, logout, refreshUser } = useAuth();
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
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  const isPremium = user.plan === 'PREMIUM' || billing?.isPremium;

  const currentPeriodEndFormatted = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const handleUpgradeCheckout = async () => {
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
        userName: user.name,
        userEmail: user.email,
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
      <div className="max-w-3xl">
        {/* ── Unified Settings Surface ───────────────────────── */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* ── 1. User Profile Section ──────────────────────── */}
          <section className="p-6 sm:p-7">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-4">
              User Profile
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-14 h-14 rounded-full object-cover border border-slate-200/90 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg font-semibold shrink-0">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <h2 className="text-base font-semibold text-slate-900 leading-snug">
                    {user.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                    {user.email}
                  </p>
                  {/* Quiet Identity Status — No loud green pill */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.33 24 12 24Z" />
                      <path fill="#FBBC05" d="M5.28 14.27a7.18 7.18 0 0 1 0-4.54V6.58H1.26a11.98 11.98 0 0 0 0 10.84l4.02-3.15Z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                    </svg>
                    <span>Google account</span>
                    <span className="text-slate-300">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clean 2-column detail grid — typography and spacing, no inner cards */}
            <dl className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              <div>
                <dt className="text-slate-400 font-normal">Display name</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-normal">Email address</dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">{user.email}</dd>
              </div>
            </dl>
          </section>

          {/* ── 2. Plan & Membership Section ─────────────────── */}
          <section className="p-6 sm:p-7">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-4">
              Plan & Membership
            </span>

            {/* Plan Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {isPremium ? 'StackSave Premium' : 'StackSave Free'}
                  </h3>
                  <span className="text-xs text-slate-400 font-normal">Current plan</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Member since {creationDateStr} · Status:{' '}
                  <span className="font-medium text-slate-700">
                    {isPremium
                      ? billing?.cancelAtPeriodEnd
                        ? 'Cancelling at period end'
                        : 'Active'
                      : 'Free'}
                  </span>
                </p>
                {isPremium && currentPeriodEndFormatted && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {billing?.cancelAtPeriodEnd
                      ? `Access active until ${currentPeriodEndFormatted}`
                      : `Next renewal: ${currentPeriodEndFormatted}`}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {isPremium ? (billing?.billingInterval === 'yearly' ? 'Yearly Plan' : 'Quarterly Plan') : 'Free Plan'}
                </span>
                {isPremium && !billing?.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer font-medium"
                  >
                    Cancel subscription
                  </button>
                )}
              </div>
            </div>

            {/* Notice / Error banners */}
            {cancelMessage && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                <span>{cancelMessage}</span>
                <button
                  type="button"
                  onClick={() => setCancelMessage(null)}
                  className="text-slate-400 hover:text-slate-600 ml-2 font-medium"
                >
                  Dismiss
                </button>
              </div>
            )}

            {checkoutNotice && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600 shrink-0">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{checkoutNotice}</span>
              </div>
            )}

            {checkoutError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                <span>{checkoutError}</span>
                <button
                  type="button"
                  onClick={() => setCheckoutError(null)}
                  className="text-rose-600 hover:text-rose-800 font-semibold ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* If Free Plan: Show Real Usage + Upgrade Selector */}
            {!isPremium && (
              <>
                {/* Real Database Usage Metrics */}
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">
                    Free Plan Usage
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Metric 1: Saved Audits */}
                    <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-700">Saved audits</span>
                        <span className="font-semibold text-slate-900">
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
                    <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-700">Saved stacks</span>
                        <span className="font-semibold text-slate-900">
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
                    <div className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-700">Share links</span>
                        <span className="font-semibold text-slate-900">
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
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-900">
                      Upgrade to Premium
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Cancel anytime · Official Razorpay Checkout
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {/* Quarterly Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('quarterly')}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPlan === 'quarterly'
                          ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">Quarterly</span>
                        <span className="text-[10.5px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded">
                          {formatDiscountBadge('quarterly')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatOriginalPrice('quarterly')}
                        </span>
                        <span className="text-xl font-bold text-slate-900">
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
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPlan === 'yearly'
                          ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900">Yearly</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {formatYearlySavingsBadge()}
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-1.5">
                        <span className="text-xs text-slate-400 line-through">
                          {formatOriginalPrice('yearly')}
                        </span>
                        <span className="text-xl font-bold text-slate-900">
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
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
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
              </>
            )}

            {/* Premium Features List */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">
                Included in StackSave Premium
              </h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Unlimited saved audit history</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Unlimited audit sharing</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Advanced multi-version diff & timeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Automated price-drop alerts & notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Historical provider intelligence reports</span>
                </li>
              </ul>
            </div>
          </section>

          {/* ── 3. Security & Session Section ────────────────── */}
          <section className="p-6 sm:p-7">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-4">
              Security & Session
            </span>
            <div className="divide-y divide-slate-100 text-xs">
              {/* Row 1: SSO */}
              <div className="flex items-center justify-between py-3.5 first:pt-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-slate-900 block leading-tight">Single Sign-On</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">Connected with Google Identity Services</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 shrink-0 ml-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Active</span>
                </div>
              </div>

              {/* Row 2: Session Protection */}
              <div className="flex items-center justify-between py-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-slate-900 block leading-tight">Session Protection</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">HttpOnly cryptographic signed cookie</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 shrink-0 ml-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Secured</span>
                </div>
              </div>

              {/* Row 3: Sign Out Everywhere */}
              <div className="flex items-center justify-between py-3.5 last:pb-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-slate-900 block leading-tight">Sign Out Everywhere</span>
                    <span className="text-slate-500 block mt-0.5 leading-tight">Terminate your current StackSave session</span>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="h-8 px-3 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50/70 text-rose-600 text-xs font-medium transition-colors cursor-pointer shrink-0 ml-4 focus:outline-none focus:ring-2 focus:ring-rose-200"
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
