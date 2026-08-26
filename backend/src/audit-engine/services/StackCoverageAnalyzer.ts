// ============================================================
// Stack Coverage Analyzer — StackSave AI Platform Intelligence
//
// Flow 2 dedicated engine for feature coverage gap analysis.
// Evaluates real-world provider capability coverage against the
// prerequisites each feature declares in feature-map.json (e.g. inline
// generation requires a measured editor-integration capability, an
// interactive chat surface excludes raw API endpoints). Prerequisites are
// data, not code: no feature key or provider id is special-cased here.
// ============================================================

import { KnowledgeLoader, FeatureMapEntry } from './KnowledgeLoader';
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
  /**
   * Requirements a provider in the stack has the measured capability for, but which its
   * SELECTED plan tier does not entitle (published plan copy sells the capability only
   * from a higher tier). Empty unless a plan resolver was supplied.
   */
  planGated: Array<{ featureKey: string; featureLabel: string; providerId: string; requiredTier: number; selectedTier: number }>;
}

/** Minimal shape of a plan entry the gate logic reads. */
export interface PlanGateCandidate {
  id?: string;
  label?: string;
  tierRank?: number;
  features?: string[];
  premiumFeatures?: string[];
  monthlyPricePerSeat?: number;
}

/**
 * Resolves the plan a team would actually buy for a provider under the current request.
 * Supplied by the caller (the recommendation engine owns budget/strategy logic); the
 * analyzer only reads the returned tier position and published feature copy.
 *
 * Returning `undefined`/`null` means "no plan decision available", which leaves coverage
 * plan-blind for that provider rather than guessing.
 */
export type PlanResolver = (provider: ScoredProviderProfile) => PlanGateCandidate | null | undefined;

export class StackCoverageAnalyzer {

  /**
   * Determines which required features are covered, partial, or missing
   * across a stack of scored provider profiles.
   *
   * `planResolver` makes the answer plan-aware: a capability the vendor sells only from a
   * higher tier is not credited to a cheaper selected tier. Without it the analysis is
   * plan-blind, which is correct for pre-selection candidate screening but wrong for any
   * coverage figure shown to the user.
   */
  public static analyze(
    stack: ScoredProviderProfile[],
    mustHaveFeatures: string[],
    planResolver?: PlanResolver
  ): StackCoverageResult {
    const featureMap = KnowledgeLoader.getFeatureMap();

    const covered: CoveredFeature[] = [];
    const partial: CoveredFeature[] = [];
    const missing: string[] = [];
    const redundancies: StackCoverageResult['redundancies'] = [];
    const planGated: StackCoverageResult['planGated'] = [];

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) {
        missing.push(featureKey);
        continue;
      }

      const result = this.checkFeatureCoverage(featureKey, mapEntry, stack, planResolver);
      for (const gate of result.gated) {
        planGated.push({
          featureKey,
          featureLabel: mapEntry.label,
          providerId: gate.providerId,
          requiredTier: gate.requiredTier,
          selectedTier: gate.selectedTier
        });
      }

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
    // Requirements no provider in the knowledge base can satisfy (feature-map
    // `availability: "unsupported"`) are reported in `missing` but excluded from the
    // denominator: an unsatisfiable request is not a failure of the selected stack.
    const unsupported = mustHaveFeatures.filter(
      k => featureMap.features[k]?.availability === 'unsupported'
    ).length;
    const scorable = total - unsupported;
    const coverageScore = scorable > 0 ? Math.round((covered.length / scorable) * 100) : 100;

