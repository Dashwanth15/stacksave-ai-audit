// ============================================================
// Knowledge Scoring Engine — StackSave AI Platform Intelligence
//
// Normalizes all raw provider JSON knowledge into deterministic
// dimension scores (0–100). Every downstream Flow 2 engine
// consumes ScoredProviderProfile instead of raw ProviderProfile.
//
// FLOW 1 (Audit) pipeline is NOT affected by this engine.
// ============================================================

import { KnowledgeLoader, ProviderProfile, PlanEntry, RecommendationWeights, VendorProfile } from './KnowledgeLoader';

export interface ScoredProviderProfile {
  // Identity
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  vendor: string;
  vendorId: string;          // vendorProfile.vendorId if present, else vendor.toLowerCase()
  vendorProfile?: VendorProfile;
  plans: PlanEntry[];
  pricing: Record<string, number>;
  raw: ProviderProfile;      // full original profile preserved for engines that need it

  // ── Normalized dimension scores (0–100) ───────────────────────────────────
  // All computed deterministically from raw JSON; zero hardcoded values.

  reasoningScore: number;
  codingScore: number;
  writingScore: number;
  researchScore: number;
  longContextScore: number;
  latencyScore: number;
  reliabilityScore: number;

  enterpriseScore: number;   // governance readiness (admin + identity + compliance)
  securityScore: number;     // data-handling / security posture
  complianceScore: number;   // certification posture

  /**
   * False when the provider's `enterprise` block was detected as catalogue-wide
   * boilerplate. In that case the three scores above are derived from the
   * per-provider capability evidence (enterpriseSecurity / adminControls / sso,
   * each carrying its own evidence + source + lastVerified) rather than from
   * unverifiable flag assertions. Consumers that need certainty (governance
   * requirements, confidence reporting) must check this before treating a
   * compliance claim as satisfied.
   */
  governanceDataVerified: boolean;

  /** Entry price of the cheapest genuinely purchasable seat tier; null when none is published. */
  meaningfulPaidPlanPrice: number | null;
  costEfficiencyScore: number;   // Value per dollar at the meaningful paid entry tier
  /**
   * False when the provider publishes no meaningful paid seat price, so
   * `costEfficiencyScore` is a neutral placeholder rather than a measurement.
   * Consumers that rank on cost must treat cost as unknown (redistribute its
   * weight) instead of letting an unpriced provider outrank a priced one.
   */
  costDataAvailable: boolean;
  vendorStabilityScore: number;  // Vendor rating + enterprise presence + source depth
  futureGrowthScore: number;     // Vendor trajectory + platform reach (NOT plan count)

  /**
   * Composite of real published benchmark entries, or null when the provider has
   * none. Never synthesised from capability scores — a null here means "unknown",
   * and consumers must redistribute the benchmark weight across the remaining
   * factors instead of substituting a proxy.
   */
  benchmarkScore: number | null;
  benchmarkDataAvailable: boolean;
  /** Individual published benchmark values by key, for domain-aware relevance weighting. */
  benchmarkComponents: Record<string, number>;
  /** Benchmark keys found in the data but excluded from the composite (non 0–100 scale, e.g. Elo). */
  outOfScaleBenchmarkKeys: string[];

  /**
   * Capability-evidence composite (0–100). This is what the old code returned
   * from `computeBenchmarkScore()` when benchmarks were absent — it is retained
   * here under an honest name for display metrics that need a non-null quality
   * proxy, and is deliberately NOT interchangeable with `benchmarkScore`.
   */
  capabilityCompositeScore: number;

  // Raw capability vector (0–10 per key) — used by WorkflowEngine, RelationshipEngine
  capabilityVector: Record<string, number>;
}

export class KnowledgeScoringEngine {
  private static cache = new Map<string, ScoredProviderProfile>();

  /**
   * Scores a single provider. Cached after first computation.
   */
  public static score(profile: ProviderProfile): ScoredProviderProfile {
    const cached = this.cache.get(profile.id);
    if (cached) return cached;

    const weights = KnowledgeLoader.getRecommendationWeights();
    const result = this.computeScore(profile, weights);
    this.cache.set(profile.id, result);
    return result;
  }

