// ============================================================
// offerFormatter — StackSave AI Sourcing Presentation Layer
// Decodes scraped entities, sanitizes text, and formats crisp SaaS copy
// 100% Data-Driven: Preserves live multi-page scraped offer metadata
// Supports Direct Vendor Promotions & Partner / Bundled AI Offers
// ============================================================

import type { PublicOffer } from '../types';

/**
 * Decodes common HTML entities from scraped web content.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

export type OfferCategory = 'all' | 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';

export interface FormattedOffer {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  summary: string;
  discountBadge: string;
  category: 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';
  categoryLabel: string;
  eligibility: string;
  sourceUrl: string;
  detectedAt: string;
  lastConfirmedAt?: string;
  evidenceText?: string | null;
  detectionMethod?: string | null;
  sourceStatus?: string | null;
  verificationStatusText: string;
  verificationStatusType: 'fresh' | 'recent' | 'aging' | 'unavailable';
  expiresAt: string | null;
  isUnread: boolean;
  savingsScore: number;
  offerOpportunityScore?: number;

  // Partner AI Offer specific presentation fields
  partner?: string | null;
  partnerType?: string | null;
  aiProvider?: string | null;
  aiPlan?: string | null;
  offerType?: string | null;
  benefit?: string | null;
  duration?: string | null;
  value?: string | number | null;
  activationMethod?: string | null;
  country?: string | null;
  region?: string | null;
  termsUrl?: string | null;
}

/**
 * Derives the verification freshness status of an offer from its confirmation timestamp and source status.
 */
export function formatVerificationStatus(dateString?: string, sourceStatus?: string | null): {
  text: string;
  type: 'fresh' | 'recent' | 'aging' | 'unavailable';
} {
  if (sourceStatus === 'FETCH_BLOCKED' || sourceStatus === 'PARSE_FAILED') {
    return { text: '⚠ Source currently unavailable', type: 'unavailable' };
  }
  if (!dateString) {
    return { text: '✓ Verified source', type: 'recent' };
  }
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = Math.max(0, now.getTime() - date.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      if (diffHours <= 1) {
        return { text: '✓ Verified today', type: 'fresh' };
      }
      return { text: `✓ Verified ${diffHours}h ago`, type: 'fresh' };
    }
    if (diffDays <= 2) {
      return { text: `✓ Verified ${diffDays}d ago`, type: 'recent' };
    }
    return { text: `⚠ Last verified ${diffDays}d ago`, type: 'aging' };
  } catch {
    return { text: '✓ Verified source', type: 'recent' };
  }
}

/**
 * Formats a timestamp into a readable date string (e.g., 'Aug 30, 2026').
 */
export function formatVerificationDate(dateString?: string): string {
  if (!dateString) return 'Recent';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return 'Recent';
  }
}

// ── Commercial partner types that qualify for Partner Bundles ─────────────────
// Education, cloud, and developer partner types do NOT qualify — they map to
// Student & Education or Startup Grants based on the offer context.
const COMMERCIAL_PARTNER_TYPES = new Set([
  'telecom',
  'broadband',
  'devices',
  'banking',
  'credit_card',
  'membership',
]);

// ── Offer types that signal Student & Education ───────────────────────────────
const EDUCATION_OFFER_TYPES = new Set([
  'EDUCATION_BUNDLE',
  'STUDENT_BUNDLE',
  'ACADEMIC_BUNDLE',
]);

// ── Offer types that signal Startup Grants ────────────────────────────────────
const STARTUP_OFFER_TYPES = new Set([
  'CLOUD_BUNDLE',
  'STARTUP_BUNDLE',
  'ACCELERATOR_BUNDLE',
  'INCUBATOR_BUNDLE',
  'GRANT_BUNDLE',
  'FOUNDER_BUNDLE',
]);

