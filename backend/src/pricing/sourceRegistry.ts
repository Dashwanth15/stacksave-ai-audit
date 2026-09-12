// ============================================================
// Pricing Source Registry — StackSave AI Audit
//
// Single source of truth for all provider pricing sources.
// Covers both core catalog providers AND all 20 discovered
// Layer 2 AI platforms.
//
// REQUIREMENT: OFFICIAL PROVIDER SOURCES ONLY.
// OpenRouter is NOT used as an authoritative source for any provider.
//
// Source entries serve TWO purposes:
//   1. Establish trusted URL domains for canPublishOffer()
//   2. Configure Playwright extraction targets for daily sync
//
// A source entry does NOT create offers. Offers are created ONLY
// when Playwright extraction finds real promotional content on a
// live page. "No promotional content found" = no offer = correct.
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
  /** Dedicated promotions page (separate from main pricing) */
  promotionUrl?: string;
  /** Student / academic program page */
  educationUrl?: string;
  /** Startup credits program page */
  startupUrl?: string;
  /** API-specific discount / promotion page */
  apiPromotionsUrl?: string;
  /** Known official partner benefit / bundle page */
  partnerUrl?: string;
  /** Secondary official URLs monitored for promotions, student plans, API discounts */
  secondaryOfferUrls?: OfficialOfferSource[];
  strategy: ExtractionStrategy;
  /** Additional notes on why this strategy was chosen */
  strategyNotes: string;
}

