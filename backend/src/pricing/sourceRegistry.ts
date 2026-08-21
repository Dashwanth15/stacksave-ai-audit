// ============================================================
// Pricing Source Registry — StackSave AI Audit
//
// Single source of truth for all provider pricing sources.
// Derived directly from TOOL_CATALOG IDs — no second list.
//
// REQUIREMENT: OFFICIAL PROVIDER SOURCES ONLY.
// OpenRouter is NOT used as an authoritative source for any provider.
// ============================================================

import { ExtractionStrategy } from './types';

export interface ProviderSourceConfig {
  /** Must match ToolCatalog.id exactly */
  id: string;
  displayName: string;
  pricingUrl: string;
  offersUrl?: string;
  strategy: ExtractionStrategy;
  /** Additional notes on why this strategy was chosen */
  strategyNotes: string;
}

export const PROVIDER_SOURCE_REGISTRY: ProviderSourceConfig[] = [
  {
    id: 'cursor',
    displayName: 'Cursor',
    pricingUrl: 'https://cursor.com/pricing',
    offersUrl: 'https://cursor.com/pricing',
    strategy: 'JSON_LD',
    strategyNotes:
      'Official JSON-LD SoftwareApplication schema with Offer[] prices embedded in static HTML. Direct vendor extraction.',
  },
  {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    pricingUrl: 'https://github.com/features/copilot/plans',
    offersUrl: 'https://github.com/features/copilot/plans',
    strategy: 'NEXTJS_EMBEDDED',
    strategyNotes:
      'Official GitHub SSR embeds Contentful CMS payload in <script data-target="react-app.embeddedData">. Direct vendor extraction.',
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    pricingUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    offersUrl: 'https://www.deepseek.com',
    strategy: 'HTML_TABLE',
    strategyNotes:
      'Official DeepSeek documentation table parsed directly from static HTML. Direct vendor extraction.',
  },
  {
    id: 'chatgpt',
    displayName: 'ChatGPT',
    pricingUrl: 'https://openai.com/chatgpt/pricing',
    offersUrl: 'https://openai.com/blog',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official OpenAI pricing page probed directly every 24h. Cloudflare HTTP 403 challenge page returned; authoritative baseline retained.',
  },
  {
    id: 'claude',
    displayName: 'Claude',
    pricingUrl: 'https://claude.com/pricing',
    offersUrl: 'https://www.anthropic.com/news',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Anthropic page probed directly every 24h. Dynamic Webflow SPA lacks static plan text; authoritative baseline retained.',
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    pricingUrl: 'https://one.google.com/about/ai-premium',
    offersUrl: 'https://blog.google/technology/ai/',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Google One page probed directly every 24h. Dynamic React client SPA; authoritative baseline retained.',
  },
  {
    id: 'windsurf',
    displayName: 'Windsurf',
    pricingUrl: 'https://codeium.com/pricing',
    offersUrl: 'https://codeium.com/blog',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Codeium/Windsurf page probed directly every 24h. Vercel Security Checkpoint (HTTP 429); authoritative baseline retained.',
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    pricingUrl: 'https://www.perplexity.ai/pro',
    offersUrl: 'https://www.perplexity.ai/blog',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Perplexity Pro page probed directly every 24h. Cloudflare HTTP 403 challenge; authoritative baseline retained.',
  },
  {
    id: 'kimi',
    displayName: 'Kimi',
    pricingUrl: 'https://platform.moonshot.cn/docs/pricing/chat',
    offersUrl: 'https://platform.moonshot.cn/pricing',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Moonshot/Kimi documentation probed directly every 24h. WAF/Session auth wall; authoritative baseline retained.',
  },
  {
    id: 'anthropic-api',
    displayName: 'Anthropic API',
    pricingUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    offersUrl: 'https://www.anthropic.com/pricing',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official Anthropic documentation probed directly every 24h. Client-side Mintlify SPA; authoritative baseline retained.',
  },
  {
    id: 'openai-api',
    displayName: 'OpenAI API',
    pricingUrl: 'https://openai.com/api/pricing',
    offersUrl: 'https://openai.com/api/pricing',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official OpenAI API pricing probed directly every 24h. Cloudflare HTTP 403 challenge; authoritative baseline retained.',
  },
  {
    id: 'codex',
    displayName: 'OpenAI Codex',
    pricingUrl: 'https://openai.com/blog/openai-codex',
    offersUrl: 'https://openai.com/blog/openai-codex',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official OpenAI Codex developer blog probed directly. Developer free tier access baseline.',
  },
  {
    id: 'github-models',
    displayName: 'GitHub Models',
    pricingUrl: 'https://github.com/marketplace/models',
    offersUrl: 'https://github.com/marketplace/models',
    strategy: 'STATIC_FALLBACK',
    strategyNotes:
      'Official GitHub Marketplace models portal probed directly. Prototyping free tier access baseline.',
  },
];

/** Look up a provider's source config by ID */
export function getProviderSource(id: string): ProviderSourceConfig | undefined {
  return PROVIDER_SOURCE_REGISTRY.find((p) => p.id === id);
}

/** IDs of all providers that use the OpenRouter REST API */
export const OPENROUTER_PROVIDER_IDS = PROVIDER_SOURCE_REGISTRY
  .filter((p) => p.strategy === 'REST_API')
  .map((p) => p.id);

/**
 * Map from StackSave provider ID → OpenRouter model ID prefix to extract pricing.
 * We pick the canonical "flagship" model per provider for the reference price.
 */
export const OPENROUTER_MODEL_MAP: Record<string, string> = {
  'anthropic-api':  'anthropic/claude-opus-5',       // Claude Opus 5 as reference
  'openai-api':     'openai/gpt-4o',                 // GPT-4o as reference
  'deepseek':       'deepseek/deepseek-v4-pro',      // DeepSeek V4 Pro as reference
  'kimi':           'moonshot/moonshot-v1-8k',        // Kimi flagship (fallback: kimi prefix)
  'github-models':  'openai/gpt-4o',                 // GitHub Models uses OpenAI models
  'codex':          'openai/codex-mini',              // Codex Mini as reference
};
