// ============================================================
// Static Fallback Adapter — Honest Stale/Blocked Handler
// StackSave AI Audit
//
// Used for providers whose pricing pages cannot be fetched
// without a real browser:
//   - openai.com  → 403 blocked
//   - claude.com  → Webflow SPA
//   - Gemini      → Google SPA
//   - Windsurf    → 429 rate-limited
//   - Perplexity  → 403 blocked
//
// Returns FETCH_BLOCKED or NO_RELIABLE_PUBLIC_SOURCE.
// The orchestrator then uses the last verified DB price (marked STALE).
// ============================================================

import { ProviderPricingResult, SyncStatus } from '../types';

export type StaticFallbackReason =
  | 'FETCH_BLOCKED_403'
  | 'FETCH_BLOCKED_429'
  | 'SPA_WEBFLOW'
  | 'SPA_REACT'
  | 'SPA_GOOGLE';

interface StaticFallbackConfig {
  providerId: string;
  pricingUrl: string;
  reason: StaticFallbackReason;
  notes: string;
}

/** 
 * Known static-fallback providers with their block reason.
 * Updated based on live-testing results from 2026-08-20.
 */
const STATIC_FALLBACK_CONFIGS: StaticFallbackConfig[] = [
  {
    providerId: 'chatgpt',
    pricingUrl: 'https://openai.com/chatgpt/pricing',
    reason: 'FETCH_BLOCKED_403',
    notes: 'openai.com returns 403 for all non-browser automated fetch',
  },
  {
    providerId: 'claude',
    pricingUrl: 'https://claude.com/pricing',
    reason: 'SPA_WEBFLOW',
    notes: 'claude.com is a Webflow SPA; all plan prices injected by JS — no pricing in static HTML',
  },
  {
    providerId: 'gemini',
    pricingUrl: 'https://one.google.com/about/ai-premium',
    reason: 'SPA_GOOGLE',
    notes: 'Google One page is a client-side React SPA; no pricing data in static HTML',
  },
  {
    providerId: 'windsurf',
    pricingUrl: 'https://windsurf.com/pricing',
    reason: 'FETCH_BLOCKED_429',
    notes: 'windsurf.com returns 429 for automated fetch',
  },
  {
    providerId: 'perplexity',
    pricingUrl: 'https://perplexity.ai/pro',
    reason: 'FETCH_BLOCKED_403',
    notes: 'perplexity.ai returns 403 for automated fetch',
  },
];

function reasonToStatus(reason: StaticFallbackReason): SyncStatus {
  switch (reason) {
    case 'FETCH_BLOCKED_403':
    case 'FETCH_BLOCKED_429':
      return 'FETCH_BLOCKED';
    case 'SPA_WEBFLOW':
    case 'SPA_REACT':
    case 'SPA_GOOGLE':
      return 'NO_RELIABLE_PUBLIC_SOURCE';
  }
}

function reasonToMessage(reason: StaticFallbackReason, notes: string): string {
  switch (reason) {
    case 'FETCH_BLOCKED_403':
      return `Page returns HTTP 403 for automated fetch. ${notes}`;
    case 'FETCH_BLOCKED_429':
      return `Page returns HTTP 429 (rate-limited) for automated fetch. ${notes}`;
    case 'SPA_WEBFLOW':
    case 'SPA_REACT':
    case 'SPA_GOOGLE':
      return `Page is a JavaScript SPA — pricing is not available in static HTML. ${notes}`;
  }
}

/**
 * Return an honest, non-blocking result for a provider that cannot be
 * extracted without a browser. The orchestrator will preserve last DB price
 * marked as STALE.
 */
export function buildStaticFallbackResult(providerId: string): ProviderPricingResult {
  const config = STATIC_FALLBACK_CONFIGS.find((c) => c.providerId === providerId);

  const fetchedAt = new Date();

  if (!config) {
    return {
      providerId,
      status: 'NO_RELIABLE_PUBLIC_SOURCE',
      strategy: 'STATIC_FALLBACK',
      sourceUrl: '',
      fetchedAt,
      plans: [],
      failureReason: `No static fallback config found for provider: ${providerId}`,
    };
  }

  return {
    providerId: config.providerId,
    status: reasonToStatus(config.reason),
    strategy: 'STATIC_FALLBACK',
    sourceUrl: config.pricingUrl,
    fetchedAt,
    plans: [],
    failureReason: reasonToMessage(config.reason, config.notes),
  };
}

export { STATIC_FALLBACK_CONFIGS };