/**
 * Derives the semantic category of an offer from its verified metadata.
 *
 * Classification Priority (highest → lowest):
 *   1. STUDENT / EDUCATION  — student, .edu, teacher, university, campus, k-12
 *   2. STARTUP / GRANT      — startup, founder, accelerator, incubator, grant
 *   3. API DISCOUNT         — api, token, batch, prompt caching, off-peak
 *   4. ANNUAL SAVINGS       — annual, billed annually, subscription savings
 *   5. TRIAL / FREE TRIAL   — trial, preview
 *   6. PARTNER BUNDLE       — commercial non-AI partner (telecom/devices/banking/broadband/membership)
 *                             that explicitly provides an AI subscription or AI benefit
 *   7. FREE / SPECIAL       — free, 100%
 *
 * IMPORTANT: Partner Bundle requires BOTH:
 *   A. A non-AI commercial partner type (telecom, broadband, devices, banking, credit_card, membership)
 *   B. An explicit AI-related benefit in title/desc
 *
 * The following MUST NOT be classified as Partner Bundles regardless of partner/offerType fields:
 *   - partnerType = 'education' → Student & Education
 *   - partnerType = 'cloud'     → Startup Grants (cloud startup programs)
 *   - partnerType = 'developer' → context-dependent (student or startup, never partner)
 *   - offerType = EDUCATION_BUNDLE  → Student & Education
 *   - offerType = CLOUD_BUNDLE      → Startup Grants
 */
export function deriveOfferCategory(
  title: string,
  desc: string,
  eligibility: string,
  partner?: string | null,
  offerType?: string | null,
  partnerType?: string | null
): { category: FormattedOffer['category']; categoryLabel: string } {
  const combined = `${title} ${desc} ${eligibility}`.toLowerCase();
  const offerTypeUpper = (offerType || '').toUpperCase();
  const partnerTypeLower = (partnerType || '').toLowerCase();

  // ── Priority 1: STUDENT / EDUCATION ───────────────────────────────────────
  // Fires before Partner check.  Education partner types and education offerTypes
  // always resolve to Student, even when a partner/BUNDLE field is present.
  if (
    partnerTypeLower === 'education' ||
    EDUCATION_OFFER_TYPES.has(offerTypeUpper) ||
    combined.includes('student') ||
    combined.includes('educat') ||
    combined.includes('teacher') ||
    combined.includes('k-12') ||
    combined.includes('university') ||
    combined.includes('campus') ||
    combined.includes('sheerid') ||
    combined.includes('.edu')
  ) {
    return { category: 'student', categoryLabel: 'Student & Education' };
  }

  // ── Priority 2: STARTUP / GRANT ───────────────────────────────────────────
  // Cloud/developer partner types in startup context → Startup Grants.
  // Fires before Partner check.
  if (
    STARTUP_OFFER_TYPES.has(offerTypeUpper) ||
    partnerTypeLower === 'cloud' ||
    (partnerTypeLower === 'developer' && (
      combined.includes('startup') ||
      combined.includes('founder') ||
      combined.includes('accelerator') ||
      combined.includes('incubator')
    )) ||
    combined.includes('startup') ||
    combined.includes('accelerator') ||
    combined.includes('founder') ||
    combined.includes('incubator') ||
    combined.includes('grant')
  ) {
    return { category: 'startup', categoryLabel: 'Startup Grants' };
  }

  // ── Priority 3: API DISCOUNT ──────────────────────────────────────────────
  if (
    combined.includes('api') ||
    combined.includes('batch') ||
    combined.includes('prompt caching') ||
    combined.includes('cache read') ||
    combined.includes('off-peak') ||
    (combined.includes('token') && !combined.includes('access token'))
  ) {
    return { category: 'api', categoryLabel: 'API Discounts' };
  }

  // ── Priority 4: ANNUAL SAVINGS ────────────────────────────────────────────
  if (
    combined.includes('annual') ||
    combined.includes('billed annually') ||
    combined.includes('subscription savings')
  ) {
    return { category: 'annual', categoryLabel: 'Annual Savings' };
  }

  // ── Priority 5: TRIAL / FREE TRIAL ───────────────────────────────────────
  if (combined.includes('trial') || combined.includes('preview')) {
    return { category: 'trial', categoryLabel: 'Free Trials' };
  }

  // ── Priority 6: PARTNER BUNDLE ────────────────────────────────────────────
  // Requires BOTH conditions:
  //   A) A commercial non-AI partner type (telecom/broadband/devices/banking/credit_card/membership)
  //   B) An explicit AI-related benefit (ai subscription, ai credits, ai plan, ai tool, etc.)
  //
  // Does NOT trigger for:
  //   - Keyword "partner" or "bundle" alone
  //   - Education partner types
  //   - Cloud partner types (those were already handled as Startup above)
  //   - Non-AI perks (Netflix, Spotify, airport lounge, etc.)
  const hasCommercialPartnerType = partner != null && COMMERCIAL_PARTNER_TYPES.has(partnerTypeLower);
  const hasAiBenefit =
    combined.includes('ai subscription') ||
    combined.includes('ai subscriptions') ||
    combined.includes('ai software') ||
    combined.includes('ai pro') ||
    combined.includes('ai plan') ||
    combined.includes('ai credit') ||
    combined.includes('ai tool') ||
    combined.includes('ai assistant') ||
    combined.includes('gemini') ||
    combined.includes('perplexity') ||
    combined.includes('chatgpt') ||
    combined.includes('claude') ||
    combined.includes('copilot') ||
    combined.includes('cursor') ||
    combined.includes('deepseek') ||
    combined.includes('grok') ||
    combined.includes('windsurf') ||
    combined.includes('galaxy ai') ||
    combined.includes('google ai');

  if (hasCommercialPartnerType && hasAiBenefit) {
    return { category: 'partner', categoryLabel: 'Partner AI Offers' };
  }

  // ── Priority 7: FREE / SPECIAL ────────────────────────────────────────────
  if (combined.includes('free') || combined.includes('100%')) {
    return { category: 'free', categoryLabel: 'Free Access' };
  }
  return { category: 'free', categoryLabel: 'Special Promotion' };
}

