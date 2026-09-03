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

const SOURCE_URL = 'https://www.perplexity.ai/pro';
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
    { id: 'standard', label: 'Standard Free', monthlyPricePerSeat: 0, currency: 'USD' },
  ];

  // Live Pro monthly price regex — ZERO hardcoded fallbacks
  const proMatch = /\bpro\b[\s\S]{0,60}?\$(\d+(?:\.\d+)?)/i.exec(text);
  const proPrice = proMatch ? parseFloat(proMatch[1]) : null;

  // Live Pro annual price / effective monthly price regex
  const annualTotalMatch = /(?:billed annually|annual|year)[\s\S]{0,80}?\$(\d+(?:\.\d+)?)\s*(?:\/\s*year|\/yr|per year)/i.exec(text) ||
    /\$(\d+(?:\.\d+)?)\s*(?:\/\s*year|\/yr|per year)[\s\S]{0,60}?(?:annual|billed)/i.exec(text);
  const annualMonthlyMatch = /(?:billed annually|annual|year)[\s\S]{0,80}?\$(\d+(?:\.\d+)?)\s*(?:\/\s*mo|\/month|per month)/i.exec(text);

  let annualEffectiveMonthly: number | undefined = undefined;
  if (annualMonthlyMatch) {
    annualEffectiveMonthly = parseFloat(annualMonthlyMatch[1]);
  } else if (annualTotalMatch) {
    const annualTotal = parseFloat(annualTotalMatch[1]);
    if (!isNaN(annualTotal) && annualTotal > 0) {
      annualEffectiveMonthly = Math.round((annualTotal / 12) * 100) / 100;
    }
  }

  if (proPrice !== null && !isNaN(proPrice) && proPrice > 0 && proPrice < 100) {
    plans.push({
      id: 'pro',
      label: 'Perplexity Pro',
      monthlyPricePerSeat: proPrice,
      annualPricePerSeat: annualEffectiveMonthly,
      currency: 'USD',
    });
  }

  // Look for Enterprise
  const entMatch = /\benterprise\b[\s\S]{0,80}?\$(\d+(?:\.\d+)?)/i.exec(text);
  if (entMatch) {
    const price = parseFloat(entMatch[1]);
    if (!isNaN(price) && price > 0 && price < 500) {
      plans.push({
        id: 'enterprise',
        label: 'Enterprise Pro',
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
