// ============================================================
// Capability Dominance Engine — StackSave AI Platform Intelligence
//
// Conducts unified relationship analysis reports between two platforms,
// Jaccard capability similarity indices, and distinct strengths mapping.
// ============================================================

import { KnowledgeLoader, ProviderProfile } from './KnowledgeLoader';

export interface ComparisonMetric {
  scoreA: number;
  scoreB: number;
  difference: number; // scoreA - scoreB
  winner: string;     // name of winning provider
  evidence: string;
  source: string;
}

export interface DominanceResult {
  winner: string;
  loser: string;
  confidence: 'High' | 'Medium' | 'Low';
  metrics: Record<string, ComparisonMetric>;
}

export interface RelationshipAnalysis {
  overlapScore: number;           // Jaccard similarity index (0 to 100)
  capabilityRetention: number;    // Capability retention percentage (0 to 100)
  dominantProviderId: string;     // Winner tool ID
  relationshipType: 
    | 'Complementary' 
    | 'Partial Overlap' 
    | 'High Overlap' 
    | 'Duplicate' 
    | 'Replacement Candidate';
  distinctStrengthsA: string[];
  distinctStrengthsB: string[];
  confidence: 'High' | 'Medium' | 'Low';
  dominantProviderName: string;
}

export class CapabilityDominanceEngine {
  /**
   * Performs a structured relationship analysis between provider A and provider B.
   */
  public static analyzeRelationship(idA: string, idB: string, useCase?: string): RelationshipAnalysis | null {
    const profileA = KnowledgeLoader.getProvider(idA);
    const profileB = KnowledgeLoader.getProvider(idB);

    if (!profileA || !profileB) return null;

    const weights = KnowledgeLoader.getWorkflowWeights();
    const useCaseWeights = useCase ? weights[useCase] || weights['general'] : weights['general'];

    const capabilitiesA = Object.keys(profileA.capabilities);
    const capabilitiesB = Object.keys(profileB.capabilities);
    const allCapabilities = Array.from(new Set([...capabilitiesA, ...capabilitiesB]));

    // Filter for capabilities important to this workflow (weight >= 5)
    const importantCapabilities = allCapabilities.filter(cap => {
      const weight = useCaseWeights[cap] !== undefined ? useCaseWeights[cap] : 0; // Default weight to 0 if not in JSON
      return weight >= 5;
    });

    // 1. Calculate Jaccard Overlap Score
    let bothHigh = 0;
    let eitherHigh = 0;

    for (const cap of importantCapabilities) {
      const scoreA = profileA.capabilities[cap]?.score || 0;
      const scoreB = profileB.capabilities[cap]?.score || 0;

      if (scoreA >= 7 || scoreB >= 7) {
        eitherHigh++;
        if (scoreA >= 7 && scoreB >= 7) {
          bothHigh++;
        }
      }
    }

    const overlapScore = eitherHigh > 0 ? Math.round((bothHigh / eitherHigh) * 100) : 0;

    // 2. Calculate Capability Retention (from A to B)
    let requiredA = 0;
    let retainedB = 0;

    for (const cap of importantCapabilities) {
      const scoreA = profileA.capabilities[cap]?.score || 0;
      if (scoreA >= 7) {
        requiredA++;
        const scoreB = profileB.capabilities[cap]?.score || 0;
        if (scoreB >= 7) {
          retainedB++;
        }
      }
    }

    const capabilityRetention = requiredA > 0 ? Math.round((retainedB / requiredA) * 100) : 100;

    // 3. Find Distinct Strengths
    const distinctStrengthsA: string[] = [];
    const distinctStrengthsB: string[] = [];

    for (const cap of importantCapabilities) {
      const scoreA = profileA.capabilities[cap]?.score || 0;
      const scoreB = profileB.capabilities[cap]?.score || 0;

      // A has strength: score >= 8 and at least 3 points superior to B
      if (scoreA >= 8 && scoreA - scoreB >= 3) {
        distinctStrengthsA.push(cap);
      }
      // B has strength: score >= 8 and at least 3 points superior to A
      if (scoreB >= 8 && scoreB - scoreA >= 3) {
        distinctStrengthsB.push(cap);
      }
    }

    // 4. Calculate Dominance (using weighted scores sum)
    let scoreTotalA = 0;
    let scoreTotalB = 0;

    for (const cap of importantCapabilities) {
       const scoreA = profileA.capabilities[cap]?.score || 0;
       const scoreB = profileB.capabilities[cap]?.score || 0;
       const weight = useCaseWeights[cap] !== undefined ? useCaseWeights[cap] : 0;

       scoreTotalA += scoreA * weight;
       scoreTotalB += scoreB * weight;
    }

    const dominantProviderId = scoreTotalA >= scoreTotalB ? profileA.id : profileB.id;
    const dominantProviderName = scoreTotalA >= scoreTotalB ? profileA.name : profileB.name;

    // Normalized confidence based on score spread
    const maxPossibleScore = importantCapabilities.reduce((sum, cap) => {
       const weight = useCaseWeights[cap] !== undefined ? useCaseWeights[cap] : 0;
       return sum + 10 * weight;
    }, 0);
    const confidenceScore = maxPossibleScore > 0 ? Math.abs(scoreTotalA - scoreTotalB) / maxPossibleScore : 0;
    const confidence = confidenceScore > 0.15 ? 'High' : confidenceScore > 0.05 ? 'Medium' : 'Low';

    // 5. Classify Relationship Type
    let relationshipType: RelationshipAnalysis['relationshipType'] = 'Partial Overlap';

    if (overlapScore >= 80) {
      relationshipType = 'Duplicate';
    } else if (overlapScore < 50 && distinctStrengthsA.length >= 1 && distinctStrengthsB.length >= 1) {
      relationshipType = 'Complementary';
    } else if (capabilityRetention >= 90) {
      relationshipType = 'Replacement Candidate';
    } else if (overlapScore >= 60 && (distinctStrengthsA.length === 0 || distinctStrengthsB.length === 0)) {
      relationshipType = 'High Overlap';
    }

    return {
      overlapScore,
      capabilityRetention,
      dominantProviderId,
      dominantProviderName,
      relationshipType,
      distinctStrengthsA,
      distinctStrengthsB,
      confidence
    };
  }

