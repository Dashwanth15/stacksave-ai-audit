// ============================================================
// Partner Offer Scanner — StackSave AI Spend & Intelligence
//
// 24-Hour Recurring Scanner Orchestrator:
//   1. Scans Layer 1 Registered Official Partners (Jio, Airtel, Samsung, etc.)
//   2. Evaluates Layer 2 Discovered Partner Candidates
//   3. Validates AI Relevance & Official Evidence
//   4. Updates MongoDB NotificationEvent records idempotently:
//      - New offer -> Creates active public offer
//      - Same offer -> Refreshes confirmation timestamp (no duplicates)
//      - Changed offer -> Updates commercial terms in-place (preserves detectedAt)
//      - Expired offer -> Marks EXPIRED / inactive
//      - Fetch failure -> Preserves active status (never prematurely expires)
// ============================================================

import { createHash } from 'crypto';
import { NotificationEventModel } from '../services/dbService';
import {
  getAllRegisteredPartners,
  OfficialPartnerConfig,
  extractRootDomain,
} from './partnerSourceRegistry';
import { getProviderSource } from './sourceRegistry';
import {
  PartnerDiscoveryService,
  NormalizedPartnerOffer,
  isAiBenefit,
  buildPartnerOfferFingerprint,
} from './partnerDiscoveryService';
import { checkGenericExpiration } from './dateExpiryUtils';
import { canPublishOffer, isOfferQuarantined } from './offerTrust';

export interface PartnerScanResult {
  totalScanned: number;
  newOffersCount: number;
  updatedOffersCount: number;
  preservedActiveCount: number;
  expiredOffersCount: number;
  errorsCount: number;
  offers: NormalizedPartnerOffer[];
}

export class PartnerOfferScanner {
  /**
   * Persists or updates a normalized offer into the database idempotently.
   *
   * @param isPartnerOffer - Set to false for Student & Education or Startup Grant offers,
   *                         so they are NOT classified as Partner Bundles in the frontend.
   */
  public static async persistPartnerOffer(
    offer: NormalizedPartnerOffer,
    isPartnerOffer: boolean = true
  ): Promise<{ status: 'CREATED' | 'UPDATED' | 'CONFIRMED' | 'EXPIRED' }> {
    const existing = await NotificationEventModel.findOne({
      fingerprint: offer.fingerprint,
    });

    const checkTime = new Date();

    // Check fingerprint / offer pattern quarantine (e.g. non-commercial OS features, expired bundles)
    const quarantine = isOfferQuarantined({
      partner: offer.partner,
      title: offer.offerTitle,
      description: offer.offerDescription,
    });
    if (quarantine.isQuarantined) {
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=QUARANTINED reason=${quarantine.reason}`);
      if (existing) {
        existing.status = 'QUARANTINED';
        existing.isActive = false;
        existing.lastCheckedAt = checkTime;
        await existing.save();
      }
      return { status: 'EXPIRED' };
    }

    const sourceDomain = offer.sourceDomain || extractRootDomain(offer.officialSourceUrl);
    const providerOfficialUrl =
      offer.providerOfficialUrl ||
      getProviderSource(offer.aiProvider)?.pricingUrl ||
      '';
    const evidenceText = (offer.evidenceText || '').trim();
    const contentHash =
      offer.contentHash ||
      createHash('sha256').update(`${offer.fingerprint}::${evidenceText}`).digest('hex');
    const detectionMethod = offer.detectionMethod || (isPartnerOffer ? 'SEEDED' : 'STATIC_FETCH');
    const extractorVersion = offer.extractorVersion || '2.4.0-partner-scanner';

    const textToCheck = `${offer.offerTitle || ''} ${evidenceText} ${offer.offerDescription || ''}`;
    const genericExp = checkGenericExpiration(textToCheck);
    const isExplicitlyExpired = offer.status === 'EXPIRED' || offer.isActive === false || genericExp.isExpired;

    const isLiveEvidence =
      offer.detectionMethod === 'PLAYWRIGHT_DOM' ||
      offer.detectionMethod === 'PLAYWRIGHT_LIVE' ||
      Boolean(offer.lastPriceVerifiedAt);
    const verificationMethod =
      offer.verificationMethod || (isLiveEvidence ? (offer.detectionMethod || 'PLAYWRIGHT_LIVE') : 'STATIC_SEED');

    if (!existing) {
      if (isExplicitlyExpired) {
        console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Expired candidate: ${genericExp.expiredReason || 'Explicitly expired'}`);
        return { status: 'EXPIRED' };
      }
      // 1. Create New Public Offer
      const confirmedDate = isLiveEvidence ? checkTime : (offer.lastConfirmedAt || offer.detectedAt || checkTime);
      const priceVerifiedDate = isLiveEvidence ? checkTime : (offer.lastPriceVerifiedAt || undefined);

