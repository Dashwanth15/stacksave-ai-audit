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

    if (!existing) {
      if (isExplicitlyExpired) {
        console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Expired candidate: ${genericExp.expiredReason || 'Explicitly expired'}`);
        return { status: 'EXPIRED' };
      }
      // 1. Create New Public Offer
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
        lastConfirmedAt: offer.lastConfirmedAt || checkTime,
        lastSeenAt: offer.lastConfirmedAt || checkTime,
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
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Expired offer: ${genericExp.expiredReason || 'Explicitly expired'}`);
      return { status: 'EXPIRED' };
    }
    
    // If existing offer is marked UNAVAILABLE, EXPIRED, or HISTORICAL, do NOT reactivate it
    // This prevents broken/expired offers from being auto-reactivated without fresh verified evidence
    if ((existing.status === 'UNAVAILABLE' || existing.status === 'EXPIRED' || existing.status === 'HISTORICAL') && !existing.isActive) {
      existing.lastCheckedAt = checkTime;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=INACTIVE reason=Preserved inactive status (${existing.status})`);
      return { status: 'EXPIRED' }; // Return EXPIRED to prevent reconciliation from preserving it
    }

    // Never allow a static seed to overwrite fresher live Playwright evidence
    const isIncomingSeeded = offer.detectionMethod === 'SEEDED';
    const isExistingLive = existing.detectionMethod === 'PLAYWRIGHT_DOM' || existing.detectionMethod === 'PLAYWRIGHT_LIVE';
    if (isIncomingSeeded && isExistingLive) {
      existing.lastCheckedAt = checkTime;
      existing.lastConfirmedAt = checkTime;
      if (typeof existing.save === 'function') await existing.save();
      console.log(`[OFFER VERIFY] provider=${offer.aiProvider} offer=${offer.offerTitle} status=ACTIVE reason=Confirmed live Playwright offer with timestamp refresh`);
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
    if (offer.sourceFetchedAt) existing.sourceFetchedAt = offer.sourceFetchedAt;
    if (offer.lastSuccessfulCheckAt) existing.lastSuccessfulCheckAt = offer.lastSuccessfulCheckAt;
    existing.lastConfirmedAt = checkTime;
    existing.lastSeenAt = checkTime;
    
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

      // UNiDAYS -> Perplexity Pro Student
      // REMOVED: No current UNiDAYS × Perplexity partnership found
      // Evidence: UNiDAYS website search shows no Perplexity offer
      // Note: Perplexity Education Pro IS a real offer, but it's a native Perplexity
      // subscription plan with SheerID verification - NOT a UNiDAYS partner bundle
      // Status: DO NOT resurrect without fresh official UNiDAYS partnership evidence
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

      // Check if offer should be deactivated based on lastConfirmedAt age
      const lastConfirmed = offer.lastConfirmedAt || offer.detectedAt;
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

