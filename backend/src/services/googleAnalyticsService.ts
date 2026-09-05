// ============================================================
// Google Analytics 4 (GA4) & Search Console Service
// StackSave AI Audit — Realtime, Historical, Search & DB Analytics
// ============================================================

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { google } from 'googleapis';
import mongoose from 'mongoose';
import { AuditModel, LeadModel } from './dbService';

// ── Types & Interfaces ────────────────────────────────────────

export type MetricState = 'OK' | 'NO_DATA' | 'UNCONFIGURED' | 'ERROR' | 'CACHED' | 'STALE';
export type TimePeriod = 'today' | 'yesterday' | '7days' | '30days';

export interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  isStale: boolean;
}

export interface MetricCardValue<T = number | string> {
  value: T;
  formattedValue: string;
  state: MetricState;
  stateMessage?: string;
  dataSource: 'GA4_REALTIME' | 'GA4_HISTORICAL' | 'GOOGLE_SEARCH_CONSOLE' | 'STACKSAVE_MONGODB';
  metricName: string;
  apiEndpoint?: string;
  dateRange?: string;
  timezone: string;
  freshness: string;
  isRealtime: boolean;
  lastUpdatedAt: string;
}

export interface RealtimeAnalyticsPayload {
  state: MetricState;
  stateMessage?: string;
  dataSource: 'GA4_REALTIME';
  timezone: string;
  lastUpdatedAt: string;
  activeUsersLast30Min: MetricCardValue<number>;
  realtimePageViews: MetricCardValue<number>;
  realtimeEventCount: MetricCardValue<number>;
  recentEvents: Array<{
    eventName: string;
    eventCount: number;
    category?: string;
  }>;
  topActivePages: Array<{
    pagePath: string;
    activeUsers: number;
  }>;
  deviceBreakdown: Array<{
    deviceCategory: string;
    activeUsers: number;
  }>;
  countryBreakdown: Array<{
    country: string;
    activeUsers: number;
  }>;
}

export interface HistoricalAnalyticsPayload {
  state: MetricState;
  stateMessage?: string;
  dataSource: 'GA4_HISTORICAL';
  period: TimePeriod;
  dateRange: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  lastUpdatedAt: string;
  activeUsers: MetricCardValue<number>;
  totalUsers: MetricCardValue<number>;
  sessions: MetricCardValue<number>;
  screenPageViews: MetricCardValue<number>;
  engagementRate: MetricCardValue<number>; // percentage e.g. 64.5%
  averageSessionDurationSeconds: MetricCardValue<number>;
  // GA4 Event-Based Funnel (Strictly isolated to GA4 events)
  ga4Funnel: {
    auditStartedEvents: MetricCardValue<number>;
    auditCompletedEvents: MetricCardValue<number>;
    ga4CompletionRate: MetricCardValue<number>; // percentage e.g. 72.4%
    buildStackCompletedEvents: MetricCardValue<number>;
    leadCaptureCompletedEvents: MetricCardValue<number>;
  };
  topPages: Array<{
    pagePath: string;
    pageViews: number;
    activeUsers: number;
  }>;
  trafficSources: Array<{
    sessionSource: string;
    sessionMedium: string;
    sessions: number;
    activeUsers: number;
  }>;
  dailyTrend: Array<{
    date: string;
    activeUsers: number;
    screenPageViews: number;
    sessions: number;
  }>;
}

export interface SearchConsoleAnalyticsPayload {
  state: MetricState;
  stateMessage?: string;
  dataSource: 'GOOGLE_SEARCH_CONSOLE';
  siteUrl: string;
  period: TimePeriod;
  dateRange: {
    startDate: string;
    endDate: string;
    timezone: string;
  };
  lastUpdatedAt: string;
  searchClicks: MetricCardValue<number>;
  searchImpressions: MetricCardValue<number>;
  averageCtr: MetricCardValue<number>; // percentage e.g. 3.8%
  averagePosition: MetricCardValue<number>; // e.g. 14.2
  topQueries: Array<{
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
  topPages: Array<{
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>;
}

export interface DatabaseAnalyticsPayload {
  state: MetricState;
  dataSource: 'STACKSAVE_MONGODB';
  lastUpdatedAt: string;
  totalAuditsInDb: MetricCardValue<number>;
  auditsInPeriod: MetricCardValue<number>;
  successfulAuditsInPeriod: MetricCardValue<number>;
  failedAuditsInPeriod: MetricCardValue<number>;
  dbAuditSuccessRate: MetricCardValue<number>;
  totalLeadsInDb: MetricCardValue<number>;
  leadsInPeriod: MetricCardValue<number>;
  totalEstimatedSavingsTracked: MetricCardValue<number>;
  averageEstimatedSavingsPerAudit: MetricCardValue<number>;
}

export interface AnalyticsOverviewPayload {
  period: TimePeriod;
  timezone: string;
  generatedAt: string;
  realtime: RealtimeAnalyticsPayload;
  historical: HistoricalAnalyticsPayload;
  searchConsole: SearchConsoleAnalyticsPayload;
  database: DatabaseAnalyticsPayload;
}

export interface AnalyticsHealthPayload {
  status: 'HEALTHY' | 'PARTIAL' | 'DEGRADED' | 'UNCONFIGURED';
  checkedAt: string;
  dependencies: {
    ga4Tracking: {
      status: 'CONFIGURED' | 'MISSING';
      measurementId: string | null;
      details: string;
    };
    ga4DataApi: {
      status: 'CONNECTED' | 'UNCONFIGURED' | 'ERROR' | 'PERMISSION_DENIED';
      propertyId: string | null;
      details: string;
      lastCheckedAt: string;
    };
    ga4Realtime: {
      status: 'CONNECTED' | 'UNCONFIGURED' | 'ERROR' | 'PERMISSION_DENIED';
      propertyId: string | null;
      details: string;
      lastCheckedAt: string;
    };
    searchConsole: {
      status: 'CONNECTED' | 'UNCONFIGURED' | 'ERROR' | 'PERMISSION_DENIED';
      siteUrl: string | null;
      details: string;
      lastCheckedAt: string;
    };
    mongodb: {
      status: 'CONNECTED' | 'ERROR';
      details: string;
      auditCount: number;
      lastCheckedAt: string;
    };
  };
}

// ── In-Memory Cache Store ─────────────────────────────────────

const cacheStore = new Map<string, CacheEntry<unknown>>();

function getFromCache<T>(key: string): { data: T; isCached: boolean; isStale: boolean } | null {
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const now = new Date();
  const isStale = now > entry.expiresAt;
  return {
    data: entry.data,
    isCached: true,
    isStale,
  };
}

function setInCache<T>(key: string, data: T, ttlMs: number): void {
  const now = new Date();
  cacheStore.set(key, {
    data,
    cachedAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
    isStale: false,
  });
}

// ── TTL Constants ─────────────────────────────────────────────
const TTL_REALTIME_MS = 15 * 1000; // 15 seconds
const TTL_HISTORICAL_MS = 5 * 60 * 1000; // 5 minutes
const TTL_GSC_MS = 60 * 60 * 1000; // 1 hour
const TTL_DB_MS = 30 * 1000; // 30 seconds

// ── Google Credentials & Client Initializer ───────────────────

function getGoogleCredentials() {
  // Option 1: Inline JSON key from environment variable
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_CREDENTIALS_JSON;
  if (rawKey) {
    try {
      const parsed = JSON.parse(rawKey);
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key?.replace(/\\n/g, '\n'),
      };
    } catch {
      // ignore parse failure and try other options
    }
  }

  // Option 2: Individual email & private key env vars
  const client_email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (client_email && rawPrivateKey) {
    return {
      client_email,
      private_key: rawPrivateKey.replace(/\\n/g, '\n'),
    };
  }

  // Option 3: Standard GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return undefined; // Google Auth will automatically read the file
  }