    return { covered, partial, missing, coverageScore, redundancies, planGated };
  }

  /**
   * Computes what percentage of must-have features a single provider covers.
   * Used by AIStackRecommendationEngine for per-provider feature coverage scoring.
   */
  public static computeProviderCoverageScore(
    provider: ScoredProviderProfile,
    mustHaveFeatures: string[],
    planResolver?: PlanResolver
  ): number {
    if (mustHaveFeatures.length === 0) return 100;
    const featureMap = KnowledgeLoader.getFeatureMap();
    let score = 0;
    let scorable = 0;

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) continue;
      // Same exclusion as analyze(): a requirement no provider can satisfy must not
      // depress every provider's coverage score.
      if (mapEntry.availability === 'unsupported') continue;
      scorable += 1;
      const result = this.checkFeatureCoverage(featureKey, mapEntry, [provider], planResolver);
      if (result.status === 'covered')      score += 1;
      else if (result.status === 'partial') score += 0.5;
    }

    if (scorable === 0) return 100;
    return Math.round((score / scorable) * 100);
  }

  /**
   * Returns which must-have features a provider would add to the existing stack.
   * Used by the greedy cover algorithm to decide whether to add a provider.
   */
  public static newFeaturesCovered(
    provider: ScoredProviderProfile,
    existingStack: ScoredProviderProfile[],
    mustHaveFeatures: string[],
    planResolver?: PlanResolver
  ): string[] {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const newlyCovered: string[] = [];

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) continue;

      const existingResult = this.checkFeatureCoverage(featureKey, mapEntry, existingStack, planResolver);
      if (existingResult.status === 'covered') continue;

      const withProvider = this.checkFeatureCoverage(featureKey, mapEntry, [provider], planResolver);
      if (withProvider.status === 'covered' || withProvider.status === 'partial') {
        newlyCovered.push(featureKey);
      }
    }

    return newlyCovered;
  }

  /**
   * Requirements this provider FULLY covers that `existingStack` does not already fully
   * cover. Stricter than `newFeaturesCovered`, which also returns partial hits.
   *
   * Use this for anything the user is shown as a coverage claim. Reporting a partial hit
   * as covered made the dashboard state that the primary covered a requirement while the
   * engine's own gap analysis simultaneously treated it as open and attached a companion
   * to close it — the displayed stack contradicted the stack that was built.
   */
  public static fullyCoveredBy(
    provider: ScoredProviderProfile,
    existingStack: ScoredProviderProfile[],
    mustHaveFeatures: string[],
    planResolver?: PlanResolver
  ): string[] {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const added: string[] = [];

    for (const featureKey of mustHaveFeatures) {
      const mapEntry = featureMap.features[featureKey];
      if (!mapEntry) continue;
      if (this.checkFeatureCoverage(featureKey, mapEntry, existingStack, planResolver).status === 'covered') continue;
      if (this.checkFeatureCoverage(featureKey, mapEntry, [provider], planResolver).status === 'covered') {
        added.push(featureKey);
      }
    }

    return added;
  }

  /**
   * Lowest published tier position at which `provider` entitles `mapEntry`'s capability,
   * or `null` when the provider's plan copy publishes no evidence of a floor at all.
   *
   * Two independent, data-declared floors are combined:
   *  1. `planEvidenceTerms` — the lowest tier whose own copy sells this capability.
   *  2. `requiresOrgAdministration` — for organization-scoped requirements, the lowest
   *     tier whose copy describes any organizational surface. This catches vendors that
   *     deliver the capability through a suite without naming it per plan: Gemini's SSO
   *     arrives via Google Workspace and appears nowhere in its consumer plan copy, so
   *     the terms alone left the Free tier free to claim enterprise SSO for a 50-seat
   *     team.
   *
   * The answer is the higher of the two floors — a tier must clear every published
   * condition — and `null` when neither rule finds evidence. `null` is deliberately not
   * `0`: an unpublished entitlement is unknown, not free. All terms come from feature-map
   * data, so no provider or tier name is special-cased here.
   */
  public static planGateTierRank(
    provider: ScoredProviderProfile,
    mapEntry: FeatureMapEntry
  ): number | null {
    const termFloor = this.lowestTierMentioning(provider, mapEntry.planEvidenceTerms);
    const adminFloor = mapEntry.requiresOrgAdministration === true
      ? this.lowestTierMentioning(provider, KnowledgeLoader.getFeatureMap().planAdminEvidenceTerms)
      : null;

    if (termFloor === null) return adminFloor;
    if (adminFloor === null) return termFloor;
    return Math.max(termFloor, adminFloor);
  }

  /**
   * Weight carried by a requirement's FIRST capability key — its *defining* capability
   * (`autocomplete` for in-editor generation, `research` for live web research). The
   * remaining keys share the other half.
   *
   * This is the single definition of "how well does this provider meet this requirement",
   * used both for the coverage threshold below and — via the recommendation engine's
   * `featureCapabilityFit` — for requirement fit scoring. The two used to disagree:
   * scoring used this weighted blend while coverage took `Math.max` over the same keys, so
   * one supporting capability was enough to be reported as covering the requirement. A
   * provider measured at enterpriseSecurity 5 / sso 8 was credited with "Enterprise
   * Governance & Security" at a threshold of 7 on the strength of the SSO score alone,
   * while ranking as a mediocre fit for the very same requirement.
   */
  private static readonly DEFINING_CAPABILITY_WEIGHT = 0.5;

  /**
   * Capability score (0–10) of one provider for one requirement, or `null` when the
   * requirement declares no capability keys — or none that the knowledge base actually
   * measures — so callers can exclude it rather than score it as a miss.
   *
   * An undeclared capability dimension is UNKNOWN, not zero, and is excluded from the
   * blend. `enterprise-sso` declares `["sso", "saml"]` but no provider file carries a
   * `saml` dimension at all: averaging it in as 0 halved every provider's SSO score and
   * put the whole catalogue below the entry's own threshold of 7, so a request for
   * enterprise SSO could not be covered by anyone. The absent dimension is skipped and the
   * measured `sso` score decides; if a `saml` dimension is ever researched and added, it
   * starts contributing with no code change.
   */
  public static capabilityFit(
    provider: ScoredProviderProfile,
    mapEntry: FeatureMapEntry
  ): number | null {
    const declared = (mapEntry.capabilityKeys || []).filter(
      k => provider.capabilityVector[k] !== undefined
    );
    if (declared.length === 0) return null;

    const cap = (k: string): number => Math.max(0, Math.min(10, provider.capabilityVector[k] ?? 0));
    if (declared.length === 1) return cap(declared[0]);

    // The defining capability is the first key the knowledge base measures, preserving the
    // feature map's "essence first" ordering across the dimensions that actually exist.
    const defining = cap(declared[0]);
    const supporting = declared.slice(1).reduce((sum, k) => sum + cap(k), 0) / (declared.length - 1);
    const w = this.DEFINING_CAPABILITY_WEIGHT;
    return defining * w + supporting * (1 - w);
  }

  /** Lowest `tierRank` in this provider's ladder whose published copy mentions any term. */
  private static lowestTierMentioning(
    provider: ScoredProviderProfile,
    terms: string[] | undefined
  ): number | null {
    if (!terms || terms.length === 0) return null;
    const plans: PlanGateCandidate[] = (provider.plans as PlanGateCandidate[]) ?? [];

    let lowest: number | null = null;
    for (const plan of plans) {
      if (!this.planCopyMentions(plan, terms)) continue;
      const rank = typeof plan.tierRank === 'number' ? plan.tierRank : null;
      if (rank === null) continue;
      lowest = lowest === null ? rank : Math.min(lowest, rank);
    }
    return lowest;
  }

  private static planCopyMentions(plan: PlanGateCandidate, terms: string[]): boolean {
    const text = [...(plan.features ?? []), ...(plan.premiumFeatures ?? [])].join(' ').toLowerCase();
    if (!text) return false;
    return terms.some(term => text.includes(term.toLowerCase()));
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private static checkFeatureCoverage(
    featureKey: string,
    mapEntry: FeatureMapEntry,
    stack: ScoredProviderProfile[],
    planResolver?: PlanResolver
  ): {
    status: 'covered' | 'partial' | 'missing';
    coveredBy: string[];
    maxScore: number;
    gated: Array<{ providerId: string; requiredTier: number; selectedTier: number }>;
  } {
    let maxScore = 0;
    const coveredBy: string[] = [];
    const gated: Array<{ providerId: string; requiredTier: number; selectedTier: number }> = [];

    for (const provider of stack) {
      let score = 0;

      // ── Declared Prerequisites (feature-map data, not per-feature code) ──
      // A feature may require a delivery surface that some products structurally lack.
      // Both tests below are declared in feature-map.json and answered from researched
      // per-provider data, so adding a provider needs no change here and no provider
      // earns or loses eligibility because of a hand-assigned category label.
      const prereq = mapEntry.requiresCapability;
      if (prereq && (provider.capabilityVector[prereq.key] ?? 0) < prereq.minimumScore) {
        continue;
      }
      if (mapEntry.excludesCategories?.includes(provider.category)) {
        continue;
      }

      // ── Plan-tier entitlement ──
      // The capability vector describes the PRODUCT; the team only gets what the tier they
      // buy entitles. Where the vendor's own plan copy sells this capability from a higher
      // tier than the one selected, the requirement is not covered by this provider — the
      // free tier of a product with governance controls does not deliver governance.
      // Recorded separately so the caller can report "available on a higher tier" instead
      // of silently attaching another vendor.
      if (planResolver) {
        const selectedPlan = planResolver(provider);
        const requiredTier = this.planGateTierRank(provider, mapEntry);
        const selectedTier = typeof selectedPlan?.tierRank === 'number' ? selectedPlan.tierRank : null;
        if (requiredTier !== null && selectedTier !== null && selectedTier < requiredTier) {
          gated.push({ providerId: provider.id, requiredTier, selectedTier });
          continue;
        }
      }

      // ── Capability Evaluation ──
      if (mapEntry.derivedFrom) {
        const derived = this.evaluateDerivedFrom(mapEntry.derivedFrom, provider, mapEntry);
        // `null` = the underlying data is unverified boilerplate, so the answer is
        // unknown. Unknown must not be reported as satisfied, and must not be
        // reported as a researched zero either — the provider is simply skipped.
        if (derived === null) continue;
        score = derived ? 10 : 0;
      } else if (featureKey === 'multi-model') {
        const modelCount = (provider.raw as any).supportedModels?.length ?? 0;
        score = modelCount >= 3 ? 10 : modelCount >= 2 ? 6 : 0;
      } else if (mapEntry.capabilityKeys.length > 0) {
        // One definition of the requirement, shared with requirement fit scoring: the
        // defining capability carries half the weight and the supporting keys the other
        // half. Previously `Math.max` here let a single supporting capability satisfy the
        // requirement while the engine's own fit score called the same provider a weak
        // match for it.
        const fit = this.capabilityFit(provider, mapEntry);
        // `null` = the knowledge base measures none of the declared dimensions for this
        // provider. Unknown is not zero, so the provider is skipped rather than counted as
        // a researched miss — the same rule `derivedFrom` follows above.
        if (fit === null) continue;
        score = fit;
      }

      if (score >= mapEntry.minimumScore) {
        coveredBy.push(provider.name);
      }
      maxScore = Math.max(maxScore, score);
    }

    const partialThreshold = Math.max(0, mapEntry.minimumScore - 2);
    if (coveredBy.length > 0) return { status: 'covered', coveredBy, maxScore, gated };
    if (maxScore >= partialThreshold && maxScore > 0) return { status: 'partial', coveredBy, maxScore, gated };
    return { status: 'missing', coveredBy: [], maxScore, gated };
  }

  /**
   * Evaluates a feature-map `derivedFrom` expression against a provider.
   *
   * Returns `true`/`false` when the expression can be answered from data the loader
   * considers provider-specific, and `null` when the expression depends on the
   * `enterprise.*` block of a provider whose governance data failed boilerplate
   * detection. `null` means "unknown", which is deliberately distinct from `false`:
   * the catalogue-wide identical enterprise block is not evidence either way.
   */
  private static evaluateDerivedFrom(
    derivedFrom: string,
    provider: ScoredProviderProfile,
    mapEntry?: FeatureMapEntry
  ): boolean | null {
    const raw = provider.raw as any;
    const readsEnterpriseBlock = derivedFrom.includes('enterprise.');
    const requiresVerified = mapEntry?.requiresVerifiedGovernanceData === true;
    if (readsEnterpriseBlock && requiresVerified && provider.governanceDataVerified !== true) {
      return null;
    }
    try {
      if (derivedFrom.includes('apiSupport === true')) {
        return raw.apiSupport === true || provider.category === 'api';
      }
      if (derivedFrom.includes('enterprise.compliance.hipaa') || derivedFrom.includes('enterprise.compliance.soc2') || derivedFrom.includes('soc2')) {
        return raw.enterprise?.compliance?.hipaa === true || raw.enterprise?.compliance?.soc2 === true;
      }
      if (derivedFrom.includes('enterprise.identity.sso') || derivedFrom.includes('sso')) {
        return raw.enterprise?.identity?.sso === true || raw.enterprise?.identity?.saml === true;
      }
      if (derivedFrom.includes('enterprise.security.zeroDataRetention')) {
        return raw.enterprise?.security?.zeroDataRetention === true;
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
