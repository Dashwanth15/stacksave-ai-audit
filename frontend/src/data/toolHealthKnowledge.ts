// ============================================================
// Tool Health Knowledge — Frontend Subscription Report Data
// Derived from backend/src/knowledge/providers/*.json
// Used exclusively by SubscriptionHealthReport component.
// DO NOT add new backend engines — this is frontend-only.
// ============================================================

export interface QuickFact {
  label: string;
  value: string;
  highlight?: boolean;
  dim?: boolean;
}

export interface PremiumFeature {
  name: string;
  available: boolean;
}

export interface CompetitorSuggestion {
  competitor: string;
  reasons: string[];
}

export interface ToolHealthProfile {
  toolId: string;
  toolName: string;
  primaryRole: string;
  vendor: string;
  premiumFeatures: PremiumFeature[];
  typicallyUsed: string[];
  commonlyUnderutilized: string[];
  subscriptionValueHints: {
    excellent: string;
    average: string;
    poor: string;
  };
  quickFacts: QuickFact[];
  bestUseCases: string[];
  whenToSwitchTo: CompetitorSuggestion[];
  annualDiscountPercent: number;
  annualDiscountNote?: string;
  verdictStrong: string;
  verdictMedium: string;
  verdictWeak: string;
}

export function deriveSubscriptionValue(
  confidenceScore: number | undefined,
  potentialSaving: number,
  currentSpend: number
): 'Excellent' | 'Good' | 'Average' | 'Poor' {
  const score = confidenceScore ?? 70;
  const wasteRatio = currentSpend > 0 ? potentialSaving / currentSpend : 0;
  if (wasteRatio > 0.4) return 'Poor';
  if (wasteRatio > 0.2) return 'Average';
  if (score >= 85 && wasteRatio < 0.05) return 'Excellent';
  return 'Good';
}

