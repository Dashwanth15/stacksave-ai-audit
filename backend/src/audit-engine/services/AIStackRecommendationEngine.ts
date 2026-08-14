// ============================================================
// AI Stack Recommendation Engine — StackSave AI Platform
//
// Core recommendation engine for Flow 2 (Build Stack).
// Normalizes, scores, greedily aggregates candidate stacks,
// applies constraints, calculates confidence and traces decisions.
// Uses pluggable StackGenerationStrategy.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { KnowledgeLoader } from './KnowledgeLoader';
import { ScoredProviderProfile, KnowledgeScoringEngine } from './KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from './StackCoverageAnalyzer';
import { RelationshipEngine } from './RelationshipEngine';
import { WorkflowEngine } from './WorkflowEngine';
import {
  StackBuilderRequest,
  StackRecommendation,
  OptimizedStackSet,
  RejectedAlternative,
  BudgetSimulation,
  RecommendationTrace,
  ProviderScoreTrace,
  CandidateStackTrace,
  RankedStack,
  ToolInStack
} from '../../types/stackBuilder';

// Strategy interface - allows swapping strategy implementations
export interface StackGenerationStrategy {
  name: string;
  generate(
    scoredProfiles: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): ScoredProviderProfile[][];
}

// Default Greedy Cover implementation
export class GreedyCoverStrategy implements StackGenerationStrategy {
  name = 'greedy-cover-v1';

  generate(
    scoredProfiles: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): ScoredProviderProfile[][] {
    const candidateStacks: ScoredProviderProfile[][] = [];
    const maxTools = weights.stackGeneration?.maxToolsPerStack || 4;
    const mustHaves = req.mustHaveFeatures;

    // Sort providers by descending composite score
    const sorted = [...scoredProfiles].sort((a, b) => {
      const scoreA = AIStackRecommendationEngine.getCompositeScore(a, req, weights);
      const scoreB = AIStackRecommendationEngine.getCompositeScore(b, req, weights);
      return scoreB - scoreA;
    });

    const seeds = sorted.slice(0, Math.min(sorted.length, weights.stackGeneration?.candidateSeedCount || 8));

    for (const seed of seeds) {
      const currentStack: ScoredProviderProfile[] = [seed];
      
      // Attempt to add tools greedily
      for (const candidate of sorted) {
        if (currentStack.some(t => t.id === candidate.id)) continue;
        if (currentStack.length >= maxTools) break;

        // Never add duplicate/replacement candidates
        const isOverlap = currentStack.some(tool => {
          return RelationshipEngine.canReplace(tool.id, candidate.id, req.primaryWorkflow);
        });
        if (isOverlap) continue;

        // Check if candidate adds value (covers new required features or is complementary)
        const newlyCovered = StackCoverageAnalyzer.newFeaturesCovered(candidate, currentStack, mustHaves);
        const isComplementary = currentStack.some(tool => {
          return RelationshipEngine.areComplementary(tool.id, candidate.id, req.primaryWorkflow);
        });

        if (newlyCovered.length > 0 || isComplementary || mustHaves.length === 0) {
          currentStack.push(candidate);
        }
      }

      if (currentStack.length > 0 && !candidateStacks.some(stack => this.isSameStack(stack, currentStack))) {
        candidateStacks.push(currentStack);
      }
    }

    return candidateStacks;
  }

  private isSameStack(s1: ScoredProviderProfile[], s2: ScoredProviderProfile[]): boolean {
    if (s1.length !== s2.length) return false;
    const ids1 = s1.map(t => t.id).sort();
    const ids2 = s2.map(t => t.id).sort();
    return ids1.every((id, idx) => id === ids2[idx]);
  }
}

export class AIStackRecommendationEngine {
  private static strategy: StackGenerationStrategy = new GreedyCoverStrategy();

  public static setStrategy(s: StackGenerationStrategy): void {
    this.strategy = s;
  }

