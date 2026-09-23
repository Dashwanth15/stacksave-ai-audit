// ============================================================
// Offers Access Configuration — StackSave AI
// Centralized, configurable access control for Free vs. Premium offers.
// Controls Free visibility limits, Premium-only providers, and categories.
// ============================================================

export interface OffersAccessConfig {
  /** Master switch to enable/disable premium offer gating */
  PREMIUM_OFFERS_ENABLED: boolean;

  /**
   * Maximum number of free visible offers allowed per category.
   * Set to null / undefined / Infinity to not artificially truncate current Free offers.
   */
  FREE_VISIBLE_OFFER_LIMIT: number | null;

  /** Number of synthetic blurred preview cards displayed in the Premium gate */
  PREMIUM_OFFER_PREVIEW_COUNT: number;

  /** List of category keys that are strictly Premium-only (e.g. ['startup', 'api']) */
  PREMIUM_OFFER_CATEGORIES: string[];

  /** List of canonical provider IDs that are strictly Premium-only (e.g. ['openai-api', 'anthropic-api']) */
  PREMIUM_PROVIDER_ACCESS: string[];
}

export const OFFERS_ACCESS_CONFIG: OffersAccessConfig = {
  PREMIUM_OFFERS_ENABLED: true,
  // Preserves existing Free-accessible offers without artificial truncation
  FREE_VISIBLE_OFFER_LIMIT: null,
  PREMIUM_OFFER_PREVIEW_COUNT: 3,
  // Ready for category-level designations:
  PREMIUM_OFFER_CATEGORIES: [],
  // Canonical provider IDs designated as Premium-only offers:
  PREMIUM_PROVIDER_ACCESS: [
    'copy-ai',
    'ideogram',
    'writesonic',
    'speechify',
    'framer',
    'beautiful-ai',
    'suno',
  ],
};

/**
 * Single Authoritative Classification Helper for Premium-Only Offers.
 * Evaluates offer-level flag, category rules, and provider-level configuration.
 */
export function isOfferPremiumOnly(offer: {
  isPremiumOnly?: boolean;
  category?: string;
  providerId?: string;
  aiProvider?: string;
  canonicalProviderId?: string;
}): boolean {
  if (!offer) return false;
  if (offer.isPremiumOnly === true) return true;

  const cat = (offer.category || '').toLowerCase().trim();
  if (
    cat &&
    Array.isArray(OFFERS_ACCESS_CONFIG.PREMIUM_OFFER_CATEGORIES) &&
    OFFERS_ACCESS_CONFIG.PREMIUM_OFFER_CATEGORIES.some((c) => c.toLowerCase().trim() === cat)
  ) {
    return true;
  }

  const provId = (offer.canonicalProviderId || offer.aiProvider || offer.providerId || '')
    .toLowerCase()
    .trim();
  if (
    provId &&
    Array.isArray(OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS) &&
    OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS.some((p) => p.toLowerCase().trim() === provId)
  ) {
    return true;
  }
  return false;
}

export function isPremiumEligibleProvider(providerId: string): boolean {
  if (!providerId) return false;
  const normalized = providerId.toLowerCase().trim();
  return OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS.some((p) => p.toLowerCase().trim() === normalized);
}

