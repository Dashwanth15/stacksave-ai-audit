// ============================================================
// Google Gemini Pricing Adapter — Static Fetch & Extraction
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://one.google.com/about/google-ai-plans/
//
// Parses official pricing for Google AI / Gemini Advanced plans.
// Returns FETCH_BLOCKED on network error or bot challenge.
// Returns PARSE_FAILED if pricing not detected in markup.
// Returns VERIFIED only when real numeric prices are extracted.
//
// REQUIREMENT: Official Google One source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://one.google.com/about/google-ai-plans/';
const FALLBACK_URL = 'https://one.google.com/about/ai-premium';
const PROVIDER_ID = 'gemini';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchGeminiPricing(): Promise<ProviderPricingResult> {
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
      failureReason: 'Failed to fetch Google AI pricing page from official sources',
    };
  }

  // Search for prices like $19.99, $20, $39.99 in markup
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

  // Check for AI Premium / AI Pro plan
  const premiumMatches = [...text.matchAll(/(?:ai\s+premium|google\s+ai|ai\s+pro)[\s\S]{0,100}?\$(\d+(?:\.\d+)?)/gi)];
  if (premiumMatches.length > 0) {
    const price = parseFloat(premiumMatches[0][1]);
    if (!isNaN(price) && price > 0 && price < 100) {
      seenIds.add('ai-premium');
      plans.push({
        id: 'ai-premium',
        label: 'Google AI Premium',
        monthlyPricePerSeat: price,
        currency: 'USD',
      });
    }
  } else {
    // Fallback search for standard $19.99 price pattern on Google One page
    const genericMatch = /\$19\.99/.exec(text);
    if (genericMatch) {
      seenIds.add('ai-premium');
      plans.push({
        id: 'ai-premium',
        label: 'Google AI Premium',
        monthlyPricePerSeat: 19.99,
        currency: 'USD',
      });
    }
  }

  // Check for AI Ultra if mentioned
  const ultraMatches = [...text.matchAll(/(?:ai\s+ultra|ultra)[\s\S]{0,100}?\$(\d+(?:\.\d+)?)/gi)];
  if (ultraMatches.length > 0) {
    const price = parseFloat(ultraMatches[0][1]);
    if (!isNaN(price) && price > 0 && price < 200 && !seenIds.has('ai-ultra')) {
      seenIds.add('ai-ultra');
      plans.push({
        id: 'ai-ultra',
        label: 'Google AI Ultra',
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
      failureReason: 'Google AI page loaded but could not extract valid subscription price',
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
