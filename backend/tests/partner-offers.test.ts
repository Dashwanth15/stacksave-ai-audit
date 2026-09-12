import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_REGISTERED_PARTNERS,
  isAllowlistedPartnerDomain,
  canonicalizeAiProvider,
} from '../src/pricing/partnerSourceRegistry';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { PartnerDiscoveryService, isAiBenefit } from '../src/pricing/partnerDiscoveryService';
import { canPublishOffer, hashOfferEvidence } from '../src/pricing/offerTrust';

// ── Frontend classification helper re-implemented for testing ─────────────────
// Mirrors the priority logic in frontend/src/utils/offerFormatter.ts

const COMMERCIAL_PARTNER_TYPES = new Set([
  'telecom', 'broadband', 'devices', 'banking', 'credit_card', 'membership',
]);
const EDUCATION_OFFER_TYPES = new Set([
  'EDUCATION_BUNDLE', 'STUDENT_BUNDLE', 'ACADEMIC_BUNDLE',
]);
const STARTUP_OFFER_TYPES = new Set([
  'CLOUD_BUNDLE', 'STARTUP_BUNDLE', 'ACCELERATOR_BUNDLE', 'INCUBATOR_BUNDLE',
  'GRANT_BUNDLE', 'FOUNDER_BUNDLE',
]);

type OfferCategory = 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';

