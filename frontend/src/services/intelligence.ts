// ============================================================
// Intelligence Service — Frontend API Client Wrapper
// ============================================================

import axios from 'axios';
import type { ToolEntry, UseCase } from '../types';
import type { StackIntelligenceResult } from '../types/intelligence';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname.includes('stacksave-round2-frontend.onrender.com')) {
      return 'https://stacksave-round2-backend.onrender.com/api';
    }
    if (hostname.includes('onrender.com')) {
      return window.location.origin.replace('-frontend', '-backend') + '/api';
    }
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchStackIntelligence(
  tools: ToolEntry[],
  useCase: UseCase = 'coding'
): Promise<StackIntelligenceResult> {
  const response = await api.post<{ success: boolean; data: StackIntelligenceResult; error?: string }>(
    '/intelligence/audit-analysis',
    { tools, useCase }
  );

  if (!response || !response.data) {
    throw new Error('No response received from intelligence server.');
  }

  if (response.data.success === false) {
    throw new Error(response.data.error || 'Failed to fetch intelligence analysis.');
  }

  if (!response.data.data) {
    throw new Error('Server returned success, but intelligence payload was missing.');
  }

  return response.data.data;
}
