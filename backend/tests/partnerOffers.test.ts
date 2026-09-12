import { describe, it, expect } from 'vitest';
import {
  INITIAL_REGISTERED_PARTNERS,
  canonicalizeAiProvider,
  isAllowlistedPartnerDomain,
  findPartnerByDomain,
} from '../src/pricing/partnerSourceRegistry';
import {
  isAiBenefit,
  buildPartnerOfferFingerprint,
} from '../src/pricing/partnerDiscoveryService';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';

describe('Partner AI Offers System & Verification Suite', () => {
  it('should contain comprehensive registered Layer 1 partners across required categories', () => {
    expect(INITIAL_REGISTERED_PARTNERS.length).toBeGreaterThanOrEqual(20);
    const categories = new Set(INITIAL_REGISTERED_PARTNERS.map((p) => p.category));
    expect(categories.has('telecom')).toBe(true);
    expect(categories.has('broadband')).toBe(true);
    expect(categories.has('devices')).toBe(true);
    expect(categories.has('banking')).toBe(true);
    expect(categories.has('education')).toBe(true);
    expect(categories.has('cloud')).toBe(true);
    expect(categories.has('developer')).toBe(true);
  });

  it('should validate and allowlist official domains correctly', () => {
    expect(isAllowlistedPartnerDomain('https://www.jio.com/en-in/plans')).toBe(true);
    expect(isAllowlistedPartnerDomain('https://www.airtel.in/perplexity-pro')).toBe(true);
    expect(isAllowlistedPartnerDomain('https://promotions.samsung.com/galaxy-ai')).toBe(true);
    expect(isAllowlistedPartnerDomain('https://education.github.com/pack')).toBe(true);
    expect(isAllowlistedPartnerDomain('https://random-scam-site.com/free-chatgpt')).toBe(false);
  });

  it('should correctly canonicalize AI providers and preserve unknown providers without corruption', () => {
    const gemini = canonicalizeAiProvider('Google AI Pro');
    expect(gemini.isKnown).toBe(true);
    expect(gemini.providerId).toBe('gemini');

    const perplexity = canonicalizeAiProvider('Perplexity Pro');
    expect(perplexity.isKnown).toBe(true);
    expect(perplexity.providerId).toBe('perplexity');

    const copilot = canonicalizeAiProvider('GitHub Copilot');
    expect(copilot.isKnown).toBe(true);
    expect(copilot.providerId).toBe('github-copilot');

    const custom = canonicalizeAiProvider('Novel AI Engine');
    expect(custom.isKnown).toBe(false);
    expect(custom.displayName).toBe('Novel AI Engine');
  });

  it('should detect valid AI benefit strings and reject non-AI offers', () => {
    expect(isAiBenefit('Get 12 Months Free Google AI Pro and 2TB cloud storage')).toBe(true);
    expect(isAiBenefit('1 Year of Perplexity Pro included with premium plan')).toBe(true);
    expect(isAiBenefit('Free GitHub Copilot student subscription')).toBe(true);
    expect(isAiBenefit('Get unlimited talk and 5GB data per day')).toBe(false);
    expect(isAiBenefit('Buy one pizza get one free')).toBe(false);
  });

  it('should generate valid normalized fingerprints and avoid collisions', () => {
    const fp1 = buildPartnerOfferFingerprint({
      partner: 'Jio',
      aiProvider: 'gemini',
      aiPlan: 'Google AI Pro',
      offerType: 'TELECOM_BUNDLE',
      region: 'India',
    });

    const fp2 = buildPartnerOfferFingerprint({
      partner: 'Airtel',
      aiProvider: 'perplexity',
      aiPlan: 'Perplexity Pro',
      offerType: 'TELECOM_BUNDLE',
      region: 'India',
    });

    expect(fp1).toBeTruthy();
    expect(fp2).toBeTruthy();
    expect(fp1).not.toBe(fp2);
  });

  it('should return complete and valid known verified partner offers', () => {
    const offers = PartnerOfferScanner.getKnownPartnerOffers();
    expect(offers.length).toBeGreaterThanOrEqual(6);

    const partners = offers.map((o) => o.partner.toLowerCase());
    const aiProviders = offers.map((o) => o.aiProvider.toLowerCase());

    expect(partners.some((p) => p.includes('jio'))).toBe(true);
    expect(partners.some((p) => p.includes('airtel'))).toBe(true);
    expect(partners.some((p) => p.includes('samsung'))).toBe(true);
    expect(partners.some((p) => p.includes('google pixel'))).toBe(true);

    expect(aiProviders.some((p) => p.includes('gemini'))).toBe(true);
    expect(aiProviders.some((p) => p.includes('perplexity'))).toBe(true);

    for (const offer of offers) {
      expect(offer.partner).toBeTruthy();
      expect(offer.partnerType).toBeTruthy();
      expect(offer.aiProvider).toBeTruthy();
      expect(offer.aiPlan).toBeTruthy();
      expect(offer.offerType).toBeTruthy();
      expect(offer.benefit).toBeTruthy();
      expect(offer.duration).toBeTruthy();
      expect(offer.value).toBeTruthy();
      expect(offer.eligibility).toBeTruthy();
      expect(offer.activationMethod).toBeTruthy();
      expect(offer.officialSourceUrl).toMatch(/^https?:\/\//);
      if (offer.termsUrl) {
        expect(offer.termsUrl).toMatch(/^https?:\/\//);
      }
      expect(offer.status).toBe('ACTIVE');
    }

    // Verify student offers exist in separate student method
    const studentOffers = PartnerOfferScanner.getKnownStudentOffers();
    expect(studentOffers.some((o) => o.partner.toLowerCase().includes('github'))).toBe(true);

    // Verify no duplicate fingerprints in known offers
    const fingerprints = offers.map((o) => o.fingerprint);
    const unique = new Set(fingerprints);
    expect(fingerprints.length).toBe(unique.size);
  });

  it('should find registered partners by domain accurately', () => {
    const jio = findPartnerByDomain('https://www.jio.com/5g');
    expect(jio).toBeDefined();
    expect(jio?.partnerId).toBe('jio');

    const airtel = findPartnerByDomain('https://www.airtel.in/plans');
    expect(airtel).toBeDefined();
    expect(airtel?.partnerId).toBe('airtel');

    const unknown = findPartnerByDomain('https://unknown-domain-test.org');
    expect(unknown).toBeUndefined();
  });
});
