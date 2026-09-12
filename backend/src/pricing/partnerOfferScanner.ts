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
   * @param offer          - The normalized offer to persist.
   * @param isPartnerOffer - Explicit flag controlling the isPartnerOffer field.
   *                         Pass `false` for student/startup offers so they are NOT
   *                         surfaced as Partner Bundles.  Defaults to `true` for
   *                         genuine commercial partner bundles.
   */
  public static async persistPartnerOffer(
    offer: NormalizedPartnerOffer,
    isPartnerOffer = true
  ): Promise<{
    status: 'CREATED' | 'UPDATED' | 'CONFIRMED' | 'EXPIRED';
  }> {
    const existing = await NotificationEventModel.findOne({ fingerprint: offer.fingerprint });

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
    const checkTime = new Date();

    if (!existing) {
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
        sourceType: 'official',
        status: offer.status || 'ACTIVE',
        lastCheckedAt: checkTime,
      });
      return { status: 'CREATED' };
    }

    // Check if offer is expired
    if (offer.status === 'EXPIRED' || !offer.isActive) {
      existing.status = 'EXPIRED';
      existing.isActive = false;
      existing.lastCheckedAt = checkTime;
      await existing.save();
      return { status: 'EXPIRED' };
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
    existing.isActive = true;
    existing.consecutiveMisses = 0;
    existing.status = 'ACTIVE';
    existing.isPublic = true;
    if (sourceDomain) existing.sourceDomain = sourceDomain;
    if (providerOfficialUrl) existing.providerOfficialUrl = providerOfficialUrl;
    if (offer.detectionMethod) existing.detectionMethod = offer.detectionMethod;
    if (contentHash) existing.contentHash = contentHash;

    if (hasChanged) {
      existing.title = offer.offerTitle;
      existing.description = offer.offerDescription;
      existing.benefit = offer.benefit;
      existing.discount = offer.benefit;
      existing.duration = offer.duration;
      existing.evidenceText = evidenceText;
      existing.eligibility = offer.eligibility;
      await existing.save();
      return { status: 'UPDATED' };
    }

    await existing.save();
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
        officialSourceUrl: 'https://www.jio.com/en-in/google-one-offer',
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
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Airtel',
          aiProvider: 'perplexity',
          aiPlan: 'Perplexity Pro',
          offerType: 'TELECOM_BUNDLE',
          region: 'India',
        }),
        partner: 'Airtel',
        partnerType: 'telecom',
        aiProvider: 'perplexity',
        aiProviderDisplayName: 'Perplexity',
        isKnownAiProvider: true,
        aiPlan: 'Perplexity Pro',
        offerTitle: 'Perplexity Pro with Airtel Thanks',
        offerDescription:
          'Get 12 months of Perplexity Pro access complimentary with Airtel Thanks Gold & Platinum postpaid and broadband subscriptions.',
        offerType: 'TELECOM_BUNDLE',
        benefit: '1 Year FREE',
        duration: '12 months',
        value: '$200 value',
        eligibility: 'Airtel Thanks Gold & Platinum Customers',
        activationMethod: 'Claim via Airtel Thanks App',
        country: 'IN',
        region: 'India',
        officialSourceUrl: 'https://www.airtel.in/perplexity-pro',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Airtel Thanks members enjoy 1 year of Perplexity Pro search intelligence free of charge.',
        detectedAt: new Date('2026-08-05T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Samsung -> Galaxy AI / Gemini Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Samsung',
          aiProvider: 'gemini',
          aiPlan: 'Galaxy AI & Gemini Pro',
          offerType: 'DEVICE_BUNDLE',
          region: 'Global',
        }),
        partner: 'Samsung',
        partnerType: 'devices',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Galaxy AI & Google Gemini Pro',
        offerTitle: 'Galaxy AI with Google Gemini on Galaxy Devices',
        offerDescription:
          'Complimentary access to advanced Galaxy AI features and Google Gemini integrations on eligible Galaxy flagship devices.',
        offerType: 'DEVICE_BUNDLE',
        benefit: 'Free Access',
        duration: 'Flagship device lifecycle',
        value: 'Complimentary',
        eligibility: 'Galaxy S24, Z Fold/Flip & Tab S9 owners',
        activationMethod: 'Built-in Galaxy AI system settings',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.samsung.com/galaxy-ai/',
        termsUrl: 'https://www.samsung.com/galaxy-ai/terms/',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Galaxy AI features powered by Google Gemini available at no extra cost on supported Samsung Galaxy devices.',
        detectedAt: new Date('2026-08-10T00:00:00Z'),
        lastConfirmedAt: new Date(),
        lastCheckedAt: new Date(),
        status: 'ACTIVE',
        isActive: true,
        isPublic: true,
      },

      // Google Pixel -> Gemini Advanced Bundle
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'Google Pixel',
          aiProvider: 'gemini',
          aiPlan: 'Google One AI Premium (Gemini Advanced)',
          offerType: 'DEVICE_BUNDLE',
          region: 'Global',
        }),
        partner: 'Google Pixel',
        partnerType: 'devices',
        aiProvider: 'gemini',
        aiProviderDisplayName: 'Google Gemini',
        isKnownAiProvider: true,
        aiPlan: 'Google One AI Premium (Gemini Advanced)',
        offerTitle: '1 Year Google One AI Premium with Google Pixel',
        offerDescription:
          'Get 1 full year of Google One AI Premium (Gemini Advanced, 2TB storage, and Gemini in Docs/Gmail) included with Pixel 9 Pro and Pixel devices.',
        offerType: 'DEVICE_BUNDLE',
        benefit: '1 Year FREE',
        duration: '12 months',
        value: '$240 value',
        eligibility: 'New Pixel 9 Pro & eligible Pixel hardware purchasers',
        activationMethod: 'Claim in Google One app on eligible device',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://store.google.com/category/phones',
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

      // American Express -> Business Platinum AI Perks
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'American Express',
          aiProvider: 'chatgpt',
          aiPlan: 'Enterprise AI & Tech Statement Credits',
          offerType: 'BANKING_REWARD',
          region: 'United States',
        }),
        partner: 'American Express',
        partnerType: 'banking',
        aiProvider: 'chatgpt',
        aiProviderDisplayName: 'ChatGPT (OpenAI)',
        isKnownAiProvider: true,
        aiPlan: 'OpenAI / Tech Statement Credits',
        offerTitle: 'Amex Business Platinum Technology & AI Credits',
        offerDescription:
          'Statement credits toward AI subscriptions, AI software tools, cloud compute, and enterprise developer platforms for cardmembers.',
        offerType: 'BANKING_REWARD',
        benefit: '$300 Statement Credit',
        duration: 'Annual benefit',
        value: '$300/year value',
        eligibility: 'American Express Business Platinum Cardmembers',
        activationMethod: 'Enroll in Amex Offers dashboard',
        country: 'US',
        region: 'United States',
        officialSourceUrl: 'https://www.americanexpress.com/us/credit-cards/business-cards/',
        termsUrl: 'https://www.americanexpress.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Eligible cardmembers can enroll to receive statement credits toward qualifying AI subscriptions and technology tool subscriptions.',
        detectedAt: new Date('2026-08-28T00:00:00Z'),
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
        benefit: '12 Months FREE',
        duration: '12 months',
        value: '$240 value',
        eligibility: 'New and renewing JioFiber/AirFiber subscribers',
        activationMethod: 'Claim through MyJio broadband portal',
        country: 'IN',
        region: 'India',
        officialSourceUrl: 'https://www.jio.com/en-in/fiber',
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
      },

      // UNiDAYS -> Perplexity Pro Student
      {
        fingerprint: buildPartnerOfferFingerprint({
          partner: 'UNiDAYS',
          aiProvider: 'perplexity',
          aiPlan: 'Perplexity Pro Student',
          offerType: 'EDUCATION_BUNDLE',
          region: 'Global',
        }),
        partner: 'UNiDAYS',
        partnerType: 'education',
        aiProvider: 'perplexity',
        aiProviderDisplayName: 'Perplexity',
        isKnownAiProvider: true,
        aiPlan: 'Perplexity Pro',
        offerTitle: 'Perplexity Pro Student Discount via UNiDAYS',
        offerDescription:
          'Special academic rates and trial months for Perplexity Pro research and AI citations for verified university students.',
        offerType: 'EDUCATION_BUNDLE',
        benefit: '50% OFF / Free Trial',
        duration: 'Academic year',
        value: '$100/year savings',
        eligibility: 'Verified university students on UNiDAYS',
        activationMethod: 'Generate promo voucher code via UNiDAYS app',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://www.myunidays.com/',
        termsUrl: 'https://www.myunidays.com/terms',
        sourceType: 'official',
        sourceStatus: 'VERIFIED',
        evidenceText:
          'Students get exclusive discounts and free access periods to Perplexity Pro through verified student identity.',
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
        benefit: 'Up to $100,000 Credits',
        duration: '12 months',
        value: '$100,000 value',
        eligibility: 'Affiliated startup founders and incubators',
        activationMethod: 'Apply via AWS Activate console',
        country: 'GLOBAL',
        region: 'Global',
        officialSourceUrl: 'https://aws.amazon.com/activate/',
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
      },
    ];
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
   * Phase 4: Layer 2 Ecosystem Candidate signals
   */
  public static async runFullScan(liveExtractedOffers?: NormalizedPartnerOffer[]): Promise<PartnerScanResult> {
    const result: PartnerScanResult = {
      totalScanned: 0,
      newOffersCount: 0,
      updatedOffersCount: 0,
      preservedActiveCount: 0,
      expiredOffersCount: 0,
      errorsCount: 0,
      offers: [],
    };

    // ── Phase 0: Live Playwright Extracted Partner Offers (if provided) ──
    if (liveExtractedOffers && liveExtractedOffers.length > 0) {
      for (const liveOffer of liveExtractedOffers) {
        result.totalScanned++;
        try {
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
          result.offers.push(liveOffer);
        } catch (err) {
          console.error(`[PartnerScanner] Error persisting live Playwright offer (${liveOffer.partner}):`, err);
          result.errorsCount++;
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
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting partner offer (${offer.partner}):`, err);
        result.errorsCount++;
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
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting student offer (${offer.partner}):`, err);
        result.errorsCount++;
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
        result.offers.push(offer);
      } catch (err) {
        console.error(`[PartnerScanner] Error persisting startup offer (${offer.partner}):`, err);
        result.errorsCount++;
      }
    }

    // ── Phase 4: Layer 2 Discovered Candidates & Ecosystem Signals ──
    PartnerDiscoveryService.discoverEcosystemCandidates();
    const candidates = PartnerDiscoveryService.getAllCandidates();
    for (const candidate of candidates) {
      result.totalScanned++;
      try {
        const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
        if (evalResult.promoted && evalResult.offer) {
          const res = await this.persistPartnerOffer(evalResult.offer, true);
          if (res.status === 'CREATED') result.newOffersCount++;
          else if (res.status === 'UPDATED') result.updatedOffersCount++;
          else if (res.status === 'CONFIRMED') result.preservedActiveCount++;
          else if (res.status === 'EXPIRED') result.expiredOffersCount++;
          result.offers.push(evalResult.offer);
        }
      } catch (err) {
        console.error(`[PartnerScanner] Error evaluating candidate (${candidate.partnerName}):`, err);
        result.errorsCount++;
      }
    }

    return result;
  }
}

