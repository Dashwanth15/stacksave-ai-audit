// ============================================================
// Tool Pricing Catalog — StackSave AI Audit
// All prices verified from official vendor pricing pages.
// Sources documented in /PRICING_DATA.md
// Last verified: 2026-05-07
//
// ⚠️  IMPORTANT — Pricing sync system (pricing/) now runs every 24h.
// Use getVerifiedPricing(toolId) to retrieve the latest DB-backed
// price before falling back to the static plans below.
// ============================================================

import { ToolCatalog } from '../types';

// ── DB-backed pricing lookup ──────────────────────────────────
// Lazy import to avoid circular deps and to allow catalog to work
// in tests without a DB connection.
import type { NormalizedPlan } from '../pricing/types';

/**
 * Attempt to retrieve the latest VERIFIED pricing for a tool from
 * the PricingSource collection. Returns null if:
 *   - DB not available
 *   - No record exists
 *   - Status is not VERIFIED (i.e. STALE / FETCH_BLOCKED / etc.)
 *
 * Callers should fall back to the static catalog plans when this
 * returns null, and clearly indicate to users that prices may be stale.
 */
export async function getVerifiedPricing(toolId: string): Promise<{
  plans: NormalizedPlan[];
  lastVerifiedAt: Date;
  status: string;
} | null> {
  try {
    // Dynamic import so catalog can be used offline / in tests
    const { PricingSourceModel } = await import('../services/dbService');
    const source = await PricingSourceModel.findOne({ providerId: toolId }).lean();
    if (!source) return null;
    if (source.status !== 'VERIFIED') {
      // Return the record anyway so callers can show status + lastVerifiedAt
      return {
        plans: (source.plans ?? []) as NormalizedPlan[],
        lastVerifiedAt: source.lastVerifiedAt ?? source.lastSyncedAt,
        status: source.status,
      };
    }
    return {
      plans: (source.plans ?? []) as NormalizedPlan[],
      lastVerifiedAt: source.lastVerifiedAt!,
      status: source.status,
    };
  } catch {
    // DB not available — silently return null so catalog falls back to hardcoded
    return null;
  }
}

