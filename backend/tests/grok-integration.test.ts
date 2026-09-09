// ============================================================
// Grok / xAI Integration Test — StackSave AI Audit
// Verifies Grok provider resolution, catalog definitions, KnowledgeLoader,
// official source registry, API validation, and audit engine recommendations.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { validateAuditRequest } from '../src/middleware/validation';
import { getToolById, TOOL_CATALOG } from '../src/audit-engine/catalog';
import { PROVIDER_SOURCE_REGISTRY, getProviderSource } from '../src/pricing/sourceRegistry';
import { CANONICAL_PLAN_IDS, isCanonicalPlanId } from '../src/routes/pricing';
import type { AuditRequest } from '../src/types';

describe('Grok / xAI Integration Verification', () => {
  beforeAll(() => {
    KnowledgeLoader.reload();
  });

  it('1. validates grok in validation middleware', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'grok',
          plan: 'supergrok',
          monthlySpend: 30,
          seats: 1,
          useCase: 'mixed',
        },
      ],
      teamSize: 1,
      useCase: 'mixed',
    };

    const validation = validateAuditRequest(req);
    expect(validation.valid).toBe(true);
  });

  it('2. includes all 8 canonical Grok plan IDs in CANONICAL_PLAN_IDS whitelist', () => {
    const grokWhitelistedPlans = Array.from(CANONICAL_PLAN_IDS['grok'] || []);
    expect(grokWhitelistedPlans.length).toBe(8);
    expect(grokWhitelistedPlans).toEqual([
      'free',
      'supergrok_lite',
      'supergrok',
      'supergrok_plus',
      'supergrok_heavy',
      'x_premium',
      'x_premium_plus',
      'api',
    ]);
    expect(isCanonicalPlanId('grok', 'supergrok')).toBe(true);
    expect(isCanonicalPlanId('grok', 'x_premium')).toBe(true);
    expect(isCanonicalPlanId('grok', 'invalid_plan')).toBe(false);
  });

  it('3. audit catalog contains grok with all 8 plans', () => {
    const tool = getToolById('grok');
    expect(tool).toBeDefined();
    expect(tool?.id).toBe('grok');
    expect(tool?.name).toBe('Grok');
    expect(tool?.plans.length).toBe(8);

    const planIds = tool?.plans.map((p) => p.id);
    expect(planIds).toContain('free');
    expect(planIds).toContain('supergrok_lite');
    expect(planIds).toContain('supergrok');
    expect(planIds).toContain('supergrok_plus');
    expect(planIds).toContain('supergrok_heavy');
    expect(planIds).toContain('x_premium');
    expect(planIds).toContain('x_premium_plus');
    expect(planIds).toContain('api');
  });

  it('4. loads Grok provider knowledge files correctly via KnowledgeLoader', () => {
    const provider = KnowledgeLoader.loadProvider('grok');
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe('grok');
    expect(provider?.name).toBe('Grok');
    expect(provider?.vendor).toBe('xAI');

    const plans = KnowledgeLoader.loadPlans('grok');
    expect(plans.length).toBe(8);
    expect(plans.some((p) => p.id === 'supergrok')).toBe(true);
    expect(plans.some((p) => p.id === 'x_premium')).toBe(true);
    expect(plans.some((p) => p.id === 'api')).toBe(true);
  });

  it('5. official source registry maps grok to https://docs.x.ai', () => {
    const source = getProviderSource('grok');
    expect(source).toBeDefined();
    expect(source?.displayName).toBe('Grok');
    expect(source?.pricingUrl).toBe('https://docs.x.ai');
    expect(source?.offersUrl).toBe('https://grok.com');
    expect(source?.strategy).toBe('PLAYWRIGHT_DOM');
  });

  it('6. runs audit with Grok SuperGrok standalone subscription', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'grok',
          plan: 'supergrok',
          monthlySpend: 30,
          seats: 1,
          useCase: 'mixed',
        },
      ],
      teamSize: 1,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.auditId).toBeDefined();
    expect(result.totalMonthlySpend).toBe(30);
    expect(result.tools[0].toolId).toBe('grok');
    expect(result.insights).toBeDefined();
  });

  it('7. runs audit with Grok X Premium platform bundle', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'grok',
          plan: 'x_premium',
          monthlySpend: 16,
          seats: 2,
          useCase: 'research',
        },
      ],
      teamSize: 2,
      useCase: 'research',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(16);
    expect(result.tools[0].toolId).toBe('grok');
    expect(result.tools[0].plan).toBe('x_premium');
  });

  it('8. runs audit with Grok API pay-per-use plan', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'grok',
          plan: 'api',
          monthlySpend: 0,
          seats: 1,
          useCase: 'coding',
        },
      ],
      teamSize: 1,
      useCase: 'coding',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(0);
    expect(result.tools[0].toolId).toBe('grok');
    expect(result.tools[0].plan).toBe('api');
  });

  it('9. zero-pricing protection handles free and api plans cleanly', () => {
    const tool = getToolById('grok');
    const freePlan = tool?.plans.find((p) => p.id === 'free');
    const apiPlan = tool?.plans.find((p) => p.id === 'api');

    expect(freePlan?.monthlyPricePerSeat).toBe(0);
    expect(apiPlan?.monthlyPricePerSeat).toBe(0);
    expect(apiPlan?.isPayPerUse).toBe(true);

    const req: AuditRequest = {
      tools: [
        { toolId: 'grok', plan: 'free', monthlySpend: 0, seats: 5, useCase: 'mixed' },
        { toolId: 'grok', plan: 'api', monthlySpend: 0, seats: 5, useCase: 'coding' },
      ],
      teamSize: 5,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(0);
    expect(result.estimatedMonthlySavings).toBeGreaterThanOrEqual(0);
  });

  it('10. runs multi-tool audit with Grok + Perplexity + DeepSeek + ChatGPT + Claude', () => {
    const req: AuditRequest = {
      tools: [
        { toolId: 'grok', plan: 'supergrok', monthlySpend: 30, seats: 2, useCase: 'mixed' },
        { toolId: 'perplexity', plan: 'pro', monthlySpend: 40, seats: 2, useCase: 'research' },
        { toolId: 'deepseek', plan: 'pro', monthlySpend: 30, seats: 2, useCase: 'coding' },
        { toolId: 'chatgpt', plan: 'plus', monthlySpend: 40, seats: 2, useCase: 'writing' },
        { toolId: 'claude', plan: 'pro', monthlySpend: 40, seats: 2, useCase: 'mixed' },
      ],
      teamSize: 2,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(180);
    expect(result.tools.length).toBe(5);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('11. verifies standard Grok plans are distinct from promotional offers', () => {
    const plans = KnowledgeLoader.loadPlans('grok');
    expect(plans.every((p) => Boolean(p.id))).toBe(true);

    for (const plan of plans) {
      expect(['free', 'supergrok_lite', 'supergrok', 'supergrok_plus', 'supergrok_heavy', 'x_premium', 'x_premium_plus', 'api']).toContain(plan.id);
      expect(typeof plan.label).toBe('string');
    }
  });

  it('12. zero regression on Perplexity, DeepSeek, Claude, and ChatGPT audits', () => {
    const req: AuditRequest = {
      tools: [
        { toolId: 'perplexity', plan: 'pro', monthlySpend: 20, seats: 1, useCase: 'research' },
        { toolId: 'deepseek', plan: 'pro', monthlySpend: 15, seats: 1, useCase: 'coding' },
        { toolId: 'claude', plan: 'pro', monthlySpend: 20, seats: 1, useCase: 'writing' },
        { toolId: 'chatgpt', plan: 'plus', monthlySpend: 20, seats: 1, useCase: 'mixed' },
      ],
      teamSize: 1,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(75);
    expect(result.tools.length).toBe(4);
  });

  it('13. loads model metadata for grok models cleanly', () => {
    const grok4Model = KnowledgeLoader.loadModel('grok', 'grok-4');
    expect(grok4Model).not.toBeNull();
    expect(grok4Model?.modelId).toBe('grok-4');
    expect(grok4Model?.providerId).toBe('grok');
    expect(grok4Model?.name).toBe('Grok 4');
  });
});