const profiles: Record<string, ToolHealthProfile> = {
  cursor: {
    toolId: 'cursor',
    toolName: 'Cursor',
    primaryRole: 'AI IDE',
    vendor: 'Anysphere',
    premiumFeatures: [
      { name: 'AI Agent (terminal + files)', available: true },
      { name: 'Composer (multi-file edits)', available: true },
      { name: 'Codebase vector indexing', available: true },
      { name: 'Tab autocomplete', available: true },
      { name: 'MCP & custom skills', available: true },
      { name: 'Cloud agents', available: true },
      { name: 'Vision input (screenshots)', available: true },
      { name: 'VS Code extension compat.', available: true },
    ],
    typicallyUsed: ['Autocomplete', 'Chat', 'Inline edits'],
    commonlyUnderutilized: ['AI Agent (terminal)', 'Composer (multi-file)', 'Codebase indexing', 'MCP integrations'],
    subscriptionValueHints: {
      excellent: "You're actively using Agent, Composer, and codebase indexing — the features that justify the subscription.",
      average: "You're primarily using autocomplete. Claude Pro or Copilot at $10/mo may be sufficient.",
      poor: "Most premium Cursor features are unused. Consider downgrading or switching to a lighter tool.",
    },
    quickFacts: [
      { label: 'Context', value: '128k tokens', highlight: true },
      { label: 'IDE', value: 'Purpose-built', highlight: true },
      { label: 'Autocomplete', value: '✓ Native', highlight: true },
      { label: 'Terminal Agent', value: '✓ Yes', highlight: true },
      { label: 'Multi-file', value: '✓ Composer', highlight: true },
      { label: 'Voice', value: '✗ No', dim: true },
      { label: 'JetBrains', value: '✗ No', dim: true },
      { label: 'API Access', value: 'IDE only', dim: true },
    ],
    bestUseCases: ['Autonomous software engineering', 'Fullstack codebase search', 'Multi-file refactoring', 'Startup velocity', 'Agent-driven debugging'],
    whenToSwitchTo: [
      { competitor: 'GitHub Copilot', reasons: ['Your team uses JetBrains IDEs', 'Enterprise IP protection and SSO are required', 'You only need reliable autocomplete'] },
      { competitor: 'Windsurf', reasons: ['You want a similar AI IDE at $15/mo instead of $20', 'Budget is the primary constraint'] },
      { competitor: 'Claude', reasons: ['Primary workflow is chat-based reasoning, not IDE editing', 'You need 200k context for large documents'] },
    ],
    annualDiscountPercent: 20,
    annualDiscountNote: 'Switch to annual billing and save $48/year per seat.',
    verdictStrong: "Cursor is your team's highest-leverage AI tool — every premium feature is actively working for you.",
    verdictMedium: "Cursor's subscription is justified for coding workflows, but explore Agent and Composer to unlock its full value.",
    verdictWeak: "You're paying for an AI IDE but only using autocomplete. Explore Agent mode or consider GitHub Copilot at $10/mo.",
  },

  'github-copilot': {
    toolId: 'github-copilot',
    toolName: 'GitHub Copilot',
    primaryRole: 'IDE Assistant',
    vendor: 'GitHub (Microsoft)',
    premiumFeatures: [
      { name: 'Autocomplete (all IDEs)', available: true },
      { name: 'JetBrains native support', available: true },
      { name: 'VS Code native support', available: true },
      { name: 'Chat in IDE', available: true },
      { name: 'Enterprise IP protection', available: true },
      { name: 'SSO & SAML (Business+)', available: true },
      { name: 'Admin console', available: true },
      { name: 'GitHub integration', available: true },
    ],
    typicallyUsed: ['Autocomplete', 'IDE chat', 'GitHub PR suggestions'],
    commonlyUnderutilized: ['Admin console', 'IP exclusion filters', 'Copilot Workspace (agent)', 'Enterprise audit logs'],
    subscriptionValueHints: {
      excellent: "You're using Copilot across JetBrains and VS Code with admin controls enabled — the optimal enterprise setup.",
      average: "You're using basic autocomplete. Individual plan at $10/mo may be all you need.",
      poor: "Copilot Business features (SSO, admin, IP protection) are unused. You're overpaying for autocomplete.",
    },
    quickFacts: [
      { label: 'IDEs', value: 'VS Code + JetBrains', highlight: true },
      { label: 'Autocomplete', value: '✓ Native', highlight: true },
      { label: 'Enterprise', value: '✓ IP Protected', highlight: true },
      { label: 'SSO', value: '✓ Business+', highlight: true },
      { label: 'Context', value: '~32k tokens', dim: true },
      { label: 'Terminal Agent', value: 'Beta only', dim: true },
      { label: 'Multi-file', value: '✗ Limited', dim: true },
      { label: 'Voice', value: '✗ No', dim: true },
    ],
    bestUseCases: ['Enterprise autocomplete standard', 'Multi-IDE corporate environments', 'Secure code generation', 'GitHub-native workflows', 'Compliance-first teams'],
    whenToSwitchTo: [
      { competitor: 'Cursor', reasons: ['You need full AI Agent capabilities (terminal, multi-file)', 'Autonomous engineering tasks are your primary goal'] },
      { competitor: 'Claude', reasons: ['Your team does more analytical writing and research than coding', 'You need a 200k context window for large documents'] },
      { competitor: 'Windsurf', reasons: ['You want Cursor-like features at a lower price point', 'JetBrains compatibility is not required'] },
    ],
    annualDiscountPercent: 19,
    annualDiscountNote: 'Annual billing saves ~19% per seat. Business plan discount available.',
    verdictStrong: 'GitHub Copilot is the enterprise standard — your team is getting strong value across every IDE.',
    verdictMedium: 'Copilot is a solid autocomplete tool. Enable admin controls and IP protection to justify the Business tier cost.',
    verdictWeak: "You're paying Business-tier prices but only using free-tier features. Downgrade to Individual ($10/mo) or switch to Cursor for more capability per dollar.",
  },

  claude: {
    toolId: 'claude',
    toolName: 'Claude',
    primaryRole: 'Reasoning Assistant',
    vendor: 'Anthropic',
    premiumFeatures: [
      { name: 'Extended Thinking (Sonnet)', available: true },
      { name: 'Claude Projects', available: true },
      { name: 'Vision (screenshots, PDFs)', available: true },
      { name: 'Artifacts (web prototypes)', available: true },
      { name: 'Google Drive integration', available: true },
      { name: '200k context window', available: true },
      { name: 'MCP support', available: true },
      { name: 'Document analysis', available: true },
    ],
    typicallyUsed: ['Chat', 'Writing', 'Coding assistance', 'Document analysis'],
    commonlyUnderutilized: ['Claude Projects', 'Artifacts (prototyping)', 'MCP integrations', 'Extended Thinking', 'Google Drive sync'],
    subscriptionValueHints: {
      excellent: "You're using Projects, Artifacts, and extended thinking — the premium capabilities that separate Claude from free models.",
      average: "You're primarily using Claude for basic chat. Projects and Artifacts alone can double your workflow output.",
      poor: "Basic chat usage doesn't justify the Pro subscription. Claude.ai free tier covers the same workflows.",
    },
    quickFacts: [
      { label: 'Context', value: '200k tokens', highlight: true },
      { label: 'Reasoning', value: '✓ Best-in-class', highlight: true },
      { label: 'Vision', value: '✓ Excellent', highlight: true },
      { label: 'Artifacts', value: '✓ Prototyping', highlight: true },
      { label: 'IDE Support', value: 'Third-party only', dim: true },
      { label: 'Voice', value: '✗ Basic only', dim: true },
      { label: 'Web Search', value: '✗ No', dim: true },
      { label: 'Custom GPTs', value: '✗ No', dim: true },
    ],
    bestUseCases: ['Code reasoning & logic', 'Analytical document writing', 'Web app prototyping', 'Long-context document parsing', 'Architecture planning'],
    whenToSwitchTo: [
      { competitor: 'ChatGPT', reasons: ['You need real-time web search (Deep Research)', 'Voice AI is a core part of your workflow', 'You rely on Custom GPTs'] },
      { competitor: 'Gemini', reasons: ['Your team is embedded in Google Workspace', 'You need 1M+ context windows for massive repositories'] },
      { competitor: 'Cursor', reasons: ['IDE-first coding is your primary workflow', 'You need inline autocomplete and terminal agent'] },
    ],
    annualDiscountPercent: 0,
    verdictStrong: "Your Claude subscription is well-aligned with your team's analytical and coding workflows.",
    verdictMedium: 'Claude Pro is solid, but activate Projects and Artifacts to move beyond basic chat.',
    verdictWeak: "Your current usage pattern matches Claude's free tier. Upgrade is only justified if you activate Projects, Artifacts, or MCP workflows.",
  },

  chatgpt: {
    toolId: 'chatgpt',
    toolName: 'ChatGPT',
    primaryRole: 'General AI Assistant',
    vendor: 'OpenAI',
    premiumFeatures: [
      { name: 'Advanced Voice Mode', available: true },
      { name: 'Deep Research', available: true },
      { name: 'Custom GPTs (GPT Store)', available: true },
      { name: 'DALL-E image generation', available: true },
      { name: 'Python code interpreter', available: true },
      { name: 'Memory (cross-session)', available: true },
      { name: 'Google Drive sync', available: true },
      { name: 'Real-time web search', available: true },
    ],
    typicallyUsed: ['Chat', 'Web search', 'Coding assistance', 'Image generation'],
    commonlyUnderutilized: ['Deep Research mode', 'Advanced Voice Mode', 'Custom GPTs', 'Code interpreter (Python)', 'Memory configuration'],
    subscriptionValueHints: {
      excellent: "You're using Deep Research, Voice Mode, and Custom GPTs — the three features that justify ChatGPT Plus over the free tier.",
      average: "You're using it for standard chat and search. The free tier covers 80% of this usage.",
      poor: "Basic chat is covered by the free tier. Plus is only worthwhile if you use Voice Mode, Deep Research, or Custom GPTs regularly.",
    },
    quickFacts: [
      { label: 'Voice AI', value: '✓ Advanced', highlight: true },
      { label: 'Web Search', value: '✓ Real-time', highlight: true },
      { label: 'Custom GPTs', value: '✓ Store access', highlight: true },
      { label: 'Image Gen', value: '✓ DALL-E 3', highlight: true },
      { label: 'Context', value: '128k tokens', highlight: false },
      { label: 'IDE Support', value: '✗ None', dim: true },
      { label: 'Autocomplete', value: '✗ No', dim: true },
      { label: 'API', value: 'Separate pricing', dim: true },
    ],
    bestUseCases: ['Deep research & data aggregation', 'Real-time speech conversation', 'Custom GPT templates', 'Image generation', 'Data analysis with Python'],
    whenToSwitchTo: [
      { competitor: 'Claude', reasons: ['You need superior long-context reasoning (200k vs 128k)', 'Analytical writing quality is paramount', 'You want Claude Artifacts for rapid prototyping'] },
      { competitor: 'Perplexity', reasons: ['Web research with citations is your primary use case', 'You want a more focused research tool at lower cost'] },
      { competitor: 'Cursor', reasons: ['IDE-first coding is your primary workflow', 'You need inline autocomplete and multi-file editing'] },
    ],
    annualDiscountPercent: 23,
    annualDiscountNote: 'Annual billing saves ~23% (~$46/year) on ChatGPT Plus.',
    verdictStrong: 'ChatGPT Plus is delivering strong value — Deep Research and Voice Mode alone justify the subscription.',
    verdictMedium: 'ChatGPT Plus is adequate, but enable Memory and explore Custom GPTs to activate the full subscription value.',
    verdictWeak: "Your ChatGPT usage mirrors the free tier. Switch to annual billing or downgrade — the $20/mo is not earning its keep.",
  },

  gemini: {
    toolId: 'gemini',
    toolName: 'Gemini',
    primaryRole: 'Google Workspace AI',
    vendor: 'Google DeepMind',
    premiumFeatures: [
      { name: 'Gemini Live (voice)', available: true },
      { name: '1M–2M context window', available: true },
      { name: 'Google Workspace sync', available: true },
      { name: 'Gems (custom agents)', available: true },
      { name: 'Google Search grounding', available: true },
      { name: 'Multimodal (video, audio)', available: true },
      { name: 'Google Drive & Docs', available: true },
      { name: 'Deep Research (Pro)', available: true },
    ],
    typicallyUsed: ['Chat', 'Google Docs drafting', 'Web search', 'Summarization'],
    commonlyUnderutilized: ['Gemini Live (voice)', 'Gems (custom agents)', '1M+ context for large repos', 'Video/audio multimodal input'],
    subscriptionValueHints: {
      excellent: "You're fully leveraging Google Workspace integration, Gems, and Gemini Live — capabilities no other AI subscription includes.",
      average: "You're using Gemini for standard chat. If you're not using Google Workspace sync, ChatGPT or Claude offer better general performance.",
      poor: "Gemini Advanced is only worth the subscription if you use Google Workspace deeply or need 1M+ context windows.",
    },
    quickFacts: [
      { label: 'Context', value: '1M–2M tokens', highlight: true },
      { label: 'Google Workspace', value: '✓ Native sync', highlight: true },
      { label: 'Voice', value: '✓ Gemini Live', highlight: true },
      { label: 'Multimodal', value: '✓ Video + Audio', highlight: true },
      { label: 'IDE Support', value: '✗ None native', dim: true },
      { label: 'Autocomplete', value: '✗ No', dim: true },
      { label: 'Custom Agents', value: 'Gems (basic)', dim: false },
      { label: 'Annual Billing', value: '✓ Available', highlight: true },
    ],
    bestUseCases: ['Workspace workflows', 'Massive document analysis', 'Conversational speech Live Mode', 'Google Docs & Gmail drafting', 'Video and image understanding'],
    whenToSwitchTo: [
      { competitor: 'Claude', reasons: ['You need superior reasoning quality', 'Long-document analysis quality matters more than raw context size', 'You want Artifacts for prototyping'] },
      { competitor: 'ChatGPT', reasons: ['You need Custom GPTs or the GPT Store ecosystem', 'Python code interpreter is essential for your work'] },
      { competitor: 'Cursor', reasons: ["Your team's work is primarily software development in an IDE", 'You need inline autocomplete and terminal agents'] },
    ],
    annualDiscountPercent: 17,
    annualDiscountNote: 'Annual billing saves ~17% on Gemini Advanced.',
    verdictStrong: 'Gemini is the best AI subscription for Google Workspace-first teams — Live, Gems, and the 1M context window are uniquely powerful.',
    verdictMedium: 'Gemini Advanced has strong upside, but only if you activate Google Workspace sync and Gemini Live.',
    verdictWeak: "If your team isn't using Google Workspace or the 1M context window, Claude or ChatGPT are better-performing alternatives at similar pricing.",
  },

  'anthropic-api': {
    toolId: 'anthropic-api',
    toolName: 'Anthropic API',
    primaryRole: 'Developer API Platform',
    vendor: 'Anthropic',
    premiumFeatures: [
      { name: 'Claude 3.5 Sonnet (API)', available: true },
      { name: 'Extended Thinking API', available: true },
      { name: 'Tool use / function calling', available: true },
      { name: 'Computer use (beta)', available: true },
      { name: 'Vision & document parsing', available: true },
      { name: 'Prompt caching (30–50% savings)', available: true },
      { name: '200k context via API', available: true },
      { name: 'Batch API processing', available: true },
    ],
    typicallyUsed: ['Chat completions', 'Text generation', 'Code generation'],
    commonlyUnderutilized: ['Extended Thinking', 'Tool use / function calling', 'Prompt caching', 'Computer use', 'Batch API'],
    subscriptionValueHints: {
      excellent: "You're using tool use, prompt caching, and extended thinking — extracting maximum value from every API dollar.",
      average: "You're using the API for basic completions. Prompt caching alone can cut your costs by 30–50%.",
      poor: "High spend with low feature utilization. Optimize with prompt caching and batch processing before scaling.",
    },
    quickFacts: [
      { label: 'Reasoning', value: '✓ Best-in-class', highlight: true },
      { label: 'Context', value: '200k tokens', highlight: true },
      { label: 'Tool Use', value: '✓ Full support', highlight: true },
      { label: 'Prompt Caching', value: '✓ 30–50% off', highlight: true },
      { label: 'Billing', value: 'Usage-based', highlight: true },
      { label: 'IDE', value: 'API integration', dim: false },
      { label: 'Voice', value: '✗ No', dim: true },
      { label: 'Custom GPTs', value: '✗ No', dim: true },
    ],
    bestUseCases: ['AI-powered applications', 'Document processing pipelines', 'Code generation APIs', 'Enterprise AI integrations', 'Research automation'],
    whenToSwitchTo: [
      { competitor: 'OpenAI API', reasons: ['You need GPT-4o multimodal or o1 reasoning models', 'Your team has existing OpenAI tooling', 'You need audio/speech generation'] },
      { competitor: 'Gemini API', reasons: ['You need 1M+ context windows for massive repo indexing', 'Google Cloud infrastructure integration is required'] },
    ],
    annualDiscountPercent: 0,
    verdictStrong: "Your Anthropic API usage is well-optimized — prompt caching and tool use are compounding your ROI.",
    verdictMedium: "Anthropic API is the right choice. Enable prompt caching to immediately cut costs 30–50%.",
    verdictWeak: "High API spend without optimization signals. Activate prompt caching and batch API to reduce costs before scaling further.",
  },

  'openai-api': {
    toolId: 'openai-api',
    toolName: 'OpenAI API',
    primaryRole: 'Developer API Platform',
    vendor: 'OpenAI',
    premiumFeatures: [
      { name: 'GPT-4o multimodal', available: true },
      { name: 'o1 / o1-mini reasoning', available: true },
      { name: 'Function calling', available: true },
      { name: 'Vision & image generation', available: true },
      { name: 'Audio / speech generation', available: true },
      { name: 'Fine-tuning', available: true },
      { name: 'Assistants API (threads)', available: true },
      { name: 'Batch API (50% discount)', available: true },
    ],
    typicallyUsed: ['Chat completions', 'Code generation', 'Embeddings'],
    commonlyUnderutilized: ['o1 reasoning (for complex tasks)', 'Batch API (50% discount)', 'Fine-tuning', 'Assistants API with threads', 'Audio generation'],
    subscriptionValueHints: {
      excellent: "You're using o1 for reasoning, Batch API for cost reduction, and multimodal endpoints — full platform utilization.",
      average: "You're using standard completions. Batch API alone can cut your bill by 50% on asynchronous workloads.",
      poor: "Standard gpt-4o completions at high volume without Batch API or caching is the most expensive configuration.",
    },
    quickFacts: [
      { label: 'Models', value: 'GPT-4o + o1', highlight: true },
      { label: 'Multimodal', value: '✓ Vision + Audio', highlight: true },
      { label: 'Batch API', value: '✓ 50% discount', highlight: true },
      { label: 'Fine-tuning', value: '✓ Available', highlight: true },
      { label: 'Billing', value: 'Usage-based', highlight: true },
      { label: 'Context', value: '128k tokens', dim: false },
      { label: 'Voice TTS', value: '✓ Available', highlight: true },
      { label: 'IDE', value: 'API integration', dim: false },
    ],
    bestUseCases: ['AI-powered web applications', 'Voice interface integrations', 'Multi-modal pipelines', 'Fine-tuned specialized models', 'Research agents'],
    whenToSwitchTo: [
      { competitor: 'Anthropic API', reasons: ['Reasoning quality on complex tasks is the primary metric', 'You need 200k context with high recall accuracy', 'Prompt caching provides better cost structure'] },
      { competitor: 'Gemini API', reasons: ['1M+ context windows are required', 'Google Cloud infrastructure is your primary platform'] },
    ],
    annualDiscountPercent: 0,
    verdictStrong: "Your OpenAI API usage is well-optimized across both GPT-4o and o1 — strong platform coverage.",
    verdictMedium: "OpenAI API is the right foundation. Activate Batch API on all asynchronous workloads to immediately cut costs by 50%.",
    verdictWeak: "Real-time completions at scale without Batch API is the highest-cost configuration. Switch asynchronous tasks to Batch API immediately.",
  },

  windsurf: {
    toolId: 'windsurf',
    toolName: 'Windsurf',
    primaryRole: 'AI IDE',
    vendor: 'Codeium',
    premiumFeatures: [
      { name: 'Cascade AI agent', available: true },
      { name: 'Terminal execution loops', available: true },
      { name: 'Codebase indexing', available: true },
      { name: 'Multi-file editing', available: true },
      { name: 'Autocomplete', available: true },
      { name: 'Vision input', available: true },
    ],
    typicallyUsed: ['Autocomplete', 'Chat', 'Inline edits'],
    commonlyUnderutilized: ['Cascade agent (autonomous tasks)', 'Terminal execution', 'Codebase indexing'],
    subscriptionValueHints: {
      excellent: "You're using Cascade agent, terminal loops, and codebase indexing — getting Cursor-level results at a lower price point.",
      average: "You're using Windsurf as an autocomplete tool. Activate Cascade to justify the subscription cost.",
      poor: "Basic autocomplete at $15/mo can be replaced by GitHub Copilot Individual at $10/mo.",
    },
    quickFacts: [
      { label: 'Price', value: '$15/mo (Pro)', highlight: true },
      { label: 'Agent', value: '✓ Cascade', highlight: true },
      { label: 'Terminal', value: '✓ Loops', highlight: true },
      { label: 'Autocomplete', value: '✓ Native', highlight: true },
      { label: 'IDE', value: 'Windsurf Editor', highlight: true },
      { label: 'JetBrains', value: '✗ No', dim: true },
      { label: 'Voice', value: '✗ No', dim: true },
      { label: 'Context', value: '128k tokens', dim: false },
    ],
    bestUseCases: ['Autonomous refactoring', 'Budget-focused engineering', 'Terminal action command execution', 'Full-stack development', 'Startup teams'],
    whenToSwitchTo: [
      { competitor: 'Cursor', reasons: ['Your team needs JetBrains support', 'A larger ecosystem of extensions is required', 'You want a more established platform'] },
      { competitor: 'GitHub Copilot', reasons: ['Enterprise IP protection and SSO are required', 'Multi-IDE compatibility across VS Code and JetBrains is needed'] },
    ],
    annualDiscountPercent: 20,
    annualDiscountNote: 'Annual billing saves ~20% ($36/year) on Windsurf Pro.',
    verdictStrong: "Windsurf is delivering Cursor-level AI engineering at a 25% lower cost — excellent value.",
    verdictMedium: "Windsurf Pro is solid. Unlock Cascade agent for autonomous tasks to fully justify the subscription.",
    verdictWeak: "If you're only using Windsurf for autocomplete, GitHub Copilot Individual at $10/mo covers the same workflow.",
  },
};

export function getToolHealthProfile(toolId: string): ToolHealthProfile | null {
  return profiles[toolId] ?? null;
}

export default profiles;
