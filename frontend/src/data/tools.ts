// ============================================================
// Tool Catalog — Frontend Display Data
// Plans and pricing verified from official vendor pricing pages.
// Last verified: 2026-05-07
// ============================================================

import type { ToolInfo } from '../types';

export const TOOLS: ToolInfo[] = [
  // ──────────────────────────────────────────────
  // GOOGLE ANTIGRAVITY — https://antigravity.google/pricing
  // ──────────────────────────────────────────────
  {
    id: 'antigravity',
    name: 'Google Antigravity',
    icon: '🚀',
    category: 'AI IDE',
    description: 'AI-first developer IDE with autonomous multi-file agentic coding, terminal execution & Google DeepMind intelligence',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Individual developer workspace',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Unlimited Antigravity Tab autocomplete', 'Standard Gemini 2.5 Flash agent requests', 'Basic planning and multi-file code editing'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: 'Solo developer extended quota',
        monthlyPricePerSeat: 20,
        billingType: 'per-seat',
        features: ['Extended Gemini 2.5 Pro agent requests', 'Full terminal integration & subagent orchestration', 'Autonomous browser agent execution', 'Artifacts and custom agent skills'],
      },
      {
        id: 'ultra_100',
        label: 'Ultra (Standard)',
        tagline: '5x developer quota allowance',
        monthlyPricePerSeat: 100,
        billingType: 'per-seat',
        features: ['5x agent request quota allowance', 'Priority access to new frontier models', 'High-speed model inference queue', 'Everything in Pro'],
      },
      {
        id: 'ultra_200',
        label: 'Ultra (Maximum)',
        tagline: '20x power user developer quota',
        monthlyPricePerSeat: 200,
        billingType: 'per-seat',
        features: ['20x agent request quota allowance', 'Maximum compute resources & priority queues', 'Extended background subagent concurrency', 'Everything in Ultra (Standard)'],
      },
      {
        id: 'organization',
        label: 'Enterprise / Organization',
        tagline: 'Google Cloud Gemini Enterprise Agent Platform',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isPayPerUse: true,
        isEnterprise: true,
        features: [
          'Google Cloud & Gemini Enterprise Agent Platform integration',
          'Google Cloud IAM role-based access control (RBAC)',
          'SAML 2.0 and OIDC Single Sign-On (SSO)',
          'VPC Service Controls and enterprise security policy governance',
          'Centralized audit logging and compliance dashboard',
          'Consumption-based Google Cloud billing and pooled enterprise quotas',
        ],
      },
    ],
  },

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

  // ──────────────────────────────────────────────
  // DEEPSEEK — https://deepseek.com
  // Verified from backend/src/knowledge/providers/deepseek/plans.json
  // ──────────────────────────────────────────────
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🐳',
    category: 'AI Chat',
    description: 'High-performance open-reasoning models (DeepSeek-V3 & R1) at fraction of retail cost',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Basic web chat access',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Standard web chat queries', 'DeepSeek-V3 access', 'Basic file context'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: 'Priority R1 reasoning access',
        monthlyPricePerSeat: 15,
        billingType: 'per-seat',
        features: ['Priority R1 reasoning queue', 'Higher message limits', 'Faster throughput'],
      },
      {
        id: 'api',
        label: 'API Pay As You Go',
        tagline: 'Token-based API access',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: ['DeepSeek V3: $0.14/M input, $0.28/M output', 'Off-peak discounts available'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // PERPLEXITY — https://perplexity.ai/hub/pricing
  // Verified from backend/src/knowledge/providers/perplexity/plans.json
  // Static fallback — runtime plans hydrated from GET /api/pricing/providers/perplexity
  // ──────────────────────────────────────────────
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: '🔍',
    category: 'AI Chat',
    description: 'AI-powered search & research — cited web answers, Pro Search & Sonar API',
    defaultPlan: 'pro',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Basic search access',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Standard search queries', 'Limited Pro search queries', 'Basic file uploads'],
      },
      {
        id: 'pro',
        label: 'Pro',
        tagline: '600+ Pro Searches per day',
        monthlyPricePerSeat: 20,
        annualPrice: 16.67,
        billingType: 'per-seat',
        features: ['600+ Pro Searches per day', 'Select model: Sonnet 3.5, GPT-4o, Opus', 'Unlimited file analysis & image generation', '$5/mo API credit included'],
      },
      {
        id: 'max',
        label: 'Max',
        tagline: 'Frontier models, highest limits',
        monthlyPricePerSeat: 200,
        annualPrice: 166.67,
        billingType: 'per-seat',
        features: ['Frontier AI models (highest usage limits)', '35,000 bonus credits/month', '10,000 monthly computer credits', 'Expert research & deep investigation'],
      },
      {
        id: 'education_pro',
        label: 'Education Pro',
        tagline: 'Pro features at academic pricing',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        isPayPerUse: true,
        features: ['All Pro features', 'Verified student/faculty access', 'Institutional pricing where applicable'],
      },
      {
        id: 'enterprise_pro',
        label: 'Enterprise Pro',
        tagline: 'For teams — SSO, admin & compliance',
        monthlyPricePerSeat: 40,
        annualPrice: 33.33,
        billingType: 'per-seat',
        isEnterprise: true,
        minSeats: 1,
        features: ['Everything in Pro', 'Single Sign-On (SSO) & SCIM', 'SOC2 compliance & data privacy', 'Admin controls & pooled credits', '8,500 bonus credits per seat'],
      },
      {
        id: 'enterprise_max',
        label: 'Enterprise Max',
        tagline: 'Maximum reasoning — enterprise scale',
        monthlyPricePerSeat: 325,
        annualPrice: 270.83,
        billingType: 'per-seat',
        isEnterprise: true,
        minSeats: 1,
        features: ['Everything in Enterprise Pro', 'Maximum model reasoning', '40,000 bonus credits per seat', '15,000 computer credits per seat/month'],
      },
      {
        id: 'custom',
        label: 'Custom / Contact Sales',
        tagline: 'Custom enterprise arrangement',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        isPayPerUse: true,
        isEnterprise: true,
        features: ['Custom enterprise configuration', 'Dedicated security & compliance', 'Volume pricing & custom domain'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GROK — https://docs.x.ai
  // Verified from backend/src/knowledge/providers/grok/plans.json
  // ──────────────────────────────────────────────
  {
    id: 'grok',
    name: 'Grok',
    icon: '⚡',
    category: 'AI Chat',
    description: 'xAI\'s flagship reasoning and search models — standalone SuperGrok, X Premium bundles & API',
    defaultPlan: 'supergrok',
    plans: [
      {
        id: 'free',
        label: 'Free',
        tagline: 'Basic Grok access',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: ['Limited Grok web queries', 'Basic search assistance', 'Standard speed'],
      },
      {
        id: 'supergrok_lite',
        label: 'SuperGrok Lite',
        tagline: 'Light standalone access',
        monthlyPricePerSeat: 10,
        billingType: 'per-seat',
        features: ['Increased daily Grok quota', 'Faster response times', 'Enhanced search integration'],
      },
      {
        id: 'supergrok',
        label: 'SuperGrok',
        tagline: 'Full standalone subscription',
        monthlyPricePerSeat: 30,
        annualPrice: 25,
        billingType: 'per-seat',
        features: ['Unrestricted Grok 3 & Grok 4 access', 'DeepSearch & real-time live data', 'High-priority image generation & coding'],
      },
      {
        id: 'supergrok_plus',
        label: 'SuperGrok Plus',
        tagline: 'Heavy usage tier',
        monthlyPricePerSeat: 100,
        billingType: 'per-seat',
        features: ['Higher rate limits & priority execution', 'Advanced reasoning context', 'Power user capabilities'],
      },
      {
        id: 'supergrok_heavy',
        label: 'SuperGrok Heavy',
        tagline: 'Maximum power tier',
        monthlyPricePerSeat: 300,
        billingType: 'per-seat',
        features: ['Highest quota across all Grok models', 'Dedicated compute pool access', 'Instant priority queues'],
      },
      {
        id: 'x_premium',
        label: 'X Premium (Includes Grok)',
        tagline: 'X Platform Bundle',
        monthlyPricePerSeat: 8,
        annualPrice: 7,
        billingType: 'per-seat',
        features: ['Grok access included', 'X Verified Blue Checkmark', 'Edit Posts & 50% Ads reduction'],
      },
      {
        id: 'x_premium_plus',
        label: 'X Premium+ (Includes Grok)',
        tagline: 'X Platform Premium Bundle',
        monthlyPricePerSeat: 40,
        annualPrice: 35,
        billingType: 'per-seat',
        features: ['Highest Grok limits on X', 'Zero Ads in For You', 'Creator Subscriptions & Articles'],
      },
      {
        id: 'api',
        label: 'xAI API (Pay As You Go)',
        tagline: 'Developer API access',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: ['Grok 3: $2/M input, $10/M output', 'Function calling & vision support', 'Pay as you go'],
      },
    ],
  },

  // ──────────────────────────────────────────────
  // GLM (Z.AI) — https://z.ai/pricing & https://z.ai/subscribe
  // ──────────────────────────────────────────────
  {
    id: 'glm',
    name: 'GLM (Z.ai)',
    icon: '🧠',
    category: 'AI Coding',
    description: 'GLM Coding Plan subscription for autonomous AI software engineering via ZCode ADE, Claude Code, Cline, and other coding agents. Powered by frontier GLM-5.3 and GLM-5.3-Flash models with 1M token context.',
    defaultPlan: 'lite',
    plans: [
      {
        id: 'lite',
        label: 'GLM Coding Lite',
        tagline: 'Individual developer entry tier',
        monthlyPricePerSeat: 18,
        annualPrice: 12.60,
        billingType: 'per-seat',
        features: [
          '2,000 credits per 5-hour rolling window',
          '10,000 credits per 7-day weekly quota',
          '50% off-peak credit consumption discount',
          'GLM-5.3 and GLM-5.3-Flash access',
          'Compatible with ZCode, Claude Code, Cline, Roo Code',
        ],
      },
      {
        id: 'pro',
        label: 'GLM Coding Pro',
        tagline: 'Professional developer workloads',
        monthlyPricePerSeat: 80,
        annualPrice: 56.00,
        billingType: 'per-seat',
        features: [
          '12,000 credits per 5-hour rolling window (6x Lite)',
          '60,000 credits per 7-day weekly quota',
          '50% off-peak credit consumption discount',
          'Priority GLM-5.3 and GLM-5.3-Flash inference queues',
          'Everything in Lite',
        ],
      },
      {
        id: 'max',
        label: 'GLM Coding Max',
        tagline: 'Maximum compute for heavy agentic use',
        monthlyPricePerSeat: 168,
        annualPrice: 117.60,
        billingType: 'per-seat',
        features: [
          '28,000 credits per 5-hour rolling window (14x Lite)',
          '140,000 credits per 7-day weekly quota',
          '50% off-peak credit consumption discount',
          'Maximum compute concurrency and priority queues',
          'Everything in Pro',
        ],
      },
      {
        id: 'enterprise',
        label: 'Z.ai Enterprise',
        tagline: 'Custom contract, VPC, SSO & compliance',
        monthlyPricePerSeat: 0,
        billingType: 'custom',
        isPayPerUse: true,
        isEnterprise: true,
        features: [
          'SAML 2.0 / OIDC Single Sign-On (SSO)',
          'Centralized RBAC admin console and audit logs',
          'VPC / on-premise private deployment',
          'Enterprise SLA, zero data retention, custom volume billing',
        ],
      },
      {
        id: 'api',
        label: 'Z.ai Model API',
        tagline: 'Pay-as-you-go token API',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: [
          'GLM-5.3: $1.40/1M input, $4.40/1M output',
          'GLM-5.3-Flash: $0.15/1M input, $0.50/1M output',
          '1M token context window, 128K max output',
          'OpenAI-compatible REST API',
          'Prompt caching with cached-input pricing',
        ],
      },
    ],
  },
  // ──────────────────────────────────────────────
  // MUSE (META) — https://dev.meta.ai/docs/pricing-rate-limits
  // ──────────────────────────────────────────────
  {
    id: 'muse',
    name: 'Muse (Meta)',
    icon: '♾️',
    category: 'AI IDE',
    description: 'Autonomous coding agent, Meta Model API & multimodal intelligence powered by Muse Spark 1.3',
    defaultPlan: 'muse-code-cli',
    plans: [
      {
        id: 'muse-code-cli',
        label: 'Muse Code CLI',
        tagline: 'Free terminal coding agent & client',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: [
          'Free official terminal coding agent and developer client',
          'Autonomous multi-file editing and repository indexing',
          'Integration with Muse Spark 1.3 and Muse Spark 1.2',
          'Zero monthly subscription fee',
        ],
      },
      {
        id: 'model-api-standard',
        label: 'Meta Model API (Standard)',
        tagline: 'Pay-per-use token API with standard data policy',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: [
          'Pay-per-use token inference for Muse Spark 1.3',
          'Input: $1.25 / 1M tokens, Cached: $0.15 / 1M tokens',
          'Output: $4.25 / 1M tokens',
          'Standard policy: prompts and completions not used to train models',
          'No monthly seat fee',
        ],
      },
      {
        id: 'model-api-contributor',
        label: 'Meta Model API (Contributor)',
        tagline: 'Discounted token API with contributor training policy',
        monthlyPricePerSeat: 0,
        billingType: 'usage-based',
        isPayPerUse: true,
        features: [
          'Discounted pay-per-use token inference for Muse Spark 1.3',
          'Input: $0.10 / 1M tokens, Cached: $0.002 / 1M tokens',
          'Output: $0.20 / 1M tokens',
          'Contributor policy: data may train future Meta models',
          'No monthly seat fee',
        ],
      },
      {
        id: 'muse-free',
        label: 'Muse Personal Agent Free',
        tagline: 'Free web and personal AI assistant',
        monthlyPricePerSeat: 0,
        billingType: 'per-seat',
        features: [
          'Free web and personal AI assistant interface',
          'Multimodal reasoning, text, vision, and planning',
          'Powered by Muse Spark models',
          'Zero subscription cost',
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