  /**
   * Scores all loaded providers. Returns array sorted by id.
   */
  public static scoreAll(): ScoredProviderProfile[] {
    KnowledgeLoader.initialize();
    return KnowledgeLoader.getAllProviders().map(p => this.score(p));
  }

  /**
   * Retrieves a single scored profile by id.
   */
  public static getScored(id: string): ScoredProviderProfile | null {
    const raw = KnowledgeLoader.getProvider(id);
    return raw ? this.score(raw) : null;
  }

  public static clearCache(): void {
    this.cache.clear();
  }

  // ── Private Computation ────────────────────────────────────────────────────

  private static computeScore(p: ProviderProfile, weights: RecommendationWeights): ScoredProviderProfile {
    const raw = p as any; // access vendorProfile if present

    // ── Vendor Identity ──────────────────────────────────────────────────────
    const vendorId: string = raw.vendorProfile?.vendorId
      || p.vendor.toLowerCase().replace(/\s+/g, '-');

    // ── Capability Vector ────────────────────────────────────────────────────
    const capabilityVector: Record<string, number> = {};
    for (const [key, entry] of Object.entries(p.capabilities)) {
      capabilityVector[key] = (entry as any).score ?? 0;
    }

    const capScore = (key: string): number => (capabilityVector[key] ?? 0) * 10;

    // ── Core Capability Scores (cap 0–10 → score 0–100) ─────────────────────
    const reasoningScore   = capScore('reasoning');
    const codingScore      = capScore('coding');
    const writingScore     = capScore('writing');
    const researchScore    = capScore('research');
    const longContextScore = capScore('longContext');
    const latencyScore     = capScore('latency');
    const reliabilityScore = capScore('reliability');

    // ── Governance Scores (enterprise / security / compliance) ───────────────
    // The `enterprise` flag block in the shipped knowledge base is identical for
    // every provider, so scoring it produced the same three constants for all 13
    // and made the enterprise-security strategy's governance weight inert.
    // KnowledgeLoader flags such blocks as unverified; when unverified we score
    // from the per-provider capability evidence instead, which is researched,
    // sourced and genuinely differentiating (e.g. sso: copilot 10 → kimi 0).
    const governanceDataVerified = p.governanceDataVerified === true;
    const governance = governanceDataVerified
      ? this.governanceFromFlags(p, weights)
      : this.governanceFromCapabilityEvidence(p, capabilityVector, weights);

    const { enterpriseScore, securityScore, complianceScore } = governance;

    // ── Cost Efficiency Score ────────────────────────────────────────────────
    // Uses the cheapest genuinely purchasable seat tier, not the global minimum.
    // The old `cheapestPlanPrice()` took Math.min over every plan AND every
    // pricing entry, so free tiers, $0 "contact sales" enterprise placeholders
    // and pay-as-you-go rows collapsed the price to $0 for all 13 providers —
    // which pinned costEfficiencyScore at the `free` tier (100) universally and
    // let a free tier make any provider look infinitely cost-efficient.
    const tiers = weights.knowledgeScoring.costTiers;
    const meaningfulPaidPlanPrice = this.meaningfulPaidPlanPrice(p);
    const costDataAvailable = meaningfulPaidPlanPrice !== null;
    let costEfficiencyScore: number;
    if (meaningfulPaidPlanPrice === null) {
      // No published per-seat price (pure pay-as-you-go or free-only product).
      // Unknown cost is neither zero cost nor cheap cost. The previous
      // `tiers['lte20'] ?? 70` placed unpriced products in the "$11–20/seat" band,
      // i.e. better than every provider actually priced above $20 — a free bonus
      // for having no pricing data (codex, github-models, openai-api,
      // anthropic-api all sat at a flat 70 regardless of the request). Use the
      // scale midpoint as an explicitly neutral placeholder, and flag the value as
      // unmeasured via `costDataAvailable` so cost-ranking consumers redistribute
      // the weight instead of comparing an unknown against a measurement.
      costEfficiencyScore = tiers['unknown'] ?? 50;
    } else {
      const price = meaningfulPaidPlanPrice;
      if (price === 0)       costEfficiencyScore = tiers['free']    ?? 100;
      else if (price <= 10)  costEfficiencyScore = tiers['lte10']   ?? 85;
      else if (price <= 20)  costEfficiencyScore = tiers['lte20']   ?? 70;
      else if (price <= 40)  costEfficiencyScore = tiers['lte40']   ?? 55;
      else if (price <= 80)  costEfficiencyScore = tiers['lte80']   ?? 35;
      else                   costEfficiencyScore = tiers['above80'] ?? 20;
    }

    // ── Vendor Stability Score ───────────────────────────────────────────────
    const vsw = weights.knowledgeScoring.vendorStabilityWeights;
    const vendorProfile: VendorProfile | undefined = p.vendorProfile;
    const stabilityRating = vendorProfile?.stabilityRating;

    // vendorProfile now reaches this engine (KnowledgeLoader previously dropped
    // it during synthesis, so this lookup was always undefined and every
    // provider silently fell back to its reliability capability score).
    const reliabilityBase = stabilityRating
      ? this.stabilityRatingToScore(stabilityRating)
      : reliabilityScore;

    const sourceDepthPts = (p.sources?.length ?? 0) >= 2 ? 100 : 50;
    const enterprisePresencePts = (vendorProfile?.enterprisePresence ?? p.enterpriseAvailability) ? 100 : 0;

    const vendorStabilityScore = Math.round(
      reliabilityBase * (vsw['reliabilityScore'] ?? 0.5) +
      enterprisePresencePts * (vsw['enterpriseAvailability'] ?? 0.2) +
      sourceDepthPts * (vsw['sourcesPresent'] ?? 0.3)
    );

    // ── Future Growth Score ──────────────────────────────────────────────────
    const futureGrowthScore = this.computeFutureGrowthScore(p, vendorProfile);

    // ── Benchmark Score ──────────────────────────────────────────────────────
    const benchmarkComponents = this.collectBenchmarkComponents(
      p, weights.knowledgeScoring.benchmarkConfidenceThreshold
    );
    const benchmarkKeys = Object.keys(benchmarkComponents);
    const benchmarkDataAvailable = benchmarkKeys.length > 0;
    const benchmarkScore = benchmarkDataAvailable
      ? Math.round(benchmarkKeys.reduce((sum, k) => sum + benchmarkComponents[k], 0) / benchmarkKeys.length)
      : null;

    const capabilityCompositeScore = this.computeCapabilityComposite(capabilityVector);

    return {
      id: p.id,
      name: p.name,
      category: p.category,
      vendor: p.vendor,
      vendorId,
      vendorProfile,
      plans: p.plans,
      pricing: p.pricing,
      raw: p,

      reasoningScore,
      codingScore,
      writingScore,
      researchScore,
      longContextScore,
      latencyScore,
      reliabilityScore,

      enterpriseScore: Math.min(100, enterpriseScore),
      securityScore: Math.min(100, securityScore),
      complianceScore: Math.min(100, complianceScore),
      governanceDataVerified,

      meaningfulPaidPlanPrice,
      costEfficiencyScore: Math.min(100, Math.max(0, costEfficiencyScore)),
      costDataAvailable,
      vendorStabilityScore: Math.min(100, Math.max(0, vendorStabilityScore)),
      futureGrowthScore: Math.min(100, Math.max(0, futureGrowthScore)),

      benchmarkScore: benchmarkScore === null ? null : Math.min(100, Math.max(0, benchmarkScore)),
      benchmarkDataAvailable,
      benchmarkComponents,
      outOfScaleBenchmarkKeys: this.outOfScaleBenchmarkKeys(p),
      capabilityCompositeScore,

      capabilityVector,
    };
  }

