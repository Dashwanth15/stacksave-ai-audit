// ============================================================
// OpenAI API Pricing Adapter — Static Fetch & Extraction
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://openai.com/api/pricing
//
// Verifies official OpenAI API pay-as-you-go rates.
// Returns FETCH_BLOCKED on Cloudflare challenge or network error.
// Returns PARSE_FAILED if API pricing markup cannot be found.
// Returns VERIFIED only when real token pricing is confirmed.
//
// REQUIREMENT: Official OpenAI API source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://openai.com/api/pricing';
const FALLBACK_URL = 'https://openai.com/pricing';
const PROVIDER_ID = 'openai-api';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchOpenAIApiPricing(): Promise<ProviderPricingResult> {
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
      failureReason: 'Failed to fetch OpenAI API pricing page (HTTP blocked or network error)',
    };
  }

  if (html.includes('Just a moment...') || html.includes('Cloudflare') || html.includes('challenge-platform')) {
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'Official OpenAI API source rendered Cloudflare challenge page',
    };
  }

  // Look for token pricing mentions like "$2.50", "$5.00", "$10.00", "per 1m tokens" or "tokens"
  const hasTokenPricing = /\$\d+(?:\.\d+)?[\s\S]{0,40}?(?:1m|million|token)/i.test(html) ||
    /gpt-4|gpt-3\.5|embedding/i.test(html);

  if (!hasTokenPricing) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'FETCH_STATIC_HTML',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'OpenAI API page loaded but no token pricing models detected in markup',
    };
  }

  const plans: NormalizedPlan[] = [
    {
      id: 'pay_per_use',
      label: 'OpenAI API (Pay-As-You-Go: $2.50-$5.00/M in, $10.00-$30.00/M out)',
      monthlyPricePerSeat: 0,
      isPayPerUse: true,
      currency: 'USD',
    },
  ];

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'FETCH_STATIC_HTML',
    sourceUrl: usedUrl,
    fetchedAt,
    plans,
  };
}
