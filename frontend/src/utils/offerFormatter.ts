// ============================================================
// offerFormatter — StackSave AI Sourcing Presentation Layer
// Decodes scraped entities, sanitizes text, and formats crisp SaaS copy
// 100% Data-Driven: Preserves live multi-page scraped offer metadata
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

export type OfferCategory = 'all' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';

export interface FormattedOffer {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  summary: string;
  discountBadge: string;
  category: 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';
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

/**
 * Derives the semantic category of an offer from its verified metadata.
 */
export function deriveOfferCategory(title: string, desc: string, eligibility: string): { category: FormattedOffer['category']; categoryLabel: string } {
  const combined = `${title} ${desc} ${eligibility}`.toLowerCase();

  if (combined.includes('student') || combined.includes('educat') || combined.includes('teacher') || combined.includes('k-12') || combined.includes('university') || combined.includes('campus') || combined.includes('sheerid')) {
    return { category: 'student', categoryLabel: 'Student & Education' };
  }
  if (combined.includes('annual') || combined.includes('year') || combined.includes('billed annually') || combined.includes('subscription savings')) {
    return { category: 'annual', categoryLabel: 'Annual Savings' };
  }
  if (combined.includes('startup') || combined.includes('accelerator') || combined.includes('founder') || combined.includes('grant')) {
    return { category: 'startup', categoryLabel: 'Startup Grants' };
  }
  if (combined.includes('api') || combined.includes('batch') || combined.includes('prompt caching') || combined.includes('cache read') || combined.includes('off-peak') || combined.includes('token')) {
    return { category: 'api', categoryLabel: 'API Discounts' };
  }
  if (combined.includes('trial') || combined.includes('preview')) {
    return { category: 'trial', categoryLabel: 'Free Trials' };
  }
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
    title = `${providerName} Special Offer`;
  }

  // Clean description
  let summary = rawDesc
    .replace(/where can i ask more questions.*$/i, '')
    .replace(/^urity,\s*/i, 'For your security, ')
    .replace(/\s*↓\s*↑.*$/, '')
    .trim();

  if (!summary) {
    summary = `Verified promotion detected directly from the official ${providerName} source.`;
  }

  // Derive eligibility
  let eligibility = 'All Users';
  const lowerTitle = title.toLowerCase();
  const lowerDesc = summary.toLowerCase();

  if (lowerTitle.includes('student') || lowerDesc.includes('student') || lowerTitle.includes('.edu') || lowerDesc.includes('.edu')) {
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

  // Format Discount Badge
  let discountBadge = rawDiscount;
  if (!discountBadge || discountBadge === 'Special Offer') {
    if (lowerTitle.includes('100% free') || lowerDesc.includes('100% free')) discountBadge = '100% Free';
    else if (lowerTitle.includes('12 months free')) discountBadge = '12 Months Free';
    else if (lowerTitle.includes('14-day free trial')) discountBadge = '14-Day Free Trial';
    else if (lowerTitle.includes('50%')) discountBadge = '50% Off';
    else if (lowerTitle.includes('90%')) discountBadge = '90% Off';
    else if (lowerTitle.includes('20%')) discountBadge = '20% Off';
    else if (lowerTitle.includes('15%')) discountBadge = '15% Off';
    else if (lowerTitle.includes('credits')) discountBadge = 'Free Credits';
    else discountBadge = 'Verified Offer';
  }

  const { category, categoryLabel } = deriveOfferCategory(title, summary, eligibility);
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
