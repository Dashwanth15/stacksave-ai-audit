// ============================================================
// Proposal Optimization Engine — StackSave AI Platform
//
// Evaluates overall stack configurations via heuristic greedy search
// driven by strategy configurations and workflow weight matrices.
// ============================================================

import { ToolEntry, UseCase, DecisionLog, ProposalEvaluation } from '../../types';
import { KnowledgeLoader } from './KnowledgeLoader';
import { StackCoverageEngine } from './StackCoverageEngine';
import { RelationshipEngine } from './RelationshipEngine';

export class ProposalEngine {
  /**
   * Evaluates the complete active stack and returns the best optimized stack state
   * and the structured DecisionLog.
   */
  public static evaluateStack(
    tools: ToolEntry[],
    useCase: UseCase,
    strategy: 'performance' | 'savings',
    optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance' = 'balanced'
  ): { decommissionedTools: string[]; decisionLog: DecisionLog } {
    KnowledgeLoader.initialize();

    const config = KnowledgeLoader.getStrategyConfig();
    const settings = config[strategy] || config['performance'];
    const weights = settings.weights;

    const originalTools: string[] = tools.map((t) => t.toolId as string);

    // Dynamically discover overlap clusters using RelationshipEngine.
    // Tools with workflowOverlap >= threshold are grouped together as optimization candidates.
    // Singleton clusters (no overlapping peers) are left unchanged.
    const clusters = RelationshipEngine.clusterByOverlap(originalTools, useCase);

    // Build a map of cluster-index → ToolEntry[] for proposal generation
    const groups: Array<{ name: string; toolIds: string[] }> = clusters
      .filter(cluster => cluster.length >= 2) // Only multi-tool clusters need proposals
      .map((cluster, idx) => ({
        name: `cluster-${idx}`,
        toolIds: cluster
      }));

    // Initial state setup
    let currentStack: string[] = [...originalTools];
    const proposalsEvaluated: ProposalEvaluation[] = [];
    const selectedProposals: string[] = [];

    // Score the baseline stack
    const baselineEvaluation = this.evaluateState(
      originalTools,
      currentStack,
      tools,
      useCase,
      strategy,
      'keep-current',
      'Keep Current Stack',
      optimizationGoal
    );
    proposalsEvaluated.push(baselineEvaluation);

    let baselineScore = baselineEvaluation.businessValueScore;
    let finalScore = baselineScore;

    // Process each cluster independently to select its best proposal
    for (const group of groups) {
      const toolIdsInGroup = group.toolIds;
      const groupCandidates = this.generateGroupProposals(group.name, toolIdsInGroup, useCase);

      let bestProposal: ProposalEvaluation | null = null;
      let maxScoreImprovement = 0;

      for (const candidate of groupCandidates) {
        // Build the global candidate stack by applying this proposal
        const candidateStack = currentStack
          .filter((id) => !toolIdsInGroup.includes(id))
          .concat(candidate.keptTools);

        const evaluation = this.evaluateState(
          originalTools,
          candidateStack,
          tools,
          useCase,
          strategy,
          candidate.id,
          candidate.name,
          optimizationGoal
        );
        proposalsEvaluated.push(evaluation);

        if (evaluation.isValid) {
          const scoreImprovement = evaluation.businessValueScore - finalScore;
          if (scoreImprovement > maxScoreImprovement) {
            maxScoreImprovement = scoreImprovement;
            bestProposal = evaluation;
          }
        }
      }

      // If we found a valid proposal that yields positive improvement, apply it permanently
      if (bestProposal && maxScoreImprovement > 0) {
        currentStack = currentStack
          .filter((id) => !toolIdsInGroup.includes(id))
          .concat(bestProposal.keptTools);
        selectedProposals.push(bestProposal.id);
        finalScore = bestProposal.businessValueScore;
      }
    }

    const decommissionedTools = originalTools.filter((id) => !currentStack.includes(id));

    // Calculate overall confidence based on final score spreads
    const confidence = finalScore >= baselineScore + 10 ? 'High' : finalScore >= baselineScore + 2 ? 'Medium' : 'Low';

    const decisionLog: DecisionLog = {
      strategy,
      useCase,
      baselineScore: Math.round(baselineScore),
      proposalsEvaluated: proposalsEvaluated.map((p) => ({
        ...p,
        businessValueScore: Math.round(p.businessValueScore),
        workflowCapability: Math.round(p.workflowCapability),
        capabilityRetention: Math.round(p.capabilityRetention),
        productivityImpact: Math.round(p.productivityImpact),
        migrationRisk: Math.round(p.migrationRisk)
      })),
      selectedProposals,
      finalScore: Math.round(finalScore),
      confidence
    };

    return {
      decommissionedTools,
      decisionLog
    };
  }

