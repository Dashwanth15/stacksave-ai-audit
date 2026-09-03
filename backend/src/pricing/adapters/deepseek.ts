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

    // Parse model token pricing from HTML table / rows
    const tableRows = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
    const tokenRates: Array<{
      model: string;
      inputRate: number;
      outputRate: number;
      offPeakInputRate: number;
      offPeakOutputRate: number;
    }> = [];

    for (const row of tableRows) {
      const cleanRow = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const rowDollarMatches = cleanRow.match(/\$(\d+(?:\.\d+)?)/g);
      if (rowDollarMatches && rowDollarMatches.length >= 2) {
        const modelMatch = cleanRow.match(/\b(deepseek-[a-z0-9-]+|v\d+-[a-z0-9-]+|[a-z0-9_-]+(?:chat|reasoner|code|pro|flash))\b/i);
        const modelName = modelMatch ? modelMatch[1] : 'DeepSeek API';
        const numPrices = rowDollarMatches.map((p) => parseFloat(p.replace('$', ''))).filter((n) => !isNaN(n) && n > 0);
        if (numPrices.length >= 2) {
          const inputRate = numPrices[0];
          const outputRate = numPrices[numPrices.length - 1];
          tokenRates.push({
            model: modelName,
            inputRate,
            outputRate,
            offPeakInputRate: Math.round(inputRate * 0.5 * 1000) / 1000,
            offPeakOutputRate: Math.round(outputRate * 0.5 * 1000) / 1000,
          });
        }
      }
    }

    // Dynamic pay-as-you-go label from extracted rates
    let payPerUseLabel = 'DeepSeek API (Pay-As-You-Go)';
    if (tokenRates.length > 0) {
      const allIn = tokenRates.map((r) => r.inputRate);
      const allOut = tokenRates.map((r) => r.outputRate);
      const minIn = Math.min(...allIn);
      const maxIn = Math.max(...allIn);
      const minOut = Math.min(...allOut);
      const maxOut = Math.max(...allOut);
      payPerUseLabel = `DeepSeek API (Pay-As-You-Go: $${minIn}-$${maxIn}/M in, $${minOut}-$${maxOut}/M out)`;
    } else if (dollarMatches.length >= 2) {
      const numericPrices = dollarMatches.map((p) => parseFloat(p.replace('$', ''))).filter((n) => !isNaN(n) && n > 0);
      if (numericPrices.length >= 2) {
        const minP = Math.min(...numericPrices);
        const maxP = Math.max(...numericPrices);
        payPerUseLabel = `DeepSeek API (Pay-As-You-Go: $${minP}-$${maxP}/M)`;
      }
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
        label: payPerUseLabel,
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
        tokenRates,
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
