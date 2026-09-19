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

/**
 * Single source of truth for Offers access control.
 * Easily update PREMIUM_PROVIDER_ACCESS or PREMIUM_OFFER_CATEGORIES
 * to designate platforms or categories as Premium-only without touching application code.
 */
export const OFFERS_ACCESS_CONFIG: OffersAccessConfig = {
  PREMIUM_OFFERS_ENABLED: true,
  // Preserves existing Free-accessible offers without artificial truncation
  FREE_VISIBLE_OFFER_LIMIT: null,
  PREMIUM_OFFER_PREVIEW_COUNT: 3,
  // Ready for future platform designations:
  PREMIUM_OFFER_CATEGORIES: [],
  PREMIUM_PROVIDER_ACCESS: [],
};
