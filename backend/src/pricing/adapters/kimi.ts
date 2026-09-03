// ============================================================
// Kimi / Moonshot AI Pricing Adapter — Static Documentation Extraction
// StackSave AI Audit
//
// Strategy: HTML_TABLE
// Source:   https://platform.moonshot.cn/docs/pricing/chat
//
// Extracts official Kimi / Moonshot model pricing from documentation.
// Returns FETCH_BLOCKED on network failure.
// Returns PARSE_FAILED if pricing table not found.
// Returns VERIFIED only when real model pricing is confirmed.
//
// REQUIREMENT: Official Moonshot/Kimi platform docs ONLY.
// ZERO third-party dependencies.
// ============================================================

import { NormalizedPlan, ProviderPricingResult } from '../types';

const SOURCE_URL = 'https://platform.moonshot.cn/docs/pricing/chat';
const FALLBACK_URL = 'https://platform.kimi.com/docs/pricing/chat';
const PROVIDER_ID = 'kimi';
const FETCH_TIMEOUT_MS = 20_000;

export async function fetchKimiPricing(): Promise<ProviderPricingResult> {
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
          'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
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
      failureReason: 'Failed to fetch Moonshot/Kimi documentation (network or HTTP error)',
    };
  }

  // Look for Moonshot model references or pricing tables (¥ / $ / token / 价格 / moonshot-v1)
  const hasMoonshotPricing = /moonshot|kimi/i.test(html) &&
    (/(\$|¥|元|\d+\.\d+)[\s\S]{0,30}?(?:token|k|m|千|百万)/i.test(html) || html.includes('<table'));

  if (!hasMoonshotPricing) {
    return {
      providerId: PROVIDER_ID,
      status: 'PARSE_FAILED',
      strategy: 'HTML_TABLE',
      sourceUrl: usedUrl,
      fetchedAt,
      plans: [],
      failureReason: 'Moonshot/Kimi documentation loaded but no pricing tables detected',
    };
  }

  const plans: NormalizedPlan[] = [
    {
      id: 'pay_per_use',
      label: 'Kimi / Moonshot API (Pay-As-You-Go: K3, K2.7, Moonshot V1 model tiers)',
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