  return null;
}

let analyticsDataClient: BetaAnalyticsDataClient | null = null;

function getAnalyticsDataClient(): BetaAnalyticsDataClient | null {
  if (analyticsDataClient) return analyticsDataClient;
  const credentials = getGoogleCredentials();
  if (credentials === null) return null;

  try {
    if (credentials) {
      analyticsDataClient = new BetaAnalyticsDataClient({ credentials });
    } else {
      analyticsDataClient = new BetaAnalyticsDataClient();
    }
    return analyticsDataClient;
  } catch (err) {
    console.error('[GoogleAnalyticsService] Failed to initialize AnalyticsDataClient:', err);
    return null;
  }
}

function getFormattedPropertyId(): string | null {
  const raw = process.env.GA4_PROPERTY_ID || process.env.GA_PROPERTY_ID;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('properties/')) return trimmed;
  return `properties/${trimmed}`;
}

function getGscSiteUrl(): string {
  return process.env.GSC_SITE_URL || 'sc-domain:stacksaveai.com';
}

function getReportingTimezone(): string {
  return process.env.GA4_REPORTING_TIMEZONE || 'UTC';
}

// ── Date Range Helper ─────────────────────────────────────────

function getDateRangeForPeriod(period: TimePeriod): { startDate: string; endDate: string; startIso: Date; endIso: Date } {
  const now = new Date();
  const endIso = new Date(now);
  let startIso = new Date(now);
  let startDate = 'today';
  let endDate = 'today';

  switch (period) {
    case 'today':
      startDate = 'today';
      endDate = 'today';
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      break;
    case 'yesterday':
      startDate = 'yesterday';
      endDate = 'yesterday';
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
      break;
    case '7days':
      startDate = '7daysAgo';
      endDate = 'today';
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7, 0, 0, 0));
      break;
    case '30days':
      startDate = '30daysAgo';
      endDate = 'today';
      startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0));
      break;
  }

  return { startDate, endDate, startIso, endIso };
}

// ── Metric Card Builder Helper ────────────────────────────────

function createCard<T>(
  value: T,
  formattedValue: string,
  state: MetricState,
  dataSource: MetricCardValue['dataSource'],
  metricName: string,
  isRealtime: boolean,
  timezone: string,
  freshness: string,
  stateMessage?: string
): MetricCardValue<T> {
  return {
    value,
    formattedValue,
    state,
    stateMessage,
    dataSource,
    metricName,
    timezone,
    freshness,
    isRealtime,
    lastUpdatedAt: new Date().toISOString(),
  };
}

// ── Main Service Class ────────────────────────────────────────

