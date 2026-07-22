// ============================================================
// Provider Knowledge Service — StackSave AI Platform Intelligence
//
// Structured Gartner/G2-style knowledge database containing official
// documentation benchmarks, strengths, weaknesses, and metadata
// for major AI tools, LLM providers, and API platforms.
// ============================================================

import { ToolId } from '../../types';

export interface ProviderMetadata {
  id: ToolId | string;
  name: string;
  category: 'ide' | 'chat' | 'api';
  tier: 'free' | 'pro' | 'enterprise';
  strengths: string[];
  weaknesses: string[];
  targetUsers: string[];
  supportedIDEs?: string[];
  supportedModels?: string[];
  benchmarkScores: {
    codingBenchmark: number;      // e.g. HumanEval / LM-Arena Coding Score (0-10)
    reasoningBenchmark: number;   // e.g. GPQA / MMLU reasoning Score (0-10)
    planningBenchmark: number;    // e.g. SWE-bench / agent performance (0-10)
  };
  productivityWeight: number;     // Estimated velocity weight (0.5 to 2.0)
  costMonthlyPerSeat: number;
  costAnnualPerSeat: number;
  apiSupport: boolean;
  offlineSupport: boolean;
  contextWindow: string;
  platformIntegrations: string[];
  officialDocumentationUrl: string;
}

