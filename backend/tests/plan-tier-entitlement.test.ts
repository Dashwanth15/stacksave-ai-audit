import { describe, it, expect, beforeAll } from 'vitest';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine, ScoredProviderProfile } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest, StructuredStack } from '../src/types/stackBuilder';

// ============================================================================
// Plan-Tier Entitlement Regression Suite
//
// Locks in the plan-gate fixes: the capability vector describes the PRODUCT, but a
// team only gets what the tier it is told to buy entitles. Two failure directions
// are guarded here —
//   (a) claiming coverage the purchased tier does not entitle (the free tier of a
//       product with governance controls does not deliver governance), and
//   (b) inflating the recommended plan when no stated requirement demands a
//       higher tier (budget must not be spent just because it exists).
// Every gate is read from each vendor's own published plan copy via
// feature-map `planEvidenceTerms`; no provider id, tier name or price is
// special-cased in these tests.
// ============================================================================

const basePrefs = {
  preferOpenSource: false,
  avoidLockIn: false,
  maximizeSavings: false,
  preferEstablishedVendors: false,
  requireZeroRetention: false
};

function makeReq(over: Partial<StackBuilderRequest> = {}): StackBuilderRequest {
  const { preferences, ...rest } = over;
  return {
    domain: 'software-engineering',
    teamSize: 10,
    monthlyBudget: 2000,
    requirements: ['editor-code-generation'],
    strategy: 'balanced',
    ...rest,
    preferences: { ...basePrefs, ...(preferences || {}) }
  } as StackBuilderRequest;
}

/** Tier position of the plan a stack tool was actually told to buy. */
function purchasedTierRank(profile: ScoredProviderProfile, planLabel: string): number | null {
  const plan = ((profile.plans as any[]) ?? []).find(pl => pl?.label === planLabel);
  return typeof plan?.tierRank === 'number' ? plan.tierRank : null;
}

function profileOf(id: string, profiles: ScoredProviderProfile[]): ScoredProviderProfile | undefined {
  return profiles.find(p => p.id === id);
}

const GATED_REQUIREMENTS = ['enterprise-governance', 'enterprise-sso'];

