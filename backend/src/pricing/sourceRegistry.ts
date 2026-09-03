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

export interface OfficialOfferSource {
  label: string;
  url: string;
  type: 'pricing' | 'education' | 'startups' | 'nonprofit' | 'api_promotions' | 'annual_discount';
}

export interface ProviderSourceConfig {
  /** Must match ToolCatalog.id exactly */
  id: string;
  displayName: string;
  pricingUrl: string;
  offersUrl?: string;
  /** Secondary official URLs monitored for promotions, student plans, API discounts */
  secondaryOfferUrls?: OfficialOfferSource[];
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
    secondaryOfferUrls: [
      { label: 'Student Program', url: 'https://cursor.com/pricing', type: 'education' },
    ],
    strategy: 'JSON_LD',
    strategyNotes:
      'Official JSON-LD SoftwareApplication schema with Offer[] prices embedded in static HTML. Direct vendor extraction.',
  },
  {
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    pricingUrl: 'https://github.com/features/copilot/plans',
    offersUrl: 'https://github.com/features/copilot/plans',
    secondaryOfferUrls: [
      { label: 'GitHub Education Pack', url: 'https://education.github.com/pack', type: 'education' },
    ],
    strategy: 'NEXTJS_EMBEDDED',
    strategyNotes:
      'Official GitHub SSR embeds Contentful CMS payload in <script data-target="react-app.embeddedData">. Direct vendor extraction.',
  },
  {
    id: 'deepseek',
    displayName: 'DeepSeek',
    pricingUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    offersUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
    secondaryOfferUrls: [
      { label: 'Off-Peak Schedule', url: 'https://api-docs.deepseek.com/quick_start/pricing/', type: 'api_promotions' },
    ],
    strategy: 'HTML_TABLE',
    strategyNotes:
      'Official DeepSeek documentation table parsed directly from static HTML. Direct vendor extraction.',
  },
  {
    id: 'chatgpt',
    displayName: 'ChatGPT',
    pricingUrl: 'https://openai.com/chatgpt/pricing',
    offersUrl: 'https://openai.com/education',
    secondaryOfferUrls: [
      { label: 'OpenAI Education (Teachers & Edu)', url: 'https://openai.com/education', type: 'education' },
      { label: 'OpenAI Nonprofits', url: 'https://openai.com/nonprofit', type: 'nonprofit' },
      { label: 'OpenAI Startups', url: 'https://openai.com/startups', type: 'startups' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official OpenAI multi-page Playwright DOM crawler. Extracts plans, K-12 teacher grants, ChatGPT Edu, and nonprofit discounts.',
  },
  {
    id: 'claude',
    displayName: 'Claude',
    pricingUrl: 'https://claude.com/pricing',
    offersUrl: 'https://claude.com/pricing',
    secondaryOfferUrls: [
      { label: 'Anthropic for Startups', url: 'https://www.anthropic.com/startups', type: 'startups' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Anthropic multi-page Playwright DOM crawler. Extracts plans, annual discount savings, and startup accelerator credits.',
  },
  {
    id: 'gemini',
    displayName: 'Gemini',
    pricingUrl: 'https://one.google.com/about/ai-premium',
    offersUrl: 'https://one.google.com/ai-student',
    secondaryOfferUrls: [
      { label: 'Google AI Student 12-Month Trial', url: 'https://one.google.com/ai-student', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Google One multi-page Playwright DOM crawler. Extracts AI Premium, student bundle promotions, and 12-month student trials.',
  },
  {
    id: 'windsurf',
    displayName: 'Windsurf',
    pricingUrl: 'https://codeium.com/pricing',
    offersUrl: 'https://codeium.com/students',
    secondaryOfferUrls: [
      { label: 'Codeium for Students', url: 'https://codeium.com/students', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Codeium/Windsurf multi-page Playwright DOM crawler. Extracts plans, annual billing savings, and student education tiers.',
  },
  {
    id: 'perplexity',
    displayName: 'Perplexity',
    pricingUrl: 'https://www.perplexity.ai/pro',
    offersUrl: 'https://www.perplexity.ai/enterprise',
    secondaryOfferUrls: [
      { label: 'Perplexity Enterprise for Education', url: 'https://www.perplexity.ai/enterprise', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Perplexity multi-page Playwright DOM crawler. Extracts Pro plans, annual savings, and academic enterprise discounts.',
  },
  {
    id: 'kimi',
    displayName: 'Kimi',
    pricingUrl: 'https://platform.moonshot.cn/docs/pricing/chat',
    offersUrl: 'https://platform.moonshot.cn/pricing',
    secondaryOfferUrls: [
      { label: 'Moonshot Platform Registration Credits', url: 'https://platform.moonshot.cn/pricing', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Moonshot/Kimi multi-page Playwright DOM crawler. Extracts model pricing and developer registration trial credits.',
  },
  {
    id: 'anthropic-api',
    displayName: 'Anthropic API',
    pricingUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    offersUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    secondaryOfferUrls: [
      { label: 'Prompt Caching Docs (90% Read Discount)', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching', type: 'api_promotions' },
      { label: 'Message Batches API Docs (50% Discount)', url: 'https://docs.anthropic.com/en/docs/build-with-claude/batch-processing', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Anthropic API multi-page Playwright DOM crawler. Extracts token pricing, prompt caching 90% savings, and batch discounts.',
  },
  {
    id: 'openai-api',
    displayName: 'OpenAI API',
    pricingUrl: 'https://openai.com/api/pricing',
    offersUrl: 'https://openai.com/startups',
    secondaryOfferUrls: [
      { label: 'OpenAI for Startups', url: 'https://openai.com/startups', type: 'startups' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official OpenAI API multi-page Playwright DOM crawler. Extracts token pricing, Batch API 50% discount, and startup grants.',
  },
  {
    id: 'codex',
    displayName: 'OpenAI Codex',
    pricingUrl: 'https://openai.com/blog/openai-codex',
    offersUrl: 'https://openai.com/blog/openai-codex',
    strategy: 'STATIC_BASELINE',
    strategyNotes:
      'Official OpenAI Codex developer blog probed directly. Developer free tier access baseline.',
  },
  {
    id: 'github-models',
    displayName: 'GitHub Models',
    pricingUrl: 'https://github.com/marketplace/models',
    offersUrl: 'https://github.com/marketplace/models',
    strategy: 'STATIC_BASELINE',
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
