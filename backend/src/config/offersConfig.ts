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

// ── Offer Lifecycle Time Constants ────────────────────────────
export const EARLY_ACCESS_DURATION_DAYS = 5;
export const EARLY_ACCESS_DURATION_MS = EARLY_ACCESS_DURATION_DAYS * 24 * 60 * 60 * 1000; // exactly 5 days (432,000,000 ms)

export const PREMIUM_ALERT_DURATION_DAYS = 180; // 6 months (~180 days)
export const PREMIUM_ALERT_DURATION_MS = PREMIUM_ALERT_DURATION_DAYS * 24 * 60 * 60 * 1000; // 15,552,000,000 ms

export type OfferAlertType =
  | 'EARLY_ACCESS'
  | 'PRICE_DROP'
  | 'NEW'
  | 'LIMITED_TIME'
  | 'IMPORTANT'
  | 'PRICE_CHANGE'
  | 'PREMIUM_INTELLIGENCE';

export interface OfferAlertMetadata {
  isIntelligenceAlert: boolean;
  alertType?: OfferAlertType;
  alertPriority?: 'high' | 'medium' | 'standard';
  alertDetectedAt?: Date | string;
  alertExpiresAt?: Date | string;
  alertReason?: string;
}

/**
 * Validates whether an offer is active, valid, and not expired according to official rules.
 * Source-of-truth across backend routes and services.
 */
