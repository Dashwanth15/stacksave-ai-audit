// ============================================================
// Stack Coverage Analyzer — StackSave AI Platform Intelligence
//
// Flow 2 dedicated engine for feature coverage gap analysis.
// Reads feature-map.json at runtime. Adding a new user-facing
// feature requires only a JSON edit — zero engine code changes.
//
// NOTE: The legacy CapabilityCoverageEngine.ts serves Flow 1 (audit)
// and is kept unchanged. This engine is exclusively for Flow 2.
// ============================================================

import { KnowledgeLoader } from './KnowledgeLoader';
import { ScoredProviderProfile } from './KnowledgeScoringEngine';

export interface CoveredFeature {
  featureKey: string;
  featureLabel: string;
  coveredBy: string[];   // tool names that satisfy this feature
  maxScore: number;
}

export interface StackCoverageResult {
  covered: CoveredFeature[];
  partial: CoveredFeature[];
  missing: string[];
  coverageScore: number;   // (covered.length / totalRequired) × 100
  redundancies: Array<{ feature: string; featureLabel: string; providers: string[] }>;
}

export class StackCoverageAnalyzer {

  /**
   * Determines which required features are covered, partial, or missing
   * across a stack of scored provider profiles.
   */
  public static analyze(
    stack: ScoredProviderProfile[],
    mustHaveFeatures: string[]
  ): StackCoverageResult {
    const featureMap = KnowledgeLoader.getFeatureMap();

    const covered: CoveredFeature[] = [];
    const partial: CoveredFeature[] = [];
    const missing: string[] = [];
    const redundancies: StackCoverageResult['redundancies'] = [];

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) {
        missing.push(featureKey);
        continue;
      }

      const result = this.checkFeatureCoverage(featureKey, mapEntry, stack);

      if (result.status === 'covered') {
        covered.push({
          featureKey,
          featureLabel: mapEntry.label,
          coveredBy: result.coveredBy,
          maxScore: result.maxScore
        });
        if (result.coveredBy.length >= 2) {
          redundancies.push({
            feature: featureKey,
            featureLabel: mapEntry.label,
            providers: result.coveredBy
          });
        }
      } else if (result.status === 'partial') {
        partial.push({
          featureKey,
          featureLabel: mapEntry.label,
          coveredBy: result.coveredBy,
          maxScore: result.maxScore
        });
      } else {
        missing.push(featureKey);
      }
    }

    const total = mustHaveFeatures.length;
    const coverageScore = total > 0 ? Math.round((covered.length / total) * 100) : 100;

    return { covered, partial, missing, coverageScore, redundancies };
  }

  /**
   * Computes what percentage of must-have features a single provider covers.
   * Used by AIStackRecommendationEngine for per-provider feature coverage scoring.
   */
  public static computeProviderCoverageScore(
    provider: ScoredProviderProfile,
    mustHaveFeatures: string[]
  ): number {
    if (mustHaveFeatures.length === 0) return 100;
    const featureMap = KnowledgeLoader.getFeatureMap();
    let score = 0;

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) continue;
      const result = this.checkFeatureCoverage(featureKey, mapEntry, [provider]);
      if (result.status === 'covered')      score += 1;
      else if (result.status === 'partial') score += 0.5;
    }

    return Math.round((score / mustHaveFeatures.length) * 100);
  }

  /**
   * Returns which must-have features a provider would add to the existing stack.
   * Used by the greedy cover algorithm to decide whether to add a provider.
   */
  public static newFeaturesCovered(
    provider: ScoredProviderProfile,
    existingStack: ScoredProviderProfile[],
    mustHaveFeatures: string[]
  ): string[] {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const newlyCovered: string[] = [];

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) continue;

      const existingResult = this.checkFeatureCoverage(featureKey, mapEntry, existingStack);
      if (existingResult.status === 'covered') continue;

      const withProvider = this.checkFeatureCoverage(featureKey, mapEntry, [provider]);
      if (withProvider.status === 'covered' || withProvider.status === 'partial') {
        newlyCovered.push(featureKey);
      }
    }

    return newlyCovered;
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private static checkFeatureCoverage(
    featureKey: string,
    mapEntry: { capabilityKeys: string[]; minimumScore: number; derivedFrom?: string },
    stack: ScoredProviderProfile[]
  ): { status: 'covered' | 'partial' | 'missing'; coveredBy: string[]; maxScore: number } {
    let maxScore = 0;
    const coveredBy: string[] = [];

    for (const provider of stack) {
      let score = 0;

      if (mapEntry.derivedFrom) {
        score = this.evaluateDerivedFrom(mapEntry.derivedFrom, provider) ? 10 : 0;
      } else if (featureKey === 'multi-model') {
        const modelCount = (provider.raw as any).supportedModels?.length ?? 0;
        score = modelCount >= 3 ? 10 : modelCount >= 2 ? 6 : 0;
      } else if (mapEntry.capabilityKeys.length > 0) {
        score = Math.max(0, ...mapEntry.capabilityKeys.map(k => provider.capabilityVector[k] ?? 0));
      }

      if (score >= mapEntry.minimumScore) {
        coveredBy.push(provider.name);
      }
      maxScore = Math.max(maxScore, score);
    }

    const partialThreshold = Math.max(0, mapEntry.minimumScore - 2);
    if (coveredBy.length > 0) return { status: 'covered', coveredBy, maxScore };
    if (maxScore >= partialThreshold && maxScore > 0) return { status: 'partial', coveredBy, maxScore };
    return { status: 'missing', coveredBy: [], maxScore };
  }

  private static evaluateDerivedFrom(derivedFrom: string, provider: ScoredProviderProfile): boolean {
    const raw = provider.raw as any;
    try {
      if (derivedFrom.includes('enterprise.compliance.hipaa') || derivedFrom.includes('enterprise.compliance.soc2')) {
        return raw.enterprise?.compliance?.hipaa === true || raw.enterprise?.compliance?.soc2 === true;
      }
      if (derivedFrom.includes('enterprise.security.privateDeployment')) {
        return raw.enterprise?.security?.privateDeployment === true;
      }
      if (derivedFrom.includes('supportedModels.length >= 3')) {
        return (raw.supportedModels?.length ?? 0) >= 3;
      }
      return false;
    } catch {
      return false;
    }
  }
}
