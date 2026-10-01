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
 * Strict Contract:
 * - NORMAL (default): null
 * - PRICE_DROP: Actual verified price drop against historical baseline
 * - LIMITED_TIME: Explicit near-term expiration (<= 14 days) or verified promo ending
 * - IMPORTANT: Explicit verified high-impact intelligence event signal
 *
 * Static commercial discounts (Startup grants, Student offers, Partner bundles,
 * Annual savings, API discounts, Free tiers) return null (NORMAL OFFER).
 */
// ── Tier-1 AI Platforms (Highest Strategic Significance for IMPORTANT) ──
export const TIER_1_AI_PROVIDERS = new Set([
  'chatgpt',
  'openai',
  'openai-api',
  'claude',
  'anthropic',
  'anthropic-api',
  'gemini',
  'google',
  'google-one',
  'perplexity',
]);

// ── Recognized AI Platforms (Secondary Provider Significance) ──
export const MAJOR_AI_PROVIDERS = new Set([
  ...TIER_1_AI_PROVIDERS,
  'github-copilot',
  'cursor',
  'deepseek',
  'grok',
  'xai',
  'windsurf',
  'mistral',
]);

/**
 * Checks if an offer originates from or involves a Tier-1 Highest-Significance AI Provider.
 * Used strictly for IMPORTANT alert qualification (ChatGPT, Claude, Gemini, Perplexity).
 */
export function isTier1AIProvider(offer: {
  providerId?: string;
  providerName?: string;
  aiProvider?: string;
  canonicalProviderId?: string;
  title?: string;
}): boolean {
  const candidates = [
    offer.providerId,
    offer.providerName,
    offer.aiProvider,
    offer.canonicalProviderId,
  ]
    .filter(Boolean)
    .map((s) => (s as string).toLowerCase().trim());

  for (const c of candidates) {
    if (TIER_1_AI_PROVIDERS.has(c)) return true;
    for (const tier1 of TIER_1_AI_PROVIDERS) {
      if (c.includes(tier1)) return true;
    }
  }

  const titleLower = (offer.title || '').toLowerCase();
  for (const tier1 of TIER_1_AI_PROVIDERS) {
    if (titleLower.includes(tier1)) return true;
  }

  return false;
}

/**
 * Checks if an offer originates from or involves a recognized AI Provider.
 */
export function isMajorAIProvider(offer: {
  providerId?: string;
  providerName?: string;
  aiProvider?: string;
  canonicalProviderId?: string;
  title?: string;
}): boolean {
  const candidates = [
    offer.providerId,
    offer.providerName,
    offer.aiProvider,
    offer.canonicalProviderId,
  ]
    .filter(Boolean)
    .map((s) => (s as string).toLowerCase().trim());

  for (const c of candidates) {
    if (MAJOR_AI_PROVIDERS.has(c)) return true;
    for (const major of MAJOR_AI_PROVIDERS) {
      if (c.includes(major)) return true;
    }
  }

  const titleLower = (offer.title || '').toLowerCase();
  for (const major of MAJOR_AI_PROVIDERS) {
    if (titleLower.includes(major)) return true;
  }

  return false;
}

/**
 * Helper to detect explicit provider statements of price reduction in text.
 * e.g. "Price reduced from $X to $Y", "Now $X, previously $Y", "Price drop from...".
 */
function hasExplicitPriceDropCopy(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('price reduced') ||
    lower.includes('price dropped') ||
    lower.includes('rate reduced') ||
    lower.includes('price cut') ||
    lower.includes('price decrease') ||
    /now \$\d+,? previously \$\d+/i.test(text) ||
    /reduced from \$\d+ to \$\d+/i.test(text)
  );
}

/**
 * Helper to detect explicit promotional time-limited copy in text.
 */
