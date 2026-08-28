// ============================================================
// Build My AI Stack — Wizard option data
// IMPORTANT: the `id` values below are the backend contract.
// They MUST NOT change. Titles, subtitles, tags, icons, and the
// added display-only fields (optimizesFor, tradeoff, bestWhen)
// are presentation only and safe to edit.
// ============================================================

import type { StackStrategy } from '../../types';

export interface DomainOption {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  iconPath: string;
}

export const DOMAIN_OPTIONS: DomainOption[] = [
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    subtitle: 'Write, refactor, and debug multi-file code across repositories.',
    badge: 'Engineering',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'ai-data-ml',
    title: 'AI & Machine Learning',
    subtitle: 'Build ML models, data pipelines, and API integrations.',
    badge: 'Data & AI',
    iconPath:
      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    id: 'research-knowledge',
    title: 'Research & Knowledge',
    subtitle: 'Search the live web, synthesize sources, and verify citations.',
    badge: 'Research',
    iconPath: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    id: 'product-design',
    title: 'Product & Design',
    subtitle: 'Draft product specs, review UI mockups, and parse visual diagrams.',
    badge: 'Product & UI',
    iconPath:
      'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'business-operations',
    title: 'Business Operations',
    subtitle: 'Automate repetitive workflows, summarize meetings, and process data.',
    badge: 'Operations',
    iconPath:
      'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    id: 'content-communication',
    title: 'Content & Communication',
    subtitle: 'Draft customer copy, technical documentation, and localized content.',
    badge: 'Content & Writing',
    iconPath:
      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    id: 'enterprise-compliance',
    title: 'Enterprise Governance',
    subtitle: 'Enforce zero data retention, centralized audit logs, and SSO controls.',
    badge: 'Security & Compliance',
    iconPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  {
    id: 'general-productivity',
    title: 'General Productivity',
    subtitle: 'Everyday writing assistance, quick brainstorming, and task support.',
    badge: 'General Suite',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
];

export interface RequirementOption {
  id: string;
  title: string;
  description: string;
  tag: string;
  iconPath: string;
}

export const REQUIREMENT_OPTIONS: RequirementOption[] = [
  {
    id: 'editor-code-generation',
    title: 'In-Editor Code Generation',
    description: 'Autocomplete, refactor, and edit code inline inside your IDE.',
    tag: 'IDE Coding',
    iconPath:
      'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'deep-reasoning-analysis',
    title: 'Deep Reasoning & Logic',
    description: 'Solve complex math, system architecture, and algorithmic logic.',
    tag: 'Reasoning',
    iconPath:
      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  },
  {
    id: 'large-document-processing',
    title: 'Large Document & Code Indexing',
    description: 'Ingest 100K+ token docs, contracts, and full codebases without truncation.',
    tag: 'Long Context',
    iconPath:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'live-web-research',
    title: 'Live Web Intelligence & Citations',
    description: 'Retrieve real-time web information with verified, clickable sources.',
    tag: 'Live Search',
    iconPath:
      'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M3.6 9h16.8 M3.6 15h16.8 M12 3a15 15 0 010 18 M12 3a15 15 0 000 18',
  },
  {
    id: 'visual-diagram-understanding',
    title: 'Visual & Diagram Analysis',
    description: 'Inspect UI mockups, architectural charts, and visual screenshots.',
    tag: 'Vision & UI',
    iconPath:
      'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'automated-task-execution',
    title: 'Multi-Step Terminal Execution',
    description: 'Run command-line scripts and multi-step tasks with minimal manual steps.',
    tag: 'Autonomous',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'developer-api-access',
    title: 'Programmatic API Integration',
    description: 'Connect LLM endpoints directly into your backend code and internal tools.',
    tag: 'API Access',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'enterprise-governance',
    title: 'Zero Data Retention & SSO',
    description: 'Ensure vendor zero data retention, SAML login, and compliance logging.',
    tag: 'Governance',
    iconPath:
      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

export interface StrategyOption {
  id: StackStrategy;
  title: string;
  subtitle: string;
  focus: string;
  tradeoff: string;
  bestWhen: string;
}

export const STRATEGY_OPTIONS: StrategyOption[] = [
  {
    id: 'balanced',
    title: 'Balanced Architecture',
    subtitle: 'Balances daily workflow velocity, reasoning quality, and seat cost.',
    focus: 'Recommended',
    tradeoff: 'Moderates spend without maxing out a single axis',
    bestWhen: 'You want a strong, dependable all-round setup',
  },
  {
    id: 'best-value',
    title: 'Best Value',
    subtitle: 'Maximizes cost efficiency per seat while covering your required capabilities.',
    focus: 'Lowest Spend',
    tradeoff: 'Prioritizes affordable tiers with standard usage quotas',
    bestWhen: 'Staying strictly within a lean monthly budget is key',
  },
  {
    id: 'max-performance',
    title: 'Maximum Performance',
    subtitle: 'Selects top benchmark-scoring frontier models for heavy reasoning.',
    focus: 'Top Benchmarks',
    tradeoff: 'Higher monthly spend to eliminate capability bottlenecks',
    bestWhen: 'Complex reasoning and output quality outweigh cost',
  },
  {
    id: 'enterprise-security',
    title: 'Enterprise Security',
    subtitle: 'Mandates zero data retention, SAML SSO, SOC 2 compliance, and audit logs.',
    focus: 'Strict Compliance',
    tradeoff: 'Requires enterprise tier licensing and admin controls',
    bestWhen: 'Data privacy and corporate compliance are mandatory',
  },
];

export interface WizardStep {
  n: number;
  key: 'domain' | 'scale' | 'capabilities' | 'strategy';
  numeral: string;
  eyebrow: string;
  title: string;
}

export const STEPS: WizardStep[] = [
  { n: 1, key: 'domain', numeral: '01', eyebrow: 'Operating domain', title: 'Where your team does its work' },
  { n: 2, key: 'scale', numeral: '02', eyebrow: 'Scale & budget', title: 'Size the team and the spend' },
  { n: 3, key: 'capabilities', numeral: '03', eyebrow: 'Capability profile', title: 'The capabilities your team needs' },
  { n: 4, key: 'strategy', numeral: '04', eyebrow: 'Strategy & governance', title: 'Your procurement stance' },
];

export type OptimizationGoal = 'savings' | 'balanced' | 'productivity' | 'governance';

export interface OptimizationGoalOption {
  id: OptimizationGoal;
  title: string;
  subtitle: string;
  badge: string;
  iconPath: string;
}

export const OPTIMIZATION_GOAL_OPTIONS: OptimizationGoalOption[] = [
  {
    id: 'balanced',
    title: 'Balanced Workflow',
    subtitle: 'Standard balance between daily efficiency, tool synergy, and reasonable cost.',
    badge: 'Balanced',
    iconPath: 'M12 3v18m-8-6l8 6 8-6M4 9l8-6 8 6',
  },
  {
    id: 'savings',
    title: 'Cost Reduction',
    subtitle: 'Aggressively cut seat spend and prioritize high capability-to-cost ratio tools.',
    badge: 'Max Savings',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2m0-8c1.11 0 2.08.402 2.599 1M12 16c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'productivity',
    title: 'Maximum Productivity',
    subtitle: 'Prioritize throughput, frontier model reasoning, and speed over seat price.',
    badge: 'High Velocity',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'governance',
    title: 'Strict Governance',
    subtitle: 'Enforce enterprise security posture, strict compliance, and audit readiness.',
    badge: 'Enterprise',
    iconPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
];

// ── Display-only lookup helpers (never sent to the backend) ──
export const domainTitle = (id: string): string =>
  DOMAIN_OPTIONS.find((d) => d.id === id)?.title ?? '';

export const strategyTitle = (id: StackStrategy): string =>
  STRATEGY_OPTIONS.find((s) => s.id === id)?.title ?? '';

export const strategyFocus = (id: StackStrategy): string =>
  STRATEGY_OPTIONS.find((s) => s.id === id)?.focus ?? '';

export const optimizationGoalTitle = (id: OptimizationGoal): string =>
  OPTIMIZATION_GOAL_OPTIONS.find((g) => g.id === id)?.title ?? '';


