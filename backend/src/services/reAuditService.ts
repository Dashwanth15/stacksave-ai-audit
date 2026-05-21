// ============================================================
// Re-Audit Service — Batch 3
// ============================================================
// Orchestrates the backend re-audit engine, versioned storage,
// and diff object generation.

import { AuditModel, AuditDocument } from './dbService';
import { runAudit } from '../audit-engine/engine';
import { generateAuditSummary } from './aiService';
import { capturePricingSnapshot } from './pricingService';
import { comparePricingSnapshots } from './pricingChangeDetectionService';
import { getToolById } from '../audit-engine/catalog';
import { ToolEntry, PricingSnapshot, Insight, ToolId, UseCase, StackToolEntry, StackDiff } from '../types';

export interface RecommendationDiff {
  toolId: ToolId;
  toolName: string;
  type: string;
  status: 'added' | 'removed' | 'changed';
  oldInsight?: Insight;
  newInsight?: Insight;
  savingDelta?: number;
}

export interface PricingDiff {
  toolId: ToolId;
  toolName: string;
  planId: string;
  planLabel: string;
  oldMonthlyPrice: number;
  newMonthlyPrice: number;
  monthlyDelta: number;
  oldAnnualPrice?: number;
  newAnnualPrice?: number;
  annualDelta?: number;
}

export interface AuditDiff {
  oldAuditId: string;
  newAuditId: string;
  oldSavings: number;
  newSavings: number;
  savingsDelta: number;
  recommendationsChanged: boolean;
  changedTools: ToolId[];
  recommendationDiffs: RecommendationDiff[];
  pricingDiffs: PricingDiff[];
  generatedAt: string;
  stackDiff?: StackDiff;
}

/**
 * Updates the user's input tools stack spend using current catalog prices.
 *
 * @param originalTools Tools from original audit request
 * @returns Updated ToolEntry array with current pricing
 */
export function recalculateInputStack(originalTools: ToolEntry[]): ToolEntry[] {
  return originalTools.map((tool) => {
    const catalogTool = getToolById(tool.toolId);
    if (!catalogTool) {
      return { ...tool };
    }

    const plan = catalogTool.plans.find((p) => p.id === tool.plan);
    if (!plan) {
      return { ...tool };
    }

    // Pay-per-use plan spend is volume-based, keep original monthlySpend
    if (plan.isPayPerUse) {
      return { ...tool };
    }

    // For standard seat plans, recalculate based on current plan pricing
    const newPrice = plan.monthlyPricePerSeat * tool.seats;
    return {
      ...tool,
      monthlySpend: newPrice,
    };
  });
}

/**
 * Generates a structured diff object comparing two audits.
 *
 * @param oldAudit The older audit document
 * @param newAudit The newer audit document
 * @returns Structured AuditDiff object
 */
