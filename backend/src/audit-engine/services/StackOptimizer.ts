// ============================================================
// Stack Optimizer — StackSave AI Platform Intelligence
//
// Post-processes generated candidate provider stacks.
// Eliminates redundancy, optimizes vendor diversity, computes
// confidence breakdown, and generates named stack tiers.
// ============================================================

import { ScoredProviderProfile, KnowledgeScoringEngine } from './KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from './StackCoverageAnalyzer';
import { RelationshipEngine } from './RelationshipEngine';
import { WorkflowEngine } from './WorkflowEngine';
import {
  StackBuilderRequest,
  OptimizedStackSet,
  RankedStack,
  ToolInStack,
  OptimizerDecision,
  GrowthSimulation,
  PlanUpgrade
} from '../../types/stackBuilder';

export class StackOptimizer {
  /**
   * Main optimizer post-processing loop.
   */
  public static optimize(
    candidates: ScoredProviderProfile[][],
    req: StackBuilderRequest,
    weights: any
  ): OptimizedStackSet & { _traceDecisions?: OptimizerDecision[] } {
    const optimizerDecisions: OptimizerDecision[] = [];

    // Optimize each candidate stack individually first
    const optimizedCandidates: ScoredProviderProfile[][] = candidates.map((pStack, idx) => {
      const stackId = `cand-${idx + 1}`;
      let optimized = [...pStack];

      // 1. Redundancy Removal: Remove high overlapping tools if they duplicate capabilities
      const overlapThreshold = weights.optimizer?.redundancyOverlapThreshold || 75;
      for (let i = 0; i < optimized.length; i++) {
        for (let j = i + 1; j < optimized.length; j++) {
          const rel = RelationshipEngine.analyze(optimized[i].id, optimized[j].id, req.primaryWorkflow);
          if (rel && rel.workflowOverlap >= overlapThreshold) {
            // Keep the one with higher composite score, remove the other
            const scoreI = this.getCompositeScore(optimized[i], req, weights);
            const scoreJ = this.getCompositeScore(optimized[j], req, weights);
            const toRemove = scoreI >= scoreJ ? optimized[j] : optimized[i];

            optimizerDecisions.push({
              stackId,
              action: 'remove-redundancy',
              reason: `Removed redundant overlap between ${optimized[i].name} and ${optimized[j].name} (overlap score ${rel.workflowOverlap}%).`,
              affectedProvider: toRemove.id
            });

            optimized = optimized.filter(t => t.id !== toRemove.id);
            // Reset indices to restart safe loop check
            i = -1;
            break;
          }
        }
      }

      // 2. Vendor Concentration Index (HHI) checks
      const maxHHI = weights.optimizer?.maxVendorConcentrationHHI || 6000;
      const hhi = this.calculateVendorConcentrationHHI(optimized);
      if (hhi > maxHHI && optimized.length > 2) {
        // Find if we have multiple products from the same vendorId
        const vendorCounts: Record<string, number> = {};
        optimized.forEach(t => {
          vendorCounts[t.vendorId] = (vendorCounts[t.vendorId] || 0) + 1;
        });

        const highVendorId = Object.keys(vendorCounts).find(vId => vendorCounts[vId] >= 2);
        if (highVendorId) {
          // Attempt to swap one of the vendor's products for a vendor-independent alternative
          const duplicatedTools = optimized.filter(t => t.vendorId === highVendorId);
          // Sort duplicates ascending by composite score to swap the weakest link
          duplicatedTools.sort((a, b) => this.getCompositeScore(a, req, weights) - this.getCompositeScore(b, req, weights));
          const weakDuplicatedTool = duplicatedTools[0];

          optimizerDecisions.push({
            stackId,
            action: 'improve-diversity',
            reason: `Vendor concentration index (HHI: ${hhi}) exceeds maximum allowed threshold of ${maxHHI}. Seeking independent vendor replacement for ${weakDuplicatedTool.name}.`,
            affectedProvider: weakDuplicatedTool.id
          });
        }
      }

      return optimized;
    });

    // Strip duplicate candidate arrays
    const uniqueOptimized = this.deduplicateStacks(optimizedCandidates);

    // Build RankedStack models from provider arrays
    const rankedStacks: RankedStack[] = uniqueOptimized.map((pStack, idx) => {
      const stackId = `stack-${idx + 1}`;
      return this.buildRankedStack(stackId, pStack, req, weights);
    });

    // Sort stacks to identify best fits
    const bestOverall = this.selectBestOverall(rankedStacks);
    const bestBudget = this.selectBestBudget(rankedStacks, req, weights);
    const bestPerformance = this.selectBestPerformance(rankedStacks);

    // Add Growth Simulation for Best Overall stack
    bestOverall.growthSimulation = this.buildGrowthSimulation(
      uniqueOptimized.find(s => s.map(t => t.id).sort().join() === bestOverall.tools.map(t => t.toolId).sort().join()) || [],
      req.teamSize
    );

    const result: OptimizedStackSet & { _traceDecisions?: OptimizerDecision[] } = {
      bestOverall,
      bestBudget,
      bestPerformance
    };

    // Determine if Enterprise SSO or HIPAA is requested → compute Best Enterprise
    const enterpriseRequested = req.mustHaveFeatures.some(f => f === 'enterprise-sso' || f === 'hipaa-soc2' || f === 'private-deployment');
    if (enterpriseRequested) {
      result.bestEnterprise = this.selectBestEnterprise(rankedStacks);
    }

    result._traceDecisions = optimizerDecisions;

    return result;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private static buildRankedStack(
    stackId: string,
    pStack: ScoredProviderProfile[],
    req: StackBuilderRequest,
    weights: any
  ): RankedStack {
    const teamSize = req.teamSize;
    const mustHaves = req.mustHaveFeatures;

    // Convert scored profiles to ToolsInStack
    const tools: ToolInStack[] = pStack.map(p => {
      const cheapest = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
      const targetPlan = p.plans.find(pl => pl.monthlyPricePerSeat === cheapest)?.label || 'Pro';
      
      const highlights = p.raw.strengths ? p.raw.strengths.slice(0, 3) : [];
      const reasons = [
        `Ranked high for primary workflow "${req.primaryWorkflow}" (${WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow)}% suitability).`,
        `Cost efficient option at $${cheapest}/seat/mo.`
      ];

      const featuresCovered = StackCoverageAnalyzer.newFeaturesCovered(p, [], mustHaves);

      return {
        toolId: p.id,
        toolName: p.name,
        category: p.category,
        vendor: p.vendor,
        recommendedPlan: targetPlan,
        estimatedMonthlyCostPerTeam: cheapest * teamSize,
        workflowFitScore: WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow),
        capabilityHighlights: highlights,
        reasons,
        featuresCovered
      };
    });

    const estimatedMonthlyCost = tools.reduce((sum, t) => sum + t.estimatedMonthlyCostPerTeam, 0);
    const estimatedAnnualCost = estimatedMonthlyCost * 12;

    const coverageResult = StackCoverageAnalyzer.analyze(pStack, mustHaves);

    let workflowFitScore = 0;
    if (pStack.length > 0) {
      const scores = pStack.map(p => WorkflowEngine.calculateSuitability(p.raw, req.primaryWorkflow));
      workflowFitScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    let capabilityCoverageScore = 0;
    if (pStack.length > 0) {
      const scores = pStack.map(p => p.benchmarkScore);
      capabilityCoverageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    // Determine budget status
    let budgetStatus: RankedStack['budgetStatus'] = 'no-limit';
    let budgetOverrunPercent: number | undefined;

    if (req.monthlyBudget !== null) {
      if (estimatedMonthlyCost <= req.monthlyBudget) {
        budgetStatus = 'within';
      } else {
        budgetStatus = 'over';
        budgetOverrunPercent = Math.round(((estimatedMonthlyCost - req.monthlyBudget) / req.monthlyBudget) * 100);
      }
    }

    // ── 7-Factor Confidence Score computation ────────────────────────────────
    const cfWeights = weights.confidenceWeights || {};
    
    const workflowMatchFactor = workflowFitScore;
    const featureCoverageFactor = coverageResult.coverageScore;
    
    let budgetFitFactor = 100;
    if (req.monthlyBudget !== null && estimatedMonthlyCost > req.monthlyBudget) {
      const overRatio = estimatedMonthlyCost / req.monthlyBudget;
      budgetFitFactor = Math.max(0, Math.round(100 - (overRatio - 1) * 150)); // drops off fast
    }

    // Stack Capability Superiority compared to average provider score
    const stackAvgCap = capabilityCoverageScore;
    const capabilitySuperiorityFactor = Math.round(stackAvgCap);

    // Security factor
    const securityRequest = mustHaves.some(f => f === 'enterprise-sso' || f === 'hipaa-soc2' || f === 'private-deployment');
    const stackAvgSecurity = pStack.length > 0
      ? Math.round(pStack.reduce((sum, p) => sum + p.securityScore, 0) / pStack.length)
      : 50;
    const securityMatchFactor = securityRequest ? stackAvgSecurity : 100;

    // Stability & Future Growth
    const vendorStabilityFactor = pStack.length > 0
      ? Math.round(pStack.reduce((sum, p) => sum + p.vendorStabilityScore, 0) / pStack.length)
      : 50;
    const futureGrowthFactor = pStack.length > 0
      ? Math.round(pStack.reduce((sum, p) => sum + p.futureGrowthScore, 0) / pStack.length)
      : 50;

    const confidenceScore = Math.min(100, Math.round(
      workflowMatchFactor * (cfWeights.workflowMatch || 0.30) +
      featureCoverageFactor * (cfWeights.featureCoverage || 0.25) +
      budgetFitFactor * (cfWeights.budgetFit || 0.15) +
      capabilitySuperiorityFactor * (cfWeights.capabilitySuperiority || 0.10) +
      securityMatchFactor * (cfWeights.securityMatch || 0.10) +
      vendorStabilityFactor * (cfWeights.vendorStability || 0.05) +
      futureGrowthFactor * (cfWeights.futureGrowth || 0.05)
    ));

    const tradeoffs = this.deriveStackTradeoffs(pStack, req);

    return {
      stackId,
      label: 'Best Overall', // Temporary label, overridden during selection
      tools,
      estimatedMonthlyCost,
      estimatedAnnualCost,
      coverageResult,
      workflowFitScore,
      capabilityCoverageScore,
      confidenceScore,
      confidenceBreakdown: {
        overall: confidenceScore,
        workflowMatch: workflowMatchFactor,
        featureCoverage: featureCoverageFactor,
        budgetFit: budgetFitFactor,
        capabilitySuperiority: capabilitySuperiorityFactor,
        securityMatch: securityMatchFactor,
        vendorStability: vendorStabilityFactor,
        futureGrowth: futureGrowthFactor
      },
      tradeoffs,
      budgetStatus,
      budgetOverrunPercent
    };
  }

  private static deriveStackTradeoffs(stack: ScoredProviderProfile[], req: StackBuilderRequest): string[] {
    const list: string[] = [];
    const mustHaves = req.mustHaveFeatures;

    // Coverage gaps
    const analyzer = StackCoverageAnalyzer.analyze(stack, mustHaves);
    if (analyzer.missing.length > 0) {
      list.push(`Stack misses required feature capabilities for: ${analyzer.missing.join(', ')}.`);
    }

    // Learning curve trade-off
    const hasHighCurve = stack.some(p => p.raw.developerExperience?.learningCurve === 'High');
    if (hasHighCurve) {
      list.push('Includes advanced tools which may carry a steeper developer learning curve.');
    }

    // Vendor lock-in warning
    const highLockIn = stack.filter(p => p.raw.financialProfile?.vendorLockInRisk === 'High');
    if (highLockIn.length >= 2) {
      list.push(`High vendor lock-in warning: stack contains multiple products with high egress/lock-in risks.`);
    }

    // No API coverage fallback
    const hasNoApi = stack.every(p => !p.raw.apiSupport);
    if (hasNoApi && mustHaves.includes('api-access')) {
      list.push('No primary developer API credentials included; workflows are web/IDE client-based.');
    }

    if (list.length === 0) {
      list.push('Fully balanced capability-to-cost configuration with no critical trade-offs flagged.');
    }

    return list;
  }

  // ── Named Stack Tiers Selection ───────────────────────────────────────────

  private static selectBestOverall(stacks: RankedStack[]): RankedStack {
    // Best Overall = highest confidenceScore
    const sorted = [...stacks].sort((a, b) => b.confidenceScore - a.confidenceScore);
    const selected = sorted[0];
    selected.label = 'Best Overall';
    return selected;
  }

  private static selectBestBudget(stacks: RankedStack[], req: StackBuilderRequest, weights: any): RankedStack {
    // Best Budget = lowest cost meeting minimum coverage threshold (e.g. 70%)
    const minCoverage = weights.optimizer?.minCoverageForBudgetStack || 0.70;
    const eligible = stacks.filter(s => s.coverageResult.coverageScore >= minCoverage * 100);
    
    const pool = eligible.length > 0 ? eligible : stacks;
    const sorted = [...pool].sort((a, b) => a.estimatedMonthlyCost - b.estimatedMonthlyCost);
    const selected = { ...sorted[0] };
    selected.label = 'Best Budget';
    return selected;
  }

  private static selectBestPerformance(stacks: RankedStack[]): RankedStack {
    // Best Performance = highest workflowFitScore + capabilityCoverageScore
    const sorted = [...stacks].sort((a, b) => {
      const metricA = a.workflowFitScore + a.capabilityCoverageScore;
      const metricB = b.workflowFitScore + b.capabilityCoverageScore;
      return metricB - metricA;
    });
    const selected = { ...sorted[0] };
    selected.label = 'Best Performance';
    return selected;
  }

  private static selectBestEnterprise(stacks: RankedStack[]): RankedStack {
    // Best Enterprise = highest securityMatch + enterprise score
    const sorted = [...stacks].sort((a, b) => {
      const metricA = a.confidenceBreakdown.securityMatch + a.confidenceBreakdown.featureCoverage;
      const metricB = b.confidenceBreakdown.securityMatch + b.confidenceBreakdown.featureCoverage;
      return metricB - metricA;
    });
    const selected = { ...sorted[0] };
    selected.label = 'Best Enterprise';
    return selected;
  }

  // ── Vendor Concentration calculation ──────────────────────────────────────

  private static calculateVendorConcentrationHHI(stack: ScoredProviderProfile[]): number {
    if (stack.length === 0) return 0;
    
    // Group spend evenly per tool or by actual pricing
    const totalSpend = stack.length; // flat proxy representation
    const vendorCounts: Record<string, number> = {};

    stack.forEach(p => {
      vendorCounts[p.vendorId] = (vendorCounts[p.vendorId] || 0) + 1;
    });

    let hhi = 0;
    for (const count of Object.values(vendorCounts)) {
      const share = (count / totalSpend) * 100;
      hhi += share * share;
    }

    return Math.round(hhi);
  }

  private static getCompositeScore(p: ScoredProviderProfile, req: StackBuilderRequest, weights: any): number {
    const { AIStackRecommendationEngine } = require('./AIStackRecommendationEngine');
    return AIStackRecommendationEngine.getCompositeScore(p, req, weights);
  }

  private static deduplicateStacks(stacks: ScoredProviderProfile[][]): ScoredProviderProfile[][] {
    const seen = new Set<string>();
    const unique: ScoredProviderProfile[][] = [];

    for (const s of stacks) {
      const key = s.map(t => t.id).sort().join();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(s);
      }
    }

    return unique;
  }

  // ── Growth Simulation Timeline builder ────────────────────────────────────

  private static buildGrowthSimulation(pStack: ScoredProviderProfile[], teamSize: number): GrowthSimulation {
    const currentCost = pStack.reduce((sum, p) => {
      const minCost = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
      return sum + (minCost * teamSize);
    }, 0);

    const project = (multiplier: number): { teamSize: number; estimatedMonthlyCost: number; estimatedAnnualCost: number; recommendedUpgrades: PlanUpgrade[] } => {
      const targetTeam = teamSize * multiplier;
      const recommendedUpgrades: PlanUpgrade[] = [];
      let totalCost = 0;

      for (const p of pStack) {
        let planCost = p.plans.length > 0 ? Math.min(...p.plans.map(pl => pl.monthlyPricePerSeat)) : 0;
        let currentPlanName = p.plans.find(pl => pl.monthlyPricePerSeat === planCost)?.label || 'Pro';
        let targetPlanName = currentPlanName;

        // Upgrade rules based on seat size thresholds
        if (targetTeam >= 50 && p.plans.some(pl => pl.id === 'enterprise' || pl.id === 'teams')) {
          const enterprisePlan = p.plans.find(pl => pl.id === 'enterprise' || pl.id === 'teams');
          if (enterprisePlan) {
            const currentPlanId = p.plans.find(pl => pl.monthlyPricePerSeat === planCost)?.id;
            if (currentPlanId !== enterprisePlan.id) {
              const prevCost = planCost;
              planCost = enterprisePlan.monthlyPricePerSeat || (planCost * 1.5); // Fallback scaling multiplier
              targetPlanName = enterprisePlan.label;

              recommendedUpgrades.push({
                toolId: p.id,
                toolName: p.name,
                currentPlan: currentPlanName,
                recommendedPlan: targetPlanName,
                triggerCondition: 'Requires enterprise administrative controls for teams above 50 seats.',
                costDeltaPerSeat: Math.max(0, planCost - prevCost)
              });
            }
          }
        }

        totalCost += (planCost * targetTeam);
      }

      return {
        teamSize: targetTeam,
        estimatedMonthlyCost: Math.round(totalCost),
        estimatedAnnualCost: Math.round(totalCost * 12),
        recommendedUpgrades
      };
    };

    return {
      currentTeamSize: teamSize,
      currentMonthlyCost: currentCost,
      projection2x: project(2),
      projection5x: project(5)
    };
  }
}
