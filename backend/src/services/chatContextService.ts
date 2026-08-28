// ============================================================
// Chat Context Service — StackSave AI Assistant
//
// Reads real StackSave platform data (provider pricing, audit
// results, build-stack recommendations) and formats them into
// compact, LLM-readable context blocks for the system prompt.
// ZERO invented data — all facts come from the knowledge base.
// ============================================================

import { KnowledgeLoader } from '../audit-engine/services/KnowledgeLoader';

// ── Incoming context from the frontend ───────────────────────

export interface AuditContextPayload {
  auditId?: string;
  companyName?: string;
  teamSize?: number;
  useCase?: string;
  optimizationGoal?: string;
  billingCycle?: string;
  totalMonthlySpend?: number;
  estimatedMonthlySavings?: number;
  savingsPercentage?: number;
  optimizedMonthlySpend?: number;
  tools?: Array<{
    toolId: string;
    toolName: string;
    plan: string;
    seats: number;
    monthlySpend: number;
  }>;
  insights?: Array<{
    toolId: string;
    toolName: string;
    type: string;
    severity: string;
    suggestion: string;
    potentialMonthlySaving: number;
    confidence?: string;
  }>;
}

export interface BuildStackContextPayload {
  domain?: string;
  domainLabel?: string;
  teamSize?: number;
  budgetFormatted?: string;
  strategy?: string;
  strategyLabel?: string;
  optimizationGoal?: string;
  optimizationGoalLabel?: string;
  requirementCount?: number;
  primaryTool?: {
    toolId: string;
    toolName: string;
    recommendedPlan: string;
    monthlyCostPerSeat: number;
    estimatedMonthlyCostPerTeam: number;
    workflowFitScore: number;
    whyRecommended: string;
    capabilityHighlights: string[];
  };
  secondaryTool?: {
    toolId: string;
    toolName: string;
    recommendedPlan: string;
    estimatedMonthlyCostPerTeam: number;
    whyRecommended: string;
  };
  totalMonthlyCost?: number;
  confidenceScore?: number;
  coverageScore?: number;
  whyThisStack?: string;
  rejectedTools?: Array<{
    toolName: string;
    whyNotSelected: string;
    rejectionCategory: string;
  }>;
}

export interface ChatContextPayload {
  page: 'audit-results' | 'build-stack-results' | 'audit-form' | 'build-stack-form' | 'landing' | 'other';
  auditContext?: AuditContextPayload;
  buildStackContext?: BuildStackContextPayload;
}

// ── Known providers for pricing lookups ──────────────────────

const KNOWN_PROVIDER_IDS = [
  'cursor', 'github-copilot', 'claude', 'chatgpt',
  'anthropic-api', 'openai-api', 'gemini', 'windsurf',
  'perplexity', 'deepseek', 'kimi', 'codex', 'github-models',
];

// ── Format helpers ────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `$${price}/seat/month`;
}

// ── Build pricing snapshot for the LLM ───────────────────────

function buildPricingSnapshot(): string {
  KnowledgeLoader.initialize();
  const providers = KnowledgeLoader.getAllProviders();
  if (!providers || providers.length === 0) return '';

  const lines: string[] = ['VERIFIED STACKSAVE PRICING DATA (from knowledge base):'];

  for (const profile of providers) {
    const planSummary = (profile.plans || [])
      .filter(p => p.id && p.label)
      .slice(0, 5) // cap at 5 plans per tool to save tokens
      .map(p => `${p.label}: ${formatPrice(p.monthlyPricePerSeat)}`)
      .join(', ');

    const annualNote = profile.annualDiscountPercent
      ? ` (${profile.annualDiscountPercent}% off annual)`
      : '';

    lines.push(`• ${profile.name} [${profile.category}]: ${planSummary}${annualNote}`);
  }

  return lines.join('\n');
}

// ── Build audit context block ─────────────────────────────────

