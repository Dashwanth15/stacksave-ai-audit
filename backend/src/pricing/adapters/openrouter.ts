// ============================================================
// OpenRouter REST API Adapter — Live Token Pricing
// StackSave AI Audit
//
// Strategy: REST_API
// Source:   https://openrouter.ai/api/v1/models
// Verified: 2026-08-20 — Public unauthenticated endpoint returns
//           JSON with per-token pricing for all major models.
//           Used for: anthropic-api, openai-api, deepseek, kimi,
//                     github-models, codex
// ============================================================

import { NormalizedPlan, ProviderPricingResult, SyncStatus } from '../types';
import { OPENROUTER_MODEL_MAP } from '../sourceRegistry';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/models';
const FETCH_TIMEOUT_MS = 20_000;

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;   // Cost per token in USD (as string)
    completion: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  context_length?: number;
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

/** Convert per-token price string to cost per 1M tokens (more human-readable) */
function perTokenToPerMillion(raw: string): number {
  const n = parseFloat(raw);
  if (isNaN(n)) return 0;
  return parseFloat((n * 1_000_000).toFixed(4));
}

/**
 * Fetch the OpenRouter models list once and cache it in module scope
 * so multiple providers don't trigger duplicate requests in the same sync run.
 */
let _cachedModels: OpenRouterModel[] | null = null;
let _cacheTime: number = 0;
const CACHE_TTL_MS = 60_000; // 1-minute in-process cache

async function getOpenRouterModels(): Promise<OpenRouterModel[] | null> {
  const now = Date.now();
  if (_cachedModels && now - _cacheTime < CACHE_TTL_MS) {
    return _cachedModels;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'StackSave-PriceBot/1.0',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as OpenRouterResponse;
    _cachedModels = json.data ?? [];
    _cacheTime = now;
    return _cachedModels;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Find the best matching model from the list for a given model ID prefix.
 * Handles partial matches (e.g. 'deepseek/deepseek-v4-pro' matches
 * 'deepseek/deepseek-v4-pro-0813').
 */
function findBestModel(models: OpenRouterModel[], modelIdHint: string): OpenRouterModel | null {
  // Exact match first
  const exact = models.find((m) => m.id === modelIdHint);
  if (exact) return exact;
  // Prefix match (latest dated release)
  const candidates = models.filter((m) => m.id.startsWith(modelIdHint));
  if (candidates.length === 0) return null;
  // Return the one with the highest id (lexicographic — dated slugs sort newest last)
  return candidates.sort((a, b) => b.id.localeCompare(a.id))[0];
}

/**
 * Build NormalizedPlan[] from a single OpenRouter model entry.
 * We represent API pricing as a single pay-per-use plan with
 * per-1M-token rates stored in the label and monthlyPricePerSeat=0.
 *
 * The raw per-token prices are preserved in rawExtract for audit trail.
 */
function buildApiPlan(model: OpenRouterModel): NormalizedPlan {
  const inputPerM = perTokenToPerMillion(model.pricing.prompt);
  const outputPerM = perTokenToPerMillion(model.pricing.completion);
  const cacheReadPerM = model.pricing.input_cache_read
    ? perTokenToPerMillion(model.pricing.input_cache_read)
    : undefined;

  return {
    id: 'pay-as-you-go',
    label: `Pay As You Go — Input: $${inputPerM}/M tokens, Output: $${outputPerM}/M tokens${
      cacheReadPerM !== undefined ? `, Cache read: $${cacheReadPerM}/M` : ''
    }`,
    monthlyPricePerSeat: 0,
    isPayPerUse: true,
    currency: 'USD',
  };
}

/**
 * Fetch pricing for a single provider that uses the OpenRouter API.
 * providerId must exist in OPENROUTER_MODEL_MAP.
 */
export async function fetchOpenRouterPricing(
  providerId: string,
  sourceUrl: string
): Promise<ProviderPricingResult> {
  const fetchedAt = new Date();

  const modelIdHint = OPENROUTER_MODEL_MAP[providerId];
  if (!modelIdHint) {
    return {
      providerId,
      status: 'PARSE_FAILED',
      strategy: 'REST_API',
      sourceUrl,
      fetchedAt,
      plans: [],
      failureReason: `No OpenRouter model mapping defined for provider: ${providerId}`,
    };
  }

  const models = await getOpenRouterModels();

  if (!models) {
    return {
      providerId,
      status: 'FETCH_BLOCKED',
      strategy: 'REST_API',
      sourceUrl: OPENROUTER_API_URL,
      fetchedAt,
      plans: [],
      failureReason: 'Failed to fetch OpenRouter /api/v1/models',
    };
  }

  const model = findBestModel(models, modelIdHint);

  if (!model) {
    return {
      providerId,
      status: 'PARSE_FAILED',
      strategy: 'REST_API',
      sourceUrl: OPENROUTER_API_URL,
      fetchedAt,
      plans: [],
      failureReason: `Model '${modelIdHint}' not found in OpenRouter models list (${models.length} models returned)`,
    };
  }

  const plan = buildApiPlan(model);

  return {
    providerId,
    status: 'VERIFIED',
    strategy: 'REST_API',
    sourceUrl: OPENROUTER_API_URL,
    fetchedAt,
    plans: [plan],
    rawExtract: {
      modelId: model.id,
      modelName: model.name,
      pricing: model.pricing,
    },
  };
}

/** Invalidate the in-process model cache (useful for testing) */
export function clearOpenRouterCache(): void {
  _cachedModels = null;
  _cacheTime = 0;
}
