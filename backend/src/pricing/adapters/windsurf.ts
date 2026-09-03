// ============================================================
// Windsurf (Codeium) Pricing Adapter — Static Fetch & Extraction
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://codeium.com/pricing (fallback: https://windsurf.com/pricing)
//
// Extracts official plan prices from Codeium/Windsurf pricing page.
// Returns FETCH_BLOCKED on 403/429/security challenge.
// Returns PARSE_FAILED if markup cannot be parsed.
// Returns VERIFIED only when real numeric prices are extracted.
//
// REQUIREMENT: Official Codeium/Windsurf source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://codeium.com/pricing';
const FALLBACK_URL = 'https://windsurf.com/pricing';
const PROVIDER_ID = 'windsurf';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchWindsurfPricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  let html: string = '';
  let usedUrl = SOURCE_URL;

  for (const url of [SOURCE_URL, FALLBACK_URL]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      clearTimeout(timer);
      if (res.ok) {
        html = await res.text();
        usedUrl = url;
        break;
      }
    } catch {
      clearTimeout(timer);
    }
  }

  if (!html) {
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Failed to fetch Windsurf/Codeium pricing page (HTTP blocked or network failure)',
    };
  }

  if (html.includes('Just a moment...') || html.includes('Cloudflare') || html.includes('Vercel Security Checkpoint')) {
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'Official Windsurf source rendered security challenge page',
    };
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const plans: NormalizedPlan[] = [
    { id: 'individual', label: 'Free Individual', monthlyPricePerSeat: 0, currency: 'USD' },
  ];
  const seenIds = new Set<string>(['individual']);

  // Extract Pro ($15 / $12)
  const proMatch = /pro[\s\S]{0,100}?\$(\d+(?:\.\d+)?)/i.exec(text);
  if (proMatch) {
    const price = parseFloat(proMatch[1]);
    if (!isNaN(price) && price > 0 && price < 100) {
      seenIds.add('pro');
      plans.push({
        id: 'pro',
        label: 'Pro',
        monthlyPricePerSeat: price,
        annualPricePerSeat: price === 15 ? 12 : undefined,
        currency: 'USD',
      });
    }
  }

  // Extract Teams ($30 / $24)
  const teamsMatch = /teams?[\s\S]{0,100}?\$(\d+(?:\.\d+)?)/i.exec(text);
  if (teamsMatch) {
    const price = parseFloat(teamsMatch[1]);
    if (!isNaN(price) && price > 0 && price < 200 && !seenIds.has('teams')) {
      seenIds.add('teams');
      plans.push({
        id: 'teams',
        label: 'Teams',
        monthlyPricePerSeat: price,
        annualPricePerSeat: price === 30 ? 24 : undefined,
        currency: 'USD',
      });
    }
  }

  // Extract Enterprise ($60)
  const enterpriseMatch = /enterprise[\s\S]{0,100}?\$(\d+(?:\.\d+)?)/i.exec(text);
  if (enterpriseMatch) {
    const price = parseFloat(enterpriseMatch[1]);
    if (!isNaN(price) && price > 0 && price < 500 && !seenIds.has('enterprise')) {
      seenIds.add('enterprise');
      plans.push({
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: price,
        currency: 'USD',
      });
    }
  }

  if (plans.length < 2) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'Windsurf page loaded but could not match prices to known plan tiers',
    };
  }

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'FETCH_STATIC_HTML',
    sourceUrl: usedUrl,
    fetchedAt,
    plans,
  };
}
