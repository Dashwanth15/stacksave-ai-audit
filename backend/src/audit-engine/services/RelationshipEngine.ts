// ============================================================
// Relationship Engine — StackSave AI Platform
//
// Dynamically computes pairwise provider relationships from
// raw capability score vectors. No hardcoded provider lists.
//
// Adding a new provider to the knowledge base automatically
// integrates it with all existing relationship computations.
//
// ProviderKnowledgeEngine describes providers.
// RelationshipEngine describes how providers relate.
// ============================================================

import { KnowledgeLoader } from './KnowledgeLoader';

export interface ProviderRelationship {
  idA: string;
  idB: string;

  /** Cosine similarity of the two full capability vectors, 0–100 */
  capabilitySimilarity: number;

  /** Jaccard index over workflow-weighted capabilities (score >= 7), 0–100 */
  workflowOverlap: number;

  /**
   * Complementarity score (0–100).
   * High = each provider has distinct strengths the other lacks.
   */
  complementarity: number;

  /** Which provider is stronger overall and by how much */
  dominance: {
    winnerId: string;
    margin: number;                       // 0–100
    confidence: 'High' | 'Medium' | 'Low';
  };

  /**
   * Replacement confidence (0–100).
   * Measures how well provider B covers provider A's key strengths.
   * 100 = B perfectly covers all of A's top capabilities.
   */
  replacementConfidence: number;

  relationshipType:
    | 'Complementary'
    | 'Partial Overlap'
    | 'High Overlap'
    | 'Duplicate'
    | 'Replacement Candidate';
}

export class RelationshipEngine {
  private static cache = new Map<string, ProviderRelationship>();

  // ─── Thresholds ──────────────────────────────────────────────────────────────

  /** Minimum replacementConfidence to consider B a valid replacement for A */
  static readonly REPLACEMENT_THRESHOLD = 75;

  /** Minimum complementarity for tools to be considered complementary */
  static readonly COMPLEMENTARITY_THRESHOLD = 60;

  /** Maximum workflowOverlap for tools to still qualify as complementary */
  static readonly OVERLAP_MAX_COMPLEMENTARY = 40;

  /**
   * Minimum workflow overlap to place two tools in the same optimization group.
   * Tools below this threshold are left as separate groups (no consolidation proposed).
   * Set to 40 to capture moderately overlapping tools (e.g. Cursor/Copilot at 46%).
   */
  static readonly CLUSTER_OVERLAP_THRESHOLD = 40;

  // ─── Core Analysis ───────────────────────────────────────────────────────────