  /**
   * Generates neutral optimization proposals for an overlap cluster.
   * Proposals describe strategies, not outcomes.
   * The BusinessValueEngine determines which is actually best.
   */
  private static generateGroupProposals(
    groupName: string,
    toolIds: string[],
    useCase: UseCase
  ): Array<{ id: string; name: string; keptTools: string[] }> {
    if (toolIds.length <= 1) return [];

    const candidates: Array<{ id: string; name: string; keptTools: string[] }> = [];

    // 1. Single Provider Consolidations — evaluate each tool as the sole survivor
    for (const toolId of toolIds) {
      const profile = KnowledgeLoader.getProvider(toolId);
      const name = profile ? profile.name : toolId;
      candidates.push({
        id: `consolidate-single-${toolId}`,
        name: `Single Provider Consolidation (${name})`,
        keptTools: [toolId]
      });
    }

    // 2. Remove Redundant Providers — keep the dominant tool, drop duplicates/high-overlap
    // Uses RelationshipEngine for dynamic relationship detection (no hardcoded lists)
    const redundantKept: string[] = [];
    const duplicatesRemoved = new Set<string>();

    for (let i = 0; i < toolIds.length; i++) {
      const idA = toolIds[i];
      if (duplicatesRemoved.has(idA)) continue;

      redundantKept.push(idA);

      for (let j = i + 1; j < toolIds.length; j++) {
        const idB = toolIds[j];
        const rel = RelationshipEngine.analyze(idA, idB, useCase);
        if (rel && (rel.relationshipType === 'Duplicate' || rel.relationshipType === 'High Overlap')) {
          const isAWinner = rel.dominance.winnerId === idA;
          const loser = isAWinner ? idB : idA;
          duplicatesRemoved.add(loser);
          if (loser === idA) {
            redundantKept.pop();
            redundantKept.push(idB);
            break;
          }
        }
      }
    }

    // Only add if it actually reduces the group (would change from keep-current)
    if (redundantKept.length > 0 && redundantKept.length < toolIds.length && redundantKept.length > 1) {
      candidates.push({
        id: `remove-redundant-${groupName}`,
        name: 'Remove Redundant Providers',
        keptTools: redundantKept
      });
    }

    return candidates;
  }

