import { describe, it, expect, beforeAll } from 'vitest';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackCoverageAnalyzer } from '../src/audit-engine/services/StackCoverageAnalyzer';
import { StackBuilderRequest, StackStrategy, StructuredStack } from '../src/types/stackBuilder';

// ============================================================================
// Recommendation Fairness Regression Suite
//
// Locks in the root-cause fixes from the recommendation-engine audit: scoring
// must be requirement-driven, strategy-sensitive and data-driven, with no
// provider-id literals, no synthetic benchmark data and no silent budget
// downgrades. Each test maps to one numbered regression requirement.
// ============================================================================

const basePrefs = {
  preferOpenSource: false,
  avoidLockIn: false,
  maximizeSavings: false,
  preferEstablishedVendors: true,
  requireZeroRetention: false
};

function makeReq(over: Partial<StackBuilderRequest> = {}): StackBuilderRequest {
  const { preferences, ...rest } = over;
  return {
    domain: 'software-engineering',
    teamSize: 10,
    monthlyBudget: 400,
    requirements: ['editor-code-generation'],
    strategy: 'balanced',
    ...rest,
    preferences: { ...basePrefs, ...(preferences || {}) }
  } as StackBuilderRequest;
}

function stackIds(stack: StructuredStack): string[] {
  return stack.tools.map(t => t.toolId);
}

