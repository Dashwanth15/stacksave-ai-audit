// ============================================================
// Workflow Engine — StackSave AI Platform Intelligence
//
// Dynamically derives workflow suitability scores mathematically from
// provider capabilities and workflow-weights matrix. Zero hardcoding.
// ============================================================

import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';

export class WorkflowEngine {
  /**
   * Calculates the suitability score (0-100) of a provider for a specific workflow.
   */
  public static calculateSuitability(provider: ProviderProfile, workflow: string): number {
    const weights = KnowledgeLoader.getWorkflowWeights();
    const workflowMap = weights[workflow] || weights['general'] || weights['coding'] || {};

    let weightedScoreSum = 0;
    let maxPossibleSum = 0;

    for (const [cap, weight] of Object.entries(workflowMap)) {
      if (weight <= 0) continue;
      const score = provider.capabilities[cap]?.score || 0;
      weightedScoreSum += score * weight;
      maxPossibleSum += 10 * weight;
    }

    if (maxPossibleSum === 0) return 50;
    return Math.round((weightedScoreSum / maxPossibleSum) * 100);
  }

  /**
   * Calculates suitability scores across all supported workflows for a provider.
   */
  public static evaluateAllWorkflows(provider: ProviderProfile): Record<string, number> {
    const weights = KnowledgeLoader.getWorkflowWeights();
    const results: Record<string, number> = {};

    for (const workflow of Object.keys(weights)) {
      results[workflow] = this.calculateSuitability(provider, workflow);
    }

    return results;
  }

  /**
   * Calculates the maximum suitability score for a workflow across a complete stack of providers.
   */
  public static calculateStackSuitability(profiles: ProviderProfile[]): Record<string, number> {
    const weights = KnowledgeLoader.getWorkflowWeights();
    const stackSuitability: Record<string, number> = {};

    for (const workflow of Object.keys(weights)) {
      let maxScore = 0;
      for (const p of profiles) {
        maxScore = Math.max(maxScore, this.calculateSuitability(p, workflow));
      }
      stackSuitability[workflow] = maxScore;
    }

    return stackSuitability;
  }
}