function hasExplicitTimeLimitedCopy(text?: string | null): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('offer ends') ||
    lower.includes('promotion ends') ||
    lower.includes('promo ends') ||
    lower.includes('sale ends') ||
    lower.includes('available until') ||
    lower.includes('valid until') ||
    lower.includes('ends soon') ||
    lower.includes('promotion ends soon') ||
    lower.includes('limited-time offer') ||
    lower.includes('limited time offer') ||
    lower.includes('flash sale') ||
    lower.includes('spring sale') ||
    lower.includes('summer sale') ||
    lower.includes('black friday') ||
    lower.includes('cyber monday') ||
    lower.includes('holiday special')
  );
}

/**
 * Extracts promotional discount percentage from explicit fields or text.
 */
function extractPromotionalDiscountPercent(offer: {
  discount?: string | null;
  annualSavingsPercent?: number | null;
  title?: string | null;
  description?: string | null;
  offerSubtype?: string | null;
  duration?: string | null;
}): number | null {
  if (offer.offerSubtype === 'FREE_PLAN') {
    return null;
  }
  const dur = (offer.duration || '').toLowerCase();
  if (dur.includes('ongoing free tier') || dur.includes('ongoing free plan')) {
    return null;
  }

  if (offer.discount) {
    const discLower = offer.discount.toLowerCase();
    if (discLower.includes('free tier') || discLower.includes('free plan')) {
      return null;
    }
    const match = offer.discount.match(/(\d+)%/);
    if (match) return parseInt(match[1], 10);
  }

  const text = `${offer.title || ''} ${offer.description || ''}`.toLowerCase();
  const match = text.match(/(\d+)%\s*(?:off|discount|reduction|saving)/);
  if (match) return parseInt(match[1], 10);

  if (text.includes('half price') || text.includes('half-price')) {
    return 50;
  }

  // Large annual savings (>= 50%) qualify as exceptional commercial price drops
  if (typeof offer.annualSavingsPercent === 'number' && offer.annualSavingsPercent >= 50) {
    return offer.annualSavingsPercent;
  }

  return null;
}

/**
 * Checks if the offer represents completely free / 100% free promotional access.
 */
function isCompletelyFreePromotion(offer: {
  title?: string | null;
  description?: string | null;
  discount?: string | null;
  benefit?: string | null;
  offerSubtype?: string | null;
  duration?: string | null;
}): boolean {
  // Exclude permanent developer free tiers (e.g. Amazon Q Developer Free Tier)
  if (offer.offerSubtype === 'FREE_PLAN') {
    return false;
  }
  const durationText = (offer.duration || '').toLowerCase();
  if (durationText.includes('ongoing free tier') || durationText.includes('ongoing free plan')) {
    return false;
  }

  const text = `${offer.title || ''} ${offer.description || ''} ${offer.discount || ''} ${offer.benefit || ''}`.toLowerCase();

  // Exclude permanent community/free tiers without promotional access
  const isPermanentFreeTier =
    (text.includes('community tier') ||
      text.includes('free creator plan') ||
      text.includes('free daily allowance') ||
      text.includes('free tier') ||
      text.includes('free developer tier') ||
      text.includes('ongoing free tier') ||
      text.includes('free inference endpoints')) &&
    !text.includes('100% free for') &&
    !text.includes('100% free k-12') &&
    !text.includes('100% free plus plan') &&
    !text.includes('100% free professional plan') &&
    !text.includes('100% free plan') &&
    !text.includes('free for teachers') &&
    !text.includes('$0 for 1 year') &&
    !text.includes('$0 for 12 months');

  if (isPermanentFreeTier) return false;

  return (
    text.includes('100% free') ||
    text.includes('free for teachers') ||
    text.includes('$0 for 1 year') ||
    text.includes('$0 for 12 months') ||
    (typeof offer.discount === 'string' && /100%\s*free/i.test(offer.discount))
  );
}

/**
 * Extracts promotional duration in months (e.g. 16 months free, 12 months free, 3 months free).
 */
