// ============================================================
// Legacy Rules Wrapper — StackSave AI Platform Intelligence
//
// Wraps and exports legacy rules using the revamped modular services
// to maintain absolute backward compatibility with all unit test suites.
// ============================================================

import { ToolEntry, Insight, UseCase } from '../types';
import { OptimizationStrategyEngine } from './services/OptimizationStrategyEngine';

interface RuleContext {
  teamSize: number;
  primaryUseCase: UseCase;
  allTools: ToolEntry[];
}

type RuleResult = Insight[] | null;

// Helper to ensure the entry itself is present in the tools context
function getEffectiveTools(entry: ToolEntry, ctx: RuleContext): ToolEntry[] {
  if (ctx.allTools && ctx.allTools.some((t) => t.toolId === entry.toolId)) {
    return ctx.allTools;
  }
  return ctx.allTools ? [...ctx.allTools, entry] : [entry];
}

export function ruleDuplicateCapability(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tools = getEffectiveTools(entry, ctx);
  const allInsights = OptimizationStrategyEngine.run(tools, ctx.teamSize, ctx.primaryUseCase);
  const filtered = allInsights.filter((i) => i.toolId === entry.toolId && i.type === 'overlapping_tools');
  return filtered.length > 0 ? filtered : null;
}

export function ruleWrongPricingTier(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tools = getEffectiveTools(entry, ctx);
  const allInsights = OptimizationStrategyEngine.run(tools, ctx.teamSize, ctx.primaryUseCase);
  const filtered = allInsights.filter((i) => i.toolId === entry.toolId && i.type === 'overpaid_plan');
  return filtered.length > 0 ? filtered : null;
}

export function ruleUnusedSeats(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tools = getEffectiveTools(entry, ctx);
  const allInsights = OptimizationStrategyEngine.run(tools, ctx.teamSize, ctx.primaryUseCase);
  const filtered = allInsights.filter((i) => i.toolId === entry.toolId && i.type === 'unused_seats');
  return filtered.length > 0 ? filtered : null;
}

export function ruleAnnualDiscount(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tools = getEffectiveTools(entry, ctx);
  const allInsights = OptimizationStrategyEngine.run(tools, ctx.teamSize, ctx.primaryUseCase);
  const filtered = allInsights.filter((i) => i.toolId === entry.toolId && i.type === 'annual_discount');
  return filtered.length > 0 ? filtered : null;
}

export function ruleRetailVsCredits(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tools = getEffectiveTools(entry, ctx);
  const allInsights = OptimizationStrategyEngine.run(tools, ctx.teamSize, ctx.primaryUseCase);
  const filtered = allInsights.filter((i) => i.toolId === entry.toolId && i.type === 'retail_vs_credits');
  return filtered.length > 0 ? filtered : null;
}

// Export ALL_RULES list for potential system dependencies
export const ALL_RULES = [
  ruleDuplicateCapability,
  ruleWrongPricingTier,
  ruleUnusedSeats,
  ruleAnnualDiscount,
  ruleRetailVsCredits
];