  /**
   * Main orchestrator for Flow 2 recommendation calculations.
   */
  public static run(req: StackBuilderRequest): StackRecommendation {
    const startTime = Date.now();
    const recommendationId = uuidv4();
    KnowledgeLoader.initialize();

    const weights = KnowledgeLoader.getRecommendationWeights();

    // 1. Score ALL providers (score-first, filter-last)
    const allScored = KnowledgeScoringEngine.scoreAll();

    // Apply constraints like excludeVendors at request level if any
    const excludeVendors = (req.constraints?.excludeVendors as string[]) || [];
    const excludeCategories = (req.constraints?.excludeCategories as string[]) || [];
    const filteredScored = allScored.filter(p => {
      if (excludeVendors.some(ev => ev.toLowerCase() === p.vendorId.toLowerCase())) return false;
      if (excludeCategories.some(ec => ec.toLowerCase() === p.category.toLowerCase())) return false;
      return true;
    });

    // 2. Generate candidate stack combinations
    const candidateProviderStacks = this.strategy.generate(filteredScored, req, weights);

    // 3. Build detailed debug trace details
    const allProviderScores: ProviderScoreTrace[] = filteredScored.map(p => {
      const preferenceModifierApplied = this.getPreferenceModifiersNet(p, req, weights);
      return {
        providerId: p.id,
        providerName: p.name,
        compositeScore: this.getCompositeScore(p, req, weights),
        workflowScore: WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow),
        featureCoverageScore: StackCoverageAnalyzer.computeProviderCoverageScore(p, req.mustHaveFeatures),
        costEfficiencyScore: p.costEfficiencyScore,
        enterpriseScore: p.enterpriseScore,
        vendorStabilityScore: p.vendorStabilityScore,
        budgetFit: this.isProviderFitForIndividualBudget(p, req),
        preferenceModifierApplied
      };
    });

    const candidateStacksTrace: CandidateStackTrace[] = candidateProviderStacks.map((pStack, idx) => {
      const estimatedCost = this.estimateStackCost(pStack, req.teamSize);
      const isOver = req.monthlyBudget !== null && estimatedCost > req.monthlyBudget;
      return {
        stackId: `cand-${idx + 1}`,
        providerIds: pStack.map(t => t.id),
        rawScore: Math.round(pStack.reduce((sum, p) => sum + this.getCompositeScore(p, req, weights), 0) / pStack.length),
        generationSeed: pStack[0]?.id || '',
        budgetStatus: isOver ? 'over' : 'within'
      };
    });

    // 4. Delegate to StackOptimizer
    // We import dynamically or standardly. Since StackOptimizer is a peer, we import standardly.
    // Note: To avoid circular imports, StackOptimizer will take these candidate provider stacks
    // and optimize them, returning the named tiers.
    const { StackOptimizer } = require('./StackOptimizer');
    const optimizedStackSet = StackOptimizer.optimize(candidateProviderStacks, req, weights);

    // 5. Generate Rejected Alternatives and "Why Not Selected" reasoning
    const selectedProviderIds = new Set<string>();
    const bestOverallStack = optimizedStackSet.bestOverall;
    bestOverallStack.tools.forEach((t: any) => selectedProviderIds.add(t.toolId));

    const alternatives: RejectedAlternative[] = [];
    const rejectedTrace: RecommendationTrace['rejectedProviders'] = [];

    for (const p of filteredScored) {
      if (selectedProviderIds.has(p.id)) continue;

      const whyNotSelected = this.deriveWhyNotSelected(p, bestOverallStack, req, weights);
      const tradeoffVsSelected = this.deriveTradeoff(p, bestOverallStack, req);
      const wouldHaveCovered = StackCoverageAnalyzer.newFeaturesCovered(
        p,
        filteredScored.filter(s => selectedProviderIds.has(s.id)),
        req.mustHaveFeatures
      );

      const cheapestPlan = p.plans.length > 0 
        ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) 
        : 0;

      alternatives.push({
        toolId: p.id,
        toolName: p.name,
        category: p.category,
        compositeScore: this.getCompositeScore(p, req, weights),
        whyNotSelected,
        wouldHaveCovered,
        estimatedMonthlyCostPerSeat: cheapestPlan,
        tradeoffVsSelected
      });

