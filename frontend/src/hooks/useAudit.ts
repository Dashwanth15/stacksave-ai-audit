// ============================================================
// useAudit Hook — StackSave AI Audit
//
// Encapsulates audit submission and fetching logic.
// Separates API concerns from UI components.
// ============================================================

import { useState, useCallback } from 'react';
import type { AuditRequest, AuditResult } from '../types';
import { submitAudit, fetchAudit } from '../services/api';

interface UseAuditReturn {
  audit: AuditResult | null;
  loading: boolean;
  error: string | null;
  runAudit: (request: AuditRequest) => Promise<AuditResult | null>;
  loadAudit: (auditId: string) => Promise<void>;
  clearError: () => void;
}

export function useAudit(initialAudit?: AuditResult | null): UseAuditReturn {
  const [audit, setAudit] = useState<AuditResult | null>(initialAudit ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAudit = useCallback(async (request: AuditRequest): Promise<AuditResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitAudit(request);
      setAudit(result);
      return result;
    } catch (err) {
      const message = (err as Error).message || 'Failed to run audit. Please try again.';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async (auditId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAudit(auditId);
      setAudit(result);
    } catch (err) {
      setError((err as Error).message || 'Audit not found.');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { audit, loading, error, runAudit, loadAudit, clearError };
}