export class GoogleAnalyticsService {
  /**
   * 1. GA4 Realtime Analytics
   * Strictly requests "Active Users — Last 30 Minutes" and realtime views
   */
  static async getRealtimeAnalytics(): Promise<RealtimeAnalyticsPayload> {
    const cacheKey = 'analytics:realtime';
    const cached = getFromCache<RealtimeAnalyticsPayload>(cacheKey);
    if (cached && !cached.isStale) {
      return { ...cached.data, state: 'CACHED' };
    }

    const timezone = getReportingTimezone();
    const propertyId = getFormattedPropertyId();
    const client = getAnalyticsDataClient();

    if (!propertyId || !client) {
      return {
        state: 'UNCONFIGURED',
        stateMessage: 'GA4_PROPERTY_ID or Google credentials not configured on server',
        dataSource: 'GA4_REALTIME',
        timezone,
        lastUpdatedAt: new Date().toISOString(),
        activeUsersLast30Min: createCard(0, '—', 'UNCONFIGURED', 'GA4_REALTIME', 'Active Users — Last 30 Minutes', true, timezone, 'Realtime (30m)', 'Credentials unconfigured'),
        realtimePageViews: createCard(0, '—', 'UNCONFIGURED', 'GA4_REALTIME', 'Realtime Views (Last 30m)', true, timezone, 'Realtime (30m)', 'Credentials unconfigured'),
        realtimeEventCount: createCard(0, '—', 'UNCONFIGURED', 'GA4_REALTIME', 'Realtime Events (Last 30m)', true, timezone, 'Realtime (30m)', 'Credentials unconfigured'),
        recentEvents: [],
        topActivePages: [],
        deviceBreakdown: [],
        countryBreakdown: [],
      };
    }

    try {
      const [response] = await client.runRealtimeReport({
        property: propertyId,
        dimensions: [
          { name: 'unifiedScreenName' },
          { name: 'eventName' },
          { name: 'deviceCategory' },
          { name: 'country' },
        ],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'eventCount' },
        ],
      });

      let totalActiveUsers = 0;
      let totalViews = 0;
      let totalEvents = 0;

      const eventMap = new Map<string, number>();
      const pageMap = new Map<string, number>();
      const deviceMap = new Map<string, number>();
      const countryMap = new Map<string, number>();

      if (response.rows && response.rows.length > 0) {
        for (const row of response.rows) {
          const page = row.dimensionValues?.[0]?.value || '/';
          const event = row.dimensionValues?.[1]?.value || '';
          const device = row.dimensionValues?.[2]?.value || 'Desktop';
          const country = row.dimensionValues?.[3]?.value || 'Unknown';

          const users = parseInt(row.metricValues?.[0]?.value || '0', 10);
          const views = parseInt(row.metricValues?.[1]?.value || '0', 10);
          const events = parseInt(row.metricValues?.[2]?.value || '0', 10);

          totalActiveUsers += users;
          totalViews += views;
          totalEvents += events;

          if (event) {
            eventMap.set(event, (eventMap.get(event) || 0) + events);
          }
          if (page) {
            pageMap.set(page, (pageMap.get(page) || 0) + users);
          }
          if (device) {
            deviceMap.set(device, (deviceMap.get(device) || 0) + users);
          }
          if (country) {
            countryMap.set(country, (countryMap.get(country) || 0) + users);
          }
        }
      }

      const recentEvents = Array.from(eventMap.entries())
        .map(([eventName, eventCount]) => ({ eventName, eventCount }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 10);

      const topActivePages = Array.from(pageMap.entries())
        .map(([pagePath, activeUsers]) => ({ pagePath, activeUsers }))
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 10);

      const deviceBreakdown = Array.from(deviceMap.entries())
        .map(([deviceCategory, activeUsers]) => ({ deviceCategory, activeUsers }))
        .sort((a, b) => b.activeUsers - a.activeUsers);

      const countryBreakdown = Array.from(countryMap.entries())
        .map(([country, activeUsers]) => ({ country, activeUsers }))
        .sort((a, b) => b.activeUsers - a.activeUsers)
        .slice(0, 10);

      const state: MetricState = totalActiveUsers === 0 && totalEvents === 0 ? 'NO_DATA' : 'OK';

      const payload: RealtimeAnalyticsPayload = {
        state,
        dataSource: 'GA4_REALTIME',
        timezone,
        lastUpdatedAt: new Date().toISOString(),
        activeUsersLast30Min: createCard(
          totalActiveUsers,
          totalActiveUsers.toLocaleString(),
          state,
          'GA4_REALTIME',
          'Active Users — Last 30 Minutes',
          true,
          timezone,
          'Updated seconds ago'
        ),
        realtimePageViews: createCard(
          totalViews,
          totalViews.toLocaleString(),
          state,
          'GA4_REALTIME',
          'Realtime Views (Last 30m)',
          true,
          timezone,
          'Updated seconds ago'
        ),
        realtimeEventCount: createCard(
          totalEvents,
          totalEvents.toLocaleString(),
          state,
          'GA4_REALTIME',
          'Realtime Events (Last 30m)',
          true,
          timezone,
          'Updated seconds ago'
        ),
        recentEvents,
        topActivePages,
        deviceBreakdown,
        countryBreakdown,
      };