      rejectedTrace.push({
        providerId: p.id,
        providerName: p.name,
        reason: whyNotSelected,
        compositeScore: this.getCompositeScore(p, req, weights),
        wouldHaveCovered
      });
    }

    // 6. Build Budget Simulation
    const budgetSimulation = this.runBudgetSimulation(filteredScored, req, weights);

    // 7. Get Knowledge Version Metadata
    const knowledgeVersion = KnowledgeLoader.getKnowledgeVersionMetadata();

    // 8. Construct final trace for debugging
    const totalDurationMs = Date.now() - startTime;
    const trace: RecommendationTrace = {
      requestId: recommendationId,
      timestamp: new Date().toISOString(),
      strategyUsed: this.strategy.name,
      knowledgeSnapshot: knowledgeVersion,
      allProviderScores,
      candidateStacks: candidateStacksTrace,
      optimizerDecisions: [], // Optimizer can append to this trace dynamically
      rejectedProviders: rejectedTrace,
      totalDurationMs
    };

    // Attach trace optimizer choices
    if (optimizedStackSet._traceDecisions) {
      trace.optimizerDecisions = optimizedStackSet._traceDecisions;
      delete optimizedStackSet._traceDecisions;
    }

    const response: StackRecommendation = {
      recommendationId,
      createdAt: new Date().toISOString(),
      knowledgeVersion,
      stacks: optimizedStackSet,
      alternatives: alternatives.sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 5),
      budgetSimulation,
      featureCoverage: bestOverallStack.coverageResult
    };

    if (req.debug) {
      response.trace = trace;
    }

    return response;
  }

  // ── Helper Score Computations ──────────────────────────────────────────────

  public static getCompositeScore(p: ScoredProviderProfile, req: StackBuilderRequest, weights: any): number {
    const compWeights = weights.compositeScore;
    
    // Core Dimension Scores
    const wScore = WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow);
    const fCoverage = StackCoverageAnalyzer.computeProviderCoverageScore(p, req.mustHaveFeatures);
    
    // Capability Average (reasoning, coding, writing, research etc.)
    const capAvg = (p.reasoningScore + p.codingScore + p.writingScore + p.researchScore + p.longContextScore) / 5;

    let costEff = p.costEfficiencyScore;
    let capWeight = compWeights.capabilityScore;

    // Apply maximizeSavings modifier if toggle is on
    if (req.preferences.maximizeSavings) {
      const modifier = weights.preferenceModifiers?.maximizeSavings;
      costEff = Math.min(100, costEff * (1 + (modifier?.costEfficiencyBoost || 0.15)));
      capWeight = Math.max(0, capWeight + (modifier?.capabilityReduction || -0.10));
    }

    let rawComposite = 
      wScore * (compWeights.workflowMatch || 0.30) +
      fCoverage * (compWeights.featureCoverage || 0.25) +
      capAvg * capWeight +
      costEff * (compWeights.costEfficiency || 0.15) +
      p.enterpriseScore * (compWeights.enterpriseScore || 0.05) +
      p.vendorStabilityScore * (compWeights.vendorStability || 0.05);

    // Apply remaining preference modifiers
    rawComposite += this.getPreferenceModifiersNet(p, req, weights);

    return Math.min(100, Math.max(0, Math.round(rawComposite)));
  }

  private static getPreferenceModifiersNet(p: ScoredProviderProfile, req: StackBuilderRequest, weights: any): number {
    let modifier = 0;
    const pref = weights.preferenceModifiers || {};

    if (req.preferences.avoidLockIn) {
      const lockInVal = p.raw.financialProfile?.vendorLockInRisk;
      if (lockInVal === 'High') {
        modifier += pref.avoidLockIn?.penalty || -10;
      }
    }

    if (req.preferences.preferOpenSource) {
      // If tool is an API or has open source roots
      if (p.raw.apiSupport) {
        modifier += pref.preferOpenSource?.bonus || 5;
      }
    }

    if (req.preferences.preferEstablishedVendors) {
      if (p.vendorStabilityScore < 50) {
        modifier += pref.preferEstablishedVendors?.penalty || -10;
      }
    }

    return modifier;
  }

  private static isProviderFitForIndividualBudget(p: ScoredProviderProfile, req: StackBuilderRequest): boolean {
    if (req.monthlyBudget === null) return true;
    const minCost = p.plans.length > 0 
      ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) 
      : 0;
    return minCost * req.teamSize <= req.monthlyBudget;
  }

  private static estimateStackCost(stack: ScoredProviderProfile[], teamSize: number): number {
    return stack.reduce((sum, tool) => {
      const minCost = tool.plans.length > 0 
        ? Math.min(...tool.plans.map(pl => pl.monthlyPricePerSeat)) 
        : 0;
      return sum + (minCost * teamSize);
    }, 0);
  }

  // ── Rejection Explanation Derivation ──────────────────────────────────────

  private static deriveWhyNotSelected(
    p: ScoredProviderProfile,
    bestStack: RankedStack,
    req: StackBuilderRequest,
    weights: any
  ): string {
    const workflowScore = WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow);
    const featureCoverage = StackCoverageAnalyzer.computeProviderCoverageScore(p, req.mustHaveFeatures);

    if (req.monthlyBudget !== null) {
      const minCost = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
      if (minCost * req.teamSize > req.monthlyBudget) {
        return `Exceeds total monthly budget restriction of $${req.monthlyBudget}/mo.`;
      }
    }

    // Overlap checks
    const overlappingTool = bestStack.tools.find(t => {
      return RelationshipEngine.canReplace(p.id, t.toolId, req.primaryWorkflow);
    });
    if (overlappingTool) {
      return `Functionally overlaps with ${overlappingTool.toolName} already included in the stack.`;
    }

    if (workflowScore < 60) {
      return `Lower capability match for the primary workflow "${req.primaryWorkflow}" (scored ${workflowScore}%).`;
    }

    if (req.mustHaveFeatures.length > 0 && featureCoverage < 30) {
      return `Does not cover enough critical must-have features requested (covers ${featureCoverage}%).`;
    }

    return `Lower overall composite capability score compared to selected alternatives.`;
  }

  private static deriveTradeoff(p: ScoredProviderProfile, bestStack: RankedStack, req: StackBuilderRequest): string {
    const minCost = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
    const avgSelectedCost = bestStack.tools.reduce((sum, t) => sum + t.estimatedMonthlyCostPerTeam, 0) / Math.max(1, bestStack.tools.length) / req.teamSize;

    const coderScore = p.codingScore;
    const bestCoderScore = Math.max(...bestStack.tools.map(t => {
      const sp = KnowledgeScoringEngine.getScored(t.toolId);
      return sp ? sp.codingScore : 0;
    }));

    if (minCost < avgSelectedCost && coderScore < bestCoderScore) {
      return `Offers lower monthly seat cost ($${minCost}/seat/mo) but drops developer coding capabilities (scores ${coderScore} vs ${bestCoderScore} in coding).`;
    }

    if (coderScore > bestCoderScore) {
      return `Superior coding performance (scores ${coderScore} vs ${bestCoderScore}), but at higher vendor pricing or seat overhead.`;
    }

    return `Provides comparable feature performance but doesn't fit optimally with the chosen suite overlap rules.`;
  }

  // ── Budget Simulation ──────────────────────────────────────────────────────

  private static runBudgetSimulation(
    providers: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): BudgetSimulation {
    const simulationBudgets = [40, 80, 150]; // Per-user monthly budgets
    const tiers: BudgetSimulation['tiers'] = [];

    for (const monthlyLimitPerUser of simulationBudgets) {
      const budgetLimit = monthlyLimitPerUser * req.teamSize;
      
      // Simulate by temporarily overriding budget constraint
      const tempReq: StackBuilderRequest = {
        ...req,
        monthlyBudget: budgetLimit
      };

      // Since we want a lightweight simulation, we can resolve it by calling StackOptimizer on candidates
      const { StackOptimizer } = require('./StackOptimizer');
      const candidateProviderStacks = this.strategy.generate(providers, tempReq, weights);
      const tempSet = StackOptimizer.optimize(candidateProviderStacks, tempReq, weights);
      const chosenStack = tempSet.bestOverall;

      tiers.push({
        budgetPerMonth: budgetLimit,
        budgetLabel: `$${monthlyLimitPerUser}/seat/mo`,
        estimatedMonthlyCost: chosenStack.estimatedMonthlyCost,
        coverageScore: chosenStack.coverageResult.coverageScore,
        confidenceScore: chosenStack.confidenceScore,
        stackSummary: chosenStack.tools.map((t: any) => `${t.toolName} (${t.recommendedPlan})`)
      });
    }

    // Add Unlimited Tier
    const unlimitedReq: StackBuilderRequest = {
      ...req,
      monthlyBudget: null
    };
    const { StackOptimizer } = require('./StackOptimizer');
    const unlimitedCandidates = this.strategy.generate(providers, unlimitedReq, weights);
    const unlimitedSet = StackOptimizer.optimize(unlimitedCandidates, unlimitedReq, weights);
    const unlimitedStack = unlimitedSet.bestOverall;

    tiers.push({
      budgetPerMonth: null,
      budgetLabel: 'Unlimited Budget',
      estimatedMonthlyCost: unlimitedStack.estimatedMonthlyCost,
      coverageScore: unlimitedStack.coverageResult.coverageScore,
      confidenceScore: unlimitedStack.confidenceScore,
      stackSummary: unlimitedStack.tools.map((t: any) => `${t.toolName} (${t.recommendedPlan})`)
    });

    return { tiers };
  }
}