  /**
   * Governance scored from the provider's own verified `enterprise` flag block.
   * Only reachable when KnowledgeLoader confirmed the block is provider-specific.
   */
  private static governanceFromFlags(
    p: ProviderProfile,
    weights: RecommendationWeights
  ): { enterpriseScore: number; securityScore: number; complianceScore: number } {
    const ent = p.enterprise;
    const cw = weights.knowledgeScoring.enterpriseComplianceWeight;
    const iw = weights.knowledgeScoring.enterpriseIdentityWeight;
    const aw = weights.knowledgeScoring.enterpriseAdminWeight;

    const ratio = (flags: unknown[]): number => (flags.filter(Boolean).length / flags.length) * 100;

    const compliancePts = ratio([
      ent?.compliance?.soc2, ent?.compliance?.gdpr,
      ent?.compliance?.hipaa, ent?.compliance?.iso27001
    ]);
    const identityPts = ratio([ent?.identity?.sso, ent?.identity?.saml, ent?.identity?.scim]);
    const adminPts = ratio([
      ent?.administration?.rbac, ent?.administration?.auditLogs, ent?.administration?.adminConsole
    ]);
    const securityPts = ratio([
      ent?.security?.encryption, ent?.security?.zeroDataRetention, ent?.security?.privateDeployment
    ]);

    return {
      enterpriseScore: Math.round(compliancePts * cw + identityPts * iw + adminPts * aw),
      securityScore: Math.round(securityPts),
      complianceScore: Math.round(compliancePts)
    };
  }

