// ============================================================
// ChatGPT Pricing Adapter — Static Fetch & Extraction
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://openai.com/chatgpt/pricing
//
// Parses official pricing from OpenAI's ChatGPT pricing page.
// Returns FETCH_BLOCKED if Cloudflare challenge is encountered.
// Returns PARSE_FAILED if markup cannot be parsed.
// Returns VERIFIED only when real numeric prices are extracted.
//
// REQUIREMENT: Official OpenAI source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://openai.com/chatgpt/pricing';
const PROVIDER_ID = 'chatgpt';
const FETCH_TIMEOUT_MS = 20_000;

const PLAN_TARGETS: { name: string; id: string; label: string; minSeats?: number }[] = [
  { name: 'plus', id: 'plus', label: 'Plus' },
  { name: 'pro', id: 'pro', label: 'Pro' },
  { name: 'team', id: 'team', label: 'Team', minSeats: 2 },
  { name: 'business', id: 'business', label: 'Business' },
  { name: 'enterprise', id: 'enterprise', label: 'Enterprise' },
];

export async function fetchChatGPTPricing(): Promise<ProviderPricingResult> {
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
  if (html.includes('Just a moment...') || html.includes('Cloudflare') || html.includes('challenge-platform')) {
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

  // 1. Try to find JSON-LD blocks
  const scriptRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const jsonLdPlans: NormalizedPlan[] = [];

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item?.offers && Array.isArray(item.offers)) {
          for (const off of item.offers) {
            const price = parseFloat(off.price ?? off.lowPrice);
            if (!isNaN(price) && off.name) {
              jsonLdPlans.push({
                id: String(off.name).toLowerCase().replace(/\s+/g, '-'),
                label: String(off.name),
                monthlyPricePerSeat: price,
                currency: off.priceCurrency || 'USD',
              });
            }
          }
        }
      }
    } catch {
      // ignore JSON parse errors in script tags
    }
  }

  if (jsonLdPlans.length > 0) {
    return {
      providerId: PROVIDER_ID,
      status: 'VERIFIED',
      strategy: 'JSON_LD',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: jsonLdPlans,
    };
  }

  // 2. Parse HTML text for plan price associations
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const plans: NormalizedPlan[] = [
    { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
  ];
  const seenIds = new Set<string>(['free']);

  for (const target of PLAN_TARGETS) {
    const idx = text.indexOf(target.name);
    if (idx === -1) continue;

    const window = text.slice(idx, idx + 250);
    const priceMatch = /\$(\d+(?:\.\d+)?)/.exec(window);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0 || price > 5000) continue;
    if (seenIds.has(target.id)) continue;

    seenIds.add(target.id);
    plans.push({
      id: target.id,
      label: target.label,
      monthlyPricePerSeat: price,
      minSeats: target.minSeats,
      currency: 'USD',
    });
  }

  if (plans.length < 2) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Could not extract paid plan prices from ChatGPT pricing page markup',
    };
  }

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'FETCH_STATIC_HTML',
    sourceUrl: SOURCE_URL,
    fetchedAt,
    plans,
  };
}
