// ============================================================
// DashboardPage — StackSave AI Overview Dashboard
// 100% Real Data: Derived directly from authenticated user's MongoDB records
// ============================================================

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { fetchUserAudits, fetchPublicOffers } from '../services/api';
import type { SavedAuditSummary, PublicOffer } from '../types';
import ProviderLogo from '../components/ProviderLogo';

export default function DashboardPage() {
  const { user, authenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [audits, setAudits] = useState<SavedAuditSummary[]>([]);
  const [offers, setOffers] = useState<PublicOffer[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !authenticated) {
      navigate('/');
    }
  }, [authLoading, authenticated, navigate]);

  useEffect(() => {
    let isMounted = true;
    if (!authenticated) return;

    setDataLoading(true);
    Promise.allSettled([fetchUserAudits(), fetchPublicOffers()])
      .then(([auditsResult, offersResult]) => {
        if (!isMounted) return;
        if (auditsResult.status === 'fulfilled') {
          setAudits(auditsResult.value);
        } else {
          setFetchError('Unable to load saved audits.');
        }
        if (offersResult.status === 'fulfilled' && offersResult.value?.offers) {
          setOffers(offersResult.value.offers.slice(0, 3));
        }
        setDataLoading(false);
      })
      .catch(() => {
        if (isMounted) setDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authenticated]);

  const metrics = useMemo(() => {
    if (!audits.length) return null;
    const allTools = audits.flatMap((a) => (Array.isArray(a.tools) ? a.tools : []));
    const uniqueToolIds = new Set(allTools.map((t: any) => t.toolId || t.name).filter(Boolean));
    const totalSavings = audits.reduce((sum, a) => sum + (a.estimatedMonthlySavings || 0), 0);
    return {
      totalSaved: audits.length,
      uniquePlatformsCount: uniqueToolIds.size || audits[0]?.platformCount || 0,
      totalSavingsMonthly: Math.round(totalSavings),
      latestAuditDate: audits[0]?.createdAt
        ? new Date(audits[0].createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : null,
    };
  }, [audits]);

  const userName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <DashboardLayout
      activeTab="overview"
      pageTitle={`Welcome back, ${userName}`}
      pageSubtitle="Your AI spend intelligence overview"
      action={
        <button
          id="run-new-audit-btn"
          onClick={() => navigate('/audit')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all duration-150"
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #264d7a 100%)',
            boxShadow: '0 2px 8px rgba(30,58,95,0.35)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 4px 14px rgba(30,58,95,0.45)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 2px 8px rgba(30,58,95,0.35)';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Run New Audit
        </button>
      }
    >
      {/* ── Loading ─────────────────────────────────────────────── */}
      {dataLoading ? (
        <div className="space-y-3">
          <div className="h-28 rounded-xl bg-white animate-pulse border border-slate-200" />
          <div className="h-52 rounded-xl bg-white animate-pulse border border-slate-200" />
        </div>
      ) : fetchError ? (
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50 text-[13px] text-red-700">
          <span>{fetchError}</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-4 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-semibold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      ) : metrics ? (
        <div className="space-y-4">

          {/* ── 3-column metric strip — tinted accent per metric ── */}
          <div
            className="grid grid-cols-3 rounded-xl border border-slate-200 bg-white overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.06)' }}
          >
            {/* Saved Audits — blue tint */}
            <div
              className="relative px-5 py-5 border-r border-slate-100 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #FFFFFF 60%)' }}
            >
              {/* Subtle icon */}
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">
                  Saved Audits
                </p>
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              </div>
              <p className="text-[32px] font-bold text-slate-900 leading-none tabular-nums tracking-tight">
                {metrics.totalSaved}
              </p>
              {metrics.latestAuditDate && (
                <p className="mt-2 text-[11px] text-slate-400">Latest: {metrics.latestAuditDate}</p>
              )}
            </div>

            {/* AI Platforms — indigo tint */}
            <div
              className="relative px-5 py-5 border-r border-slate-100 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #EEF2FF 0%, #FFFFFF 60%)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">
                  AI Platforms
                </p>
                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
              </div>
              <p className="text-[32px] font-bold text-slate-900 leading-none tabular-nums tracking-tight">
                {metrics.uniquePlatformsCount}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">Across your audit history</p>
            </div>

            {/* Potential Savings — emerald tint */}
            <div
              className="relative px-5 py-5 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, #ECFDF5 0%, #FFFFFF 60%)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Potential Savings
                </p>
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
              <p className="text-[32px] font-bold text-emerald-800 leading-none tabular-nums tracking-tight">
                ${metrics.totalSavingsMonthly}
                <span className="text-[14px] font-medium text-emerald-600 ml-0.5">/mo</span>
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                ~${metrics.totalSavingsMonthly * 12}/yr potential
              </p>
            </div>
          </div>

          {/* ── Recent Audits ────────────────────────────────────── */}
          <div
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-indigo-400" />
                <h2 className="text-[13px] font-bold text-slate-800">Recent Audits</h2>
              </div>
              <button
                onClick={() => navigate('/dashboard/audits')}
                className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors duration-150 cursor-pointer"
              >
                View all ({audits.length}) →
              </button>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-20">Platforms</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-14">Team</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-20">Savings</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right w-24">Actions</span>
            </div>

            <div className="divide-y divide-slate-100">
              {audits.slice(0, 4).map((item) => {
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <div
                    key={item.auditId}
                    className="group grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors duration-150"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-800 truncate">
                          {item.companyName || 'Audit'}
                        </span>
                        {item.isAlreadyOptimal && (
                          <span className="text-[10px] text-slate-400 font-medium italic shrink-0">
                            optimal
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{dateStr}</span>
                    </div>
                    <span className="text-[12px] text-slate-600 text-right w-20 tabular-nums">{item.platformCount}</span>
                    <span className="text-[12px] text-slate-600 text-right w-14 tabular-nums">{item.teamSize}</span>
                    <span className="text-[13px] font-bold text-emerald-700 text-right w-20 tabular-nums">
                      ${Math.round(item.estimatedMonthlySavings)}/mo
                    </span>
                    <div className="flex items-center gap-1.5 justify-end w-24">
                      <button
                        onClick={() => navigate(`/audit/${item.auditId}`)}
                        className="h-7 px-3 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 transition-colors duration-150 cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/audit/${item.auditId}/diff`)}
                        className="h-7 px-3 rounded-md border border-indigo-200 bg-indigo-50 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors duration-150 cursor-pointer"
                      >
                        Diff
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Empty state ─────────────────────────────────────── */
        <div className="space-y-3">
          <div
            className="rounded-xl border border-slate-200 bg-white px-6 py-6 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-bold text-slate-900">No saved audits</h2>
              <p className="mt-0.5 text-[12px] text-slate-500 max-w-sm leading-relaxed">
                Run an AI spend audit and save it to start tracking cost changes, comparing stacks, and monitoring savings over time.
              </p>
            </div>
            <button
              onClick={() => navigate('/audit')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-semibold text-white cursor-pointer transition-all duration-150 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #264d7a 100%)',
                boxShadow: '0 2px 8px rgba(30,58,95,0.3)',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Run First Audit
            </button>
          </div>

          {/* How it works */}
          <div
            className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
          >
            {[
              {
                num: '1',
                title: 'Input your AI tools',
                desc: 'Add active tools — Cursor, Copilot, ChatGPT, Claude — with seat counts.',
              },
              {
                num: '2',
                title: 'Run spend analysis',
                desc: 'Our engine detects overlapping seats, rate hikes, and cheaper compatible tiers.',
              },
              {
                num: '3',
                title: 'Save to your account',
                desc: 'Click "Save Audit" on results to track metrics and changes from this dashboard.',
              },
            ].map(({ num, title, desc }) => (
              <div key={num} className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors duration-150">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-indigo-500">{num}</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-slate-700">{title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Verified AI Offers ─────────────────────────────────── */}
      {offers.length > 0 && (
        <section className="mt-5 pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-emerald-400" />
              <div>
                <h2 className="text-[13px] font-bold text-slate-800">Verified AI Offers</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Daily Playwright-verified pricing &amp; promotions</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/offers')}
              className="text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors duration-150 cursor-pointer"
            >
              Browse all →
            </button>
          </div>

          <div
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
            style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
          >
            {offers.map((offer, idx) => (
              <div
                key={offer.fingerprint || offer.id}
                onClick={() => navigate('/offers')}
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-indigo-50/40 transition-colors duration-150 ${
                  idx < offers.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                {/* Provider logo — contained square */}
                <div
                  className="w-9 h-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }}
                >
                  <ProviderLogo
                    providerId={offer.aiProvider || offer.providerId}
                    providerName={offer.providerName}
                    size="sm"
                  />
                </div>

                {/* Name + title */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-slate-800">{offer.providerName}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-relaxed">{offer.title}</p>
                </div>

                {/* Benefit + action */}
                <div className="shrink-0 text-right">
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">
                    {offer.discount || offer.benefit || 'Special offer'}
                  </p>
                  <p className="text-[11px] font-semibold text-indigo-500 mt-0.5">View →</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