  /**
   * Governance scored from per-provider capability evidence, used when the
   * `enterprise` block is catalogue-wide boilerplate.
   *
   * Inputs are the three researched governance capabilities — each carries its
   * own `evidence`, `source` and `lastVerified` in the model files — plus the
   * `enterpriseReadiness` productivity score and the vendor's enterprise
   * presence. Nothing is asserted that the data does not support: a provider
   * with no documented SSO scores 0 on identity rather than inheriting a
   * blanket `sso: true`.
   */
  private static governanceFromCapabilityEvidence(
    p: ProviderProfile,
    capabilityVector: Record<string, number>,
    weights: RecommendationWeights
  ): { enterpriseScore: number; securityScore: number; complianceScore: number } {
    const cw = weights.knowledgeScoring.enterpriseComplianceWeight;
    const iw = weights.knowledgeScoring.enterpriseIdentityWeight;
    const aw = weights.knowledgeScoring.enterpriseAdminWeight;

    const cap = (key: string): number => Math.max(0, Math.min(10, capabilityVector[key] ?? 0)) * 10;

    const securityEvidence = cap('enterpriseSecurity');
    const adminEvidence    = cap('adminControls');
    const identityEvidence = cap('sso');

    // enterpriseReadiness is a researched 0–10 productivity score (kimi 2 → copilot 10).
    const readinessRaw = p.developerExperience?.enterpriseReadiness ?? p.productivityScores?.enterpriseReadiness;
    const readinessPts = typeof readinessRaw === 'number'
      ? Math.max(0, Math.min(10, readinessRaw)) * 10
      : null;

    // A published, priced enterprise tier is concrete evidence of enterprise intent,
    // unlike a $0 "contact sales" placeholder row.
    const hasRealEnterpriseTier = (p.plans ?? []).some(
      pl => (pl as any).isEnterprise === true && pl.monthlyPricePerSeat > 0
    );
    const vendorEnterprisePresence = p.vendorProfile?.enterprisePresence ?? p.enterpriseAvailability;

    // Compliance certifications are NOT inferable from capability scores. Rather
    // than fabricating a certification level, express governance-programme
    // maturity from the signals that do exist, and let `governanceDataVerified`
    // tell consumers this is evidence-derived rather than certificate-confirmed.
    const complianceProxy = readinessPts !== null
      ? (securityEvidence * 0.6) + (readinessPts * 0.4)
      : securityEvidence;

    const complianceScore = Math.round(
      complianceProxy * 0.8 + (hasRealEnterpriseTier ? 20 : 0)
    );

    const identityScore = Math.round(
      identityEvidence * 0.85 + (vendorEnterprisePresence ? 15 : 0)
    );

    const adminScore = Math.round(
      adminEvidence * 0.85 + (hasRealEnterpriseTier ? 15 : 0)
    );

    const enterpriseScore = Math.round(
      complianceScore * cw + identityScore * iw + adminScore * aw
    );

    // Security posture: documented security capability, tempered by whether the
    // vendor actually operates an enterprise programme.
    const securityScore = Math.round(
      securityEvidence * 0.75 + (vendorEnterprisePresence ? 15 : 0) + (hasRealEnterpriseTier ? 10 : 0)
    );

    return {
      enterpriseScore: Math.max(0, Math.min(100, enterpriseScore)),
      securityScore: Math.max(0, Math.min(100, securityScore)),
      complianceScore: Math.max(0, Math.min(100, complianceScore))
    };
  }

