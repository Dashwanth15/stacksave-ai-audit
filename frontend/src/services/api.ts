// ============================================================
// API Service — StackSave AI Audit
// Axios instance + typed API call wrappers
// ============================================================

import axios from 'axios';
import type { AuditRequest, AuditResult, LeadCaptureRequest, ReAuditResponse } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
  return response.data.data;
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

export async function fetchAuditDiff(auditId: string): Promise<ReAuditResponse> {
  const response = await api.get<{ success: boolean; data: ReAuditResponse; error?: string }>(`/audits/${auditId}/diff`);
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
  auditId: string
): Promise<{ newAuditId: string; newAudit: AuditResult; diff: any }> {
  const response = await api.post<{
    success: boolean;
    data: { newAuditId: string; newAudit: AuditResult; diff: any };
    error?: string;
  }>(`/audits/${auditId}/re-audit`);
  if (!response || !response.data) {
    throw new Error('No response received from the server.');
  }
  if (response.data.success === false) {
    throw new Error(response.data.error || 'Server failed to run re-audit.');
  }
  if (!response.data.data) {
    throw new Error('Server returned success, but re-audit data payload is missing.');
  }
  return response.data.data;
}