function buildAuditContextBlock(audit: AuditContextPayload): string {
  const lines: string[] = ['CURRENT AUDIT CONTEXT:'];

  if (audit.companyName) lines.push(`Company: ${audit.companyName}`);
  if (audit.teamSize) lines.push(`Team Size: ${audit.teamSize} seats`);
  if (audit.useCase) lines.push(`Engineering Focus: ${audit.useCase}`);
  if (audit.optimizationGoal) lines.push(`Optimization Goal: ${audit.optimizationGoal}`);
  if (audit.billingCycle) lines.push(`Billing Cycle: ${audit.billingCycle}`);
  if (audit.auditId) lines.push(`Audit ID: ${audit.auditId}`);

  if (audit.totalMonthlySpend !== undefined) {
    lines.push(`Current Monthly Spend: $${audit.totalMonthlySpend}/month`);
  }
  if (audit.estimatedMonthlySavings !== undefined && audit.estimatedMonthlySavings > 0) {
    lines.push(`Identified Savings: $${audit.estimatedMonthlySavings}/month (${audit.savingsPercentage}%)`);
    lines.push(`Optimized Monthly Spend: $${audit.optimizedMonthlySpend}/month`);
  }

  if (audit.tools && audit.tools.length > 0) {
    lines.push('\nAudited Tools:');
    for (const t of audit.tools) {
      lines.push(`  - ${t.toolName} (${t.plan}, ${t.seats} seats): $${t.monthlySpend}/month`);
    }
  }

  if (audit.insights && audit.insights.length > 0) {
    // Only include actionable insights (not already_optimal), capped at top 5
    const actionable = audit.insights
      .filter(i => i.type !== 'already_optimal')
      .slice(0, 5);
    const optimal = audit.insights.filter(i => i.type === 'already_optimal').slice(0, 2);

    if (actionable.length > 0) {
      lines.push('\nKey Optimization Opportunities:');
      for (const ins of actionable) {
        const saving = ins.potentialMonthlySaving > 0
          ? ` (saves $${ins.potentialMonthlySaving}/month)`
          : '';
        lines.push(`  - [${ins.severity.toUpperCase()}] ${ins.toolName}: ${ins.suggestion}${saving}`);
      }
    }
    if (optimal.length > 0) {
      lines.push('\nOptimally Configured:');
      for (const ins of optimal) {
        lines.push(`  - ${ins.toolName}: ${ins.suggestion}`);
      }
    }
  }

  return lines.join('\n');
}

// ── Build stack recommendation context block ──────────────────

function buildStackContextBlock(stack: BuildStackContextPayload): string {
  const lines: string[] = ['CURRENT BUILD STACK RECOMMENDATION:'];

  if (stack.domainLabel) lines.push(`Engineering Focus: ${stack.domainLabel}`);
  if (stack.teamSize) lines.push(`Team Size: ${stack.teamSize} seats`);
  if (stack.budgetFormatted) lines.push(`Budget: ${stack.budgetFormatted}`);
  if (stack.strategyLabel) lines.push(`Strategy: ${stack.strategyLabel}`);
  if (stack.optimizationGoalLabel) lines.push(`Optimization Goal: ${stack.optimizationGoalLabel}`);
  if (stack.requirementCount) lines.push(`Requirements Selected: ${stack.requirementCount}`);

  if (stack.primaryTool) {
    const pt = stack.primaryTool;
    lines.push(`\n01 PRIMARY: ${pt.toolName} (${pt.recommendedPlan}) — $${pt.estimatedMonthlyCostPerTeam}/month for team`);
    lines.push(`   Workflow Fit: ${pt.workflowFitScore}%`);
    lines.push(`   Why Recommended: ${pt.whyRecommended}`);
    if (pt.capabilityHighlights?.length > 0) {
      lines.push(`   Key Capabilities: ${pt.capabilityHighlights.slice(0, 3).join(', ')}`);
    }
  }

  if (stack.secondaryTool) {
    const st = stack.secondaryTool;
    lines.push(`\n02 SECONDARY: ${st.toolName} (${st.recommendedPlan}) — $${st.estimatedMonthlyCostPerTeam}/month for team`);
    lines.push(`   Why: ${st.whyRecommended}`);
  }

  if (stack.totalMonthlyCost !== undefined) {
    lines.push(`\nTotal Monthly Cost: $${stack.totalMonthlyCost}/month`);
  }
  if (stack.confidenceScore !== undefined) {
    lines.push(`Recommendation Confidence: ${stack.confidenceScore}%`);
  }
  if (stack.coverageScore !== undefined) {
    lines.push(`Requirement Coverage: ${stack.coverageScore}%`);
  }
  if (stack.whyThisStack) {
    lines.push(`\nStrategic Rationale: ${stack.whyThisStack}`);
  }

  if (stack.rejectedTools && stack.rejectedTools.length > 0) {
    const rejected = stack.rejectedTools.slice(0, 4);
    lines.push('\nEvaluated But Not Selected:');
    for (const r of rejected) {
      lines.push(`  - ${r.toolName} (${r.rejectionCategory}): ${r.whyNotSelected}`);
    }
  }

  return lines.join('\n');
}

// ── Main export: build the full context string for the prompt ─

export function buildChatContextBlock(context: ChatContextPayload): string {
  const sections: string[] = [];

  // Always inject real pricing data
  try {
    sections.push(buildPricingSnapshot());
  } catch {
    // Knowledge base not available, skip pricing injection
  }

  // Inject page-specific context
  if (context.page === 'audit-results' && context.auditContext) {
    sections.push(buildAuditContextBlock(context.auditContext));
  } else if (context.page === 'build-stack-results' && context.buildStackContext) {
    sections.push(buildStackContextBlock(context.buildStackContext));
  }

  return sections.join('\n\n');
}

export function getPageLabel(page: ChatContextPayload['page']): string {
  switch (page) {
    case 'audit-results': return 'Audit Results Page';
    case 'build-stack-results': return 'Build My Stack Results Page';
    case 'audit-form': return 'Audit Form Page';
    case 'build-stack-form': return 'Build My Stack Form Page';
    case 'landing': return 'Landing Page';
    default: return 'StackSave Platform';
  }
}
