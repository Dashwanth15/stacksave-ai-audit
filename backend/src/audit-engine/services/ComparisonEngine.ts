// ============================================================
// Comparison Engine — StackSave AI Platform Intelligence
//
// Reusable engine for comparing providers, stacks, and current
// vs recommended suites. Consumes ScoredProviderProfile.
// ============================================================

import { ScoredProviderProfile, KnowledgeScoringEngine } from './KnowledgeScoringEngine';
import { RelationshipEngine } from './RelationshipEngine';
import { StackCoverageAnalyzer } from './StackCoverageAnalyzer';

export interface ProviderComparison {
  idA: string;
  nameA: string;
  idB: string;
  nameB: string;
  overlapPercent: number;
  tradeoffs: string[];
  dimensionComparison: Record<string, { valueA: number; valueB: number }>;
  winner: string;
}

export interface StackComparison {
  overlapPercent: number;
  costDelta: number;
  workflowDelta: number;
  coverageDelta: number;
  tradeoffs: string[];
}

export interface CurrentVsRecommendedComparison {
  removedTools: string[];
  addedTools: string[];
  retainedTools: string[];
  monthlyCostDelta: number;
  annualSavings: number;
  workflowFitDelta: number;
  coverageDelta: number;
}

export class ComparisonEngine {

  /**
   * Evaluates pairwise comparisons between two specific scored provider profiles.
   */
  public static compareProviders(idA: string, idB: string, context?: string): ProviderComparison | null {
    const scoredA = KnowledgeScoringEngine.getScored(idA);
    const scoredB = KnowledgeScoringEngine.getScored(idB);
    if (!scoredA || !scoredB) return null;

    const rel = RelationshipEngine.analyze(idA, idB, context);
    const overlapPercent = rel ? rel.workflowOverlap : 0;

    const dimensionComparison: ProviderComparison['dimensionComparison'] = {
      coding:      { valueA: scoredA.codingScore,      valueB: scoredB.codingScore },
      reasoning:   { valueA: scoredA.reasoningScore,   valueB: scoredB.reasoningScore },
      writing:     { valueA: scoredA.writingScore,     valueB: scoredB.writingScore },
      research:    { valueA: scoredA.researchScore,    valueB: scoredB.researchScore },
      enterprise:  { valueA: scoredA.enterpriseScore,  valueB: scoredB.enterpriseScore },
      reliability: { valueA: scoredA.reliabilityScore, valueB: scoredB.reliabilityScore }
    };

    const tradeoffs: string[] = [];
    if (scoredA.codingScore > scoredB.codingScore + 15) {
      tradeoffs.push(`${scoredA.name} is significantly stronger in coding than ${scoredB.name}.`);
    } else if (scoredB.codingScore > scoredA.codingScore + 15) {
      tradeoffs.push(`${scoredB.name} is significantly stronger in coding than ${scoredA.name}.`);
    }

    if (scoredA.enterpriseScore > scoredB.enterpriseScore + 20) {
      tradeoffs.push(`${scoredA.name} offers better enterprise compliances and administration controls.`);
    } else if (scoredB.enterpriseScore > scoredA.enterpriseScore + 20) {
      tradeoffs.push(`${scoredB.name} offers better enterprise compliances and administration controls.`);
    }

    const scoreA = scoredA.codingScore + scoredA.reasoningScore + scoredA.researchScore;
    const scoreB = scoredB.codingScore + scoredB.reasoningScore + scoredB.researchScore;
    const winner = scoreA >= scoreB ? scoredA.name : scoredB.name;

    return {
      idA,
      nameA: scoredA.name,
      idB,
      nameB: scoredB.name,
      overlapPercent,
      tradeoffs,
      dimensionComparison,
      winner
    };
  }

  /**
   * Compares two sets of provider stacks.
   */
  public static compareStacks(
    stackA: ScoredProviderProfile[],
    stackB: ScoredProviderProfile[]
  ): StackComparison {
    const costA = stackA.reduce((sum, p) => sum + (p.plans[0]?.monthlyPricePerSeat || 20), 0);
    const costB = stackB.reduce((sum, p) => sum + (p.plans[0]?.monthlyPricePerSeat || 20), 0);

    const scoresA = stackA.map(p => p.codingScore + p.reasoningScore);
    const scoresB = stackB.map(p => p.codingScore + p.reasoningScore);
    const flowA = scoresA.length > 0 ? Math.round(scoresA.reduce((a, b) => a + b, 0) / scoresA.length) : 0;
    const flowB = scoresB.length > 0 ? Math.round(scoresB.reduce((a, b) => a + b, 0) / scoresB.length) : 0;

    return {
      overlapPercent: 0,
      costDelta: costB - costA,
      workflowDelta: flowB - flowA,
      coverageDelta: 0,
      tradeoffs: []
    };
  }

  /**
   * Compares the user's current tool stack vs a recommended stack option.
   */
  public static compareCurrentVsRecommended(
    current: ScoredProviderProfile[],
    recommended: ScoredProviderProfile[],
    mustHaves: string[]
  ): CurrentVsRecommendedComparison {
    const currentIds = new Set(current.map(p => p.id));
    const recIds = new Set(recommended.map(p => p.id));

    const removedTools = current.filter(p => !recIds.has(p.id)).map(p => p.name);
    const addedTools = recommended.filter(p => !currentIds.has(p.id)).map(p => p.name);
    const retainedTools = recommended.filter(p => currentIds.has(p.id)).map(p => p.name);

    const costCurrent = current.reduce((sum, p) => sum + (p.plans[0]?.monthlyPricePerSeat || 20), 0);
    const costRec = recommended.reduce((sum, p) => sum + (p.plans[0]?.monthlyPricePerSeat || 20), 0);

    const covCurrent = StackCoverageAnalyzer.analyze(current, mustHaves).coverageScore;
    const covRec = StackCoverageAnalyzer.analyze(recommended, mustHaves).coverageScore;

    return {
      removedTools,
      addedTools,
      retainedTools,
      monthlyCostDelta: costRec - costCurrent,
      annualSavings: Math.max(0, costCurrent - costRec) * 12,
      workflowFitDelta: 0,
      coverageDelta: covRec - covCurrent
    };
  }
}
