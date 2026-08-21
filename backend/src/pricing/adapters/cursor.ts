// ============================================================
// Cursor Pricing Adapter — JSON-LD Extraction
// StackSave AI Audit
//
// Strategy: application/ld+json structured data
// Source:   https://cursor.com/pricing
// Verified: 2026-08-20 — page returns static HTML with
//           SoftwareApplication schema containing Offer[] prices.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://cursor.com/pricing';
const PROVIDER_ID = 'cursor';
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Attempt to extract a numeric USD price from a price specification node.
 * Handles both `{"@type":"PriceSpecification","price":"20","priceCurrency":"USD"}`
 * and flat `"price": "20"` fields.
 */
function extractPrice(node: Record<string, unknown>): number | null {
  const raw = node['price'] ?? node['lowPrice'];
  if (raw === undefined || raw === null) return null;
  const n = parseFloat(String(raw));
  return isNaN(n) ? null : n;
}

/**
 * Resolve an Offer or AggregateOffer node into a NormalizedPlan.
 * Returns null if the price cannot be determined.
 */
function offerToNormalizedPlan(
  offer: Record<string, unknown>,
  fallbackLabel: string
): NormalizedPlan | null {
  const price = extractPrice(offer);
  if (price === null) return null;

  // Try to find the plan name from the offer or its eligible product
  const rawName =
    (offer['name'] as string) ||
    ((offer['eligibleCustomerType'] as string) ?? fallbackLabel);

  const planId = rawName.toLowerCase().replace(/\s+/g, '-');

  const result: NormalizedPlan = {
    id: planId,
    label: rawName,
    monthlyPricePerSeat: price,
    currency: (offer['priceCurrency'] as string) || 'USD',
  };

  // Check for annual price on a nested priceSpecification array
  const priceSpecs = offer['priceSpecification'];
  if (Array.isArray(priceSpecs)) {
    for (const spec of priceSpecs as Record<string, unknown>[]) {
      const billingPeriod = spec['billingDuration'] || spec['name'] || '';
      if (/annual|year/i.test(String(billingPeriod))) {
        const annualMonthly = extractPrice(spec);
        if (annualMonthly !== null) {
          result.annualPricePerSeat = annualMonthly;
        }
      }
    }
  }

  return result;
}

/**
 * Walk a ld+json graph and collect all Offer / AggregateOffer nodes.
 */
function collectOffers(graph: unknown[]): Record<string, unknown>[] {
  const collected: Record<string, unknown>[] = [];
  for (const node of graph) {
    if (typeof node !== 'object' || !node) continue;
    const n = node as Record<string, unknown>;
    const type = n['@type'];
    if (type === 'Offer' || type === 'AggregateOffer') {
      collected.push(n);
    }
    // Recurse into offers arrays
    if (Array.isArray(n['offers'])) {
      for (const offer of n['offers'] as unknown[]) {
        if (typeof offer === 'object' && offer) {
          collected.push(offer as Record<string, unknown>);
        }
      }
    }
  }
  return collected;
}

export async function fetchCursorPricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let html: string;
    try {
      const res = await fetch(SOURCE_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StackSave-PriceBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      clearTimeout(timer);

      if (!res.ok) {
        return {
          providerId: PROVIDER_ID,
          status: 'FETCH_BLOCKED',
          strategy: 'JSON_LD',
          sourceUrl: SOURCE_URL,
          fetchedAt,
          plans: [],
          failureReason: `HTTP ${res.status} ${res.statusText}`,
        };
      }
      html = await res.text();
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      return {
        providerId: PROVIDER_ID,
        status: 'FETCH_BLOCKED',
        strategy: 'JSON_LD',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        failureReason: `Fetch error: ${msg}`,
      };
    }

    // ── Extract all <script type="application/ld+json"> blocks ──
    const ldJsonBlocks: unknown[] = [];
    const scriptRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    while ((match = scriptRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) ldJsonBlocks.push(...parsed);
        else ldJsonBlocks.push(parsed);
      } catch {
        // Malformed block — skip
      }
    }

    if (ldJsonBlocks.length === 0) {
      return {
        providerId: PROVIDER_ID,
        status: 'PARSE_FAILED',
        strategy: 'JSON_LD',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        failureReason: 'No application/ld+json blocks found in page HTML',
      };
    }

    const offers = collectOffers(ldJsonBlocks);

    if (offers.length === 0) {
      return {
        providerId: PROVIDER_ID,
        status: 'PARSE_FAILED',
        strategy: 'JSON_LD',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        rawExtract: ldJsonBlocks,
        failureReason: 'JSON-LD blocks present but no Offer or AggregateOffer nodes found',
      };
    }

    const plans: NormalizedPlan[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < offers.length; i++) {
      const plan = offerToNormalizedPlan(offers[i], `plan-${i}`);
      if (plan && !seenIds.has(plan.id)) {
        seenIds.add(plan.id);
        plans.push(plan);
      }
    }

    if (plans.length === 0) {
      return {
        providerId: PROVIDER_ID,
        status: 'PARSE_FAILED',
        strategy: 'JSON_LD',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        rawExtract: offers,
        failureReason: 'Offer nodes found but no numeric prices could be extracted',
      };
    }

    return {
      providerId: PROVIDER_ID,
      status: 'VERIFIED',
      strategy: 'JSON_LD',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans,
      rawExtract: offers,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'JSON_LD',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: `Unexpected error: ${msg}`,
    };
  }
}