describe('Recommendation fairness regressions', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('REG 1: changing strategy can change the ranking', () => {
    const strategies: StackStrategy[] = ['balanced', 'best-value', 'max-performance', 'enterprise-security'];
    const signatures = strategies.map(strategy => {
      const result = AIStackRecommendationEngine.run(makeReq({
        strategy,
        requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
        monthlyBudget: 600
      }));
      return result.categories.bestOverall.recommendedStack.canonicalSignature;
    });

    // At least one strategy must reach a different stack than the others: the four
    // objectives are genuinely different, not four weightings of the same answer.
    expect(new Set(signatures).size).toBeGreaterThan(1);
  });

  it('REG 2: cost influences the best-value category', () => {
    const req = makeReq({
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      monthlyBudget: 800,
      debug: true
    });
    const result = AIStackRecommendationEngine.run(req);
    const value = result.categories.bestValue.recommendedStack;
    const performance = result.categories.bestPerformance.recommendedStack;

    expect(value.estimatedMonthlyCost).toBeLessThanOrEqual(performance.estimatedMonthlyCost);

    // Cost efficiency must be a live, request-aware input rather than a constant that
    // free tiers pin to 100 for everyone.
    const efficiencies = (result.trace?.allProviderScores || []).map(s => s.costEfficiencyScore);
    expect(efficiencies.length).toBeGreaterThan(1);
    expect(new Set(efficiencies).size).toBeGreaterThan(1);
    expect(efficiencies.every(e => e === 100)).toBe(false);
  });

  it('REG 3: security requirements influence the enterprise-security strategy', () => {
    const lax = AIStackRecommendationEngine.run(makeReq({
      strategy: 'balanced',
      requirements: ['editor-code-generation', 'enterprise-governance'],
      monthlyBudget: 900
    }));
    const strict = AIStackRecommendationEngine.run(makeReq({
      strategy: 'enterprise-security',
      requirements: ['editor-code-generation', 'enterprise-governance'],
      monthlyBudget: 900,
      preferences: { ...basePrefs, requireZeroRetention: true }
    }));

    const laxStack = lax.categories.bestEnterprise.recommendedStack;
    const strictStack = strict.categories.bestEnterprise.recommendedStack;

    // Governance certainty must be reflected: with zero-retention demanded and the
    // catalogue's governance data mostly unverified, certainty multiplier cannot be higher than
    // the same request made without the governance demand.
    expect(strictStack.confidenceBreakdown.securityMatch).toBeGreaterThan(0);
    expect(strictStack.confidenceBreakdown.certaintyMultiplier).toBeLessThanOrEqual(laxStack.confidenceBreakdown.certaintyMultiplier!);
  });

  it('REG 4: absent benchmark data creates no synthetic score', () => {
    const scored = KnowledgeScoringEngine.scoreAll();
    const withoutBenchmarks = scored.filter(s => !s.benchmarkDataAvailable);

    expect(withoutBenchmarks.length).toBeGreaterThan(0);
    for (const s of withoutBenchmarks) {
      expect(s.benchmarkScore).toBeNull();
    }
    // And the providers that DO have benchmarks expose a real number.
    for (const s of scored.filter(x => x.benchmarkDataAvailable)) {
      expect(typeof s.benchmarkScore).toBe('number');
      expect(s.benchmarkScore).toBeGreaterThan(0);
    }
  });

  it('REG 5: editor-code-generation always yields a valid coding provider', () => {
    for (const budget of [40, 100, 400, 2000]) {
      const result = AIStackRecommendationEngine.run(makeReq({
        monthlyBudget: budget,
        requirements: ['editor-code-generation']
      }));
      const stack = result.categories.bestOverall.recommendedStack;
      const covered = new Set(stack.tools.flatMap(t => t.featuresCovered));
      const hasIde = stack.tools.some(t => t.category === 'ide');
      expect(
        covered.has('editor-code-generation') || hasIde,
        `budget $${budget} produced ${stackIds(stack).join(' + ')} with no coding provider`
      ).toBe(true);
    }
  });

  it('REG 6: increasing the budget never lowers mandatory requirement coverage', () => {
    const requirements = ['editor-code-generation', 'deep-reasoning-analysis'];
    const budgets = [0, 40, 50, 100, 300, 500, 1000, 5000];

    let previousCoverage = -1;
    let previousBudget = -1;
    for (const monthlyBudget of budgets) {
      const result = AIStackRecommendationEngine.run(makeReq({ monthlyBudget, requirements }));
      const stack = result.categories.bestOverall.recommendedStack;
      const coverage = stack.coverageResult.coverageScore;

      expect(
        coverage,
        `coverage dropped from ${previousCoverage}% at $${previousBudget} to ${coverage}% at $${monthlyBudget}`
      ).toBeGreaterThanOrEqual(previousCoverage);

      // Any shortfall must be declared, never silently shipped.
      if (monthlyBudget > 0 && stack.coverageResult.missing.length > 0) {
        expect(stack.budgetConstraint).toBeDefined();
        expect(stack.budgetConstraint?.constrained).toBe(true);
        expect(stack.budgetConstraint?.uncoveredFeatures.length).toBeGreaterThan(0);
      }

      previousCoverage = coverage;
      previousBudget = monthlyBudget;
    }
  });

  it('REG 7: the secondary tool is selected by capability gap', () => {
    const requirements = ['editor-code-generation', 'live-web-research'];
    const result = AIStackRecommendationEngine.run(makeReq({ requirements, monthlyBudget: 900 }));
    const stack = result.categories.bestOverall.recommendedStack;
    expect(stack.secondary).toBeDefined();

    // The gap is measured in FULL coverage, the same way the engine measures it: the
    // companion must raise the number of requirements the stack fully satisfies.
    const primaryProfile = KnowledgeScoringEngine.getScored(stack.primary.toolId)!;
    const secondaryProfile = KnowledgeScoringEngine.getScored(stack.secondary!.toolId)!;
    const primaryOnly = StackCoverageAnalyzer.analyze([primaryProfile], requirements);
    const withSecondary = StackCoverageAnalyzer.analyze([primaryProfile, secondaryProfile], requirements);

    expect(primaryOnly.covered.length).toBeLessThan(requirements.length);
    expect(withSecondary.covered.length).toBeGreaterThan(primaryOnly.covered.length);
  });

  it('REG 8: the API provider is ranked, not positional or vendor-hardcoded', () => {
    // The old bug was `allApiProviders[0]` — a positional pick off the head of the pool.
    const apiPool = KnowledgeLoader.getProvidersByCategory('api');
    expect(apiPool.length).toBeGreaterThan(1);

    const scenarios: StackBuilderRequest[] = [
      makeReq({ domain: 'ai-data-ml', requirements: ['developer-api-access'], strategy: 'best-value', monthlyBudget: 500 }),
      makeReq({ domain: 'ai-data-ml', requirements: ['developer-api-access'], strategy: 'max-performance', monthlyBudget: 5000 }),
      makeReq({ domain: 'software-engineering', requirements: ['developer-api-access', 'editor-code-generation'], strategy: 'enterprise-security', monthlyBudget: 2000, preferences: { ...basePrefs, requireZeroRetention: true } }),
      makeReq({ domain: 'research-knowledge', requirements: ['developer-api-access', 'live-web-research'], strategy: 'balanced', monthlyBudget: 300 })
    ];

    let apiLayersSeen = 0;
    for (const req of scenarios) {
      const result = AIStackRecommendationEngine.run(req);
      for (const category of Object.values(result.categories)) {
        const api = category.recommendedStack.apiLayer;
        if (!api) continue;
        apiLayersSeen++;
        // The chosen provider must actually be an API product with real capability data.
        expect(api.category).toBe('api');
        expect(api.capabilityHighlights.length).toBeGreaterThan(0);
        // And it must clear the API requirement on its own researched capability data.
        // A positional pick off the head of the pool cannot guarantee this.
        const scored = KnowledgeScoringEngine.getScored(api.toolId)!;
        const solo = StackCoverageAnalyzer.analyze([scored], ['developer-api-access']);
        expect(
          solo.covered.map(c => c.featureKey),
          `${api.toolId} was chosen as the API layer but does not satisfy developer-api-access`
        ).toContain('developer-api-access');
      }
    }
    expect(apiLayersSeen).toBeGreaterThan(0);

    // Requirement-driven, not positional and not vendor-fixed: the API layer moves to a
    // different vendor when the requirement set emphasises a different capability. The old
    // positional implementation returned the same id for every one of these probes, so
    // three distinct results refute it directly — and no diversity is being forced, the
    // picks follow the vendors whose capability data actually leads on each requirement.
    const apiFor = (requirements: string[], domain = 'ai-data-ml') =>
      AIStackRecommendationEngine.run(makeReq({
        domain, requirements, strategy: 'balanced', monthlyBudget: 2000
      })).categories.bestOverall.recommendedStack.apiLayer?.toolId;

    const plainApi = apiFor(['developer-api-access']);
    const visionApi = apiFor(['developer-api-access', 'visual-diagram-understanding']);
    const gitApi = apiFor(['developer-api-access', 'github-integration'], 'software-engineering');

    for (const pick of [plainApi, visionApi, gitApi]) expect(pick).toBeDefined();
    expect(visionApi).not.toBe(plainApi);
    expect(
      new Set([plainApi, visionApi, gitApi]).size,
      `API picks did not vary with requirements: ${plainApi} / ${visionApi} / ${gitApi}`
    ).toBeGreaterThan(2);
  });

  it('REG 9: alternative architectures contain no hardcoded provider ids', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '../src/audit-engine/services/AIStackRecommendationEngine.ts'),
      'utf-8'
    ) as string;

    const forbidden = [
      /providers\.find\(\s*p\s*=>\s*p\.id\s*===\s*['"][a-z-]+['"]/,
      /\.id\s*===\s*['"]claude['"]/,
      /\.id\s*===\s*['"]cursor['"]/,
      /\.id\s*===\s*['"]perplexity['"]/,
      /allApiProviders\[0\]/
    ];
    for (const pattern of forbidden) {
      expect(pattern.test(source), `engine still contains ${pattern}`).toBe(false);
    }

    // And every generated alternative must be valid for the actual requirements.
    const result = AIStackRecommendationEngine.run(makeReq({
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      monthlyBudget: 900
    }));
    for (const alt of result.categories.bestOverall.alternativeComparisons) {
      expect(alt.stack.tools.length).toBeGreaterThan(0);
      expect(alt.stack.coverageResult.coverageScore).toBeGreaterThan(0);
    }
  });

  it('REG 10: ties resolve deterministically', () => {
    const req = makeReq({
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      monthlyBudget: 700,
      debug: true
    });
    const runs = [1, 2, 3].map(() => AIStackRecommendationEngine.run(req));
    const orderings = runs.map(r => (r.trace?.allProviderScores || []).map(s => s.providerId).join('>'));

    expect(new Set(orderings).size).toBe(1);
    const signatures = runs.map(r => Object.values(r.categories)
      .map(c => c.recommendedStack.canonicalSignature).join('|'));
    expect(new Set(signatures).size).toBe(1);

    // Statistically tied providers are marked rather than presented as clear winners.
    const traced = runs[0].trace?.allProviderScores || [];
    const tiedFlags = traced.filter(s => s.statisticalTie === true);
    const leader = traced[0];
    const runnerUp = traced[1];
    if (leader && runnerUp && leader.compositeScore - runnerUp.compositeScore <= 2) {
      expect(tiedFlags.length).toBeGreaterThan(1);
    }
  });

  it('REG 11: confidence reflects the winner-vs-second margin', () => {
    const result = AIStackRecommendationEngine.run(makeReq({
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      monthlyBudget: 900,
      debug: true
    }));
    const stack = result.categories.bestOverall.recommendedStack;
    const cb = stack.confidenceBreakdown;

    expect(cb.scoreMargin).toBeDefined();
    expect(cb.certaintyMultiplier).toBeDefined();
    expect(cb.certaintyMultiplier!).toBeLessThanOrEqual(1);
    expect(cb.dataCompleteness).toBeGreaterThanOrEqual(0);
    expect(cb.benchmarkAvailability).toBeGreaterThanOrEqual(0);

    // A near-tie must not be reported as near-certainty.
    if ((cb.scoreMargin ?? 0) <= 2) {
      expect(stack.confidenceScore).toBeLessThan(95);
    }

    // The dampener is real: confidence is strictly below the raw weighted quality score
    // whenever any certainty term is imperfect.
    if (cb.certaintyMultiplier! < 1) {
      const rawQuality =
        cb.workflowMatch * 0.30 + cb.featureCoverage * 0.25 + cb.budgetFit * 0.15 +
        cb.capabilitySuperiority * 0.10 + cb.securityMatch * 0.10 +
        cb.vendorStability * 0.05 + cb.futureGrowth * 0.05;
      expect(stack.confidenceScore).toBeLessThanOrEqual(Math.round(rawQuality));
    }
  });

  it('REG 12: no-requirement runs do not double-count duplicate capability maps', () => {
    const featureMap = KnowledgeLoader.getFeatureMap();
    const entries = Object.entries(featureMap.features);
    const seen = new Map<string, string>();
    for (const [key, entry] of entries) {
      const signature = [...(entry.capabilityKeys || [])].sort().join(',') + `@${entry.minimumScore}`;
      const clash = seen.get(signature);
      // Duplicates are permitted only when explicitly declared as an alias.
      if (clash) {
        expect(
          Boolean(entry.derivedFrom) || Boolean(featureMap.features[clash].derivedFrom),
          `${key} duplicates ${clash} without a derivedFrom alias marker`
        ).toBe(true);
      } else {
        seen.set(signature, key);
      }
    }

    const withoutRequirements = AIStackRecommendationEngine.run(makeReq({
      requirements: [],
      mustHaveFeatures: [],
      monthlyBudget: 600
    }));
    const stack = withoutRequirements.categories.bestOverall.recommendedStack;
    // With nothing required, coverage cannot exceed 100% and must not be inflated.
    expect(stack.coverageResult.coverageScore).toBeLessThanOrEqual(100);
    for (const tool of stack.tools) {
      expect(new Set(tool.featuresCovered).size).toBe(tool.featuresCovered.length);
    }
  });
});
