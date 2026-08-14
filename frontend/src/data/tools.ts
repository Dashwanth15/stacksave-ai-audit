// ============================================================
// Tool Catalog — Frontend Display Data
// Plans and pricing verified from official vendor pricing pages.
// Last verified: 2026-05-07
// ============================================================

import type { ToolInfo } from '../types';

export const TOOLS: ToolInfo[] = [
  // ──────────────────────────────────────────────
  // CURSOR — https://cursor.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'cursor',
    name: 'Cursor',
    icon: '⚡',
    category: 'AI IDE',
    description: 'AI-first code editor with Agent, Composer & multi-file editing',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'hobby',
        label: 'Hobby',
        tagline: 'Try AI coding',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['No credit card required', 'Limited Agent requests', 'Limited Tab completions'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: 'Everything in Hobby, plus',
        monthlyPricePerSeat: 20,
        annualPrice: 16,
        billingType: 'per-seat',
        features: ['Extended limits on Agent', 'Access to frontier models', 'MCPs, skills, and hooks', 'Cloud agents'],
      },
      {
        id: 'pro-plus',
        label: 'Pro+',
        tagline: 'Everything in Pro, plus — Recommended',
        monthlyPricePerSeat: 60,
        annualPrice: 48,
        billingType: 'per-seat',
        features: ['3x usage on all OpenAI, Claude, Gemini models', 'Recommended for heavy users'],
      },
      {
        id: 'ultra',
        label: 'Ultra',
        tagline: 'Everything in Pro, plus',
        monthlyPricePerSeat: 200,
        annualPrice: 160,
        billingType: 'per-seat',
        features: ['20x usage on all OpenAI, Claude, Gemini models', 'Priority access to new features'],
      },
      {
        id: 'teams',
        label: 'Teams',
        tagline: 'Everything in Pro, plus — Business Plans',
        monthlyPricePerSeat: 40,
        annualPrice: 32,
        billingType: 'per-seat',
        features: ['Shared chats, commands, and rules', 'Centralized team billing', 'Usage analytics & reporting', 'Org-wide privacy mode controls', 'Role-based access control', 'SAML/OIDC SSO'],
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'Everything in Teams, plus',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isEnterprise: true,
        features: ['Pooled usage', 'Invoice/PO billing', 'SCIM seat management', 'AI code tracking API & audit logs', 'Granular admin & model controls', 'Priority support & account management'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GITHUB COPILOT — https://github.com/features/copilot
  // ──────────────────────────────────────────────
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    icon: '🐙',
    category: 'AI IDE',
    description: 'AI pair programmer for VS Code, JetBrains & Neovim',
    defaultPlan: 'business',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'For verified students & OSS',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['2000 completions/mo', 'Limited chat', 'VS Code & CLI only'],
      },
      {
        id: 'individual',
        label: 'Individual',
        tagline: 'For solo developers',
        monthlyPricePerSeat: 10,
        annualPrice: 8.33,
        billingType: 'per-seat',
        features: ['Unlimited completions', 'Chat in IDE & mobile', 'Multi-model support', 'Copilot Extensions'],
      },
      {
        id: 'business',
        label: 'Business',
        tagline: 'For organizations',
        monthlyPricePerSeat: 19,
        billingType: 'per-seat',
        features: ['Everything in Individual', 'Organization-wide policies', 'Audit logs', 'IP indemnity', 'Content exclusion'],
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'For large enterprises',
        monthlyPricePerSeat: 39,
        billingType: 'per-seat',
        features: ['Everything in Business', 'Fine-tuned models', 'Knowledge bases', 'SAML SSO', 'Bing search grounding'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CLAUDE — https://www.anthropic.com/pricing
  // Verified from screenshots: 2026-05-07
  // ──────────────────────────────────────────────
  {
    id: 'claude',
    name: 'Claude',
    icon: '🤖',
    category: 'AI Chat',
    description: 'Anthropic\'s reasoning AI — 200K context, Claude Code & Cowork',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Meet Claude',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Limited access to Claude 3.5', 'Web, iOS, Android, desktop', 'Extended thinking', 'Built-in web search'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: 'Research, code, and organize',
        monthlyPricePerSeat: 20,
        annualPrice: 17,
        billingType: 'per-seat',
        features: ['Claude Code in your codebase', 'Power through tasks with Cowork', 'Higher usage limits', 'Deep research & analysis', 'Memory across conversations'],
      },
      {
        id: 'max',
        label: 'Max',
        tagline: 'Higher limits, priority access',
        monthlyPricePerSeat: 100,
        billingType: 'per-seat',
        features: ['Up to 20x more usage than Pro', 'Recommended for Claude Code & Cowork', 'Early access to advanced features', 'Higher output limits', 'Priority access at high traffic'],
      },
      {
        id: 'team',
        label: 'Team',
        tagline: 'Predictable usage per seat',
        monthlyPricePerSeat: 25,
        annualPrice: 20,
        billingType: 'per-seat',
        minSeats: 5,
        maxSeats: 150,
        features: ['200K context window', 'Extra usage at API rates', 'Claude Code', 'Central billing & admin', 'SSO & domain capture'],
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'Flexible pooled usage',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isEnterprise: true,
        minSeats: 20,
        features: ['500K context window', 'SCIM provisioning', 'Audit logs', 'Compliance API', 'Custom data retention', 'IP allowlisting'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // CHATGPT — https://openai.com/chatgpt/pricing
  // Verified from screenshots: 2026-05-07
  // ──────────────────────────────────────────────
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    icon: '💬',
    category: 'AI Chat',
    description: 'OpenAI\'s AI assistant — GPT-5.5, Codex & deep research',
    defaultPlan: 'plus',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Intelligence for everyday tasks',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Limited GPT-5.5 Instant', 'Limited messages & uploads', 'Limited deep research', 'Limited Codex access'],
      },
      {
        id: 'go',
        label: 'Go',
        tagline: 'Keep chatting with expanded access',
        monthlyPricePerSeat: 5,
        billingType: 'per-seat',
        // No annual billing available for ChatGPT individual plans
        features: ['More access to GPT-5.5 Instant', 'More messages & uploads', 'More image creation', 'Longer memory'],
      },
      {
        id: 'plus',
        label: 'Plus',
        tagline: 'Do more with advanced intelligence',
        monthlyPricePerSeat: 20,
        billingType: 'per-seat',
        features: ['Advanced reasoning with GPT-5.5 Thinking', 'Expanded messages & uploads', 'More complex image creation', 'Expanded deep research & agent mode'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: 'Maximize your productivity',
        monthlyPricePerSeat: 200,
        billingType: 'per-seat',
        // No annual billing available
        features: ['5x or 20x more usage', '5x 10x or 20x more Codex usage', 'Pro reasoning with GPT-5.5 Pro', 'Maximum Codex tasks', 'Unlimited GPT-5.3 & file uploads'],
      },
      {
        id: 'team',
        label: 'Team',
        tagline: 'For growing teams',
        monthlyPricePerSeat: 25,
        annualPrice: 20.83,
        billingType: 'per-seat',
        minSeats: 2,
        features: ['Higher usage than Plus', 'Admin console', 'Workspace management', 'Data excluded from training'],
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'For large organizations',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isEnterprise: true,
        features: ['Unlimited high-speed access', 'Expanded context window', 'SAML SSO', 'Admin console & analytics', 'Custom data retention'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // ANTHROPIC API — https://www.anthropic.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'anthropic-api',
    name: 'Anthropic API',
    icon: '🔬',
    category: 'API',
    description: 'Claude models via API — usage credits ($20/$50/$100 tiers)',
    defaultPlan: 'pay-as-you-go',
    plans: [
      {
        id: 'pay-as-you-go',
        label: 'Pay As You Go',
        tagline: 'Buy usage credits — $20 (Trying it out), $50 (Recommended), $100 (Best value)',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: ['Claude Sonnet 4: $3/$15 per 1M tokens', 'Claude Haiku 3.5: $0.80/$4 per 1M tokens', 'Claude Opus 3: $15/$75 per 1M tokens', 'Prompt caching: up to 90% savings', 'Batch API: 50% off', 'Credit tiers: $20 / $50 / $100 / Custom'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // OPENAI API — https://openai.com/api/pricing
  // ──────────────────────────────────────────────
  {
    id: 'openai-api',
    name: 'OpenAI API',
    icon: '🌐',
    category: 'API',
    description: 'GPT-4o, GPT-5.5 & embeddings — token-based pricing',
    defaultPlan: 'pay-as-you-go',
    plans: [
      {
        id: 'pay-as-you-go',
        label: 'Pay As You Go',
        tagline: 'Token-based pricing',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: ['GPT-4o: $2.50/$10 per 1M tokens', 'GPT-4o-mini: $0.15/$0.60 per 1M tokens', 'GPT-5.5: varies by model', 'Text embeddings: $0.02 per 1M tokens', 'Usage tiers with rate limits'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GEMINI — https://one.google.com/about/ai-premium
  // Verified from screenshots: 2026-05-07
  // ──────────────────────────────────────────────
  {
    id: 'gemini',
    name: 'Gemini',
    icon: '✨',
    category: 'AI Chat',
    description: 'Google\'s multimodal AI — Gemini 3 Pro, Deep Research & Flow',
    defaultPlan: 'plus',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Basic AI access',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Limited Gemini 3 Pro access', 'Basic chat & search', 'Limited image generation'],
      },
      {
        id: 'plus',
        label: 'Google AI Plus',
        tagline: 'More access to premium features',
        monthlyPricePerSeat: 4.99,
        annualPrice: 4.17,
        billingType: 'flat',
        features: ['More Gemini 3 Pro access', 'Enhanced image generation', 'Nano Banana Pro & Deep Research', 'Google One subscription included', 'Flow AI studio access'],
      },
      {
        id: 'pro',
        label: 'Google AI Pro',
        tagline: 'Higher access to all features',
        monthlyPricePerSeat: 24.99,
        annualPrice: 20.83,
        billingType: 'flat',
        features: ['Higher Gemini 3 Pro access', 'Higher limits to premium features', 'Video generation', 'Early access to new innovations', 'Priority support'],
      },
      {
        id: 'ultra',
        label: 'Google AI Ultra',
        tagline: 'Highest access & exclusive features',
        monthlyPricePerSeat: 249.99,
        billingType: 'flat',
        features: ['Highest Gemini 3 Pro access', 'Highest limits to all features', 'Deep Think & Gemini Agent', 'Exclusive beta features', 'Premium support'],
      },
      {
        id: 'workspace',
        label: 'Workspace Business',
        tagline: 'For Google Workspace teams',
        monthlyPricePerSeat: 20,
        billingType: 'per-seat',
        features: ['Gemini in Gmail, Docs, Sheets', 'AI meeting summaries', 'Enterprise data protection', 'Admin controls'],
      },
      {
        id: 'api',
        label: 'API (AI Studio)',
        tagline: 'Build with Gemini models',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: ['Gemini 1.5 Pro: $1.25/$5 per 1M tokens', 'Gemini 1.5 Flash: $0.075/$0.30 per 1M tokens', 'Free tier: 60 requests/minute', '1M+ token context window'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // WINDSURF — https://windsurf.com/pricing
  // ──────────────────────────────────────────────
  {
    id: 'windsurf',
    name: 'Windsurf',
    icon: '🏄',
    category: 'AI IDE',
    description: 'AI coding IDE by Codeium — Devin Cloud & agentic flows',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Individual Plans',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        // No annual billing for Windsurf
        features: ['Light quota to code with agents', 'Limited model availability', 'Unlimited inline edits', 'Unlimited Tab completions'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: '2 week free trial — Popular',
        monthlyPricePerSeat: 20,
        annualPrice: 15,
        billingType: 'per-seat',
        features: ['Increased quotas, frontier models', 'Full model availability', 'Launch Devin Cloud sessions', 'Purchase extra usage at API pricing'],
      },
      {
        id: 'max',
        label: 'Max',
        tagline: 'New — For power users',
        monthlyPricePerSeat: 200,
        annualPrice: 160,
        billingType: 'per-seat',
        features: ['Everything in Pro, plus', 'Significantly higher quotas', 'Priority model access'],
      },
      {
        id: 'teams',
        label: 'Teams',
        tagline: 'Team Plans',
        monthlyPricePerSeat: 40,
        annualPrice: 32,
        billingType: 'per-seat',
        features: ['Everything in Pro, plus', 'Centralized billing', 'Admin dashboard with analytics'],
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'Everything in Teams, plus',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isEnterprise: true,
        features: ['Highest priority support', 'Dedicated account management', 'Custom contracts', 'SSO & SCIM'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // KIMI — https://kimi.ai (Moonshot AI)
  // Pricing from: Artificial Analysis + OpenRouter screenshots (July 2026)
  // K3 input: $2.80–$3.00/M, output: $14–$15/M (source-dependent, see kimi.json)
  // ──────────────────────────────────────────────
  {
    id: 'kimi',
    name: 'Kimi',
    icon: '🌙',
    category: 'AI Chat',
    description: 'Moonshot AI\'s frontier reasoning model — #1/104 intelligence, 1M context & open weights',
    defaultPlan: 'moderato',
    plans: [
      {
        id: 'moderato',
        label: 'Moderato',
        tagline: 'Advanced Flow ($15/mo)',
        monthlyPricePerSeat: 15,
        annualPrice: 15,
        billingType: 'per-seat',
        features: [
          'More agent credits',
          'Work with Docs, Sheets and Slides',
          'Deep Research',
          'Websites Deploy',
          'Agent multi-tasking',
          'Kimi Code available',
          'Dashboard with task widgets',
          'Scheduled tasks that run automatically and push results',
          'Swarm / Multiple agents',
        ],
      },
      {
        id: 'allegretto',
        label: 'Allegretto',
        tagline: 'Pro Choice ($31/mo)',
        monthlyPricePerSeat: 31,
        annualPrice: 31,
        billingType: 'per-seat',
        features: [
          '2x agent credits',
          'Work with Docs, Sheets and Slides',
          'Deep Research & Websites Deploy',
          'Agent multi-tasking & Kimi Code',
          'Dashboard with task widgets',
          'Scheduled tasks that run automatically and push results',
          'Goal mode, where agents autonomously work until completion',
          'Swarm / Multiple agents',
        ],
      },
      {
        id: 'allegro',
        label: 'Allegro',
        tagline: 'Premium Mode ($79/mo)',
        monthlyPricePerSeat: 79,
        annualPrice: 79,
        billingType: 'per-seat',
        features: [
          '5x agent credits',
          'Up to 1M tokens of context for ultra-long conversations',
          'Work with Docs, Sheets and Slides',
          'Deep Research & Websites Deploy',
          'Agent multi-tasking & Kimi Code',
          'Dashboard with task widgets & scheduled tasks',
          'Goal mode & Swarm multi-agent execution',
        ],
      },
      {
        id: 'vivace',
        label: 'Vivace',
        tagline: 'Ultimate Boost ($159/mo)',
        monthlyPricePerSeat: 159,
        annualPrice: 159,
        billingType: 'per-seat',
        features: [
          '10x agent credits',
          'Up to 1M tokens of context for ultra-long conversations',
          'Work with Docs, Sheets and Slides',
          'Deep Research & Websites Deploy',
          'Agent multi-tasking & Kimi Code',
          'Dashboard with task widgets & scheduled tasks',
          'Goal mode & Swarm multi-agent execution',
        ],
      },
      {
        id: 'api-pay-as-you-go',
        label: 'API Pay As You Go',
        tagline: 'Token-based pricing via API',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: [
          'Kimi K3: Input $2.80–$3.00/M tokens',
          'Kimi K3: Output $14–$15/M tokens',
          'Kimi K2.7 Code: Input $0.475/M, Output $2/M (batch)',
          '1.05M token context window',
        ],
      },
    ],
  },
];

export const USE_CASES = [
  { id: 'coding', label: 'Coding & Development' },
  { id: 'writing', label: 'Writing & Content' },
  { id: 'data', label: 'Data Analysis' },
  { id: 'research', label: 'Research & Summarization' },
  { id: 'mixed', label: 'Mixed / General' },
] as const;

export function getToolById(toolId: string): ToolInfo | undefined {
  return TOOLS.find((t) => t.id === toolId);
}