export const PROVIDER_SOURCE_REGISTRY: ProviderSourceConfig[] = [
  // ── CORE CATALOG PROVIDERS ────────────────────────────────────
  {
    id: 'antigravity',
    displayName: 'Google Antigravity',
    pricingUrl: 'https://antigravity.google/pricing',
    offersUrl: 'https://antigravity.google/docs/plans',
    secondaryOfferUrls: [
      { label: 'Google Antigravity Enterprise Docs', url: 'https://antigravity.google/docs/enterprise', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Google Antigravity developer portal and pricing page Playwright DOM crawler.',
  },
  {
    id: 'cursor',
    displayName: 'Cursor',
    pricingUrl: 'https://cursor.com/pricing',
    offersUrl: 'https://cursor.com/pricing',
    educationUrl: 'https://cursor.com/pricing',
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
    educationUrl: 'https://education.github.com/pack',
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
    apiPromotionsUrl: 'https://api-docs.deepseek.com/quick_start/pricing/',
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
    educationUrl: 'https://openai.com/education',
    startupUrl: 'https://openai.com/startups',
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
    startupUrl: 'https://www.anthropic.com/startups',
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
    educationUrl: 'https://one.google.com/ai-student',
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
    educationUrl: 'https://codeium.com/students',
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
    pricingUrl: 'https://perplexity.ai/hub/pricing',
    offersUrl: 'https://perplexity.ai/hub/pricing',
    secondaryOfferUrls: [
      { label: 'Perplexity Enterprise', url: 'https://www.perplexity.ai/enterprise', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Perplexity hub/pricing Playwright DOM crawler. Extracts Free, Pro, Max, Education Pro, Enterprise Pro, Enterprise Max, and Custom tiers.',
  },
  {
    id: 'kimi',
    displayName: 'Kimi',
    pricingUrl: 'https://platform.moonshot.cn/pricing',
    offersUrl: 'https://platform.moonshot.cn/pricing',
    apiPromotionsUrl: 'https://platform.moonshot.cn/pricing',
    secondaryOfferUrls: [
      { label: 'Moonshot Platform Registration Credits', url: 'https://platform.moonshot.cn/pricing', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Moonshot/Kimi multi-page Playwright DOM crawler. Extracts model pricing and developer registration trial credits.',
  },
  {
    id: 'grok',
    displayName: 'Grok',
    pricingUrl: 'https://docs.x.ai',
    offersUrl: 'https://grok.com',
    secondaryOfferUrls: [
      { label: 'X Premium Sign Up', url: 'https://x.com/i/premium_sign_up', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official xAI documentation and Grok portal Playwright DOM crawler. Extracts SuperGrok consumer tiers, X Premium bundles, and API pay-as-you-go pricing.',
  },
  {
    id: 'anthropic-api',
    displayName: 'Anthropic API',
    pricingUrl: 'https://docs.anthropic.com/en/docs/about-claude/models',
    offersUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
    apiPromotionsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching',
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
    startupUrl: 'https://openai.com/startups',
    apiPromotionsUrl: 'https://openai.com/api/pricing',
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
  {
    id: 'glm',
    displayName: 'GLM (Z.ai)',
    pricingUrl: 'https://z.ai/pricing',
    offersUrl: 'https://z.ai/subscribe',
    secondaryOfferUrls: [
      { label: 'Z.ai Model API', url: 'https://z.ai/model-api', type: 'pricing' },
      { label: 'Z.ai Docs', url: 'https://docs.z.ai', type: 'pricing' },
      { label: 'ZCode', url: 'https://zcode.z.ai/en', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Z.ai / GLM Coding subscription and API documentation crawler. Extracts Lite, Pro, Max, Enterprise, and API tiers.',
  },
  {
    id: 'muse',
    displayName: 'Muse (Meta)',
    pricingUrl: 'https://dev.meta.ai/docs/pricing-rate-limits',
    offersUrl: 'https://dev.meta.ai/docs/pricing-rate-limits',
    secondaryOfferUrls: [
      { label: 'Meta Muse AI Announcement', url: 'https://about.fb.com/news/2026/09/meta-muse-ai/', type: 'pricing' },
      { label: 'Muse Code CLI', url: 'https://muse.meta.ai/code', type: 'pricing' },
      { label: 'Muse Meta AI', url: 'https://muse.meta.ai', type: 'pricing' },
      { label: 'Meta AI', url: 'https://ai.meta.com/', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Meta developer portal and documentation crawler. Extracts Muse Code CLI, Meta Model API standard and contributor rates, and personal agent tiers.',
  },

  // ── DISCOVERED / LAYER 2 PROVIDERS ───────────────────────────
  // These 20 providers are validated AI platforms not yet in the core
  // StackSave catalog. Source entries establish trusted URL domains
  // for canPublishOffer(). Offers are created ONLY when Playwright
  // extraction finds real promotional content on a live page.
  // "No promotional content on page" = no offer created = correct.
  {
    id: 'mistral',
    displayName: 'Mistral AI (Le Chat)',
    pricingUrl: 'https://mistral.ai/technology/#pricing',
    offersUrl: 'https://mistral.ai',
    promotionUrl: 'https://mistral.ai',
    secondaryOfferUrls: [
      { label: 'Mistral AI Console', url: 'https://console.mistral.ai', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Mistral AI portal. Playwright extracts Le Chat Pro pricing and any active promotions. Offer created only if promotional content is detected on live page.',
  },
  {
    id: 'elevenlabs',
    displayName: 'ElevenLabs',
    pricingUrl: 'https://elevenlabs.io/pricing',
    offersUrl: 'https://elevenlabs.io/pricing',
    secondaryOfferUrls: [
      { label: 'ElevenLabs Annual Billing', url: 'https://elevenlabs.io/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official ElevenLabs pricing page. Playwright detects annual vs monthly price delta for ANNUAL_SAVINGS. No offer created if no pricing differential found on live page.',
  },
  {
    id: 'midjourney',
    displayName: 'Midjourney',
    pricingUrl: 'https://docs.midjourney.com/docs/plans',
    offersUrl: 'https://docs.midjourney.com/docs/plans',
    secondaryOfferUrls: [
      { label: 'Midjourney Plans Documentation', url: 'https://docs.midjourney.com/docs/plans', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Midjourney docs. Extracts plan pricing and annual billing savings. Offer created only if annual discount is confirmed on live page.',
  },
  {
    id: 'runway',
    displayName: 'Runway',
    pricingUrl: 'https://runwayml.com/pricing',
    offersUrl: 'https://runwayml.com/pricing',
    secondaryOfferUrls: [
      { label: 'Runway Annual Billing', url: 'https://runwayml.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Runway pricing page. Playwright detects annual savings vs monthly. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'suno',
    displayName: 'Suno',
    pricingUrl: 'https://suno.com/pricing',
    offersUrl: 'https://suno.com/pricing',
    secondaryOfferUrls: [
      { label: 'Suno Annual Billing', url: 'https://suno.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Suno pricing page. Playwright detects annual billing savings. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'poe',
    displayName: 'Poe',
    pricingUrl: 'https://poe.com/subscribe',
    offersUrl: 'https://poe.com/subscribe',
    secondaryOfferUrls: [
      { label: 'Poe Annual Subscription', url: 'https://poe.com/subscribe', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Poe subscription page. Playwright detects annual billing savings vs monthly. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'character-ai',
    displayName: 'Character.AI',
    pricingUrl: 'https://character.ai/',
    offersUrl: 'https://character.ai/',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Character.AI membership page. Source entry registers trust domain. No Playwright extractor currently active — offer created only if promotional evidence found in future cycles.',
  },
  {
    id: 'replit-ai',
    displayName: 'Replit AI & Agent',
    pricingUrl: 'https://replit.com/pricing',
    offersUrl: 'https://replit.com/pricing',
    educationUrl: 'https://replit.com/pricing',
    secondaryOfferUrls: [
      { label: 'Replit Pricing & Plans', url: 'https://replit.com/pricing', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Replit pricing and education pages. Playwright checks for annual savings and educator/student program availability.',
  },
  {
    id: 'devin',
    displayName: 'Devin',
    pricingUrl: 'https://cognition.ai',
    offersUrl: 'https://cognition.ai',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Cognition AI portal. Source entry registers trust domain. Limited public pricing currently. Offer created only if promotional evidence is discovered.',
  },
  {
    id: 'lovable',
    displayName: 'Lovable',
    pricingUrl: 'https://lovable.dev/pricing',
    offersUrl: 'https://lovable.dev/pricing',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Lovable pricing page. Source entry registers trust domain. Offer created only if promotional evidence is found on live page.',
  },
  {
    id: 'bolt-new',
    displayName: 'Bolt.new',
    pricingUrl: 'https://bolt.new/',
    offersUrl: 'https://bolt.new/',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Bolt.new (StackBlitz) pricing page. Source entry registers trust domain. Offer created only if promotional evidence is found on live page.',
  },
  {
    id: 'notebooklm',
    displayName: 'NotebookLM',
    pricingUrl: 'https://notebooklm.google',
    offersUrl: 'https://one.google.com/about/ai-premium',
    promotionUrl: 'https://one.google.com/about/ai-premium',
    secondaryOfferUrls: [
      { label: 'Google One AI Premium (includes NotebookLM)', url: 'https://one.google.com/about/ai-premium', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official NotebookLM portal. Access is bundled inside Google One AI Premium (already covered under gemini). Trust domain registered. Standalone offer created only if a dedicated NotebookLM promotion appears.',
  },
  {
    id: 'gamma',
    displayName: 'Gamma',
    pricingUrl: 'https://gamma.app/pricing',
    offersUrl: 'https://gamma.app/pricing',
    secondaryOfferUrls: [
      { label: 'Gamma Annual Billing', url: 'https://gamma.app/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Gamma pricing page. Playwright detects annual billing savings vs monthly. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'heygen',
    displayName: 'HeyGen',
    pricingUrl: 'https://www.heygen.com/pricing',
    offersUrl: 'https://www.heygen.com/pricing',
    secondaryOfferUrls: [
      { label: 'HeyGen Annual Billing', url: 'https://www.heygen.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official HeyGen pricing page. Playwright detects annual vs monthly price delta. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'synthesia',
    displayName: 'Synthesia',
    pricingUrl: 'https://www.synthesia.io/pricing',
    offersUrl: 'https://www.synthesia.io/pricing',
    secondaryOfferUrls: [
      { label: 'Synthesia Annual Billing', url: 'https://www.synthesia.io/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Synthesia pricing page. Playwright detects annual savings. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'ideogram',
    displayName: 'Ideogram',
    pricingUrl: 'https://ideogram.ai/pricing',
    offersUrl: 'https://ideogram.ai/pricing',
    secondaryOfferUrls: [
      { label: 'Ideogram Annual Billing', url: 'https://ideogram.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Ideogram pricing page. Playwright detects annual billing savings. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'leonardo-ai',
    displayName: 'Leonardo AI',
    pricingUrl: 'https://leonardo.ai/pricing',
    offersUrl: 'https://leonardo.ai/pricing',
    secondaryOfferUrls: [
      { label: 'Leonardo AI Annual Billing', url: 'https://leonardo.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Leonardo AI pricing page. Playwright detects annual vs monthly price delta. No offer created if no promotional evidence found on live page.',
  },
  {
    id: 'genspark',
    displayName: 'Genspark',
    pricingUrl: 'https://www.genspark.ai/pricing',
    offersUrl: 'https://www.genspark.ai/pricing',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Genspark pricing page. Source entry registers trust domain. Offer created only if promotional evidence is found on live page.',
  },
  {
    id: 'qwen',
    displayName: 'Qwen (Alibaba Cloud)',
    pricingUrl: 'https://www.alibabacloud.com/product/model-studio',
    offersUrl: 'https://chat.qwenlm.ai',
    secondaryOfferUrls: [
      { label: 'Qwen Chat Interface', url: 'https://chat.qwenlm.ai', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Alibaba Cloud Model Studio and Qwen chat portal. Source entry registers trust domain. Offer created only if promotional evidence is found on live page.',
  },
  {
    id: 'manus',
    displayName: 'Manus AI',
    pricingUrl: 'https://manus.im',
    offersUrl: 'https://manus.im',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes:
      'Official Manus AI portal. Source entry registers trust domain. Beta access currently. Offer created only if qualifying promotional evidence is discovered.',
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
  'anthropic-api':  'anthropic/claude-opus-5',
  'openai-api':     'openai/gpt-4o',
  'deepseek':       'deepseek/deepseek-v4-pro',
  'kimi':           'moonshot/moonshot-v1-8k',
  'github-models':  'openai/gpt-4o',
  'codex':          'openai/codex-mini',
};
