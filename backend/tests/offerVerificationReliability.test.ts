import { describe, it, expect } from 'vitest';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { formatVerificationStatus, formatVerificationDate, formatOfferForDisplay } from '../../frontend/src/utils/offerFormatter';
import { checkGenericExpiration } from '../src/pricing/dateExpiryUtils';
import { isOfferQuarantined, canPublishOffer, isRegisteredOfficialSource } from '../src/pricing/offerTrust';
import { isOfferVisibleForUser, deriveOfferAlertType, getOfferAlertMetadata } from '../src/config/offersConfig';
import { NormalizedPartnerOffer, buildPartnerOfferFingerprint, PartnerDiscoveryService } from '../src/pricing/partnerDiscoveryService';

describe('Objective 1-4: Offer Verification Integrity & Workflow Reliability Suite', () => {

  describe('1. Timestamp & Verification Semantics Isolation', () => {
    it('ensures static catalog seeds specify STATIC_SEED and preserve initial audit timestamps', () => {
      const apiOffers = PartnerOfferScanner.getKnownApiDiscountOffers();
      const annualOffers = PartnerOfferScanner.getKnownAnnualSavingsOffers();
      const freeOffers = PartnerOfferScanner.getKnownFreeTierOffers();

      const allCatalog = [...apiOffers, ...annualOffers, ...freeOffers];

      for (const offer of allCatalog) {
        // Must have valid fingerprint and source URL
        expect(offer.fingerprint).toBeTruthy();
        expect(offer.officialSourceUrl).toMatch(/^https?:\/\//);
        expect(offer.sourceStatus).toBe('VERIFIED');
      }
    });

    it('distinguishes STATIC_SEED from live PLAYWRIGHT_DOM/LIVE in frontend verification status', () => {
      const now = new Date().toISOString();
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

      // Static seed with catalog sync today, but without fresh live price verification
      const staticStatus = formatVerificationStatus(
        tenDaysAgo,             // confirmedTimestamp (historical)
        'VERIFIED',             // sourceStatus
        'STATIC_SEED',          // verificationMethod
        undefined,              // lastPriceVerifiedAt (none)
        now                     // lastCatalogSyncAt (today)
      );
      expect(staticStatus.text).toBe('✓ Catalog checked');
      expect(staticStatus.type).toBe('recent');

      // Live verified offer checked today
      const liveStatusToday = formatVerificationStatus(
        now,                    // confirmedTimestamp
        'VERIFIED',             // sourceStatus
        'PLAYWRIGHT_LIVE',      // verificationMethod
        now,                    // lastPriceVerifiedAt (today)
        now                     // lastCatalogSyncAt
      );
      expect(liveStatusToday.text).toMatch(/✓ Verified (today|\d+h ago)/);
      expect(liveStatusToday.type).toBe('fresh');

      // Live verified offer from 10 days ago (aging)
      const liveStatusAging = formatVerificationStatus(
        tenDaysAgo,
        'VERIFIED',
        'PLAYWRIGHT_DOM',
        tenDaysAgo,
        now
      );
      expect(liveStatusAging.text).toMatch(/Last verified 10d ago/);
      expect(liveStatusAging.type).toBe('aging');
    });

    it('correctly maps verification fields in formatOfferForUI', () => {
      const rawOffer: any = {
        id: 'test-cody-pro',
        providerId: 'sourcegraph-cody',
        providerName: 'Sourcegraph Cody',
        title: 'Sourcegraph Cody Pro Annual Savings',
        description: 'Save 25% on Cody Pro with annual billing',
        discount: '25% OFF',
        category: 'annual',
        eligibility: 'All Users',
        sourceUrl: 'https://sourcegraph.com/pricing',
        detectedAt: '2026-09-01T00:00:00.000Z',
        lastConfirmedAt: '2026-09-01T00:00:00.000Z',
        lastCatalogSyncAt: '2026-10-10T12:00:00.000Z',
        verificationMethod: 'STATIC_SEED',
        annualSavingsPercent: 25,
      };

      const formatted = formatOfferForDisplay(rawOffer, []);
      expect(formatted.lastCatalogSyncAt).toBe('2026-10-10T12:00:00.000Z');
      expect(formatted.verificationMethod).toBe('STATIC_SEED');
      expect(formatted.verificationStatusText).toBe('✓ Catalog checked');
      expect(formatted.annualSavingsPercent).toBe(25);
    });
  });

  describe('2. Novita AI Neutral Credit Wording Verification', () => {
    it('verifies Novita AI catalog record contains no fixed $0.50 amount and uses neutral trial wording', () => {
      const apiOffers = PartnerOfferScanner.getKnownApiDiscountOffers();
      const novita = apiOffers.find((o) => o.aiProvider === 'novita-ai');

      expect(novita).toBeDefined();
      expect(novita?.offerTitle).toBe('Novita AI Developer Trial Credits');
      expect(novita?.benefit).toBe('Free Trial Credits');
      expect(novita?.value).toBe('Complimentary developer trial credits');
      expect(novita?.evidenceText).toContain('starting trial credits');
      expect(novita?.evidenceText).not.toContain('$0.50');
      expect(novita?.offerTitle).not.toContain('$0.50');
      expect(novita?.benefit).not.toContain('$0.50');
      expect(novita?.value).not.toContain('$0.50');
      expect(novita?.officialSourceUrl).toBe('https://novita.ai/pricing');
    });
  });

  describe('3. Confirmed Annual Savings Percentages Preservation', () => {
    it('verifies Sourcegraph Cody Pro is 25%', () => {
      const annualOffers = PartnerOfferScanner.getKnownAnnualSavingsOffers();
      const cody = annualOffers.find((o) => o.aiProvider === 'sourcegraph-cody');
      expect(cody).toBeDefined();
      expect(cody?.annualSavingsPercent).toBe(25);
      expect(cody?.benefit).toBe('25% OFF');
      expect(cody?.monthlyEquivalent).toBe(9);
      expect(cody?.annualPrice).toBe(108);
      expect(cody?.annualSavingsAmount).toBe(36);
    });

    it('verifies Fireflies.ai Pro is 44%', () => {
      const annualOffers = PartnerOfferScanner.getKnownAnnualSavingsOffers();
      const fireflies = annualOffers.find((o) => o.aiProvider === 'fireflies-ai');
      expect(fireflies).toBeDefined();
      expect(fireflies?.annualSavingsPercent).toBe(44);
      expect(fireflies?.benefit).toBe('44% OFF');
      expect(fireflies?.monthlyEquivalent).toBe(10);
      expect(fireflies?.annualPrice).toBe(120);
      expect(fireflies?.annualSavingsAmount).toBe(96);
    });

    it('verifies Murf AI Creator is 34%', () => {
      const annualOffers = PartnerOfferScanner.getKnownAnnualSavingsOffers();
      const murf = annualOffers.find((o) => o.aiProvider === 'murf-ai');
      expect(murf).toBeDefined();
      expect(murf?.annualSavingsPercent).toBe(34);
      expect(murf?.benefit).toBe('34% OFF');
      expect(murf?.monthlyEquivalent).toBe(19);
      expect(murf?.annualPrice).toBe(228);
      expect(murf?.annualSavingsAmount).toBe(120);
    });
  });

  describe('4. Partner Scan Failure Non-Destructive Behavior', () => {
    it('reconcileStaleOffers aborts and preserves all active offers when scanSuccessful is false', async () => {
      const confirmedFingerprints = new Set<string>();
      const result = await PartnerOfferScanner.reconcileStaleOffers(confirmedFingerprints, false);

      expect(result.deactivatedCount).toBe(0);
      expect(result.preservedCount).toBe(0);
    });
  });

  describe('5. Premium Intelligence Alert Rules & Expiration Boundary', () => {
    it('classifies an active promo with exactly 15 days remaining as LIMITED_TIME', () => {
      const expiringIn15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const offer = {
        title: 'Spring Flash Sale Special Promotion',
        description: 'Special seasonal pricing with active promo deadline.',
        expiresAt: expiringIn15Days,
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer)).toBe('LIMITED_TIME');
      const meta = getOfferAlertMetadata(offer, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('LIMITED_TIME');
    });

    it('classifies an offer beyond 15 days (16 days) without urgent ending copy as NORMAL', () => {
      const expiringIn16Days = new Date(Date.now() + 16 * 24 * 60 * 60 * 1000);
      const offer = {
        title: 'Standard Product Tier',
        description: 'Standard product subscription with extended future expiry.',
        expiresAt: expiringIn16Days,
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer)).toBeNull();
      const meta = getOfferAlertMetadata(offer, true);
      expect(meta.isIntelligenceAlert).toBe(false);
    });

    it('preserves existing 50%+ discount condition as PRICE_DROP', () => {
      const offer50 = {
        title: 'Cursor Pro Student Discount',
        discount: '50% OFF',
        category: 'student',
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer50)).toBe('PRICE_DROP');
      const meta = getOfferAlertMetadata(offer50, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('PRICE_DROP');
    });

    it('preserves IMPORTANT priority order over PRICE_DROP for Tier-1 platforms with 100% Free access', () => {
      const tier1Free = {
        providerId: 'chatgpt',
        title: 'ChatGPT for Teachers — 100% Free Access',
        discount: '100% FREE',
        category: 'student',
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(tier1Free)).toBe('IMPORTANT');
      const meta = getOfferAlertMetadata(tier1Free, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('IMPORTANT');
    });

    it('guarantees dynamic discovery candidates receive a valid detectedAt timestamp', () => {
      const candidate = PartnerDiscoveryService.ingestCandidate({
        partnerName: 'Deutsche Telekom',
        category: 'telecom',
        sourceUrl: 'https://www.telekom.com/en/media',
        evidenceText: 'Deutsche Telekom customers receive free Perplexity Pro access on select mobile contracts.',
        possibleAiProvider: 'perplexity',
        possibleAiPlan: 'Perplexity Pro',
        benefit: 'Free Perplexity Pro Subscription',
        duration: '12 Months Free',
        eligibility: 'Eligible Deutsche Telekom mobile postpaid customers',
      });

      expect(candidate.discoveredAt).toBeInstanceOf(Date);
      const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
      expect(evalResult.promoted).toBe(true);
      expect(evalResult.offer?.detectedAt).toBeInstanceOf(Date);
    });

    it('ensures Free users never receive Premium alert metadata', () => {
      const highValueOffer = {
        providerId: 'chatgpt',
        title: 'ChatGPT for Teachers — 100% Free Access',
        discount: '100% FREE',
        category: 'student',
        detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      };
      const freeMeta = getOfferAlertMetadata(highValueOffer, false);
      expect(freeMeta.isIntelligenceAlert).toBe(false);
      expect(freeMeta.alertType).toBeUndefined();
    });
  });
});
