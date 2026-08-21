// ============================================================
// GitHub Copilot Pricing Adapter — Next.js embeddedData Extraction
// StackSave AI Audit
//
// Strategy: Next.js / Contentful embeddedData
// Source:   https://github.com/features/copilot/plans
// Verified: 2026-08-20 — Page is GitHub SSR with a
//   <script type="application/json" data-target="react-app.embeddedData">
//   tag containing the full Contentful CMS JSON including plan names and
//   prices as strings like "$19 per user / month" inside rich-text nodes.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://github.com/features/copilot/plans';
const PROVIDER_ID = 'github-copilot';
const FETCH_TIMEOUT_MS = 20_000;

interface ContentfulTextNode {
  value?: string;
  nodeType?: string;
  marks?: { type: string }[];
  content?: ContentfulTextNode[];
}

/**
 * Recursively collect all text values from a Contentful rich-text document.
 */
function extractTextFromContentful(node: ContentfulTextNode): string[] {
  const texts: string[] = [];
  if (node.value && typeof node.value === 'string' && node.value.trim()) {
    texts.push(node.value.trim());
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      texts.push(...extractTextFromContentful(child));
    }
  }
  return texts;
}

/**
 * Known GitHub Copilot plan price patterns (as of 2026-08-20).
 * Extracted from Contentful CMS content in the embeddedData payload.
 * Plans have entries like: "$19 per user / month"
 */
const PRICE_PATTERN = /\$(\d+(?:\.\d+)?)\s*(?:per\s+user\s*[\/\s]*month|\/\s*mo|per\s+month)/i;

/**
 * Map from Contentful heading field to plan IDs we use in the catalog.
 */
const PLAN_HEADING_MAP: Record<string, { id: string; label: string }> = {
  Free:       { id: 'free', label: 'Free' },
  Pro:        { id: 'individual', label: 'Individual' },   // Copilot Pro = our "Individual"
  'Pro+':     { id: 'pro-plus', label: 'Pro+' },
  Max:        { id: 'max', label: 'Max' },
  Business:   { id: 'business', label: 'Business' },
  Enterprise: { id: 'enterprise', label: 'Enterprise' },
};

/**
 * Parse the Contentful CMS entries from the embeddedData payload.
 * We look for `genericContent` entries whose `subheading` contains "$X per user / month".
 */
function parsePlansFromContentfulEntries(entries: Record<string, unknown>[]): NormalizedPlan[] {
  const plans: NormalizedPlan[] = [];
  const seenIds = new Set<string>();

  for (const entry of entries) {
    const fields = entry['fields'] as Record<string, unknown> | undefined;
    if (!fields) continue;

    // Look for heading field that matches a known plan name
    const heading = fields['heading'];
    if (typeof heading !== 'string') continue;

    const planMeta = PLAN_HEADING_MAP[heading];
    if (!planMeta || seenIds.has(planMeta.id)) continue;

    // Extract price from subheading rich-text
    const subheading = fields['subheading'] as ContentfulTextNode | undefined;
    if (!subheading) {
      // Free plan has no subheading price
      if (planMeta.id === 'free') {
        seenIds.add(planMeta.id);
        plans.push({
          id: 'free',
          label: 'Free',
          monthlyPricePerSeat: 0,
          currency: 'USD',
        });
      }
      continue;
    }

    const texts = extractTextFromContentful(subheading);
    const combined = texts.join(' ');
    const priceMatch = PRICE_PATTERN.exec(combined);

    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    seenIds.add(planMeta.id);
    plans.push({
      id: planMeta.id,
      label: planMeta.label,
      monthlyPricePerSeat: price,
      currency: 'USD',
    });
  }

  return plans;
}

export async function fetchGithubCopilotPricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  let html: string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
        strategy: 'NEXTJS_EMBEDDED',
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
      strategy: 'NEXTJS_EMBEDDED',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: `Fetch error: ${msg}`,
    };
  }

  // ── Extract <script type="application/json" data-target="react-app.embeddedData"> ──
  const embeddedDataRegex = /<script\s+type="application\/json"\s+data-target="react-app\.embeddedData"[^>]*>([\s\S]*?)<\/script>/i;
  const embeddedMatch = embeddedDataRegex.exec(html);

  if (!embeddedMatch) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'NEXTJS_EMBEDDED',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'react-app.embeddedData script tag not found in page HTML',
    };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(embeddedMatch[1]) as Record<string, unknown>;
  } catch {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'NEXTJS_EMBEDDED',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Failed to JSON.parse embeddedData content',
    };
  }

  // ── Navigate to the Contentful entries array ──
  // Path: payload.payload.contentfulRawJsonResponse.includes.Entry[]
  const contentfulResponse = (payload as any)?.payload?.contentfulRawJsonResponse;
  const entries: Record<string, unknown>[] =
    contentfulResponse?.includes?.Entry ?? contentfulResponse?.items ?? [];

  if (entries.length === 0) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'NEXTJS_EMBEDDED',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Contentful entries array empty or not found in embeddedData payload',
    };
  }

  const plans = parsePlansFromContentfulEntries(entries);

  if (plans.length === 0) {
    // Fallback: direct regex search for "$X per user / month" strings anywhere in payload
    const payloadStr = JSON.stringify(payload);
    const fallbackMatches = [...payloadStr.matchAll(/"\$(\d+)\s+per\s+user\s*\/\s*month"/gi)];
    if (fallbackMatches.length > 0) {
      // Could not parse structured; return PARSE_FAILED with the raw extract
      return {
        providerId: PROVIDER_ID,
        status: 'PARSE_FAILED',
        strategy: 'NEXTJS_EMBEDDED',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        rawExtract: fallbackMatches.map((m) => m[0]),
        failureReason: 'Price strings found in payload but could not be mapped to plan names',
      };
    }

    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'NEXTJS_EMBEDDED',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'No plan pricing found in Contentful entries',
    };
  }

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'NEXTJS_EMBEDDED',
    sourceUrl: SOURCE_URL,
    fetchedAt,
    plans,
  };
}
