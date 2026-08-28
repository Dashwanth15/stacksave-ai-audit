// ============================================================
// Intelligence Service — Frontend API Client Wrapper
// ============================================================

import axios from 'axios';
import type { ToolEntry, UseCase } from '../types';
import type { StackIntelligenceResult } from '../types/intelligence';
import { getBaseUrl } from './api';

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
