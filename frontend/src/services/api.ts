// ============================================================
// API Service — StackSave AI Audit
// Axios instance + typed API call wrappers
// ============================================================

import axios from 'axios';
import type {
  AuditRequest,
  AuditResult,
  LeadCaptureRequest,
  ReAuditResponse,
  AuditDiff,
  StackBuilderRequest,
  StackRecommendation,
  PublicOffer,
} from '../types';
import { getUserScopedKey } from '../utils/userSession';


export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
    }
    return trimmed;
  }

  // Auto-detect production browser hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (
      hostname === 'stacksaveai.com' ||
      hostname === 'www.stacksaveai.com' ||
      hostname.includes('stacksaveai.com') ||
      hostname.includes('onrender.com')
    ) {
      return 'https://api.stacksaveai.com/api';
    }
  }

  // Production build fallback
  if (import.meta.env.PROD) {
    return 'https://api.stacksaveai.com/api';
  }

  // Local development fallback
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 30s — AI summary can take a few seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor (for debugging in dev) ────────────────
api.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// ── Response Interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Retry once on network errors or 429 (rate limited)
    if (
      !config._retried &&
      (error.code === 'ERR_NETWORK' || error.response?.status === 429)
    ) {
      config._retried = true;
      const waitMs = error.response?.status === 429 ? 2000 : 1000;
      await new Promise((r) => setTimeout(r, waitMs));
      return api(config);
    }

    // User-friendly error messages
    const status = error.response?.status;
    let message = error.response?.data?.error || error.message;

    if (status === 429) {
      message = 'Too many requests. Please wait a moment and try again.';
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Unable to reach the server. Please check your connection.';
    } else if (status === 500) {
      message = 'Server error. Please try again in a moment.';
    }

    return Promise.reject(new Error(message || 'Something went wrong. Please try again.'));
  }
);

// ── API Functions ─────────────────────────────────────────────

export async function submitAudit(request: AuditRequest): Promise<AuditResult> {
  const response = await api.post<{ success: boolean; data: AuditResult; error?: string }>('/audits', request);
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to process audit.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but the audit data payload is missing.');
  }
  const data = response.data.data;
  if (data.ownerToken && typeof window !== 'undefined') {
    try {
      localStorage.setItem(getUserScopedKey(`audit_token_${data.auditId}`), data.ownerToken);
    } catch {
      // ignore storage failure
    }
  }
  return data;
}

export async function fetchAudit(auditId: string): Promise<AuditResult> {
  const response = await api.get<{ success: boolean; data: AuditResult; error?: string }>(`/audits/${auditId}`);
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to fetch audit details.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but the audit details payload is missing.');
  }
  return response.data.data;
}

export async function captureLead(request: LeadCaptureRequest): Promise<void> {
  await api.post('/leads', request);
}

export async function checkHealth(): Promise<{ status: string; db: string }> {
  const response = await api.get('/health');
  return response.data;
}

export async function fetchAuditDiff(auditId: string, compareWith?: 'previous' | 'root'): Promise<ReAuditResponse> {
  const url = compareWith ? `/audits/${auditId}/diff?compareWith=${compareWith}` : `/audits/${auditId}/diff`;
  const response = await api.get<{ success: boolean; data: ReAuditResponse; error?: string }>(url);
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to retrieve comparison diff.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but comparison diff payload is missing.');
  }
  return response.data.data;
}

export async function triggerReAudit(
  auditId: string,
  token?: string
): Promise<{ newAuditId: string; newAudit: AuditResult; diff: AuditDiff; ownerToken?: string }> {
  let effectiveToken = token;
  if (!effectiveToken && typeof window !== 'undefined') {
    try {
      effectiveToken = localStorage.getItem(getUserScopedKey(`audit_token_${auditId}`)) || undefined;
    } catch {
      // ignore
    }
  }

  const headers: Record<string, string> = {};
  if (effectiveToken) {
    headers['X-Audit-Token'] = effectiveToken;
  }

  const response = await api.post<{
    success: boolean;
    data: { newAuditId: string; newAudit: AuditResult; diff: AuditDiff; ownerToken?: string };
    error?: string;
  }>(`/audits/${auditId}/re-audit`, {}, { headers });
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to run re-audit.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but re-audit data payload is missing.');
  }
  const data = response.data.data;
  if (data.ownerToken && typeof window !== 'undefined') {
    try {
      localStorage.setItem(getUserScopedKey(`audit_token_${data.newAuditId}`), data.ownerToken);
    } catch {
      // ignore
    }
  }
  return data;
}

