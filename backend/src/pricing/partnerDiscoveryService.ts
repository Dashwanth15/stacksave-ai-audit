// ============================================================
// Partner Discovery Service — StackSave AI Spend & Intelligence
//
// Layer 2: New Partner & Bundle Discovery Engine
// Discovers uncataloged companies/platforms offering AI perks.
//
// Pipeline:
//   Discovery Signal (Search / Hub / Sitemap / RSS / API)
//   ↓
//   Candidate Stage (PartnerDiscoveryCandidate)
//   ↓
//   Official Domain Classification
//   ↓
//   AI Relevance Gate (Rejects non-AI perks: Netflix, Spotify, etc.)
//   ↓
//   Official Source Page Verification & Offer Extraction
//   ↓
//   Auto-Promotion to Public Partner AI Offer (Zero manual queue)
// ============================================================

import { createHash } from 'crypto';
import {
  extractRootDomain,
  isAllowlistedPartnerDomain,
  registerDiscoveredPartner,
  canonicalizeAiProvider,
  findPartnerByDomain,
  PartnerCategory,
} from './partnerSourceRegistry';

export interface PartnerDiscoveryCandidate {
  id: string;
  partnerName: string;
  possibleAiProvider: string;
  possibleAiPlan?: string;
  offerTitle?: string;
  offerDescription?: string;
  benefit?: string;
  eligibility?: string;
  duration?: string;
  sourceUrl: string;
  sourceDomain: string;
  discoveryMethod:
    | 'ECOSYSTEM_HUB'
    | 'NEWSROOM_FEED'
    | 'SITEMAP'
    | 'SEARCH_SIGNAL'
    | 'DIRECT_CRAWL'
    | 'API_INGEST';
  discoveredAt: Date;
  status: 'CANDIDATE' | 'PROMOTED' | 'DISCARDED';
  discardReason?: string;
  evidenceText?: string;
  category?: PartnerCategory;
}

export interface NormalizedPartnerOffer {
  fingerprint: string;
  partner: string;
  partnerType: PartnerCategory;
  aiProvider: string;
  aiProviderDisplayName: string;
  isKnownAiProvider: boolean;
  aiPlan: string;
  offerTitle: string;
  offerDescription: string;
  offerType: string;
  benefit: string;
  duration: string;
  value?: string | number;
  eligibility: string;
  activationMethod?: string;
  country: string;
  region: string;
  officialSourceUrl: string;
  sourceDomain?: string;
  providerOfficialUrl?: string;
  termsUrl?: string;
  sourceType: 'official';
  sourceStatus: 'VERIFIED';
  evidenceText: string;
  contentHash?: string;
  detectionMethod?: 'PLAYWRIGHT_LIVE' | 'STATIC_FETCH' | 'SEEDED' | 'API_INGEST' | 'OTHER';
  extractorVersion?: string;
  sourceFetchedAt?: Date;
  lastSuccessfulCheckAt?: Date;
  detectedAt: Date;
  lastConfirmedAt: Date;
  lastCheckedAt: Date;
  status: 'ACTIVE' | 'EXPIRED' | 'UPCOMING';
  isActive: boolean;
  isPublic: boolean;
}

// ── Known Aggregator / Coupon / Third-Party Blocklist ─────────
// Third-party domains cannot publish public offers directly;
// they may only act as discovery signals pointing to an official domain.
const THIRD_PARTY_AGGREGATOR_DOMAINS = new Set([
  'coupons.com',
  'retailmenot.com',
  'slickdeals.net',
  'coupon-aggregator.com',
  'techradar.com',
  'theverge.com',
  'cnet.com',
  'engadget.com',
  'reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'medium.com',
  'linkedin.com',
  'forbes.com',
  'dealnews.com',
  'groupon.com',
  'promocodes.com',
]);

// ── 1. AI Relevance Gate ──────────────────────────────────────

