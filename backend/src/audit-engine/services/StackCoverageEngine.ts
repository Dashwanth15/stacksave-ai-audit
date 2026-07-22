// ============================================================
// Stack Coverage Engine — StackSave AI Platform Intelligence
//
// Models capability coverage across the complete tool stack.
// Verifies that proposed modifications do not degrade the overall
// ecosystem's ability to satisfy workflow requirements.
// ============================================================

import { KnowledgeLoader } from './KnowledgeLoader';

export class StackCoverageEngine {
  /**
   * Calculates the maximum capability scores across the complete tool stack.
   */
  public static calculateCoverage(toolIds: string[]): Record<string, number> {
    const coverage: Record<string, number> = {};

    for (const toolId of toolIds) {
      const profile = KnowledgeLoader.getProvider(toolId);
      if (!profile) continue;

      for (const [cap, data] of Object.entries(profile.capabilities)) {
        const score = (data as any).score || 0;
        coverage[cap] = Math.max(coverage[cap] || 0, score);
      }
    }

    return coverage;
  }

  public static verifyProposedStack(
    originalTools: string[],
    proposedTools: string[],
    useCase: string,
    strategy: 'performance' | 'savings' = 'performance'
  ): boolean {
    const weights = KnowledgeLoader.getWorkflowWeights();
    const useCaseWeights = weights[useCase] || weights['general'] || {};

    const originalCoverage = this.calculateCoverage(originalTools);
    const proposedCoverage = this.calculateCoverage(proposedTools);

    const config = KnowledgeLoader.getStrategyConfig();
    const settings = config[strategy] || config['performance'];

    const minCap = settings.minimumCapability;
    const maxCapLoss = settings.maximumCapabilityLoss;
    const minRetention = settings.minimumRetention;

    let originalCount = 0;
    let retainedCount = 0;

    for (const [cap, weight] of Object.entries(useCaseWeights)) {
      if (weight >= (settings.minimumWeightProtected || 5)) {
        const originalScore = originalCoverage[cap] || 0;
        const proposedScore = proposedCoverage[cap] || 0;

        if (originalScore >= 7) {
          originalCount++;
          if (proposedScore >= minCap) {
            retainedCount++;
          }

          // Enforce minimum capability threshold
          if (proposedScore < minCap) {
            return false;
          }
        }

        // Enforce maximum capability loss for any single capability
        if (proposedScore < originalScore - maxCapLoss) {
          return false;
        }
      }
    }

    if (originalCount > 0) {
      const retentionRatio = (retainedCount / originalCount) * 100;
      if (retentionRatio < minRetention) {
        return false;
      }
    }

    return true;
  }
}