export async function submitStackBuilder(request: StackBuilderRequest): Promise<StackRecommendation> {
  const response = await api.post<{ success: boolean; data: StackRecommendation; error?: string }>(
    '/stack-builder',
    request
  );
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to process stack recommendation.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but the recommendation data payload is missing.');
  }
  return response.data.data;
}

// ── Pricing Intelligence — Public Read-Only Endpoints ────────
// No auth required. Fetched by PricingIntelligencePanel on ResultsPage.

/**
 * GET /api/intelligence/pricing-status
 * Returns per-provider pricing sync status and recommendation engine state.
 * PUBLIC endpoint — no admin secret required.
 */
export async function fetchPricingStatus(): Promise<{
  providers: Array<{
    providerId: string;
    displayName: string;
    syncStatus: 'VERIFIED' | 'STALE' | 'FETCH_BLOCKED' | 'PARSE_FAILED' | 'NO_RELIABLE_PUBLIC_SOURCE';
    authorityCategory:
      | 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE'
      | 'AUTHORITATIVE_STATIC_BASELINE'
      | 'STALE'
      | 'NO_RELIABLE_PUBLIC_SOURCE';

    authorityDescription: string;
    lastVerifiedAt: string | null;
    lastCheckedAt: string | null;
    lastSuccessfulCheckAt: string | null;
    consecutiveFailures: number;
    sourceUrl: string | null;
    pricingStrategy: string | null;
    engineStatus: 'APPLIED' | 'SKIPPED' | 'NOT_IN_REGISTRY' | 'UNKNOWN';
    engineReason: string | null;
    plansPatched: number;
  }>;
  summary: {
    totalProviders: number;
    verifiedCount: number;
    staleCount: number;
    blockedCount: number;
    overallHealth: 'ALL_VERIFIED' | 'PARTIAL' | 'DEGRADED';
    overlayLastAppliedAt: string | null;
    lastSuccessfulSyncAt: string | null;
  };
}> {
  const response = await api.get('/intelligence/pricing-status', { timeout: 10_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch pricing status');
  }
  return response.data.data;
}



/**
 * GET /api/intelligence/offers
 * Returns recent new public offers detected from official provider sources.
 * PUBLIC endpoint — no admin secret required.
 * Only genuinely new offers; repeat promotions are deduped by fingerprint.
 */
export async function fetchPublicOffers(): Promise<{
  offers: PublicOffer[];
  count: number;
  note: string;
}> {
  const response = await api.get('/intelligence/offers', { timeout: 10_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch public offers');
  }
  return response.data.data;
}

// ── Analytics & Statistics Endpoints ─────────────────────────

import type {
  TimePeriod,
  AnalyticsOverviewPayload,
  RealtimeAnalyticsPayload,
  HistoricalAnalyticsPayload,
  SearchConsoleAnalyticsPayload,
  DatabaseAnalyticsPayload,
  AnalyticsHealthPayload,
} from '../types/analytics';

export async function fetchAnalyticsOverview(period: TimePeriod = '7days'): Promise<AnalyticsOverviewPayload> {
  const response = await api.get(`/analytics/overview?period=${period}`, { timeout: 15_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch analytics overview');
  }
  return response.data.data;
}

export async function fetchRealtimeAnalytics(): Promise<RealtimeAnalyticsPayload> {
  const response = await api.get('/analytics/realtime', { timeout: 10_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch realtime analytics');
  }
  return response.data.data;
}

export async function fetchHistoricalAnalytics(period: TimePeriod = '7days'): Promise<HistoricalAnalyticsPayload> {
  const response = await api.get(`/analytics/historical?period=${period}`, { timeout: 15_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch historical analytics');
  }
  return response.data.data;
}

export async function fetchSearchConsoleAnalytics(period: TimePeriod = '7days'): Promise<SearchConsoleAnalyticsPayload> {
  const response = await api.get(`/analytics/search-console?period=${period}`, { timeout: 15_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch search console analytics');
  }
  return response.data.data;
}

export async function fetchDatabaseAnalytics(period: TimePeriod = '7days'): Promise<DatabaseAnalyticsPayload> {
  const response = await api.get(`/analytics/database?period=${period}`, { timeout: 10_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch database analytics');
  }
  return response.data.data;
}

export async function fetchAnalyticsHealth(): Promise<AnalyticsHealthPayload> {
  const response = await api.get('/analytics/health', { timeout: 10_000 });
  if (!response?.data?.success) {
    throw new Error(response?.data?.error ?? 'Failed to fetch analytics health');
  }
  return response.data.data;
}