describe('Plan-tier entitlement regressions', () => {
  let profiles: ScoredProviderProfile[];

  beforeAll(() => {
    KnowledgeLoader.initialize();
    profiles = KnowledgeScoringEngine.scoreAll();
  });

  it('PLAN 1: no stack claims a requirement its purchased tier does not entitle', () => {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const result = AIStackRecommendationEngine.run(makeReq({
      domain: 'enterprise-compliance',
      requirements: GATED_REQUIREMENTS,
      teamSize: 20,
      monthlyBudget: 4000,
      strategy: 'balanced'
    }));

    const violations: string[] = [];
    for (const [categoryName, category] of Object.entries(result.categories)) {
      const stack: StructuredStack | undefined = (category as any)?.recommendedStack;
      if (!stack) continue;

      for (const tool of stack.tools) {
        const profile = profileOf(tool.toolId, profiles);
        if (!profile) continue;
        const selectedTier = purchasedTierRank(profile, tool.recommendedPlan);
        if (selectedTier === null) continue;

        for (const claimed of tool.featuresCovered) {
          const entry = featureMap.features[claimed];
          if (!entry) continue;
          const requiredTier = StackCoverageAnalyzer.planGateTierRank(profile, entry);
          if (requiredTier !== null && selectedTier < requiredTier) {
            violations.push(
              `${categoryName}: ${tool.toolId} (${tool.recommendedPlan}, tier ${selectedTier}) ` +
              `claims ${claimed} but the published copy sells it from tier ${requiredTier}`
            );
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('PLAN 2: a budget too small for any paid tier claims no gated coverage', () => {
    const result = AIStackRecommendationEngine.run(makeReq({
      domain: 'enterprise-compliance',
      requirements: GATED_REQUIREMENTS,
      teamSize: 50,
      monthlyBudget: 200,
      strategy: 'balanced'
    }));

    const stack = result.categories.bestOverall.recommendedStack;
    // Free/entry tiers are a legitimate answer to an impossible budget; claiming the
    // gated requirements from them is not.
    for (const tool of stack.tools) {
      for (const req of GATED_REQUIREMENTS) {
        expect(
          tool.featuresCovered,
          `${tool.toolId} (${tool.recommendedPlan}) must not claim ${req} at a tier this budget can buy`
        ).not.toContain(req);
      }
    }
    expect(stack.coverageResult.coverageScore).toBeLessThan(100);
  });

  it('PLAN 3: every reported plan gate is a real gate above the purchased tier', () => {
    const result = AIStackRecommendationEngine.run(makeReq({
      domain: 'enterprise-compliance',
      requirements: GATED_REQUIREMENTS,
      teamSize: 20,
      monthlyBudget: 4000,
      strategy: 'best-value'
    }));

    for (const [, category] of Object.entries(result.categories)) {
      const stack: StructuredStack | undefined = (category as any)?.recommendedStack;
      if (!stack) continue;
      for (const gate of stack.coverageResult.planGated) {
        expect(gate.selectedTier).toBeLessThan(gate.requiredTier);
        expect(GATED_REQUIREMENTS).toContain(gate.featureKey);
        // A gate must name a provider that is actually in the stack being reported on.
        expect(stack.tools.map(t => t.toolId)).toContain(gate.providerId);
      }
    }
  });

  it('PLAN 4: a gated requirement never lowers the purchased tier, and no requirement never raises it', () => {
    const engine = AIStackRecommendationEngine as any;
    const tierOf = (plan: any) => (typeof plan?.tierRank === 'number' ? plan.tierRank : -1);

    let comparableProviders = 0;
    for (const p of profiles) {
      if (p.category === 'api') continue;
      const withoutReq = engine.selectOptimalPlan(p, 20, 'best-value', 4000, []);
      const withReq = engine.selectOptimalPlan(p, 20, 'best-value', 4000, GATED_REQUIREMENTS);
      if (!withoutReq || !withReq) continue;
      comparableProviders += 1;

      // Requirements may push the purchase UP a ladder (an entitlement floor) but must
      // never pull it DOWN: stating a requirement cannot make a team buy less.
      expect(
        tierOf(withReq),
        `${p.id}: stating a requirement lowered the recommended tier ` +
        `(${withoutReq.label} → ${withReq.label})`
      ).toBeGreaterThanOrEqual(tierOf(withoutReq));

      // And where the provider has no gated entitlement at all, the two decisions must
      // be identical — no speculative upsell.
      const hasFloor = engine.requirementTierFloors(p, GATED_REQUIREMENTS).length > 0;
      if (!hasFloor) {
        expect(
          withReq.label,
          `${p.id}: no published gate for these requirements, so the plan must not change`
        ).toBe(withoutReq.label);
      }
    }

    expect(comparableProviders).toBeGreaterThan(3);
  });

  it('PLAN 5: an unpublished entitlement is unknown, not free — no gate is invented', () => {
    const featureMap = KnowledgeLoader.getFeatureMap();
    let gatedCount = 0;
    let ungatedCount = 0;

    for (const p of profiles) {
      for (const key of GATED_REQUIREMENTS) {
        const entry = featureMap.features[key];
        const rank = StackCoverageAnalyzer.planGateTierRank(p, entry);
        if (rank === null) {
          ungatedCount += 1;
          continue;
        }
        gatedCount += 1;
        // A gate is only ever read off a real plan entry, so it must correspond to a
        // published tier position — never a fabricated floor of 0.
        const ranks = ((p.plans as any[]) ?? [])
          .map(pl => pl?.tierRank)
          .filter((r): r is number => typeof r === 'number');
        expect(ranks).toContain(rank);
      }
    }

    // The knowledge base must exercise both paths: some vendors publish the
    // entitlement, others do not, and the second group is left ungated rather than
    // assumed restricted.
    expect(gatedCount).toBeGreaterThan(0);
    expect(ungatedCount).toBeGreaterThan(0);
  });

  it('PLAN 6: plan-blind screening still sees product capability', () => {
    // Candidate screening must stay plan-blind: a provider is first judged on what the
    // product can do, and only the stack it lands in fixes its tier. If screening were
    // gated, an entitled-but-expensive provider would be filtered out before the budget
    // logic ever got the chance to buy it.
    const capable = profiles.filter(
      p => StackCoverageAnalyzer.fullyCoveredBy(p, [], ['enterprise-governance']).length > 0
    );
    const freeTierResolver = () => ({ tierRank: 0 });
    const capableAtFreeTier = profiles.filter(
      p => StackCoverageAnalyzer.fullyCoveredBy(p, [], ['enterprise-governance'], freeTierResolver as any).length > 0
    );

    expect(capable.length).toBeGreaterThan(0);
    expect(capableAtFreeTier.length).toBeLessThan(capable.length);
  });
});