/**
 * Computes an objective savings score to power the 'Recommended' and 'Highest Savings' sort modes.
 */
function computeSavingsScore(discount: string, title: string, category: string): number {
  const text = `${discount} ${title}`.toLowerCase();

  if (category === 'partner') {
    if (text.includes('18 months') || text.includes('18m')) return 100;
    if (text.includes('1 year') || text.includes('12 months') || text.includes('100%')) return 98;
    return 95;
  }
  if (text.includes('100%') || text.includes('12 months free') || text.includes('free for teachers')) return 100;
  if (text.includes('$100,000') || text.includes('$25,000') || text.includes('25k')) return 95;
  if (text.includes('90%') || text.includes('0.1x')) return 90;
  if (text.includes('50%')) return 80;
  if (text.includes('25%')) return 70;
  if (text.includes('20%')) return 65;
  if (text.includes('15%') || text.includes('14-day')) return 60;
  if (category === 'student') return 85;
  if (category === 'startup') return 80;
  return 50;
}

/**
 * Formats and humanizes raw scraped offer payloads into clean,
 * Bloomberg/Stripe-grade B2B SaaS intelligence copy.
 */
export function formatOfferForDisplay(
  rawOffer: PublicOffer,
  readOfferIds: string[] = []
): FormattedOffer {
  const providerId = (rawOffer.providerId || '').toLowerCase();
  const providerName = rawOffer.providerName || rawOffer.providerId;
  const rawTitle = decodeHtmlEntities(rawOffer.title || '');
  const rawDesc = decodeHtmlEntities(rawOffer.description || '');
  const rawDiscount = decodeHtmlEntities(String(rawOffer.discount || ''));

  // Clean title without wiping diverse sub-page offers
  let title = rawTitle
    .replace(/^.*:\s*["']?([^"']+)["']?\s*promotion detected$/i, '$1')
    .replace(/\bpromotion detected\b/gi, 'Promotion')
    .trim();

  if (!title) {
    if (rawOffer.partner) {
      title = `${rawOffer.partner} × ${providerName} AI Bundle`;
    } else {
      title = `${providerName} Special Offer`;
    }
  }

  // Clean description
  let summary = rawDesc
    .replace(/where can i ask more questions.*$/i, '')
    .replace(/^urity,\s*/i, 'For your security, ')
    .replace(/\s*↓\s*↑.*$/, '')
    .trim();

  if (!summary) {
    if (rawOffer.partner) {
      summary = `Verified ${providerName} AI offer bundled with ${rawOffer.partner}.`;
    } else {
      summary = `Verified promotion detected directly from the official ${providerName} source.`;
    }
  }

  // Derive eligibility
  let eligibility = rawOffer.eligibility || 'All Users';
  if (!rawOffer.eligibility) {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = summary.toLowerCase();

    if (rawOffer.partner) {
      eligibility = `Eligible ${rawOffer.partner} customers`;
    } else if (
      lowerTitle.includes('student') ||
      lowerDesc.includes('student') ||
      lowerTitle.includes('.edu') ||
      lowerDesc.includes('.edu')
    ) {
      eligibility = 'Verified Students (.edu)';
    } else if (lowerTitle.includes('teacher') || lowerDesc.includes('teacher') || lowerTitle.includes('k-12')) {
      eligibility = 'Verified K-12 Educators';
    } else if (lowerTitle.includes('nonprofit') || lowerDesc.includes('nonprofit')) {
      eligibility = '501(c)(3) Nonprofits';
    } else if (lowerTitle.includes('startup') || lowerDesc.includes('startup') || lowerTitle.includes('accelerator')) {
      eligibility = 'Early-Stage Startups';
    } else if (lowerTitle.includes('api') || lowerDesc.includes('api') || lowerTitle.includes('developer')) {
      eligibility = 'API Developers';
    } else if (lowerTitle.includes('annual') || lowerDesc.includes('annual')) {
      eligibility = 'Annual Subscribers';
    }
  }

  // Format Discount Badge
  let discountBadge = rawOffer.benefit || rawDiscount;
  if (!discountBadge || discountBadge === 'Special Offer') {
    const lowerTitle = title.toLowerCase();
    const lowerDesc = summary.toLowerCase();
    if (lowerTitle.includes('100% free') || lowerDesc.includes('100% free')) discountBadge = '100% Free';
    else if (lowerTitle.includes('18 months free') || lowerDesc.includes('18 months free')) discountBadge = '18 Months Free';
    else if (lowerTitle.includes('12 months free') || lowerDesc.includes('12 months free')) discountBadge = '12 Months Free';
    else if (lowerTitle.includes('14-day free trial')) discountBadge = '14-Day Free Trial';
    else if (lowerTitle.includes('50%')) discountBadge = '50% Off';
    else if (lowerTitle.includes('90%')) discountBadge = '90% Off';
    else if (lowerTitle.includes('20%')) discountBadge = '20% Off';
    else if (lowerTitle.includes('15%')) discountBadge = '15% Off';
    else if (lowerTitle.includes('credits')) discountBadge = 'Free Credits';
    else if (rawOffer.partner) discountBadge = 'Partner Bundle';
    else discountBadge = 'Verified Offer';
  }

  const { category, categoryLabel } = deriveOfferCategory(
    title,
    summary,
    eligibility,
    rawOffer.partner,
    rawOffer.offerType,
    rawOffer.partnerType
  );
  const savingsScore = computeSavingsScore(discountBadge, title, category);
  const confirmedTimestamp = rawOffer.lastConfirmedAt || rawOffer.detectedAt;
  const verification = formatVerificationStatus(confirmedTimestamp, rawOffer.sourceStatus);

  return {
    id: rawOffer.id,
    providerId,
    providerName,
    title,
    summary,
    discountBadge,
    category,
    categoryLabel,
    eligibility,
    evidenceText: rawOffer.evidenceText || null,
    detectionMethod: rawOffer.detectionMethod || null,
    sourceStatus: rawOffer.sourceStatus || 'VERIFIED',
    sourceUrl: rawOffer.sourceUrl,
    detectedAt: rawOffer.detectedAt,
    lastConfirmedAt: confirmedTimestamp,
    verificationStatusText: verification.text,
    verificationStatusType: verification.type,
    expiresAt: rawOffer.expiresAt,
    isUnread: !readOfferIds.includes(rawOffer.id),
    savingsScore,
    // Partner specifics
    partner: rawOffer.partner || null,
    partnerType: rawOffer.partnerType || null,
    aiProvider: rawOffer.aiProvider || null,
    aiPlan: rawOffer.aiPlan || null,
    offerType: rawOffer.offerType || null,
    benefit: rawOffer.benefit || null,
    duration: rawOffer.duration || null,
    value: rawOffer.value || null,
    activationMethod: rawOffer.activationMethod || null,
    country: rawOffer.country || null,
    region: rawOffer.region || null,
    termsUrl: rawOffer.termsUrl || null,
    offerOpportunityScore: rawOffer.offerOpportunityScore,
  };
}

/**
 * Formats relative time concisely (e.g., '2h ago', '1d ago', 'Just now').
 */
export function formatCompactTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  } catch {
    return 'Recent';
  }
}