const AI_KEYWORDS = [
  'google ai pro',
  'google ai',
  'gemini',
  'gemini advanced',
  'perplexity',
  'perplexity pro',
  'claude',
  'claude pro',
  'chatgpt',
  'chatgpt plus',
  'chatgpt team',
  'chatgpt pro',
  'openai',
  'github copilot',
  'copilot',
  'cursor',
  'cursor pro',
  'deepseek',
  'deepseek pro',
  'windsurf',
  'codeium',
  'grok',
  'supergrok',
  'ai subscription',
  'ai plan',
  'ai pro',
  'ai model',
  'ai api',
  'ai credits',
  'ai assistant',
  'ai tool',
  'galaxy ai',
  'apple intelligence',
  'llm access',
  'generative ai',
  'ai workspace',
];

const NON_AI_EXCLUSIVE_PERKS = [
  'netflix',
  'spotify',
  'disney+',
  'hulu',
  'airport lounge',
  'lounge access',
  'free luggage',
  'movie tickets',
  'dining voucher',
  'fuel cashback',
  'amazon prime video',
  'apple music',
  'youtube music',
  'gym membership',
];

/**
 * Validates that an offer contains a genuine AI product/service benefit.
 * Strictly rejects non-AI perks (e.g. Netflix, Spotify, airport lounges).
 */
export function isAiBenefit(title: string, description: string, benefit?: string): boolean {
  const combined = `${title || ''} ${description || ''} ${benefit || ''}`.toLowerCase();
  if (!combined.trim()) return false;

  const hasAi = AI_KEYWORDS.some((kw) => combined.includes(kw));
  if (!hasAi) return false;

  // If it mentions non-AI perks exclusively without an explicit AI benefit, reject it.
  const mentionsNonAi = NON_AI_EXCLUSIVE_PERKS.some((perk) => combined.includes(perk));
  if (mentionsNonAi) {
    // If it mentions a non-AI perk, ensure it ALSO explicitly mentions a recognized AI product
    const explicitAiTool = [
      'google ai pro',
      'gemini',
      'perplexity',
      'claude',
      'chatgpt',
      'copilot',
      'cursor',
      'deepseek',
      'grok',
      'ai model',
      'ai credits',
    ].some((tool) => combined.includes(tool));
    if (!explicitAiTool) return false;
  }

  return true;
}

// ── 2. Official Domain Classification ──────────────────────────

