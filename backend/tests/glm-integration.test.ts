import { describe, it, expect, beforeAll } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { validateAuditRequest } from '../src/middleware/validation';
import { getToolById } from '../src/audit-engine/catalog';
import { PROVIDER_SOURCE_REGISTRY, getProviderSource } from '../src/pricing/sourceRegistry';
import { CANONICAL_PLAN_IDS, isCanonicalPlanId } from '../src/routes/pricing';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import type { AuditRequest } from '../src/types';

describe('GLM (Z.ai) integration', () => {
  beforeAll(() => {
    KnowledgeLoader.reload();
  });

  it('registers the canonical provider and IDE category', () => {
    const tool = getToolById('glm');
    expect(tool?.id).toBe('glm');
    expect(tool?.name).toBe('GLM (Z.ai)');
    expect(tool?.category).toBe('ide');
    expect(validateAuditRequest({
      tools: [{ toolId: 'glm', plan: 'lite', monthlySpend: 18, seats: 1, useCase: 'coding' }],
      teamSize: 1,
      useCase: 'coding',
    } as AuditRequest).valid).toBe(true);
  });

  it('loads current GLM provider and model knowledge', () => {
    const provider = KnowledgeLoader.loadProvider('glm');
    expect(provider?.id).toBe('glm');
    expect(provider?.category).toBe('ide');
    expect(provider?.name).toBe('GLM (Z.ai)');
    expect(KnowledgeLoader.loadModel('glm', 'glm-5-3')?.name).toBe('GLM-5.3');
    expect(KnowledgeLoader.loadModel('glm', 'glm-5-3-flash')?.name).toBe('GLM-5.3-Flash');
  });

  it('preserves exact coding-plan monthly and annual pricing semantics', () => {
    const plans = KnowledgeLoader.loadPlans('glm');
    expect(plans.find((p) => p.id === 'lite')).toMatchObject({ monthlyPricePerSeat: 18, annualPricePerSeat: 12.6, tierRank: 1, planSurface: 'glm-coding' });
    expect(plans.find((p) => p.id === 'pro')).toMatchObject({ monthlyPricePerSeat: 80, annualPricePerSeat: 56, tierRank: 2, planSurface: 'glm-coding' });
    expect(plans.find((p) => p.id === 'max')).toMatchObject({ monthlyPricePerSeat: 168, annualPricePerSeat: 117.6, tierRank: 3, planSurface: 'glm-coding' });
    expect(plans.find((p) => p.id === 'api')).toMatchObject({ monthlyPricePerSeat: 0, tierRank: 0, planSurface: 'zai-api', isPayPerUse: true });
  });

  it('keeps API and enterprise surfaces separate from the coding subscription ladder', () => {
    const plans = KnowledgeLoader.loadPlans('glm');
    const api = plans.find((p) => p.id === 'api');
    const enterprise = plans.find((p) => p.id === 'enterprise');
    expect(api).toMatchObject({ planSurface: 'zai-api', monthlyPricePerSeat: 0, isPayPerUse: true, tierRank: 0 });
    expect(api?.isEnterprise).not.toBe(true);
    expect(enterprise).toMatchObject({ planSurface: 'zai-enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, isEnterprise: true, tierRank: 4 });
    expect(plans.filter((p) => p.planSurface === 'glm-coding').map((p) => p.tierRank)).toEqual([1, 2, 3]);
  });

  it('isolates enterprise governance from individual plans', () => {
    const profile = KnowledgeLoader.getProvider('glm');
    const featureMap = KnowledgeLoader.getFeatureMap();
    const governanceTier = StackCoverageAnalyzer.planGateTierRank(profile as any, featureMap.features['enterprise-governance']);
    const ssoTier = StackCoverageAnalyzer.planGateTierRank(profile as any, featureMap.features['enterprise-sso']);
    expect(governanceTier).toBe(4);
    expect(ssoTier).toBe(4);
    for (const plan of KnowledgeLoader.loadPlans('glm').filter((p) => p.id !== 'enterprise')) {
      expect(plan.tierRank ?? 0).toBeLessThan(4);
    }
  });

  it('registers official sources and canonical API plan IDs only', () => {
    const source = getProviderSource('glm');
    expect(source?.pricingUrl).toBe('https://z.ai/pricing');
    expect(source?.secondaryOfferUrls?.map((entry) => entry.url)).toEqual([
      'https://z.ai/model-api',
      'https://docs.z.ai',
      'https://zcode.z.ai/en',
    ]);
    expect(CANONICAL_PLAN_IDS.glm).toEqual(new Set(['lite', 'pro', 'max', 'enterprise', 'api']));
    expect(isCanonicalPlanId('glm', 'api')).toBe(true);
    expect(isCanonicalPlanId('glm', 'zcode')).toBe(false);
  });

  it('runs the existing audit and recommendation input path without provider-specific behavior', () => {
    const request: AuditRequest = {
      tools: [
        { toolId: 'glm', plan: 'pro', monthlySpend: 80, seats: 2, useCase: 'coding' },
        { toolId: 'cursor', plan: 'pro', monthlySpend: 20, seats: 2, useCase: 'coding' },
        { toolId: 'windsurf', plan: 'pro', monthlySpend: 15, seats: 2, useCase: 'coding' },
        { toolId: 'github-copilot', plan: 'business', monthlySpend: 19, seats: 2, useCase: 'coding' },
        { toolId: 'antigravity', plan: 'pro', monthlySpend: 20, seats: 2, useCase: 'coding' },
      ],
      teamSize: 10,
      useCase: 'coding',
    };
    const result = runAudit(request, '', 'http://localhost:3000');
    expect(result.tools.map((tool) => tool.toolId)).toContain('glm');
    expect(result.insights).toBeDefined();
  });

  it('does not register ZCode as a provider', () => {
    expect(getToolById('zcode' as never)).toBeUndefined();
    expect(KnowledgeLoader.getProvider('zcode')).toBeNull();
  });
});