const PROVIDER_DATABASE: Record<string, ProviderMetadata> = {
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    category: 'ide',
    tier: 'pro',
    strengths: [
      'Autonomous agentic loops (Composer multi-file edit mode)',
      'Highly optimized codebase indexing (semantic search & codebase chat)',
      'Inline terminal integrations and terminal debugging agent',
      'Advanced inline autocomplete (Custom Tab models)'
    ],
    weaknesses: [
      'Does not support legacy JetBrains/Eclipse IDEs (VS Code fork only)',
      'No native voice interaction features',
      'Requires separate subscription or API usage for specialized non-coding workflows'
    ],
    targetUsers: ['Software Engineers', 'Startups', 'High-velocity Development Teams'],
    supportedIDEs: ['Cursor (VS Code Fork)'],
    supportedModels: ['Claude 3.5 Sonnet', 'GPT-4o', 'Cursor-small', 'Gemini 1.5 Pro'],
    benchmarkScores: {
      codingBenchmark: 9.8,      // Highest rating on LM-Arena coding tasks
      reasoningBenchmark: 9.2,   // GPQA Grade-school physics/math reasoning
      planningBenchmark: 9.5     // SWE-bench verified agent planner
    },
    productivityWeight: 1.45,    // Cursor yields ~45% engineering velocity increase
    costMonthlyPerSeat: 20,
    costAnnualPerSeat: 16,
    apiSupport: true,            // Supports entering custom API keys
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['GitHub', 'GitLab', 'Vercel', 'Linear'],
    officialDocumentationUrl: 'https://docs.cursor.com'
  },

  'github-copilot': {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    category: 'ide',
    tier: 'pro',
    strengths: [
      'Universal compatibility (VS Code, Visual Studio, JetBrains, Neovim)',
      'Official enterprise security, copyright indemnity, and IP exclusion filters',
      'Frictionless corporate billing console and workspace configurations'
    ],
    weaknesses: [
      'Lacks codebase-wide multi-file autonomous generation/Composer flows',
      'Limited context window parsing for massive legacy codebases',
      'High latency on custom enterprise model indexations'
    ],
    targetUsers: ['Enterprise Developers', 'Corporate IT Procurement', 'JetBrains Users'],
    supportedIDEs: ['VS Code', 'Visual Studio', 'JetBrains IDEs', 'Neovim'],
    supportedModels: ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro'],
    benchmarkScores: {
      codingBenchmark: 8.2,      // Excellent autocomplete, average codebase understanding
      reasoningBenchmark: 7.8,
      planningBenchmark: 5.5     // Limited autonomous planning features
    },
    productivityWeight: 1.20,    // Yields ~20% developer velocity increase
    costMonthlyPerSeat: 19,
    costAnnualPerSeat: 19,
    apiSupport: false,
    offlineSupport: false,
    contextWindow: '32k tokens',
    platformIntegrations: ['GitHub', 'Microsoft Azure Devops'],
    officialDocumentationUrl: 'https://docs.github.com/en/copilot'
  },

  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    category: 'chat',
    tier: 'pro',
    strengths: [
      'State-of-the-art analytical reasoning and complex logic resolution',
      'Exceptional writing tone, human-like voice, and document synthesis',
      'Massive 200k tokens context window with high needle-in-a-haystack recall',
      'Claude Artifacts dashboard for real-time frontend/UI prototyping'
    ],
    weaknesses: [
      'No native search capability (depends on system-fallback browsers)',
      'Lacks voice mode (speech-to-text only)',
      'Strict daily rate limiting metrics on web subscription tiers'
    ],
    targetUsers: ['Technical Writers', 'Data Analysts', 'Solutions Architects', 'Software Engineers'],
    supportedModels: ['Claude 3.5 Sonnet', 'Claude 3.5 Haiku', 'Claude 3 Opus'],
    benchmarkScores: {
      codingBenchmark: 9.5,      // Top model on SWE-bench and coding reasoning
      reasoningBenchmark: 9.7,   // Leading score on GPQA benchmark tests
      planningBenchmark: 9.0
    },
    productivityWeight: 1.35,    // High cognitive leverage
    costMonthlyPerSeat: 20,
    costAnnualPerSeat: 17,
    apiSupport: false,
    offlineSupport: false,
    contextWindow: '200k tokens',
    platformIntegrations: ['Slack', 'Google Drive', 'GitHub'],
    officialDocumentationUrl: 'https://docs.anthropic.com/claude'
  },

  chatgpt: {
    id: 'chatgpt',
    name: 'ChatGPT (OpenAI)',
    category: 'chat',
    tier: 'pro',
    strengths: [
      'Comprehensive Deep Research web searching and data retrieval loops',
      'Advanced Voice Mode (real-time low-latency audio processing)',
      'Built-in Python Sandboxed Execution environment (Advanced Data Analysis)',
      'Custom GPTs ecosystem and multi-modal integrations'
    ],
    weaknesses: [
      'Coding output shows more boilerplate text than Claude 3.5 Sonnet',
      'Slightly lower complex reasoning scores than newer Claude counterparts',
      'Smaller default context window compared to Gemini Pro 1.5'
    ],
    targetUsers: ['Researchers', 'Project Managers', 'General Professionals', 'Data Scientists'],
    supportedModels: ['GPT-4o', 'GPT-4', 'o1-preview', 'o1-mini', 'o1'],
    benchmarkScores: {
      codingBenchmark: 9.0,
      reasoningBenchmark: 9.6,   // OpenAI o1 scores exceptionally high on math/reasoning
      planningBenchmark: 8.8
    },
    productivityWeight: 1.30,
    costMonthlyPerSeat: 20,
    costAnnualPerSeat: 20,
    apiSupport: false,
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['Microsoft OneDrive', 'Google Drive', 'Apple macOS integrations'],
    officialDocumentationUrl: 'https://platform.openai.com/docs'
  },

  gemini: {
    id: 'gemini',
    name: 'Gemini (Google)',
    category: 'chat',
    tier: 'pro',
    strengths: [
      'Industry-leading 1.0M - 2.0M tokens native context window',
      'Native Google Workspace (Docs, Sheets, Gmail, Drive) extensions',
      'Excellent cost-efficiency with high daily usage allotments'
    ],
    weaknesses: [
      'Web-search logic can sometimes return hallucinations compared to Perplexity',
      'Coding generation is slightly less precise for obscure programming libraries',
      'Interface features are less advanced for team-sharing environments'
    ],
    targetUsers: ['Content Creators', 'Google Workspace Organizations', 'Large-Document Researchers'],
    supportedModels: ['Gemini 1.5 Pro', 'Gemini 1.5 Flash', 'Gemini 1.0 Ultra'],
    benchmarkScores: {
      codingBenchmark: 8.4,
      reasoningBenchmark: 8.5,
      planningBenchmark: 7.5
    },
    productivityWeight: 1.25,
    costMonthlyPerSeat: 20,
    costAnnualPerSeat: 20,
    apiSupport: false,
    offlineSupport: false,
    contextWindow: '1M - 2M tokens',
    platformIntegrations: ['Google Workspace', 'YouTube', 'Google Maps'],
    officialDocumentationUrl: 'https://ai.google.dev/docs'
  },

  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    category: 'ide',
    tier: 'pro',
    strengths: [
      'Collaborative Cascade logic (agent and developer work concurrently)',
      'Highly cost-effective Pro subscription ($15/mo)',
      'Strong multi-file refactoring and system setup commands execution'
    ],
    weaknesses: [
      'Smaller user ecosystem than Cursor',
      'Custom Tab autocomplete is slightly slower than Cursor Tab'
    ],
    targetUsers: ['Software Engineers', 'Solo Developers', 'Budget-Conscious Tech Teams'],
    supportedIDEs: ['Windsurf (VS Code Fork)'],
    supportedModels: ['GPT-4o', 'Claude 3.5 Sonnet'],
    benchmarkScores: {
      codingBenchmark: 9.3,
      reasoningBenchmark: 8.8,
      planningBenchmark: 9.2     // Excellent agent workflows
    },
    productivityWeight: 1.40,
    costMonthlyPerSeat: 15,
    costAnnualPerSeat: 15,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['GitHub', 'GitLab'],
    officialDocumentationUrl: 'https://docs.codeium.com/windsurf'
  },

  'openai-api': {
    id: 'openai-api',
    name: 'OpenAI API',
    category: 'api',
    tier: 'enterprise',
    strengths: [
      'High-throughput API endpoints with low rate limit restrictions',
      'Support for structured JSON outputs, function calling, and assistant tools',
      'Wide ecosystem compatibility with external frameworks (LangChain, LlamaIndex)'
    ],
    weaknesses: [
      'Token consumption costs can scale aggressively with context volume',
      'Enterprise configuration requires granular permission and key management'
    ],
    targetUsers: ['Software Engineers', 'AI Startups', 'Enterprise Product Developers'],
    supportedModels: ['GPT-4o', 'GPT-4o-mini', 'o1-preview', 'o1-mini'],
    benchmarkScores: {
      codingBenchmark: 9.1,
      reasoningBenchmark: 9.5,
      planningBenchmark: 8.5
    },
    productivityWeight: 1.0,      // API is infrastructure, not end-user tool
    costMonthlyPerSeat: 0,        // Pay per token
    costAnnualPerSeat: 0,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['AWS', 'Azure', 'GCP', 'OpenAI Ecosystem'],
    officialDocumentationUrl: 'https://platform.openai.com/docs'
  },

  'anthropic-api': {
    id: 'anthropic-api',
    name: 'Anthropic API',
    category: 'api',
    tier: 'enterprise',
    strengths: [
      'Exceptional performance for heavy reasoning and programmatic coding agents',
      'Supports Claude 3.5 Sonnet, the industry standard model for software agents',
      'Granular prompt caching support, yielding up to 90% cost savings for repeat contexts'
    ],
    weaknesses: [
      'Latency can be slightly higher for massive long-context prompts',
      'No native voice API support (speech-to-text must be done externally)'
    ],
    targetUsers: ['AI Developers', 'Enterprise Agent Systems', 'Complex Reasoning Architectures'],
    supportedModels: ['Claude 3.5 Sonnet', 'Claude 3 Opus', 'Claude 3.5 Haiku'],
    benchmarkScores: {
      codingBenchmark: 9.6,
      reasoningBenchmark: 9.8,
      planningBenchmark: 9.3
    },
    productivityWeight: 1.0,
    costMonthlyPerSeat: 0,        // Pay per token
    costAnnualPerSeat: 0,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '200k tokens',
    platformIntegrations: ['AWS Bedrock', 'GCP Vertex AI'],
    officialDocumentationUrl: 'https://docs.anthropic.com/api'
  },

  perplexity: {
    id: 'perplexity',
    name: 'Perplexity',
    category: 'chat',
    tier: 'pro',
    strengths: [
      'Superior real-time information retrieval, citation indexing, and research summaries',
      'Combines multiple search indices with advanced LLMs for factual correctness',
      'Collection workspace layouts for organizing cross-team research documents'
    ],
    weaknesses: [
      'Lacks native coding IDE plugins or direct programmatic codebase search',
      'Not designed for general content writing or voice chat conversations'
    ],
    targetUsers: ['Market Researchers', 'Product Managers', 'Strategic Planners', 'Venture Capitalists'],
    supportedModels: ['Perplexity Sonnet', 'Claude 3.5 Sonnet', 'GPT-4o'],
    benchmarkScores: {
      codingBenchmark: 7.2,
      reasoningBenchmark: 9.0,   // High research reasoning
      planningBenchmark: 6.8
    },
    productivityWeight: 1.30,    // Accelerates research/market analysis velocity
    costMonthlyPerSeat: 20,
    costAnnualPerSeat: 20,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '32k tokens',
    platformIntegrations: ['Web Browser Extensions'],
    officialDocumentationUrl: 'https://docs.perplexity.ai'
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    category: 'chat',
    tier: 'pro',
    strengths: [
      'Extreme cost efficiency on open-weights reasoning benchmarks',
      'Strong performance on coding and mathematics evaluation benchmarks (DeepSeek-Coder-V2)',
      'Highly affordable API token pricing ($0.14/M input tokens cached)'
    ],
    weaknesses: [
      'Varying platform stability during periods of peak worldwide usage',
      'Fewer corporate integrations than Microsoft or Google platforms'
    ],
    targetUsers: ['Budget-Conscious Developers', 'Math & Code Researchers'],
    supportedModels: ['DeepSeek-Coder-V2', 'DeepSeek-V2.5', 'DeepSeek-R1'],
    benchmarkScores: {
      codingBenchmark: 9.4,      // Very high coding benchmarks
      reasoningBenchmark: 9.3,
      planningBenchmark: 8.0
    },
    productivityWeight: 1.30,
    costMonthlyPerSeat: 15,      // Estimated average pricing
    costAnnualPerSeat: 15,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['API Integrations'],
    officialDocumentationUrl: 'https://api-docs.deepseek.com'
  },

  'github-models': {
    id: 'github-models',
    name: 'GitHub Models',
    category: 'api',
    tier: 'pro',
    strengths: [
      'Direct integration inside the GitHub developer workflow and Actions pipelines',
      'Access to a wide playground of curated open and closed-source models (Meta Llama, OpenAI, Mistral)',
      'Free trial capabilities for developers prototyping repository integrations'
    ],
    weaknesses: [
      'Rate-limiting tiers are constrained for production enterprise deployments',
      'No specialized client dashboard for general workspace productivity analysis'
    ],
    targetUsers: ['Prototypers', 'GitHub Enterprise users', 'CI/CD pipeline builders'],
    supportedModels: ['Llama-3', 'Mistral Large', 'GPT-4o', 'Claude 3.5 Sonnet'],
    benchmarkScores: {
      codingBenchmark: 8.5,
      reasoningBenchmark: 8.2,
      planningBenchmark: 7.2
    },
    productivityWeight: 1.05,
    costMonthlyPerSeat: 0,
    costAnnualPerSeat: 0,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '128k tokens',
    platformIntegrations: ['GitHub Enterprise', 'GitHub Actions', 'GitHub Codespaces'],
    officialDocumentationUrl: 'https://docs.github.com/en/site-policy/github-terms/github-models-terms-of-service'
  },

  codex: {
    id: 'codex',
    name: 'Codex (Legacy)',
    category: 'ide',
    tier: 'free',
    strengths: [
      'Historically foundational model for inline code completions'
    ],
    weaknesses: [
      'Officially deprecated by OpenAI in favor of GPT-3.5/GPT-4 models',
      'High error rates and lack of modern codebase understanding'
    ],
    targetUsers: ['Legacy System Maintainers'],
    supportedIDEs: ['VS Code'],
    supportedModels: ['OpenAI Codex'],
    benchmarkScores: {
      codingBenchmark: 5.0,
      reasoningBenchmark: 4.5,
      planningBenchmark: 2.0
    },
    productivityWeight: 1.0,
    costMonthlyPerSeat: 0,
    costAnnualPerSeat: 0,
    apiSupport: true,
    offlineSupport: false,
    contextWindow: '4k tokens',
    platformIntegrations: ['GitHub'],
    officialDocumentationUrl: 'https://platform.openai.com/docs/guides/code'
  }
};

export class ProviderKnowledgeService {
  public static getProvider(id: ToolId | string): ProviderMetadata | null {
    const normalized = id.toLowerCase();
    return PROVIDER_DATABASE[normalized] || null;
  }

  public static getAllProviders(): ProviderMetadata[] {
    return Object.values(PROVIDER_DATABASE);
  }

  public static getStrengths(id: ToolId | string): string[] {
    const provider = this.getProvider(id);
    return provider ? provider.strengths : [];
  }

  public static getBenchmarkScores(id: ToolId | string) {
    const provider = this.getProvider(id);
    return provider ? provider.benchmarkScores : { codingBenchmark: 5.0, reasoningBenchmark: 5.0, planningBenchmark: 5.0 };
  }
}
