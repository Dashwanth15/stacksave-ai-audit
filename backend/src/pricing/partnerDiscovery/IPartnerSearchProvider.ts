// ============================================================
// IPartnerSearchProvider — StackSave AI Spend & Intelligence
//
// Extensibility stub for open-web partner company discovery.
//
// PURPOSE:
//   Discovering NEW partner companies (telecoms, banks, device OEMs,
//   retailers) that are not yet in partnerSourceRegistry.ts requires
//   an external search API. Playwright alone cannot crawl the internet
//   to find undisclosed AI partnerships.
//
// CURRENT STATE:
//   NullPartnerSearchProvider is the active implementation.
//   It returns zero candidates and logs a clear explanation.
//
// TO ENABLE REAL DISCOVERY:
//   1. Obtain API key for Brave Search / SerpAPI / Google Custom Search
//   2. Set PARTNER_SEARCH_PROVIDER=brave|serp|google in .env
//   3. Implement a concrete class satisfying IPartnerSearchProvider
//   4. Replace NullPartnerSearchProvider in PartnerDiscoveryService
//
// PartnerBundleValidator (in partnerOfferScanner.ts) still applies:
//   Every candidate from search must pass Playwright live verification
//   before it is persisted as a PARTNER_BUNDLE offer.
// ============================================================

import type { PartnerCategory } from '../partnerSourceRegistry';

/**
 * A candidate partner company returned by an external search provider.
 * All fields are raw search output — not yet validated as a real offer.
 */
export interface PartnerSearchCandidate {
  /** Raw partner company name from search result */
  partnerName: string;
  /** Official company homepage URL (from search result) */
  officialUrl: string;
  /** Inferred partner category */
  partnerCategory: PartnerCategory;
  /** Snippet from search result suggesting an AI partnership */
  evidenceSnippet: string;
  /** The search result URL (may differ from officialUrl) */
  searchResultUrl: string;
  /** Which AI provider this search was targeting */
  aiProviderSearched: string;
  /** Confidence level of the search result */
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Contract for open-web partner discovery search providers.
 *
 * Implement this interface to enable automatic discovery of new
 * partner companies beyond the 30+ statically registered partners.
 */
export interface IPartnerSearchProvider {
  /** Human-readable name of this provider (e.g. 'BraveSearch', 'SerpAPI') */
  readonly providerName: string;

  /**
   * Returns true if this provider is properly configured and can execute searches.
   * Returns false for NullPartnerSearchProvider.
   */
  isAvailable(): boolean;

  /**
   * Searches for companies that may be offering the given AI provider
   * as a commercial partner benefit.
   *
   * @param aiProviderName - Display name of the AI provider (e.g. 'Gemini', 'Perplexity')
   * @returns Candidate partner companies to validate via Playwright
   */
  searchForNewPartners(aiProviderName: string): Promise<PartnerSearchCandidate[]>;
}

// ── Null Implementation (Active by default) ────────────────────

/**
 * NullPartnerSearchProvider — Active when no search API is configured.
 *
 * Returns zero candidates. Logs a clear message explaining the limitation
 * without throwing or silently failing.
 *
 * Replace this with a concrete implementation (BraveSearchProvider,
 * SerpApiProvider, etc.) when an API key is available.
 */
export class NullPartnerSearchProvider implements IPartnerSearchProvider {
  readonly providerName = 'NONE';

  isAvailable(): boolean {
    return false;
  }

  async searchForNewPartners(aiProviderName: string): Promise<PartnerSearchCandidate[]> {
    console.log(
      `[PartnerSearch] Open-web partner discovery SKIPPED for "${aiProviderName}": ` +
      `No IPartnerSearchProvider configured. ` +
      `To enable, set PARTNER_SEARCH_PROVIDER=brave|serp|google and provide the API key. ` +
      `Layer 1 registered partners (partnerSourceRegistry.ts) are still scanned via Playwright.`
    );
    return [];
  }
}

// ── Active Provider Factory ────────────────────────────────────

/**
 * Returns the currently configured partner search provider.
 * Reads PARTNER_SEARCH_PROVIDER from environment to select implementation.
 * Falls back to NullPartnerSearchProvider if not configured.
 */
export function getActivePartnerSearchProvider(): IPartnerSearchProvider {
  const configured = process.env.PARTNER_SEARCH_PROVIDER?.toLowerCase().trim();

  if (!configured || configured === 'none' || configured === '') {
    return new NullPartnerSearchProvider();
  }

  // Future: switch (configured) { case 'brave': return new BraveSearchProvider(); }
  console.warn(
    `[PartnerSearch] PARTNER_SEARCH_PROVIDER="${configured}" is set but no implementation exists. ` +
    `Falling back to NullPartnerSearchProvider.`
  );
  return new NullPartnerSearchProvider();
}