export const TOOL_CATALOG: ToolCatalog[] = [
  // ──────────────────────────────────────────────
  // GOOGLE ANTIGRAVITY
  // Source: https://antigravity.google/pricing
  // ──────────────────────────────────────────────
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    category: 'ide',
    useCases: ['coding'],
    pricingUrl: 'https://antigravity.google/pricing',
    pricingVerifiedDate: '2026-09-09',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20 },
      { id: 'ultra_100', label: 'Ultra (Standard)', monthlyPricePerSeat: 100 },
      { id: 'ultra_200', label: 'Ultra (Maximum)', monthlyPricePerSeat: 200 },
      { id: 'organization', label: 'Enterprise / Organization', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
    alternatives: [
      {
        toolId: 'cursor',
        toolName: 'Cursor',
        reason: 'Both are frontier AI-first code editors with multi-file agentic capabilities and fast tab autocomplete.',
        estimatedSaving: '$0 — comparable Pro tier at $20/user/mo',
      },
      {
        toolId: 'windsurf',
        toolName: 'Windsurf',
        reason: 'Windsurf Pro ($15/user/mo) offers flow-based AI coding at a lower monthly price point.',
        estimatedSaving: '~$5/user/mo savings with Windsurf Pro',
      },
      {
        toolId: 'github-copilot',
        toolName: 'GitHub Copilot',
        reason: 'GitHub Copilot Business ($19/user/mo) integrates into existing VS Code / JetBrains setups.',
        estimatedSaving: '~$1/user/mo savings with Copilot Business',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CURSOR
  // Source: https://cursor.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'cursor',
    name: 'Cursor',
    category: 'ide',
    useCases: ['coding'],
    pricingUrl: 'https://cursor.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      { id: 'hobby', label: 'Hobby', monthlyPricePerSeat: 0, annualPricePerSeat: 0 },
      { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 16 },
      { id: 'pro-plus', label: 'Pro+', monthlyPricePerSeat: 60, annualPricePerSeat: 48 },
      { id: 'ultra', label: 'Ultra', monthlyPricePerSeat: 200, annualPricePerSeat: 160 },
      { id: 'teams', label: 'Teams', monthlyPricePerSeat: 40, annualPricePerSeat: 32 },
      { id: 'enterprise', label: 'Enterprise', monthlyPricePerSeat: 0 },
    ],
    alternatives: [
      {
        toolId: 'windsurf',
        toolName: 'Windsurf',
        reason: 'Similar AI coding capabilities, Pro plan at $15/user/mo vs Cursor Pro at $20/user/mo',
        estimatedSaving: '~$5/user/mo',
      },
      {
        toolId: 'github-copilot',
        toolName: 'GitHub Copilot',
        reason: 'For teams primarily using VS Code, Copilot offers comparable completions at $10/user/mo Individual',
        estimatedSaving: '~$10/user/mo',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GITHUB COPILOT
  // Source: https://github.com/features/copilot#pricing
  // ──────────────────────────────────────────────
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ide',
    useCases: ['coding'],
    pricingUrl: 'https://github.com/features/copilot#pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'individual',
        label: 'Individual',
        monthlyPricePerSeat: 10,
        annualPricePerSeat: 8.33,
      },
      {
        id: 'business',
        label: 'Business',
        monthlyPricePerSeat: 19,
        annualPricePerSeat: 19,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: 39,
        annualPricePerSeat: 39,
      },
    ],
    alternatives: [
      {
        toolId: 'cursor',
        toolName: 'Cursor',
        reason: 'For teams needing more context-aware completions and a purpose-built AI IDE',
        estimatedSaving: 'Variable — Cursor Pro is $20/user/mo',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CLAUDE (Anthropic)
  // Source: https://www.anthropic.com/pricing
  // Updated: Pro $17 annual / $20 monthly
  // ──────────────────────────────────────────────
  {
    id: 'claude',
    name: 'Claude',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://www.anthropic.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'pro',
        label: 'Pro',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: 17,
      },
      {
        id: 'max',
        label: 'Max',
        monthlyPricePerSeat: 100,
        annualPricePerSeat: 100,
      },
      {
        id: 'team',
        label: 'Team',
        monthlyPricePerSeat: 25,
        annualPricePerSeat: 20,
        minSeats: 5,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: 0,
      },
    ],
    alternatives: [
      {
        toolId: 'chatgpt',
        toolName: 'ChatGPT',
        reason: 'For general writing and research tasks, ChatGPT Plus offers comparable capability at the same $20/user/mo price point',
        estimatedSaving: '$0 — same price, evaluate by feature fit',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CHATGPT (OpenAI)
  // Source: https://openai.com/chatgpt/pricing
  // Updated: Added Go ($5) and Pro ($200) tiers
  // ──────────────────────────────────────────────
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://openai.com/chatgpt/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'go',
        label: 'Go',
        monthlyPricePerSeat: 5,
      },
      {
        id: 'plus',
        label: 'Plus',
        monthlyPricePerSeat: 20,
      },
      {
        id: 'pro',
        label: 'Pro',
        monthlyPricePerSeat: 200,
      },
      {
        id: 'team',
        label: 'Team',
        monthlyPricePerSeat: 25,
        annualPricePerSeat: 20.83,
        minSeats: 2,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: 0,
      },
    ],
    alternatives: [
      {
        toolId: 'claude',
        toolName: 'Claude',
        reason: 'For long-document analysis and writing tasks, Claude Pro offers a 200k context window at same price',
        estimatedSaving: '$0 — same price, superior context window',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // ANTHROPIC API
  // Source: https://www.anthropic.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    category: 'api',
    useCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    pricingUrl: 'https://www.anthropic.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'pay-as-you-go',
        label: 'Pay As You Go',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
      },
    ],
    alternatives: [
      {
        toolId: 'openai-api',
        toolName: 'OpenAI API',
        reason: 'For high-volume inference, compare per-token costs: Claude Sonnet 3.5 vs GPT-4o pricing varies by use case',
        estimatedSaving: 'Variable by usage volume',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // OPENAI API
  // Source: https://openai.com/api/pricing
  // ──────────────────────────────────────────────
  {
    id: 'openai-api',
    name: 'OpenAI API',
    category: 'api',
    useCases: ['coding', 'writing', 'data', 'research', 'mixed'],
    pricingUrl: 'https://openai.com/api/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'pay-as-you-go',
        label: 'Pay As You Go',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
      },
    ],
    alternatives: [
      {
        toolId: 'anthropic-api',
        toolName: 'Anthropic API',
        reason: 'Claude Haiku is often more cost-effective for high-volume structured tasks vs GPT-4o-mini',
        estimatedSaving: 'Variable — benchmark your specific workload',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GEMINI (Google)
  // Source: https://one.google.com/about/ai-premium
  // Updated: Plus/Pro/Ultra tiers, Workspace, API
  // ──────────────────────────────────────────────
  {
    id: 'gemini',
    name: 'Gemini',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://one.google.com/about/ai-premium',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'plus',
        label: 'Google AI Plus',
        monthlyPricePerSeat: 4.99,
        annualPricePerSeat: 4.17,
      },
      {
        id: 'pro',
        label: 'Google AI Pro',
        monthlyPricePerSeat: 24.99,
        annualPricePerSeat: 20.83,
      },
      {
        id: 'ultra',
        label: 'Google AI Ultra',
        monthlyPricePerSeat: 249.99,
      },
      {
        id: 'workspace',
        label: 'Workspace Business',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: 20,
      },
      {
        id: 'api',
        label: 'API (AI Studio)',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
      },
    ],
    alternatives: [
      {
        toolId: 'claude',
        toolName: 'Claude',
        reason: 'For teams not using Google Workspace, Claude Pro matches Gemini pricing with stronger reasoning on most benchmarks',
        estimatedSaving: '$0 — same price tier, evaluate by workflow fit',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // WINDSURF (Codeium)
  // Source: https://windsurf.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'windsurf',
    name: 'Windsurf',
    category: 'ide',
    useCases: ['coding'],
    pricingUrl: 'https://windsurf.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 15 },
      { id: 'max', label: 'Max', monthlyPricePerSeat: 200, annualPricePerSeat: 160 },
      { id: 'teams', label: 'Teams', monthlyPricePerSeat: 40, annualPricePerSeat: 32 },
      { id: 'enterprise', label: 'Enterprise', monthlyPricePerSeat: 0 },
    ],
    alternatives: [
      {
        toolId: 'cursor',
        toolName: 'Cursor',
        reason: 'For teams needing the most advanced agentic coding (multi-file edits, composer), Cursor Pro provides deeper capabilities',
        estimatedSaving: 'Same price at $20/user/mo — evaluate by feature fit',
      },
    ],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'search',
    useCases: ['research'],
    pricingUrl: 'https://perplexity.ai/hub/pricing',
    pricingVerifiedDate: '2026-09-08',
    plans: [
      { id: 'free', label: 'Free', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 16.67 },
      { id: 'max', label: 'Max', monthlyPricePerSeat: 200, annualPricePerSeat: 166.67 },
      { id: 'education_pro', label: 'Education Pro', monthlyPricePerSeat: 0, isPayPerUse: true },
      { id: 'enterprise_pro', label: 'Enterprise Pro', monthlyPricePerSeat: 40, annualPricePerSeat: 33.33, minSeats: 1 },
      { id: 'enterprise_max', label: 'Enterprise Max', monthlyPricePerSeat: 325, annualPricePerSeat: 270.83, minSeats: 1 },
      { id: 'custom', label: 'Custom / Contact Sales', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'api',
    useCases: ['coding', 'data'],
    pricingUrl: 'https://deepseek.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      { id: 'api', label: 'API (Pay As You Go)', monthlyPricePerSeat: 0, isPayPerUse: true }
    ]
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    category: 'api',
    useCases: ['coding'],
    pricingUrl: 'https://openai.com/pricing',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      { id: 'api', label: 'API Tier', monthlyPricePerSeat: 0, isPayPerUse: true }
    ]
  },
  {
    id: 'github-models',
    name: 'GitHub Models',
    category: 'api',
    useCases: ['coding', 'research'],
    pricingUrl: 'https://github.com/features/models',
    pricingVerifiedDate: '2026-05-07',
    plans: [
      { id: 'free', label: 'Free Tier', monthlyPricePerSeat: 0 },
      { id: 'pro', label: 'Developer Tier', monthlyPricePerSeat: 15 }
    ]
  },

  // ──────────────────────────────────────────────
  // KIMI (Moonshot AI)
  // Source: Artificial Analysis + OpenRouter screenshots (July 2026)
  // Kimi K3: API-based, usage-based pricing via providers
  // Kimi K3 input: $2.80–$3.00/M tokens (source-dependent, see kimi.json)
  // Kimi K3 output: $14–$15/M tokens (source-dependent)
  // ──────────────────────────────────────────────
  {
    id: 'kimi',
    name: 'Kimi',
    category: 'chat',
    useCases: ['coding', 'research', 'data', 'mixed'],
    pricingUrl: 'https://kimi.ai',
    pricingVerifiedDate: '2026-07-01',
    plans: [
      {
        id: 'pay-as-you-go',
        label: 'API Pay As You Go',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
      },
    ],
    alternatives: [
      {
        toolId: 'claude',
        toolName: 'Claude',
        reason: 'Both are top-tier reasoning models. Claude offers consumer subscription plans with team billing; Kimi K3 is API-only with open weights and a larger 1M context window.',
        estimatedSaving: 'Variable — Kimi K3 input from $2.80/M tokens vs Claude API pricing',
      },
      {
        toolId: 'chatgpt',
        toolName: 'ChatGPT',
        reason: 'ChatGPT offers consumer subscriptions with voice, memory, and plugin ecosystem. Kimi K3 offers superior intelligence benchmarks and ultra-long 1M context.',
        estimatedSaving: 'Variable by usage pattern',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GROK (xAI)
  // Source: https://docs.x.ai, https://grok.com, https://x.com/i/premium_sign_up
  // Updated: 2026-09-08
  // ──────────────────────────────────────────────
  {
    id: 'grok',
    name: 'Grok',
    category: 'chat',
    useCases: ['coding', 'research', 'writing', 'data', 'mixed'],
    pricingUrl: 'https://docs.x.ai',
    pricingVerifiedDate: '2026-09-08',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'supergrok_lite',
        label: 'SuperGrok Lite',
        monthlyPricePerSeat: 10,
      },
      {
        id: 'supergrok',
        label: 'SuperGrok',
        monthlyPricePerSeat: 30,
        annualPricePerSeat: 25,
      },
      {
        id: 'supergrok_plus',
        label: 'SuperGrok Plus',
        monthlyPricePerSeat: 100,
      },
      {
        id: 'supergrok_heavy',
        label: 'SuperGrok Heavy',
        monthlyPricePerSeat: 300,
      },
      {
        id: 'x_premium',
        label: 'X Premium (Includes Grok)',
        monthlyPricePerSeat: 8,
        annualPricePerSeat: 7,
      },
      {
        id: 'x_premium_plus',
        label: 'X Premium+ (Includes Grok)',
        monthlyPricePerSeat: 40,
        annualPricePerSeat: 35,
      },
      {
        id: 'api',
        label: 'xAI API (Pay As You Go)',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
      },
    ],
    alternatives: [
      {
        toolId: 'claude',
        toolName: 'Claude',
        reason: 'For deep reasoning, document analysis, and coding, Claude Pro ($20/mo) provides high context efficiency.',
        estimatedSaving: '$10/mo savings compared to SuperGrok ($30/mo)',
      },
      {
        toolId: 'perplexity',
        toolName: 'Perplexity',
        reason: 'For multi-engine web research and citation-rich search, Perplexity Pro ($20/mo) offers unified search capabilities.',
        estimatedSaving: '$10/mo savings compared to SuperGrok ($30/mo)',
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GLM (Z.AI)
  // Source: https://z.ai/pricing & https://z.ai/subscribe
  // ──────────────────────────────────────────────
  {
    id: 'glm',
    name: 'GLM (Z.ai)',
    category: 'ide',
    useCases: ['coding'],
    pricingUrl: 'https://z.ai/subscribe',
    pricingVerifiedDate: '2026-09-09',
    plans: [
      { id: 'lite', label: 'GLM Coding Lite', monthlyPricePerSeat: 18, annualPricePerSeat: 12.60 },
      { id: 'pro', label: 'GLM Coding Pro', monthlyPricePerSeat: 80, annualPricePerSeat: 56.00 },
      { id: 'max', label: 'GLM Coding Max', monthlyPricePerSeat: 168, annualPricePerSeat: 117.60 },
      { id: 'enterprise', label: 'Z.ai Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true },
      { id: 'api', label: 'Z.ai Model API', monthlyPricePerSeat: 0, isPayPerUse: true },
    ],
    alternatives: [
      {
        toolId: 'cursor',
        toolName: 'Cursor',
        reason: 'Cursor Pro ($20/user/mo) offers native IDE coding with frontier models.',
        estimatedSaving: '~$60/user/mo savings compared to GLM Coding Pro ($80/mo)',
      },
      {
        toolId: 'windsurf',
        toolName: 'Windsurf',
        reason: 'Windsurf Pro ($15/user/mo) offers low-latency flow-based AI coding.',
        estimatedSaving: '~$3/user/mo savings compared to GLM Coding Lite ($18/mo)',
      },
      {
        toolId: 'antigravity',
        toolName: 'Google Antigravity',
        reason: 'Google Antigravity Pro ($20/user/mo) offers multi-file autonomous agentic coding.',
        estimatedSaving: '~$60/user/mo savings compared to GLM Coding Pro ($80/mo)',
      },
    ],
  }
];

// Helper: find a tool by ID
export function getToolById(toolId: string): ToolCatalog | undefined {
  return TOOL_CATALOG.find((t) => t.id === toolId);
}

// Helper: find the cheapest plan for a tool that fits the use case
export function getCheapestPaidPlan(toolId: string): { price: number; planLabel: string } | null {
  const tool = getToolById(toolId);
  if (!tool) return null;

  const paidPlans = tool.plans.filter((p) => p.monthlyPricePerSeat > 0 && !p.isPayPerUse);
  if (paidPlans.length === 0) return null;

  const cheapest = paidPlans.reduce((min, p) =>
    p.monthlyPricePerSeat < min.monthlyPricePerSeat ? p : min
  );

  return { price: cheapest.monthlyPricePerSeat, planLabel: cheapest.label };
}
