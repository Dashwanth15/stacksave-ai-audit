import { describe, it, expect } from 'vitest';
import { PROVIDER_SOURCE_REGISTRY, getProviderSource } from '../src/pricing/sourceRegistry';
import { PartnerOfferScanner } from '../src/pricing/partnerOfferScanner';
import { canPublishOffer, isOfferQuarantined, buildCanonicalOfferKey } from '../src/pricing/offerTrust';
import { checkGenericExpiration } from '../src/pricing/dateExpiryUtils';
import { OFFERS_ACCESS_CONFIG, isOfferActiveAndValid, isOfferVisibleForUser, isOfferPremiumOnly } from '../src/config/offersConfig';

describe('Baseline Audit & Ecosystem Inspection', () => {
  it('audits the exact baseline counts', () => {
    console.log('=== PHASE 1: BASELINE AUDIT ===');
    console.log('Total Registered Providers in PROVIDER_SOURCE_REGISTRY:', PROVIDER_SOURCE_REGISTRY.length);
    
    // Group providers by extraction strategy
    const strategies: Record<string, string[]> = {};
    for (const p of PROVIDER_SOURCE_REGISTRY) {
      if (!strategies[p.strategy]) strategies[p.strategy] = [];
      strategies[p.strategy].push(p.id);
    }
    console.log('Providers by Extraction Strategy:');
    for (const [strat, ids] of Object.entries(strategies)) {
      console.log(`  ${strat} (${ids.length}): ${ids.join(', ')}`);
    }

    // Collect all offers from PartnerOfferScanner methods
    const partner = PartnerOfferScanner.getKnownPartnerOffers();
    const student = PartnerOfferScanner.getKnownStudentOffers();
    const startup = PartnerOfferScanner.getKnownStartupOffers();
    const api = PartnerOfferScanner.getKnownApiDiscountOffers();
    const annual = PartnerOfferScanner.getKnownAnnualSavingsOffers();
    const free = PartnerOfferScanner.getKnownFreeTierOffers();

    console.log('\n--- Known Offer Breakdown ---');
    console.log(`Partner Bundles: ${partner.length}`);
    console.log(`Student Offers: ${student.length}`);
    console.log(`Startup Grants: ${startup.length}`);
    console.log(`API Discounts: ${api.length}`);
    console.log(`Annual Savings: ${annual.length}`);
    console.log(`Free Tier / Credits: ${free.length}`);

    const allOffers = [...partner, ...student, ...startup, ...api, ...annual, ...free];
    console.log(`Total Known Static/Catalog Offers: ${allOffers.length}`);

    const now = new Date();
    const validOffers = allOffers.filter(o => {
      const q = isOfferQuarantined({ partner: o.partner, title: o.offerTitle, description: o.offerDescription });
      if (q.isQuarantined) return false;
      const exp = checkGenericExpiration((o.offerTitle || '') + ' ' + (o.evidenceText || '') + ' ' + (o.offerDescription || ''));
      if (exp.isExpired) return false;
      return canPublishOffer({
        providerId: o.aiProvider,
        sourceUrl: o.officialSourceUrl,
        evidenceText: o.evidenceText,
        sourceStatus: o.sourceStatus,
        isPublic: o.isPublic,
      } as any);
    });

    console.log(`Valid Publishable Offers: ${validOffers.length}`);

    const premiumCategoriesSet = new Set(
      (OFFERS_ACCESS_CONFIG.PREMIUM_OFFER_CATEGORIES || []).map((c) => c.toLowerCase().trim())
    );
    const premiumProvidersSet = new Set(
      (OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS || []).map((p) => p.toLowerCase().trim())
    );

    const freeVisibleOffers = validOffers.filter(o => {
      const catKey = ((o as any).category || (o.offerSubtype ? (o.offerSubtype === 'PARTNER_BUNDLE' ? 'partner' : 'free') : 'free')).toLowerCase().trim();
      const provKey = (o.aiProvider || '').toLowerCase().trim();
      if (premiumCategoriesSet.has(catKey) || premiumProvidersSet.has(provKey)) return false;
      return isOfferVisibleForUser({ offer: o as any, isPremium: false, now });
    });

    const premiumVisibleOffers = validOffers;
    const premiumOnlyOffers = validOffers.filter(o => !freeVisibleOffers.includes(o));

    console.log(`Offers Visible to Free User: ${freeVisibleOffers.length}`);
    console.log(`Offers Visible to Premium User: ${premiumVisibleOffers.length}`);
    console.log(`Premium-Only Offers: ${premiumOnlyOffers.length}`);
    console.log('================================');
  });
});
