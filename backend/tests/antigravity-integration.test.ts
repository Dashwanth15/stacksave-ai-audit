// ============================================================
// Google Antigravity Integration Test — StackSave AI Audit
// Verifies Antigravity provider resolution, catalog definitions, KnowledgeLoader,
// official source registry, API validation, audit engine, and enterprise governance.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { validateAuditRequest } from '../src/middleware/validation';
import { getToolById, TOOL_CATALOG } from '../src/audit-engine/catalog';
import { PROVIDER_SOURCE_REGISTRY, getProviderSource } from '../src/pricing/sourceRegistry';
import { CANONICAL_PLAN_IDS, isCanonicalPlanId } from '../src/routes/pricing';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import type { AuditRequest } from '../src/types';
import type { StackBuilderRequest } from '../src/types/stackBuilder';

describe('Google Antigravity Integration Verification', () => {
  beforeAll(() => {
    KnowledgeLoader.reload();
  });

  it('1. validates antigravity in validation middleware', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'antigravity',
          plan: 'pro',
          monthlySpend: 20,
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

  it('2. includes all 5 canonical Antigravity plan IDs in CANONICAL_PLAN_IDS whitelist', () => {
    const antigravityWhitelistedPlans = Array.from(CANONICAL_PLAN_IDS['antigravity'] || []);
    expect(antigravityWhitelistedPlans.length).toBe(5);
    expect(antigravityWhitelistedPlans).toEqual([
      'free',
      'pro',
      'ultra_100',
      'ultra_200',
      'organization',
    ]);
    expect(isCanonicalPlanId('antigravity', 'free')).toBe(true);
    expect(isCanonicalPlanId('antigravity', 'pro')).toBe(true);
    expect(isCanonicalPlanId('antigravity', 'ultra_100')).toBe(true);
    expect(isCanonicalPlanId('antigravity', 'ultra_200')).toBe(true);
    expect(isCanonicalPlanId('antigravity', 'organization')).toBe(true);
    expect(isCanonicalPlanId('antigravity', 'invalid_plan')).toBe(false);
  });

  it('3. audit catalog contains antigravity with all 5 plans', () => {
    const tool = getToolById('antigravity');
    expect(tool).toBeDefined();
    expect(tool?.id).toBe('antigravity');
    expect(tool?.name).toBe('Google Antigravity');
    expect(tool?.category).toBe('ide');
    expect(tool?.plans.length).toBe(5);

    const planIds = tool?.plans.map((p) => p.id);
    expect(planIds).toContain('free');
    expect(planIds).toContain('pro');
    expect(planIds).toContain('ultra_100');
    expect(planIds).toContain('ultra_200');
    expect(planIds).toContain('organization');

    // Monthly pricing verified from official source. Annual pricing NOT verified — not present.
    const proPlan = tool?.plans.find((p) => p.id === 'pro');
    expect(proPlan?.monthlyPricePerSeat).toBe(20);
    expect(proPlan?.annualPricePerSeat).toBeUndefined();

    const ultra100 = tool?.plans.find((p) => p.id === 'ultra_100');
    expect(ultra100?.monthlyPricePerSeat).toBe(100);
    expect(ultra100?.annualPricePerSeat).toBeUndefined();

    const ultra200 = tool?.plans.find((p) => p.id === 'ultra_200');
    expect(ultra200?.monthlyPricePerSeat).toBe(200);
    expect(ultra200?.annualPricePerSeat).toBeUndefined();

    // Organization: Google Cloud consumption surface — isPayPerUse flag must be set, $0 seat is not a real seat price.
    const orgPlan = tool?.plans.find((p) => p.id === 'organization');
    expect(orgPlan?.monthlyPricePerSeat).toBe(0);
    expect(orgPlan?.isPayPerUse).toBe(true);
  });

  it('4. loads Antigravity provider knowledge files correctly via KnowledgeLoader', () => {
    const provider = KnowledgeLoader.loadProvider('antigravity');
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe('antigravity');
    expect(provider?.name).toBe('Google Antigravity');
    expect(provider?.vendor).toBe('Google');
    expect(provider?.category).toBe('ide');
    expect(provider?.apiSupport).toBe(true);

    const plans = KnowledgeLoader.loadPlans('antigravity');
    expect(plans.length).toBe(5);
    expect(plans.some((p) => p.id === 'free' && p.tierRank === 0 && p.planSurface === 'antigravity-seat')).toBe(true);
    expect(plans.some((p) => p.id === 'pro' && p.tierRank === 1 && p.planSurface === 'antigravity-seat')).toBe(true);
    expect(plans.some((p) => p.id === 'ultra_100' && p.tierRank === 2 && p.planSurface === 'antigravity-seat')).toBe(true);
    expect(plans.some((p) => p.id === 'ultra_200' && p.tierRank === 3 && p.planSurface === 'antigravity-seat')).toBe(true);
    expect(plans.some((p) => p.id === 'organization' && p.tierRank === 4 && p.planSurface === 'google-cloud-enterprise' && p.isEnterprise === true)).toBe(true);
  });

  it('5. loads Antigravity Gemini 2.5 Pro model profile', () => {
    const model = KnowledgeLoader.loadModel('antigravity', 'gemini-2-5-pro');
    expect(model).not.toBeNull();
    expect(model?.modelId).toBe('gemini-2-5-pro');
    expect(model?.providerId).toBe('antigravity');
    expect(model?.name).toBe('Gemini 2.5 Pro');
    expect(model?.capabilities.coding?.score).toBe(9);
    expect(model?.capabilities.aiAgent?.score).toBe(10);
    expect(model?.capabilities.multiFileEditing?.score).toBe(10);
    expect(model?.capabilities.terminalIntegration?.score).toBe(10);
    expect(model?.capabilities.planning?.score).toBe(10);
    expect(model?.capabilities.ideIntegration?.score).toBe(10);
  });

  it('6. official source registry maps antigravity to official URLs', () => {
    const source = getProviderSource('antigravity');
    expect(source).toBeDefined();
    expect(source?.displayName).toBe('Google Antigravity');
    expect(source?.pricingUrl).toBe('https://antigravity.google/pricing');
    expect(source?.offersUrl).toBe('https://antigravity.google/docs/plans');
    expect(source?.strategy).toBe('PLAYWRIGHT_DOM');
  });

  it('7. runs audit with Antigravity Pro subscription', () => {
    const req: AuditRequest = {
      tools: [
        {
          toolId: 'antigravity',
          plan: 'pro',
          monthlySpend: 20,
          seats: 1,
          useCase: 'coding',
        },
      ],
      teamSize: 1,
      useCase: 'coding',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.auditId).toBeDefined();
    expect(result.totalMonthlySpend).toBe(20);
    expect(result.tools[0].toolId).toBe('antigravity');
    expect(result.tools[0].plan).toBe('pro');
    expect(result.insights).toBeDefined();
  });

  it('8. runs audit with Antigravity Ultra plans and Free plan', () => {
    const req: AuditRequest = {
      tools: [
        { toolId: 'antigravity', plan: 'free', monthlySpend: 0, seats: 2, useCase: 'coding' },
        { toolId: 'antigravity', plan: 'ultra_100', monthlySpend: 100, seats: 1, useCase: 'coding' },
        { toolId: 'antigravity', plan: 'ultra_200', monthlySpend: 200, seats: 1, useCase: 'coding' },
        { toolId: 'antigravity', plan: 'organization', monthlySpend: 0, seats: 5, useCase: 'coding' },
      ],
      teamSize: 9,
      useCase: 'coding',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(300);
    expect(result.tools.length).toBe(4);
  });

  it('9. enforces strict governance gating: developer seat tiers do NOT satisfy governance while organization plan does', () => {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const govEntry = featureMap.features['enterprise-governance'];
    const ssoEntry = featureMap.features['enterprise-sso'];

    const profiles = KnowledgeLoader.getAllProviders();
    const antigravityProfile = profiles.find((p) => p.id === 'antigravity');
    expect(antigravityProfile).toBeDefined();

    // The required tier for enterprise governance and SSO on Antigravity must be tierRank 4 (Organization)
    const requiredGovTier = StackCoverageAnalyzer.planGateTierRank(antigravityProfile as any, govEntry);
    expect(requiredGovTier).toBe(4);

    const requiredSsoTier = StackCoverageAnalyzer.planGateTierRank(antigravityProfile as any, ssoEntry);
    expect(requiredSsoTier).toBe(4);

    // Free (0), Pro (1), Ultra (2, 3) must be strictly below requiredGovTier (4)
    const freePlan = KnowledgeLoader.loadPlans('antigravity').find((p) => p.id === 'free')!;
    const proPlan = KnowledgeLoader.loadPlans('antigravity').find((p) => p.id === 'pro')!;
    const ultra100Plan = KnowledgeLoader.loadPlans('antigravity').find((p) => p.id === 'ultra_100')!;
    const ultra200Plan = KnowledgeLoader.loadPlans('antigravity').find((p) => p.id === 'ultra_200')!;
    const orgPlan = KnowledgeLoader.loadPlans('antigravity').find((p) => p.id === 'organization')!;

    expect(freePlan.tierRank).toBeLessThan(requiredGovTier!);
    expect(proPlan.tierRank).toBeLessThan(requiredGovTier!);
    expect(ultra100Plan.tierRank).toBeLessThan(requiredGovTier!);
    expect(ultra200Plan.tierRank).toBeLessThan(requiredGovTier!);
    expect(orgPlan.tierRank).toBe(requiredGovTier);
  });

  it('10. participates properly in AIStackRecommendationEngine for software engineering stacks', () => {
    const req: StackBuilderRequest = {
      domain: 'software-engineering',
      strategy: 'balanced',
      requirements: ['editor-code-generation', 'automated-task-execution'],
      monthlyBudget: 500,
      teamSize: 5,
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false,
      },
    };

    const res = AIStackRecommendationEngine.run(req);
    expect(res.stacks.bestOverall).toBeDefined();
    expect(res.stacks.bestOverall.primary.category).toBe('ide');
    // Primary must be an established IDE (cursor, windsurf, github-copilot, or antigravity)
    expect(['cursor', 'windsurf', 'github-copilot', 'antigravity']).toContain(res.stacks.bestOverall.primary.toolId);
  });

  it('11. runs multi-tool audit with Antigravity + Cursor + Claude + Gemini', () => {
    const req: AuditRequest = {
      tools: [
        { toolId: 'antigravity', plan: 'pro', monthlySpend: 20, seats: 2, useCase: 'coding' },
        { toolId: 'cursor', plan: 'pro', monthlySpend: 20, seats: 2, useCase: 'coding' },
        { toolId: 'claude', plan: 'pro', monthlySpend: 20, seats: 2, useCase: 'writing' },
        { toolId: 'gemini', plan: 'google-ai-pro', monthlySpend: 20, seats: 2, useCase: 'mixed' },
      ],
      teamSize: 2,
      useCase: 'mixed',
    };

    const result = runAudit(req, '', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(80);
    expect(result.tools.length).toBe(4);
    // Antigravity and Gemini remain distinct tools
    expect(result.tools.map((t) => t.toolId)).toContain('antigravity');
    expect(result.tools.map((t) => t.toolId)).toContain('gemini');
  });
});