export function generateAuditDiff(oldAudit: AuditDocument, newAudit: AuditDocument): AuditDiff {
  const oldInsights = (oldAudit.insights || []) as Insight[];
  const newInsights = (newAudit.insights || []) as Insight[];

  const oldMap = new Map<string, Insight>();
  for (const ins of oldInsights) {
    oldMap.set(`${ins.toolId}:${ins.type}`, ins);
  }

  const newMap = new Map<string, Insight>();
  for (const ins of newInsights) {
    newMap.set(`${ins.toolId}:${ins.type}`, ins);
  }

  const recommendationDiffs: RecommendationDiff[] = [];

  // 1. Find added and changed recommendations
  for (const [key, newIns] of newMap.entries()) {
    const oldIns = oldMap.get(key);
    if (!oldIns) {
      recommendationDiffs.push({
        toolId: newIns.toolId,
        toolName: newIns.toolName,
        type: newIns.type,
        status: 'added',
        newInsight: newIns,
        savingDelta: newIns.potentialMonthlySaving,
      });
    } else {
      const hasChanged =
        newIns.potentialMonthlySaving !== oldIns.potentialMonthlySaving ||
        newIns.recommendedMonthlySpend !== oldIns.recommendedMonthlySpend ||
        newIns.message !== oldIns.message ||
        newIns.suggestion !== oldIns.suggestion ||
        newIns.severity !== oldIns.severity;

      if (hasChanged) {
        recommendationDiffs.push({
          toolId: newIns.toolId,
          toolName: newIns.toolName,
          type: newIns.type,
          status: 'changed',
          oldInsight: oldIns,
          newInsight: newIns,
          savingDelta: newIns.potentialMonthlySaving - oldIns.potentialMonthlySaving,
        });
      }
    }
  }

  // 2. Find removed recommendations
  for (const [key, oldIns] of oldMap.entries()) {
    if (!newMap.has(key)) {
      recommendationDiffs.push({
        toolId: oldIns.toolId,
        toolName: oldIns.toolName,
        type: oldIns.type,
        status: 'removed',
        oldInsight: oldIns,
        savingDelta: -oldIns.potentialMonthlySaving,
      });
    }
  }

  // 3. Compare pricing snapshots to find changed pricing assumptions
  const oldSnapshot = oldAudit.pricingSnapshot as PricingSnapshot;
  const newSnapshot = newAudit.pricingSnapshot as PricingSnapshot;

  const pricingDiffs: PricingDiff[] = [];
  const changedToolIds = new Set<ToolId>();

  if (oldSnapshot && newSnapshot) {
    const comparison = comparePricingSnapshots(oldSnapshot, newSnapshot);
    for (const tool of comparison.changedTools) {
      changedToolIds.add(tool.toolId);
      for (const change of tool.planChanges) {
        pricingDiffs.push({
          toolId: tool.toolId,
          toolName: tool.toolName,
          planId: change.planId,
          planLabel: change.planLabel,
          oldMonthlyPrice: change.oldMonthlyPrice,
          newMonthlyPrice: change.newMonthlyPrice,
          monthlyDelta: change.monthlyDelta,
          oldAnnualPrice: change.oldAnnualPrice,
          newAnnualPrice: change.newAnnualPrice,
          annualDelta: change.annualDelta,
        });
      }
    }
  }

  const oldSavings = oldAudit.estimatedMonthlySavings;
  const newSavings = newAudit.estimatedMonthlySavings;
  const savingsDelta = newSavings - oldSavings;

  // --- Stack Difference Detection ---
  const added: StackToolEntry[] = [];
  const removed: StackToolEntry[] = [];
  const changed: StackDiff['changed'] = [];
  const replacedList: StackDiff['replaced'] = [];

  const oldTools = (oldAudit.tools || []) as ToolEntry[];
  const newTools = (newAudit.tools || []) as ToolEntry[];

  const oldToolsMap = new Map<string, ToolEntry>();
  for (const t of oldTools) {
    oldToolsMap.set(t.toolId, t);
  }

  const newToolsMap = new Map<string, ToolEntry>();
  for (const t of newTools) {
    newToolsMap.set(t.toolId, t);
  }

  // 1. Detect added and changed/modified tools
  for (const newEntry of newTools) {
    const oldEntry = oldToolsMap.get(newEntry.toolId);
    const catalogTool = getToolById(newEntry.toolId);
    const toolName = catalogTool?.name || newEntry.toolId;
    const newPlanOpt = catalogTool?.plans.find((p) => p.id === newEntry.plan);
    const newPlanLabel = newPlanOpt?.label || newEntry.plan;

    if (!oldEntry) {
      added.push({
        toolId: newEntry.toolId,
        toolName,
        seats: newEntry.seats,
        planId: newEntry.plan,
        planLabel: newPlanLabel,
        monthlySpend: newEntry.monthlySpend,
      });
    } else {
      const hasSeatsChanged = newEntry.seats !== oldEntry.seats;
      const hasPlanChanged = newEntry.plan !== oldEntry.plan;
      const hasSpendChanged = Math.abs(newEntry.monthlySpend - oldEntry.monthlySpend) > 0.01;

      if (hasSeatsChanged || hasPlanChanged || hasSpendChanged) {
        const oldPlanOpt = catalogTool?.plans.find((p) => p.id === oldEntry.plan);
        const oldPlanLabel = oldPlanOpt?.label || oldEntry.plan;

        changed.push({
          toolId: newEntry.toolId,
          toolName,
          oldSeats: oldEntry.seats,
          newSeats: newEntry.seats,
          oldPlanId: oldEntry.plan,
          newPlanId: newEntry.plan,
          oldPlanLabel,
          newPlanLabel,
          oldSpend: oldEntry.monthlySpend,
          newSpend: newEntry.monthlySpend,
          seatsDelta: newEntry.seats - oldEntry.seats,
          spendDelta: newEntry.monthlySpend - oldEntry.monthlySpend,
        });
      }
    }
  }

  // 2. Detect removed tools
  for (const oldEntry of oldTools) {
    if (!newToolsMap.has(oldEntry.toolId)) {
      const catalogTool = getToolById(oldEntry.toolId);
      const toolName = catalogTool?.name || oldEntry.toolId;
      const oldPlanOpt = catalogTool?.plans.find((p) => p.id === oldEntry.plan);
      const oldPlanLabel = oldPlanOpt?.label || oldEntry.plan;

      removed.push({
        toolId: oldEntry.toolId,
        toolName,
        seats: oldEntry.seats,
        planId: oldEntry.plan,
        planLabel: oldPlanLabel,
        monthlySpend: oldEntry.monthlySpend,
      });
    }
  }

  // 3. Replacement Heuristic
  const matchedAdded = new Set<string>();
  const matchedRemoved = new Set<string>();

  for (const rem of removed) {
    const remCatalog = getToolById(rem.toolId);
    const remCategory = remCatalog?.category;

    let matchIdx = -1;
    for (let i = 0; i < added.length; i++) {
      const add = added[i];
      if (matchedAdded.has(add.toolId)) continue;

      const addCatalog = getToolById(add.toolId);
      const addCategory = addCatalog?.category;

      const sameCategory = remCategory && remCategory === addCategory;
      const isAlternative = remCatalog?.alternatives?.some(alt => alt.toolId === add.toolId) ||
                            addCatalog?.alternatives?.some(alt => alt.toolId === rem.toolId);

      if (sameCategory || isAlternative) {
        matchIdx = i;
        break;
      }
    }

    if (matchIdx !== -1) {
      const add = added[matchIdx];
      matchedAdded.add(add.toolId);
      matchedRemoved.add(rem.toolId);
      replacedList.push({
        removedToolId: rem.toolId,
        removedToolName: rem.toolName,
        addedToolId: add.toolId,
        addedToolName: add.toolName,
        removedPlanLabel: rem.planLabel,
        addedPlanLabel: add.planLabel,
        removedSpend: rem.monthlySpend,
        addedSpend: add.monthlySpend,
      });
    }
  }

  const remainingAdded = added.filter(a => !matchedAdded.has(a.toolId));
  const remainingRemoved = removed.filter(r => !matchedRemoved.has(r.toolId));

  // 4. Overlap & Opportunity counts
  const oldOverlapCount = oldInsights.filter(ins => ins.type === 'overlapping_tools').length;
  const newOverlapCount = newInsights.filter(ins => ins.type === 'overlapping_tools').length;
  const overlapCountDelta = newOverlapCount - oldOverlapCount;

  const oldOptCount = oldInsights.length;
  const newOptCount = newInsights.length;
  const optCountDelta = newOptCount - oldOptCount;

  // 5. Generate evolution storytelling summaries
  const summaries: string[] = [];
  const nextVer = newAudit.auditVersion || 2;

  for (const add of remainingAdded) {
    summaries.push(`${add.toolName} was added to the stack in v${nextVer}.`);
  }
  for (const rem of remainingRemoved) {
    summaries.push(`${rem.toolName} was removed from the stack in v${nextVer}.`);
  }
  for (const rep of replacedList) {
    summaries.push(`${rep.addedToolName} replaced ${rep.removedToolName} in v${nextVer}.`);
  }
  for (const chg of changed) {
    if (chg.oldPlanId !== chg.newPlanId) {
      summaries.push(`${chg.toolName} plan was changed from ${chg.oldPlanLabel} to ${chg.newPlanLabel}.`);
    }
    if (chg.oldSeats !== chg.newSeats) {
      summaries.push(`${chg.toolName} seat count changed from ${chg.oldSeats} to ${chg.newSeats} (${chg.seatsDelta > 0 ? '+' : ''}${chg.seatsDelta} seats).`);
    }
  }
  if (overlapCountDelta < 0) {
    summaries.push(`Overlapping tool redundancies reduced from ${oldOverlapCount} to ${newOverlapCount}.`);
  } else if (overlapCountDelta > 0) {
    summaries.push(`New overlaps detected (increased from ${oldOverlapCount} to ${newOverlapCount}).`);
  }
  if (optCountDelta > 0) {
    summaries.push(`Optimization opportunities increased from ${oldOptCount} to ${newOptCount}.`);
  } else if (optCountDelta < 0) {
    summaries.push(`Optimization opportunities decreased from ${oldOptCount} to ${newOptCount}.`);
  }

  const stackDiff: StackDiff = {
    added: remainingAdded,
    removed: remainingRemoved,
    changed,
    replaced: replacedList,
    oldToolCount: oldTools.length,
    newToolCount: newTools.length,
    toolCountDelta: newTools.length - oldTools.length,
    oldOverlapCount,
    newOverlapCount,
    overlapCountDelta,
    oldOptCount,
    newOptCount,
    optCountDelta,
    summaries,
  };

  return {
    oldAuditId: oldAudit.auditId,
    newAuditId: newAudit.auditId,
    oldSavings,
    newSavings,
    savingsDelta,
    recommendationsChanged: recommendationDiffs.length > 0,
    changedTools: Array.from(changedToolIds),
    recommendationDiffs,
    pricingDiffs,
    generatedAt: new Date().toISOString(),
    stackDiff,
  };
}

