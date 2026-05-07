// ============================================================
// Audit Engine Rules — StackSave AI Audit
//
// Each rule takes a single ToolEntry + team context and returns
// an Insight if the rule fires, or null if the tool is fine.
//
// Design principle: every insight must be defensible to a
// finance person. Numbers, reasoning, and suggestions must be
// grounded in real pricing data from catalog.ts.
// ============================================================

import { ToolEntry, Insight, InsightType, InsightSeverity, UseCase } from '../types';
import { getToolById } from './catalog';

interface RuleContext {
  teamSize: number;
  primaryUseCase: UseCase;
  allTools: ToolEntry[]; // for cross-tool rules
}

type RuleResult = Insight | null;

// ──────────────────────────────────────────────────────────────
// RULE 1: Overpaid Plan
// Team size doesn't justify the plan tier they're on
// ──────────────────────────────────────────────────────────────
export function ruleOverpaidPlan(entry: ToolEntry, _ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
  if (!currentPlan || currentPlan.isPayPerUse) return null;

  // Find all cheaper paid plans
  const cheaperPlans = tool.plans.filter(
    (p) =>
      p.monthlyPricePerSeat < currentPlan.monthlyPricePerSeat &&
      !p.isPayPerUse &&
      (p.minSeats === undefined || p.minSeats <= entry.seats)
  );

  if (cheaperPlans.length === 0) return null;

  // Team plan for ≤2 users: Team plans have minimums and are overkill for tiny teams
  const isTeamPlanForSmallTeam =
    (entry.plan === 'team' || entry.plan === 'business' || entry.plan === 'enterprise') &&
    entry.seats <= 2;

  if (!isTeamPlanForSmallTeam) return null;

  const bestAlternative = cheaperPlans.sort(
    (a, b) => b.monthlyPricePerSeat - a.monthlyPricePerSeat
  )[0];

  const savingPerSeat = currentPlan.monthlyPricePerSeat - bestAlternative.monthlyPricePerSeat;
  const totalSaving = savingPerSeat * entry.seats;
  const recommendedSpend = bestAlternative.monthlyPricePerSeat * entry.seats;

  if (totalSaving <= 0) return null;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'overpaid_plan' as InsightType,
    severity: totalSaving >= 20 ? 'high' : ('medium' as InsightSeverity),
    message: `You're on ${tool.name} ${currentPlan.label} for ${entry.seats} user${entry.seats > 1 ? 's' : ''} — this plan is designed for larger teams.`,
    suggestion: `Downgrade to ${tool.name} ${bestAlternative.label} ($${bestAlternative.monthlyPricePerSeat}/user/mo)`,
    reason: `With only ${entry.seats} seat${entry.seats > 1 ? 's' : ''}, the ${currentPlan.label} plan costs $${currentPlan.monthlyPricePerSeat}/user/mo. ${bestAlternative.label} provides equivalent capabilities for small teams at $${bestAlternative.monthlyPricePerSeat}/user/mo.`,
    potentialMonthlySaving: totalSaving,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: recommendedSpend,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 2: Unused Seats
// User is paying for more seats than their team size
// ──────────────────────────────────────────────────────────────
export function ruleUnusedSeats(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
  if (!currentPlan || currentPlan.isPayPerUse || currentPlan.monthlyPricePerSeat === 0) return null;

  const unusedSeats = entry.seats - ctx.teamSize;
  // Only flag if 25%+ of seats are unused (avoids nagging for 1 extra seat)
  const unusedRatio = unusedSeats / entry.seats;

  if (unusedSeats <= 0 || unusedRatio <= 0.25) return null;

  const saving = unusedSeats * currentPlan.monthlyPricePerSeat;
  const recommendedSpend = ctx.teamSize * currentPlan.monthlyPricePerSeat;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'unused_seats' as InsightType,
    severity: saving >= 30 ? 'high' : ('medium' as InsightSeverity),
    message: `You're paying for ${entry.seats} ${tool.name} seats but your team has ${ctx.teamSize} people — ${unusedSeats} seat${unusedSeats > 1 ? 's are' : ' is'} unused.`,
    suggestion: `Reduce to ${ctx.teamSize} seats and save $${saving}/month`,
    reason: `At $${currentPlan.monthlyPricePerSeat}/seat/mo, ${unusedSeats} unused seat${unusedSeats > 1 ? 's' : ''} cost${unusedSeats === 1 ? 's' : ''} you $${saving}/mo ($${saving * 12}/yr) with zero productivity return.`,
    potentialMonthlySaving: saving,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: recommendedSpend,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 3: Overlapping Tools
// Multiple tools serving the same use case — consolidate
// ──────────────────────────────────────────────────────────────
export function ruleOverlappingTools(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  // Find other tools in the audit that have the same category and same use case
  const overlappingEntries = ctx.allTools.filter((t) => {
    if (t.toolId === entry.toolId) return false;
    const otherTool = getToolById(t.toolId);
    if (!otherTool) return false;
    // Same category = definitely overlapping (e.g., two IDE AI tools)
    return otherTool.category === tool.category;
  });

  if (overlappingEntries.length === 0) return null;

  // Only fire on the more expensive one
  const cheaperOverlap = overlappingEntries.find((t) => t.monthlySpend < entry.monthlySpend);
  if (!cheaperOverlap) return null; // this entry IS the cheaper one — don't flag it

  const overlapTool = getToolById(cheaperOverlap.toolId);
  if (!overlapTool) return null;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'overlapping_tools' as InsightType,
    severity: 'medium' as InsightSeverity,
    message: `You're paying for both ${tool.name} and ${overlapTool.name} — two ${tool.category === 'ide' ? 'AI coding assistant' : 'AI chat'} tools with significant capability overlap.`,
    suggestion: `Consolidate to ${overlapTool.name} (your lower-cost ${tool.category === 'ide' ? 'coding' : 'chat'} tool) and cancel ${tool.name}`,
    reason: `Paying for two tools in the same category typically means 60-80% of usage goes to one tool. Consolidating to your primary tool eliminates the redundant spend of $${entry.monthlySpend}/mo.`,
    potentialMonthlySaving: entry.monthlySpend,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: 0,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 4: Cheaper Alternative
// A substantially cheaper tool fits their use case better
// ──────────────────────────────────────────────────────────────
export function ruleCheaperAlternative(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool || !tool.alternatives || tool.alternatives.length === 0) return null;

  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
  if (!currentPlan || currentPlan.isPayPerUse || currentPlan.monthlyPricePerSeat === 0) return null;

  // Find alternatives that are cheaper AND not already in the user's stack
  const alreadyUsedToolIds = ctx.allTools.map((t) => t.toolId);
  const viableAlternatives = tool.alternatives.filter((alt) => {
    if (alreadyUsedToolIds.includes(alt.toolId)) return false;
    const altTool = getToolById(alt.toolId);
    if (!altTool) return false;
    // Only recommend if the alternative supports their use case
    return altTool.useCases.includes(ctx.primaryUseCase) || altTool.useCases.includes(entry.useCase);
  });

  if (viableAlternatives.length === 0) return null;

  // Pick the most cost-effective alternative
  const best = viableAlternatives[0];
  const altTool = getToolById(best.toolId);
  if (!altTool) return null;

  // Find cheapest paid plan in the alternative
  const altPaidPlans = altTool.plans
    .filter((p) => p.monthlyPricePerSeat > 0 && !p.isPayPerUse)
    .sort((a, b) => a.monthlyPricePerSeat - b.monthlyPricePerSeat);

  if (altPaidPlans.length === 0) return null;

  const altCheapestPlan = altPaidPlans[0];
  const altTotalCost = altCheapestPlan.monthlyPricePerSeat * entry.seats;
  const saving = entry.monthlySpend - altTotalCost;

  // Only suggest if it actually saves meaningful money (>= $5/mo)
  if (saving < 5) return null;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'cheaper_alternative' as InsightType,
    severity: saving >= 20 ? 'medium' : ('low' as InsightSeverity),
    message: `${tool.name} at $${currentPlan.monthlyPricePerSeat}/user/mo may not be the most cost-efficient choice for your ${entry.useCase} use case.`,
    suggestion: `Consider ${altTool.name} ${altCheapestPlan.label} at $${altCheapestPlan.monthlyPricePerSeat}/user/mo`,
    reason: best.reason,
    potentialMonthlySaving: saving,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: altTotalCost,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 5: Annual Billing Discount
// User on monthly billing when annual saves ≥ 15%
// ──────────────────────────────────────────────────────────────
export function ruleAnnualDiscount(entry: ToolEntry, _ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
  if (
    !currentPlan ||
    currentPlan.isPayPerUse ||
    currentPlan.monthlyPricePerSeat === 0 ||
    !currentPlan.annualPricePerSeat
  )
    return null;

  const saving =
    (currentPlan.monthlyPricePerSeat - currentPlan.annualPricePerSeat) * entry.seats;
  const savingPercent =
    ((currentPlan.monthlyPricePerSeat - currentPlan.annualPricePerSeat) /
      currentPlan.monthlyPricePerSeat) *
    100;

  // Only flag if annual saves ≥ 15%
  if (savingPercent < 15 || saving < 5) return null;

  const annualTotalCost = currentPlan.annualPricePerSeat * entry.seats;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'annual_discount' as InsightType,
    severity: 'low' as InsightSeverity,
    message: `Switching ${tool.name} to annual billing saves ${Math.round(savingPercent)}% vs monthly.`,
    suggestion: `Switch to ${tool.name} annual plan ($${currentPlan.annualPricePerSeat}/user/mo billed yearly) and save $${saving}/month`,
    reason: `Annual billing at $${currentPlan.annualPricePerSeat}/user/mo vs monthly $${currentPlan.monthlyPricePerSeat}/user/mo saves $${Math.round(saving * 12)}/year — a ${Math.round(savingPercent)}% reduction with no change in functionality.`,
    potentialMonthlySaving: saving,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: annualTotalCost,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 6: High API Spend → Consider Credits
// Users spending >$200/mo on retail API should know about
// Credex credit discounts
// ──────────────────────────────────────────────────────────────
export function ruleRetailVsCredits(entry: ToolEntry, _ctx: RuleContext): RuleResult {
  const isApiTool = entry.toolId === 'anthropic-api' || entry.toolId === 'openai-api';
  if (!isApiTool) return null;

  if (entry.monthlySpend < 200) return null;

  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  // Credex typically saves 20-40% on AI credits
  const estimatedSaving = Math.round(entry.monthlySpend * 0.25);

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'retail_vs_credits' as InsightType,
    severity: entry.monthlySpend >= 500 ? 'high' : ('medium' as InsightSeverity),
    message: `You're spending $${entry.monthlySpend}/month on ${tool.name} at retail rates.`,
    suggestion: `Source ${tool.name} credits through a reseller like Credex and save 20-40% on the same usage`,
    reason: `At $${entry.monthlySpend}/mo retail, purchasing discounted API credits through secondary-market resellers (sourced from companies that overforecast usage) can reduce this by $${estimatedSaving}–$${Math.round(entry.monthlySpend * 0.4)}/mo with no change to your workflow.`,
    potentialMonthlySaving: estimatedSaving,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: entry.monthlySpend - estimatedSaving,
  };
}

// ──────────────────────────────────────────────────────────────
// RULE 7: Free Tier Available
// User is paying for a tool that has a generous free tier
// that might cover their actual usage
// ──────────────────────────────────────────────────────────────
export function ruleFreeAlternativeAvailable(entry: ToolEntry, ctx: RuleContext): RuleResult {
  const tool = getToolById(entry.toolId);
  if (!tool) return null;

  const currentPlan = tool.plans.find((p) => p.id === entry.plan);
  if (!currentPlan || currentPlan.monthlyPricePerSeat === 0 || currentPlan.isPayPerUse) return null;

  const hasFreeplan = tool.plans.some((p) => p.monthlyPricePerSeat === 0 && !p.isPayPerUse);
  if (!hasFreeplan) return null;

  // Only flag for solo users paying for single seat — team needs paid plans
  if (entry.seats !== 1 || ctx.teamSize > 2) return null;

  // Only flag for low-usage tools (heuristic: if spend is at the exact plan price,
  // they likely aren't heavy users who need premium)
  // Don't flag if they're on a high-tier plan — they clearly chose it
  if (entry.plan === 'enterprise' || entry.plan === 'max' || entry.plan === 'team') return null;

  return {
    toolId: entry.toolId,
    toolName: tool.name,
    type: 'already_optimal' as InsightType,
    severity: 'low' as InsightSeverity,
    message: `${tool.name} has a free tier — if your usage is light, you may not need the paid plan.`,
    suggestion: `Test ${tool.name} Free for one month. The free tier may be sufficient for occasional use.`,
    reason: `Solo users often overestimate how much they need paid AI tiers. ${tool.name}'s free plan is worth trialing before committing $${entry.monthlySpend}/mo — downgrade only if your daily workflow doesn't depend on the paid features.`,
    potentialMonthlySaving: entry.monthlySpend,
    currentMonthlySpend: entry.monthlySpend,
    recommendedMonthlySpend: 0,
  };
}

// Export all rules as an array for the engine to apply
export const ALL_RULES = [
  ruleOverpaidPlan,
  ruleUnusedSeats,
  ruleOverlappingTools,
  ruleCheaperAlternative,
  ruleAnnualDiscount,
  ruleRetailVsCredits,
  ruleFreeAlternativeAvailable,
];