      await NotificationEventModel.create({
        providerId: offer.aiProvider,
        providerName: offer.aiProviderDisplayName || offer.aiProvider,
        eventType: 'NEW_OFFER',
        fingerprint: offer.fingerprint,
        title: offer.offerTitle,
        description: offer.offerDescription,
        sourceUrl: offer.officialSourceUrl,
        sourceDomain,
        providerOfficialUrl,
        evidenceText,
        detectionMethod,
        sourceStatus: offer.sourceStatus || 'VERIFIED',
        sourceFetchedAt: offer.sourceFetchedAt || checkTime,
        lastSuccessfulCheckAt: offer.lastSuccessfulCheckAt || checkTime,
        contentHash,
        extractorVersion,
        detectedAt: offer.detectedAt || checkTime,
        lastConfirmedAt: confirmedDate,
        lastSeenAt: checkTime,
        lastCatalogSyncAt: checkTime,
        lastPriceVerifiedAt: priceVerifiedDate,
        verificationMethod,
        consecutiveMisses: 0,
        isActive: offer.isActive !== false,
        isPublic: offer.isPublic !== false,
        discount: offer.benefit,
        discountType: 'BUNDLE',
        // Classification fields — isPartnerOffer=false for student/startup so they
        // do NOT appear under Partner Bundles in the frontend.
        isPartnerOffer,
        partner: offer.partner,
        partnerType: offer.partnerType,
        aiProvider: offer.aiProvider,
        aiPlan: offer.aiPlan,
        offerType: offer.offerType,
        benefit: offer.benefit,
        duration: offer.duration,
        value: offer.value,
        eligibility: offer.eligibility,
        activationMethod: offer.activationMethod,
        country: offer.country,
        region: offer.region,
        termsUrl: offer.termsUrl,
        destinationUrl: offer.destinationUrl || offer.termsUrl || offer.officialSourceUrl,
        offerSubtype: offer.offerSubtype || (isPartnerOffer ? 'PARTNER_BUNDLE' : undefined),
        category: (offer as any).category || (isPartnerOffer ? 'partner' : undefined),
        monthlyEquivalent: offer.monthlyEquivalent,
        annualPrice: offer.annualPrice,
        annualSavingsPercent: offer.annualSavingsPercent,
        annualSavingsAmount: offer.annualSavingsAmount,
        sourceType: 'official',
        status: offer.status || 'ACTIVE',
        lastCheckedAt: checkTime,
      });
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=ACTIVE reason=Created verified offer`);
      return { status: 'CREATED' };
    }

    // Check if offer is expired
    if (isExplicitlyExpired) {
      existing.status = 'EXPIRED';
      existing.isActive = false;
      existing.lastCheckedAt = checkTime;
      existing.lastCatalogSyncAt = checkTime;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Expired offer: ${genericExp.expiredReason || 'Explicitly expired'}`);
      return { status: 'EXPIRED' };
    }
    
    // If existing offer is marked UNAVAILABLE, EXPIRED, or HISTORICAL, do NOT reactivate it
    // This prevents broken/expired offers from being auto-reactivated without fresh verified evidence
    if ((existing.status === 'UNAVAILABLE' || existing.status === 'EXPIRED' || existing.status === 'HISTORICAL') && !existing.isActive) {
      existing.lastCheckedAt = checkTime;
      existing.lastCatalogSyncAt = checkTime;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Preserved inactive status (${existing.status})`);
      return { status: 'EXPIRED' }; // Return EXPIRED to prevent reconciliation from preserving it
    }

    // Never allow a static seed to overwrite fresher live Playwright evidence
    const isIncomingSeeded = offer.detectionMethod === 'SEEDED' || !isLiveEvidence;
    const isExistingLive = existing.detectionMethod === 'PLAYWRIGHT_DOM' || existing.detectionMethod === 'PLAYWRIGHT_LIVE';
    if (isIncomingSeeded && isExistingLive) {
      existing.lastCheckedAt = checkTime;
      existing.lastCatalogSyncAt = checkTime;
      existing.lastSeenAt = checkTime;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=ACTIVE reason=Confirmed live Playwright offer with catalog sync`);
      return { status: 'CONFIRMED' };
    }

    // 2. Check if commercial terms or content hash changed
    const hasChanged =
      existing.benefit !== offer.benefit ||
      existing.title !== offer.offerTitle ||
      existing.description !== offer.offerDescription ||
      existing.duration !== offer.duration ||
      (Boolean(existing.contentHash) && Boolean(contentHash) && existing.contentHash !== contentHash);

    existing.lastCheckedAt = checkTime;
    existing.lastCatalogSyncAt = checkTime;
    existing.lastSeenAt = checkTime;
    if (offer.sourceFetchedAt) existing.sourceFetchedAt = offer.sourceFetchedAt;
    if (offer.lastSuccessfulCheckAt) existing.lastSuccessfulCheckAt = offer.lastSuccessfulCheckAt;

    if (isLiveEvidence) {
      existing.lastConfirmedAt = checkTime;
      existing.lastPriceVerifiedAt = checkTime;
      existing.verificationMethod = verificationMethod;
    } else {
      if (offer.lastPriceVerifiedAt) {
        existing.lastPriceVerifiedAt = offer.lastPriceVerifiedAt;
      }
      if (!existing.verificationMethod) {
        existing.verificationMethod = isExistingLive ? (existing.detectionMethod || 'PLAYWRIGHT_LIVE') : 'STATIC_SEED';
      }
    }
    
    // DEBUG: Log if we're reactivating a previously inactive offer
    if (!existing.isActive) {
      console.log(`   🔄 [Reactivating Previously Inactive Offer] ${offer.partner} (was: status=${existing.status}, isActive=${existing.isActive})`);
    }
    
    existing.isActive = true;
    existing.consecutiveMisses = 0;
    existing.status = 'ACTIVE';
    existing.isPublic = true;
    if (sourceDomain) existing.sourceDomain = sourceDomain;
    if (providerOfficialUrl) existing.providerOfficialUrl = providerOfficialUrl;
    if (offer.detectionMethod) existing.detectionMethod = offer.detectionMethod;
    if (offer.destinationUrl) existing.destinationUrl = offer.destinationUrl;
    if (offer.offerSubtype) existing.offerSubtype = offer.offerSubtype;
    if ((offer as any).category) (existing as any).category = (offer as any).category;
    else if (!(existing as any).category) (existing as any).category = isPartnerOffer ? 'partner' : undefined;
    if (offer.monthlyEquivalent !== undefined) (existing as any).monthlyEquivalent = offer.monthlyEquivalent;
    if (offer.annualPrice !== undefined) (existing as any).annualPrice = offer.annualPrice;
    if (offer.annualSavingsPercent !== undefined) (existing as any).annualSavingsPercent = offer.annualSavingsPercent;
    if (offer.annualSavingsAmount !== undefined) (existing as any).annualSavingsAmount = offer.annualSavingsAmount;
    if (contentHash) existing.contentHash = contentHash;

    if (hasChanged) {
      existing.title = offer.offerTitle;
      existing.description = offer.offerDescription;
      existing.benefit = offer.benefit;
      existing.discount = offer.benefit;
      existing.duration = offer.duration;
      existing.evidenceText = evidenceText;
      existing.eligibility = offer.eligibility;
      if (offer.destinationUrl) existing.destinationUrl = offer.destinationUrl;
      if (offer.offerSubtype) existing.offerSubtype = offer.offerSubtype;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=ACTIVE reason=Updated verified offer commercial terms`);
      return { status: 'UPDATED' };
    }

    if (typeof existing.save === 'function') await existing.save();
    console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=ACTIVE reason=Confirmed active offer`);
    return { status: 'CONFIRMED' };
  }

  /**
   * Generates default verified partner offers for known Layer 1 partners.
   */
  public static getKnownPartnerOffers(): NormalizedPartnerOffer[] {
    const list: NormalizedPartnerOffer[] = [
      // Jio -> Google AI Pro Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Jio',
          aiProvider: 'gemini',
          aiPlan: 'Google AI Pro',
          offerType: 'TELECOM_BUNDLE',
          region: 'India',
        }),
        partner: 'Jio',
        partnerType: 'telecom',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Google AI Pro (Gemini Advanced)',
        offerTitle: 'Google AI Pro with Jio 5G',
        offerDescription:
          'Get 18 months of Google AI Pro (Gemini Advanced with 2TB cloud storage) included with eligible Jio 5G plans.',
        offerType: 'TELECOM_BUNDLE',
        benefit: '18 Months FREE',
        duration: '18 months',
        value: '$360 value',
        eligibility: 'Eligible Jio Unlimited 5G Users',
        activationMethod: 'Activate via MyJio App',
        country: 'IN',
        region: 'India',
        officialSourceUrl: 'https://www.jio.com/google-gemini-offer/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eligible Jio users receive 18 months of Google AI Pro complimentary with eligible Unlimited 5G plans.',
        detectedAt: new Date('2026-08-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Airtel -> Perplexity Pro Bundle
      // REMOVED: Promotion officially ended January 16, 2026
      // Evidence: https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo
      // Verification: Page redirects to homepage, contains "expired" text
      // Status: DO NOT resurrect without fresh official evidence of NEW promotion

      // Samsung -> Galaxy AI Device Feature
      // REJECTED: Built-in OEM device feature; no separate commercial AI subscription entitlement.
      // Fingerprint-level quarantine: Future Samsung commercial AI bundles (e.g. Samsung -> Google AI Pro or ChatGPT)
      // remain discoverable if verified with an external commercial entitlement.

      // Google Pixel 10 Pro -> Gemini Advanced Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Google Pixel',
          aiProvider: 'gemini',
          aiPlan: 'Google One AI Premium (Pixel 10 Pro)',
          offerType: 'DEVICE_BUNDLE',
          region: 'Global',
        }),
        partner: 'Google Pixel',
        partnerType: 'devices',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Google One AI Premium (Gemini Advanced)',
        offerTitle: '1 Year Google One AI Premium with Google Pixel 10 Pro',
        offerDescription:
          'Get 1 full year of Google One AI Premium (Gemini Advanced with 2M token context, 2TB storage, and Gemini in Docs/Gmail) included with Pixel 10 Pro and Pixel 10 Pro XL.',
        offerType: 'DEVICE_BUNDLE',
        offerSubtype: 'PARTNER_BUNDLE',
        benefit: '1 Year FREE',
        duration: '12 months',
        value: '$240 value',
        eligibility: 'New Pixel 10 Pro & eligible Pixel hardware purchasers',
        activationMethod: 'Claim in Google One app on eligible device',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://store.google.com/category/phones',
        destinationUrl: 'https://store.google.com/category/phones',
        termsUrl: 'https://one.google.com/terms-of-service',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Buy an eligible Pixel device and get 12 months of the Google One AI Premium plan at no extra charge.',
        detectedAt: new Date('2026-08-15T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // American Express -> $300 ChatGPT Business Statement Credit
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'American Express',
          aiProvider: 'chatgpt',
          aiPlan: 'ChatGPT Business Statement Credit',
          offerType: 'BANKING_REWARD',
          region: 'United States',
        }),
        partner: 'American Express',
        partnerType: 'banking',
        aiProvider: 'chatgpt',
        aiProviderDisplayName: 'ChatGPT (OpenAI)',
        isKnownAiProvider: true,
        aiPlan: 'ChatGPT Business Workspace',
        offerTitle: '$300 ChatGPT Business Statement Credit',
        offerDescription:
          'Eligible U.S. Business Platinum and Business Gold cardmembers can enroll to receive up to $300 in annual statement credits toward ChatGPT Business workspace subscriptions.',
        offerType: 'BANKING_REWARD',
        offerSubtype: 'PARTNER_BUNDLE',
        benefit: 'Up to $300 Statement Credit',
        duration: 'Annual benefit',
        value: '$300/year value',
        eligibility: 'Eligible U.S. Business Platinum & Business Gold Cardmembers',
        activationMethod: 'Enroll via Amex Online Benefits Portal prior to charge',
        country: 'US',
        region: 'United States',
        officialSourceUrl: 'https://www.americanexpress.com/us/credit-cards/business-cards/business-platinum-credit-card-amex/',
        destinationUrl: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum',
        termsUrl: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Enroll and receive up to $300 in statement credits annually for eligible ChatGPT Business subscriptions charged to your Business Platinum Card.',
        detectedAt: new Date('2026-08-28T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Deutsche Telekom -> Perplexity Pro Mobile Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Deutsche Telekom',
          aiProvider: 'perplexity',
          aiPlan: 'Perplexity Pro',
          offerType: 'TELECOM_BUNDLE',
          region: 'Europe',
        }),
        partner: 'Deutsche Telekom',
        partnerType: 'telecom',
        aiProvider: 'perplexity',
        aiProviderDisplayName: 'Perplexity',
        isKnownAiProvider: true,
        aiPlan: 'Perplexity Pro',
        offerTitle: 'Perplexity Pro Mobile Contract Bundle',
        offerDescription:
          'Eligible Deutsche Telekom mobile contract subscribers receive complimentary access to Perplexity Pro AI search and research assistant.',
        offerType: 'TELECOM_BUNDLE',
        offerSubtype: 'PARTNER_BUNDLE',
        benefit: 'Included with Mobile Plan',
        duration: 'Contract term',
        value: 'Complimentary',
        eligibility: 'Qualifying Deutsche Telekom mobile contract subscribers',
        activationMethod: 'Claim via Telekom MeinMagenta app',
        country: 'DE',
        region: 'Europe',
        officialSourceUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
        destinationUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
        termsUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Magenta Moments has been offering twelve months of free access to Perplexity Pro since May. And thus a saving of 240 euros. This promotion will be extended until spring next year.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // ASUS AI PC & Chromebook Plus -> Google One AI Premium
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'ASUS',
          aiProvider: 'gemini',
          aiPlan: 'Google One AI Premium (ASUS AI PC)',
          offerType: 'DEVICE_BUNDLE',
          region: 'Global',
        }),
        partner: 'ASUS',
        partnerType: 'devices',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Google One AI Premium (Gemini Advanced)',
        offerTitle: 'Google One AI Premium with ASUS AI PC & Chromebook Plus',
        offerDescription:
          'Get up to 12 months of Google One AI Premium (Gemini Advanced and 2TB cloud storage) included with eligible ASUS AI PC and Chromebook Plus purchases.',
        offerType: 'DEVICE_BUNDLE',
        offerSubtype: 'PARTNER_BUNDLE',
        benefit: 'Up to 12 Months FREE',
        duration: '3 to 12 months',
        value: '$240 value',
        eligibility: 'Qualifying ASUS AI laptop and Chromebook Plus purchasers',
        activationMethod: 'Claim via ASUS Member portal / MyASUS app',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        termsUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eligible ASUS Chromebook Plus and AI PC purchases include up to 12 months of Google One AI Premium with Gemini Advanced.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // JioFiber -> Google AI Pro Broadband Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'JioFiber',
          aiProvider: 'gemini',
          aiPlan: 'Google AI Pro',
          offerType: 'BROADBAND_BUNDLE',
          region: 'India',
        }),
        partner: 'JioFiber',
        partnerType: 'broadband',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Google AI Pro (Gemini Advanced)',
        offerTitle: 'Google AI Pro Included with JioFiber / AirFiber',
        offerDescription:
          'Complimentary 12-month Google AI Pro subscription bundled with selected annual JioFiber and AirFiber broadband plans.',
        offerType: 'BROADBAND_BUNDLE',
        offerSubtype: 'PARTNER_BUNDLE',
        benefit: '12 Months FREE',
        duration: '12 months',
        value: '$240 value',
        eligibility: 'New and renewing JioFiber/AirFiber subscribers',
        activationMethod: 'Claim through MyJio broadband portal',
        country: 'IN',
        region: 'India',
        officialSourceUrl: 'https://www.jio.com/fiber/',
        destinationUrl: 'https://www.jio.com/fiber/',
        termsUrl: 'https://www.jio.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'High-speed JioFiber customers receive 1 year of Google AI Pro including Gemini Advanced and cloud benefits.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];

    return list;
  }

  /**
   * Returns verified student & education AI offers.
   * These are classified as Student & Education — NOT Partner Bundles.
   * Stored with isPartnerOffer=false.
   */
  public static getKnownStudentOffers(): NormalizedPartnerOffer[] {
    return [
      // GitHub Student Developer Pack -> GitHub Copilot
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'GitHub Student Developer Pack',
          aiProvider: 'github-copilot',
          aiPlan: 'GitHub Copilot Individual',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'GitHub Student Developer Pack',
        partnerType: 'education',
        aiProvider: 'github-copilot',
        aiProviderDisplayName: 'GitHub Copilot',
        isKnownAiProvider: true,
        aiPlan: 'GitHub Copilot Individual',
        offerTitle: 'GitHub Copilot Free for Verified Students',
        offerDescription:
          '100% free access to GitHub Copilot AI pair programmer for verified students and academic faculty via GitHub Education.',
        offerType: 'EDUCATION_BUNDLE',
        benefit: '100% FREE',
        duration: 'While enrolled',
        value: '$120/year value',
        eligibility: 'Verified Students & Educators (.edu)',
        activationMethod: 'GitHub Student Developer Pack authentication',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://education.github.com/pack',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'GitHub Copilot is free for all verified students, teachers, and maintainers of popular open source software.',
        detectedAt: new Date('2026-08-15T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
        destinationUrl: 'https://education.github.com/pack',
        offerSubtype: 'STUDENT_DISCOUNT',
      },

      // Notion for Education -> Free Plus Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Notion',
          aiProvider: 'notion-ai',
          aiPlan: 'Notion Plus for Education',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Notion',
        partnerType: 'education',
        aiProvider: 'notion-ai',
        aiProviderDisplayName: 'Notion AI',
        isKnownAiProvider: true,
        aiPlan: 'Notion Plus for Education',
        offerTitle: 'Notion for Education (100% Free Plus Plan)',
        offerDescription:
          '100% free Plus plan access for verified students and educators using an accredited academic school email address.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        benefit: '100% FREE',
        duration: 'While enrolled',
        value: '$120/year value',
        eligibility: 'Verified Students & Educators (.edu)',
        activationMethod: 'Sign up with verified school email address',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.notion.so/product/notion-for-education',
        destinationUrl: 'https://www.notion.com/product/notion-for-education',
        termsUrl: 'https://www.notion.com/product/notion-for-education',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Students and educators can get Notion Plus with unlimited blocks and file uploads at 100% discount.',
        detectedAt: new Date('2026-08-20T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Canva for Education -> 100% Free K-12
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Canva',
          aiProvider: 'canva-ai',
          aiPlan: 'Canva for Education',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Canva',
        partnerType: 'education',
        aiProvider: 'canva-ai',
        aiProviderDisplayName: 'Canva AI',
        isKnownAiProvider: true,
        aiPlan: 'Canva for Education (Magic Studio)',
        offerTitle: 'Canva for Education (100% Free K-12 + Magic Studio)',
        offerDescription:
          '100% free lifetime access to Canva premium design tools and Magic Studio AI generators for eligible K-12 teachers and students.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        benefit: '100% FREE',
        duration: 'K-12 tenure',
        value: '$120/year value',
        eligibility: 'K-12 teachers, school staff, and enrolled students',
        activationMethod: 'Verify teaching credentials or school domain',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.canva.com/education/',
        destinationUrl: 'https://www.canva.com/education/',
        termsUrl: 'https://www.canva.com/education/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Canva for Education is 100% free for K-12 teachers and their students with complete Magic Studio AI tools.',
        detectedAt: new Date('2026-08-20T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Figma for Education -> Free Professional
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Figma',
          aiProvider: 'figma-ai',
          aiPlan: 'Figma for Education',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Figma',
        partnerType: 'education',
        aiProvider: 'figma-ai',
        aiProviderDisplayName: 'Figma AI',
        isKnownAiProvider: true,
        aiPlan: 'Figma Professional for Education',
        offerTitle: 'Figma for Education (100% Free Professional Plan)',
        offerDescription:
          'Free access to Figma Professional plan including FigJam and collaborative design AI tools for verified students and educators.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        benefit: '100% FREE',
        duration: 'While enrolled (2-year re-verification)',
        value: '$144/year value',
        eligibility: 'Accredited university/college students and educators',
        activationMethod: 'Submit student application with .edu verification',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.figma.com/education/',
        destinationUrl: 'https://www.figma.com/education/',
        termsUrl: 'https://www.figma.com/education/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Figma is free for students and educators. Get full access to Figma Professional and FigJam.',
        detectedAt: new Date('2026-08-22T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Weights & Biases -> Academic Researchers
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Weights & Biases',
          aiProvider: 'wandb',
          aiPlan: 'W&B Academic Research',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Weights & Biases',
        partnerType: 'education',
        aiProvider: 'wandb',
        aiProviderDisplayName: 'Weights & Biases',
        isKnownAiProvider: true,
        aiPlan: 'W&B Academic Research',
        offerTitle: 'W&B for Students & Academic Researchers',
        offerDescription:
          'Free academic tier providing MLOps experiment tracking, model registry, and collaborative compute for university researchers.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        benefit: '100% FREE',
        duration: 'Academic research period',
        value: 'Complimentary',
        eligibility: 'Academic researchers and university students',
        activationMethod: 'Register with academic domain',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://wandb.ai/site/academic/',
        destinationUrl: 'https://wandb.ai/site/research/',
        termsUrl: 'https://wandb.ai/site/academic/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Weights & Biases is free for students, academic researchers, and professors.',
        detectedAt: new Date('2026-08-24T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Hugging Face Pro via GitHub Student Pack
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'GitHub Education',
          aiProvider: 'huggingface',
          aiPlan: 'Hugging Face Pro via GitHub Student Pack',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'GitHub Education',
        partnerType: 'education',
        aiProvider: 'huggingface',
        aiProviderDisplayName: 'Hugging Face',
        isKnownAiProvider: true,
        aiPlan: 'Hugging Face Pro',
        offerTitle: 'Hugging Face Pro via GitHub Student Developer Pack',
        offerDescription:
          'Complimentary access to Hugging Face Pro subscription features including AutoTrain, ZeroGPU quotas, and priority inference.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        benefit: '100% FREE',
        duration: 'While enrolled in GitHub Student Pack',
        value: '$108/year value',
        eligibility: 'Active GitHub Student Developer Pack members',
        activationMethod: 'Claim benefit via GitHub Education portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://education.github.com/pack',
        destinationUrl: 'https://education.github.com/pack',
        termsUrl: 'https://education.github.com/pack',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Get free access to Hugging Face Pro features and collaborative compute through the GitHub Student Developer Pack.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Lovable -> Student Discount
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Lovable',
          aiProvider: 'lovable',
          aiPlan: 'Lovable Pro Student',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Lovable',
        partnerType: 'education',
        aiProvider: 'lovable',
        aiProviderDisplayName: 'Lovable',
        isKnownAiProvider: true,
        aiPlan: 'Lovable Pro',
        offerTitle: 'Lovable Pro Student Discount',
        offerDescription:
          'Students with an accredited .edu email address or student verification receive 50% discount on Lovable Pro to build full-stack web applications.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: '50% OFF Pro ($12.50/mo)',
        duration: 'While enrolled',
        value: '$150/year value',
        eligibility: 'Verified Students (.edu)',
        activationMethod: 'Apply via student verification portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://lovable.dev/pricing',
        destinationUrl: 'https://lovable.dev/pricing',
        termsUrl: 'https://lovable.dev/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Students with a valid .edu email address or university verification receive 50% off Lovable Pro plans to build AI applications.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Replit -> Core Student Discount
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Replit',
          aiProvider: 'replit-ai',
          aiPlan: 'Replit Core Student',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Replit',
        partnerType: 'education',
        aiProvider: 'replit-ai',
        aiProviderDisplayName: 'Replit AI & Agent',
        isKnownAiProvider: true,
        aiPlan: 'Replit Core',
        offerTitle: 'Replit Core Student Discount',
        offerDescription:
          'Verified students get 50% off Replit Core subscription with access to Replit AI Agent, collaborative coding, and cloud deployments.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: '50% OFF Core ($10/mo)',
        duration: 'While enrolled',
        value: '$120/year value',
        eligibility: 'Verified Students via GitHub Student Developer Pack',
        activationMethod: 'Connect GitHub Student Developer Pack account',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://replit.com/pricing',
        destinationUrl: 'https://replit.com/pricing',
        termsUrl: 'https://replit.com/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Students enrolled through GitHub Student Developer Pack receive 50% discount on Replit Core with AI Agent access.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Framer -> Education Program
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Framer',
          aiProvider: 'framer',
          aiPlan: 'Framer Basic for Education',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Framer',
        partnerType: 'education',
        aiProvider: 'framer',
        aiProviderDisplayName: 'Framer',
        isKnownAiProvider: true,
        aiPlan: 'Framer Basic',
        offerTitle: 'Framer for Education (100% Free Plan)',
        offerDescription:
          'Verified students and educators receive 100% free Framer subscription for 1 year with AI site generation and custom domain publishing.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        category: 'student',
        benefit: '100% FREE',
        duration: '1 Year (renewable)',
        value: '$120/year value',
        eligibility: 'Students & Educators with accredited academic email',
        activationMethod: 'Apply with academic institution verification',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.framer.com/pricing/',
        destinationUrl: 'https://www.framer.com/pricing/',
        termsUrl: 'https://www.framer.com/pricing/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Students and teachers get a free Framer subscription for 1 year with full design and AI website publishing tools.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Speechify -> Student Discount
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Speechify',
          aiProvider: 'speechify',
          aiPlan: 'Speechify Premium Student',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Speechify',
        partnerType: 'education',
        aiProvider: 'speechify',
        aiProviderDisplayName: 'Speechify',
        isKnownAiProvider: true,
        aiPlan: 'Speechify Premium',
        offerTitle: 'Speechify Premium Student Discount',
        offerDescription:
          '25% discount on Speechify Premium text-to-speech voice reader and AI document summarizer for verified students.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: '25% OFF Premium',
        duration: 'While enrolled',
        value: '$35/year value',
        eligibility: 'Verified Students with academic ID',
        activationMethod: 'Verify student status via student verification form',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://speechify.com/pricing/',
        destinationUrl: 'https://speechify.com/students/',
        termsUrl: 'https://speechify.com/pricing/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Verified students receive 25% off Speechify Premium for AI text-to-speech reading and audio study summaries.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Mistral AI -> Student Discount
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Mistral AI',
          aiProvider: 'mistral',
          aiPlan: 'Mistral Le Chat Pro Student',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Mistral AI',
        partnerType: 'education',
        aiProvider: 'mistral',
        aiProviderDisplayName: 'Mistral AI (Le Chat)',
        isKnownAiProvider: true,
        aiPlan: 'Mistral Le Chat Pro',
        offerTitle: 'Mistral Le Chat Student Discount',
        offerDescription:
          'Complimentary Le Chat Pro and student developer API access for verified university students and faculty.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: 'Free Le Chat Pro Access for Students',
        duration: 'Academic year',
        value: 'Complimentary',
        eligibility: 'Verified academic students and educators',
        activationMethod: 'Sign up with verified university email',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://mistral.ai/',
        destinationUrl: 'https://mistral.ai/',
        termsUrl: 'https://mistral.ai/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Mistral offers complimentary Le Chat Pro access and student developer API allowances for verified academic domains.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Beautiful.ai -> Education Program
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Beautiful.ai',
          aiProvider: 'beautiful-ai',
          aiPlan: 'Beautiful.ai Pro for Education',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Beautiful.ai',
        partnerType: 'education',
        aiProvider: 'beautiful-ai',
        aiProviderDisplayName: 'Beautiful.ai',
        isKnownAiProvider: true,
        aiPlan: 'Beautiful.ai Pro',
        offerTitle: 'Beautiful.ai for Education (1-Year Free Pro)',
        offerDescription:
          '100% free full-featured Beautiful.ai Pro subscription for 1 year for verified university students ($144 value).',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'ACADEMIC_FREE',
        category: 'student',
        benefit: '100% FREE for 1 Year ($144 value)',
        duration: '1 Year',
        value: '$144 value',
        eligibility: 'Verified college and university students with .edu address',
        activationMethod: 'Sign up using official accredited .edu email address',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.beautiful.ai/pricing',
        destinationUrl: 'https://www.beautiful.ai/education',
        termsUrl: 'https://www.beautiful.ai/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Beautiful.ai offers a free 1-year Pro subscription for students with an accredited .edu email address.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Consensus -> Academic Discount
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Consensus',
          aiProvider: 'consensus',
          aiPlan: 'Consensus Premium Academic',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Consensus',
        partnerType: 'education',
        aiProvider: 'consensus',
        aiProviderDisplayName: 'Consensus',
        isKnownAiProvider: true,
        aiPlan: 'Consensus Premium',
        offerTitle: 'Consensus AI Academic Discount',
        offerDescription:
          '40% discount on Consensus Premium AI research search and paper synthesis for verified students and academic faculty.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: '40% OFF Premium',
        duration: 'While enrolled',
        value: '$48/year value',
        eligibility: 'Students, researchers, and university staff with .edu email',
        activationMethod: 'Verify academic status via student email',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://consensus.app/pricing/',
        destinationUrl: 'https://consensus.app/pricing/',
        termsUrl: 'https://consensus.app/pricing/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Verified academic users receive 40% discount on Consensus Premium for AI research search and paper synthesis.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Jasper -> Education & Nonprofits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Jasper',
          aiProvider: 'jasper',
          aiPlan: 'Jasper Education & Nonprofit',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'Jasper',
        partnerType: 'education',
        aiProvider: 'jasper',
        aiProviderDisplayName: 'Jasper',
        isKnownAiProvider: true,
        aiPlan: 'Jasper Pro',
        offerTitle: 'Jasper Education & Nonprofit Discount',
        offerDescription:
          '20% ongoing discount on Jasper AI marketing and content workspace plans for educators, students, and 501(c)(3) nonprofits.',
        offerType: 'EDUCATION_BUNDLE',
        offerSubtype: 'STUDENT_DISCOUNT',
        category: 'student',
        benefit: '20% OFF for Education & Nonprofits',
        duration: 'Annual verification',
        value: '$140/year value',
        eligibility: 'Registered educators, universities, and 501(c)(3) nonprofits',
        activationMethod: 'Submit proof of educational or nonprofit status',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.jasper.ai/pricing',
        destinationUrl: 'https://www.jasper.ai/pricing',
        termsUrl: 'https://www.jasper.ai/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eligible educators, students, and 501(c)(3) nonprofit organizations receive a 20% discount on Jasper AI plans.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];
  }

  /**
   * Returns verified startup grant & cloud program AI offers.
   * These are classified as Startup Grants — NOT Partner Bundles.
   * Stored with isPartnerOffer=false.
   */
  public static getKnownStartupOffers(): NormalizedPartnerOffer[] {
    return [
      // Microsoft for Startups Founders Hub -> OpenAI / Azure AI Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Microsoft for Startups',
          aiProvider: 'chatgpt',
          aiPlan: 'OpenAI API & Azure AI Credits',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Microsoft for Startups Founders Hub',
        partnerType: 'cloud',
        aiProvider: 'chatgpt',
        aiProviderDisplayName: 'ChatGPT (OpenAI)',
        isKnownAiProvider: true,
        aiPlan: 'OpenAI & Azure AI Credits',
        offerTitle: 'Up to $150,000 Azure AI & OpenAI Credits',
        offerDescription:
          'Free OpenAI API credits and Microsoft Azure cloud compute for qualified startups building AI applications.',
        offerType: 'CLOUD_BUNDLE',
        benefit: 'Up to $150,000 Credits',
        duration: '12 to 24 months',
        value: '$150,000 value',
        eligibility: 'Early-stage tech startups (Pre-seed to Series A)',
        activationMethod: 'Apply via Microsoft Founders Hub portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://startups.microsoft.com/',
        destinationUrl: 'https://startups.microsoft.com/',
        offerSubtype: 'STARTUP_GRANT',
        termsUrl: 'https://startups.microsoft.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Build on Microsoft Azure and get up to $150k in Azure credits plus direct OpenAI API credit grants.',
        detectedAt: new Date('2026-08-18T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // AWS Activate -> Anthropic Claude / Amazon Bedrock Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'AWS Activate',
          aiProvider: 'claude',
          aiPlan: 'Anthropic Claude & Bedrock Credits',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'AWS Activate',
        partnerType: 'cloud',
        aiProvider: 'claude',
        aiProviderDisplayName: 'Claude (Anthropic)',
        isKnownAiProvider: true,
        aiPlan: 'Anthropic Claude on Amazon Bedrock',
        offerTitle: 'Up to $100,000 AWS Activate AI Credits',
        offerDescription:
          'Complimentary AWS Cloud and Amazon Bedrock credits covering Claude 3.5 Sonnet, Claude Opus, and foundation models.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        benefit: 'Up to $100,000 Credits',
        duration: '12 months',
        value: '$100,000 value',
        eligibility: 'Affiliated startup founders and incubators',
        activationMethod: 'Apply via AWS Activate console',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://aws.amazon.com/activate/',
        destinationUrl: 'https://aws.amazon.com/activate/',
        termsUrl: 'https://aws.amazon.com/activate/terms/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'AWS Activate provides eligible startups with promotional credits usable on Amazon Bedrock and Anthropic AI services.',
        detectedAt: new Date('2026-08-20T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Google Cloud for Startups -> Gemini / Vertex AI Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Google Cloud for Startups',
          aiProvider: 'gemini',
          aiPlan: 'Google Gemini & Vertex AI Credits',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Google Cloud for Startups',
        partnerType: 'cloud',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Gemini 1.5 Pro & Vertex AI',
        offerTitle: 'Up to $200,000 Google Cloud AI Startup Program',
        offerDescription:
          'Receive Google Cloud and Vertex AI credits to power Gemini foundation models and multimodal enterprise pipelines.',
        offerType: 'CLOUD_BUNDLE',
        benefit: 'Up to $200,000 Credits',
        duration: '2 years',
        value: '$200,000 value',
        eligibility: 'Funded AI and SaaS technology startups',
        activationMethod: 'Apply via Google for Startups program page',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://cloud.google.com/startup',
        termsUrl: 'https://cloud.google.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Get up to $200,000 in Google Cloud credits over 2 years for AI-first startups utilizing Vertex AI and Gemini.',
        detectedAt: new Date('2026-08-22T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
        destinationUrl: 'https://cloud.google.com/startup',
        offerSubtype: 'STARTUP_GRANT',
      },

      // Notion for Startups -> Up to 6 Months Free Business + AI
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Notion',
          aiProvider: 'notion-ai',
          aiPlan: 'Notion for Startups',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Notion',
        partnerType: 'cloud',
        aiProvider: 'notion-ai',
        aiProviderDisplayName: 'Notion AI',
        isKnownAiProvider: true,
        aiPlan: 'Notion Business + Unlimited AI',
        offerTitle: 'Notion for Startups (Up to 6 Months Free Business + AI)',
        offerDescription:
          'Up to 6 months of free Notion Business with unlimited Notion AI workspace features for qualifying early-stage startups ($6,000–$12,000 value).',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        benefit: 'Up to 6 Months Free ($12,000 value)',
        duration: '3 to 6 months',
        value: '$12,000 value',
        eligibility: 'New Notion customers with affiliated accelerator or under $10M funding',
        activationMethod: 'Apply via Notion Startups program portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.notion.so/startups',
        destinationUrl: 'https://www.notion.com/startups',
        termsUrl: 'https://www.notion.com/startups',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Apply for up to 6 months of free Notion with unlimited AI for your team, worth up to $12,000.',
        detectedAt: new Date('2026-08-20T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // ElevenLabs Startup Grants -> 11M Characters/mo Free
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'ElevenLabs',
          aiProvider: 'elevenlabs',
          aiPlan: 'ElevenLabs Startup Grants',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'ElevenLabs',
        partnerType: 'cloud',
        aiProvider: 'elevenlabs',
        aiProviderDisplayName: 'ElevenLabs',
        isKnownAiProvider: true,
        aiPlan: 'ElevenLabs Startup Grant Tier',
        offerTitle: 'ElevenLabs Startup Grants (11M Characters/mo for 3 Months)',
        offerDescription:
          '11 million text-to-speech and voice cloning characters per month free for 3 months, offering over $5,500 in value for emerging startup builders.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        benefit: '11M Characters/mo ($5,500 value)',
        duration: '3 months',
        value: '$5,500 value',
        eligibility: 'Early-stage tech startups with under 25 employees and under $5M funding',
        activationMethod: 'Apply via ElevenLabs Grants application form',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://elevenlabs.io/startup-grants',
        destinationUrl: 'https://elevenlabs.io/startup-grants',
        termsUrl: 'https://elevenlabs.io/startup-grants',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'ElevenLabs grants 11 million characters per month for 3 months to help startups innovate with voice AI.',
        detectedAt: new Date('2026-08-22T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Vercel / v0 for Startups -> Up to $30,000 in Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Vercel',
          aiProvider: 'v0',
          aiPlan: 'Vercel for Startups (v0 Credits)',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Vercel',
        partnerType: 'cloud',
        aiProvider: 'v0',
        aiProviderDisplayName: 'v0 by Vercel',
        isKnownAiProvider: true,
        aiPlan: 'Vercel & v0 AI Credits',
        offerTitle: 'Vercel for Startups (Up to $30,000 in Vercel & v0 Credits)',
        offerDescription:
          'Accelerate full-stack and generative UI engineering with up to $30,000 in Vercel platform and v0 generation credits.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        benefit: 'Up to $30,000 Credits',
        duration: '12 months',
        value: '$30,000 value',
        eligibility: 'Early-stage startups affiliated with approved VC, incubator, or accelerator',
        activationMethod: 'Apply through Vercel for Startups page',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://vercel.com/startups',
        destinationUrl: 'https://vercel.com/startups',
        termsUrl: 'https://vercel.com/startups',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Qualified startups receive up to $30,000 in Vercel and v0 generation credits.',
        detectedAt: new Date('2026-08-24T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // OpenAI for Startups -> $5,000 to $100,000 API Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'OpenAI',
          aiProvider: 'chatgpt',
          aiPlan: 'OpenAI for Startups API Credits',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'OpenAI',
        partnerType: 'cloud',
        aiProvider: 'chatgpt',
        aiProviderDisplayName: 'OpenAI API',
        isKnownAiProvider: true,
        aiPlan: 'OpenAI API Startup Credits',
        offerTitle: 'OpenAI for Startups ($5,000 to $100,000 API Credits)',
        offerDescription:
          'Direct API credits for qualifying startups building on OpenAI frontier models, including technical office hours and architecture support.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        benefit: '$5,000 to $100,000 Credits',
        duration: '12 months',
        value: 'Up to $100,000 value',
        eligibility: 'Seed and Series A AI startups affiliated with partner VCs and accelerators',
        activationMethod: 'Apply via OpenAI for Startups application portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://openai.com/startups',
        destinationUrl: 'https://openai.com/startups',
        termsUrl: 'https://openai.com/startups',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'OpenAI for Startups provides up to $100,000 in API credits and technical guidance to accelerate your roadmap.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Replit -> Replit for Startups
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Replit',
          aiProvider: 'replit-ai',
          aiPlan: 'Replit for Startups Credits',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Replit',
        partnerType: 'cloud',
        aiProvider: 'replit-ai',
        aiProviderDisplayName: 'Replit AI & Agent',
        isKnownAiProvider: true,
        aiPlan: 'Replit for Startups',
        offerTitle: 'Replit for Startups',
        offerDescription:
          'Early-stage startups receive up to $25,000 in Replit credits for collaborative workspace compute, deployments, and autonomous AI agents.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        category: 'startup',
        benefit: 'Up to $25,000 in Replit Credits',
        duration: '12 months',
        value: '$25,000 value',
        eligibility: 'Early-stage startups affiliated with partner accelerators',
        activationMethod: 'Apply via Replit Startups partner portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://replit.com/pricing',
        destinationUrl: 'https://replit.com/pricing',
        termsUrl: 'https://replit.com/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eligible early-stage startups receive up to $25,000 in Replit cloud and AI agent compute credits.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Mistral AI -> Mistralship Startup Accelerator Grants
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Mistral AI',
          aiProvider: 'mistral',
          aiPlan: 'Mistralship Startup Accelerator',
          offerType: 'CLOUD_BUNDLE',
          region: 'Global',
        }),
        partner: 'Mistral AI',
        partnerType: 'cloud',
        aiProvider: 'mistral',
        aiProviderDisplayName: 'Mistral AI (Le Chat)',
        isKnownAiProvider: true,
        aiPlan: 'Mistral API Startup Grants',
        offerTitle: 'Mistralship Startup Accelerator Grants',
        offerDescription:
          'Mistralship program provides up to €30,000 in model API credits, dedicated engineering support, and technical office hours.',
        offerType: 'CLOUD_BUNDLE',
        offerSubtype: 'STARTUP_GRANT',
        category: 'startup',
        benefit: '€30,000 in Mistral API Credits',
        duration: '12 months',
        value: '€30,000 value',
        eligibility: 'Early-stage AI startups building on Mistral frontier models',
        activationMethod: 'Submit application via Mistral startup accelerator portal',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://mistral.ai/',
        destinationUrl: 'https://mistral.ai/',
        termsUrl: 'https://mistral.ai/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Mistralship program provides up to €30,000 in model API credits, dedicated engineering support, and technical office hours.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];
  }

  /**
   * Returns verified developer API discount & free usage allowance offers.
   * Classified as API Discounts — NOT Partner Bundles.
   * Stored with isPartnerOffer=false.
   */
  public static getKnownApiDiscountOffers(): NormalizedPartnerOffer[] {
    return [
      // Groq -> Free Developer Allowance
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Groq',
          aiProvider: 'groq',
          aiPlan: 'Groq Developer Free Tier',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Groq',
        partnerType: 'developer',
        aiProvider: 'groq',
        aiProviderDisplayName: 'Groq',
        isKnownAiProvider: true,
        aiPlan: 'Groq LPU Developer Inference',
        offerTitle: 'Groq Developer API Free Tier Allowance',
        offerDescription:
          'Free developer API access with generous rate limits on ultra-fast LPU inference for open models.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: 'Free Tier Allowance',
        duration: 'Ongoing free tier',
        value: 'Complimentary developer tier',
        eligibility: 'All registered developers on Groq Cloud Console',
        activationMethod: 'Create free account on console.groq.com and generate API key',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://console.groq.com/docs/rate-limits',
        destinationUrl: 'https://console.groq.com/docs/rate-limits',
        termsUrl: 'https://groq.com/terms-of-use/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText: 'Groq provides a free tier with high rate limits for developers building on open-source LLMs.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Fireworks AI -> Developer Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Fireworks AI',
          aiProvider: 'fireworks-ai',
          aiPlan: 'Fireworks Developer Platform',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Fireworks AI',
        partnerType: 'developer',
        aiProvider: 'fireworks-ai',
        aiProviderDisplayName: 'Fireworks AI',
        isKnownAiProvider: true,
        aiPlan: 'Fireworks Fast Inference',
        offerTitle: 'Fireworks AI Developer Free Credits',
        offerDescription:
          'Free trial credits for newly onboarded developers on Fireworks AI high-speed open-source model platform.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$1 Free Credit',
        duration: 'Upon registration',
        value: '$1 initial credit',
        eligibility: 'New developer accounts',
        activationMethod: 'Sign up on fireworks.ai and verify account',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://fireworks.ai/pricing',
        destinationUrl: 'https://fireworks.ai/pricing',
        termsUrl: 'https://fireworks.ai/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText: 'Newly registered accounts receive trial credits to test model inference and function calling.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Together AI -> Developer Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Together AI',
          aiProvider: 'together-ai',
          aiPlan: 'Together AI Inference Engine',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Together AI',
        partnerType: 'developer',
        aiProvider: 'together-ai',
        aiProviderDisplayName: 'Together AI',
        isKnownAiProvider: true,
        aiPlan: 'Together Developer API',
        offerTitle: 'Together AI Developer Trial Credits',
        offerDescription:
          'Complimentary API trial credits for developers fine-tuning and querying open-source models on Together AI.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$5 Free Trial Credit',
        duration: '3 months from signup',
        value: '$5 trial value',
        eligibility: 'New developer signups',
        activationMethod: 'Register on api.together.ai and add phone verification',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.together.ai/pricing',
        destinationUrl: 'https://www.together.ai/pricing',
        termsUrl: 'https://www.together.ai/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText: 'Sign up today and get $5 in free credits to explore our inference engine and fine-tuning APIs.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Cohere -> Developer Access
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Cohere',
          aiProvider: 'cohere',
          aiPlan: 'Cohere Developer Trial Key',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Cohere',
        partnerType: 'developer',
        aiProvider: 'cohere',
        aiProviderDisplayName: 'Cohere',
        isKnownAiProvider: true,
        aiPlan: 'Cohere Command & Embed Trial API',
        offerTitle: 'Cohere Developer API Free Tier',
        offerDescription:
          'Free developer API access for embedding, reranking, and Command models in non-production environments.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: 'Free Trial Key',
        duration: 'Ongoing developer rate limit',
        value: 'Complimentary evaluation access',
        eligibility: 'All developers prototyping with Cohere models',
        activationMethod: 'Sign up on dashboard.cohere.com for instant Trial API key',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://cohere.com/pricing',
        destinationUrl: 'https://cohere.com/pricing',
        termsUrl: 'https://cohere.com/pricing',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText: 'Trial API keys are free forever for experimentation with generous monthly rate limits.',
        detectedAt: new Date('2026-08-25T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Cerebras -> Free Daily API Allowance
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Cerebras',
          aiProvider: 'cerebras',
          aiPlan: 'Cerebras Inference 1M Tokens/Day',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Cerebras',
        partnerType: 'developer',
        aiProvider: 'cerebras',
        aiProviderDisplayName: 'Cerebras',
        isKnownAiProvider: true,
        aiPlan: 'Cerebras Inference Free Tier',
        offerTitle: 'Cerebras Inference Free Daily Allowance',
        offerDescription:
          '1,000,000 free input and output tokens daily on ultra-fast wafer-scale Llama 3.1 8B and 70B inference endpoints.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '1,000,000 Free Tokens / Day',
        duration: 'Daily recurring allowance',
        value: '1M Tokens Daily',
        eligibility: 'All registered developer accounts',
        activationMethod: 'Sign up on cloud.cerebras.ai for instant developer API key',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://cerebras.ai/pricing',
        destinationUrl: 'https://cerebras.ai/pricing',
        termsUrl: 'https://cerebras.ai/terms-of-service/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Cerebras provides 1M free input/output tokens daily on ultra-fast wafer-scale Llama 3.1 8B and 70B models.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Cerebras -> $5 Signup Credit
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Cerebras',
          aiProvider: 'cerebras',
          aiPlan: 'Cerebras Developer $5 Credit',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Cerebras',
        partnerType: 'developer',
        aiProvider: 'cerebras',
        aiProviderDisplayName: 'Cerebras',
        isKnownAiProvider: true,
        aiPlan: 'Cerebras API Credit',
        offerTitle: 'Cerebras Developer $5 Signup Credit',
        offerDescription:
          'Complimentary $5 in API credits for developers exploring high-throughput model endpoints on Cerebras Inference.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$5 Free Credit',
        duration: 'Upon signup',
        value: '$5 credit',
        eligibility: 'New developer accounts',
        activationMethod: 'Register account on cloud.cerebras.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://cerebras.ai/pricing',
        destinationUrl: 'https://cerebras.ai/pricing',
        termsUrl: 'https://cerebras.ai/terms-of-service/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Sign up for Cerebras Inference and receive $5 in complimentary API credits for high-throughput model endpoints.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // SambaNova -> $5 API Credit & Free Tier
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'SambaNova',
          aiProvider: 'sambanova',
          aiPlan: 'SambaNova Cloud Developer Tier',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'SambaNova',
        partnerType: 'developer',
        aiProvider: 'sambanova',
        aiProviderDisplayName: 'SambaNova',
        isKnownAiProvider: true,
        aiPlan: 'SambaNova Cloud API',
        offerTitle: 'SambaNova Cloud Developer $5 Credit & Free Tier',
        offerDescription:
          'Free developer access and $5 in evaluation credits to build with high-speed open foundation models on SambaNova SN40L chips.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$5 Free API Credit & Free Tier',
        duration: 'Evaluation period',
        value: '$5 credit',
        eligibility: 'All registered developer accounts',
        activationMethod: 'Create free account on cloud.sambanova.ai and create API key',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://cloud.sambanova.ai/pricing',
        destinationUrl: 'https://cloud.sambanova.ai/',
        termsUrl: 'https://sambanova.ai/terms-of-use/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'SambaNova Cloud provides a free developer tier with $5 in free credits to test high-speed open foundation models.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // DeepInfra -> $1.80 Free API Starting Credit
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'DeepInfra',
          aiProvider: 'deepinfra',
          aiPlan: 'DeepInfra Developer Credit',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'DeepInfra',
        partnerType: 'developer',
        aiProvider: 'deepinfra',
        aiProviderDisplayName: 'DeepInfra',
        isKnownAiProvider: true,
        aiPlan: 'DeepInfra Serverless API',
        offerTitle: 'DeepInfra Developer $1.80 Free Credit',
        offerDescription:
          'Sign up for DeepInfra serverless AI model inference and receive $1.80 in complimentary API credits.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$1.80 Free Credit',
        duration: 'Upon registration',
        value: '$1.80 credit',
        eligibility: 'All newly registered developer accounts',
        activationMethod: 'Sign up on deepinfra.com and generate API key',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://deepinfra.com/pricing',
        destinationUrl: 'https://deepinfra.com/',
        termsUrl: 'https://deepinfra.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'New users receive $1.80 in free credits to test serverless LLMs and embedding models on DeepInfra.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Hyperbolic -> $10 Free GPU Cloud Onboarding Credit
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Hyperbolic',
          aiProvider: 'hyperbolic',
          aiPlan: 'Hyperbolic Onboarding Grant',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Hyperbolic',
        partnerType: 'developer',
        aiProvider: 'hyperbolic',
        aiProviderDisplayName: 'Hyperbolic',
        isKnownAiProvider: true,
        aiPlan: 'Hyperbolic GPU Cloud',
        offerTitle: 'Hyperbolic GPU Cloud $10 Onboarding Grant',
        offerDescription:
          'Developers receive $10 in complimentary compute and inference credits to test open-source LLMs on decentralized GPUs.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$10 Free Inference Credit',
        duration: 'Onboarding grant',
        value: '$10 credit',
        eligibility: 'New developer accounts',
        activationMethod: 'Sign up on hyperbolic.xyz',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://hyperbolic.xyz/pricing',
        destinationUrl: 'https://hyperbolic.xyz/',
        termsUrl: 'https://hyperbolic.xyz/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Hyperbolic grants $10 in free developer credits to deploy and run inference on open-source foundation models.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Novita AI -> Free Developer Trial Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Novita AI',
          aiProvider: 'novita-ai',
          aiPlan: 'Novita AI Developer Trial',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Novita AI',
        partnerType: 'developer',
        aiProvider: 'novita-ai',
        aiProviderDisplayName: 'Novita AI',
        isKnownAiProvider: true,
        aiPlan: 'Novita AI Serverless',
        offerTitle: 'Novita AI Developer Trial Credits',
        offerDescription:
          'Free trial credits provided to test serverless LLMs, image generation, and speech APIs on Novita AI GPU infrastructure.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: 'Free Trial Credits',
        duration: 'Trial credit',
        value: 'Complimentary developer trial credits',
        eligibility: 'All new developer accounts',
        activationMethod: 'Create free account on novita.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://novita.ai/pricing',
        destinationUrl: 'https://novita.ai/',
        termsUrl: 'https://novita.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Novita AI provides starting trial credits for new developer accounts to test serverless LLM, image, and voice endpoints.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date('2026-09-01T00:00:00Z'),
        lastCheckedAt: new Date(),
        lastCatalogSyncAt: new Date(),
        verificationMethod: 'STATIC_SEED',
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Modal Labs -> $30/mo Recurring Free Developer Compute Tier
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Modal Labs',
          aiProvider: 'modal-labs',
          aiPlan: 'Modal Free Developer Compute',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Modal Labs',
        partnerType: 'developer',
        aiProvider: 'modal-labs',
        aiProviderDisplayName: 'Modal Labs',
        isKnownAiProvider: true,
        aiPlan: 'Modal Starter Tier',
        offerTitle: 'Modal $30/mo Recurring Free Compute Allowance',
        offerDescription:
          'Every Modal developer account receives $30/month in free compute credits for serverless Python functions, AI fine-tuning, and inference.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$30/month Free Compute',
        duration: 'Monthly recurring grant',
        value: '$30/month',
        eligibility: 'All registered developers',
        activationMethod: 'Sign up on modal.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://modal.com/pricing',
        destinationUrl: 'https://modal.com/',
        termsUrl: 'https://modal.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Modal includes $30 of free compute credits every month on the Community plan for running serverless AI jobs.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Baseten -> $30 Free Model Deployment Credit
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Baseten',
          aiProvider: 'baseten',
          aiPlan: 'Baseten Developer Trial',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Baseten',
        partnerType: 'developer',
        aiProvider: 'baseten',
        aiProviderDisplayName: 'Baseten',
        isKnownAiProvider: true,
        aiPlan: 'Baseten Serverless Model Deployment',
        offerTitle: 'Baseten $30 Free Developer Trial Credit',
        offerDescription:
          'Deploy open-source and custom ML models on dedicated serverless GPUs with $30 in complimentary trial credits.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$30 Free Trial Credit',
        duration: 'Trial credit',
        value: '$30 credit',
        eligibility: 'New developer accounts',
        activationMethod: 'Sign up on baseten.co',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.baseten.co/pricing',
        destinationUrl: 'https://www.baseten.co/',
        termsUrl: 'https://www.baseten.co/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Baseten grants $30 in free credits to deploy and serve custom machine learning models on cloud GPUs.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Deepgram -> $200 Speech AI Starter Grant
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Deepgram',
          aiProvider: 'deepgram',
          aiPlan: 'Deepgram Developer Starter Grant',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Deepgram',
        partnerType: 'developer',
        aiProvider: 'deepgram',
        aiProviderDisplayName: 'Deepgram',
        isKnownAiProvider: true,
        aiPlan: 'Deepgram Voice AI API',
        offerTitle: 'Deepgram Speech AI $200 Starter Grant',
        offerDescription:
          'Sign up for Deepgram real-time speech-to-text and text-to-speech API and receive $200 in free developer credits.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$200 Free API Credit',
        duration: 'Upon signup',
        value: '$200 credit',
        eligibility: 'All new developer accounts',
        activationMethod: 'Sign up on console.deepgram.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://deepgram.com/pricing',
        destinationUrl: 'https://deepgram.com/',
        termsUrl: 'https://deepgram.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Deepgram provides $200 in free credits upon registration to test real-time automated speech recognition and audio intelligence.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // AssemblyAI -> $50 Speech AI Developer Grant
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'AssemblyAI',
          aiProvider: 'assemblyai',
          aiPlan: 'AssemblyAI Developer Grant',
          offerType: 'API_DISCOUNT',
          region: 'Global',
        }),
        partner: 'AssemblyAI',
        partnerType: 'developer',
        aiProvider: 'assemblyai',
        aiProviderDisplayName: 'AssemblyAI',
        isKnownAiProvider: true,
        aiPlan: 'AssemblyAI Speech API',
        offerTitle: 'AssemblyAI Speech-to-Text $50 Free Credit',
        offerDescription:
          'Get $50 in free API credits to transcribe audio and video, extract sentiment, and analyze speech using AssemblyAI Conformer models.',
        offerType: 'API_DISCOUNT',
        offerSubtype: 'API_DISCOUNT',
        category: 'api',
        benefit: '$50 Free API Credit',
        duration: 'Upon registration',
        value: '$50 credit',
        eligibility: 'All registered developer accounts',
        activationMethod: 'Sign up on assemblyai.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.assemblyai.com/pricing',
        destinationUrl: 'https://www.assemblyai.com/',
        termsUrl: 'https://www.assemblyai.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'AssemblyAI includes $50 in complimentary API credits to transcribe and understand speech with advanced AI models.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];
  }

  /**
   * Returns verified annual savings AI offers meeting the strict >=15% savings threshold.
   * Stored with isPartnerOffer=false and category='annual'.
   */
  public static getKnownAnnualSavingsOffers(): NormalizedPartnerOffer[] {
    return [
      // 1. Lovable Pro Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Lovable',
          aiProvider: 'lovable',
          aiPlan: 'Lovable Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Lovable',
        partnerType: 'software',
        aiProvider: 'lovable',
        aiProviderDisplayName: 'Lovable',
        isKnownAiProvider: true,
        aiPlan: 'Lovable Pro',
        offerTitle: 'Lovable Pro Annual Savings',
        offerDescription:
          'Save 20% on Lovable Pro when billed annually at $480/year ($40/month equivalent vs $50/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 20% OFF',
        duration: 'Annual subscription',
        value: 'Save $120/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://lovable.dev/pricing',
        destinationUrl: 'https://lovable.dev/pricing',
        termsUrl: 'https://lovable.dev/pricing',
        monthlyEquivalent: 40,
        annualPrice: 480,
        annualSavingsPercent: 20,
        annualSavingsAmount: 120,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual billing on Lovable Pro ($40/month billed annually at $480/yr vs $50/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 2. Framer Pro Annual Savings (25%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Framer',
          aiProvider: 'framer',
          aiPlan: 'Framer Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Framer',
        partnerType: 'software',
        aiProvider: 'framer',
        aiProviderDisplayName: 'Framer',
        isKnownAiProvider: true,
        aiPlan: 'Framer Pro',
        offerTitle: 'Framer Pro Annual Savings',
        offerDescription:
          'Save 25% on Framer Pro with annual billing ($30/month billed annually at $360/year vs $40/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 25% OFF',
        duration: 'Annual subscription',
        value: 'Save $120/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.framer.com/pricing/',
        destinationUrl: 'https://www.framer.com/pricing/',
        termsUrl: 'https://www.framer.com/pricing/',
        monthlyEquivalent: 30,
        annualPrice: 360,
        annualSavingsPercent: 25,
        annualSavingsAmount: 120,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 25% with annual billing on Framer Pro ($30/month billed annually at $360/yr vs $40/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 3. Kling AI Annual Savings (45%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Kling AI',
          aiProvider: 'kling-ai',
          aiPlan: 'Kling AI Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Kling AI',
        partnerType: 'software',
        aiProvider: 'kling-ai',
        aiProviderDisplayName: 'Kling AI',
        isKnownAiProvider: true,
        aiPlan: 'Kling AI Pro',
        offerTitle: 'Kling AI Annual Savings',
        offerDescription:
          'Save up to 45% on Kling AI Pro video generation plans with annual subscription ($20.33/month eq vs $37/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 45% OFF',
        duration: 'Annual subscription',
        value: 'Save up to 45%',
        eligibility: 'All Users',
        officialSourceUrl: 'https://klingai.com/pricing',
        destinationUrl: 'https://klingai.com/',
        termsUrl: 'https://klingai.com/pricing',
        monthlyEquivalent: 20.33,
        annualPrice: 244,
        annualSavingsPercent: 45,
        annualSavingsAmount: 200,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Kling AI offers up to 45% discount on annual subscriptions for Pro and Premier video generation tiers.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 4. Luma Dream Machine Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Luma AI',
          aiProvider: 'luma-ai',
          aiPlan: 'Luma Dream Machine Standard Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Luma AI',
        partnerType: 'software',
        aiProvider: 'luma-ai',
        aiProviderDisplayName: 'Luma AI',
        isKnownAiProvider: true,
        aiPlan: 'Luma Dream Machine Standard',
        offerTitle: 'Luma Dream Machine Annual Savings',
        offerDescription:
          'Save 20% on Luma Dream Machine Standard AI video creation ($23.99/month billed annually vs $29.99/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $72/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://lumalabs.ai/dream-machine/pricing',
        destinationUrl: 'https://lumalabs.ai/dream-machine',
        termsUrl: 'https://lumalabs.ai/terms',
        monthlyEquivalent: 23.99,
        annualPrice: 287.88,
        annualSavingsPercent: 20,
        annualSavingsAmount: 72,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% on Luma Dream Machine Standard and Pro video subscription tiers when billed annually.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 5. Udio Music Pro Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Udio',
          aiProvider: 'udio',
          aiPlan: 'Udio Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Udio',
        partnerType: 'software',
        aiProvider: 'udio',
        aiProviderDisplayName: 'Udio',
        isKnownAiProvider: true,
        aiPlan: 'Udio Pro',
        offerTitle: 'Udio Music Pro Annual Savings',
        offerDescription:
          'Save 20% on Udio Pro music generator plans with annual billing ($24/month billed annually vs $30/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $72/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.udio.com/pricing',
        destinationUrl: 'https://www.udio.com/',
        termsUrl: 'https://www.udio.com/terms',
        monthlyEquivalent: 24,
        annualPrice: 288,
        annualSavingsPercent: 20,
        annualSavingsAmount: 72,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual subscription billing on Udio Standard ($8/mo vs $10/mo) and Pro ($24/mo vs $30/mo) music creator plans.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 6. Speechify Premium Annual Savings (60%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Speechify',
          aiProvider: 'speechify',
          aiPlan: 'Speechify Premium Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Speechify',
        partnerType: 'software',
        aiProvider: 'speechify',
        aiProviderDisplayName: 'Speechify',
        isKnownAiProvider: true,
        aiPlan: 'Speechify Premium',
        offerTitle: 'Speechify Premium Annual Savings',
        offerDescription:
          'Save 60% on Speechify Premium text-to-speech with annual billing ($139/year equivalent to $11.58/mo vs $29/mo monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '60% OFF',
        duration: 'Annual subscription',
        value: 'Save $209/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://speechify.com/pricing/',
        destinationUrl: 'https://speechify.com/',
        termsUrl: 'https://speechify.com/terms/',
        monthlyEquivalent: 11.58,
        annualPrice: 139,
        annualSavingsPercent: 60,
        annualSavingsAmount: 209,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 60% with annual billing on Speechify Premium ($139/year equivalent to $11.58/mo vs $29/mo monthly).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 7. Beautiful.ai Pro Annual Savings (73%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Beautiful.ai',
          aiProvider: 'beautiful-ai',
          aiPlan: 'Beautiful.ai Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Beautiful.ai',
        partnerType: 'software',
        aiProvider: 'beautiful-ai',
        aiProviderDisplayName: 'Beautiful.ai',
        isKnownAiProvider: true,
        aiPlan: 'Beautiful.ai Pro',
        offerTitle: 'Beautiful.ai Pro Annual Savings',
        offerDescription:
          'Save 73% on Beautiful.ai Pro presentations with annual billing ($12/month billed annually at $144/year vs $45/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 73% OFF',
        duration: 'Annual subscription',
        value: 'Save $396/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.beautiful.ai/pricing',
        destinationUrl: 'https://www.beautiful.ai/pricing',
        termsUrl: 'https://www.beautiful.ai/terms',
        monthlyEquivalent: 12,
        annualPrice: 144,
        annualSavingsPercent: 73,
        annualSavingsAmount: 396,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 73% on Beautiful.ai Pro with annual billing ($12/month billed annually at $144/year vs $45/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 8. Gamma Pro Annual Savings (25%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Gamma',
          aiProvider: 'gamma',
          aiPlan: 'Gamma Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Gamma',
        partnerType: 'software',
        aiProvider: 'gamma',
        aiProviderDisplayName: 'Gamma',
        isKnownAiProvider: true,
        aiPlan: 'Gamma Pro',
        offerTitle: 'Gamma Pro Annual Savings',
        offerDescription:
          'Save 25% on Gamma Pro with annual billing ($15/month billed annually at $180/year vs $20/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 25% OFF',
        duration: 'Annual subscription',
        value: 'Save $60/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://gamma.app/pricing',
        destinationUrl: 'https://gamma.app/pricing',
        termsUrl: 'https://gamma.app/terms',
        monthlyEquivalent: 15,
        annualPrice: 180,
        annualSavingsPercent: 25,
        annualSavingsAmount: 60,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 25% with annual billing on Gamma Pro ($15/month billed annually at $180/yr vs $20/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 9. Consensus Premium Annual Savings (40%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Consensus',
          aiProvider: 'consensus',
          aiPlan: 'Consensus Premium Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Consensus',
        partnerType: 'software',
        aiProvider: 'consensus',
        aiProviderDisplayName: 'Consensus',
        isKnownAiProvider: true,
        aiPlan: 'Consensus Premium',
        offerTitle: 'Consensus Premium Annual Savings',
        offerDescription:
          'Save 40% on Consensus Premium AI research search with annual billing ($8.99/mo billed annually vs $14.99/mo monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '40% OFF',
        duration: 'Annual subscription',
        value: 'Save $72/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://consensus.app/pricing/',
        destinationUrl: 'https://consensus.app/',
        termsUrl: 'https://consensus.app/terms/',
        monthlyEquivalent: 8.99,
        annualPrice: 107.88,
        annualSavingsPercent: 40,
        annualSavingsAmount: 72,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 40% with annual subscription billing on Consensus Premium ($8.99/mo billed annually vs $14.99/mo monthly).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 10. Jasper Creator Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Jasper',
          aiProvider: 'jasper',
          aiPlan: 'Jasper Creator Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Jasper',
        partnerType: 'software',
        aiProvider: 'jasper',
        aiProviderDisplayName: 'Jasper',
        isKnownAiProvider: true,
        aiPlan: 'Jasper Creator',
        offerTitle: 'Jasper Creator Annual Savings',
        offerDescription:
          'Save 20% on Jasper Creator with annual billing ($39/month billed annually at $468/year vs $49/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $120/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.jasper.ai/pricing',
        destinationUrl: 'https://www.jasper.ai/',
        termsUrl: 'https://www.jasper.ai/terms',
        monthlyEquivalent: 39,
        annualPrice: 468,
        annualSavingsPercent: 20,
        annualSavingsAmount: 120,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% on Jasper Creator with annual billing ($39/month billed annually at $468/year vs $49/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 11. Copy.ai Pro Annual Savings (26%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Copy.ai',
          aiProvider: 'copy-ai',
          aiPlan: 'Copy.ai Starter Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Copy.ai',
        partnerType: 'software',
        aiProvider: 'copy-ai',
        aiProviderDisplayName: 'Copy.ai',
        isKnownAiProvider: true,
        aiPlan: 'Copy.ai Starter',
        offerTitle: 'Copy.ai Pro Annual Savings',
        offerDescription:
          'Save 26% on Copy.ai Starter plan with annual billing ($36/month billed annually at $432/year vs $49/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 26% OFF',
        duration: 'Annual subscription',
        value: 'Save $156/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.copy.ai/pricing',
        destinationUrl: 'https://www.copy.ai/',
        termsUrl: 'https://www.copy.ai/terms',
        monthlyEquivalent: 36,
        annualPrice: 432,
        annualSavingsPercent: 26,
        annualSavingsAmount: 156,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 26% with annual billing on Copy.ai Starter ($36/mo billed annually at $432/yr vs $49/mo monthly).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 12. Writesonic Individual Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Writesonic',
          aiProvider: 'writesonic',
          aiPlan: 'Writesonic Individual Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Writesonic',
        partnerType: 'software',
        aiProvider: 'writesonic',
        aiProviderDisplayName: 'Writesonic',
        isKnownAiProvider: true,
        aiPlan: 'Writesonic Individual',
        offerTitle: 'Writesonic Individual Annual Savings',
        offerDescription:
          'Save 20% on Writesonic Individual with annual billing ($16/month billed annually at $192/year vs $20/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $48/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://writesonic.com/pricing',
        destinationUrl: 'https://writesonic.com/',
        termsUrl: 'https://writesonic.com/terms',
        monthlyEquivalent: 16,
        annualPrice: 192,
        annualSavingsPercent: 20,
        annualSavingsAmount: 48,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual subscription billing on Writesonic Individual ($16/mo billed annually at $192/yr vs $20/mo monthly).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 13. Uizard Pro Annual Savings (37%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Uizard',
          aiProvider: 'uizard',
          aiPlan: 'Uizard Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Uizard',
        partnerType: 'software',
        aiProvider: 'uizard',
        aiProviderDisplayName: 'Uizard',
        isKnownAiProvider: true,
        aiPlan: 'Uizard Pro',
        offerTitle: 'Uizard Pro Annual Savings',
        offerDescription:
          'Save 37% on Uizard Pro UI design assistant with annual billing ($12/month billed annually at $144/year vs $19/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: 'Up to 37% OFF',
        duration: 'Annual subscription',
        value: 'Save $84/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://uizard.io/pricing/',
        destinationUrl: 'https://uizard.io/',
        termsUrl: 'https://uizard.io/terms',
        monthlyEquivalent: 12,
        annualPrice: 144,
        annualSavingsPercent: 37,
        annualSavingsAmount: 84,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 37% with annual billing on Uizard Pro ($12/month billed annually at $144/year vs $19/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 14. Elicit Plus Annual Savings (17%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Elicit',
          aiProvider: 'elicit',
          aiPlan: 'Elicit Plus Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Elicit',
        partnerType: 'software',
        aiProvider: 'elicit',
        aiProviderDisplayName: 'Elicit',
        isKnownAiProvider: true,
        aiPlan: 'Elicit Plus',
        offerTitle: 'Elicit Plus Annual Savings',
        offerDescription:
          'Save 17% on Elicit Plus research engine with annual billing ($10/month billed annually at $120/year vs $12/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '17% OFF',
        duration: 'Annual subscription',
        value: 'Save $24/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://elicit.com/pricing',
        destinationUrl: 'https://elicit.com/',
        termsUrl: 'https://elicit.com/terms',
        monthlyEquivalent: 10,
        annualPrice: 120,
        annualSavingsPercent: 17,
        annualSavingsAmount: 24,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 17% with annual billing on Elicit Plus ($10/month billed annually at $120/year vs $12/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 15. Scite Individual Annual Savings (37.5%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Scite',
          aiProvider: 'scite',
          aiPlan: 'Scite Individual Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Scite',
        partnerType: 'software',
        aiProvider: 'scite',
        aiProviderDisplayName: 'Scite',
        isKnownAiProvider: true,
        aiPlan: 'Scite Individual',
        offerTitle: 'Scite Individual Annual Savings',
        offerDescription:
          'Save 37.5% on Scite Smart Citations with annual billing ($12.50/month billed annually at $150/year vs $20/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '37.5% OFF',
        duration: 'Annual subscription',
        value: 'Save $90/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://scite.ai/pricing',
        destinationUrl: 'https://scite.ai/',
        termsUrl: 'https://scite.ai/terms',
        monthlyEquivalent: 12.5,
        annualPrice: 150,
        annualSavingsPercent: 38,
        annualSavingsAmount: 90,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 37.5% with annual billing on Scite Individual ($12.50/month billed annually at $150/year vs $20/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 16. Bolt.new Pro Annual Savings (28%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Bolt.new',
          aiProvider: 'bolt-new',
          aiPlan: 'Bolt.new Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Bolt.new',
        partnerType: 'software',
        aiProvider: 'bolt-new',
        aiProviderDisplayName: 'Bolt.new',
        isKnownAiProvider: true,
        aiPlan: 'Bolt.new Pro',
        offerTitle: 'Bolt.new Pro Annual Savings',
        offerDescription:
          'Save 28% on Bolt.new Pro with annual billing ($18/month billed annually at $216/year vs $25/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '28% OFF',
        duration: 'Annual subscription',
        value: 'Save $84/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://bolt.new/',
        destinationUrl: 'https://bolt.new/',
        termsUrl: 'https://bolt.new/',
        monthlyEquivalent: 18,
        annualPrice: 216,
        annualSavingsPercent: 28,
        annualSavingsAmount: 84,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 28% with annual billing on Bolt.new Pro ($18/month billed annually at $216/year vs $25/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Sourcegraph Cody Pro Annual Savings (25%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Sourcegraph Cody',
          aiProvider: 'sourcegraph-cody',
          aiPlan: 'Cody Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Sourcegraph Cody',
        partnerType: 'developer',
        aiProvider: 'sourcegraph-cody',
        aiProviderDisplayName: 'Sourcegraph Cody',
        isKnownAiProvider: true,
        aiPlan: 'Cody Pro',
        offerTitle: 'Sourcegraph Cody Pro Annual Savings',
        offerDescription:
          'Save 25% on Cody Pro with annual billing ($9/month billed annually at $108/year vs $12/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '25% OFF',
        duration: 'Annual subscription',
        value: 'Save $36/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://sourcegraph.com/pricing',
        destinationUrl: 'https://sourcegraph.com/pricing',
        termsUrl: 'https://sourcegraph.com/terms',
        monthlyEquivalent: 9,
        annualPrice: 108,
        annualSavingsPercent: 25,
        annualSavingsAmount: 36,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 25% on Sourcegraph Cody Pro with annual billing ($9/month billed annually at $108/yr vs $12/month monthly).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Supermaven Pro Annual Savings (17.5%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Supermaven',
          aiProvider: 'supermaven',
          aiPlan: 'Supermaven Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Supermaven',
        partnerType: 'developer',
        aiProvider: 'supermaven',
        aiProviderDisplayName: 'Supermaven',
        isKnownAiProvider: true,
        aiPlan: 'Supermaven Pro',
        offerTitle: 'Supermaven Pro Annual Savings',
        offerDescription:
          'Save 17.5% on Supermaven Pro ultra-fast coding assistant with annual billing ($99/year vs $10/month monthly billing).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '17.5% OFF',
        duration: 'Annual subscription',
        value: 'Save $21/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://supermaven.com/pricing',
        destinationUrl: 'https://supermaven.com/pricing',
        termsUrl: 'https://supermaven.com/terms',
        monthlyEquivalent: 8.25,
        annualPrice: 99,
        annualSavingsPercent: 17.5,
        annualSavingsAmount: 21,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Supermaven Pro offers annual billing at $99/year compared to $10/month on monthly billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Jenni AI Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Jenni AI',
          aiProvider: 'jenni-ai',
          aiPlan: 'Jenni AI Unlimited Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Jenni AI',
        partnerType: 'software',
        aiProvider: 'jenni-ai',
        aiProviderDisplayName: 'Jenni AI',
        isKnownAiProvider: true,
        aiPlan: 'Jenni AI Unlimited',
        offerTitle: 'Jenni AI Academic Writer Annual Savings',
        offerDescription:
          'Save 20% on Jenni AI Unlimited research writing with annual billing ($12/month billed annually at $144/year vs $15/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $36/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://jenni.ai/pricing',
        destinationUrl: 'https://jenni.ai/pricing',
        termsUrl: 'https://jenni.ai/terms',
        monthlyEquivalent: 12,
        annualPrice: 144,
        annualSavingsPercent: 20,
        annualSavingsAmount: 36,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual subscription billing on Jenni AI Unlimited academic research writing assistant.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Paperpal Prime Annual Savings (33%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Paperpal',
          aiProvider: 'paperpal',
          aiPlan: 'Paperpal Prime Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Paperpal',
        partnerType: 'software',
        aiProvider: 'paperpal',
        aiProviderDisplayName: 'Paperpal',
        isKnownAiProvider: true,
        aiPlan: 'Paperpal Prime',
        offerTitle: 'Paperpal Prime Academic Writing Annual Savings',
        offerDescription:
          'Save 33% on Paperpal Prime academic journal writing and manuscript checker ($9.91/month billed annually at $119/year vs $14.95/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '33% OFF',
        duration: 'Annual subscription',
        value: 'Save $60.40/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://paperpal.com/pricing',
        destinationUrl: 'https://paperpal.com/pricing',
        termsUrl: 'https://paperpal.com/terms',
        monthlyEquivalent: 9.91,
        annualPrice: 119,
        annualSavingsPercent: 33,
        annualSavingsAmount: 60.4,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 33% with annual billing on Paperpal Prime ($119/year billed annually vs $14.95/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // ChatPDF Plus Annual Savings (33%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'ChatPDF',
          aiProvider: 'chatpdf',
          aiPlan: 'ChatPDF Plus Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'ChatPDF',
        partnerType: 'software',
        aiProvider: 'chatpdf',
        aiProviderDisplayName: 'ChatPDF',
        isKnownAiProvider: true,
        aiPlan: 'ChatPDF Plus',
        offerTitle: 'ChatPDF Plus Annual Savings',
        offerDescription:
          'Save 33% on ChatPDF Plus research document analysis ($3.33/month billed annually at $39.99/year vs $5/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '33% OFF',
        duration: 'Annual subscription',
        value: 'Save $20/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.chatpdf.com/pricing',
        destinationUrl: 'https://www.chatpdf.com/pricing',
        termsUrl: 'https://www.chatpdf.com/terms',
        monthlyEquivalent: 3.33,
        annualPrice: 39.99,
        annualSavingsPercent: 33,
        annualSavingsAmount: 20.01,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 33% with annual billing on ChatPDF Plus ($39.99/year billed annually vs $5/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Recraft Pro Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Recraft AI',
          aiProvider: 'recraft-ai',
          aiPlan: 'Recraft Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Recraft AI',
        partnerType: 'software',
        aiProvider: 'recraft-ai',
        aiProviderDisplayName: 'Recraft AI',
        isKnownAiProvider: true,
        aiPlan: 'Recraft Pro',
        offerTitle: 'Recraft Pro Vector AI Annual Savings',
        offerDescription:
          'Save 20% on Recraft Pro vector design with annual billing ($20/month billed annually at $240/year vs $25/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $60/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.recraft.ai/pricing',
        destinationUrl: 'https://www.recraft.ai/pricing',
        termsUrl: 'https://www.recraft.ai/terms',
        monthlyEquivalent: 20,
        annualPrice: 240,
        annualSavingsPercent: 20,
        annualSavingsAmount: 60,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% on Recraft Pro vector and 3D graphics generation when subscribing with annual billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Pika Pro Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Pika Labs',
          aiProvider: 'pika-art',
          aiPlan: 'Pika Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Pika Labs',
        partnerType: 'software',
        aiProvider: 'pika-art',
        aiProviderDisplayName: 'Pika Labs',
        isKnownAiProvider: true,
        aiPlan: 'Pika Pro',
        offerTitle: 'Pika Pro AI Video Annual Savings',
        offerDescription:
          'Save 20% on Pika Pro AI video creation with annual billing ($8/month billed annually at $96/year vs $10/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $24/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://pika.art/pricing',
        destinationUrl: 'https://pika.art/pricing',
        termsUrl: 'https://pika.art/terms',
        monthlyEquivalent: 8,
        annualPrice: 96,
        annualSavingsPercent: 20,
        annualSavingsAmount: 24,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual subscription billing on Pika Pro generative video creator plans.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // InVideo Plus Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'InVideo AI',
          aiProvider: 'invideo-ai',
          aiPlan: 'InVideo Plus Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'InVideo AI',
        partnerType: 'software',
        aiProvider: 'invideo-ai',
        aiProviderDisplayName: 'InVideo AI',
        isKnownAiProvider: true,
        aiPlan: 'InVideo Plus',
        offerTitle: 'InVideo Plus AI Video Annual Savings',
        offerDescription:
          'Save 20% on InVideo Plus AI script-to-video generator with annual billing ($20/month billed annually at $240/year vs $25/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $60/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://invideo.io/pricing/',
        destinationUrl: 'https://invideo.io/pricing/',
        termsUrl: 'https://invideo.io/terms',
        monthlyEquivalent: 20,
        annualPrice: 240,
        annualSavingsPercent: 20,
        annualSavingsAmount: 60,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% on InVideo Plus when billed annually at $240/year compared to $25/month on monthly billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Murf AI Studio Annual Savings (34%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Murf AI',
          aiProvider: 'murf-ai',
          aiPlan: 'Murf AI Creator Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Murf AI',
        partnerType: 'software',
        aiProvider: 'murf-ai',
        aiProviderDisplayName: 'Murf AI',
        isKnownAiProvider: true,
        aiPlan: 'Murf AI Creator',
        offerTitle: 'Murf AI Voice Studio Annual Savings',
        offerDescription:
          'Save 34% on Murf AI voice studio with annual billing ($19/month billed annually at $228/year vs $29/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '34% OFF',
        duration: 'Annual subscription',
        value: 'Save $120/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://murf.ai/pricing',
        destinationUrl: 'https://murf.ai/pricing',
        termsUrl: 'https://murf.ai/terms',
        monthlyEquivalent: 19,
        annualPrice: 228,
        annualSavingsPercent: 34,
        annualSavingsAmount: 120,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 34% on Murf AI Creator and Business voiceover plans when subscribing on annual billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Fireflies Pro Annual Savings (44%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Fireflies.ai',
          aiProvider: 'fireflies-ai',
          aiPlan: 'Fireflies Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Fireflies.ai',
        partnerType: 'software',
        aiProvider: 'fireflies-ai',
        aiProviderDisplayName: 'Fireflies.ai',
        isKnownAiProvider: true,
        aiPlan: 'Fireflies Pro',
        offerTitle: 'Fireflies Pro Meeting Assistant Annual Savings',
        offerDescription:
          'Save 44% on Fireflies Pro AI meeting transcription with annual billing ($10/month billed annually at $120/year vs $18/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '44% OFF',
        duration: 'Annual subscription',
        value: 'Save $96/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://fireflies.ai/pricing',
        destinationUrl: 'https://fireflies.ai/pricing',
        termsUrl: 'https://fireflies.ai/terms',
        monthlyEquivalent: 10,
        annualPrice: 120,
        annualSavingsPercent: 44,
        annualSavingsAmount: 96,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 44% with annual subscription billing on Fireflies.ai Pro AI meeting intelligence plans.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // QuillBot Premium Annual Savings (58%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'QuillBot',
          aiProvider: 'quillbot',
          aiPlan: 'QuillBot Premium Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'QuillBot',
        partnerType: 'software',
        aiProvider: 'quillbot',
        aiProviderDisplayName: 'QuillBot',
        isKnownAiProvider: true,
        aiPlan: 'QuillBot Premium',
        offerTitle: 'QuillBot Premium Annual Savings',
        offerDescription:
          'Save 58% on QuillBot Premium paraphrasing and grammar assistant ($4.17/month billed annually at $49.95/year vs $9.95/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '58% OFF',
        duration: 'Annual subscription',
        value: 'Save $69.45/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://quillbot.com/upgrade',
        destinationUrl: 'https://quillbot.com/upgrade',
        termsUrl: 'https://quillbot.com/terms',
        monthlyEquivalent: 4.17,
        annualPrice: 49.95,
        annualSavingsPercent: 58,
        annualSavingsAmount: 69.45,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 58% on QuillBot Premium with annual billing at $49.95/year ($4.17/mo eq vs $9.95/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Wordtune Unlimited Annual Savings (60%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Wordtune',
          aiProvider: 'wordtune',
          aiPlan: 'Wordtune Unlimited Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Wordtune',
        partnerType: 'software',
        aiProvider: 'wordtune',
        aiProviderDisplayName: 'Wordtune',
        isKnownAiProvider: true,
        aiPlan: 'Wordtune Unlimited',
        offerTitle: 'Wordtune Unlimited Annual Savings',
        offerDescription:
          'Save 60% on Wordtune Unlimited AI writing companion ($9.99/month billed annually at $119.88/year vs $24.99/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '60% OFF',
        duration: 'Annual subscription',
        value: 'Save $180/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.wordtune.com/pricing',
        destinationUrl: 'https://www.wordtune.com/pricing',
        termsUrl: 'https://www.wordtune.com/terms',
        monthlyEquivalent: 9.99,
        annualPrice: 119.88,
        annualSavingsPercent: 60,
        annualSavingsAmount: 180,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 60% with annual billing on Wordtune Unlimited ($119.88/year vs $24.99/month monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Rytr Unlimited Annual Savings (17%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Rytr',
          aiProvider: 'rytr',
          aiPlan: 'Rytr Unlimited Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Rytr',
        partnerType: 'software',
        aiProvider: 'rytr',
        aiProviderDisplayName: 'Rytr',
        isKnownAiProvider: true,
        aiPlan: 'Rytr Unlimited',
        offerTitle: 'Rytr Unlimited Annual Savings',
        offerDescription:
          'Save 17% on Rytr Unlimited copywriting with annual billing ($90/year vs $9/month = 2 months free annually).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '17% OFF (2 Months Free)',
        duration: 'Annual subscription',
        value: 'Save $18/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://rytr.me/pricing',
        destinationUrl: 'https://rytr.me/pricing',
        termsUrl: 'https://rytr.me/terms',
        monthlyEquivalent: 7.5,
        annualPrice: 90,
        annualSavingsPercent: 17,
        annualSavingsAmount: 18,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Rytr Unlimited offers annual billing at $90/year giving 2 months free compared to $9/month monthly billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Miro Starter AI Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Miro AI',
          aiProvider: 'miro-ai',
          aiPlan: 'Miro Starter AI Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Miro AI',
        partnerType: 'software',
        aiProvider: 'miro-ai',
        aiProviderDisplayName: 'Miro AI',
        isKnownAiProvider: true,
        aiPlan: 'Miro Starter Plan',
        offerTitle: 'Miro Starter AI Visual Workspace Annual Savings',
        offerDescription:
          'Save 20% on Miro Starter collaborative visual workspace with annual billing ($8/member/month billed annually at $96/year vs $10/member/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $24/member/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://miro.com/pricing/',
        destinationUrl: 'https://miro.com/pricing/',
        termsUrl: 'https://miro.com/terms',
        monthlyEquivalent: 8,
        annualPrice: 96,
        annualSavingsPercent: 20,
        annualSavingsAmount: 24,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% on Miro Starter when billed annually ($8/member/mo vs $10/member/mo monthly billing).',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Taskade Pro Annual Savings (20%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Taskade AI',
          aiProvider: 'taskade',
          aiPlan: 'Taskade Pro Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Taskade AI',
        partnerType: 'software',
        aiProvider: 'taskade',
        aiProviderDisplayName: 'Taskade AI',
        isKnownAiProvider: true,
        aiPlan: 'Taskade Pro',
        offerTitle: 'Taskade Pro AI Workspace Annual Savings',
        offerDescription:
          'Save 20% on Taskade Pro autonomous AI agent workspace with annual billing ($8/month billed annually at $96/year vs $10/month monthly).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '20% OFF',
        duration: 'Annual subscription',
        value: 'Save $24/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://www.taskade.com/pricing',
        destinationUrl: 'https://www.taskade.com/pricing',
        termsUrl: 'https://www.taskade.com/terms',
        monthlyEquivalent: 8,
        annualPrice: 96,
        annualSavingsPercent: 20,
        annualSavingsAmount: 24,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 20% with annual subscription billing on Taskade Pro AI agent workspace plans.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Zapier Pro Annual Savings (33%)
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Zapier AI',
          aiProvider: 'zapier-ai',
          aiPlan: 'Zapier Professional Annual',
          offerType: 'ANNUAL_DISCOUNT',
          region: 'Global',
        }),
        partner: 'Zapier AI',
        partnerType: 'software',
        aiProvider: 'zapier-ai',
        aiProviderDisplayName: 'Zapier AI',
        isKnownAiProvider: true,
        aiPlan: 'Zapier Professional',
        offerTitle: 'Zapier Pro AI Automation Annual Savings',
        offerDescription:
          'Save 33% on Zapier Professional workflow automation with annual billing ($19.99/month billed annually at $239.88/year vs $29.99/month).',
        offerType: 'ANNUAL_DISCOUNT',
        offerSubtype: 'ANNUAL_DISCOUNT',
        category: 'annual',
        benefit: '33% OFF',
        duration: 'Annual subscription',
        value: 'Save $120/year',
        eligibility: 'All Users',
        officialSourceUrl: 'https://zapier.com/pricing',
        destinationUrl: 'https://zapier.com/pricing',
        termsUrl: 'https://zapier.com/terms',
        monthlyEquivalent: 19.99,
        annualPrice: 239.88,
        annualSavingsPercent: 33,
        annualSavingsAmount: 120,
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Save 33% on Zapier Professional automation plans when subscribing with annual billing.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];
  }

  /**
   * Returns verified free tier & free promotional credit AI offers.
   * Stored with isPartnerOffer=false and category='free'.
   */
  public static getKnownFreeTierOffers(): NormalizedPartnerOffer[] {
    return [
      // 1. Amazon Q Developer Free Tier
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Amazon Q Developer',
          aiProvider: 'amazon-q',
          aiPlan: 'Amazon Q Developer Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Amazon Q Developer',
        partnerType: 'developer',
        aiProvider: 'amazon-q',
        aiProviderDisplayName: 'Amazon Q Developer',
        isKnownAiProvider: true,
        aiPlan: 'Amazon Q Free Tier',
        offerTitle: 'Amazon Q Developer Free Tier',
        offerDescription:
          'Unlimited inline code suggestions, reference tracking, and security scans for individual developers using AWS Builder ID.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100% Free Developer Tier',
        duration: 'Ongoing free tier',
        value: 'Free developer tier',
        eligibility: 'All AWS Builder ID developers (no credit card required)',
        activationMethod: 'Sign in with AWS Builder ID in VS Code / JetBrains IDE',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://aws.amazon.com/q/developer/pricing/',
        destinationUrl: 'https://aws.amazon.com/q/developer/',
        termsUrl: 'https://aws.amazon.com/terms/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Amazon Q Developer includes unlimited inline code suggestions, reference tracking, and security scanning in the Free tier.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 2. Kling AI Daily Free Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Kling AI',
          aiProvider: 'kling-ai',
          aiPlan: 'Kling AI Daily Free Allowance',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Kling AI',
        partnerType: 'software',
        aiProvider: 'kling-ai',
        aiProviderDisplayName: 'Kling AI',
        isKnownAiProvider: true,
        aiPlan: 'Kling AI Free Tier',
        offerTitle: 'Kling AI Daily Free Credits',
        offerDescription:
          'Registered users receive 66 complimentary credits every day to generate high-definition AI video clips and animations.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '66 Daily Free Credits',
        duration: 'Daily recurring grant',
        value: '66 credits/day',
        eligibility: 'All registered users daily',
        activationMethod: 'Log in daily on klingai.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://klingai.com/pricing',
        destinationUrl: 'https://klingai.com/',
        termsUrl: 'https://klingai.com/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Registered users receive 66 complimentary credits every single day to generate high-definition AI videos.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 3. Udio Music Free Creator Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Udio',
          aiProvider: 'udio',
          aiPlan: 'Udio Free Creator Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Udio',
        partnerType: 'software',
        aiProvider: 'udio',
        aiProviderDisplayName: 'Udio',
        isKnownAiProvider: true,
        aiPlan: 'Udio Free Plan',
        offerTitle: 'Udio Music Free Creator Plan',
        offerDescription:
          'Free music generation plan with 10 daily prompt credits plus 100 extra monthly credits for standard audio quality.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100 Free Monthly Credits',
        duration: 'Ongoing free plan',
        value: 'Free creator tier',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on udio.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.udio.com/pricing',
        destinationUrl: 'https://www.udio.com/',
        termsUrl: 'https://www.udio.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Free plan includes 10 daily prompt credits plus 100 bonus monthly credits for full AI music track generation.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // 4. Gamma 400 Free AI Onboarding Credits
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Gamma',
          aiProvider: 'gamma',
          aiPlan: 'Gamma 400 Onboarding Credits',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Gamma',
        partnerType: 'software',
        aiProvider: 'gamma',
        aiProviderDisplayName: 'Gamma',
        isKnownAiProvider: true,
        aiPlan: 'Gamma Free Tier',
        offerTitle: 'Gamma 400 Free AI Onboarding Credits',
        offerDescription:
          'New users receive 400 free AI generation credits at signup to generate interactive presentations, documents, and web pages.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '400 Free AI Credits',
        duration: 'Upon signup',
        value: '400 credits',
        eligibility: 'All new registered accounts',
        activationMethod: 'Sign up for free account on gamma.app',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://gamma.app/pricing',
        destinationUrl: 'https://gamma.app/pricing',
        termsUrl: 'https://gamma.app/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'New users receive 400 free AI generation credits at signup to create interactive presentations, webpages, and docs.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Sourcegraph Cody Free Developer Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Sourcegraph Cody',
          aiProvider: 'sourcegraph-cody',
          aiPlan: 'Cody Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Sourcegraph Cody',
        partnerType: 'developer',
        aiProvider: 'sourcegraph-cody',
        aiProviderDisplayName: 'Sourcegraph Cody',
        isKnownAiProvider: true,
        aiPlan: 'Cody Free Plan',
        offerTitle: 'Sourcegraph Cody Free Developer Tier',
        offerDescription:
          'Complimentary Cody Free tier providing 500 autocomplete suggestions and 20 AI chats per month with multi-repo context.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: 'Free Developer Tier',
        duration: 'Ongoing free plan',
        value: '500 completions & 20 chats/mo',
        eligibility: 'All developers',
        activationMethod: 'Install Cody extension in VS Code / JetBrains',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://sourcegraph.com/pricing',
        destinationUrl: 'https://sourcegraph.com/pricing',
        termsUrl: 'https://sourcegraph.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Cody Free includes 500 autocompletions and 20 chats per month with context-aware code generation.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Supermaven Free 1M Token Context Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Supermaven',
          aiProvider: 'supermaven',
          aiPlan: 'Supermaven Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Supermaven',
        partnerType: 'developer',
        aiProvider: 'supermaven',
        aiProviderDisplayName: 'Supermaven',
        isKnownAiProvider: true,
        aiPlan: 'Supermaven Free Plan',
        offerTitle: 'Supermaven 1M Token Context Free Tier',
        offerDescription:
          'Fast inline code autocomplete with 1,000,000 token context window, completely free for individual developers.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100% Free Developer Plan',
        duration: 'Ongoing free tier',
        value: '1M context autocomplete',
        eligibility: 'All developers',
        activationMethod: 'Install Supermaven extension in VS Code / Neovim / JetBrains',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://supermaven.com/pricing',
        destinationUrl: 'https://supermaven.com/pricing',
        termsUrl: 'https://supermaven.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Supermaven Free tier includes ultra-fast inline code suggestions with 1M-token context window.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Sweep AI Free Developer Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Sweep AI',
          aiProvider: 'sweep-ai',
          aiPlan: 'Sweep AI Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Sweep AI',
        partnerType: 'developer',
        aiProvider: 'sweep-ai',
        aiProviderDisplayName: 'Sweep AI',
        isKnownAiProvider: true,
        aiPlan: 'Sweep Free Tier',
        offerTitle: 'Sweep AI Free Developer Plan',
        offerDescription:
          'AI junior developer agent providing 5 complimentary GitHub issue-to-pull-request automated resolutions every month.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '5 Free PR Resolutions/Month',
        duration: 'Monthly recurring plan',
        value: '5 tickets/month',
        eligibility: 'All developers with GitHub repos',
        activationMethod: 'Install Sweep GitHub App on repository',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://sweep.dev/pricing',
        destinationUrl: 'https://sweep.dev/pricing',
        termsUrl: 'https://sweep.dev/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Sweep includes 5 free monthly issue completions turning bugs and feature requests into pull requests.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Bito AI Developer Free Tier
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Bito',
          aiProvider: 'bito',
          aiPlan: 'Bito Free Plan',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Bito',
        partnerType: 'developer',
        aiProvider: 'bito',
        aiProviderDisplayName: 'Bito',
        isKnownAiProvider: true,
        aiPlan: 'Bito Free Tier',
        offerTitle: 'Bito AI Developer Free Tier',
        offerDescription:
          'AI code review and assistant providing 10,000 monthly request credits for code generation, explanation, and test generation.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '10,000 Monthly AI Credits',
        duration: 'Ongoing free plan',
        value: '10K requests/mo',
        eligibility: 'All developers',
        activationMethod: 'Install Bito IDE plugin',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://bito.ai/pricing/',
        destinationUrl: 'https://bito.ai/pricing/',
        termsUrl: 'https://bito.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Bito Free includes 10,000 AI requests per month for code completions, code review, and automated tests.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Pieces OS Free Developer Suite
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Pieces for Developers',
          aiProvider: 'pieces-app',
          aiPlan: 'Pieces Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Pieces for Developers',
        partnerType: 'developer',
        aiProvider: 'pieces-app',
        aiProviderDisplayName: 'Pieces for Developers',
        isKnownAiProvider: true,
        aiPlan: 'Pieces OS Suite',
        offerTitle: 'Pieces OS Local AI Developer Suite',
        offerDescription:
          '100% free on-device AI contextual copilot and snippet management system with zero cloud dependency.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100% Free Local AI Suite',
        duration: 'Ongoing free software',
        value: 'Free developer suite',
        eligibility: 'All individual developers',
        activationMethod: 'Download Pieces OS from pieces.app',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://pieces.app/pricing',
        destinationUrl: 'https://pieces.app/pricing',
        termsUrl: 'https://pieces.app/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Pieces OS is completely free for individual developers with local on-device AI Copilot and snippet capture.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Recraft AI Free Creator Tier
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Recraft AI',
          aiProvider: 'recraft-ai',
          aiPlan: 'Recraft Free Plan',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Recraft AI',
        partnerType: 'software',
        aiProvider: 'recraft-ai',
        aiProviderDisplayName: 'Recraft AI',
        isKnownAiProvider: true,
        aiPlan: 'Recraft Free Tier',
        offerTitle: 'Recraft Vector AI Free Creator Plan',
        offerDescription:
          'Generate vector icons, 3D graphics, and digital illustrations with 50 complimentary credits refreshed every day.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '50 Daily Free Credits',
        duration: 'Daily recurring grant',
        value: '50 credits/day',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on recraft.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.recraft.ai/pricing',
        destinationUrl: 'https://www.recraft.ai/pricing',
        termsUrl: 'https://www.recraft.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Recraft Free tier includes 50 free generation credits generated daily for SVG vector art and icons.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Playground AI Free Daily Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Playground AI',
          aiProvider: 'playground-ai',
          aiPlan: 'Playground Free Plan',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Playground AI',
        partnerType: 'software',
        aiProvider: 'playground-ai',
        aiProviderDisplayName: 'Playground AI',
        isKnownAiProvider: true,
        aiPlan: 'Playground Free Tier',
        offerTitle: 'Playground AI Free Daily Creator Allowance',
        offerDescription:
          'Create up to 50 high-resolution AI image generations per day on the collaborative graphic design canvas.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '50 Free Images/Day',
        duration: 'Daily recurring grant',
        value: '50 images/day',
        eligibility: 'All registered accounts',
        activationMethod: 'Sign in on playground.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://playground.com/pricing',
        destinationUrl: 'https://playground.com/pricing',
        termsUrl: 'https://playground.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Playground Free tier offers 50 free image generations per day with standard resolution on the canvas.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Play.ht Free Voice Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Play.ht',
          aiProvider: 'play-ht',
          aiPlan: 'Play.ht Free Plan',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Play.ht',
        partnerType: 'software',
        aiProvider: 'play-ht',
        aiProviderDisplayName: 'Play.ht',
        isKnownAiProvider: true,
        aiPlan: 'Play.ht Free Tier',
        offerTitle: 'Play.ht AI Voice Free Tier',
        offerDescription:
          'Free text-to-speech plan providing 12,500 characters of studio-quality AI voice generation with access to all standard voices.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '12,500 Free Characters',
        duration: 'Ongoing free plan',
        value: '12,500 characters',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on play.ht',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://play.ht/pricing/',
        destinationUrl: 'https://play.ht/pricing/',
        termsUrl: 'https://play.ht/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Play.ht Free plan provides 12,500 free characters of AI speech generation with standard voice clones.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Fathom AI Free Meeting Assistant
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Fathom AI',
          aiProvider: 'fathom-ai',
          aiPlan: 'Fathom Free Plan',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Fathom AI',
        partnerType: 'software',
        aiProvider: 'fathom-ai',
        aiProviderDisplayName: 'Fathom AI',
        isKnownAiProvider: true,
        aiPlan: 'Fathom Free Tier',
        offerTitle: 'Fathom Free Unlimited AI Meeting Assistant',
        offerDescription:
          '100% free unlimited AI meeting recorder, real-time transcription, and automated summary generator for Zoom, Teams, and Google Meet.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100% Free Unlimited Meetings',
        duration: 'Ongoing free tier',
        value: 'Unlimited meeting recording',
        eligibility: 'All individual users',
        activationMethod: 'Install Fathom app from fathom.video',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://fathom.video/pricing',
        destinationUrl: 'https://fathom.video/pricing',
        termsUrl: 'https://fathom.video/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Fathom is 100% free for individuals with unlimited meeting recording, transcription, and AI summary generation.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Eraser DiagramGPT Free Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Eraser.io',
          aiProvider: 'eraser-io',
          aiPlan: 'Eraser Free Plan',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Eraser.io',
        partnerType: 'developer',
        aiProvider: 'eraser-io',
        aiProviderDisplayName: 'Eraser.io',
        isKnownAiProvider: true,
        aiPlan: 'Eraser DiagramGPT Free Tier',
        offerTitle: 'Eraser DiagramGPT Free Plan',
        offerDescription:
          'Create technical architecture diagrams, cloud flowcharts, and sequence diagrams with 5 complimentary DiagramGPT AI generations per month.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '5 Free AI Diagrams/Month',
        duration: 'Monthly recurring plan',
        value: '5 diagrams/mo',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on eraser.io',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.eraser.io/pricing',
        destinationUrl: 'https://www.eraser.io/pricing',
        termsUrl: 'https://www.eraser.io/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eraser includes 5 free DiagramGPT generations per month for creating software architecture diagrams.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Coze AI Free Daily Bot Execution Allowance
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Coze AI',
          aiProvider: 'coze-ai',
          aiPlan: 'Coze Free Tier',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Coze AI',
        partnerType: 'developer',
        aiProvider: 'coze-ai',
        aiProviderDisplayName: 'Coze AI',
        isKnownAiProvider: true,
        aiPlan: 'Coze Free Plan',
        offerTitle: 'Coze AI Free Daily Bot Execution Allowance',
        offerDescription:
          'Build, publish, and run custom AI agents and chatbots with 100 free daily execution credits connecting multiple LLMs.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '100 Free Daily Executions',
        duration: 'Daily recurring allowance',
        value: '100 executions/day',
        eligibility: 'All registered developers',
        activationMethod: 'Sign up on coze.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.coze.com/pricing',
        destinationUrl: 'https://www.coze.com/pricing',
        termsUrl: 'https://www.coze.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Coze Free plan provides 100 daily execution credits to build and deploy intelligent chatbot agents.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Dify.ai Cloud Community Free Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Dify.ai',
          aiProvider: 'dify-ai',
          aiPlan: 'Dify Community Plan',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Dify.ai',
        partnerType: 'developer',
        aiProvider: 'dify-ai',
        aiProviderDisplayName: 'Dify.ai',
        isKnownAiProvider: true,
        aiPlan: 'Dify Cloud Community',
        offerTitle: 'Dify.ai Cloud Community Free Plan',
        offerDescription:
          'Visual LLM application orchestrator providing 200 free message credits per month and vector database storage.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '200 Free Message Credits/Month',
        duration: 'Monthly recurring plan',
        value: '200 message credits/mo',
        eligibility: 'All registered developers',
        activationMethod: 'Sign up on cloud.dify.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://dify.ai/pricing',
        destinationUrl: 'https://dify.ai/pricing',
        termsUrl: 'https://dify.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Dify Cloud Sandbox plan includes 200 free LLM message calls per month for building AI workflows.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Miro Free Plan with AI
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Miro AI',
          aiProvider: 'miro-ai',
          aiPlan: 'Miro Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Miro AI',
        partnerType: 'software',
        aiProvider: 'miro-ai',
        aiProviderDisplayName: 'Miro AI',
        isKnownAiProvider: true,
        aiPlan: 'Miro Free Plan',
        offerTitle: 'Miro Free Plan with AI Diagramming',
        offerDescription:
          'Free 3 editable collaborative whiteboards with built-in AI mind mapping, sticky note clustering, and diagram generation.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: 'Free 3-Board AI Workspace',
        duration: 'Ongoing free plan',
        value: '3 editable boards',
        eligibility: 'All users',
        activationMethod: 'Sign up on miro.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://miro.com/pricing/',
        destinationUrl: 'https://miro.com/pricing/',
        termsUrl: 'https://miro.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Miro Free plan includes 3 editable boards with AI mind mapping, sticky note clustering, and templates.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Taskade Free Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Taskade AI',
          aiProvider: 'taskade',
          aiPlan: 'Taskade Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Taskade AI',
        partnerType: 'software',
        aiProvider: 'taskade',
        aiProviderDisplayName: 'Taskade AI',
        isKnownAiProvider: true,
        aiPlan: 'Taskade Free Plan',
        offerTitle: 'Taskade AI Free Productivity Tier',
        offerDescription:
          'All-in-one AI productivity workspace with 1,000 complimentary AI credits per month, unlimited tasks, and projects.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '1,000 Monthly AI Credits',
        duration: 'Ongoing free plan',
        value: '1,000 credits/mo',
        eligibility: 'All users',
        activationMethod: 'Sign up on taskade.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.taskade.com/pricing',
        destinationUrl: 'https://www.taskade.com/pricing',
        termsUrl: 'https://www.taskade.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Taskade Free plan includes 1,000 AI credits monthly for outlining, mind mapping, and task management.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Zapier Free Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Zapier AI',
          aiProvider: 'zapier-ai',
          aiPlan: 'Zapier Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Zapier AI',
        partnerType: 'software',
        aiProvider: 'zapier-ai',
        aiProviderDisplayName: 'Zapier AI',
        isKnownAiProvider: true,
        aiPlan: 'Zapier Free Plan',
        offerTitle: 'Zapier Free Automation Plan',
        offerDescription:
          'Automate workflows across 6,000+ apps with 100 free tasks per month and AI Copilot workflow builder.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '100 Free Tasks/Month',
        duration: 'Ongoing free plan',
        value: '100 tasks/mo',
        eligibility: 'All users',
        activationMethod: 'Sign up on zapier.com',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://zapier.com/pricing',
        destinationUrl: 'https://zapier.com/pricing',
        termsUrl: 'https://zapier.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Zapier Free includes 100 tasks per month, unlimited zaps, and AI Copilot workflow generator.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Jenni AI Free Daily Words
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Jenni AI',
          aiProvider: 'jenni-ai',
          aiPlan: 'Jenni AI Free Tier',
          offerType: 'PROMOTIONAL_FREE',
          region: 'Global',
        }),
        partner: 'Jenni AI',
        partnerType: 'software',
        aiProvider: 'jenni-ai',
        aiProviderDisplayName: 'Jenni AI',
        isKnownAiProvider: true,
        aiPlan: 'Jenni AI Free Plan',
        offerTitle: 'Jenni AI Free Daily 200 Words Tier',
        offerDescription:
          'Academic research writing assistant providing 200 free AI generated words every day for literature reviews and essays.',
        offerType: 'PROMOTIONAL_FREE',
        offerSubtype: 'PROMOTIONAL_FREE',
        category: 'free',
        benefit: '200 Free Words/Day',
        duration: 'Daily recurring grant',
        value: '200 words/day',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on jenni.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://jenni.ai/pricing',
        destinationUrl: 'https://jenni.ai/pricing',
        termsUrl: 'https://jenni.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Jenni AI Free tier includes 200 free AI words generated daily with in-text citation assistance.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Pika Labs Free Basic Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Pika Labs',
          aiProvider: 'pika-art',
          aiPlan: 'Pika Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Pika Labs',
        partnerType: 'software',
        aiProvider: 'pika-art',
        aiProviderDisplayName: 'Pika Labs',
        isKnownAiProvider: true,
        aiPlan: 'Pika Basic Plan',
        offerTitle: 'Pika Labs Free Basic Video Plan',
        offerDescription:
          'Generate high-definition AI video clips with 250 complimentary initial credits and standard rendering queue.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '250 Free Initial Credits',
        duration: 'Ongoing free tier',
        value: '250 credits',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on pika.art',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://pika.art/pricing',
        destinationUrl: 'https://pika.art/pricing',
        termsUrl: 'https://pika.art/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Pika Basic plan includes 250 free initial generation credits with standard generation queue.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Murf AI Free Evaluation Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Murf AI',
          aiProvider: 'murf-ai',
          aiPlan: 'Murf AI Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Murf AI',
        partnerType: 'software',
        aiProvider: 'murf-ai',
        aiProviderDisplayName: 'Murf AI',
        isKnownAiProvider: true,
        aiPlan: 'Murf AI Free Plan',
        offerTitle: 'Murf AI Free Voiceover Evaluation Plan',
        offerDescription:
          'Test studio-quality voice generation with 10 minutes of free voice generation and 10 minutes of transcription.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '10 Minutes Free Voiceover',
        duration: 'Evaluation plan',
        value: '10 min voice generation',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on murf.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://murf.ai/pricing',
        destinationUrl: 'https://murf.ai/pricing',
        termsUrl: 'https://murf.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Murf Free plan includes 10 minutes of voice generation and transcription to evaluate AI voice models.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Fireflies Free Meeting Transcription Plan
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Fireflies.ai',
          aiProvider: 'fireflies-ai',
          aiPlan: 'Fireflies Free Tier',
          offerType: 'FREE_PLAN',
          region: 'Global',
        }),
        partner: 'Fireflies.ai',
        partnerType: 'software',
        aiProvider: 'fireflies-ai',
        aiProviderDisplayName: 'Fireflies.ai',
        isKnownAiProvider: true,
        aiPlan: 'Fireflies Free Plan',
        offerTitle: 'Fireflies Free AI Meeting Transcription Plan',
        offerDescription:
          'Automatic meeting recording and transcription with 800 minutes of storage across Zoom, Teams, and Google Meet.',
        offerType: 'FREE_PLAN',
        offerSubtype: 'FREE_PLAN',
        category: 'free',
        benefit: '800 Minutes Free Storage',
        duration: 'Ongoing free plan',
        value: '800 min transcription storage',
        eligibility: 'All registered users',
        activationMethod: 'Sign up on fireflies.ai',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://fireflies.ai/pricing',
        destinationUrl: 'https://fireflies.ai/pricing',
        termsUrl: 'https://fireflies.ai/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Fireflies Free includes automated meeting transcription and 800 minutes of storage per seat.',
        detectedAt: new Date('2026-09-01T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },
    ];
  }

  /**
   * Reconciles stale partner offers by deactivating those not confirmed in the current scan.
   * 
   * CRITICAL: This prevents broken offers (404, expired) from remaining active indefinitely.
   * Only deactivates offers after a grace period to avoid false positives from temporary scan issues.
   * 
   * @param confirmedFingerprints - Set of offer fingerprints confirmed in current scan
   * @param scanSuccessful - Whether the scan completed successfully (false = network/rate limit issues)
   * @returns Count of deactivated and preserved offers
   */
  public static async reconcileStaleOffers(
    confirmedFingerprints: Set<string>,
    scanSuccessful: boolean
  ): Promise<{ deactivatedCount: number; preservedCount: number }> {
    if (!scanSuccessful) {
      console.log('[PartnerScanner:Reconcile] Scan failed — preserving all active offers');
      return { deactivatedCount: 0, preservedCount: 0 };
    }

    // Find active partner offers NOT confirmed in this scan
    const staleOffers = await NotificationEventModel.find({
      isActive: true,
      $or: [
        { isPartnerOffer: true },
        { partner: { $exists: true, $ne: null } },
        { offerType: { $in: ['TELECOM_BUNDLE', 'DEVICE_BUNDLE', 'BROADBAND_BUNDLE', 'BANKING_REWARD', 'CLOUD_BUNDLE', 'DEVICES_BUNDLE', 'BUNDLE'] } },
      ],
      fingerprint: { $nin: Array.from(confirmedFingerprints) },
    }).lean();

    let deactivatedCount = 0;
    let preservedCount = 0;

    for (const offer of staleOffers) {
      // 0. Quarantine Check: If offer matches quarantined offer pattern, deactivate IMMEDIATELY
      const qCheck = isOfferQuarantined({
        partner: offer.partner,
        title: offer.title,
        description: offer.description || offer.evidenceText,
      });
      if (qCheck.isQuarantined) {
        await NotificationEventModel.updateOne(
          { _id: offer._id },
          {
            $set: {
              isActive: false,
              status: 'UNAVAILABLE',
              lastCheckedAt: new Date(),
            },
            $inc: { consecutiveMisses: 1 },
          }
        );
        console.log(`   ⚠️ [Reconcile: DEACTIVATED QUARANTINED] ${offer.partner || offer.providerId} × ${offer.title} (${qCheck.reason})`);
        deactivatedCount++;
        continue;
      }

      // 1. Generic Expiration Check: If official text or dates indicate offer ended, deactivate IMMEDIATELY
      const textToInspect = `${offer.title || ''} ${offer.evidenceText || ''} ${offer.description || ''}`;
      const expCheck = checkGenericExpiration(textToInspect);
      if (expCheck.isExpired) {
        await NotificationEventModel.updateOne(
          { _id: offer._id },
          {
            $set: {
              isActive: false,
              status: 'EXPIRED',
              lastCheckedAt: new Date(),
            },
            $inc: { consecutiveMisses: 1 },
          }
        );
        console.log(`   ⚠️ [Reconcile: DEACTIVATED EXPIRED] ${offer.partner} × ${offer.title} (${expCheck.expiredReason})`);
        deactivatedCount++;
        continue;
      }

      // 2. Publication Gate Check: If unconfirmed offer fails publication criteria, deactivate immediately
      if (!canPublishOffer(offer as any)) {
        await NotificationEventModel.updateOne(
          { _id: offer._id },
          {
            $set: {
              isActive: false,
              status: offer.status === 'EXPIRED' ? 'EXPIRED' : 'UNAVAILABLE',
              lastCheckedAt: new Date(),
            },
            $inc: { consecutiveMisses: 1 },
          }
        );
        console.log(`   ⚠️ [Reconcile: DEACTIVATED REJECTED] ${offer.partner || offer.providerId} × ${offer.title} (Failed publication gate)`);
        deactivatedCount++;
        continue;
      }

      // Check if offer should be deactivated based on confirmation/sync age
      const lastConfirmed = (offer as any).lastCatalogSyncAt || offer.lastConfirmedAt || offer.detectedAt;
      const daysSinceConfirmation = (Date.now() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60 * 24);
      
      // Grace period: Only deactivate if unconfirmed for 7+ days
      // This prevents false positives from temporary network issues, rate limits, or transient failures
      if (daysSinceConfirmation > 7) {
        // Offer hasn't been confirmed in 7+ days — mark as EXPIRED
        await NotificationEventModel.updateOne(
          { _id: offer._id },
          {
            $set: {
              isActive: false,
              status: 'EXPIRED',
              lastCheckedAt: new Date(),
            },
            $inc: { consecutiveMisses: 1 },
          }
        );
        
        console.log(`   ⚠️ [Reconcile: DEACTIVATED] ${offer.partner} × ${offer.title} (${daysSinceConfirmation.toFixed(0)} days unconfirmed)`);
        deactivatedCount++;
      } else {
        preservedCount++;
      }
    }

    if (deactivatedCount > 0 || preservedCount > 0) {
      console.log(`[PartnerScanner:Reconcile] Deactivated: ${deactivatedCount}, Preserved (within grace): ${preservedCount}`);
    }

    return { deactivatedCount, preservedCount };
  }

  /**
   * Executes the full ~24-hour offer discovery and synchronization cycle.
   *
   * Phase 1: Genuine commercial Partner Bundles (isPartnerOffer=true)
   *          Telecom, device, banking, broadband bundles that deliver an AI benefit.
   * Phase 2: Student & Education offers (isPartnerOffer=false)
   *          GitHub Student, UNiDAYS, etc. — classified as Student & Education.
   * Phase 3: Startup Grant offers (isPartnerOffer=false)
   *          Microsoft Founders Hub, AWS Activate, Google Cloud — classified as Startup Grants.
   * Phase 4: Layer 2 Ecosystem Candidate signals (with destination health checks)
   * Phase 5: Reconcile stale offers (deactivate unconfirmed offers after grace period)
   * 
   * @param liveExtractedOffers - Pre-validated offers from Playwright research (optional)
   * @param browser - Playwright browser instance for health checks (optional)
   */
  public static async runFullScan(
    liveExtractedOffers?: NormalizedPartnerOffer[],
    browser?: any  // Browser from playwright
  ): Promise<PartnerScanResult> {
    const result: PartnerScanResult = {
      totalScanned: 0,
      newOffersCount: 0,
      updatedOffersCount: 0,
      preservedActiveCount: 0,
      expiredOffersCount: 0,
      errorsCount: 0,
      offers: [],
    };

    // Track confirmed offer fingerprints for reconciliation
    const confirmedFingerprints = new Set<string>();
    let scanSuccessful = true;

    // ── Phase 0: Live Playwright Extracted Partner Offers (if provided) ──
    if (liveExtractedOffers && liveExtractedOffers.length > 0) {
      // If browser available, create health check page for Phase 0
      let phase0HealthCheckPage: any = null;
      if (browser) {
        try {
          console.log(`[PartnerScanner:Phase0] Creating health check page (browser available)...`);
          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            locale: 'en-US',
          });
          phase0HealthCheckPage = await context.newPage();
          console.log(`[PartnerScanner:Phase0] Health check page created successfully`);
        } catch (err) {
          console.error('[PartnerScanner:Phase0] Failed to create health check page:', err);
        }
      } else {
        console.log(`[PartnerScanner:Phase0] No browser available for health checks`);
      }
      
      for (const liveOffer of liveExtractedOffers) {
        result.totalScanned++;
        try {
          // ✅ Health check Phase 0 live extracted offers BEFORE persisting
          if (phase0HealthCheckPage && liveOffer.officialSourceUrl) {
            const { checkOfferDestination } = await import('./offerDestinationHealthCheck');
            
            console.log(`   [Discovery Candidate] Validating destination: ${liveOffer.partner}`);
            const healthCheck = await checkOfferDestination(
              phase0HealthCheckPage,
              liveOffer.officialSourceUrl,
              15000
            );
            
            if (healthCheck.status !== 'VALID') {
              console.log(`   ❌ [Discovery Candidate REJECTED] ${liveOffer.partner}: ${healthCheck.statusReason || healthCheck.status}`);
              result.errorsCount++;
              continue; // Skip persistence - destination is broken
            } else {
              console.log(`   ✅ [Discovery Candidate VALIDATED] ${liveOffer.partner}: Destination reachable`);
            }
          } else if (!phase0HealthCheckPage && liveOffer.officialSourceUrl) {
            // Skip persistence when browser is not available - cannot validate destination
            // (No warning needed - already logged at Phase 0 start)
            continue;
          }
          
          const res = await this.persistPartnerOffer(
            {
              ...liveOffer,
              detectionMethod: 'PLAYWRIGHT_LIVE',
              lastSuccessfulCheckAt: new Date(),
              lastCheckedAt: new Date(),
            },
            true
          );
          if (res.status === 'CREATED') result.newOffersCount++;
          else if (res.status === 'UPDATED') result.updatedOffersCount++;
          else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
          else if (res.status === 'EXPIRED') result.expiredOffersCount++;
          
          // Track confirmed offers for reconciliation
          if (res.status !== 'EXPIRED') {
            confirmedFingerprints.add(liveOffer.fingerprint);
          }
          
          result.offers.push(liveOffer);
        } catch (err) {
          console.error(`[PartnerScanner] Error persisting live Playwright offer (${liveOffer.partner}):`, err);
          result.errorsCount++;
          scanSuccessful = false;
        }
      }
      
      // Close Phase 0 health check page
      if (phase0HealthCheckPage) {
        try {
          await phase0HealthCheckPage.close();
        } catch (err) {
          console.error('[PartnerScanner:Phase0] Error closing health check page:', err);
        }
      }
    }

    // ── Phase 1: Genuine commercial Partner Bundles ─────────────
    const partnerOffers = this.getKnownPartnerOffers();
    for (const offer of partnerOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=true (default) — these are real partner bundles
        const res = await this.persistPartnerOffer(offer, true);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;
        
        // Track confirmed offers for reconciliation
        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }
        
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting partner offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 2: Student & Education Offers ─────────────────────
    const studentOffers = this.getKnownStudentOffers();
    for (const offer of studentOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=false — these are student offers, NOT partner bundles
        const res = await this.persistPartnerOffer(offer, false);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;
        
        // Track confirmed offers for reconciliation (student offers also need reconciliation)
        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }
        
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting student offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 3: Startup Grant Offers ───────────────────────────
    const startupOffers = this.getKnownStartupOffers();
    for (const offer of startupOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=false — these are startup grants, NOT partner bundles
        const res = await this.persistPartnerOffer(offer, false);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;
        
        // Track confirmed offers for reconciliation
        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }
        
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting startup offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 3b: Developer API Discount Offers ─────────────────
    const apiDiscountOffers = this.getKnownApiDiscountOffers();
    for (const offer of apiDiscountOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=false — these are API discounts, NOT partner bundles
        const res = await this.persistPartnerOffer(offer, false);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;

        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }

        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting api offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 3c: Annual Billing Savings Offers (>=15% threshold) ───
    const annualOffers = this.getKnownAnnualSavingsOffers();
    for (const offer of annualOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=false — these are annual direct discounts, NOT partner bundles
        const res = await this.persistPartnerOffer(offer, false);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;

        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }

        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting annual offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 3d: Free Tier & Promotional Credit Offers ───────────
    const freeTierOffers = this.getKnownFreeTierOffers();
    for (const offer of freeTierOffers) {
      result.totalScanned++;
      try {
        // isPartnerOffer=false — these are free tier / credits, NOT partner bundles
        const res = await this.persistPartnerOffer(offer, false);
        if (res.status === 'CREATED') result.newOffersCount++;
        else if (res.status === 'UPDATED') result.updatedOffersCount++;
        else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
        else if (res.status === 'EXPIRED') result.expiredOffersCount++;

        if (res.status !== 'EXPIRED') {
          confirmedFingerprints.add(offer.fingerprint);
        }

        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting free tier offer (${offer.partner}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }

    // ── Phase 4: Layer 2 Discovered Candidates & Ecosystem Signals ──
    // IMPORTANT: Discovery candidates now include destination health checks
    // to prevent broken URLs (404, 403, expired) from being published as ACTIVE
    PartnerDiscoveryService.discoverEcosystemCandidates();
    const candidates = PartnerDiscoveryService.getAllCandidates();
    
    console.log(`[PartnerScanner:Phase4] Processing ${candidates.length} discovery candidates...`);
    
    // If browser is available, perform health checks on discovery candidates
    let healthCheckPage: any = null;
    if (browser) {
      try {
        console.log(`[PartnerScanner:Phase4] Creating health check page (browser available)...`);
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          locale: 'en-US',
        });
        healthCheckPage = await context.newPage();
        console.log(`[PartnerScanner:Phase4] Health check page created successfully`);
      } catch (err) {
        console.error('[PartnerScanner] Failed to create health check page:', err);
      }
    } else {
      console.log(`[PartnerScanner:Phase4] No browser available - discovery candidates will be skipped`);
    }
    
    for (const candidate of candidates) {
      result.totalScanned++;
      try {
        const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
        
        if (evalResult.promoted && evalResult.offer) {
          // ✅ NEW: Health check discovery candidate destination BEFORE persisting
          if (healthCheckPage && evalResult.offer.officialSourceUrl) {
            const { checkOfferDestination } = await import('./offerDestinationHealthCheck');
            
            console.log(`   [Discovery Candidate] Validating destination: ${candidate.partnerName}`);
            const healthCheck = await checkOfferDestination(
              healthCheckPage,
              evalResult.offer.officialSourceUrl,
              15000
            );
            
            if (healthCheck.status !== 'VALID') {
              console.log(`   ❌ [Discovery Candidate REJECTED] ${candidate.partnerName}: ${healthCheck.statusReason || healthCheck.status}`);
              result.errorsCount++;
              continue; // Skip persistence - destination is broken
            } else {
              console.log(`   ✅ [Discovery Candidate VALIDATED] ${candidate.partnerName}: Destination reachable`);
            }
          } else if (!healthCheckPage && evalResult.offer.officialSourceUrl) {
            // Skip persistence when browser is not available - cannot validate destination
            // (No warning needed - already logged at Phase 4 start)
            continue;
          }
          
          const res = await this.persistPartnerOffer(evalResult.offer, true);
          if (res.status === 'CREATED') result.newOffersCount++;
          else if (res.status === 'UPDATED') result.updatedOffersCount++;
          else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
          else if (res.status === 'EXPIRED') result.expiredOffersCount++;
          
          // Track confirmed offers for reconciliation
          if (res.status !== 'EXPIRED') {
            confirmedFingerprints.add(evalResult.offer.fingerprint);
          }
          
          result.offers.push(evalResult.offer);
        }
      } catch (err) {
        console.error(`[PartnerScanner] Error evaluating candidate (${candidate.partnerName}):`, err);
        result.errorsCount++;
        scanSuccessful = false;
      }
    }
    
    // Clean up health check page
    if (healthCheckPage) {
      try {
        await healthCheckPage.close();
      } catch (err) {
        console.error('[PartnerScanner] Error closing health check page:', err);
      }
    }

    // ── Phase 5: Reconcile Stale Offers ──────────────────────────
    // Deactivate offers that were not confirmed in this scan cycle
    // Grace period: 7 days (prevents false positives from temporary scan failures)
    try {
      const reconcileResult = await this.reconcileStaleOffers(confirmedFingerprints, scanSuccessful);
      result.expiredOffersCount += reconcileResult.deactivatedCount;
    } catch (reconcileErr) {
      console.error('[PartnerScanner] Error during stale offer reconciliation:', reconcileErr);
      result.errorsCount++;
    }

    return result;
  }
}