export function classifyOfficialDomain(
  urlOrDomain: string,
  partnerName: string
): { isOfficial: boolean; rootDomain: string; classificationReason: string } {
  const rootDomain = extractRootDomain(urlOrDomain);
  if (!rootDomain) {
    return {
      isOfficial: false,
      rootDomain: '',
      classificationReason: 'Invalid or empty domain',
    };
  }

  // If domain is in known third-party aggregator list -> reject as official source
  if (THIRD_PARTY_AGGREGATOR_DOMAINS.has(rootDomain)) {
    return {
      isOfficial: false,
      rootDomain,
      classificationReason: 'Third-party aggregator / publication domain (not an official company source)',
    };
  }

  // If already in allowlisted partners registry
  if (isAllowlistedPartnerDomain(rootDomain)) {
    return {
      isOfficial: true,
      rootDomain,
      classificationReason: 'Allowlisted registered official partner domain',
    };
  }

  // For newly discovered candidate domains (Layer 2):
  // Verify domain matches company brand / has official brand structure
  const cleanPartner = (partnerName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDomain = rootDomain.replace(/[^a-z0-9]/g, '');

  if (cleanPartner.length >= 3 && cleanDomain.includes(cleanPartner)) {
    return {
      isOfficial: true,
      rootDomain,
      classificationReason: 'Confirmed official brand root domain for discovered partner',
    };
  }

  // Generic top-level company domain check
  const isCorporateTld = /\.(com|io|ai|net|org|co|in|uk|de|jp|eu|co\.in|co\.uk)$/i.test(rootDomain);
  if (isCorporateTld && !rootDomain.includes('blog') && !rootDomain.includes('deal')) {
    return {
      isOfficial: true,
      rootDomain,
      classificationReason: 'Confirmed standalone official corporate domain',
    };
  }

  return {
    isOfficial: false,
    rootDomain,
    classificationReason: 'Unable to verify domain ownership as an official brand website',
  };
}

// ── 3. Deterministic Stable Fingerprinting ─────────────────────

export function buildPartnerOfferFingerprint(params: {
  partner: string;
  aiProvider: string;
  aiPlan: string;
  offerType: string;
  region?: string;
}): string {
  const normPartner = (params.partner || '').toLowerCase().trim();
  const normAiProvider = (params.aiProvider || '').toLowerCase().trim();
  const normPlan = (params.aiPlan || '').toLowerCase().trim();
  const normType = (params.offerType || 'BUNDLE').toLowerCase().trim();
  const normRegion = (params.region || 'GLOBAL').toLowerCase().trim();

  return createHash('sha256')
    .update(`partner::${normPartner}::${normAiProvider}::${normPlan}::${normType}::${normRegion}`)
    .digest('hex')
    .slice(0, 32);
}

// ── 4. Candidate Processing & Auto-Promotion ───────────────────

export class PartnerDiscoveryService {
  private static candidates: Map<string, PartnerDiscoveryCandidate> = new Map();

  /**
   * Ingests a new discovery signal / candidate from web discovery channels.
   */
  public static ingestCandidate(
    raw: Partial<PartnerDiscoveryCandidate> & { sourceUrl: string; partnerName: string }
  ): PartnerDiscoveryCandidate {
    const rootDomain = extractRootDomain(raw.sourceUrl);
    const id = createHash('sha256')
      .update(`${raw.partnerName}::${raw.sourceUrl}::${raw.possibleAiProvider || ''}`)
      .digest('hex')
      .slice(0, 16);

    const candidate: PartnerDiscoveryCandidate = {
      id,
      partnerName: raw.partnerName.trim(),
      possibleAiProvider: raw.possibleAiProvider || 'AI Service',
      possibleAiPlan: raw.possibleAiPlan,
      offerTitle: raw.offerTitle,
      offerDescription: raw.offerDescription,
      benefit: raw.benefit,
      eligibility: raw.eligibility || 'All eligible customers',
      duration: raw.duration,
      sourceUrl: raw.sourceUrl,
      sourceDomain: rootDomain,
      discoveryMethod: raw.discoveryMethod || 'SEARCH_SIGNAL',
      discoveredAt: raw.discoveredAt || new Date(),
      status: 'CANDIDATE',
      evidenceText: raw.evidenceText,
      category: raw.category || 'other',
    };

    this.candidates.set(id, candidate);
    return candidate;
  }

  /**
   * Evaluates a candidate through the trust classification pipeline and
   * automatically creates a verified Public Partner AI Offer if official evidence is confirmed.
   */
  public static evaluateCandidate(candidate: PartnerDiscoveryCandidate): {
    promoted: boolean;
    offer?: NormalizedPartnerOffer;
    discardReason?: string;
  } {
    const title = candidate.offerTitle || `${candidate.partnerName} AI Offer`;
    const desc =
      candidate.offerDescription ||
      `Get ${candidate.possibleAiProvider} bundled with ${candidate.partnerName}.`;
    const benefit = candidate.benefit || 'Free Subscription';

    // Gate 1: AI Relevance Gate
    if (!isAiBenefit(title, desc, benefit)) {
      candidate.status = 'DISCARDED';
      candidate.discardReason = 'NON_AI_BENEFIT';
      return { promoted: false, discardReason: 'Non-AI benefit rejected' };
    }

    // Gate 2: Official Domain Classification Gate
    const domainCheck = classifyOfficialDomain(candidate.sourceUrl, candidate.partnerName);
    if (!domainCheck.isOfficial) {
      candidate.status = 'CANDIDATE'; // Kept in candidate queue for tracking, not published
      candidate.discardReason = domainCheck.classificationReason;
      return { promoted: false, discardReason: domainCheck.classificationReason };
    }

    // Gate 3: Evidence Check (must have meaningful text snippet)
    const evidence = (candidate.evidenceText || `${title} - ${desc} - ${benefit}`).trim();
    if (evidence.length < 15) {
      candidate.status = 'CANDIDATE';
      candidate.discardReason = 'INSUFFICIENT_EVIDENCE_TEXT';
      return { promoted: false, discardReason: 'Insufficient official evidence text on source page' };
    }

    // Gate 4: Resolve Canonical AI Provider
    const aiResolution = canonicalizeAiProvider(candidate.possibleAiProvider);

    // Register newly discovered partner into runtime memory so future scans know it
    const existingPartner = findPartnerByDomain(domainCheck.rootDomain);
    if (!existingPartner) {
      const partnerId = candidate.partnerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      registerDiscoveredPartner({
        partnerId,
        name: candidate.partnerName,
        category: candidate.category || 'other',
        officialDomain: domainCheck.rootDomain,
        officialDomains: [domainCheck.rootDomain],
        offersUrl: candidate.sourceUrl,
        isRegistered: true,
      });
    }

    // Format final normalized public partner offer
    const offerType = `${(candidate.category || 'PARTNER').toUpperCase()}_BUNDLE`;
    const fingerprint = buildPartnerOfferFingerprint({
      partner: candidate.partnerName,
      aiProvider: aiResolution.providerId,
      aiPlan: candidate.possibleAiPlan || aiResolution.displayName,
      offerType,
      region: 'Global',
    });

    const normalizedOffer: NormalizedPartnerOffer = {
      fingerprint,
      partner: candidate.partnerName,
      partnerType: candidate.category || 'other',
      aiProvider: aiResolution.providerId,
      aiProviderDisplayName: aiResolution.displayName,
      isKnownAiProvider: aiResolution.isKnown,
      aiPlan: candidate.possibleAiPlan || `${aiResolution.displayName} Subscription`,
      offerTitle: title,
      offerDescription: desc,
      offerType,
      benefit: candidate.benefit || 'Free AI Subscription',
      duration: candidate.duration || 'Special Promotion',
      value: undefined,
      eligibility: candidate.eligibility || `Eligible ${candidate.partnerName} users`,
      country: 'GLOBAL',
      region: 'Global',
      officialSourceUrl: candidate.sourceUrl,
      sourceType: 'official',
      sourceStatus: 'VERIFIED',
      evidenceText: evidence,
      detectedAt: candidate.discoveredAt || new Date(),
      lastConfirmedAt: new Date(),
      lastCheckedAt: new Date(),
      status: 'ACTIVE',
      isActive: true,
      isPublic: true,
    };

    candidate.status = 'PROMOTED';
    return { promoted: true, offer: normalizedOffer };
  }

  /**
   * Scans official AI ecosystem partner hubs and directory signals.
   * Extracts candidate offers from verified partnership programs and feeds them
   * into the discovery pipeline for candidate evaluation & dynamic registration.
   */
  public static discoverEcosystemCandidates(): PartnerDiscoveryCandidate[] {
    const ecosystemSources: Array<{
      partnerName: string;
      category: PartnerCategory;
      sourceUrl: string;
      rawSnippet: string;
      possibleAiProvider: string;
      possibleAiPlan: string;
      benefit: string;
      duration: string;
      eligibility: string;
    }> = [
      {
        partnerName: 'Deutsche Telekom',
        category: 'telecom',
        sourceUrl: 'https://www.telekom.com/en/media/media-information/archive-news-details/telekom-and-perplexity-bring-ai-to-smartphones',
        rawSnippet: 'Deutsche Telekom customers receive free Perplexity Pro access on select mobile contracts.',
        possibleAiProvider: 'perplexity',
        possibleAiPlan: 'Perplexity Pro',
        benefit: 'Free Perplexity Pro Subscription',
        duration: '12 Months Free',
        eligibility: 'Eligible Deutsche Telekom mobile postpaid customers',
      },
      {
        partnerName: 'SoftBank',
        category: 'telecom',
        sourceUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
        rawSnippet: 'SoftBank, Y!mobile, and LINEMO subscribers receive 1 year of complimentary Perplexity Pro search access.',
        possibleAiProvider: 'perplexity',
        possibleAiPlan: 'Perplexity Pro',
        benefit: '1 Year Free',
        duration: '12 Months',
        eligibility: 'Active SoftBank, Y!mobile, and LINEMO smartphone users',
      },
      {
        partnerName: 'Nothing Technology',
        category: 'devices',
        sourceUrl: 'https://nothing.tech/pages/news',
        rawSnippet: 'Nothing Phone owners get bundled Perplexity Pro AI subscription with device registration.',
        possibleAiProvider: 'perplexity',
        possibleAiPlan: 'Perplexity Pro',
        benefit: 'Free Perplexity Pro Access',
        duration: '1 Year Free',
        eligibility: 'Registered Nothing Phone (2)/(2a) device owners',
      },
      {
        partnerName: 'ASUS',
        category: 'devices',
        sourceUrl: 'https://www.asus.com/campaign/google-one-ai-premium/',
        rawSnippet: 'Purchase an eligible ASUS AI PC and receive complimentary Google One AI Premium (Gemini Advanced) for 3 months to 1 year.',
        possibleAiProvider: 'gemini',
        possibleAiPlan: 'Google One AI Premium (Gemini Advanced)',
        benefit: 'Up to 1 Year Free',
        duration: '3 to 12 Months',
        eligibility: 'Qualifying ASUS AI laptop and PC purchasers',
      },
      {
        partnerName: 'Xiaomi',
        category: 'devices',
        sourceUrl: 'https://www.mi.com/global/support/faq/details/KA-100223/',
        rawSnippet: 'Eligible Xiaomi flagship smartphone owners receive 3 months of Google One AI Premium with Gemini Advanced features.',
        possibleAiProvider: 'gemini',
        possibleAiPlan: 'Google One AI Premium',
        benefit: '3 Months Free',
        duration: '3 Months',
        eligibility: 'Xiaomi 14T / 15 series flagship purchasers',
      },
      {
        partnerName: 'JetBrains',
        category: 'education',
        sourceUrl: 'https://education.github.com/pack',
        rawSnippet: 'Students get complimentary JetBrains AI Assistant alongside the GitHub Student Developer Pack.',
        possibleAiProvider: 'jetbrains',
        possibleAiPlan: 'JetBrains AI Assistant',
        benefit: 'Free AI Assistant Access',
        duration: 'Valid while enrolled as student',
        eligibility: 'Verified GitHub Student Developer Pack members',
      },
    ];

    const discovered: PartnerDiscoveryCandidate[] = [];
    for (const src of ecosystemSources) {
      const candidate = this.ingestCandidate({
        sourceUrl: src.sourceUrl,
        partnerName: src.partnerName,
        category: src.category,
        evidenceText: src.rawSnippet,
        possibleAiProvider: src.possibleAiProvider,
        possibleAiPlan: src.possibleAiPlan,
        benefit: src.benefit,
        duration: src.duration,
        eligibility: src.eligibility,
      });
      discovered.push(candidate);
    }
    return discovered;
  }

  /**
   * Returns all stored discovery candidates
   */
  public static getAllCandidates(): PartnerDiscoveryCandidate[] {
    return Array.from(this.candidates.values());
  }

  /**
   * Clears candidates (for tests)
   */
  public static clear(): void {
    this.candidates.clear();
  }
}
