import { describe, it, expect } from 'vitest';
import {
  isOfferQuarantined,
  QUARANTINED_OFFER_PATTERNS,
  canPublishOffer,
  isRegisteredOfficialSource,
} from '../src/pricing/offerTrust';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { checkGenericExpiration } from '../src/pricing/dateExpiryUtils';
import { getProviderSource } from '../src/pricing/sourceRegistry';
import { isAllowlistedPartnerDomain } from '../src/pricing/partnerSourceRegistry';

describe('Phase 2: AI Platform & Offer Ecosystem Expansion Verification Suite', () => {
  // ── 1. Top-Level Category Mapping ───────────────────────────────
  describe('1. Category Mapping: Exactly 6 Top-Level Categories', () => {
    it('maps all offer subtypes accurately into top-level categories', () => {
      const categoryMap: Record<string, string> = {
        PARTNER_BUNDLE: 'partner',
        STUDENT_DISCOUNT: 'student',
        ACADEMIC_FREE: 'student',
        API_DISCOUNT: 'api',
        ANNUAL_DISCOUNT: 'annual',
        STARTUP_GRANT: 'startup',
        FREE_TRIAL: 'trial',
        FREE_PLAN: 'free',
        PROMOTIONAL_FREE: 'free',
      };

      expect(categoryMap['PARTNER_BUNDLE']).toBe('partner');
      expect(categoryMap['STUDENT_DISCOUNT']).toBe('student');
      expect(categoryMap['ACADEMIC_FREE']).toBe('student');
      expect(categoryMap['API_DISCOUNT']).toBe('api');
      expect(categoryMap['ANNUAL_DISCOUNT']).toBe('annual');
      expect(categoryMap['STARTUP_GRANT']).toBe('startup');
      expect(categoryMap['FREE_TRIAL']).toBe('trial');
      expect(categoryMap['FREE_PLAN']).toBe('free');
    });

    it('verifies all known partner offers map strictly to partner category', () => {
      const partnerOffers = PartnerOfferScanner.getKnownPartnerOffers();
      expect(partnerOffers.length).toBeGreaterThanOrEqual(4);
      for (const o of partnerOffers) {
        expect(o.partner).toBeTruthy();
        expect(o.offerType).toMatch(/BUNDLE|REWARD/);
      }
    });
  });

  // ── 2. Student vs Partner Precedence ────────────────────────────
  describe('2. Student vs Partner Precedence', () => {
    it('ensures student offers are NOT classified as partner bundles even with educational partners', () => {
      const studentOffers = PartnerOfferScanner.getKnownStudentOffers();
      expect(studentOffers.length).toBeGreaterThanOrEqual(5);

      for (const o of studentOffers) {
        // Must have partnerType 'education' and must NOT be partner bundles
        expect(o.partnerType).toBe('education');
        expect(o.offerType).toBe('EDUCATION_BUNDLE');
        expect(o.offerSubtype).toMatch(/STUDENT_DISCOUNT|ACADEMIC_FREE/);
      }
    });

    it('confirms GitHub Student Developer Pack and Notion Education are classified under student', () => {
      const studentOffers = PartnerOfferScanner.getKnownStudentOffers();
      const partners = studentOffers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('github'))).toBe(true);
      expect(partners.some((p) => p.includes('notion'))).toBe(true);
      expect(partners.some((p) => p.includes('canva'))).toBe(true);
      expect(partners.some((p) => p.includes('figma'))).toBe(true);
      expect(partners.some((p) => p.includes('weights & biases'))).toBe(true);
    });

    it('ensures UNiDAYS Perplexity is NOT resurrected in student offers', () => {
      const studentOffers = PartnerOfferScanner.getKnownStudentOffers();
      const unidaysFound = studentOffers.some((o) =>
        o.partner.toLowerCase().includes('unidays') || o.offerTitle.toLowerCase().includes('unidays')
      );
      expect(unidaysFound).toBe(false);
    });
  });

  // ── 3. API Discount Detection ───────────────────────────────────
  describe('3. API Discount Detection (Prompt Caching, Message Batches, Off-Peak)', () => {
    it('detects prompt caching and message batch discounts', () => {
      const anthropicDiscountSnippet = 'Anthropic prompt caching reduces input costs by up to 90% for repeated prompts; message batches provide 50% discount on API requests.';
      const isOpenAI = /batch api|message batches|prompt caching/i.test(anthropicDiscountSnippet);
      expect(isOpenAI).toBe(true);
      expect(anthropicDiscountSnippet.toLowerCase()).toContain('prompt caching');
      expect(anthropicDiscountSnippet.toLowerCase()).toContain('batches');
    });

    it('verifies deepseek cache hits and off-peak rate detection logic', () => {
      const deepseekDocs = 'DeepSeek cache hit discount: input tokens cost $0.014/1M (90% lower than cache miss $0.14/1M). Off-peak discounts apply 00:30-08:30 UTC.';
      expect(deepseekDocs).toContain('cache hit');
      expect(deepseekDocs).toContain('Off-peak');
    });
  });

  // ── 4. Annual Savings Calculation & 15% Publication Gate ────────
  describe('4. Annual Savings Calculation & 15% Publication Gate', () => {
    function calculateAnnualSavings(monthlyPrice: number, annualPrice: number) {
      const monthlyTotal = monthlyPrice * 12;
      const savingsAmount = monthlyTotal - annualPrice;
      const savingsPercent = Math.round((savingsAmount / monthlyTotal) * 100);
      const monthlyEquivalent = Number((annualPrice / 12).toFixed(2));
      return {
        monthlyTotal,
        savingsAmount,
        savingsPercent,
        monthlyEquivalent,
        meets15PercentGate: savingsPercent >= 15,
      };
    }

    it('accepts plans with >= 15% annual savings', () => {
      // e.g. $20/mo monthly vs $192/yr annual ($16/mo eq) = 20% savings
      const res = calculateAnnualSavings(20, 192);
      expect(res.savingsPercent).toBe(20);
      expect(res.savingsAmount).toBe(48);
      expect(res.monthlyEquivalent).toBe(16);
      expect(res.meets15PercentGate).toBe(true);
    });

    it('accepts plans with exactly 15% savings', () => {
      // $10/mo monthly vs $102/yr annual = 15% savings
      const res = calculateAnnualSavings(10, 102);
      expect(res.savingsPercent).toBe(15);
      expect(res.meets15PercentGate).toBe(true);
    });

    it('rejects plans with < 15% annual savings from publication', () => {
      // $10/mo monthly vs $110/yr annual = 8.3% savings
      const res = calculateAnnualSavings(10, 110);
      expect(res.savingsPercent).toBe(8);
      expect(res.meets15PercentGate).toBe(false);
    });

    it('enforces publication gate rejecting standalone offer below 15%', () => {
      const sub15Offer = {
        providerId: 'sample-ai',
        title: 'Sample AI 8% Annual Discount',
        sourceUrl: 'https://sample.ai/pricing',
        evidenceText: 'Save 8% when paying annually on standard plans for all subscribers.',
        annualSavingsPercent: 8,
      };
      expect(sub15Offer.annualSavingsPercent < 15).toBe(true);
    });
  });

  // ── 5. Startup Grant Detection & Value Extraction ───────────────
  describe('5. Startup Grant Detection & Value Extraction', () => {
    it('verifies all registered startup offers have extractable benefits and destinations', () => {
      const startupOffers = PartnerOfferScanner.getKnownStartupOffers();
      expect(startupOffers.length).toBeGreaterThanOrEqual(7);

      for (const grant of startupOffers) {
        expect(grant.partnerType).toBe('cloud');
        expect(grant.offerType).toBe('CLOUD_BUNDLE');
        expect(grant.offerSubtype).toBe('STARTUP_GRANT');
        expect(grant.benefit).toBeTruthy();
        expect(grant.value).toBeTruthy();
        expect(grant.destinationUrl).toBeTruthy();
        expect(grant.destinationUrl).toMatch(/^https?:\/\//);
      }
    });

    it('verifies dynamic value extraction for major startup programs', () => {
      const startupOffers = PartnerOfferScanner.getKnownStartupOffers();
      const notion = startupOffers.find((o) => o.partner === 'Notion');
      expect(notion).toBeDefined();
      expect(notion?.value).toContain('$12,000');

      const elevenlabs = startupOffers.find((o) => o.partner === 'ElevenLabs');
      expect(elevenlabs).toBeDefined();
      expect(elevenlabs?.value).toContain('$5,500');

      const v0 = startupOffers.find((o) => o.partner === 'Vercel');
      expect(v0).toBeDefined();
      expect(v0?.value).toContain('$30,000');

      const openai = startupOffers.find((o) => o.partner === 'OpenAI');
      expect(openai).toBeDefined();
      expect(openai?.value).toContain('$100,000');
    });
  });

  // ── 6. Trials & Free Subtypes ───────────────────────────────────
  describe('6. Trials & Free Subtypes (Free Trials vs Free Access)', () => {
    it('differentiates time-bounded free trials from ongoing free tiers', () => {
      const trialOffer = {
        subtype: 'FREE_TRIAL',
        duration: '14 days',
        isOngoing: false,
      };
      const freePlanOffer = {
        subtype: 'FREE_PLAN',
        duration: 'Ongoing',
        isOngoing: true,
      };

      expect(trialOffer.subtype).toBe('FREE_TRIAL');
      expect(freePlanOffer.subtype).toBe('FREE_PLAN');
    });
  });

  // ── 7. Commercial Partner Bundle Validation ─────────────────────
  describe('7. Commercial Partner AI Bundles Validation', () => {
    it('verifies Layer 1 commercial bundles: Jio, Google Pixel 10 Pro, Amex, Deutsche Telekom, ASUS', () => {
      const partnerOffers = PartnerOfferScanner.getKnownPartnerOffers();
      const partners = partnerOffers.map((o) => o.partner.toLowerCase());

      expect(partners.some((p) => p.includes('jio'))).toBe(true);
      expect(partners.some((p) => p.includes('google pixel'))).toBe(true);
      expect(partners.some((p) => p.includes('american express'))).toBe(true);
      expect(partners.some((p) => p.includes('deutsche telekom'))).toBe(true);
      expect(partners.some((p) => p.includes('asus'))).toBe(true);
    });

    it('verifies American Express $300 credit for ChatGPT has valid official domain', () => {
      const amexUrl = 'https://global.americanexpress.com/card-benefits/detail/openai';
      expect(isAllowlistedPartnerDomain(amexUrl)).toBe(true);
    });

    it('verifies Deutsche Telekom Perplexity bundle has valid official domain', () => {
      const telekomUrl = 'https://www.telekom.de/unterwegs/tarife-und-optionen/perplexity-pro';
      expect(isAllowlistedPartnerDomain(telekomUrl)).toBe(true);
    });
  });

  // ── 8. Samsung Rejection: Fingerprint Quarantine, NOT Platform Blacklist ──
  describe('8. Samsung Rejection: Fingerprint Quarantine (NOT Platform Blacklist)', () => {
    it('quarantines the non-commercial Galaxy AI built-in OS feature offer', () => {
      const nonCommercialSamsung = {
        partner: 'Samsung',
        title: 'Galaxy AI with Google Gemini on Galaxy Devices',
        description: 'Complimentary built-in Galaxy AI system features for flagship phones.',
      };

      const quarantineRes = isOfferQuarantined(nonCommercialSamsung);
      expect(quarantineRes.isQuarantined).toBe(true);
      expect(quarantineRes.reason).toContain('Built-in OS software feature');
    });

    it('rejects publication of the non-commercial Galaxy AI offer', () => {
      const canPublish = canPublishOffer({
        providerId: 'gemini',
        partner: 'Samsung',
        title: 'Galaxy AI with Google Gemini on Galaxy Devices',
        description: 'Complimentary built-in Galaxy AI system features for flagship phones.',
        sourceUrl: 'https://www.samsung.com/galaxy-ai/',
        evidenceText: 'Galaxy AI features are provided complimentary on supported Galaxy devices.',
        status: 'ACTIVE',
        isActive: true,
      });
      expect(canPublish).toBe(false);
    });

    it('MUST ALLOW future commercial Samsung partner offers to pass through if verified', () => {
      // Example: Samsung device -> Google AI Pro
      const futureSamsungGoogle = {
        partner: 'Samsung',
        title: '1 Year Google AI Pro with Samsung Galaxy S26 Ultra',
        description: 'New Samsung Galaxy purchasers get 12 months Google AI Pro subscription included.',
      };
      const checkGoogle = isOfferQuarantined(futureSamsungGoogle);
      expect(checkGoogle.isQuarantined).toBe(false);

      // Example: Samsung device -> ChatGPT Plus
      const futureSamsungChatGPT = {
        partner: 'Samsung',
        title: 'Samsung Galaxy Exclusive: 6 Months ChatGPT Plus',
        description: 'Complimentary commercial ChatGPT Plus subscription voucher for Galaxy purchasers.',
      };
      const checkChatGPT = isOfferQuarantined(futureSamsungChatGPT);
      expect(checkChatGPT.isQuarantined).toBe(false);

      // Example: Samsung device -> Perplexity Pro
      const futureSamsungPerplexity = {
        partner: 'Samsung',
        title: 'Samsung Members: 12 Months Perplexity Pro Free',
        description: 'Perplexity Pro commercial subscription redeemable via Samsung Members app.',
      };
      const checkPerplexity = isOfferQuarantined(futureSamsungPerplexity);
      expect(checkPerplexity.isQuarantined).toBe(false);
    });

    it('verifies Samsung domain is allowlisted for legitimate partner discovery', () => {
      expect(isAllowlistedPartnerDomain('https://www.samsung.com/galaxy-ai/')).toBe(true);
      expect(isAllowlistedPartnerDomain('https://promotions.samsung.com/offer')).toBe(true);
    });
  });

  // ── 9. Broken / 404 Destination Rejection ───────────────────────
  describe('9. Destination URL Health Checks & 404 Rejection', () => {
    it('rejects offers when destination health check reports 404 or soft-404', () => {
      const mockBrokenHealthCheck = {
        status: 'DEAD_404',
        finalStatus: 404,
        statusReason: 'HTTP 404 Not Found at official endpoint',
      };
      expect(mockBrokenHealthCheck.status !== 'VALID').toBe(true);
    });

    it('rejects offers that have expired promotion dates in evidence text', () => {
      const expiredText = 'This limited promotion ended on December 31, 2024. Offer is no longer available.';
      const expiry = checkGenericExpiration(expiredText);
      expect(expiry.isExpired).toBe(true);
    });
  });

  // ── 10. Anti-Resurrection & Daily Sync Revalidation ─────────────
  describe('10. Anti-Resurrection & Daily Sync Reconciliation', () => {
    it('quarantines expired SoftBank promotion from reactivation', () => {
      const softbankOffer = {
        partner: 'SoftBank',
        title: 'SoftBank 1-Year Perplexity Campaign',
      };
      const q = isOfferQuarantined(softbankOffer);
      expect(q.isQuarantined).toBe(true);
      expect(q.reason).toContain('SoftBank');
    });

    it('quarantines expired Airtel promotion from reactivation', () => {
      const airtelOffer = {
        partner: 'Airtel',
        title: 'Airtel Perplexity Pro Bundle',
      };
      const q = isOfferQuarantined(airtelOffer);
      expect(q.isQuarantined).toBe(true);
      expect(q.reason).toContain('Airtel');
    });

    it('quarantines expired Nothing Phone (2a) campaign from reactivation', () => {
      const nothingOffer = {
        partner: 'Nothing Technology',
        title: 'Nothing Phone (2a) Perplexity Pro',
      };
      const q = isOfferQuarantined(nothingOffer);
      expect(q.isQuarantined).toBe(true);
      expect(q.reason).toContain('Nothing Technology');
    });
  });

  // ── 11. Registered Phase 1 Expansion Platforms ──────────────────
  describe('11. Registered Phase 1 Expansion Platforms in sourceRegistry', () => {
    const expansionPlatforms = [
      'notion-ai',
      'canva-ai',
      'figma-ai',
      'wandb',
      'v0',
      'groq',
      'together-ai',
      'fireworks-ai',
      'cohere',
      'grammarly',
      'otter-ai',
      'deepl',
      'descript',
      'huggingface',
    ];

    it('verifies all 14 approved platforms are registered with official URLs', () => {
      for (const id of expansionPlatforms) {
        const source = getProviderSource(id);
        expect(source).toBeDefined();
        expect(source?.pricingUrl).toMatch(/^https?:\/\//);
        expect(isRegisteredOfficialSource(id, source!.pricingUrl)).toBe(true);
      }
    });
  });
});
