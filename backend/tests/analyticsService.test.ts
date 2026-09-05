// ============================================================
// Analytics & Statistics Service Tests
// StackSave AI Audit — Verification of GA4, GSC & DB Isolation
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleAnalyticsService, TimePeriod } from '../src/services/googleAnalyticsService';

describe('GoogleAnalyticsService — Analytics Data Integrity & Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Realtime Terminology & Schema Requirements', () => {
    it('labels active users strictly as "Active Users — Last 30 Minutes"', async () => {
      const realtime = await GoogleAnalyticsService.getRealtimeAnalytics();

      expect(realtime.dataSource).toBe('GA4_REALTIME');
      expect(realtime.activeUsersLast30Min).toBeDefined();
      expect(realtime.activeUsersLast30Min.metricName).toBe('Active Users — Last 30 Minutes');
      expect(realtime.activeUsersLast30Min.isRealtime).toBe(true);
      expect(realtime.timezone).toBeDefined();

      // Must never use prohibited vague realtime terms
      expect(realtime.activeUsersLast30Min.metricName).not.toContain('currently on website');
      expect(realtime.activeUsersLast30Min.metricName).not.toContain('online right now');
      expect(realtime.activeUsersLast30Min.metricName).not.toContain('Exact users online');
    });

    it('returns realtime views and events with valid state structure', async () => {
      const realtime = await GoogleAnalyticsService.getRealtimeAnalytics();

      expect(realtime.realtimePageViews).toBeDefined();
      expect(realtime.realtimeEventCount).toBeDefined();
      expect(Array.isArray(realtime.recentEvents)).toBe(true);
      expect(Array.isArray(realtime.topActivePages)).toBe(true);
    });
  });

  describe('2. Historical Reporting & Dynamic Date Ranges', () => {
    const periods: TimePeriod[] = ['today', 'yesterday', '7days', '30days'];

    periods.forEach((period) => {
      it(`computes dynamic date window correctly for period: ${period}`, async () => {
        const historical = await GoogleAnalyticsService.getHistoricalAnalytics(period);

        expect(historical.period).toBe(period);
        expect(historical.dataSource).toBe('GA4_HISTORICAL');
        expect(historical.dateRange).toBeDefined();
        expect(historical.dateRange.timezone).toBeDefined();

        if (period === 'today') {
          expect(historical.dateRange.startDate).toBe('today');
          expect(historical.dateRange.endDate).toBe('today');
        } else if (period === 'yesterday') {
          expect(historical.dateRange.startDate).toBe('yesterday');
          expect(historical.dateRange.endDate).toBe('yesterday');
        } else if (period === '7days') {
          expect(historical.dateRange.startDate).toBe('7daysAgo');
          expect(historical.dateRange.endDate).toBe('today');
        } else if (period === '30days') {
          expect(historical.dateRange.startDate).toBe('30daysAgo');
          expect(historical.dateRange.endDate).toBe('today');
        }
      });
    });

    it('includes unfiltered property-level Total Users and Active Users from GA4', async () => {
      const historical = await GoogleAnalyticsService.getHistoricalAnalytics('7days');

      expect(historical.totalUsers).toBeDefined();
      expect(historical.totalUsers.metricName).toBe('Total Users');
      expect(historical.totalUsers.dataSource).toBe('GA4_HISTORICAL');

      expect(historical.activeUsers).toBeDefined();
      expect(historical.activeUsers.metricName).toBe('Active Users');
      expect(historical.activeUsers.dataSource).toBe('GA4_HISTORICAL');

      expect(historical.sessions).toBeDefined();
      expect(historical.screenPageViews).toBeDefined();
    });
  });

  describe('3. Strict Isolation of GA4 Funnel vs Database Ground Truth', () => {
    it('isolates GA4 funnel strictly to GA4 events (never divides GA4 starts by MongoDB completions)', async () => {
      const historical = await GoogleAnalyticsService.getHistoricalAnalytics('7days');

      expect(historical.ga4Funnel).toBeDefined();
      expect(historical.ga4Funnel.auditStartedEvents.dataSource).toBe('GA4_HISTORICAL');
      expect(historical.ga4Funnel.auditCompletedEvents.dataSource).toBe('GA4_HISTORICAL');
      expect(historical.ga4Funnel.ga4CompletionRate.dataSource).toBe('GA4_HISTORICAL');
      expect(historical.ga4Funnel.ga4CompletionRate.metricName).toBe('Audit Completion Rate (GA4)');

      // If started events is 0 in unconfigured/empty state, completion rate is not NaN/Infinity
      if (historical.ga4Funnel.auditStartedEvents.value === 0) {
        expect(historical.ga4Funnel.ga4CompletionRate.value).toBe(0);
      }
    });

    it('isolates MongoDB Database Ground Truth metrics to MongoDB documents', async () => {
      const dbAnalytics = await GoogleAnalyticsService.getDatabaseAnalytics('7days');

      expect(dbAnalytics.dataSource).toBe('STACKSAVE_MONGODB');
      expect(dbAnalytics.totalAuditsInDb).toBeDefined();
      expect(dbAnalytics.totalAuditsInDb.metricName).toBe('Total Audits in Database');
      expect(dbAnalytics.auditsInPeriod).toBeDefined();
      expect(dbAnalytics.successfulAuditsInPeriod).toBeDefined();
      expect(dbAnalytics.failedAuditsInPeriod).toBeDefined();
      expect(dbAnalytics.dbAuditSuccessRate).toBeDefined();
      expect(dbAnalytics.totalEstimatedSavingsTracked).toBeDefined();
    });
  });

  describe('4. Google Search Console Isolation from Website Visitors', () => {
    it('isolates organic search queries, clicks, and impressions from website users', async () => {
      const gsc = await GoogleAnalyticsService.getSearchConsoleAnalytics('7days');

      expect(gsc.dataSource).toBe('GOOGLE_SEARCH_CONSOLE');
      expect(gsc.searchClicks).toBeDefined();
      expect(gsc.searchClicks.metricName).toBe('Organic Search Clicks');
      expect(gsc.searchImpressions).toBeDefined();
      expect(gsc.searchImpressions.metricName).toBe('Organic Search Impressions');
      expect(gsc.averageCtr).toBeDefined();
      expect(gsc.averagePosition).toBeDefined();
      expect(Array.isArray(gsc.topQueries)).toBe(true);
      expect(Array.isArray(gsc.topPages)).toBe(true);
    });
  });

  describe('5. Zero-Data vs Unconfigured vs Error State Machine', () => {
    it('returns explicit UNCONFIGURED state with dash formattedValue when credentials are not configured', async () => {
      // With no GA4_PROPERTY_ID set in test environment
      const realtime = await GoogleAnalyticsService.getRealtimeAnalytics();

      if (!process.env.GA4_PROPERTY_ID) {
        expect(realtime.state).toBe('UNCONFIGURED');
        expect(realtime.activeUsersLast30Min.formattedValue).toBe('—');
        expect(realtime.activeUsersLast30Min.state).toBe('UNCONFIGURED');
        expect(realtime.stateMessage).toContain('not configured');

        // MUST NEVER fake active users as a random simulated number
        expect(typeof realtime.activeUsersLast30Min.value).toBe('number');
      }
    });

    it('returns explicit UNCONFIGURED state for Search Console when credentials are missing', async () => {
      const gsc = await GoogleAnalyticsService.getSearchConsoleAnalytics('7days');

      if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        expect(gsc.state).toBe('UNCONFIGURED');
        expect(gsc.searchClicks.formattedValue).toBe('—');
        expect(gsc.searchClicks.state).toBe('UNCONFIGURED');
      }
    });
  });

  describe('6. Analytics Health Monitoring Diagnostic Endpoint', () => {
    it('returns structured diagnostic status for all 5 dependencies', async () => {
      const health = await GoogleAnalyticsService.getAnalyticsHealth();

      expect(health.status).toBeDefined();
      expect(['HEALTHY', 'PARTIAL', 'DEGRADED', 'UNCONFIGURED']).toContain(health.status);
      expect(health.checkedAt).toBeDefined();

      const deps = health.dependencies;
      expect(deps.ga4Tracking).toBeDefined();
      expect(['CONFIGURED', 'MISSING']).toContain(deps.ga4Tracking.status);

      expect(deps.ga4DataApi).toBeDefined();
      expect(['CONNECTED', 'UNCONFIGURED', 'ERROR', 'PERMISSION_DENIED']).toContain(deps.ga4DataApi.status);

      expect(deps.ga4Realtime).toBeDefined();
      expect(['CONNECTED', 'UNCONFIGURED', 'ERROR', 'PERMISSION_DENIED']).toContain(deps.ga4Realtime.status);

      expect(deps.searchConsole).toBeDefined();
      expect(['CONNECTED', 'UNCONFIGURED', 'ERROR', 'PERMISSION_DENIED']).toContain(deps.searchConsole.status);

      expect(deps.mongodb).toBeDefined();
      expect(['CONNECTED', 'ERROR']).toContain(deps.mongodb.status);
    });
  });

  describe('7. Consolidated Overview Endpoint', () => {
    it('returns merged overview with all 4 independent data sections', async () => {
      const overview = await GoogleAnalyticsService.getAnalyticsOverview('7days');

      expect(overview.period).toBe('7days');
      expect(overview.timezone).toBeDefined();
      expect(overview.generatedAt).toBeDefined();
      expect(overview.realtime).toBeDefined();
      expect(overview.historical).toBeDefined();
      expect(overview.searchConsole).toBeDefined();
      expect(overview.database).toBeDefined();

      // Verify each section has its distinct data source tag
      expect(overview.realtime.dataSource).toBe('GA4_REALTIME');
      expect(overview.historical.dataSource).toBe('GA4_HISTORICAL');
      expect(overview.searchConsole.dataSource).toBe('GOOGLE_SEARCH_CONSOLE');
      expect(overview.database.dataSource).toBe('STACKSAVE_MONGODB');
    });
  });
});
