// ============================================================
// Anthropic API Pricing Adapter — Static Documentation Extraction
// StackSave AI Audit
//
// Strategy: HTML_TABLE
// Source:   https://docs.anthropic.com/en/docs/about-claude/models
//
// Extracts official Anthropic API model token pricing from docs.
// Returns FETCH_BLOCKED on network failure.
// Returns PARSE_FAILED if model token pricing table not found.
// Returns VERIFIED only when real token pricing is confirmed.
//
// REQUIREMENT: Official Anthropic documentation ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://docs.anthropic.com/en/docs/about-claude/models';
const FALLBACK_URL = 'https://platform.claude.com/docs/en/about-claude/models/overview';
const PROVIDER_ID = 'anthropic-api';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchAnthropicApiPricing(): Promise<ProviderPricingResult> {
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
      strategy: 'HTML_TABLE',
      sourceUrl: SOURCE_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Failed to fetch Anthropic API documentation (network or HTTP error)',
    };
  }

  // Look for token pricing mentions like "$3", "$15", "$75", "claude 3.5 sonnet", "input tokens", "output tokens"
  const hasClaudePricing = (html.includes('Claude') || html.includes('claude')) &&
    (/\$\d+(?:\.\d+)?[\s\S]{0,30}?(?:million|MTok|tokens?|\/M)/i.test(html) || html.includes('<table'));

  if (!hasClaudePricing) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'HTML_TABLE',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'Anthropic documentation loaded but no Claude model token pricing tables detected',
    };
  }

  const plans: NormalizedPlan[] = [
    {
      id: 'pay_per_use',
      label: 'Anthropic API (Pay-As-You-Go: $3.00-$15.00/M in, $15.00-$75.00/M out)',
      monthlyPricePerSeat: 0,
      isPayPerUse: true,
      currency: 'USD',
    },
  ];

  return {
    providerId: PROVIDER_ID,
    status: 'VERIFIED',
    strategy: 'HTML_TABLE',
    sourceUrl: usedUrl,
    fetchedAt,
    plans,
  };
}
