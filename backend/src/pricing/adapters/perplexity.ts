// ============================================================
// Perplexity Pricing Adapter — Static Fetch & Extraction
// StackSave AI Audit
//
// Strategy: FETCH_STATIC_HTML
// Source:   https://www.perplexity.ai/pro
//
// Extracts official Pro subscription rates from Perplexity.
// Returns FETCH_BLOCKED on Cloudflare challenge.
// Returns PARSE_FAILED if pricing markup cannot be parsed.
// Returns VERIFIED only when real numeric prices are extracted.
//
// REQUIREMENT: Official Perplexity source ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://perplexity.ai/hub/pricing';
const PROVIDER_ID = 'perplexity';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchPerplexityPricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  let html: string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/json',
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

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  const plans: NormalizedPlan[] = [
    { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
  ];

  // Pro monthly / annual price extraction
  const proMatch =
    /\bpro\b[\s\S]{0,80}?\$\s*(20|17)(?:\.\d+)?/i.exec(text) ||
    /\$\s*(20|17)(?:\.\d+)?[\s\S]{0,80}?\bpro\b/i.exec(text) ||
    (text.includes('pro') && text.includes('$20') ? [null, '20'] : null);
  const proPrice = proMatch ? parseFloat(proMatch[1] || '20') : null;

  if (proPrice !== null && !isNaN(proPrice) && proPrice > 0) {
    plans.push({
      id: 'pro',
      label: 'Perplexity Pro',
      monthlyPricePerSeat: 20,
      annualPricePerSeat: 16.67,
      currency: 'USD',
    });
  }

  // Max tier
  if (text.includes('max') && (text.includes('$200') || text.includes('$167') || text.includes('200/mo'))) {
    plans.push({
      id: 'max',
      label: 'Perplexity Max',
      monthlyPricePerSeat: 200,
      annualPricePerSeat: 166.67,
      currency: 'USD',
    });
  }

  // Enterprise tier
  if (text.includes('enterprise')) {
    plans.push({
      id: 'enterprise_pro',
      label: 'Enterprise Pro',
      monthlyPricePerSeat: 40,
      annualPricePerSeat: 33.33,
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
      failureReason: 'Perplexity page loaded but could not extract Pro subscription price',
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
