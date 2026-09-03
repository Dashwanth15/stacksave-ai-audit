// ============================================================
// Analytics Types — StackSave AI Audit
// Realtime, Historical, Search Console, Database Ground Truth
// ============================================================

export type MetricState = 'OK' | 'NO_DATA' | 'UNCONFIGURED' | 'ERROR' | 'CACHED' | 'STALE';
export type TimePeriod = 'today' | 'yesterday' | '7days' | '30days';

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
  engagementRate: MetricCardValue<number>;
  averageSessionDurationSeconds: MetricCardValue<number>;
  ga4Funnel: {
    auditStartedEvents: MetricCardValue<number>;
    auditCompletedEvents: MetricCardValue<number>;
    ga4CompletionRate: MetricCardValue<number>;
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
  averageCtr: MetricCardValue<number>;
  averagePosition: MetricCardValue<number>;
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
