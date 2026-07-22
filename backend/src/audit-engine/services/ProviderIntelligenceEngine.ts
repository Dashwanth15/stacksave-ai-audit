// ============================================================
// Provider Intelligence Engine — StackSave AI Platform Intelligence
//
// Conducts G2-grade multi-factor platform comparison reports, computes
// capability retention, and evaluates recommendation criteria.
// ============================================================

import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';
import { CapabilityDominanceEngine, DominanceResult, RelationshipAnalysis } from './CapabilityDominanceEngine';
import { BusinessValueEngine, BusinessValueReport } from './BusinessValueEngine';

export interface ComparisonReport {
  dominance: DominanceResult;
  relationshipAnalysis: RelationshipAnalysis;
  retentionPercent: number;
  productivityImpact: 'No Impact' | 'Minimal Impact' | 'Moderate Impact' | 'Major Impact';
  migrationCost: 'None' | 'Low' | 'Medium' | 'High';
  learningCurve: 'Very Low' | 'Low' | 'Medium' | 'High';
  businessValue: BusinessValueReport;
}

export class ProviderIntelligenceEngine {
  /**
   * Generates a G2-class comparison report between two platforms.
   */
  public static compare(
    idA: string,
    idB: string,
    monthlySavings: number,
    strategy: 'performance' | 'savings',
    useCase?: string
  ): ComparisonReport | string {
    const relationshipAnalysis = CapabilityDominanceEngine.analyzeRelationship(idA, idB, useCase);
    if (!relationshipAnalysis) {
      return 'Insufficient capability data to confidently recommend replacing this platform.';
    }

    const profileA = KnowledgeLoader.getProvider(idA);
    const profileB = KnowledgeLoader.getProvider(idB);
    if (!profileA || !profileB) {
      return 'Insufficient capability data to confidently recommend replacing this platform.';
    }

    const dominance = CapabilityDominanceEngine.compare(idA, idB, useCase);
    if (!dominance) {
      return 'Insufficient capability data to confidently recommend replacing this platform.';
    }

    // 1. Calculate Capability Retention Percent
    // Count how many capabilities of profileA (where score >= 7) are covered by profileB (score >= 7)
    let requiredCaps = 0;
    let retainedCaps = 0;

    const capabilitiesA = Object.keys(profileA.capabilities);
    for (const cap of capabilitiesA) {
      const scoreA = profileA.capabilities[cap]?.score || 0;
      if (scoreA >= 7) {
        requiredCaps++;
        const scoreB = profileB.capabilities[cap]?.score || 0;
        if (scoreB >= 7) {
          retainedCaps++;
        }
      }
    }

    const retentionPercent = requiredCaps > 0 ? Math.round((retainedCaps / requiredCaps) * 100) : 100;

    // 2. Productivity Impact Scale
    // No Impact, Minimal Impact, Moderate Impact, Major Impact
    let productivityImpact: 'No Impact' | 'Minimal Impact' | 'Moderate Impact' | 'Major Impact' = 'No Impact';
    const velocityDiff = profileA.productivityScores.velocity - profileB.productivityScores.velocity;

    if (velocityDiff > 2) {
      productivityImpact = 'Major Impact';
    } else if (velocityDiff > 0.5) {
      productivityImpact = 'Moderate Impact';
    } else if (velocityDiff > 0) {
      productivityImpact = 'Minimal Impact';
    }

    // 3. Business Value Score
    const businessValue = BusinessValueEngine.calculate(idA, idB, monthlySavings, retentionPercent, strategy, useCase);

    return {
      dominance,
      relationshipAnalysis,
      retentionPercent,
      productivityImpact,
      migrationCost: profileA.productivityScores.migrationCost,
      learningCurve: profileB.productivityScores.learningCurve,
      businessValue
    };
  }
}
