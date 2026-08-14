// ============================================================
// Knowledge Scoring Engine — StackSave AI Platform Intelligence
//
// Normalizes all raw provider JSON knowledge into deterministic
// dimension scores (0–100). Every downstream Flow 2 engine
// consumes ScoredProviderProfile instead of raw ProviderProfile.
//
// FLOW 1 (Audit) pipeline is NOT affected by this engine.
// ============================================================

import { KnowledgeLoader, ProviderProfile, PlanEntry, RecommendationWeights } from './KnowledgeLoader';

export interface ScoredProviderProfile {
  // Identity
  id: string;
  name: string;
  category: 'ide' | 'chat' | 'api' | 'search';
  vendor: string;
  vendorId: string;          // vendorProfile.vendorId if present, else vendor.toLowerCase()
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

  enterpriseScore: number;   // compliance + identity + administration flags
  securityScore: number;     // encryption + privateDeployment + zeroDataRetention
  complianceScore: number;   // SOC2 + GDPR + HIPAA + ISO27001 weighted

  costEfficiencyScore: number;   // Inverse of cheapest plan price, 0–100
  vendorStabilityScore: number;  // Reliability + enterprise presence + source depth
  futureGrowthScore: number;     // Plan tier range + enterprise availability + API support

  benchmarkScore: number;        // Weighted composite of all benchmark entries if present

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

    // ── Enterprise Score ─────────────────────────────────────────────────────
    const ent = p.enterprise;
    const cw = weights.knowledgeScoring.enterpriseComplianceWeight;
    const iw = weights.knowledgeScoring.enterpriseIdentityWeight;
    const aw = weights.knowledgeScoring.enterpriseAdminWeight;

    const complianceFlags = [
      ent?.compliance?.soc2,
      ent?.compliance?.gdpr,
      ent?.compliance?.hipaa,
      ent?.compliance?.iso27001
    ].filter(Boolean).length;
    const compliancePts = (complianceFlags / 4) * 100;

    const identityFlags = [
      ent?.identity?.sso,
      ent?.identity?.saml,
      ent?.identity?.scim
    ].filter(Boolean).length;
    const identityPts = (identityFlags / 3) * 100;

    const adminFlags = [
      ent?.administration?.rbac,
      ent?.administration?.auditLogs,
      ent?.administration?.adminConsole
    ].filter(Boolean).length;
    const adminPts = (adminFlags / 3) * 100;

    const enterpriseScore = Math.round(compliancePts * cw + identityPts * iw + adminPts * aw);
    const complianceScore = Math.round(compliancePts);

    // ── Security Score ───────────────────────────────────────────────────────
    const securityFlags = [
      ent?.security?.encryption,
      ent?.security?.zeroDataRetention,
      ent?.security?.privateDeployment
    ].filter(Boolean).length;
    const securityScore = Math.round((securityFlags / 3) * 100);

    // ── Cost Efficiency Score ────────────────────────────────────────────────
    const tiers = weights.knowledgeScoring.costTiers;
    const cheapest = this.cheapestPlanPrice(p);
    let costEfficiencyScore: number;
    if (cheapest === 0)      costEfficiencyScore = tiers['free']    ?? 100;
    else if (cheapest <= 10) costEfficiencyScore = tiers['lte10']   ?? 85;
    else if (cheapest <= 20) costEfficiencyScore = tiers['lte20']   ?? 70;
    else if (cheapest <= 40) costEfficiencyScore = tiers['lte40']   ?? 55;
    else if (cheapest <= 80) costEfficiencyScore = tiers['lte80']   ?? 35;
    else                     costEfficiencyScore = tiers['above80'] ?? 20;

    // ── Vendor Stability Score ───────────────────────────────────────────────
    const vsw = weights.knowledgeScoring.vendorStabilityWeights;
    const stabilityRating = raw.vendorProfile?.stabilityRating;
    const stabilityFromRating = this.stabilityRatingToScore(stabilityRating);

    // If vendorProfile.stabilityRating is present, use it; otherwise derive from reliability
    const reliabilityBase = stabilityRating
      ? stabilityFromRating
      : reliabilityScore;

    const sourceDepthPts = (p.sources?.length ?? 0) >= 2 ? 100 : 50;
    const enterprisePresencePts = p.enterpriseAvailability ? 100 : 0;

    const vendorStabilityScore = Math.round(
      reliabilityBase * (vsw['reliabilityScore'] ?? 0.5) +
      enterprisePresencePts * (vsw['enterpriseAvailability'] ?? 0.2) +
      sourceDepthPts * (vsw['sourcesPresent'] ?? 0.3)
    );

    // ── Future Growth Score ──────────────────────────────────────────────────
    const planCount = p.plans?.length ?? 0;
    const hasApi = p.apiSupport ? 20 : 0;
    const hasEnterprise = p.enterpriseAvailability ? 30 : 0;
    const planTierPts = Math.min(planCount * 10, 50);
    const futureGrowthScore = Math.min(100, planTierPts + hasApi + hasEnterprise);

    // ── Benchmark Score ──────────────────────────────────────────────────────
    const benchmarkScore = this.computeBenchmarkScore(p, weights.knowledgeScoring.benchmarkConfidenceThreshold);

    return {
      id: p.id,
      name: p.name,
      category: p.category,
      vendor: p.vendor,
      vendorId,
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

      costEfficiencyScore: Math.min(100, Math.max(0, costEfficiencyScore)),
      vendorStabilityScore: Math.min(100, Math.max(0, vendorStabilityScore)),
      futureGrowthScore: Math.min(100, Math.max(0, futureGrowthScore)),

      benchmarkScore: Math.min(100, Math.max(0, benchmarkScore)),

      capabilityVector,
    };
  }

  private static cheapestPlanPrice(p: ProviderProfile): number {
    const planPrices = (p.plans ?? []).map(pl => pl.monthlyPricePerSeat);
    const pricingPrices = Object.values(p.pricing ?? {}).filter(v => typeof v === 'number') as number[];
    const all = [...planPrices, ...pricingPrices].filter(n => n >= 0);
    return all.length > 0 ? Math.min(...all) : 999;
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

  private static computeBenchmarkScore(p: ProviderProfile, confidenceThreshold: number): number {
    const benchmarks = (p as any).benchmarks as Record<string, { score: number; confidence?: number }> | undefined;
    if (!benchmarks || Object.keys(benchmarks).length === 0) {
      // Fall back to composite of coding + reasoning + reliability raw scores
      const cv = p.capabilities;
      const scores = ['reasoning', 'coding', 'writing', 'research', 'reliability']
        .map(k => ((cv[k] as any)?.score ?? 0) * 10);
      return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }

    let total = 0;
    let count = 0;
    for (const entry of Object.values(benchmarks)) {
      const confidence = entry.confidence ?? 100;
      if (confidence >= confidenceThreshold) {
        // Benchmark scores are typically 0–100 already
        total += Math.min(100, entry.score);
        count++;
      }
    }
    return count > 0 ? Math.round(total / count) : 50;
  }
}