      setInCache(cacheKey, payload, TTL_REALTIME_MS);
      return payload;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GoogleAnalyticsService] Realtime API query failed:', msg);
      return {
        state: 'ERROR',
        stateMessage: `GA4 Realtime API query failed: ${msg}`,
        dataSource: 'GA4_REALTIME',
        timezone,
        lastUpdatedAt: new Date().toISOString(),
        activeUsersLast30Min: createCard(0, '—', 'ERROR', 'GA4_REALTIME', 'Active Users — Last 30 Minutes', true, timezone, 'Realtime (30m)', 'GA4 query error'),
        realtimePageViews: createCard(0, '—', 'ERROR', 'GA4_REALTIME', 'Realtime Views (Last 30m)', true, timezone, 'Realtime (30m)', 'GA4 query error'),
        realtimeEventCount: createCard(0, '—', 'ERROR', 'GA4_REALTIME', 'Realtime Events (Last 30m)', true, timezone, 'Realtime (30m)', 'GA4 query error'),
        recentEvents: [],
        topActivePages: [],
        deviceBreakdown: [],
        countryBreakdown: [],
      };
    }
  }

  /**
   * 2. GA4 Historical Analytics
   * Strictly requests dynamic date ranges and builds the GA4 Event Funnel
   */
  static async getHistoricalAnalytics(period: TimePeriod = '7days'): Promise<HistoricalAnalyticsPayload> {
    const cacheKey = `analytics:historical:${period}`;
    const cached = getFromCache<HistoricalAnalyticsPayload>(cacheKey);
    if (cached && !cached.isStale) {
      return { ...cached.data, state: 'CACHED' };
    }

    const timezone = getReportingTimezone();
    const propertyId = getFormattedPropertyId();
    const client = getAnalyticsDataClient();
    const dateRange = getDateRangeForPeriod(period);

    if (!propertyId || !client) {
      return {
        state: 'UNCONFIGURED',
        stateMessage: 'GA4_PROPERTY_ID or Google credentials not configured on server',
        dataSource: 'GA4_HISTORICAL',
        period,
        dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate, timezone },
        lastUpdatedAt: new Date().toISOString(),
        activeUsers: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Active Users', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        totalUsers: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Total Users', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        sessions: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Sessions', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        screenPageViews: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Page Views', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        engagementRate: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Engagement Rate', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        averageSessionDurationSeconds: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Avg Session Duration', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        ga4Funnel: {
          auditStartedEvents: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Audits Started (GA4)', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
          auditCompletedEvents: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Audits Completed (GA4)', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
          ga4CompletionRate: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Audit Completion Rate (GA4)', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
          buildStackCompletedEvents: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Stack Builder Completed (GA4)', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
          leadCaptureCompletedEvents: createCard(0, '—', 'UNCONFIGURED', 'GA4_HISTORICAL', 'Leads Captured (GA4)', false, timezone, 'Historical (5m cache)', 'Credentials unconfigured'),
        },
        topPages: [],
        trafficSources: [],
        dailyTrend: [],
      };
    }

    try {
      // 1. Overall Traffic & Engagement Report
      const [trafficReport] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'totalUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
        ],
      });

      let activeUsers = 0;
      let totalUsers = 0;
      let sessions = 0;
      let pageViews = 0;
      let engagementRate = 0;
      let avgDuration = 0;

      const metricValues = trafficReport.rows?.[0]?.metricValues || (trafficReport as any).totals?.[0]?.metricValues;
      if (metricValues && metricValues.length > 0) {
        activeUsers = parseInt(metricValues[0]?.value || '0', 10);
        totalUsers = parseInt(metricValues[1]?.value || '0', 10);
        sessions = parseInt(metricValues[2]?.value || '0', 10);
        pageViews = parseInt(metricValues[3]?.value || '0', 10);
        engagementRate = parseFloat(metricValues[4]?.value || '0') * 100;
        avgDuration = parseFloat(metricValues[5]?.value || '0');
      }

      // 2. Events & Funnel Report (Strictly GA4 events)
      const [eventsReport] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
      });

      let auditStarted = 0;
      let auditCompleted = 0;
      let buildStackCompleted = 0;
      let leadCaptured = 0;

      if (eventsReport.rows && eventsReport.rows.length > 0) {
        for (const row of eventsReport.rows) {
          const eventName = row.dimensionValues?.[0]?.value || '';
          const count = parseInt(row.metricValues?.[0]?.value || '0', 10);
          if (eventName === 'audit_started') auditStarted = count;
          if (eventName === 'audit_completed' || eventName === 'audit_submitted') auditCompleted = count;
          if (eventName === 'build_stack_completed') buildStackCompleted = count;
          if (eventName === 'signup_completed' || eventName === 'lead_captured') leadCaptured = count;
        }
      }

      // GA4 Funnel Completion Rate calculated strictly from GA4 events
      const completionRate = auditStarted > 0 ? Math.round((auditCompleted / auditStarted) * 1000) / 10 : 0;

      // 3. Top Pages Report
      const [pagesReport] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        limit: 10,
      });

      const topPages = (pagesReport.rows || []).map((row) => ({
        pagePath: row.dimensionValues?.[0]?.value || '/',
        pageViews: parseInt(row.metricValues?.[0]?.value || '0', 10),
        activeUsers: parseInt(row.metricValues?.[1]?.value || '0', 10),
      }));

      // 4. Traffic Sources Report
      const [sourcesReport] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
        limit: 10,
      });

      const trafficSources = (sourcesReport.rows || []).map((row) => ({
        sessionSource: row.dimensionValues?.[0]?.value || '(direct)',
        sessionMedium: row.dimensionValues?.[1]?.value || '(none)',
        sessions: parseInt(row.metricValues?.[0]?.value || '0', 10),
        activeUsers: parseInt(row.metricValues?.[1]?.value || '0', 10),
      }));

      // 5. Daily Trend Report
      const [trendReport] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      const dailyTrend = (trendReport.rows || []).map((row) => {
        const rawDate = row.dimensionValues?.[0]?.value || '';
        // Format YYYYMMDD -> YYYY-MM-DD
        const formattedDate = rawDate.length === 8 ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : rawDate;
        return {
          date: formattedDate,
          activeUsers: parseInt(row.metricValues?.[0]?.value || '0', 10),
          screenPageViews: parseInt(row.metricValues?.[1]?.value || '0', 10),
          sessions: parseInt(row.metricValues?.[2]?.value || '0', 10),
        };
      });

      const state: MetricState = activeUsers === 0 && pageViews === 0 ? 'NO_DATA' : 'OK';

      const payload: HistoricalAnalyticsPayload = {
        state,
        dataSource: 'GA4_HISTORICAL',
        period,
        dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate, timezone },
        lastUpdatedAt: new Date().toISOString(),
        activeUsers: createCard(activeUsers, activeUsers.toLocaleString(), state, 'GA4_HISTORICAL', 'Active Users', false, timezone, 'Historical (5m cache)'),
        totalUsers: createCard(totalUsers, totalUsers.toLocaleString(), state, 'GA4_HISTORICAL', 'Total Users', false, timezone, 'Historical (5m cache)'),
        sessions: createCard(sessions, sessions.toLocaleString(), state, 'GA4_HISTORICAL', 'Sessions', false, timezone, 'Historical (5m cache)'),
        screenPageViews: createCard(pageViews, pageViews.toLocaleString(), state, 'GA4_HISTORICAL', 'Page Views', false, timezone, 'Historical (5m cache)'),
        engagementRate: createCard(engagementRate, `${engagementRate.toFixed(1)}%`, state, 'GA4_HISTORICAL', 'Engagement Rate', false, timezone, 'Historical (5m cache)'),
        averageSessionDurationSeconds: createCard(avgDuration, `${Math.round(avgDuration)}s`, state, 'GA4_HISTORICAL', 'Avg Session Duration', false, timezone, 'Historical (5m cache)'),
        ga4Funnel: {
          auditStartedEvents: createCard(auditStarted, auditStarted.toLocaleString(), state, 'GA4_HISTORICAL', 'Audits Started (GA4)', false, timezone, 'Historical (5m cache)'),
          auditCompletedEvents: createCard(auditCompleted, auditCompleted.toLocaleString(), state, 'GA4_HISTORICAL', 'Audits Completed (GA4)', false, timezone, 'Historical (5m cache)'),
          ga4CompletionRate: createCard(completionRate, `${completionRate.toFixed(1)}%`, state, 'GA4_HISTORICAL', 'Audit Completion Rate (GA4)', false, timezone, 'Historical (5m cache)'),
          buildStackCompletedEvents: createCard(buildStackCompleted, buildStackCompleted.toLocaleString(), state, 'GA4_HISTORICAL', 'Stack Builder Completed (GA4)', false, timezone, 'Historical (5m cache)'),
          leadCaptureCompletedEvents: createCard(leadCaptured, leadCaptured.toLocaleString(), state, 'GA4_HISTORICAL', 'Leads Captured (GA4)', false, timezone, 'Historical (5m cache)'),
        },
        topPages,
        trafficSources,
        dailyTrend,
      };

      setInCache(cacheKey, payload, TTL_HISTORICAL_MS);
      return payload;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GoogleAnalyticsService] Historical Data API query failed:', msg);
      return {
        state: 'ERROR',
        stateMessage: `GA4 Data API query failed: ${msg}`,
        dataSource: 'GA4_HISTORICAL',
        period,
        dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate, timezone },
        lastUpdatedAt: new Date().toISOString(),
        activeUsers: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Active Users', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        totalUsers: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Total Users', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        sessions: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Sessions', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        screenPageViews: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Page Views', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        engagementRate: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Engagement Rate', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        averageSessionDurationSeconds: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Avg Session Duration', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        ga4Funnel: {
          auditStartedEvents: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Audits Started (GA4)', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
          auditCompletedEvents: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Audits Completed (GA4)', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
          ga4CompletionRate: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Audit Completion Rate (GA4)', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
          buildStackCompletedEvents: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Stack Builder Completed (GA4)', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
          leadCaptureCompletedEvents: createCard(0, '—', 'ERROR', 'GA4_HISTORICAL', 'Leads Captured (GA4)', false, timezone, 'Historical (5m cache)', 'GA4 query error'),
        },
        topPages: [],
        trafficSources: [],
        dailyTrend: [],
      };
    }
  }

  /**
   * 3. Google Search Console Analytics
   * Strictly queries organic search performance (clicks, impressions, ctr, position).
   * Completely isolated from website visitor metrics.
   */
  static async getSearchConsoleAnalytics(period: TimePeriod = '7days'): Promise<SearchConsoleAnalyticsPayload> {
    const cacheKey = `analytics:search-console:${period}`;
    const cached = getFromCache<SearchConsoleAnalyticsPayload>(cacheKey);
    if (cached && !cached.isStale) {
      return { ...cached.data, state: 'CACHED' };
    }

    const timezone = 'UTC';
    const siteUrl = getGscSiteUrl();
    const dateRange = getDateRangeForPeriod(period);
    const credentials = getGoogleCredentials();

    if (!credentials && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return {
        state: 'UNCONFIGURED',
        stateMessage: 'Google Service Account credentials not configured for Search Console API',
        dataSource: 'GOOGLE_SEARCH_CONSOLE',
        siteUrl,
        period,
        dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate, timezone },
        lastUpdatedAt: new Date().toISOString(),
        searchClicks: createCard(0, '—', 'UNCONFIGURED', 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Clicks', false, timezone, 'GSC (1h cache)', 'Credentials unconfigured'),
        searchImpressions: createCard(0, '—', 'UNCONFIGURED', 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Impressions', false, timezone, 'GSC (1h cache)', 'Credentials unconfigured'),
        averageCtr: createCard(0, '—', 'UNCONFIGURED', 'GOOGLE_SEARCH_CONSOLE', 'Average Search CTR', false, timezone, 'GSC (1h cache)', 'Credentials unconfigured'),
        averagePosition: createCard(0, '—', 'UNCONFIGURED', 'GOOGLE_SEARCH_CONSOLE', 'Average Search Position', false, timezone, 'GSC (1h cache)', 'Credentials unconfigured'),
        topQueries: [],
        topPages: [],
      };
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials: credentials || undefined,
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      });

      const searchconsole = google.searchconsole({ version: 'v1', auth });

      // Convert date window to YYYY-MM-DD for Search Console API
      const now = new Date();
      const endYmd = now.toISOString().split('T')[0];
      const startDays = period === '30days' ? 30 : period === '7days' ? 7 : period === 'yesterday' ? 2 : 1;
      const startDateIso = new Date(now.getTime() - startDays * 24 * 60 * 60 * 1000);
      const startYmd = startDateIso.toISOString().split('T')[0];

      // Query overall search performance
      const overviewRes = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startYmd,
          endDate: endYmd,
          dimensions: ['query'],
          rowLimit: 10,
        },
      });

      const rows = overviewRes.data.rows || [];
      let totalClicks = 0;
      let totalImpressions = 0;
      let totalPositionSum = 0;

      for (const r of rows) {
        totalClicks += r.clicks || 0;
        totalImpressions += r.impressions || 0;
        totalPositionSum += (r.position || 0) * (r.impressions || 1);
      }

      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgPos = totalImpressions > 0 ? totalPositionSum / totalImpressions : 0;

      const topQueries = rows.map((r) => ({
        query: r.keys?.[0] || '(not set)',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: Math.round((r.ctr || 0) * 1000) / 10,
        position: Math.round((r.position || 0) * 10) / 10,
      }));

      // Query top landing pages in search
      const pagesRes = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startYmd,
          endDate: endYmd,
          dimensions: ['page'],
          rowLimit: 10,
        },
      });

      const topPages = (pagesRes.data.rows || []).map((r) => ({
        page: r.keys?.[0] || '/',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: Math.round((r.ctr || 0) * 1000) / 10,
        position: Math.round((r.position || 0) * 10) / 10,
      }));

      const state: MetricState = totalImpressions === 0 && totalClicks === 0 ? 'NO_DATA' : 'OK';

      const payload: SearchConsoleAnalyticsPayload = {
        state,
        dataSource: 'GOOGLE_SEARCH_CONSOLE',
        siteUrl,
        period,
        dateRange: { startDate: startYmd, endDate: endYmd, timezone },
        lastUpdatedAt: new Date().toISOString(),
        searchClicks: createCard(totalClicks, totalClicks.toLocaleString(), state, 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Clicks', false, timezone, 'GSC (1h cache)'),
        searchImpressions: createCard(totalImpressions, totalImpressions.toLocaleString(), state, 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Impressions', false, timezone, 'GSC (1h cache)'),
        averageCtr: createCard(avgCtr, `${avgCtr.toFixed(1)}%`, state, 'GOOGLE_SEARCH_CONSOLE', 'Average Search CTR', false, timezone, 'GSC (1h cache)'),
        averagePosition: createCard(avgPos, avgPos > 0 ? avgPos.toFixed(1) : '—', state, 'GOOGLE_SEARCH_CONSOLE', 'Average Search Position', false, timezone, 'GSC (1h cache)'),
        topQueries,
        topPages,
      };

      setInCache(cacheKey, payload, TTL_GSC_MS);
      return payload;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GoogleAnalyticsService] Search Console query failed:', msg);
      return {
        state: 'ERROR',
        stateMessage: `Search Console API error: ${msg}`,
        dataSource: 'GOOGLE_SEARCH_CONSOLE',
        siteUrl,
        period,
        dateRange: { startDate: dateRange.startDate, endDate: dateRange.endDate, timezone },
        lastUpdatedAt: new Date().toISOString(),
        searchClicks: createCard(0, '—', 'ERROR', 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Clicks', false, timezone, 'GSC (1h cache)', 'Search Console error'),
        searchImpressions: createCard(0, '—', 'ERROR', 'GOOGLE_SEARCH_CONSOLE', 'Organic Search Impressions', false, timezone, 'GSC (1h cache)', 'Search Console error'),
        averageCtr: createCard(0, '—', 'ERROR', 'GOOGLE_SEARCH_CONSOLE', 'Average Search CTR', false, timezone, 'GSC (1h cache)', 'Search Console error'),
        averagePosition: createCard(0, '—', 'ERROR', 'GOOGLE_SEARCH_CONSOLE', 'Average Search Position', false, timezone, 'GSC (1h cache)', 'Search Console error'),
        topQueries: [],
        topPages: [],
      };
    }
  }

  /**
   * 4. StackSave Database Ground Truth Analytics
   * Strictly queries MongoDB collections (AuditModel & LeadModel).
   */
  static async getDatabaseAnalytics(period: TimePeriod = '7days'): Promise<DatabaseAnalyticsPayload> {
    const cacheKey = `analytics:database:${period}`;
    const cached = getFromCache<DatabaseAnalyticsPayload>(cacheKey);
    if (cached && !cached.isStale) {
      return { ...cached.data, state: 'CACHED' };
    }

    const timezone = 'UTC';
    const dateRange = getDateRangeForPeriod(period);

    if (mongoose.connection.readyState !== 1) {
      return {
        state: 'UNCONFIGURED',
        dataSource: 'STACKSAVE_MONGODB',
        lastUpdatedAt: new Date().toISOString(),
        totalAuditsInDb: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Total Audits in Database', false, timezone, 'DB disconnected', 'Database not connected'),
        auditsInPeriod: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Audits in Period', false, timezone, 'DB disconnected', 'Database not connected'),
        successfulAuditsInPeriod: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Successful Audits in Period', false, timezone, 'DB disconnected', 'Database not connected'),
        failedAuditsInPeriod: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Failed Audits in Period', false, timezone, 'DB disconnected', 'Database not connected'),
        dbAuditSuccessRate: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Database Audit Success Rate', false, timezone, 'DB disconnected', 'Database not connected'),
        totalLeadsInDb: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Total Leads in Database', false, timezone, 'DB disconnected', 'Database not connected'),
        leadsInPeriod: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Leads in Period', false, timezone, 'DB disconnected', 'Database not connected'),
        totalEstimatedSavingsTracked: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Total Monthly Savings Identified', false, timezone, 'DB disconnected', 'Database not connected'),
        averageEstimatedSavingsPerAudit: createCard(0, '—', 'UNCONFIGURED', 'STACKSAVE_MONGODB', 'Avg Monthly Savings / Audit', false, timezone, 'DB disconnected', 'Database not connected'),
      };
    }

    try {
      const totalAuditsInDb = await AuditModel.countDocuments({});
      const totalLeadsInDb = await LeadModel.countDocuments({});

      const auditsInPeriodDocs = await AuditModel.find({
        createdAt: { $gte: dateRange.startIso },
      }).select('estimatedMonthlySavings totalMonthlySpend optimizedMonthlySpend isAuditComplete').lean();

      const auditsInPeriod = auditsInPeriodDocs.length;
      // All created audits in StackSave DB that reached results are complete
      const successfulAuditsInPeriod = auditsInPeriodDocs.filter((a) => (a as any).isAuditComplete !== false).length;
      const failedAuditsInPeriod = auditsInPeriod - successfulAuditsInPeriod;
      const dbAuditSuccessRate = auditsInPeriod > 0 ? (successfulAuditsInPeriod / auditsInPeriod) * 100 : 100;

      const leadsInPeriod = await LeadModel.countDocuments({
        createdAt: { $gte: dateRange.startIso },
      });

      let totalSavingsSum = 0;
      for (const doc of auditsInPeriodDocs) {
        totalSavingsSum += doc.estimatedMonthlySavings || 0;
      }
      const avgSavings = auditsInPeriod > 0 ? totalSavingsSum / auditsInPeriod : 0;

      const state: MetricState = totalAuditsInDb === 0 ? 'NO_DATA' : 'OK';

      const payload: DatabaseAnalyticsPayload = {
        state,
        dataSource: 'STACKSAVE_MONGODB',
        lastUpdatedAt: new Date().toISOString(),
        totalAuditsInDb: createCard(totalAuditsInDb, totalAuditsInDb.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Total Audits in Database', false, timezone, 'Live DB (30s cache)'),
        auditsInPeriod: createCard(auditsInPeriod, auditsInPeriod.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Audits in Period', false, timezone, 'Live DB (30s cache)'),
        successfulAuditsInPeriod: createCard(successfulAuditsInPeriod, successfulAuditsInPeriod.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Successful Audits in Period', false, timezone, 'Live DB (30s cache)'),
        failedAuditsInPeriod: createCard(failedAuditsInPeriod, failedAuditsInPeriod.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Failed Audits in Period', false, timezone, 'Live DB (30s cache)'),
        dbAuditSuccessRate: createCard(dbAuditSuccessRate, `${dbAuditSuccessRate.toFixed(1)}%`, state, 'STACKSAVE_MONGODB', 'Database Audit Success Rate', false, timezone, 'Live DB (30s cache)'),
        totalLeadsInDb: createCard(totalLeadsInDb, totalLeadsInDb.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Total Leads in Database', false, timezone, 'Live DB (30s cache)'),
        leadsInPeriod: createCard(leadsInPeriod, leadsInPeriod.toLocaleString(), state, 'STACKSAVE_MONGODB', 'Leads in Period', false, timezone, 'Live DB (30s cache)'),
        totalEstimatedSavingsTracked: createCard(totalSavingsSum, `$${Math.round(totalSavingsSum).toLocaleString()}/mo`, state, 'STACKSAVE_MONGODB', 'Total Monthly Savings Identified', false, timezone, 'Live DB (30s cache)'),
        averageEstimatedSavingsPerAudit: createCard(avgSavings, `$${Math.round(avgSavings).toLocaleString()}/mo`, state, 'STACKSAVE_MONGODB', 'Avg Monthly Savings / Audit', false, timezone, 'Live DB (30s cache)'),
      };

      setInCache(cacheKey, payload, TTL_DB_MS);
      return payload;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[GoogleAnalyticsService] Database query failed:', msg);
      return {
        state: 'ERROR',
        dataSource: 'STACKSAVE_MONGODB',
        lastUpdatedAt: new Date().toISOString(),
        totalAuditsInDb: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Total Audits in Database', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        auditsInPeriod: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Audits in Period', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        successfulAuditsInPeriod: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Successful Audits in Period', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        failedAuditsInPeriod: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Failed Audits in Period', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        dbAuditSuccessRate: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Database Audit Success Rate', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        totalLeadsInDb: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Total Leads in Database', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        leadsInPeriod: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Leads in Period', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        totalEstimatedSavingsTracked: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Total Monthly Savings Identified', false, timezone, 'Live DB (30s cache)', 'DB query error'),
        averageEstimatedSavingsPerAudit: createCard(0, '—', 'ERROR', 'STACKSAVE_MONGODB', 'Avg Monthly Savings / Audit', false, timezone, 'Live DB (30s cache)', 'DB query error'),
      };
    }
  }

  /**
   * 5. Consolidated Analytics Overview
   */
  static async getAnalyticsOverview(period: TimePeriod = '7days'): Promise<AnalyticsOverviewPayload> {
    const [realtime, historical, searchConsole, database] = await Promise.all([
      this.getRealtimeAnalytics(),
      this.getHistoricalAnalytics(period),
      this.getSearchConsoleAnalytics(period),
      this.getDatabaseAnalytics(period),
    ]);

    return {
      period,
      timezone: getReportingTimezone(),
      generatedAt: new Date().toISOString(),
      realtime,
      historical,
      searchConsole,
      database,
    };
  }

  /**
   * 6. Analytics Health Monitoring Endpoint
   * Verifies all 5 dependencies and returns structured status.
   */
  static async getAnalyticsHealth(): Promise<AnalyticsHealthPayload> {
    const now = new Date().toISOString();
    const propertyId = getFormattedPropertyId();
    const client = getAnalyticsDataClient();
    const credentials = getGoogleCredentials();
    const siteUrl = getGscSiteUrl();

    // 1. Client tracking check
    const measurementId = process.env.VITE_GA_MEASUREMENT_ID || 'G-412VVCKC22';
    const ga4Tracking = {
      status: measurementId ? ('CONFIGURED' as const) : ('MISSING' as const),
      measurementId: measurementId || null,
      details: measurementId ? `Client gtag.js configured with ${measurementId}` : 'Missing GA_MEASUREMENT_ID',
    };

    // 2. GA4 Data API check
    let ga4DataApiStatus: AnalyticsHealthPayload['dependencies']['ga4DataApi']['status'] = 'UNCONFIGURED';
    let ga4DataApiDetails = 'UNCONFIGURED';

    if (propertyId && client) {
      try {
        const [res] = await client.runReport({
          property: propertyId,
          dateRanges: [{ startDate: 'today', endDate: 'today' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 1,
        });
        if (res) {
          ga4DataApiStatus = 'CONNECTED';
          ga4DataApiDetails = `Connected to ${propertyId}`;
        }
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
          ga4DataApiStatus = 'PERMISSION_DENIED';
          ga4DataApiDetails = 'GA4 permission denied';
        } else {
          ga4DataApiStatus = 'ERROR';
          ga4DataApiDetails = 'GA4 API unavailable';
        }
      }
    }

    // 3. GA4 Realtime API check
    let ga4RealtimeStatus: AnalyticsHealthPayload['dependencies']['ga4Realtime']['status'] = 'UNCONFIGURED';
    let ga4RealtimeDetails = 'UNCONFIGURED';

    if (propertyId && client) {
      try {
        const [res] = await client.runRealtimeReport({
          property: propertyId,
          metrics: [{ name: 'activeUsers' }],
          limit: 1,
        });
        if (res) {
          ga4RealtimeStatus = 'CONNECTED';
          ga4RealtimeDetails = `Realtime API active for ${propertyId}`;
        }
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
          ga4RealtimeStatus = 'PERMISSION_DENIED';
          ga4RealtimeDetails = 'GA4 Realtime permission denied';
        } else {
          ga4RealtimeStatus = 'ERROR';
          ga4RealtimeDetails = 'GA4 Realtime API unavailable';
        }
      }
    }

    // 4. Search Console check
    let searchConsoleStatus: AnalyticsHealthPayload['dependencies']['searchConsole']['status'] = 'UNCONFIGURED';
    let searchConsoleDetails = 'UNCONFIGURED';

    if (credentials || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const auth = new google.auth.GoogleAuth({
          credentials: credentials || undefined,
          scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });
        const gsc = google.searchconsole({ version: 'v1', auth });
        const res = await gsc.sites.get({ siteUrl });
        if (res.data) {
          searchConsoleStatus = 'CONNECTED';
          searchConsoleDetails = `Connected to site: ${siteUrl}`;
        }
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('403') || msg.includes('User does not have sufficient permission')) {
          searchConsoleStatus = 'PERMISSION_DENIED';
          searchConsoleDetails = 'Search Console permission denied';
        } else {
          searchConsoleStatus = 'ERROR';
          searchConsoleDetails = 'Search Console unavailable';
        }
      }
    }

    // 5. MongoDB check
    let mongodbStatus: 'CONNECTED' | 'ERROR' = 'CONNECTED';
    let mongodbDetails = 'MongoDB connected and responsive';
    let dbAuditCount = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        dbAuditCount = await AuditModel.countDocuments({});
        mongodbDetails = `Connected (${dbAuditCount} total audits stored)`;
      } catch (err: any) {
        mongodbStatus = 'ERROR';
        mongodbDetails = 'MongoDB unavailable';
      }
    } else {
      mongodbStatus = 'ERROR';
      mongodbDetails = 'MongoDB connection is disconnected or not yet initialized';
    }

    // Overall Status derivation
    let status: AnalyticsHealthPayload['status'] = 'HEALTHY';
    if (mongodbStatus === 'ERROR') {
      status = 'DEGRADED';
    } else if (ga4DataApiStatus === 'CONNECTED' && searchConsoleStatus === 'CONNECTED') {
      status = 'HEALTHY';
    } else if (ga4DataApiStatus === 'CONNECTED' || searchConsoleStatus === 'CONNECTED') {
      status = 'PARTIAL';
    } else {
      status = 'UNCONFIGURED';
    }

    return {
      status,
      checkedAt: now,
      dependencies: {
        ga4Tracking,
        ga4DataApi: {
          status: ga4DataApiStatus,
          propertyId,
          details: ga4DataApiDetails,
          lastCheckedAt: now,
        },
        ga4Realtime: {
          status: ga4RealtimeStatus,
          propertyId,
          details: ga4RealtimeDetails,
          lastCheckedAt: now,
        },
        searchConsole: {
          status: searchConsoleStatus,
          siteUrl,
          details: searchConsoleDetails,
          lastCheckedAt: now,
        },
        mongodb: {
          status: mongodbStatus,
          details: mongodbDetails,
          auditCount: dbAuditCount,
          lastCheckedAt: now,
        },
      },
    };
  }
}