function classifyOffer(
  title: string,
  desc: string,
  eligibility: string,
  partner: string | null = null,
  offerType: string | null = null,
  partnerType: string | null = null,
): OfferCategory {
  const combined = `${title} ${desc} ${eligibility}`.toLowerCase();
  const offerTypeUpper = (offerType || '').toUpperCase();
  const partnerTypeLower = (partnerType || '').toLowerCase();

  // Priority 1: Student / Education
  if (
    partnerTypeLower === 'education' ||
    EDUCATION_OFFER_TYPES.has(offerTypeUpper) ||
    combined.includes('student') || combined.includes('educat') ||
    combined.includes('teacher') || combined.includes('k-12') ||
    combined.includes('university') || combined.includes('campus') ||
    combined.includes('sheerid') || combined.includes('.edu')
  ) return 'student';

  // Priority 2: Startup / Grant
  if (
    STARTUP_OFFER_TYPES.has(offerTypeUpper) ||
    partnerTypeLower === 'cloud' ||
    (partnerTypeLower === 'developer' && (
      combined.includes('startup') || combined.includes('founder') ||
      combined.includes('accelerator') || combined.includes('incubator')
    )) ||
    combined.includes('startup') || combined.includes('accelerator') ||
    combined.includes('founder') || combined.includes('incubator') ||
    combined.includes('grant')
  ) return 'startup';

  // Priority 3: API Discount
  if (
    combined.includes('api') || combined.includes('batch') ||
    combined.includes('prompt caching') || combined.includes('cache read') ||
    combined.includes('off-peak') ||
    (combined.includes('token') && !combined.includes('access token'))
  ) return 'api';

  // Priority 4: Annual Savings
  if (
    combined.includes('annual') || combined.includes('billed annually') ||
    combined.includes('subscription savings')
  ) return 'annual';

  // Priority 5: Trial / Free Trial
  if (combined.includes('trial') || combined.includes('preview')) return 'trial';

  // Priority 6: Partner Bundle (requires BOTH commercial partner type AND AI benefit)
  const hasCommercialPartnerType = partner != null && COMMERCIAL_PARTNER_TYPES.has(partnerTypeLower);
  const hasAiBenefit =
    combined.includes('ai subscription') || combined.includes('ai subscriptions') ||
    combined.includes('ai software') || combined.includes('ai pro') ||
    combined.includes('ai plan') || combined.includes('ai credit') ||
    combined.includes('ai tool') || combined.includes('ai assistant') ||
    combined.includes('gemini') || combined.includes('perplexity') ||
    combined.includes('chatgpt') || combined.includes('claude') ||
    combined.includes('copilot') || combined.includes('cursor') ||
    combined.includes('deepseek') || combined.includes('grok') ||
    combined.includes('windsurf') || combined.includes('galaxy ai') ||
    combined.includes('google ai');

  if (hasCommercialPartnerType && hasAiBenefit) return 'partner';

  if (combined.includes('free') || combined.includes('100%')) return 'free';
  return 'free';
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Partner AI Offers Architecture & Validation', () => {
  beforeEach(() => {
    PartnerDiscoveryService.clear();
  });

  // ── 1. Partner Source Registry & Canonical Provider Mapping ──────────────
  describe('1. Partner Source Registry & Canonical Provider Mapping', () => {
    it('contains registered partner configurations across diverse industries', () => {
      expect(INITIAL_REGISTERED_PARTNERS.length).toBeGreaterThanOrEqual(10);
      const categories = new Set(INITIAL_REGISTERED_PARTNERS.map((p) => p.category));
      expect(categories.has('telecom')).toBe(true);
      expect(categories.has('broadband')).toBe(true);
      expect(categories.has('devices')).toBe(true);
      expect(categories.has('banking')).toBe(true);
    });

    it('accurately validates official partner domains and rejects third-party blogs', () => {
      expect(isAllowlistedPartnerDomain('https://www.jio.com/en-in/plans/google-gemini-offer')).toBe(true);
      expect(isAllowlistedPartnerDomain('https://www.airtel.in/thanks-rewards/perplexity')).toBe(true);
      expect(isAllowlistedPartnerDomain('https://store.google.com/product/pixel_9_pro')).toBe(true);
      expect(isAllowlistedPartnerDomain('https://www.samsung.com/us/galaxy-ai/')).toBe(true);
      expect(isAllowlistedPartnerDomain('https://random-tech-blog.com/jio-free-gemini')).toBe(false);
      expect(isAllowlistedPartnerDomain('https://coupons-aggregator.xyz/perplexity-deal')).toBe(false);
    });

    it('correctly maps partner AI references to canonical AI provider entities', () => {
      expect(canonicalizeAiProvider('Google AI Pro').displayName).toBe('Google Gemini');
      expect(canonicalizeAiProvider('Google One AI Premium').providerId).toBe('gemini');
      expect(canonicalizeAiProvider('Perplexity Pro').displayName).toBe('Perplexity');
      expect(canonicalizeAiProvider('GitHub Copilot').displayName).toBe('GitHub Copilot');
      expect(canonicalizeAiProvider('ChatGPT Plus').displayName).toBe('ChatGPT');
    });
  });

  // ── 2. Backend Offer Data Structure Verification ──────────────────────────
  describe('2. Backend Offer Data: getKnownPartnerOffers()', () => {
    it('contains only genuine commercial partner AI bundles (telecom/device/banking/broadband)', () => {
      const offers = PartnerOfferScanner.getKnownPartnerOffers();
      expect(offers.length).toBeGreaterThan(0);

      const validTypes = new Set(['telecom', 'broadband', 'devices', 'banking', 'credit_card', 'membership']);
      for (const offer of offers) {
        expect(
          validTypes.has(offer.partnerType),
          `${offer.partner} has partnerType "${offer.partnerType}" which is not a commercial partner type`
        ).toBe(true);
      }
    });

    it('does NOT contain GitHub Student, UNiDAYS, or any education offers', () => {
      const offers = PartnerOfferScanner.getKnownPartnerOffers();
      const partners = offers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('github student'))).toBe(false);
      expect(partners.some((p) => p.includes('unidays'))).toBe(false);
      const types = offers.map((o) => o.partnerType);
      expect(types.includes('education')).toBe(false);
    });

    it('does NOT contain Microsoft Startups, AWS Activate, or Google Cloud Startups', () => {
      const offers = PartnerOfferScanner.getKnownPartnerOffers();
      const partners = offers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('microsoft for startups'))).toBe(false);
      expect(partners.some((p) => p.includes('aws activate'))).toBe(false);
      expect(partners.some((p) => p.includes('google cloud for startups'))).toBe(false);
      const types = offers.map((o) => o.partnerType);
      expect(types.includes('cloud')).toBe(false);
    });

    it('contains Jio, Airtel, Samsung, Google Pixel, American Express, JioFiber', () => {
      const offers = PartnerOfferScanner.getKnownPartnerOffers();
      const partners = offers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('jio') && !p.includes('jiofiber'))).toBe(true);
      expect(partners.some((p) => p.includes('airtel') && !p.includes('xstream'))).toBe(true);
      expect(partners.some((p) => p.includes('samsung'))).toBe(true);
      expect(partners.some((p) => p.includes('google pixel'))).toBe(true);
      expect(partners.some((p) => p.includes('jiofiber'))).toBe(true);
    });
  });

  describe('3. Backend Offer Data: getKnownStudentOffers()', () => {
    it('contains GitHub Copilot Student and UNiDAYS Perplexity offers', () => {
      const offers = PartnerOfferScanner.getKnownStudentOffers();
      expect(offers.length).toBeGreaterThanOrEqual(2);
      const partners = offers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('github student'))).toBe(true);
      expect(partners.some((p) => p.includes('unidays'))).toBe(true);
    });

    it('all student offers have partnerType=education and EDUCATION_BUNDLE offerType', () => {
      const offers = PartnerOfferScanner.getKnownStudentOffers();
      for (const offer of offers) {
        expect(offer.partnerType).toBe('education');
        expect(offer.offerType).toMatch(/EDUCATION_BUNDLE|STUDENT_BUNDLE|ACADEMIC_BUNDLE/);
      }
    });
  });

  describe('4. Backend Offer Data: getKnownStartupOffers()', () => {
    it('contains Microsoft Startups, AWS Activate, Google Cloud Startups', () => {
      const offers = PartnerOfferScanner.getKnownStartupOffers();
      expect(offers.length).toBeGreaterThanOrEqual(3);
      const partners = offers.map((o) => o.partner.toLowerCase());
      expect(partners.some((p) => p.includes('microsoft for startups'))).toBe(true);
      expect(partners.some((p) => p.includes('aws activate'))).toBe(true);
      expect(partners.some((p) => p.includes('google cloud for startups'))).toBe(true);
    });

    it('all startup offers have partnerType=cloud and CLOUD_BUNDLE offerType', () => {
      const offers = PartnerOfferScanner.getKnownStartupOffers();
      for (const offer of offers) {
        expect(offer.partnerType).toBe('cloud');
        expect(offer.offerType).toMatch(/CLOUD_BUNDLE|STARTUP_BUNDLE/);
      }
    });
  });

  // ── 5. Frontend Classification: Partner Bundle positive cases ─────────────
  describe('5. Classification: Partner Bundle — must classify correctly', () => {
    it('TC-01: Jio → Gemini → Partner Bundles', () => {
      const cat = classifyOffer(
        'Google AI Pro with Jio 5G',
        'Get 18 months of Google AI Pro (Gemini Advanced) included with eligible Jio 5G plans.',
        'Eligible Jio Unlimited 5G Users',
        'Jio',
        'TELECOM_BUNDLE',
        'telecom',
      );
      expect(cat).toBe('partner');
    });

    it('TC-02: Airtel → Perplexity → Partner Bundles', () => {
      const cat = classifyOffer(
        'Perplexity Pro with Airtel Thanks',
        'Get 12 months of Perplexity Pro access with Airtel Thanks Gold & Platinum.',
        'Airtel Thanks Gold & Platinum Customers',
        'Airtel',
        'TELECOM_BUNDLE',
        'telecom',
      );
      expect(cat).toBe('partner');
    });

    it('TC-03: Broadband provider → AI subscription → Partner Bundles', () => {
      const cat = classifyOffer(
        'Google AI Pro Included with JioFiber',
        'Complimentary 12-month Google AI Pro subscription bundled with JioFiber broadband plans.',
        'New and renewing JioFiber subscribers',
        'JioFiber',
        'BROADBAND_BUNDLE',
        'broadband',
      );
      expect(cat).toBe('partner');
    });

    it('TC-04: Device manufacturer → AI subscription → Partner Bundles', () => {
      const cat = classifyOffer(
        'Galaxy AI with Google Gemini on Galaxy Devices',
        'Complimentary access to Galaxy AI features and Google Gemini on eligible Galaxy flagship devices.',
        'Galaxy S24, Z Fold/Flip & Tab S9 owners',
        'Samsung',
        'DEVICE_BUNDLE',
        'devices',
      );
      expect(cat).toBe('partner');
    });

    it('TC-05: Phone device → AI subscription → Partner Bundles', () => {
      const cat = classifyOffer(
        '1 Year Google One AI Premium with Google Pixel',
        'Get 1 full year of Google One AI Premium (Gemini Advanced) included with Pixel 9 Pro.',
        'New Pixel 9 Pro purchasers',
        'Google Pixel',
        'DEVICE_BUNDLE',
        'devices',
      );
      expect(cat).toBe('partner');
    });

    it('TC-06: Credit card / bank → AI subscription → Partner Bundles', () => {
      const cat = classifyOffer(
        'Amex Business Platinum Technology & AI Credits',
        'Statement credits toward AI subscriptions and software tools for cardmembers.',
        'American Express Business Platinum Cardmembers',
        'American Express',
        'BANKING_REWARD',
        'banking',
      );
      expect(cat).toBe('partner');
    });
  });

  // ── 6. Classification: Student — must win over Partner ────────────────────
  describe('6. Classification: Student & Education — must NOT be classified as Partner Bundles', () => {
    it('TC-07: GitHub Copilot Student → Student & Education', () => {
      const cat = classifyOffer(
        'GitHub Copilot Free for Verified Students',
        '100% free access to GitHub Copilot AI pair programmer for verified students via GitHub Education.',
        'Verified Students & Educators (.edu)',
        'GitHub Student Developer Pack',
        'EDUCATION_BUNDLE',
        'education',
      );
      expect(cat).toBe('student');
    });

    it('TC-08: UNiDAYS Perplexity Pro Student → Student & Education', () => {
      const cat = classifyOffer(
        'Perplexity Pro Student Discount via UNiDAYS',
        'Special academic rates and trial months for Perplexity Pro for verified university students.',
        'Verified university students on UNiDAYS',
        'UNiDAYS',
        'EDUCATION_BUNDLE',
        'education',
      );
      expect(cat).toBe('student');
    });

    it('TC-09: Google Student AI bundle → Student & Education', () => {
      const cat = classifyOffer(
        'Google AI Student Bundle Promotion',
        'Students save big on Google AI Pro with access to Gemini and YouTube Premium Lite bundled in.',
        'Verified Students (.edu)',
        null,
        null,
        null,
      );
      expect(cat).toBe('student');
    });

    it('TC-10: Generic student AI offer → Student & Education even with partner field', () => {
      const cat = classifyOffer(
        'ChatGPT Plus Free for Students',
        'OpenAI offers ChatGPT Plus at no charge for eligible university students.',
        'Verified students with .edu email',
        'OpenAI Education',  // has a partner field
        'EDUCATION_BUNDLE',
        'education',
      );
      expect(cat).toBe('student');
    });
  });

  // ── 7. Classification: Startup Grants — must win over Partner ────────────
  describe('7. Classification: Startup Grants — must NOT be classified as Partner Bundles', () => {
    it('TC-11: Microsoft for Startups → Startup Grants', () => {
      const cat = classifyOffer(
        'Up to $150,000 Azure AI & OpenAI Credits',
        'Free OpenAI API credits and Microsoft Azure cloud compute for qualified startups building AI applications.',
        'Early-stage tech startups (Pre-seed to Series A)',
        'Microsoft for Startups Founders Hub',
        'CLOUD_BUNDLE',
        'cloud',
      );
      expect(cat).toBe('startup');
    });

    it('TC-12: AWS Activate → Startup Grants', () => {
      const cat = classifyOffer(
        'Up to $100,000 AWS Activate AI Credits',
        'Complimentary AWS Cloud and Amazon Bedrock credits covering Claude 3.5 Sonnet for startups.',
        'Affiliated startup founders and incubators',
        'AWS Activate',
        'CLOUD_BUNDLE',
        'cloud',
      );
      expect(cat).toBe('startup');
    });

    it('TC-13: Google Cloud for Startups → Startup Grants', () => {
      const cat = classifyOffer(
        'Up to $200,000 Google Cloud AI Startup Program',
        'Receive Google Cloud and Vertex AI credits to power Gemini models for startups.',
        'Funded AI and SaaS technology startups',
        'Google Cloud for Startups',
        'CLOUD_BUNDLE',
        'cloud',
      );
      expect(cat).toBe('startup');
    });

    it('TC-14: OpenAI for Startups API Credits → Startup Grants', () => {
      const cat = classifyOffer(
        'OpenAI for Startups API Credits Program',
        'Early-stage startup founders receive between $5,000 and $100,000 in API usage credits through venture and accelerator partners.',
        'Early-Stage Startups',
        null,
        null,
        null,
      );
      expect(cat).toBe('startup');
    });
  });

  // ── 8. Classification: API Discounts ─────────────────────────────────────
  describe('8. Classification: API Discounts', () => {
    it('TC-15: API token discount → API Discounts', () => {
      const cat = classifyOffer(
        'Claude API Prompt Caching — 90% Off Cache Reads',
        'Cache frequently used prompt prefixes and pay 90% less on cache read tokens.',
        'API Developers',
      );
      expect(cat).toBe('api');
    });

    it('TC-16: Batch API pricing → API Discounts', () => {
      const cat = classifyOffer(
        'OpenAI Batch API — 50% Discount',
        'Process large workloads through the Batch API at half the standard per-token price.',
        'All API users',
      );
      expect(cat).toBe('api');
    });
  });

  // ── 9. Classification: Annual Savings ────────────────────────────────────
  describe('9. Classification: Annual Savings', () => {
    it('TC-17: Annual AI subscription discount → Annual Savings', () => {
      const cat = classifyOffer(
        'Save 20% — ChatGPT Plus Billed Annually',
        'Subscribe to ChatGPT Plus with an annual plan and save 20% compared to monthly billing.',
        'All Users',
      );
      expect(cat).toBe('annual');
    });
  });

  // ── 10. Classification: Trials & Free ────────────────────────────────────
  describe('10. Classification: Trials & Free', () => {
    it('TC-18: AI free trial → Trials & Free', () => {
      const cat = classifyOffer(
        'Claude Pro — 14-Day Free Trial',
        'Start your 14-day free trial of Claude Pro. No card required.',
        'New users',
      );
      expect(cat).toBe('trial');
    });

    it('TC-19: ChatGPT free trial with partner field → still trial, not partner', () => {
      const cat = classifyOffer(
        'ChatGPT Plus 30-Day Free Trial',
        'Try ChatGPT Plus free for 30 days with full access.',
        'New subscribers',
        'OpenAI',   // has a partner field but is still a free trial
        null,
        null,
      );
      expect(cat).toBe('trial');
    });
  });

  // ── 11. Negative Tests: NOT Partner Bundles ───────────────────────────────
  describe('11. Negative Classification: Must NOT be Partner Bundles', () => {
    it('TC-20: Netflix bundle with telecom → NOT Partner Bundles (no AI benefit)', () => {
      const cat = classifyOffer(
        'Netflix Included with Airtel Plan',
        'Get Netflix streaming included free with Airtel premium plans.',
        'Airtel postpaid customers',
        'Airtel',
        'TELECOM_BUNDLE',
        'telecom',
      );
      // Netflix has no AI benefit → hasAiBenefit=false → should not be partner
      expect(cat).not.toBe('partner');
    });

    it('TC-21: Spotify bundle → NOT Partner Bundles (no AI benefit)', () => {
      const cat = classifyOffer(
        'Spotify Premium Free with Jio Plan',
        'Get Spotify Premium included with eligible Jio recharge packs.',
        'Jio prepaid users',
        'Jio',
        'TELECOM_BUNDLE',
        'telecom',
      );
      expect(cat).not.toBe('partner');
    });

    it('TC-22: Airport lounge → NOT Partner Bundles', () => {
      const cat = classifyOffer(
        'Priority Pass Lounge Access with Amex Platinum',
        'Unlimited complimentary airport lounge access at 1,300+ locations worldwide.',
        'American Express Platinum cardmembers',
        'American Express',
        'BANKING_REWARD',
        'banking',
      );
      expect(cat).not.toBe('partner');
    });

    it('TC-23: keyword "partner" alone in title → NOT Partner Bundles', () => {
      const cat = classifyOffer(
        'AI Partner Savings Program',
        'Learn about our partner savings ecosystem and how to benefit from it.',
        'All users',
      );
      // No commercial partnerType, no explicit AI benefit → should not be partner
      expect(cat).not.toBe('partner');
    });

    it('TC-24: keyword "bundle" alone in title → NOT Partner Bundles', () => {
      const cat = classifyOffer(
        'Bundle Savings on YouTube Premium Lite',
        'Students save big on YouTube Premium Lite bundled in.',
        'Verified students',
      );
      // Contains "student" → should be student
      expect(cat).toBe('student');
    });

    it('TC-25: AI integration announcement without commercial bundle → NOT Partner Bundles', () => {
      const cat = classifyOffer(
        'Notion AI Integration with OpenAI',
        'Notion now integrates with OpenAI GPT-4 for smarter workspace features.',
        'All Notion users',
      );
      // No partner, no partnerType — just an AI feature announcement
      expect(cat).not.toBe('partner');
    });

    it('TC-26: Normal cloud storage bundle → NOT Partner Bundles (no AI)', () => {
      const cat = classifyOffer(
        '2TB Cloud Storage with Samsung Galaxy',
        'Get 2TB of cloud storage free for 1 year with Galaxy flagship device purchase.',
        'Galaxy S24 and S25 owners',
        'Samsung',
        'DEVICE_BUNDLE',
        'devices',
      );
      // No AI benefit mentioned → should not be partner
      expect(cat).not.toBe('partner');
    });
  });

  // ── 12. Discovery Candidate Pipeline ─────────────────────────────────────
  describe('12. Automated Discovery Candidate Pipeline', () => {
    it('evaluates and normalizes candidates with high-confidence official evidence', () => {
      const candidate = PartnerDiscoveryService.ingestCandidate({
        partnerName: 'Reliance Jio',
        sourceUrl: 'https://www.jio.com/en-in/5g/google-one-offer',
        possibleAiProvider: 'Google Gemini',
        possibleAiPlan: 'Google AI Pro',
        benefit: '18 Months FREE Gemini Advanced',
        offerTitle: 'Jio Welcome Offer: 18 Months Google AI Pro with 2TB Cloud Storage',
        offerDescription: 'Eligible Jio 5G customers get 18 months free Google AI Pro subscription with Gemini Advanced models.',
        eligibility: 'Active Jio 5G Unlimited Plan customers',
        duration: '18 months',
        category: 'telecom',
        discoveryMethod: 'ECOSYSTEM_HUB',
      });

      const evaluation = PartnerDiscoveryService.evaluateCandidate(candidate);
      expect(evaluation.promoted).toBe(true);
      expect(evaluation.offer).toBeDefined();
      expect(evaluation.offer?.partner).toBe('Reliance Jio');
      expect(evaluation.offer?.aiProvider).toBe('gemini');
      expect(evaluation.offer?.aiProviderDisplayName).toBe('Google Gemini');
    });

    it('rejects candidates with missing essential terms or unverified sources', () => {
      const invalidCandidate = PartnerDiscoveryService.ingestCandidate({
        partnerName: 'Unknown Blog',
        sourceUrl: 'https://fake-deals-hub.com/free-ai',
        possibleAiProvider: 'Unknown AI',
        possibleAiPlan: 'Pro',
        benefit: '',
        offerTitle: 'Free AI maybe',
        offerDescription: 'Check it out maybe free',
        eligibility: '',
        duration: '',
        category: 'other',
        discoveryMethod: 'SEARCH_SIGNAL',
      });

      const evaluation = PartnerDiscoveryService.evaluateCandidate(invalidCandidate);
      expect(evaluation.promoted).toBe(false);
      expect(evaluation.discardReason).toBeDefined();
    });
  });

  // ── 13. isAiBenefit Gate ──────────────────────────────────────────────────
  describe('13. isAiBenefit AI relevance gate', () => {
    it('approves genuine AI offer descriptions', () => {
      expect(isAiBenefit('Get 12 Months Free Google AI Pro and 2TB cloud storage', '')).toBe(true);
      expect(isAiBenefit('1 Year of Perplexity Pro included with premium plan', '')).toBe(true);
      expect(isAiBenefit('Free GitHub Copilot student subscription', '')).toBe(true);
      expect(isAiBenefit('Complimentary Gemini Advanced access with device', '')).toBe(true);
    });

    it('rejects non-AI offer descriptions', () => {
      expect(isAiBenefit('Get unlimited talk and 5GB data per day', '')).toBe(false);
      expect(isAiBenefit('Buy one pizza get one free', '')).toBe(false);
      expect(isAiBenefit('Netflix Premium subscription included', '')).toBe(false);
      expect(isAiBenefit('Airport lounge access unlimited', '')).toBe(false);
    });
  });

  // ── 14. Classification priority integrity ─────────────────────────────────
  describe('14. Classification priority: Student and Startup win over Partner', () => {
    it('student keyword wins over commercial partner type', () => {
      const cat = classifyOffer(
        'Student AI offer with Airtel',
        'Airtel student plan includes Gemini for students.',
        'Verified students',
        'Airtel',       // telecom partner
        'TELECOM_BUNDLE',
        'telecom',
      );
      // student wins because "student" keyword fires at priority 1 before partner at priority 6
      expect(cat).toBe('student');
    });

    it('startup keyword wins over commercial partner type', () => {
      const cat = classifyOffer(
        'Startup Cloud AI Credits',
        'Get Gemini credits for your startup through this accelerator program.',
        'Qualifying founders',
        'Some Telecom',  // telecom partner
        'TELECOM_BUNDLE',
        'telecom',
      );
      // startup wins because "startup" and "accelerator" fire at priority 2 before partner at 6
      expect(cat).toBe('startup');
    });

    it('API keyword wins over commercial partner type', () => {
      const cat = classifyOffer(
        'Jio API Developer Access',
        'Access Gemini API endpoints with promotional Jio partnership discount.',
        'API developers',
        'Jio',
        'TELECOM_BUNDLE',
        'telecom',
      );
      // api fires at priority 3
      expect(cat).toBe('api');
    });
  });

  // ── 15. Strict Public Offer Publication Gate ──────────────────────────────
  describe('15. Strict Public Offer Publication Gate (canPublishOffer)', () => {
    it('allows valid active partner offer with official source and evidence to publish', () => {
      const validOffer = {
        providerId: 'gemini',
        sourceUrl: 'https://www.jio.com/en-in/google-one-offer',
        evidenceText: 'Eligible Jio users receive 18 months of Google AI Pro complimentary with eligible Unlimited 5G plans.',
        status: 'ACTIVE',
        isActive: true,
        isPartnerOffer: true,
        partner: 'Jio',
        partnerType: 'telecom',
      };
      expect(canPublishOffer(validOffer)).toBe(true);
    });

    it('blocks offer with missing or short evidence (< 20 chars)', () => {
      const shortEvidenceOffer = {
        providerId: 'gemini',
        sourceUrl: 'https://www.jio.com/en-in/google-one-offer',
        evidenceText: 'Short evidence',
        status: 'ACTIVE',
        isActive: true,
        isPartnerOffer: true,
        partner: 'Jio',
      };
      expect(canPublishOffer(shortEvidenceOffer)).toBe(false);
    });

    it('blocks offer with unverified or unofficial source URL', () => {
      const unofficialSourceOffer = {
        providerId: 'gemini',
        sourceUrl: 'https://random-blog-deals.com/free-gemini',
        evidenceText: 'Blog claims you can get free Gemini by clicking here and signing up today.',
        status: 'ACTIVE',
        isActive: true,
        isPartnerOffer: true,
        partner: 'Jio',
      };
      expect(canPublishOffer(unofficialSourceOffer)).toBe(false);
    });

    it('blocks expired or inactive offers', () => {
      const expiredOffer = {
        providerId: 'gemini',
        sourceUrl: 'https://www.jio.com/en-in/google-one-offer',
        evidenceText: 'Eligible Jio users receive 18 months of Google AI Pro complimentary with eligible Unlimited 5G plans.',
        status: 'EXPIRED',
        isActive: false,
        isPartnerOffer: true,
        partner: 'Jio',
      };
      expect(canPublishOffer(expiredOffer)).toBe(false);
    });
  });

  // ── 16. Layer 2 Discovered Partners & Ecosystem Signals ──────────────────
  describe('16. Layer 2 Discovered Partners & Ecosystem Signals', () => {
    it('successfully discovers and registers ASUS, SoftBank, Deutsche Telekom, and Nothing', () => {
      const candidates = PartnerDiscoveryService.discoverEcosystemCandidates();
      expect(candidates.length).toBeGreaterThanOrEqual(4);

      const partnerNames = candidates.map((c) => c.partnerName);
      expect(partnerNames.includes('ASUS')).toBe(true);
      expect(partnerNames.includes('SoftBank')).toBe(true);
      expect(partnerNames.includes('Deutsche Telekom')).toBe(true);
      expect(partnerNames.includes('Nothing Technology')).toBe(true);

      const asus = candidates.find((c) => c.partnerName === 'ASUS');
      expect(asus?.possibleAiProvider).toBe('gemini');
      expect(isAllowlistedPartnerDomain(asus?.sourceUrl || '')).toBe(true);
    });
  });

  // ── 17. Change Detection & Content Hashing ────────────────────────────────
  describe('17. Change Detection & Content Hashing', () => {
    it('generates consistent SHA-256 evidence hash and detects changes', () => {
      const evidence1 = '18 Months of Google AI Pro included with Jio 5G.';
      const evidence2 = '18 Months of Google AI Pro included with Jio 5G.';
      const evidenceChanged = '12 Months of Google AI Pro included with Jio 5G.';

      const hash1 = hashOfferEvidence(evidence1);
      const hash2 = hashOfferEvidence(evidence2);
      const hashChanged = hashOfferEvidence(evidenceChanged);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hashChanged);
      expect(hash1.length).toBe(64); // SHA-256 hex string
    });
  });
});