  /**
   * Cheapest genuinely purchasable per-seat price.
   *
   * Excluded: free tiers ($0 with no enterprise flag are kept only if no paid
   * tier exists at all — see below), $0 enterprise placeholders ("contact
   * sales"), and pay-as-you-go rows whose $0 is a billing model rather than a
   * price. Returns null when the provider publishes no per-seat price.
   */
  private static meaningfulPaidPlanPrice(p: ProviderProfile): number | null {
    const plans = p.plans ?? [];

    const purchasable = plans.filter(pl => {
      const anyPlan = pl as any;
      if (typeof pl.monthlyPricePerSeat !== 'number') return false;
      if (anyPlan.isPayPerUse === true) return false;         // $0 means "metered", not "free"
      if (anyPlan.isEnterprise === true && pl.monthlyPricePerSeat <= 0) return false; // contact-sales placeholder
      return pl.monthlyPricePerSeat > 0;
    });

    if (purchasable.length > 0) {
      return Math.min(...purchasable.map(pl => pl.monthlyPricePerSeat));
    }
    return null;
  }

  private static stabilityRatingToScore(rating?: string): number {
    switch (rating) {
      case 'Very High': return 95;
      case 'High':      return 80;
      case 'Medium':    return 60;
      case 'Low':       return 35;
      default:          return 60;
    }
  }

  /**
   * Vendor trajectory and platform reach.
   *
   * Plan count is deliberately excluded: it was previously worth up to 50 of the
   * 100 points, so a vendor that simply published more pricing rows (Cursor and
   * Windsurf, 6 and 5 plans) scored a perfect 100 on "future growth" while
   * saying nothing about growth. The replacement uses only signals that describe
   * the vendor: stability rating, enterprise presence, funding stage, operating
   * history, and breadth of the shipped product family.
   *
   * The vendor signals are then capped by the PRODUCT's own lifecycle stage. Vendor
   * health is not product health: Codex inherits OpenAI's Very High stability,
   * public-scale longevity and 3-product family and therefore scored 92/100 on
   * "future growth" while its own provider.json says "Officially deprecated by
   * OpenAI" and "bestUseCases: None (deprecated)". A retired product has no growth
   * trajectory no matter how healthy its vendor is.
   */
  private static computeFutureGrowthScore(p: ProviderProfile, vp?: VendorProfile): number {
    const stabilityPts = this.stabilityRatingToScore(vp?.stabilityRating);

    const enterprisePresence = (vp?.enterprisePresence ?? p.enterpriseAvailability) ? 100 : 40;

    // A public company and a seed-stage startup have materially different
    // continuity outlooks; anything undeclared stays neutral.
    const fundingPts = vp?.fundingStage === 'Public' ? 100
      : vp?.fundingStage === 'Private' ? 70
      : 60;

    // Operating history, saturating at 10 years.
    const currentYear = new Date().getUTCFullYear();
    const years = vp?.establishedYear ? Math.max(0, currentYear - vp.establishedYear) : null;
    const longevityPts = years === null ? 60 : Math.min(100, 40 + years * 6);

    // Breadth of shipped products under the same vendor.
    const familySize = vp?.productFamily?.length ?? 1;
    const familyPts = Math.min(100, 55 + (familySize - 1) * 15);

    const vendorTrajectory = Math.round(
      stabilityPts * 0.35 +
      enterprisePresence * 0.20 +
      fundingPts * 0.15 +
      longevityPts * 0.15 +
      familyPts * 0.15
    );

    return this.applyLifecycleCeiling(vendorTrajectory, p.lifecycleStatus);
  }

