import { describe, it, expect, beforeAll } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { validateAuditRequest } from '../src/middleware/validation';
import { getToolById, TOOL_CATALOG } from '../src/audit-engine/catalog';
import { PROVIDER_SOURCE_REGISTRY, getProviderSource } from '../src/pricing/sourceRegistry';
import { CANONICAL_PLAN_IDS, isCanonicalPlanId } from '../src/routes/pricing';
import type { AuditRequest } from '../src/types';

describe('Muse (Meta) integration', () => {
  beforeAll(() => {
    KnowledgeLoader.reload();
  });

  it('registers single canonical provider with id "muse", vendor "Meta", display name "Muse (Meta)", and category "ide"', () => {
    const tool = getToolById('muse');
    expect(tool).toBeDefined();
    expect(tool?.id).toBe('muse');
    expect(tool?.name).toBe('Muse (Meta)');
    expect(tool?.category).toBe('ide');

    const provider = KnowledgeLoader.loadProvider('muse');
    expect(provider).toBeDefined();
    expect(provider?.id).toBe('muse');
    expect(provider?.name).toBe('Muse (Meta)');
    expect(provider?.vendor).toBe('Meta');
    expect(provider?.category).toBe('ide');
  });

  it('does not register unverified separate providers for Muse surfaces', () => {
    expect(getToolById('muse-code' as never)).toBeUndefined();
    expect(getToolById('muse-api' as never)).toBeUndefined();
    expect(getToolById('muse-agent' as never)).toBeUndefined();
    expect(getToolById('meta-api' as never)).toBeUndefined();
    expect(getToolById('meta-ai' as never)).toBeUndefined();
    expect(KnowledgeLoader.getProvider('muse-code')).toBeNull();
    expect(KnowledgeLoader.getProvider('muse-api')).toBeNull();
  });

  it('validates audit requests containing muse plans and rejects invalid tools', () => {
    const validRes = validateAuditRequest({
      tools: [{ toolId: 'muse', plan: 'muse-code-cli', monthlySpend: 0, seats: 1, useCase: 'coding' }],
      teamSize: 1,
      useCase: 'coding',
    } as AuditRequest);
    expect(validRes.valid).toBe(true);

    const invalidRes = validateAuditRequest({
      tools: [{ toolId: 'muse-code' as never, plan: 'default', monthlySpend: 0, seats: 1, useCase: 'coding' }],
      teamSize: 1,
      useCase: 'coding',
    } as AuditRequest);
    expect(invalidRes.valid).toBe(false);
  });

  it('loads exact verified plan specifications and pricing semantics', () => {
    const plans = KnowledgeLoader.loadPlans('muse');
    expect(plans).toHaveLength(4);

    const codeCli = plans.find((p) => p.id === 'muse-code-cli');
    expect(codeCli).toMatchObject({
      id: 'muse-code-cli',
      monthlyPricePerSeat: 0,
      planSurface: 'ide',
      tierRank: 1,
      isPayPerUse: false,
    });

    const standardApi = plans.find((p) => p.id === 'model-api-standard');
    expect(standardApi).toMatchObject({
      id: 'model-api-standard',
      monthlyPricePerSeat: 0,
      planSurface: 'api',
      tierRank: 1,
      isPayPerUse: true,
      tokenPricing: {
        input: 1.25,
        cachedInput: 0.15,
        output: 4.25,
      },
    });

    const contributorApi = plans.find((p) => p.id === 'model-api-contributor');
    expect(contributorApi).toMatchObject({
      id: 'model-api-contributor',
      monthlyPricePerSeat: 0,
      planSurface: 'api',
      tierRank: 0,
      isPayPerUse: true,
      tokenPricing: {
        input: 0.10,
        cachedInput: 0.002,
        output: 0.20,
      },
    });

    const freeAgent = plans.find((p) => p.id === 'muse-free');
    expect(freeAgent).toMatchObject({
      id: 'muse-free',
      monthlyPricePerSeat: 0,
      planSurface: 'consumer',
      tierRank: 0,
      isPayPerUse: false,
    });
  });

  it('omits fabricated annual pricing metadata across all Muse plans', () => {
    const plans = KnowledgeLoader.loadPlans('muse');
    for (const plan of plans) {
      expect((plan as any).annualDiscountPercent).toBeUndefined();
      expect((plan as any).annualPricePerSeat).toBeUndefined();
    }
  });

  it('loads verified Muse Spark 1.3 and legacy Muse Spark 1.2 model knowledge', () => {
    const spark13 = KnowledgeLoader.loadModel('muse', 'muse-spark-1-3');
    expect(spark13).toBeDefined();
    expect(spark13?.modelId).toBe('muse-spark-1-3');
    expect(spark13?.name).toBe('Muse Spark 1.3');
    expect(spark13?.releaseDate).toBe('2026-09-02');
    expect(spark13?.capabilities?.coding?.score).toBeGreaterThanOrEqual(8);
    expect(spark13?.capabilities?.reasoning?.score).toBeGreaterThanOrEqual(8);
    expect(spark13?.capabilities?.vision?.score).toBeGreaterThanOrEqual(8);
    expect(spark13?.capabilities?.aiAgent?.score).toBeGreaterThanOrEqual(8);

    const spark12 = KnowledgeLoader.loadModel('muse', 'muse-spark-1-2');
    expect(spark12).toBeDefined();
    expect(spark12?.modelId).toBe('muse-spark-1-2');
    expect(spark12?.name).toBe('Muse Spark 1.2');
  });

  it('registers canonical source registry entries with official Meta documentation URLs', () => {
    const source = getProviderSource('muse');
    expect(source).toBeDefined();
    expect(source?.displayName).toBe('Muse (Meta)');
    expect(source?.pricingUrl).toBe('https://dev.meta.ai/docs/pricing-rate-limits');
    expect(source?.offersUrl).toBe('https://dev.meta.ai/docs/pricing-rate-limits');
    expect(source?.secondaryOfferUrls?.map((u) => u.url)).toContain('https://about.fb.com/news/2026/09/meta-muse-ai/');
    expect(source?.secondaryOfferUrls?.map((u) => u.url)).toContain('https://muse.meta.ai/code');
    expect(source?.secondaryOfferUrls?.map((u) => u.url)).toContain('https://muse.meta.ai');
  });

  it('verifies canonical plan IDs set and isCanonicalPlanId helper', () => {
    expect(CANONICAL_PLAN_IDS.muse).toEqual(
      new Set(['muse-code-cli', 'model-api-standard', 'model-api-contributor', 'muse-free'])
    );
    expect(isCanonicalPlanId('muse', 'muse-code-cli')).toBe(true);
    expect(isCanonicalPlanId('muse', 'model-api-standard')).toBe(true);
    expect(isCanonicalPlanId('muse', 'model-api-contributor')).toBe(true);
    expect(isCanonicalPlanId('muse', 'muse-free')).toBe(true);
    expect(isCanonicalPlanId('muse', 'pro')).toBe(false);
    expect(isCanonicalPlanId('muse', 'enterprise')).toBe(false);
  });

  it('enforces conservative governance metadata with zero unverified enterprise compliance claims', () => {
    const plansKnowledge = KnowledgeLoader.getProvider('muse');
    const enterprise = (plansKnowledge as any)?.enterprise;
    if (enterprise?.compliance) {
      expect(enterprise.compliance.soc2).toBe(false);
      expect(enterprise.compliance.hipaa).toBe(false);
      expect(enterprise.compliance.iso27001).toBe(false);
    }
  });

  it('maintains strict "NO EVIDENCE = NO PUBLIC OFFER" invariant with no fabricated offers', () => {
    const plansKnowledge = KnowledgeLoader.getProvider('muse');
    expect((plansKnowledge as any)?.offers ?? []).toHaveLength(0);
  });

  it('seamlessly executes audit engine with muse in single and multi-tool scenarios', () => {
    const request: AuditRequest = {
      tools: [
        { toolId: 'muse', plan: 'muse-code-cli', monthlySpend: 0, seats: 5, useCase: 'coding' },
        { toolId: 'cursor', plan: 'pro', monthlySpend: 20, seats: 5, useCase: 'coding' },
        { toolId: 'glm', plan: 'pro', monthlySpend: 80, seats: 5, useCase: 'coding' },
        { toolId: 'windsurf', plan: 'pro', monthlySpend: 15, seats: 5, useCase: 'coding' },
      ],
      teamSize: 5,
      useCase: 'coding',
    };

    const result = runAudit(request, '', 'http://localhost:3000');
    expect(result.tools.map((t) => t.toolId)).toContain('muse');
    expect(getToolById('muse')?.name).toBe('Muse (Meta)');
    expect(result.insights).toBeDefined();
    expect(result.totalMonthlySpend).toBe(115); // 0 + 20 + 80 + 15 = 115
  });
});