/**
 * Runs a re-audit workflow for an existing audit ID.
 *
 * @param originalAuditId The ID of the audit to re-run
 * @param baseUrl Base URL for generated public URLs
 * @returns The newly created Audit document and the generated diff object
 */
export async function runReAudit(
  originalAuditId: string,
  baseUrl: string
): Promise<{ newAudit: AuditDocument; diff: AuditDiff }> {
  // Load the audit that was passed in (could be v1, v2, v3, etc.)
  const requestedAudit = await AuditModel.findOne({ auditId: originalAuditId });
  if (!requestedAudit) {
    throw new Error(`Original audit not found: ${originalAuditId}`);
  }

  // Resolve root audit ID of this version chain
  const rootAuditId = requestedAudit.reAuditOf || requestedAudit.auditId;

  // Always load the ROOT audit to get the original user-submitted input stack.
  // This ensures every re-audit recalculates from the same baseline tools,
  // preventing drift from compounding recalculations across versions.
  const rootAudit = rootAuditId !== requestedAudit.auditId
    ? await AuditModel.findOne({ auditId: rootAuditId })
    : requestedAudit;

  if (!rootAudit) {
    throw new Error(`Root audit not found: ${rootAuditId}`);
  }

  // Query database to find the maximum version in this audit chain
  const latestAuditInChain = await AuditModel.findOne({
    $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }],
  })
    .sort({ auditVersion: -1 })
    .exec();

  const nextVersion = (latestAuditInChain?.auditVersion || requestedAudit.auditVersion || 1) + 1;

  // CRITICAL: Always use the ROOT audit's original inputStack.
  // This is the user's original tool selection, before any recalculation.
  const originalTools =
    rootAudit.inputStack && rootAudit.inputStack.length > 0
      ? (rootAudit.inputStack as ToolEntry[])
      : (rootAudit.tools as ToolEntry[]);

  const updatedTools = recalculateInputStack(originalTools);

  // Infer useCase (fallback to first tool's useCase, or 'mixed')
  const inferredUseCase: UseCase =
    (rootAudit as any).useCase ||
    (originalTools[0]?.useCase as UseCase) ||
    'mixed';

  // Run the deterministic audit engine
  const auditResult = runAudit(
    {
      tools: updatedTools,
      teamSize: rootAudit.teamSize,
      companyName: rootAudit.companyName,
      useCase: inferredUseCase,
    },
    '',
    baseUrl
  );

  // Generate updated AI summary asynchronously
  try {
    const aiSummary = await generateAuditSummary(auditResult);
    auditResult.aiSummary = aiSummary;
  } catch (err) {
    console.error('Error generating AI summary during re-audit:', err);
    auditResult.aiSummary = 'Updated audit pricing summary';
  }

  // Capture current pricing snapshot
  const pricingSnapshot = capturePricingSnapshot();

  // Invalidate all previous versions in the chain (mark isLatestVersion: false)
  await AuditModel.updateMany(
    { $or: [{ auditId: rootAuditId }, { reAuditOf: rootAuditId }] },
    { isLatestVersion: false }
  );

  // Create new versioned Audit record
  const newAudit = await AuditModel.create({
    auditId: auditResult.auditId,
    totalMonthlySpend: auditResult.totalMonthlySpend,
    optimizedMonthlySpend: auditResult.optimizedMonthlySpend,
    estimatedMonthlySavings: auditResult.estimatedMonthlySavings,
    estimatedAnnualSavings: auditResult.estimatedAnnualSavings,
    savingsPercentage: auditResult.savingsPercentage,
    isAlreadyOptimal: auditResult.isAlreadyOptimal,
    isHighSavings: auditResult.isHighSavings,
    insights: auditResult.insights,
    aiSummary: auditResult.aiSummary,
    publicUrl: auditResult.publicUrl,
    companyName: rootAudit.companyName,
    teamSize: rootAudit.teamSize,
    tools: auditResult.tools,
    email: rootAudit.email,
    inputStack: originalTools, // Store the ROOT's original input, not recalculated
    pricingSnapshot,
    reAuditOf: rootAuditId,
    isLatestVersion: true,
    auditVersion: nextVersion,
    pricingChanged: false, // Reset pricing changed status since we are now up to date
    lastPricingCheck: new Date(),
  });

  // Generate the comparison diff between the PREVIOUS version and this new version.
  // Use the latest version in the chain before this one (which we already found above).
  const previousVersion = latestAuditInChain || rootAudit;
  const diff = generateAuditDiff(previousVersion, newAudit);

  return { newAudit, diff };
}
