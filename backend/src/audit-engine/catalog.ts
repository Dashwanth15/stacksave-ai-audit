// ============================================================
// Tool Pricing Catalog — StackSave AI Audit
// All prices verified from official vendor pricing pages.
// Sources documented in /PRICING_DATA.md
// Last verified: 2026-05-06
// ============================================================

import { ToolCatalog } from '../types';

export const TOOL_CATALOG: ToolCatalog[] = [
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
    pricingVerifiedDate: '2026-05-06',
    plans: [
      {
        id: 'hobby',
        label: 'Hobby',
        monthlyPricePerSeat: 0,
        annualPricePerSeat: 0,
      },
      {
        id: 'pro',
        label: 'Pro',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: 16, // $192/yr = $16/mo billed annually
      },
      {
        id: 'business',
        label: 'Business',
        monthlyPricePerSeat: 40,
        annualPricePerSeat: 40,
      },
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
    pricingVerifiedDate: '2026-05-06',
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
        annualPricePerSeat: 8.33, // $100/yr
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
  // ──────────────────────────────────────────────
  {
    id: 'claude',
    name: 'Claude',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://www.anthropic.com/pricing',
    pricingVerifiedDate: '2026-05-06',
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
        annualPricePerSeat: 18, // $216/yr
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
        annualPricePerSeat: 25,
        minSeats: 5,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: 0, // custom pricing
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
  // ──────────────────────────────────────────────
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://openai.com/chatgpt/pricing',
    pricingVerifiedDate: '2026-05-06',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'plus',
        label: 'Plus',
        monthlyPricePerSeat: 20,
        annualPricePerSeat: 20,
      },
      {
        id: 'team',
        label: 'Team',
        monthlyPricePerSeat: 25,
        annualPricePerSeat: 20.83, // $250/yr per user
        minSeats: 2,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        monthlyPricePerSeat: 0, // custom
      },
      {
        id: 'api',
        label: 'API Direct',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
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
    pricingVerifiedDate: '2026-05-06',
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
    pricingVerifiedDate: '2026-05-06',
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
  // ──────────────────────────────────────────────
  {
    id: 'gemini',
    name: 'Gemini',
    category: 'chat',
    useCases: ['writing', 'research', 'coding', 'data', 'mixed'],
    pricingUrl: 'https://one.google.com/about/ai-premium',
    pricingVerifiedDate: '2026-05-06',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'advanced',
        label: 'Advanced (Google One AI Premium)',
        monthlyPricePerSeat: 19.99,
        annualPricePerSeat: 19.99,
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
        reason: 'For teams not using Google Workspace, Claude Pro matches Gemini Advanced pricing with stronger reasoning performance on most benchmarks',
        estimatedSaving: '$0 — same price, evaluate by workflow fit',
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
    pricingVerifiedDate: '2026-05-06',
    plans: [
      {
        id: 'free',
        label: 'Free',
        monthlyPricePerSeat: 0,
      },
      {
        id: 'pro',
        label: 'Pro',
        monthlyPricePerSeat: 15,
        annualPricePerSeat: 12, // $144/yr
      },
      {
        id: 'teams',
        label: 'Teams',
        monthlyPricePerSeat: 35,
        annualPricePerSeat: 30,
      },
    ],
    alternatives: [
      {
        toolId: 'cursor',
        toolName: 'Cursor',
        reason: 'For teams needing the most advanced agentic coding (multi-file edits, composer), Cursor Pro provides deeper capabilities',
        estimatedSaving: 'Cursor Pro costs $5/user/mo more but may increase productivity',
      },
    ],
  },
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
