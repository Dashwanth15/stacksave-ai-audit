// ============================================================
// DeepSeek End-to-End Integration Test — StackSave AI Audit
// Verifies DeepSeek provider resolution, calculation, and audit engine recommendations
// ============================================================

import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { validateAuditRequest } from '../src/middleware/validation';
import type { AuditRequest } from '../src/types';

describe('DeepSeek End-to-End Integration Verification', () => {
  it('1. validates DeepSeek in validation middleware', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'deepseek',
          plan: 'pro',
          monthlySpend: 15,
          seats: 1,
          useCase: 'coding',
        },
      ],
      teamSize: 1,
      useCase: 'coding',
    };

    const validation = validateAuditRequest(req);
    expect(validation.valid).toBe(true);
  });

  it('2. loads DeepSeek knowledge correctly', () => {
    const provider = KnowledgeLoader.loadProvider('deepseek');
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe('deepseek');
    expect(provider?.name).toBe('DeepSeek');

    const plans = KnowledgeLoader.loadPlans('deepseek');
    expect(plans.length).toBeGreaterThan(0);
    expect(plans.some((p) => p.id === 'pro')).toBe(true);
  });

  it('3. runs audit with DeepSeek only', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'deepseek',
          plan: 'pro',
          monthlySpend: 15,
          seats: 1,
          useCase: 'coding',
        },
      ],
      teamSize: 1,
      useCase: 'coding',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.auditId).toBeDefined();
    expect(result.totalMonthlySpend).toBe(15);
    expect(result.tools[0].toolId).toBe('deepseek');
    expect(result.insights).toBeDefined();
  });

  it('4. runs audit with DeepSeek + ChatGPT', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'deepseek',
          plan: 'pro',
          monthlySpend: 15,
          seats: 2,
          useCase: 'coding',
        },
        {
          toolId: 'chatgpt',
          plan: 'plus',
          monthlySpend: 40,
          seats: 2,
          useCase: 'writing',
        },
      ],
      teamSize: 2,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(55);
    expect(result.tools.length).toBe(2);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('5. runs audit with DeepSeek + Claude', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'deepseek',
          plan: 'pro',
          monthlySpend: 15,
          seats: 3,
          useCase: 'coding',
        },
        {
          toolId: 'claude',
          plan: 'pro',
          monthlySpend: 60,
          seats: 3,
          useCase: 'writing',
        },
      ],
      teamSize: 3,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(75);
    expect(result.tools.length).toBe(2);
    expect(result.insights.length).toBeGreaterThan(0);
  });
});