  /**
   * Evaluates a complete stack state and returns its ProposalEvaluation metrics.
   */
  private static evaluateState(
    originalTools: string[],
    proposedTools: string[],
    tools: ToolEntry[],
    useCase: UseCase,
    strategy: 'performance' | 'savings',
    id: string,
    name: string,
    optimizationGoal: 'savings' | 'balanced' | 'productivity' | 'governance' = 'balanced'
  ): ProposalEvaluation {
    const config = KnowledgeLoader.getStrategyConfig();
    const settings = config[strategy] || config['performance'];
    const baseW = settings.weights;
    const w = { ...baseW };

    if (optimizationGoal === 'savings') {
      w.monthlyCost = Math.min(0.60, w.monthlyCost + 0.10);
      w.workflowCapability = Math.max(0.15, w.workflowCapability - 0.05);
      w.productivityImpact = Math.max(0.05, w.productivityImpact - 0.05);
    } else if (optimizationGoal === 'productivity') {
      w.workflowCapability += 0.08;
      w.productivityImpact += 0.08;
      w.monthlyCost = Math.max(0.02, w.monthlyCost - 0.16);
    } else if (optimizationGoal === 'governance') {
      w.capabilityRetention += 0.08;
      w.migrationRisk += 0.08;
      w.monthlyCost = Math.max(0.02, w.monthlyCost - 0.16);
    }

    const useCaseWeights = KnowledgeLoader.getWorkflowWeights()[useCase] || KnowledgeLoader.getWorkflowWeights()['general'] || {};

    const originalCoverage = StackCoverageEngine.calculateCoverage(originalTools);
    const proposedCoverage = StackCoverageEngine.calculateCoverage(proposedTools);

    const initialCost = tools.reduce((sum, t) => sum + t.monthlySpend, 0);
    const proposedCost = tools
      .filter((t) => proposedTools.includes(t.toolId))
      .reduce((sum, t) => sum + t.monthlySpend, 0);

    const monthlySavings = initialCost - proposedCost;

    // 1. Workflow Capability (Weighted max score pct)
    let maxPossibleWeightSum = 0;
    let originalWeightedSum = 0;
    let proposedWeightedSum = 0;

    for (const [cap, weight] of Object.entries(useCaseWeights)) {
      maxPossibleWeightSum += 10 * weight;
      originalWeightedSum += (originalCoverage[cap] || 0) * weight;
      proposedWeightedSum += (proposedCoverage[cap] || 0) * weight;
    }

    const workflowCapability = maxPossibleWeightSum > 0 ? (proposedWeightedSum / maxPossibleWeightSum) * 100 : 100;
    const qualityDelta = maxPossibleWeightSum > 0 ? ((proposedWeightedSum - originalWeightedSum) / maxPossibleWeightSum) * 100 : 0;

    // 2. Monthly Savings Score (percent budget saved)
    const savingsScore = initialCost > 0 ? (monthlySavings / initialCost) * 100 : 100;

    // 3. Capability Retention Ratio
    let originalCount = 0;
    let retainedCount = 0;
    let isValid = true;
    const acceptedConstraints: string[] = [];
    const failedConstraints: string[] = [];

    const minCap = settings.minimumCapability;
    const maxCapLoss = settings.maximumCapabilityLoss;
    const minRetention = settings.minimumRetention;

    for (const [cap, weight] of Object.entries(useCaseWeights)) {
      if (weight >= (settings.minimumWeightProtected || 5)) {
        const originalScore = originalCoverage[cap] || 0;
        const proposedScore = proposedCoverage[cap] || 0;

        if (originalScore >= 7) {
          originalCount++;
          if (proposedScore >= minCap) {
            retainedCount++;
          } else {
            isValid = false;
            failedConstraints.push(`Capability '${cap}' score ${proposedScore} drops below minimum ${minCap}`);
          }
        }

        if (proposedScore < originalScore - maxCapLoss) {
          isValid = false;
          failedConstraints.push(`Capability '${cap}' loss exceeds maximum degradation limit ${maxCapLoss}`);
        }
      }
    }

    let capabilityRetention = 100;
    if (originalCount > 0) {
      capabilityRetention = (retainedCount / originalCount) * 100;
      if (capabilityRetention < minRetention) {
        isValid = false;
        failedConstraints.push(`Overall stack capability retention ${capabilityRetention.toFixed(0)}% is below minimum required ${minRetention}%`);
      }
    }

    if (isValid) {
      acceptedConstraints.push('Workflow capability coverage threshold satisfied');
      acceptedConstraints.push('Capability loss limits satisfied');
      acceptedConstraints.push('Overall capability retention satisfied');
    }

    // 4. Productivity Score (Retained DX/Velocity)
    let prodA = 0, prodB = 0;
    let velA = 0, velB = 0;

    for (const id of originalTools) {
      const p = KnowledgeLoader.getProvider(id);
      if (p) {
        prodA = Math.max(prodA, p.productivityScores.developerExperience);
        velA = Math.max(velA, p.productivityScores.velocity);
      }
    }
    for (const id of proposedTools) {
      const p = KnowledgeLoader.getProvider(id);
      if (p) {
        prodB = Math.max(prodB, p.productivityScores.developerExperience);
        velB = Math.max(velB, p.productivityScores.velocity);
      }
    }

    const prodDelta = prodB - prodA;
    const velDelta = velB - velA;
    const maxDrop = Math.max(0, -prodDelta, -velDelta);
    const productivityImpact = 100 - maxDrop * 10;

    // Enforce Smart Savings productivity loss limit
    if (strategy === 'savings' && maxDrop > 1.0) {
      isValid = false;
      failedConstraints.push(`Productivity velocity loss ${maxDrop.toFixed(1)} exceeds maximum limit 1.0`);
    }

    // 5. Migration Risk Score
    let migrationPenalty = 0;
    let learningPenalty = 0;
    let riskPenalty = 0;

    const decommissioned = originalTools.filter((id) => !proposedTools.includes(id));

    for (const id of decommissioned) {
      const profile = KnowledgeLoader.getProvider(id);
      if (profile) {
        const migCost = profile.productivityScores.migrationCost;
        if (migCost === 'High') migrationPenalty -= 40;
        else if (migCost === 'Medium') migrationPenalty -= 20;
        else if (migCost === 'Low') migrationPenalty -= 5;

        const curve = profile.productivityScores.learningCurve;
        if (curve === 'High') learningPenalty -= 20;
        else if (curve === 'Medium') learningPenalty -= 10;
        else if (curve === 'Low') learningPenalty -= 2;

        const risk = profile.productivityScores.risk;
        if (risk === 'High') riskPenalty -= 30;
        else if (risk === 'Medium') riskPenalty -= 15;
      }
    }

    const migrationRisk = 100 + migrationPenalty + learningPenalty + riskPenalty;

    // Enforce Smart Savings migration cost limits
    if (strategy === 'savings' && migrationPenalty < -5) {
      isValid = false;
      failedConstraints.push(`Migration penalty cost is too high (${migrationPenalty})`);
    }

    // 6. Overall Business Value Score
    const businessValueScore =
      w.workflowCapability * workflowCapability +
      w.monthlyCost * savingsScore +
      w.capabilityRetention * capabilityRetention +
      w.productivityImpact * productivityImpact +
      w.migrationRisk * migrationRisk;

    return {
      id,
      name,
      keptTools: proposedTools,
      decommissionedTools: decommissioned,
      monthlyCost: proposedCost,
      monthlySavings,
      workflowCapability,
      capabilityRetention,
      productivityImpact,
      migrationRisk,
      businessValueScore,
      isValid,
      acceptedConstraints,
      failedConstraints
    };
  }
}
