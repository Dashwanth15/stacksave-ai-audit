// ============================================================
// StackSave Analytics & Statistics Dashboard
// Production-grade GA4 Realtime, GA4 Historical, GSC, & DB Analytics
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import Logo from '../components/Logo';
import {
  fetchAnalyticsOverview,
  fetchRealtimeAnalytics,
  fetchAnalyticsHealth,
} from '../services/api';
import type {
  TimePeriod,
  AnalyticsOverviewPayload,
  AnalyticsHealthPayload,
  MetricCardValue,
} from '../types/analytics';

export default function AnalyticsDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<TimePeriod>('7days');
  const [overview, setOverview] = useState<AnalyticsOverviewPayload | null>(null);
  const [health, setHealth] = useState<AnalyticsHealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);

  // ── Data Fetching ───────────────────────────────────────────

  const loadData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError(null);

      try {
        const [overviewRes, healthRes] = await Promise.all([
          fetchAnalyticsOverview(period),
          fetchAnalyticsHealth(),
        ]);
        setOverview(overviewRes);
        setHealth(healthRes);
        setLastRefreshedAt(new Date());
        setSecondsAgo(0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period]
  );

  // Poll realtime data separately every 15 seconds if autoRefresh is enabled
  const pollRealtime = useCallback(async () => {
    try {
      const rtRes = await fetchRealtimeAnalytics();
      setOverview((prev) => (prev ? { ...prev, realtime: rtRes } : prev));
    } catch {
      // ignore silent background realtime poll failures
    }
  }, []);

  // Load data when period changes (safe for async state updates)
  useEffect(() => {
    let isMounted = true;

    const loadAsync = async () => {
      if (!isMounted) return;
      await loadData(false);
    };

    loadAsync();

    return () => {
      isMounted = false;
    };
  }, [period, loadData]);

  // Timer for relative "seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  // Auto-refresh interval (15s for realtime, 60s for full)
  useEffect(() => {
    if (!autoRefresh) return;
    const rtInterval = setInterval(() => {
      pollRealtime();
    }, 15000);

    const fullInterval = setInterval(() => {
      loadData(true);
    }, 60000);

    return () => {
      clearInterval(rtInterval);
      clearInterval(fullInterval);
    };
  }, [autoRefresh, pollRealtime, loadData]);

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      {/* ── Background Glow & Grid ──────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px]" />
      </div>

      {/* ── Top Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#07090E]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors py-1 px-2 rounded-lg hover:bg-slate-800/60"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <div className="h-4 w-px bg-slate-800" />
            <Logo asDiv />
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Analytics Center
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                autoRefresh
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
              title="Automatically refresh realtime metrics every 15 seconds"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="hidden md:inline">Auto-refresh</span>
              <span>{autoRefresh ? '15s' : 'Off'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-all flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={refreshing ? 'animate-spin text-indigo-400' : ''}
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>{refreshing ? 'Syncing…' : 'Refresh'}</span>
              <span className="text-[10px] text-slate-500 font-mono">({secondsAgo}s ago)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Container ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        {/* ── Header Title & Period Bar ─────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-800/60">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              StackSave Intelligence Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Real-time website traffic, conversion funnels, Search Console queries, and database ground truth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">Time Window:</span>
            {(['today', 'yesterday', '7days', '30days'] as TimePeriod[]).map((p) => {
              const labels: Record<TimePeriod, string> = {
                today: 'Today',
                yesterday: 'Yesterday',
                '7days': 'Last 7 Days',
                '30days': 'Last 30 Days',
              };
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Health Status Banner ──────────────────────────────── */}
        {health && (
          <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Data Source Health:
              </span>

              <HealthBadge label="GA4 Client" status={health.dependencies.ga4Tracking.status === 'CONFIGURED' ? 'OK' : 'MISSING'} />
              <HealthBadge label="GA4 Data API" status={health.dependencies.ga4DataApi.status} />
              <HealthBadge label="GA4 Realtime" status={health.dependencies.ga4Realtime.status} />
              <HealthBadge label="Search Console" status={health.dependencies.searchConsole.status} />
              <HealthBadge label="MongoDB" status={health.dependencies.mongodb.status} />
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <span className="text-[11px] text-slate-400 font-mono">Timezone: UTC</span>
              {(health.dependencies.ga4DataApi.status === 'UNCONFIGURED' ||
                health.dependencies.searchConsole.status === 'UNCONFIGURED') && (
                <button
                  onClick={() => setShowConfigGuide(!showConfigGuide)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-2 cursor-pointer"
                >
                  {showConfigGuide ? 'Hide Setup Info' : 'Setup Guide'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Setup / Unconfigured Guide Drawer ─────────────────── */}
        <AnimatePresence>
          {showConfigGuide && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-xs text-slate-300 space-y-3"
            >
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold text-sm">💡</span>
                <div>
                  <h3 className="font-bold text-amber-300 text-sm">How to Connect Production Google Analytics 4 & Search Console</h3>
                  <p className="text-slate-400 mt-1">
                    Client-side tracking is currently recording events with measurement ID <code className="text-slate-200">G-412VVCKC22</code>. To enable server-side dashboard queries:
                  </p>
                </div>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-6">
                <li>
                  In <strong>Google Cloud Console</strong>, enable <em>Google Analytics Data API</em> and <em>Google Search Console API</em>.
                </li>
                <li>
                  Create a Service Account, generate a JSON Key, and add its client email (e.g. <code className="text-slate-200">stacksave@...iam.gserviceaccount.com</code>) as a <strong>Viewer</strong> in GA4 (Property Access Management) and Search Console.
                </li>
                <li>
                  In <strong>Render Dashboard → stacksave-backend → Environment</strong>, add:
                  <ul className="list-disc list-inside ml-4 mt-1 font-mono text-[11px] text-amber-200 space-y-0.5">
                    <li>GA4_PROPERTY_ID=123456789</li>
                    <li>GOOGLE_SERVICE_ACCOUNT_KEY={"{\"type\":\"service_account\"...}"}</li>
                    <li>GSC_SITE_URL=sc-domain:stacksaveai.com</li>
                  </ul>
                </li>
              </ol>
            </m.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ── SECTION 1: REALTIME ACTIVITY (GA4 Realtime) ───────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Realtime Activity</h2>
              <SourceTag source="GA4_REALTIME" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Pulls last 30 minutes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              title="Active Users — Last 30 Minutes"
              card={overview?.realtime.activeUsersLast30Min}
              accent="emerald"
              icon="👥"
              loading={loading}
              footnote="GA4 Realtime active users within the last 30 minutes."
            />
            <MetricCard
              title="Realtime Page Views (30m)"
              card={overview?.realtime.realtimePageViews}
              accent="blue"
              icon="📄"
              loading={loading}
              footnote="Total screen views recorded across all pages in last 30m."
            />
            <MetricCard
              title="Realtime Events (30m)"
              card={overview?.realtime.realtimeEventCount}
              accent="indigo"
              icon="⚡"
              loading={loading}
              footnote="Total interaction events (clicks, starts, views) in last 30m."
            />
          </div>

          {/* Realtime Event Stream & Active Pages */}
          {overview?.realtime && overview.realtime.state === 'OK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Recent Event Stream (30m)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Live</span>
                </h3>
                {overview.realtime.recentEvents.length > 0 ? (
                  <div className="space-y-2">
                    {overview.realtime.recentEvents.map((ev, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                        <span className="font-mono text-slate-300 font-medium">{ev.eventName}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold text-[11px]">
                          {ev.eventCount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No events in last 30 minutes</p>
                )}
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                  <span>Active Pages (30m)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Live</span>
                </h3>
                {overview.realtime.topActivePages.length > 0 ? (
                  <div className="space-y-2">
                    {overview.realtime.topActivePages.map((pg, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                        <span className="font-mono text-slate-300 truncate max-w-[240px]">{pg.pagePath}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 font-mono font-bold text-[11px]">
                          {pg.activeUsers} {pg.activeUsers === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No active page sessions in last 30 minutes</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 2: WEBSITE TRAFFIC (GA4 Historical Data API) ── */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Website Traffic & Engagement</h2>
              <SourceTag source="GA4_HISTORICAL" />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Window: {period}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <MetricCard title="Active Users" card={overview?.historical.activeUsers} accent="indigo" icon="👤" loading={loading} footnote="Active visitors across all traffic sources (GA4)." />
            <MetricCard title="Total Users" card={overview?.historical.totalUsers} accent="slate" icon="👥" loading={loading} footnote="All unique visitors across all sources (GA4 totalUsers)." />
            <MetricCard title="Sessions" card={overview?.historical.sessions} accent="blue" icon="🔄" loading={loading} />
            <MetricCard title="Page Views" card={overview?.historical.screenPageViews} accent="emerald" icon="📊" loading={loading} />
            <MetricCard title="Engagement Rate" card={overview?.historical.engagementRate} accent="violet" icon="🎯" loading={loading} />
            <MetricCard title="Avg Session Duration" card={overview?.historical.averageSessionDurationSeconds} accent="amber" icon="⏱️" loading={loading} />
          </div>

          {/* Traffic Sources & Top Pages */}
          {overview?.historical && overview.historical.state === 'OK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">GA4 Traffic Source Breakdown</h3>
                  <span className="text-[10px] text-amber-400 font-medium leading-relaxed max-w-md">
                    Google Search Console Search Clicks ≠ GA4 Website Users
                  </span>
                </div>

                <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90">
                  GA4 attributes each session using its source/medium dimensions, such as <span className="font-semibold">google / organic</span>,{' '}
                  <span className="font-semibold">linkedin / social</span>, <span className="font-semibold">x / social</span>,{' '}
                  <span className="font-semibold">reddit / social</span>, <span className="font-semibold">whatsapp / referral</span>,{' '}
                  <span className="font-semibold">email / email</span>, or <span className="font-semibold">direct / (none)</span>. This is distinct from Google Search Console clicks, which are organic search queries and impressions from Google Search only.
                </div>

                {overview.historical.trafficSources.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono">
                          <th className="pb-2 pr-3">Source</th>
                          <th className="pb-2 pr-3">Medium</th>
                          <th className="pb-2 pr-3 text-right">Sessions</th>
                          <th className="pb-2 text-right">Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {overview.historical.trafficSources.map((src, i) => (
                          <tr key={i} className="hover:bg-slate-800/20">
                            <td className="py-2 pr-3 font-medium text-slate-200">{src.sessionSource || 'direct'}</td>
                            <td className="py-2 pr-3 font-mono text-slate-400">{src.sessionMedium || '(none)'}</td>
                            <td className="py-2 pr-3 text-right font-mono text-slate-300">{src.sessions.toLocaleString()}</td>
                            <td className="py-2 text-right font-mono font-bold text-indigo-300">{src.activeUsers.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No traffic sources recorded in this period</p>
                )}
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Top Viewed Pages</h3>
                {overview.historical.topPages.length > 0 ? (
                  <div className="space-y-2">
                    {overview.historical.topPages.map((pg, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/50 last:border-0">
                        <span className="font-mono text-slate-300 truncate max-w-[240px]">{pg.pagePath}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 text-[11px] font-mono">{pg.pageViews} views</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold text-[11px]">
                            {pg.activeUsers} users
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 py-4 text-center">No page views recorded in this period</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── SECTION 3: GA4 AUDIT FUNNEL (GA4 Events Only) ──────── */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">GA4 Client-Side Conversion Funnel</h2>
              <SourceTag source="GA4_HISTORICAL" />
            </div>
            <span className="text-[11px] text-slate-400">Strictly computed from client-side GA4 custom events</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Audits Started (GA4)"
              card={overview?.historical.ga4Funnel.auditStartedEvents}
              accent="blue"
              icon="🚀"
              loading={loading}
              footnote="Users entering /audit and starting configuration."
            />
            <MetricCard
              title="Audits Completed (GA4)"
              card={overview?.historical.ga4Funnel.auditCompletedEvents}
              accent="emerald"
              icon="✅"
              loading={loading}
              footnote="Users receiving successful audit recommendation results."
            />
            <MetricCard
              title="GA4 Completion Rate"
              card={overview?.historical.ga4Funnel.ga4CompletionRate}
              accent="violet"
              icon="📈"
              loading={loading}
              footnote="Audit completions divided strictly by audit starts (GA4)."
            />
            <MetricCard
              title="Stack Builder Completed (GA4)"
              card={overview?.historical.ga4Funnel.buildStackCompletedEvents}
              accent="amber"
              icon="🏗️"
              loading={loading}
              footnote="Users who generated custom stacks via Stack Builder."
            />
          </div>
        </section>

        {/* ── SECTION 4: DATABASE GROUND TRUTH (MongoDB Atlas) ────── */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Database Ground Truth (MongoDB)</h2>
              <SourceTag source="STACKSAVE_MONGODB" />
            </div>
            <span className="text-[11px] text-slate-400">Direct query on MongoDB Atlas collections</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Total Audits in Database"
              card={overview?.database.totalAuditsInDb}
              accent="indigo"
              icon="🗄️"
              loading={loading}
              footnote="All persistent audit records stored across history."
            />
            <MetricCard
              title={`Audits in Period (${period})`}
              card={overview?.database.auditsInPeriod}
              accent="blue"
              icon="📝"
              loading={loading}
              footnote="Audits executed and persisted during selected time window."
            />
            <MetricCard
              title="Total Leads Captured"
              card={overview?.database.totalLeadsInDb}
              accent="emerald"
              icon="✉️"
              loading={loading}
              footnote="Email captures for audit PDF reports and re-audit updates."
            />
            <MetricCard
              title="Total Monthly Savings Found"
              card={overview?.database.totalEstimatedSavingsTracked}
              accent="amber"
              icon="💰"
              loading={loading}
              footnote="Aggregated monthly waste reduction identified for users."
            />
          </div>
        </section>

        {/* ── SECTION 5: GOOGLE SEARCH CONSOLE (Organic Search Only) */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Google Search Console Performance</h2>
              <SourceTag source="GOOGLE_SEARCH_CONSOLE" />
            </div>
            <span className="text-[11px] text-amber-400 font-medium">
              ℹ️ Organic Google search impressions & queries only (Not direct visitors)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Organic Search Clicks"
              card={overview?.searchConsole.searchClicks}
              accent="emerald"
              icon="🖱️"
              loading={loading}
              footnote="Clicks from Google organic search results (GSC data only)."
            />
            <MetricCard
              title="Organic Search Impressions"
              card={overview?.searchConsole.searchImpressions}
              accent="blue"
              icon="👀"
              loading={loading}
              footnote="Times StackSave was shown on Google search result pages."
            />
            <MetricCard
              title="Average Search CTR"
              card={overview?.searchConsole.averageCtr}
              accent="indigo"
              icon="🎯"
              loading={loading}
              footnote="Click-through rate from search result impressions."
            />
            <MetricCard
              title="Average Position on Google"
              card={overview?.searchConsole.averagePosition}
              accent="violet"
              icon="🏆"
              loading={loading}
              footnote="Average ranking position on Google search queries."
            />
          </div>

          {/* Top Search Queries */}
          {overview?.searchConsole && overview.searchConsole.state === 'OK' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Top Organic Search Queries (Google)</h3>
              {overview.searchConsole.topQueries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono">
                        <th className="pb-2">Search Query</th>
                        <th className="pb-2 text-right">Clicks</th>
                        <th className="pb-2 text-right">Impressions</th>
                        <th className="pb-2 text-right">CTR</th>
                        <th className="pb-2 text-right">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {overview.searchConsole.topQueries.map((q, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="py-2 font-mono text-slate-200">{q.query}</td>
                          <td className="py-2 text-right font-mono font-bold text-emerald-400">{q.clicks}</td>
                          <td className="py-2 text-right font-mono text-slate-300">{q.impressions}</td>
                          <td className="py-2 text-right font-mono text-slate-400">{q.ctr}%</td>
                          <td className="py-2 text-right font-mono text-indigo-400">{q.position}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 py-4 text-center">No search query impressions recorded in this window</p>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Metric Card Component ─────────────────────────────────────

interface MetricCardProps {
  title: string;
  card?: MetricCardValue<number | string>;
  accent: 'emerald' | 'blue' | 'indigo' | 'violet' | 'amber' | 'slate';
  icon: string;
  loading: boolean;
  footnote?: string;
}

function MetricCard({ title, card, accent, icon, loading, footnote }: MetricCardProps) {
  const accentBorder: Record<string, string> = {
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    blue: 'border-blue-500/20 hover:border-blue-500/40',
    indigo: 'border-indigo-500/20 hover:border-indigo-500/40',
    violet: 'border-purple-500/20 hover:border-purple-500/40',
    amber: 'border-amber-500/20 hover:border-amber-500/40',
    slate: 'border-slate-800 hover:border-slate-700',
  };

  const isUnconfigured = card?.state === 'UNCONFIGURED';
  const isError = card?.state === 'ERROR';
  const isNoData = card?.state === 'NO_DATA';

  return (
    <div
      className={`p-4 rounded-xl bg-slate-900/80 border ${accentBorder[accent]} transition-all flex flex-col justify-between relative overflow-hidden group`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-slate-400 tracking-wide uppercase truncate">{title}</span>
          <span className="text-sm">{icon}</span>
        </div>

        {loading ? (
          <div className="h-8 w-24 bg-slate-800 animate-pulse rounded my-1" />
        ) : (
          <div className="my-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {card ? card.formattedValue : '—'}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        {isUnconfigured ? (
          <span className="text-amber-400 font-semibold">Unconfigured</span>
        ) : isError ? (
          <span className="text-red-400 font-semibold">Unavailable</span>
        ) : isNoData ? (
          <span className="text-slate-400 font-semibold">0 in window</span>
        ) : card?.state === 'CACHED' ? (
          <span className="text-slate-400 font-medium">Cached (TTL)</span>
        ) : (
          <span className="text-emerald-400 font-medium">Live</span>
        )}

        {card && <span className="truncate max-w-[120px]">{card.freshness}</span>}
      </div>

      {footnote && <p className="text-[9px] text-slate-500 mt-1 leading-tight">{footnote}</p>}
    </div>
  );
}

// ── Source Tag Component ──────────────────────────────────────

function SourceTag({ source }: { source: MetricCardValue['dataSource'] }) {
  const config: Record<MetricCardValue['dataSource'], { label: string; color: string }> = {
    GA4_REALTIME: { label: 'GA4 Realtime API', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    GA4_HISTORICAL: { label: 'GA4 Data API', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    GOOGLE_SEARCH_CONSOLE: { label: 'Search Console API', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    STACKSAVE_MONGODB: { label: 'MongoDB Ground Truth', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };

  const { label, color } = config[source];
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${color}`}>
      {label}
    </span>
  );
}

// ── Health Badge Component ────────────────────────────────────

function HealthBadge({ label, status }: { label: string; status: string }) {
  const isOk = status === 'CONNECTED' || status === 'OK' || status === 'CONFIGURED';
  const isUnconfigured = status === 'UNCONFIGURED' || status === 'MISSING';

  return (
    <div
      className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold flex items-center gap-1.5 ${
        isOk
          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
          : isUnconfigured
          ? 'bg-amber-950/40 border-amber-500/30 text-amber-400'
          : 'bg-red-950/40 border-red-500/30 text-red-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-emerald-400' : isUnconfigured ? 'bg-amber-400' : 'bg-red-400'}`} />
      <span>{label}</span>
      <span className="text-[10px] opacity-80">({status})</span>
    </div>
  );
}
