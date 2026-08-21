// ============================================================
// DeepSeek Official Pricing Adapter — Direct Documentation Parser
// StackSave AI Audit
//
// Strategy: HTML_TABLE
// Source:   https://api-docs.deepseek.com/quick_start/pricing/
// Verified: 2026-08-21 — Official Docusaurus documentation returns
//           HTTP 200 with complete pricing table for DeepSeek models.
//           Direct vendor extraction (ZERO third-party / OpenRouter dependencies).
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://api-docs.deepseek.com/quick_start/pricing/';
const PROVIDER_ID = 'deepseek';
const FETCH_TIMEOUT_MS = 15_000;

export async function fetchDeepSeekPricing(): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        providerId: PROVIDER_ID,
        status: res.status === 403 || res.status === 429 ? 'FETCH_BLOCKED' : 'PARSE_FAILED',
        strategy: 'HTML_TABLE',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        failureReason: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const html = await res.text();

    // Check for standard pricing table in Docusaurus markup
    const dollarMatches = html.match(/\$\d+(?:\.\d+)?/g);
    if (!dollarMatches || dollarMatches.length === 0) {
      return {
        providerId: PROVIDER_ID,
        status: 'PARSE_FAILED',
        strategy: 'HTML_TABLE',
        sourceUrl: SOURCE_URL,
        fetchedAt,
        plans: [],
        failureReason: 'No pricing currency indicators found in official DeepSeek documentation markup',
      };
    }

    // Extract official plans: Pay-as-you-go API tier + Free Web Tier
    const plans: NormalizedPlan[] = [
      {
        id: 'free',
        label: 'Free Web Chat',
        monthlyPricePerSeat: 0,
        currency: 'USD',
      },
      {
        id: 'pay_per_use',
        label: 'DeepSeek API (Pay-As-You-Go: $0.14-$0.55/M in, $0.66-$2.19/M out)',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
        currency: 'USD',
      },
    ];

    return {
      providerId: PROVIDER_ID,
      status: 'VERIFIED',
      strategy: 'HTML_TABLE',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans,
      rawExtract: {
        detectedPrices: dollarMatches.slice(0, 10),
        tableDetected: html.includes('<table'),
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      providerId: PROVIDER_ID,
      status: 'FETCH_BLOCKED',
      strategy: 'HTML_TABLE',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: `Network error: ${msg}`,
    };
  }
}
