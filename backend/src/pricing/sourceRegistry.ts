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
    educationUrl: 'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro',
    secondaryOfferUrls: [
      { label: 'Perplexity Enterprise', url: 'https://www.perplexity.ai/enterprise', type: 'education' },
      { label: 'Perplexity Education Pro Guide', url: 'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro', type: 'education' },
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
  // ── APPROVED PHASE 2 EXPANSION PLATFORMS ──────────────────────
  {
    id: 'notion-ai',
    displayName: 'Notion AI',
    pricingUrl: 'https://www.notion.so/product/ai',
    offersUrl: 'https://www.notion.so/startups',
    educationUrl: 'https://www.notion.so/product/notion-for-education',
    startupUrl: 'https://www.notion.so/startups',
    secondaryOfferUrls: [
      { label: 'Notion for Education', url: 'https://www.notion.so/product/notion-for-education', type: 'education' },
      { label: 'Notion for Startups', url: 'https://www.notion.so/startups', type: 'startups' },
      { label: 'Notion AI Pricing', url: 'https://www.notion.com/product/ai', type: 'annual_discount' },
      { label: 'Notion Edu (.com)', url: 'https://www.notion.com/product/notion-for-education', type: 'education' },
      { label: 'Notion Startups (.com)', url: 'https://www.notion.com/startups', type: 'startups' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Notion AI pricing, academic education program, and startup grant program pages.',
  },
  {
    id: 'canva-ai',
    displayName: 'Canva AI',
    pricingUrl: 'https://www.canva.com/pricing/',
    offersUrl: 'https://www.canva.com/education/',
    educationUrl: 'https://www.canva.com/education/',
    secondaryOfferUrls: [
      { label: 'Canva for Education', url: 'https://www.canva.com/education/', type: 'education' },
      { label: 'Canva Pro Free Trial', url: 'https://www.canva.com/pricing/', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Canva pricing and Canva for Education classroom program pages.',
  },
  {
    id: 'figma-ai',
    displayName: 'Figma AI',
    pricingUrl: 'https://www.figma.com/pricing/',
    offersUrl: 'https://www.figma.com/education/',
    educationUrl: 'https://www.figma.com/education/',
    secondaryOfferUrls: [
      { label: 'Figma for Education', url: 'https://www.figma.com/education/', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Figma pricing and Figma for Education free professional tier.',
  },
  {
    id: 'wandb',
    displayName: 'Weights & Biases',
    pricingUrl: 'https://wandb.ai/pricing',
    offersUrl: 'https://wandb.ai/site/academic/',
    educationUrl: 'https://wandb.ai/site/academic/',
    secondaryOfferUrls: [
      { label: 'W&B for Students & Academics', url: 'https://wandb.ai/site/academic/', type: 'education' },
      { label: 'W&B Research', url: 'https://wandb.ai/site/research/', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Weights & Biases academic research grant program.',
  },
  {
    id: 'v0',
    displayName: 'v0 by Vercel',
    pricingUrl: 'https://v0.dev/',
    offersUrl: 'https://vercel.com/startups',
    startupUrl: 'https://vercel.com/startups',
    secondaryOfferUrls: [
      { label: 'Vercel for Startups (v0 Credits)', url: 'https://vercel.com/startups', type: 'startups' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Vercel for Startups program including v0 generative UI credits.',
  },
  {
    id: 'groq',
    displayName: 'Groq',
    pricingUrl: 'https://groq.com/pricing/',
    offersUrl: 'https://console.groq.com/docs/rate-limits',
    apiPromotionsUrl: 'https://console.groq.com/docs/rate-limits',
    secondaryOfferUrls: [
      { label: 'GroqCloud Rate Limits & Free Allowance', url: 'https://console.groq.com/docs/rate-limits', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official GroqCloud developer pricing and complimentary daily request allowance.',
  },
  {
    id: 'together-ai',
    displayName: 'Together AI',
    pricingUrl: 'https://www.together.ai/pricing',
    offersUrl: 'https://www.together.ai/pricing',
    apiPromotionsUrl: 'https://www.together.ai/pricing',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Together AI inference pricing and developer trial registration credits.',
  },
  {
    id: 'fireworks-ai',
    displayName: 'Fireworks AI',
    pricingUrl: 'https://fireworks.ai/pricing',
    offersUrl: 'https://fireworks.ai/pricing',
    apiPromotionsUrl: 'https://fireworks.ai/pricing',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Fireworks AI developer pricing and signup credit allowance.',
  },
  {
    id: 'cohere',
    displayName: 'Cohere',
    pricingUrl: 'https://cohere.com/pricing',
    offersUrl: 'https://cohere.com/pricing',
    apiPromotionsUrl: 'https://cohere.com/pricing',
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Cohere developer trial tier and rate limits.',
  },
  {
    id: 'grammarly',
    displayName: 'Grammarly AI',
    pricingUrl: 'https://www.grammarly.com/plans',
    offersUrl: 'https://www.grammarly.com/plans',
    secondaryOfferUrls: [
      { label: 'Grammarly Annual Billing Discount', url: 'https://www.grammarly.com/plans', type: 'annual_discount' },
      { label: 'Grammarly for Education', url: 'https://www.grammarly.com/edu', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Grammarly subscription plans and 60% annual billing discount.',
  },
  {
    id: 'otter-ai',
    displayName: 'Otter.ai',
    pricingUrl: 'https://otter.ai/pricing',
    offersUrl: 'https://otter.ai/pricing',
    secondaryOfferUrls: [
      { label: 'Otter Pro Annual Savings', url: 'https://otter.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Otter.ai pricing and 40% annual billing discount.',
  },
  {
    id: 'deepl',
    displayName: 'DeepL Pro',
    pricingUrl: 'https://www.deepl.com/pro',
    offersUrl: 'https://www.deepl.com/pro',
    secondaryOfferUrls: [
      { label: 'DeepL Pro 30-Day Free Trial', url: 'https://www.deepl.com/en/pro', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official DeepL Pro translation plans and 30-day evaluation trial.',
  },
  {
    id: 'descript',
    displayName: 'Descript',
    pricingUrl: 'https://www.descript.com/pricing',
    offersUrl: 'https://www.descript.com/pricing',
    secondaryOfferUrls: [
      { label: 'Descript Annual Savings', url: 'https://www.descript.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Descript audio/video AI editor plans and 20% annual discount.',
  },
  {
    id: 'huggingface',
    displayName: 'Hugging Face',
    pricingUrl: 'https://huggingface.co/pricing',
    offersUrl: 'https://education.github.com/pack',
    educationUrl: 'https://education.github.com/pack',
    secondaryOfferUrls: [
      { label: 'Hugging Face Pro via GitHub Student Developer Pack', url: 'https://education.github.com/pack', type: 'education' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Hugging Face Hub pricing and GitHub Student Developer Pack academic benefit.',
  },
  {
    id: 'framer',
    displayName: 'Framer',
    pricingUrl: 'https://www.framer.com/pricing/',
    offersUrl: 'https://www.framer.com/pricing/',
    educationUrl: 'https://www.framer.com/education/',
    secondaryOfferUrls: [
      { label: 'Framer for Education', url: 'https://www.framer.com/education/', type: 'education' },
      { label: 'Framer Annual Savings', url: 'https://www.framer.com/pricing/', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Framer pricing, annual savings, and student/educator free basic plan pages.',
  },
  {
    id: 'kling-ai',
    displayName: 'Kling AI',
    pricingUrl: 'https://klingai.com/pricing',
    offersUrl: 'https://klingai.com/',
    secondaryOfferUrls: [
      { label: 'Kling AI Annual Savings', url: 'https://klingai.com/pricing', type: 'annual_discount' },
      { label: 'Kling AI Daily Free Credits', url: 'https://klingai.com/', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Kling AI video generation pricing, annual savings, and daily credit allowances.',
  },
  {
    id: 'luma-ai',
    displayName: 'Luma AI',
    pricingUrl: 'https://lumalabs.ai/dream-machine/pricing',
    offersUrl: 'https://lumalabs.ai/dream-machine',
    secondaryOfferUrls: [
      { label: 'Luma Dream Machine Annual Savings', url: 'https://lumalabs.ai/dream-machine/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Luma AI Dream Machine pricing and 20% annual subscription savings.',
  },
  {
    id: 'udio',
    displayName: 'Udio',
    pricingUrl: 'https://www.udio.com/pricing',
    offersUrl: 'https://www.udio.com/',
    secondaryOfferUrls: [
      { label: 'Udio Annual Savings', url: 'https://www.udio.com/pricing', type: 'annual_discount' },
      { label: 'Udio Free Tier', url: 'https://www.udio.com/', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Udio AI music creation pricing, annual discounts, and free tier allowances.',
  },
  {
    id: 'speechify',
    displayName: 'Speechify',
    pricingUrl: 'https://speechify.com/pricing/',
    offersUrl: 'https://speechify.com/students/',
    educationUrl: 'https://speechify.com/students/',
    secondaryOfferUrls: [
      { label: 'Speechify Students', url: 'https://speechify.com/students/', type: 'education' },
      { label: 'Speechify Annual Savings', url: 'https://speechify.com/pricing/', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Speechify text-to-speech pricing, 60% annual savings, and student program.',
  },
  {
    id: 'cerebras',
    displayName: 'Cerebras',
    pricingUrl: 'https://inference.cerebras.ai/pricing',
    offersUrl: 'https://inference.cerebras.ai/',
    apiPromotionsUrl: 'https://inference.cerebras.ai/',
    secondaryOfferUrls: [
      { label: 'Cerebras Inference Free Daily Allowance', url: 'https://inference.cerebras.ai/', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Cerebras inference API pricing, 1M daily free token allowance, and signup credits.',
  },
  {
    id: 'sambanova',
    displayName: 'SambaNova',
    pricingUrl: 'https://cloud.sambanova.ai/pricing',
    offersUrl: 'https://cloud.sambanova.ai/',
    apiPromotionsUrl: 'https://cloud.sambanova.ai/pricing',
    secondaryOfferUrls: [
      { label: 'SambaNova Cloud Free Tier & Credit', url: 'https://cloud.sambanova.ai/pricing', type: 'api_promotions' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official SambaNova Cloud developer pricing and free evaluation API credits.',
  },
  {
    id: 'beautiful-ai',
    displayName: 'Beautiful.ai',
    pricingUrl: 'https://www.beautiful.ai/pricing',
    offersUrl: 'https://www.beautiful.ai/education',
    educationUrl: 'https://www.beautiful.ai/education',
    secondaryOfferUrls: [
      { label: 'Beautiful.ai Education', url: 'https://www.beautiful.ai/education', type: 'education' },
      { label: 'Beautiful.ai Annual Savings', url: 'https://www.beautiful.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Beautiful.ai presentation software pricing, 1-year free student program, and annual discount.',
  },
  {
    id: 'consensus',
    displayName: 'Consensus',
    pricingUrl: 'https://consensus.app/pricing/',
    offersUrl: 'https://consensus.app/students/',
    educationUrl: 'https://consensus.app/students/',
    secondaryOfferUrls: [
      { label: 'Consensus Academic Discount', url: 'https://consensus.app/students/', type: 'education' },
      { label: 'Consensus Annual Savings', url: 'https://consensus.app/pricing/', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Consensus AI research engine pricing, academic discounts, and annual savings.',
  },
  {
    id: 'amazon-q',
    displayName: 'Amazon Q Developer',
    pricingUrl: 'https://aws.amazon.com/q/developer/pricing/',
    offersUrl: 'https://aws.amazon.com/q/developer/',
    secondaryOfferUrls: [
      { label: 'Amazon Q Developer Free Tier', url: 'https://aws.amazon.com/q/developer/pricing/', type: 'pricing' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official AWS Amazon Q Developer pricing and free developer tier.',
  },
  {
    id: 'jasper',
    displayName: 'Jasper',
    pricingUrl: 'https://www.jasper.ai/pricing',
    offersUrl: 'https://www.jasper.ai/education',
    educationUrl: 'https://www.jasper.ai/education',
    secondaryOfferUrls: [
      { label: 'Jasper Education & Nonprofits', url: 'https://www.jasper.ai/education', type: 'education' },
      { label: 'Jasper Annual Savings', url: 'https://www.jasper.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Jasper AI marketing platform pricing, annual discounts, and educator program.',
  },
  {
    id: 'copy-ai',
    displayName: 'Copy.ai',
    pricingUrl: 'https://www.copy.ai/pricing',
    offersUrl: 'https://www.copy.ai/',
    secondaryOfferUrls: [
      { label: 'Copy.ai Annual Savings', url: 'https://www.copy.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Copy.ai pricing and annual billing savings.',
  },
  {
    id: 'writesonic',
    displayName: 'Writesonic',
    pricingUrl: 'https://writesonic.com/pricing',
    offersUrl: 'https://writesonic.com/',
    secondaryOfferUrls: [
      { label: 'Writesonic Annual Savings', url: 'https://writesonic.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Writesonic pricing and 20% annual discount.',
  },
  {
    id: 'uizard',
    displayName: 'Uizard',
    pricingUrl: 'https://uizard.io/pricing/',
    offersUrl: 'https://uizard.io/',
    secondaryOfferUrls: [
      { label: 'Uizard Annual Savings', url: 'https://uizard.io/pricing/', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Uizard AI UI wireframing/design pricing and 37% annual discount.',
  },
  {
    id: 'elicit',
    displayName: 'Elicit',
    pricingUrl: 'https://elicit.com/pricing',
    offersUrl: 'https://elicit.com/',
    secondaryOfferUrls: [
      { label: 'Elicit Annual Savings', url: 'https://elicit.com/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Elicit AI research assistant pricing and annual discount.',
  },
  {
    id: 'scite',
    displayName: 'Scite',
    pricingUrl: 'https://scite.ai/pricing',
    offersUrl: 'https://scite.ai/',
    secondaryOfferUrls: [
      { label: 'Scite Annual Savings', url: 'https://scite.ai/pricing', type: 'annual_discount' },
    ],
    strategy: 'PLAYWRIGHT_DOM',
    strategyNotes: 'Official Scite Smart Citations AI platform pricing and 37.5% annual billing discount.',
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