  /**
   * Compares two providers, compatible with legacy DominanceResult signature.
   */
  public static compare(idA: string, idB: string, useCase?: string): DominanceResult | null {
    const profileA = KnowledgeLoader.getProvider(idA);
    const profileB = KnowledgeLoader.getProvider(idB);

    if (!profileA || !profileB) return null;

    const analysis = this.analyzeRelationship(idA, idB, useCase);
    if (!analysis) return null;

    const metrics: Record<string, ComparisonMetric> = {};
    const capabilitiesA = Object.keys(profileA.capabilities);
    const capabilitiesB = Object.keys(profileB.capabilities);
    const allCapabilities = Array.from(new Set([...capabilitiesA, ...capabilitiesB]));

    for (const cap of allCapabilities) {
      const capA = profileA.capabilities[cap] || { score: 0, evidence: 'Not supported.', source: '', lastVerified: '' };
      const capB = profileB.capabilities[cap] || { score: 0, evidence: 'Not supported.', source: '', lastVerified: '' };

      const difference = capA.score - capB.score;
      let winnerName = 'Equal';
      if (difference > 0) {
        winnerName = profileA.name;
      } else if (difference < 0) {
        winnerName = profileB.name;
      }

      metrics[cap] = {
        scoreA: capA.score,
        scoreB: capB.score,
        difference,
        winner: winnerName,
        evidence: difference >= 0 ? capA.evidence : capB.evidence,
        source: difference >= 0 ? capA.source : capB.source
      };
    }

    return {
      winner: analysis.dominantProviderName,
      loser: analysis.dominantProviderId === profileA.id ? profileB.name : profileA.name,
      confidence: analysis.confidence,
      metrics
    };
  }
}
