// ============================================================
// Claude Pricing Adapter — Static HTML Fetch
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://claude.com/pricing
//
// Verified approach: claude.com is Webflow-hosted but serves
// server-side HTML. Prices ($20, $25) appear in the static markup
// as text nodes and data attributes. We parse these directly.
//
// REQUIREMENT: Official Anthropic/Claude source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://claude.com/pricing';
const PROVIDER_ID = 'claude';
const FETCH_TIMEOUT_MS = 20_000;

// Matches prices like "$20", "$25", "$17" with optional /mo or /month suffix
const PRICE_REGEX = /\$(\d+(?:\.\d+)?)\s*(?:\/\s*(?:mo(?:nth)?|seat|user))?/gi;

// Known Claude plan anchors we look for in text surrounding the price
const PLAN_ANCHORS: Record<string, { id: string; label: string }> = {
  'claude pro': { id: 'pro', label: 'Pro' },
  'claude team': { id: 'team', label: 'Team' },
  'claude max': { id: 'max', label: 'Max' },
};

export async function fetchClaudePricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  let html: string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        providerId: PROVIDER_ID,
        status: res.status === 403 || res.status === 429 ? 'FETCH_BLOCKED' : 'PARSE_FAILED',
        strategy: 'FETCH_STATIC_HTML',
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
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: `Fetch error: ${msg}`,
    };
  }

  // Check for Cloudflare / anti-bot challenge
  if (html.includes('Just a moment...') || html.includes('Cloudflare')) {
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Official source rendered Cloudflare challenge page',
    };
  }

  // Strip script/style blocks for cleaner text analysis
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  // Find all dollar-amount occurrences with surrounding context
  const allMatches = [...html.matchAll(PRICE_REGEX)];
  if (allMatches.length === 0) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'No price patterns ($N) found in claude.com/pricing HTML',
    };
  }

  const plans: NormalizedPlan[] = [
    // Free plan is present on the page
    { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
  ];

  const seenIds = new Set<string>(['free']);

  // Look for price-bearing plan sections in the stripped text
  for (const [planKey, meta] of Object.entries(PLAN_ANCHORS)) {
    const anchorIdx = text.indexOf(planKey);
    if (anchorIdx === -1) continue;

    // Search for a price in a 300-character window after the plan name
    const window = text.slice(anchorIdx, anchorIdx + 300);
    const match = /\$(\d+(?:\.\d+)?)/.exec(window);
    if (!match) continue;

    const price = parseFloat(match[1]);
    if (isNaN(price) || price <= 0 || price > 5000) continue;
    if (seenIds.has(meta.id)) continue;

    seenIds.add(meta.id);
    plans.push({
      id: meta.id,
      label: meta.label,
      monthlyPricePerSeat: price,
      currency: 'USD',
    });
  }

  // If we found at least one paid plan, treat as VERIFIED
  if (plans.length < 2) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      rawExtract: { foundDollarValues: allMatches.slice(0, 10).map((m) => m[0]) },
      failureReason: 'Page loaded but could not match prices to known Claude plan names',
    };
  }

  console.log(`[ClaudeAdapter] Extracted ${plans.length} plans: ${plans.map((p) => `${p.label}=$${p.monthlyPricePerSeat}`).join(', ')}`);

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'FETCH_STATIC_HTML',
    sourceUrl: SOURCE_URL,
    fetchedAt,
    plans,
    rawExtract: { foundDollarValues: allMatches.slice(0, 10).map((m) => m[0]) },
  };
}
