// ============================================================
// API Service — StackSave AI Audit
// Axios instance + typed API call wrappers
// ============================================================

import axios from 'axios';
import { AuditRequest, AuditResult, LeadCaptureRequest } from '../types';

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
  (error) => {
    const message =
      error.response?.data?.error ||
      error.message ||
      'Something went wrong. Please try again.';
    return Promise.reject(new Error(message));
  }
);

// ── API Functions ─────────────────────────────────────────────

export async function submitAudit(request: AuditRequest): Promise<AuditResult> {
  const response = await api.post<{ success: boolean; data: AuditResult }>('/audits', request);
  return response.data.data!;
}

export async function fetchAudit(auditId: string): Promise<AuditResult> {
  const response = await api.get<{ success: boolean; data: AuditResult }>(`/audits/${auditId}`);
  return response.data.data!;
}

export async function captureLead(request: LeadCaptureRequest): Promise<void> {
  await api.post('/leads', request);
}

export async function checkHealth(): Promise<{ status: string; db: string }> {
  const response = await api.get('/health');
  return response.data;
}