  /**
   * Caps a vendor-trajectory score by the product's declared lifecycle stage.
   * Absent / `active` is unchanged, so no provider needs an explicit declaration
   * to keep its current score.
   */
  private static applyLifecycleCeiling(
    vendorTrajectory: number,
    lifecycleStatus?: 'active' | 'maintenance' | 'deprecated' | 'sunset'
  ): number {
    switch (lifecycleStatus) {
      case 'sunset':
      case 'deprecated':
        // Announced end-of-life: growth outlook is floor-level regardless of vendor.
        return Math.min(vendorTrajectory, 10);
      case 'maintenance':
        // Still supported but no longer being invested in.
        return Math.min(vendorTrajectory, 55);
      default:
        return vendorTrajectory;
    }
  }

  /**
   * Published benchmark entries that clear the confidence threshold, keyed by
   * benchmark name so callers can weight by domain relevance (a coding audit
   * should not be swayed by a writing benchmark).
   *
   * Returns an empty object when the provider has no benchmark data. There is no
   * synthetic fallback: the previous implementation averaged five capability
   * scores × 10 whenever benchmarks were missing, which produced a confident
   * looking benchmark number for 12 of 13 providers out of data that was not
   * benchmark data at all.
   *
   * Only entries on a 0–100 scale are returned. The knowledge base mixes scales
   * inside a single block — Artificial Analysis indices are 0–100 (e.g. 60, 76)
   * while Design Arena entries are Elo ratings (e.g. 1452, 1413). Clamping Elo
   * into 0–100 turned every Design Arena row into a perfect 100 and inflated the
   * only real benchmark composite in the catalogue from 60 to 82. Out-of-scale
   * entries are reported by `outOfScaleBenchmarkKeys()` instead of being folded
   * in through an invented conversion.
   */
  private static collectBenchmarkComponents(
    p: ProviderProfile,
    confidenceThreshold: number
  ): Record<string, number> {
    const benchmarks = p.benchmarks as Record<string, { score?: number; confidence?: number }> | undefined;
    const out: Record<string, number> = {};
    if (!benchmarks) return out;

    for (const [key, entry] of Object.entries(benchmarks)) {
      if (!entry || typeof entry.score !== 'number' || !Number.isFinite(entry.score)) continue;
      const confidence = entry.confidence ?? 100;
      if (confidence < confidenceThreshold) continue;
      if (entry.score < 0 || entry.score > 100) continue;   // not a 0–100 scale
      out[key] = entry.score;
    }
    return out;
  }

  /** Benchmark keys present in the data but excluded from the composite for scale reasons. */
  private static outOfScaleBenchmarkKeys(p: ProviderProfile): string[] {
    const benchmarks = p.benchmarks as Record<string, { score?: number }> | undefined;
    if (!benchmarks) return [];
    return Object.entries(benchmarks)
      .filter(([, e]) => typeof e?.score === 'number' && Number.isFinite(e.score) && (e.score! < 0 || e.score! > 100))
      .map(([k]) => k);
  }

  /**
   * Honest capability-evidence composite for display metrics that require a
   * non-null quality figure. Explicitly not a benchmark score.
   */
  private static computeCapabilityComposite(capabilityVector: Record<string, number>): number {
    const keys = ['reasoning', 'coding', 'writing', 'research', 'reliability'];
    const total = keys.reduce((sum, k) => sum + (capabilityVector[k] ?? 0) * 10, 0);
    return Math.round(total / keys.length);
  }
}
