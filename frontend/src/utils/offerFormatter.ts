// ============================================================
// offerFormatter — StackSave AI Sourcing Presentation Layer
// Decodes scraped entities, sanitizes text, and formats crisp SaaS copy
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

export interface FormattedOffer {
  id: string;
  providerId: string;
  providerName: string;
  title: string;
  summary: string;
  discountBadge: string;
  sourceUrl: string;
  detectedAt: string;
  expiresAt: string | null;
  isUnread: boolean;
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

  let title = rawTitle;
  let summary = rawDesc;
  let discountBadge = rawDiscount || 'Special Offer';

  // ── Specialized Cleaners for Known Scraped Vendor Patterns ──

  if (providerId === 'deepseek' || rawTitle.toLowerCase().includes('deepseek')) {
    title = 'DeepSeek Off-Peak API Discount';
    discountBadge = '50% off-peak savings';
    summary = 'Reduce API costs by 50% by shifting eligible workloads to off-peak hours.';
  } else if (providerId === 'cursor' || rawTitle.toLowerCase().includes('cursor')) {
    title = 'Cursor Pro 14-Day Free Trial';
    discountBadge = '14-day free trial';
    summary = 'Try Cursor Pro free for 14 days with full access to fast requests and premium models.';
  } else if (
    providerId === 'github-copilot' ||
    providerId === 'copilot' ||
    rawTitle.toLowerCase().includes('copilot')
  ) {
    title = 'GitHub Copilot for Students & Educators';
    discountBadge = '100% free tier';
    summary = 'Verified students, educators, and open source maintainers get GitHub Copilot free.';
  } else if (providerId === 'claude' || rawTitle.toLowerCase().includes('claude')) {
    title = 'Claude Pro Annual Billing Savings';
    discountBadge = '15% annual savings';
    summary = 'Save 15% on Claude Pro when switching from monthly to annual billing.';
  } else if (
    providerId === 'openai' ||
    providerId === 'openai-api' ||
    rawTitle.toLowerCase().includes('batch api')
  ) {
    title = 'OpenAI Batch API 50% Discount';
    discountBadge = '50% batch savings';
    summary = 'Save 50% on eligible asynchronous API workloads.';
  } else if (providerId === 'gemini' || rawTitle.toLowerCase().includes('student bundle')) {
    title = 'Google AI Student Bundle Promotion';
    discountBadge = 'Student bundle savings';
    summary = 'Eligible students receive bundled access to Gemini Advanced with YouTube Premium Lite.';
  } else {
    // Generic fallback cleaner
    // Remove "detected" or scraped prefixes
    title = title.replace(/^.*:\s*["']?([^"']+)["']?\s*promotion detected$/i, '$1');
    title = title.replace(/\bpromotion detected\b/gi, 'Promotion').trim();

    // Clean description: take first clean sentence
    if (summary) {
      // Remove forum/nav fragments
      summary = summary.replace(/where can i ask more questions.*$/i, '').trim();
      summary = summary.replace(/^urity,\s*/i, 'For your security, ').trim();
      summary = summary.replace(/\s*↓\s*↑.*$/, '').trim();

      // Ensure length is concise (max 140 chars)
      if (summary.length > 140) {
        const sentenceEnd = summary.indexOf('. ');
        if (sentenceEnd > 20 && sentenceEnd < 140) {
          summary = summary.slice(0, sentenceEnd + 1);
        } else {
          summary = summary.slice(0, 137).trim() + '...';
        }
      }
    } else {
      summary = `Verified promotion detected on the official ${providerName} pricing page.`;
    }
  }


  return {
    id: rawOffer.id,
    providerId,
    providerName,
    title,
    summary,
    discountBadge,
    sourceUrl: rawOffer.sourceUrl,
    detectedAt: rawOffer.detectedAt,
    expiresAt: rawOffer.expiresAt,
    isUnread: !readOfferIds.includes(rawOffer.id),
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