function extractPromotionalDurationMonths(offer: {
  title?: string | null;
  description?: string | null;
  duration?: string | null;
  benefit?: string | null;
  discount?: string | null;
}): number | null {
  const text = `${offer.title || ''} ${offer.description || ''} ${offer.duration || ''} ${offer.benefit || ''} ${offer.discount || ''}`.toLowerCase();

  // Dynamic regex for "X months free / with purchase / included / complimentary"
  const monthMatch = text.match(/\b(\d+)\s*months?\s*(?:free|included|complimentary|with purchase)\b/i);
  if (monthMatch) {
    return parseInt(monthMatch[1], 10);
  }

  if (/\b16\s*months?\s*free\b/i.test(text) || /\b16-month\b/i.test(text)) return 16;
  if (
    /\b12\s*months?\s*free\b/i.test(text) ||
    /\b12-month\s*free\b/i.test(text) ||
    /\b1\s*year\s*free\b/i.test(text) ||
    /\b1\s*year\s*google\s*one\b/i.test(text) ||
    /\b12\s*months?\s*with\s*purchase\b/i.test(text)
  ) return 12;
  if (/\b6\s*months?\s*free\b/i.test(text) || /\b6-month\s*free\b/i.test(text)) return 6;
  if (
    /\b3\s*months?\s*free\b/i.test(text) ||
    /\b3-month\s*free\b/i.test(text) ||
    /\bcomplimentary\s*3-month\b/i.test(text) ||
    /\b90\s*days?\s*free\b/i.test(text)
  ) return 3;
  if (/\b2\s*months?\s*free\b/i.test(text) || /\b2-month\s*free\b/i.test(text) || /\b60\s*days?\s*free\b/i.test(text)) return 2;
  if (/\b1\s*month\s*free\b/i.test(text) || /\b1-month\s*free\b/i.test(text)) return 1;

  return null;
}

/**
 * Checks if the offer is a promotional free trial (e.g. 7-day, 14-day, 15-day, 30-day).
 */
function isPromotionalTrial(offer: {
  title?: string | null;
  description?: string | null;
  offerSubtype?: string | null;
  category?: string | null;
  discount?: string | null;
}): boolean {
  // Exclude standard developer API onboarding registration allowances
  if (offer.category === 'api') {
    return false;
  }

  const text = `${offer.title || ''} ${offer.description || ''} ${offer.discount || ''}`.toLowerCase();

  return (
    offer.offerSubtype === 'FREE_TRIAL' ||
    text.includes('free trial') ||
    text.includes('trial access') ||
    /\b(?:7|14|15|30|60|90)-day free trial\b/i.test(text) ||
    /\b(?:7|14|15|30|60|90)\s*days?\s*free\s*trial\b/i.test(text) ||
    /\b(?:7|14|15|30)\s*days?\s*free\b/i.test(text) ||
    /\btry\s+.*\s+free\s+for\s+\d+\s+days\b/i.test(text)
  );
}

/**
 * Checks for explicit expiration language or active near-term deadline.
 */