  /**
   * Full pairwise relationship analysis between two providers.
   * Results are cached. Commutative (A→B returns same metrics as B→A,
   * except replacementConfidence which is directional).
   */
  public static analyze(
    idA: string,
    idB: string,
    useCase?: string
  ): ProviderRelationship | null {
    const cacheKey = `${idA}::${idB}::${useCase ?? 'general'}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    KnowledgeLoader.initialize();
    const profileA = KnowledgeLoader.getProvider(idA);
    const profileB = KnowledgeLoader.getProvider(idB);
    if (!profileA || !profileB) return null;

    const weights = KnowledgeLoader.getWorkflowWeights();
    const useCaseWeights =
      (useCase && weights[useCase]) ? weights[useCase] : (weights['general'] || {});

    // Union of all capability keys from both providers
    const allCaps = Array.from(
      new Set([
        ...Object.keys(profileA.capabilities),
        ...Object.keys(profileB.capabilities)
      ])
    );

    // Build raw numeric vectors
    const vecA = allCaps.map(cap => profileA.capabilities[cap]?.score ?? 0);
    const vecB = allCaps.map(cap => profileB.capabilities[cap]?.score ?? 0);

    const capabilitySimilarity = this.cosineSimilarity(vecA, vecB);
    const workflowOverlap = this.jaccardWorkflowOverlap(allCaps, profileA.capabilities, profileB.capabilities, useCaseWeights);
    const complementarity = this.computeComplementarity(allCaps, profileA.capabilities, profileB.capabilities, useCaseWeights);
    const dominance = this.computeDominance(allCaps, profileA, profileB, useCaseWeights);
    const replacementConfidence = this.computeReplacementConfidence(allCaps, profileA.capabilities, profileB.capabilities, useCaseWeights);
    const relationshipType = this.classifyRelationship(workflowOverlap, complementarity, replacementConfidence);

    const result: ProviderRelationship = {
      idA,
      idB,
      capabilitySimilarity,
      workflowOverlap,
      complementarity,
      dominance,
      replacementConfidence,
      relationshipType
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  // ─── Relationship Queries ─────────────────────────────────────────────────────

  /**
   * Returns true if provider B can replace provider A.
   * Based purely on replacementConfidence >= threshold.
   */
  public static canReplace(
    idA: string,
    idB: string,
    useCase?: string,
    threshold = RelationshipEngine.REPLACEMENT_THRESHOLD
  ): boolean {
    if (idA === idB) return false;
    const rel = this.analyze(idA, idB, useCase);
    return rel !== null && rel.replacementConfidence >= threshold;
  }

  /**
   * Returns true if A and B are complementary:
   * each covers capabilities the other lacks, with low overlap.
   */
  public static areComplementary(idA: string, idB: string, useCase?: string): boolean {
    if (idA === idB) return false;
    const rel = this.analyze(idA, idB, useCase);
    return (
      rel !== null &&
      rel.complementarity >= RelationshipEngine.COMPLEMENTARITY_THRESHOLD &&
      rel.workflowOverlap < RelationshipEngine.OVERLAP_MAX_COMPLEMENTARY
    );
  }

  /**
   * Returns all candidateIds that can replace targetId.
   */
  public static getReplacementsFor(
    targetId: string,
    candidateIds: string[],
    useCase?: string
  ): string[] {
    return candidateIds.filter(
      id => id !== targetId && this.canReplace(targetId, id, useCase)
    );
  }

  // ─── Cluster Detection ────────────────────────────────────────────────────────

  /**
   * Groups tool IDs into overlap clusters using union-find.
   * Tools with workflowOverlap >= overlapThreshold are placed in the same cluster.
   * Each cluster becomes an independent optimization group.
   * Tools with no overlap partners remain as singleton clusters.
   */
  public static clusterByOverlap(
    toolIds: string[],
    useCase?: string,
    overlapThreshold = RelationshipEngine.CLUSTER_OVERLAP_THRESHOLD
  ): string[][] {
    // Initialize union-find
    const parent = new Map<string, string>();
    toolIds.forEach(id => parent.set(id, id));

    const find = (x: string): string => {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: string, y: string): void => {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) parent.set(rootX, rootY);
    };

    // Union all pairs that exceed the overlap threshold
    for (let i = 0; i < toolIds.length; i++) {
      for (let j = i + 1; j < toolIds.length; j++) {
        const rel = this.analyze(toolIds[i], toolIds[j], useCase);
        if (rel && rel.workflowOverlap >= overlapThreshold) {
          union(toolIds[i], toolIds[j]);
        }
      }
    }

    // Collect clusters by root
    const clusters = new Map<string, string[]>();
    for (const id of toolIds) {
      const root = find(id);
      if (!clusters.has(root)) clusters.set(root, []);
      clusters.get(root)!.push(id);
    }

    return Array.from(clusters.values());
  }

  // ─── Cache Management ─────────────────────────────────────────────────────────

  public static clearCache(): void {
    this.cache.clear();
  }

  // ─── Private Computation Helpers ─────────────────────────────────────────────

  /** Cosine similarity between two equal-length numeric vectors, scaled 0–100 */
  private static cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom > 0 ? Math.round((dot / denom) * 100) : 0;
  }

  /**
   * Jaccard overlap over workflow-relevant capabilities.
   * Only considers capabilities with weight >= 3 in the use-case weight map.
   * Overlap = both providers score >= 7 / either provider scores >= 7.
   */
  private static jaccardWorkflowOverlap(
    allCaps: string[],
    capsA: Record<string, { score: number }>,
    capsB: Record<string, { score: number }>,
    weights: Record<string, number>
  ): number {
    let bothHigh = 0;
    let eitherHigh = 0;

    for (const cap of allCaps) {
      const w = weights[cap] ?? 0;
      if (w < 3) continue;

      const sA = capsA[cap]?.score ?? 0;
      const sB = capsB[cap]?.score ?? 0;

      if (sA >= 7 || sB >= 7) {
        eitherHigh++;
        if (sA >= 7 && sB >= 7) bothHigh++;
      }
    }

    return eitherHigh > 0 ? Math.round((bothHigh / eitherHigh) * 100) : 0;
  }

  /**
   * Complementarity = each provider has distinct strengths the other lacks.
   * Distinct strength = capability where provider scores >= 8 AND other scores <= 5.
   * Score = average of (A's distinct ratio, B's distinct ratio), scaled 0–100.
   */
  private static computeComplementarity(
    allCaps: string[],
    capsA: Record<string, { score: number }>,
    capsB: Record<string, { score: number }>,
    weights: Record<string, number>
  ): number {
    const relevantCaps = allCaps.filter(c => (weights[c] ?? 0) >= 3);
    if (relevantCaps.length === 0) return 0;

    const topCapsA = relevantCaps.filter(c => (capsA[c]?.score ?? 0) >= 8);
    const topCapsB = relevantCaps.filter(c => (capsB[c]?.score ?? 0) >= 8);

    const distinctA = topCapsA.filter(c => (capsB[c]?.score ?? 0) <= 5);
    const distinctB = topCapsB.filter(c => (capsA[c]?.score ?? 0) <= 5);

    const ratioA = topCapsA.length > 0 ? distinctA.length / topCapsA.length : 0;
    const ratioB = topCapsB.length > 0 ? distinctB.length / topCapsB.length : 0;

    return Math.round(((ratioA + ratioB) / 2) * 100);
  }

  /**
   * Dominance = weighted score sum comparison.
   * Margin = |scoreA - scoreB| / maxPossibleScore, scaled 0–100.
   */
  private static computeDominance(
    allCaps: string[],
    profileA: { id: string; capabilities: Record<string, { score: number }> },
    profileB: { id: string; capabilities: Record<string, { score: number }> },
    weights: Record<string, number>
  ): ProviderRelationship['dominance'] {
    let scoreA = 0;
    let scoreB = 0;
    let maxScore = 0;

    for (const cap of allCaps) {
      const w = weights[cap] ?? 0;
      if (w === 0) continue;
      scoreA += (profileA.capabilities[cap]?.score ?? 0) * w;
      scoreB += (profileB.capabilities[cap]?.score ?? 0) * w;
      maxScore += 10 * w;
    }

    const margin = maxScore > 0
      ? Math.round((Math.abs(scoreA - scoreB) / maxScore) * 100)
      : 0;
    const rawConfidence = maxScore > 0
      ? Math.abs(scoreA - scoreB) / maxScore
      : 0;
    const confidence: 'High' | 'Medium' | 'Low' =
      rawConfidence > 0.15 ? 'High' : rawConfidence > 0.05 ? 'Medium' : 'Low';

    return {
      winnerId: scoreA >= scoreB ? profileA.id : profileB.id,
      margin,
      confidence
    };
  }

  /**
   * Replacement confidence (directional A→B):
   * % of A's key capabilities (score >= 7, weight >= 3) that B covers at >= 6.
   * 100 = B fully satisfies all of A's important capabilities.
   */
  private static computeReplacementConfidence(
    allCaps: string[],
    capsA: Record<string, { score: number }>,
    capsB: Record<string, { score: number }>,
    weights: Record<string, number>
  ): number {
    const relevantCaps = allCaps.filter(c => (weights[c] ?? 0) >= 3);
    const keyCapsA = relevantCaps.filter(c => (capsA[c]?.score ?? 0) >= 7);
    if (keyCapsA.length === 0) return 100; // No key requirements — trivially replaceable

    const coveredByB = keyCapsA.filter(c => (capsB[c]?.score ?? 0) >= 6);
    return Math.round((coveredByB.length / keyCapsA.length) * 100);
  }

  /** Classifies the overall relationship into a human-readable type */
  private static classifyRelationship(
    workflowOverlap: number,
    complementarity: number,
    replacementConfidence: number
  ): ProviderRelationship['relationshipType'] {
    if (workflowOverlap >= 80) return 'Duplicate';
    if (replacementConfidence >= 75 && workflowOverlap >= 50) return 'Replacement Candidate';
    if (workflowOverlap >= 60) return 'High Overlap';
    if (complementarity >= 60 && workflowOverlap < 40) return 'Complementary';
    return 'Partial Overlap';
  }
}
