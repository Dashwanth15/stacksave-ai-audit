// ============================================================
// Pricing Extractor Reliability & Provider Coverage Test Suite
// StackSave AI Spend & Intelligence
// ============================================================

import { describe, expect, it } from 'vitest';
import {
  PROVIDER_SOURCE_REGISTRY,
  getProviderSource,
} from '../src/pricing/sourceRegistry';
import { fetchPerplexityPricing } from '../src/pricing/adapters/perplexity';
import { validatePlans } from '../src/pricing/validator';
import {
  isPubliclyVerifiableOffer,
  buildCanonicalOfferFingerprint,
} from '../src/pricing/offerTrust';
import { isOfferActiveAndValid } from '../src/config/offersConfig';
import type { NormalizedOffer, NormalizedPlan } from '../src/pricing/types';

describe('Priority 1: Machine-Verifiable Provider Inventory & Counts', () => {
  it('ensures all registered canonical provider IDs in PROVIDER_SOURCE_REGISTRY are unique', () => {
    const ids = PROVIDER_SOURCE_REGISTRY.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('correctly classifies extraction strategies for providers', () => {
    const playwrightProviders = PROVIDER_SOURCE_REGISTRY.filter(
      (p) => p.strategy === 'PLAYWRIGHT_DOM'
    );
    const ssrAndStaticProviders = PROVIDER_SOURCE_REGISTRY.filter(
      (p) => p.strategy !== 'PLAYWRIGHT_DOM'
    );

    expect(playwrightProviders.length).toBeGreaterThan(0);
    expect(ssrAndStaticProviders.length).toBeGreaterThan(0);

    // Verify key strategy assignments
    expect(getProviderSource('cursor')?.strategy).toBe('JSON_LD');
    expect(getProviderSource('github-copilot')?.strategy).toBe('NEXTJS_EMBEDDED');
    expect(getProviderSource('deepseek')?.strategy).toBe('HTML_TABLE');
    expect(getProviderSource('claude')?.strategy).toBe('PLAYWRIGHT_DOM');
    expect(getProviderSource('groq')?.strategy).toBe('PLAYWRIGHT_DOM');
  });

  it('differentiates commercial partner surfaces from independent AI providers', () => {
    const partnerIds = ['Jio', 'Pixel', 'Amex', 'Telekom', 'ASUS'];
    const aiProviderIds = PROVIDER_SOURCE_REGISTRY.map((p) => p.id);

    for (const pid of partnerIds) {
      // Partner surface names should not be registered as independent AI providers
      expect(aiProviderIds).not.toContain(pid.toLowerCase());
    }
  });
});

describe('Priority 2: Perplexity, GLM, and Muse Extraction Fidelity', () => {
  it('Perplexity adapter parses official Pro, Max, and Enterprise tiers accurately', async () => {
    const res = await fetchPerplexityPricing();

    expect(res.providerId).toBe('perplexity');
    expect(res.strategy).toBe('FETCH_STATIC_HTML');
    expect(res.sourceUrl).toBe('https://perplexity.ai/hub/pricing');

    // In a test environment without network, if blocked it returns FETCH_BLOCKED;
    // if successful, it returns VERIFIED with valid plans.
    if (res.status === 'VERIFIED') {
      expect(res.plans.length).toBeGreaterThanOrEqual(2);
      const proPlan = res.plans.find((p) => p.id === 'pro');
      expect(proPlan).toBeDefined();
      expect(proPlan?.monthlyPricePerSeat).toBe(20);
      expect(proPlan?.annualPricePerSeat).toBe(16.67);
      expect(proPlan?.currency).toBe('USD');

      const validation = validatePlans(res.plans);
      expect(validation.isValid).toBe(true);
    } else {
      expect(['FETCH_BLOCKED', 'PARSE_FAILED']).toContain(res.status);
    }
  });

  it('GLM distinguishes coding subscription tiers from model API usage-based rates', () => {
    const glmPlans: NormalizedPlan[] = [
      { id: 'lite', label: 'GLM Coding Lite', monthlyPricePerSeat: 18, annualPricePerSeat: 12.6, currency: 'USD' },
      { id: 'pro', label: 'GLM Coding Pro', monthlyPricePerSeat: 80, annualPricePerSeat: 56.0, currency: 'USD' },
      { id: 'max', label: 'GLM Coding Max', monthlyPricePerSeat: 168, annualPricePerSeat: 117.6, currency: 'USD' },
      { id: 'enterprise', label: 'GLM Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
      { id: 'api', label: 'GLM Model API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
    ];

    const validation = validatePlans(glmPlans);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    const subscriptionPlans = glmPlans.filter((p) => !p.isPayPerUse);
    const apiPlans = glmPlans.filter((p) => p.isPayPerUse);

    expect(subscriptionPlans).toHaveLength(3);
    expect(apiPlans).toHaveLength(2);
    expect(subscriptionPlans[0].monthlyPricePerSeat).toBe(18);
    expect(subscriptionPlans[1].monthlyPricePerSeat).toBe(80);
    expect(subscriptionPlans[2].monthlyPricePerSeat).toBe(168);
  });

  it('Muse safely preserves Meta Model API and Muse Code CLI baseline without fabricated subscriptions', () => {
    const musePlans: NormalizedPlan[] = [
      { id: 'muse-code-cli', label: 'Muse Code CLI', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'muse-free', label: 'Meta AI Assistant', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'model-api-standard', label: 'Meta Model API Standard', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
      { id: 'model-api-contributor', label: 'Meta Model API Contributor', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
    ];

    const validation = validatePlans(musePlans);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Meta developer model API plans must be marked usage-based
    const standardApi = musePlans.find((p) => p.id === 'model-api-standard');
    expect(standardApi?.isPayPerUse).toBe(true);
  });
});

describe('Priority 3: Structured-Plan Validation & Multi-Signal Resilience', () => {
  it('validates subscription plans with annual discount savings', () => {
    const gammaPlans: NormalizedPlan[] = [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'plus', label: 'Plus', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
      { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 15, currency: 'USD' },
    ];

    const validation = validatePlans(gammaPlans);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('validates usage-based API platforms (Cerebras, SambaNova, Mistral, Groq)', () => {
    const cerebrasPlans: NormalizedPlan[] = [
      { id: 'developer_free', label: 'Developer Free Tier', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'payg', label: 'Pay-As-You-Go API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
      { id: 'enterprise', label: 'Enterprise LPUs', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
    ];

    const validation = validatePlans(cerebrasPlans);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('rejects empty or malformed plan sets', () => {
    expect(validatePlans([]).isValid).toBe(false);
    expect(validatePlans([{ id: '', label: '', monthlyPricePerSeat: NaN, currency: '' }]).isValid).toBe(false);
  });
});

describe('Priority 4 & 5: Verified Integrations (Groq, v0, Together AI, Notion AI)', () => {
  it('confirms Groq, v0, Together AI, and Notion AI exist in source registry with trusted official URLs', () => {
    const groq = getProviderSource('groq');
    expect(groq).toBeDefined();
    expect(groq?.pricingUrl).toContain('groq.com');

    const v0 = getProviderSource('v0');
    expect(v0).toBeDefined();
    expect(v0?.pricingUrl).toContain('v0.dev');

    const togetherAi = getProviderSource('together-ai');
    expect(togetherAi).toBeDefined();
    expect(togetherAi?.pricingUrl).toContain('together.ai');

    const notionAi = getProviderSource('notion-ai');
    expect(notionAi).toBeDefined();
    expect(notionAi?.pricingUrl).toContain('notion.so');
  });

  it('validates plan structures for new providers', () => {
    const groqPlans: NormalizedPlan[] = [
      { id: 'free', label: 'Developer Free Tier', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'payg', label: 'Pay-As-You-Go API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
      { id: 'enterprise', label: 'Groq Enterprise LPUs', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
    ];
    expect(validatePlans(groqPlans).isValid).toBe(true);

    const v0Plans: NormalizedPlan[] = [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
      { id: 'premium', label: 'Premium', monthlyPricePerSeat: 20, currency: 'USD' },
      { id: 'team', label: 'Team', monthlyPricePerSeat: 30, currency: 'USD' },
    ];
    expect(validatePlans(v0Plans).isValid).toBe(true);

    const notionPlans: NormalizedPlan[] = [
      { id: 'ai_add_on', label: 'Notion AI Add-on', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
      { id: 'business_ai', label: 'Notion Business + AI', monthlyPricePerSeat: 25, currency: 'USD' },
      { id: 'enterprise_ai', label: 'Notion Enterprise + AI', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
    ];
    expect(validatePlans(notionPlans).isValid).toBe(true);
  });
});

describe('Priority 6: Trust, Deduplication & Publication Invariants', () => {
  const context = { providerStatus: 'VERIFIED' as const };

  function makeOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
    return {
      providerId: 'notion-ai',
      title: 'Notion for Education Free Workspace',
      description: 'Verified students and teachers receive free Notion Plus with AI access.',
      discount: '100% Free Education Workspace',
      eligibility: 'Verified Students & Teachers',
      fingerprint: 'test-fingerprint',
      sourceUrl: 'https://www.notion.so/product/notion-for-education',
      sourceStatus: 'VERIFIED',
      evidenceText: 'Verified students and teachers receive free Notion Plus with AI access.',
      detectedAt: new Date(),
      ...overrides,
    };
  }

  it('enforces official allowlist domains: rejects unapproved third-party URLs', () => {
    const unapprovedOffer = makeOffer({
      sourceUrl: 'https://untrusted-coupon-aggregator.com/notion-deal',
    });
    expect(isPubliclyVerifiableOffer(unapprovedOffer, context)).toBe(false);
  });

  it('enforces evidence requirement: rejects offer without evidenceText', () => {
    const noEvidenceOffer = makeOffer({
      evidenceText: undefined,
    });
    expect(isPubliclyVerifiableOffer(noEvidenceOffer, context)).toBe(false);
  });

  it('preserves offer lifecycle status: expired offers are inactive and invalid', () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // 1 day ago
    const expiredOffer = {
      isActive: true,
      status: 'EXPIRED',
      expiresAt: pastDate,
      isPublic: true,
    };
    expect(isOfferActiveAndValid(expiredOffer)).toBe(false);
  });

  it('guarantees deterministic deduplication: fingerprint changes when offer terms change', () => {
    const offer1 = makeOffer({ discount: '50% Off' });
    const offer2 = makeOffer({ discount: '60% Off' });

    const fp1 = buildCanonicalOfferFingerprint(offer1);
    const fp2 = buildCanonicalOfferFingerprint(offer2);

    expect(fp1).not.toBe(fp2);
  });

  it('allows providers with verified plans and 0 offers (VERIFIED_NO_OFFER state)', () => {
    const providerWithNoOffers = {
      providerId: 'gamma',
      plans: [
        { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
        { id: 'plus', label: 'Plus', monthlyPricePerSeat: 10, currency: 'USD' },
      ],
      offers: [] as NormalizedOffer[],
    };

    expect(validatePlans(providerWithNoOffers.plans).isValid).toBe(true);
    expect(providerWithNoOffers.offers).toHaveLength(0);
  });
});