function hasPromotionalExpiration(
  offer: {
    title?: string | null;
    description?: string | null;
    evidenceText?: string | null;
    expiresAt?: Date | string | null;
  },
  now: Date
): boolean {
  // If already expired in the past, it cannot be an active LIMITED_TIME alert
  if (offer.expiresAt) {
    const expTime = new Date(offer.expiresAt).getTime();
    if (!isNaN(expTime) && expTime <= now.getTime()) {
      return false;
    }
  }

  const text = `${offer.title || ''} ${offer.description || ''} ${offer.evidenceText || ''}`.toLowerCase();

  const hasExplicitEndingCopy =
    text.includes('offer ends') ||
    text.includes('promotion ends') ||
    text.includes('promo ends') ||
    text.includes('sale ends') ||
    text.includes('available until') ||
    text.includes('valid until') ||
    text.includes('ends soon') ||
    text.includes('promotion ends soon') ||
    text.includes('limited-time') ||
    text.includes('limited time') ||
    text.includes('flash sale') ||
    text.includes('spring sale') ||
    text.includes('summer sale') ||
    text.includes('black friday') ||
    text.includes('cyber monday') ||
    text.includes('holiday special');

  if (hasExplicitEndingCopy) {
    if (offer.expiresAt) {
      const expTime = new Date(offer.expiresAt).getTime();
      if (!isNaN(expTime)) {
        const msUntilExpiry = expTime - now.getTime();
        // Promotion ending > 14 days in future is not near-term urgent limited time
        if (msUntilExpiry > 14 * 24 * 60 * 60 * 1000) {
          return false;
        }
      }
    }
    return true;
  }

  // Active near-term expiration timestamp (<= 14 days)
  if (offer.expiresAt) {
    const expTime = new Date(offer.expiresAt).getTime();
    if (!isNaN(expTime)) {
      const msUntilExpiry = expTime - now.getTime();
      if (msUntilExpiry > 0 && msUntilExpiry <= 14 * 24 * 60 * 60 * 1000) {
        // Must have promotional context (avoid routine crawler TTL on standard subscriptions)
        const hasPromoContext =
          text.includes('promo') ||
          text.includes('sale') ||
          text.includes('deal') ||
          text.includes('special') ||
          text.includes('discount') ||
          text.includes('trial');
        if (hasPromoContext) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Detects ordinary annual billing savings (10%, 15%, 20%, 25%, 30% off).
 * These are normal billing optimizations, NOT price drops or alerts.
 */
function isOrdinaryAnnualBilling(offer: {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  annualSavingsPercent?: number | null;
  discount?: string | null;
  previousPrice?: number | null;
  currentPrice?: number | null;
}): boolean {
  // If there is an actual numerical historical price reduction, it is an actual price drop, not routine billing math
  if (
    typeof offer.previousPrice === 'number' &&
    typeof offer.currentPrice === 'number' &&
    !isNaN(offer.previousPrice) &&
    !isNaN(offer.currentPrice) &&
    offer.previousPrice > 0 &&
    offer.currentPrice > 0 &&
    offer.previousPrice > offer.currentPrice
  ) {
    return false;
  }

  const text = `${offer.title || ''} ${offer.description || ''} ${offer.discount || ''}`.toLowerCase();

  const isAnnual =
    offer.category === 'annual' ||
    text.includes('annual billing') ||
    text.includes('annual subscription') ||
    text.includes('billed annually') ||
    text.includes('pay yearly') ||
    text.includes('save annually') ||
    text.includes('annual savings');

  if (!isAnnual) return false;

  const pct = extractPromotionalDiscountPercent(offer);
  // Large annual savings (>= 50%) qualify as exceptional commercial price drops
  if (pct !== null && pct >= 50) {
    return false;
  }

  return true;
}

/**
 * Detects standard startup credits programs ($5k-$100k, $150k, $500k).
 * These are standard venture incubator grants, NOT intelligence events unless a platform-wide restructuring.
 */
function isStandardStartupProgram(offer: {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  offerSubtype?: string | null;
}): boolean {
  const text = `${offer.title || ''} ${offer.description || ''}`.toLowerCase();

  const isStartup =
    offer.category === 'startup' ||
    offer.offerSubtype === 'STARTUP_GRANT' ||
    text.includes('for startups') ||
    text.includes('founders hub') ||
    text.includes('startup credits') ||
    text.includes('startup program') ||
    text.includes('early-stage startups');

  return isStartup;
}

/**
 * Detects architectural developer API rates (prompt caching, message batches).
 * These are standard architectural developer features, NOT consumer intelligence events.
 */
function isOrdinaryApiRateDiscount(offer: {
  title?: string | null;
  description?: string | null;
  category?: string | null;
}): boolean {
  const text = `${offer.title || ''} ${offer.description || ''}`.toLowerCase();

  return (
    offer.category === 'api' &&
    (text.includes('prompt caching') ||
      text.includes('cache read') ||
      text.includes('cached prompt') ||
      text.includes('message batches') ||
      text.includes('developer registration'))
  );
}

/**
 * Detects verified major platform-wide pricing or policy restructuring events.
 */
function isMajorPlatformEvent(offer: {
  title?: string | null;
  description?: string | null;
  eventType?: string | null;
  evidenceType?: string | null;
  alertType?: string | null;
}): boolean {
  const text = `${offer.title || ''} ${offer.description || ''}`.toLowerCase();
  const hasEventSignal =
    offer.eventType === 'IMPORTANT' ||
    offer.evidenceType === 'IMPORTANT' ||
    offer.alertType === 'IMPORTANT';

  return (
    hasEventSignal &&
    (text.includes('restructuring') ||
      text.includes('rate adjustment') ||
      text.includes('pricing revision') ||
      text.includes('price revision') ||
      text.includes('policy change') ||
      text.includes('commercial restructuring') ||
      text.includes('pricing overhaul') ||
      text.includes('platform-wide'))
  );
}

/**
 * Detects direct commercial monetary savings (e.g. "$500 OFF", "$1,000 OFF", "Save $500").
 * Excludes startup venture incubator credit programs.
 */
function hasExtremelyLargeMonetarySavings(offer: {
  title?: string | null;
  description?: string | null;
  discount?: string | null;
  annualSavingsAmount?: number | null;
  category?: string | null;
}): boolean {
  if (offer.category === 'startup') return false;

  const text = `${offer.title || ''} ${offer.description || ''} ${offer.discount || ''}`.toLowerCase();
  return (
    text.includes('save $500') ||
    text.includes('$500 off') ||
    text.includes('$1,000 off') ||
    text.includes('$5,000 credit')
  );
}

/**
 * Internal conceptual intelligence scoring model.
 * Evaluates 6 core dimensions:
 * 1. Provider significance: 0-30
 * 2. Commercial magnitude: 0-30
 * 3. Promotional duration: 0-20
 * 4. User relevance: 0-15
 * 5. Verified evidence: 0-10
 * 6. Semantic significance: 0-15
 *
 * NOTE: Used strictly internally. NEVER exposed in public API or client payloads.
 */
export interface InternalIntelligenceSignals {
  providerSignificance: number;
  commercialMagnitude: number;
  promotionalDuration: number;
  userRelevance: number;
  verifiedEvidence: number;
  semanticSignificance: number;
  totalScore: number;
}

export function computeInternalIntelligenceSignals(
  offer: {
    title?: string;
    description?: string;
    discount?: string;
    category?: string;
    providerId?: string;
    providerName?: string;
    aiProvider?: string;
    canonicalProviderId?: string;
    previousPrice?: number | null;
    currentPrice?: number | null;
    evidenceText?: string | null;
    sourceStatus?: string;
    eventType?: string | null;
    expiresAt?: Date | string | null;
    annualSavingsPercent?: number | null;
    duration?: string | null;
    benefit?: string | null;
    offerSubtype?: string | null;
  },
  now: Date = new Date()
): InternalIntelligenceSignals {
  const isTier1 = isTier1AIProvider(offer);
  const isMajor = isMajorAIProvider(offer);
  const providerSignificance = isTier1 ? 30 : (isMajor ? 15 : 0);

  const isFree100 = isCompletelyFreePromotion(offer);
  const discountPct = extractPromotionalDiscountPercent(offer);
  const hasExtremelyLargeSavings = hasExtremelyLargeMonetarySavings(offer);
  const hasNumDrop =
    typeof offer.previousPrice === 'number' &&
    typeof offer.currentPrice === 'number' &&
    !isNaN(offer.previousPrice) &&
    !isNaN(offer.currentPrice) &&
    offer.previousPrice > 0 &&
    offer.currentPrice > 0 &&
    offer.previousPrice > offer.currentPrice;
  const hasCopyDrop = hasExplicitPriceDropCopy(
    `${offer.title || ''} ${offer.description || ''} ${offer.evidenceText || ''}`
  );

  let commercialMagnitude = 0;
  if (isFree100) {
    commercialMagnitude = 30;
  } else if (hasExtremelyLargeSavings || (discountPct !== null && discountPct >= 70)) {
    commercialMagnitude = 30;
  } else if (discountPct !== null && discountPct >= 50) {
    commercialMagnitude = 25;
  } else if (hasNumDrop) {
    commercialMagnitude = 25;
  } else if (hasCopyDrop) {
    commercialMagnitude = 20;
  }

  const durationMonths = extractPromotionalDurationMonths(offer);
  const isTrial = isPromotionalTrial(offer);
  const hasPromoExp = hasPromotionalExpiration(offer, now);

  let promotionalDuration = 0;
  if (durationMonths !== null && durationMonths >= 12) {
    promotionalDuration = 20;
  } else if (durationMonths !== null && durationMonths >= 3) {
    promotionalDuration = 18;
  } else if (isTrial) {
    promotionalDuration = 16;
  } else if (hasPromoExp) {
    promotionalDuration = 15;
  } else if (durationMonths !== null && durationMonths > 0) {
    promotionalDuration = 12;
  }

  // Broad prosumer/developer relevance
  const userRelevance = isTier1 ? 15 : (isMajor ? 12 : 10);

  let verifiedEvidence = 0;
  if (hasNumDrop) {
    verifiedEvidence = 10;
  } else if (offer.sourceStatus === 'VERIFIED') {
    verifiedEvidence = 5;
  }

  const isMajorEvent = isMajorPlatformEvent(offer);
  let semanticSignificance = 0;
  if (isMajorEvent) {
    semanticSignificance = 15;
  } else if (commercialMagnitude >= 20 || promotionalDuration >= 15) {
    semanticSignificance = 10;
  }

  const totalScore =
    providerSignificance +
    commercialMagnitude +
    promotionalDuration +
    userRelevance +
    verifiedEvidence +
    semanticSignificance;

  return {
    providerSignificance,
    commercialMagnitude,
    promotionalDuration,
    userRelevance,
    verifiedEvidence,
    semanticSignificance,
    totalScore,
  };
}

/**
 * Derives a specific alert classification type for an offer using the Hybrid Intelligence Engine.
 * Combines verified evidence, commercial magnitude, promotional duration, provider importance,
 * and semantic signals while keeping NORMAL OFFER as the strict default.
 *
 * Deterministic Priority:
 * 1. IMPORTANT (Strategically significant offers)
 * 2. PRICE_DROP (Unusually strong commercial discounts / price reductions)
 * 3. LIMITED_TIME (Time-bounded promotional access / trials)
 * 4. NORMAL (Default for ordinary discounts, startup credits, annual savings, API rates)
 */
export function deriveOfferAlertType(
  offer: {
    title?: string;
    description?: string;
    evidenceText?: string | null;
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
    providerId?: string;
    providerName?: string;
    aiProvider?: string;
    canonicalProviderId?: string;
    duration?: string | null;
    benefit?: string | null;
    value?: any;
    sourceStatus?: string;
  },
  now: Date = new Date()
): OfferAlertType | null {
  if (!offer) return null;

  // ══════════════════════════════════════════════════════════════
  // BASELINE DISQUALIFIERS — ORDINARY OFFERS MUST REMAIN NORMAL
  // ══════════════════════════════════════════════════════════════
  // 1. Standard incubator startup grants ($100k, $150k credits) are NOT alerts
  if (isStandardStartupProgram(offer) && !isMajorPlatformEvent(offer)) {
    return null;
  }

  // 2. Ordinary annual billing savings (10%, 15%, 20%, 25%, 30% off) are NOT alerts
  if (isOrdinaryAnnualBilling(offer)) {
    return null;
  }

  // 3. Developer architectural API rates (prompt caching, message batches) are NOT alerts
  if (isOrdinaryApiRateDiscount(offer)) {
    return null;
  }

  // 4. Partner statement credit bundles (e.g. $300 Amex ChatGPT credit) remain normal
  if (
    offer.category === 'partner' &&
    (offer.title || '').toLowerCase().includes('$300') &&
    (offer.title || '').toLowerCase().includes('statement credit')
  ) {
    return null;
  }

  // Extract core signals:
  const isTier1 = isTier1AIProvider(offer);
  const isMajor = isMajorAIProvider(offer);
  const isFree100 = isCompletelyFreePromotion(offer);
  const durationMonths = extractPromotionalDurationMonths(offer);
  const discountPct = extractPromotionalDiscountPercent(offer);
  const isTrial = isPromotionalTrial(offer);

  const hasNumericalPriceDrop =
    typeof offer.previousPrice === 'number' &&
    typeof offer.currentPrice === 'number' &&
    !isNaN(offer.previousPrice) &&
    !isNaN(offer.currentPrice) &&
    offer.previousPrice > 0 &&
    offer.currentPrice > 0 &&
    offer.previousPrice > offer.currentPrice;

  const hasPriceDropCopy = hasExplicitPriceDropCopy(
    `${offer.title || ''} ${offer.description || ''} ${offer.evidenceText || ''}`
  );

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 1: IMPORTANT (Strategically Significant Offers)
  // ══════════════════════════════════════════════════════════════
  // A) Major verified platform restructuring event
  if (isMajorPlatformEvent(offer)) {
    return 'IMPORTANT';
  }

  // B) Tier-1 AI Provider + 100% Free Program (e.g. ChatGPT for Teachers — 100% Free)
  if (isTier1 && isFree100) {
    return 'IMPORTANT';
  }

  // C) Tier-1 AI Provider + Long-duration Promotional Access (>= 12 months free)
  // (e.g. Gemini 16/18 Months Free, Perplexity 12 Months Free, Pixel 1 Year Google One AI Premium Free)
  if (isTier1 && durationMonths !== null && durationMonths >= 12) {
    return 'IMPORTANT';
  }

  // D) Tier-1 AI Provider + Exceptional Flagship Pro Discount (>= 50% Off, e.g. Claude Pro 50% Off)
  // Excludes API rate discounts, student discounts, and startup credits
  if (
    isTier1 &&
    discountPct !== null &&
    discountPct >= 50 &&
    offer.category !== 'api' &&
    offer.category !== 'student' &&
    offer.category !== 'startup'
  ) {
    return 'IMPORTANT';
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 2: PRICE_DROP (Unusually Strong Commercial Value)
  // ══════════════════════════════════════════════════════════════
  // A) Numerical historical price reduction (previousPrice > currentPrice > 0)
  if (hasNumericalPriceDrop) {
    return 'PRICE_DROP';
  }

  // B) Explicit verified provider price reduction statement
  if (hasPriceDropCopy) {
    return 'PRICE_DROP';
  }

  // C) Very large discount (>= 50% OFF, e.g. 50%, 60%, 70%, 90% OFF, Half price)
  if (discountPct !== null && discountPct >= 50) {
    return 'PRICE_DROP';
  }

  // D) Completely free / 100% free promotional value (non-major provider)
  if (isFree100) {
    return 'PRICE_DROP';
  }

  // E) Extremely large direct monetary savings ($500 OFF, $1,000 OFF, Save $500)
  if (hasExtremelyLargeMonetarySavings(offer)) {
    return 'PRICE_DROP';
  }

  // ══════════════════════════════════════════════════════════════
  // PRIORITY 3: LIMITED_TIME (Time-Bounded Promotional Access)
  // ══════════════════════════════════════════════════════════════
  // A) Promotional Free Trial (7-day, 14-day, 15-day, 30-day free trial)
  if (isTrial) {
    return 'LIMITED_TIME';
  }

  // B) Promotional duration access (3 months free, 6 months free, etc.)
  if (durationMonths !== null && durationMonths > 0) {
    return 'LIMITED_TIME';
  }

  // C) Explicit expiration language or active near-term deadline (<= 14 days)
  if (hasPromotionalExpiration(offer, now)) {
    return 'LIMITED_TIME';
  }

  // ══════════════════════════════════════════════════════════════
  // DEFAULT: NORMAL OFFER (null)
  // ══════════════════════════════════════════════════════════════
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