export function isOfferActiveAndValid(
  offer: {
    isActive?: boolean;
    status?: string;
    expiresAt?: Date | string | null;
    isPublic?: boolean;
  },
  now: Date = new Date()
): boolean {
  if (!offer) return false;
  if (offer.isActive === false) return false;
  if (offer.isPublic === false) return false;
  if (offer.status === 'EXPIRED') return false;

  if (offer.expiresAt) {
    const expTime = new Date(offer.expiresAt).getTime();
    if (!isNaN(expTime) && expTime <= now.getTime()) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether a verified offer is within its 5-day Early Access window.
 */
export function isOfferInEarlyAccess(
  offer: { detectedAt?: Date | string },
  now: Date = new Date()
): boolean {
  if (!offer || !offer.detectedAt) return false;
  const detectedTime = new Date(offer.detectedAt).getTime();
  if (isNaN(detectedTime)) return false;
  const ageMs = now.getTime() - detectedTime;
  return ageMs >= 0 && ageMs < EARLY_ACCESS_DURATION_MS;
}

/**
 * Checks whether an offer is within its 6-month Premium intelligence alert window.
 */
export function isOfferInPremiumAlertWindow(
  offer: { detectedAt?: Date | string },
  now: Date = new Date()
): boolean {
  if (!offer || !offer.detectedAt) return false;
  const detectedTime = new Date(offer.detectedAt).getTime();
  if (isNaN(detectedTime)) return false;
  const ageMs = now.getTime() - detectedTime;
  return ageMs >= 0 && ageMs < PREMIUM_ALERT_DURATION_MS;
}

/**
 * Returns the exact timestamp when Early Access ends for an offer (detectedAt + 5 days).
 */
export function getEarlyAccessUntil(detectedAt: Date | string | number): Date {
  const d = new Date(detectedAt);
  return new Date(d.getTime() + EARLY_ACCESS_DURATION_MS);
}

/**
 * Returns the exact timestamp when Premium Alert expires for an offer (detectedAt + 180 days).
 */
export function getPremiumAlertExpiresAt(detectedAt: Date | string | number): Date {
  const d = new Date(detectedAt);
  return new Date(d.getTime() + PREMIUM_ALERT_DURATION_MS);
}

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

/**
 * Authoritative Server-Side Gate for Offer Visibility:
 * Priority Order:
 * 1. Validity / Active state (Invalid/expired/removed -> Hidden for everyone)
 * 2. Premium user -> Visible
 * 3. Permanent Premium-only offer -> Hidden for Free/Guest
 * 4. Early Access (< 5 days) -> Hidden for Free/Guest
 * 5. Public offer (>= 5 days) -> Visible for Free/Guest
 */
export function isOfferVisibleForUser(params: {
  offer: {
    detectedAt?: Date | string;
    isPremiumOnly?: boolean;
    category?: string;
    providerId?: string;
    aiProvider?: string;
    canonicalProviderId?: string;
    isActive?: boolean;
    status?: string;
    expiresAt?: Date | string | null;
    isPublic?: boolean;
  };
  isPremium: boolean;
  now?: Date;
}): boolean {
  const now = params.now || new Date();

  // 1. Highest Priority: Active & Valid check
  if (!isOfferActiveAndValid(params.offer, now)) {
    return false;
  }

  // 2. Premium users see all valid active offers
  if (params.isPremium) {
    return true;
  }

  // 3. Permanent Premium-only offers are strictly gated
  if (isOfferPremiumOnly(params.offer)) {
    return false;
  }

  // 4. Early access gating: Free/Guest cannot see offers detected < 5 days ago
  if (isOfferInEarlyAccess(params.offer, now)) {
    return false;
  }

  // 5. Normal public offer accessible after 5 days
  return true;
}

/**
 * Derives a specific alert classification type for an offer based strictly on genuine evidence.
 * Static commercial discounts (Student, Partner, Annual, Free) return null (no alert).
 */
export function deriveOfferAlertType(
  offer: {
    title?: string;
    description?: string;
    discount?: string;
    discountType?: string;
    offerSubtype?: string;
    category?: string;
    expiresAt?: Date | string | null;
    annualSavingsPercent?: number | null;
    annualSavingsAmount?: number | null;
    finalRecommendedScore?: number | null;
    detectedAt?: Date | string;
    eventType?: string | null;
    isPriceDrop?: boolean;
    hasGenuinePriceDrop?: boolean;
    hasHistoricalPriceDrop?: boolean;
    isPriceChange?: boolean;
    isNewOfferIdentity?: boolean;
    isNewCommercialIdentity?: boolean;
    isLimitedTime?: boolean;
    previousPrice?: number | null;
    currentPrice?: number | null;
    evidenceType?: string | null;
    alertType?: string | null;
  },
  now: Date = new Date()
): OfferAlertType | null {
  if (!offer) return null;

  // 1. EARLY_ACCESS: Newly detected valid public offer in Day 0 to Day 5
  if (isOfferInEarlyAccess(offer, now)) {
    return 'EARLY_ACCESS';
  }

  // 2. GENUINE PRICE_DROP: Explicit verified evidence of price reduction against historical baseline
  const hasHistoricalDrop =
    offer.isPriceDrop === true ||
    offer.hasGenuinePriceDrop === true ||
    offer.hasHistoricalPriceDrop === true ||
    offer.eventType === 'PRICE_DROP' ||
    offer.evidenceType === 'PRICE_DROP' ||
    offer.alertType === 'PRICE_DROP' ||
    (typeof offer.previousPrice === 'number' &&
      typeof offer.currentPrice === 'number' &&
      offer.previousPrice > offer.currentPrice);

  if (hasHistoricalDrop) {
    return 'PRICE_DROP';
  }

  // 3. GENUINE LIMITED_TIME: Explicit verified expiry window in near future or verified promo ending
  const hasVerifiedLimitedTime =
    offer.isLimitedTime === true ||
    offer.offerSubtype === 'LIMITED_TIME' ||
    offer.evidenceType === 'LIMITED_TIME' ||
    offer.alertType === 'LIMITED_TIME';

  if (hasVerifiedLimitedTime) {
    return 'LIMITED_TIME';
  }

  if (offer.expiresAt) {
    const expTime = new Date(offer.expiresAt).getTime();
    if (!isNaN(expTime)) {
      const msUntilExpiry = expTime - now.getTime();
      // Genuinely time-limited if expiring within 14 days and still active
      if (msUntilExpiry > 0 && msUntilExpiry <= 14 * 24 * 60 * 60 * 1000) {
        return 'LIMITED_TIME';
      }
    }
  }

  // 4. GENUINE PRICE_CHANGE: Verified provider-level pricing/rate change event
  const hasVerifiedPriceChange =
    offer.isPriceChange === true ||
    offer.eventType === 'PRICE_CHANGE' ||
    offer.evidenceType === 'PRICE_CHANGE' ||
    offer.alertType === 'PRICE_CHANGE';

  if (hasVerifiedPriceChange) {
    return 'PRICE_CHANGE';
  }

  // 5. GENUINE NEW: Verified new commercial offer identity
  const hasVerifiedNewIdentity =
    offer.isNewOfferIdentity === true ||
    offer.isNewCommercialIdentity === true ||
    offer.evidenceType === 'NEW' ||
    offer.alertType === 'NEW';

  if (hasVerifiedNewIdentity) {
    return 'NEW';
  }

  // Static commercial offers (Student discounts, Annual billing, Partner bundles, Free tiers)
  // have NO intelligence event. Return null.
  return null;
}

/**
 * Derives the alert priority level.
 */
export function deriveOfferAlertPriority(offer: {
  annualSavingsPercent?: number | null;
  finalRecommendedScore?: number | null;
}): 'high' | 'medium' | 'standard' {
  if (
    (typeof offer.annualSavingsPercent === 'number' && offer.annualSavingsPercent >= 40) ||
    (typeof offer.finalRecommendedScore === 'number' && offer.finalRecommendedScore >= 80)
  ) {
    return 'high';
  }
  if (
    (typeof offer.annualSavingsPercent === 'number' && offer.annualSavingsPercent >= 20) ||
    (typeof offer.finalRecommendedScore === 'number' && offer.finalRecommendedScore >= 60)
  ) {
    return 'medium';
  }
  return 'standard';
}

/**
 * Derives user-facing alert reason string for Premium intelligence.
 */
export function deriveOfferAlertReason(
  offer: {
    title?: string;
    providerName?: string;
  },
  alertType: OfferAlertType
): string {
  const prov = offer.providerName || 'AI Platform';
  switch (alertType) {
    case 'EARLY_ACCESS':
      return `Premium Early Access: newly detected verified offer for ${prov}`;
    case 'PRICE_DROP':
      return `Verified historical price drop detected for ${prov}`;
    case 'NEW':
      return `Newly discovered verified commercial offer for ${prov}`;
    case 'LIMITED_TIME':
      return `Verified time-limited promotion active for ${prov}`;
    case 'PRICE_CHANGE':
      return `Verified rate change detected for ${prov}`;
    case 'IMPORTANT':
      return `Verified high-impact intelligence event for ${prov}`;
    default:
      return `Premium intelligence alert for ${prov}`;
  }
}

/**
 * Generates sanitized alert metadata based on user entitlement and offer lifecycle age.
 * Free / Guest users NEVER receive alert metadata.
 */
export function getOfferAlertMetadata(
  offer: {
    title?: string;
    description?: string;
    discount?: string;
    discountType?: string;
    offerSubtype?: string;
    category?: string;
    expiresAt?: Date | string | null;
    annualSavingsPercent?: number | null;
    annualSavingsAmount?: number | null;
    finalRecommendedScore?: number | null;
    detectedAt?: Date | string;
    providerName?: string;
    eventType?: string | null;
    isPriceDrop?: boolean;
    hasGenuinePriceDrop?: boolean;
    hasHistoricalPriceDrop?: boolean;
    isPriceChange?: boolean;
    isNewOfferIdentity?: boolean;
    isNewCommercialIdentity?: boolean;
    isLimitedTime?: boolean;
    previousPrice?: number | null;
    currentPrice?: number | null;
    evidenceType?: string | null;
    alertType?: string | null;
  },
  isPremium: boolean,
  now: Date = new Date()
): OfferAlertMetadata {
  if (!isPremium || !isOfferInPremiumAlertWindow(offer, now)) {
    return {
      isIntelligenceAlert: false,
    };
  }

  const alertType = deriveOfferAlertType(offer, now);
  if (!alertType) {
    return {
      isIntelligenceAlert: false,
    };
  }

  const alertPriority = deriveOfferAlertPriority(offer);
  const alertReason = deriveOfferAlertReason(offer, alertType);

  return {
    isIntelligenceAlert: true,
    alertType,
    alertPriority,
    alertDetectedAt: offer.detectedAt,
    alertExpiresAt: getPremiumAlertExpiresAt(offer.detectedAt || now),
    alertReason,
  };
}

export function isPremiumEligibleProvider(providerId: string): boolean {
  if (!providerId) return false;
  const normalized = providerId.toLowerCase().trim();
  return OFFERS_ACCESS_CONFIG.PREMIUM_PROVIDER_ACCESS.some((p) => p.toLowerCase().trim() === normalized);
}

