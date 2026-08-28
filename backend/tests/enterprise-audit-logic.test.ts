import { describe, it, expect } from 'vitest';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeScoringEngine } from '../src/audit-engine/services/KnowledgeScoringEngine';
import { StackBuilderRequest } from '../src/types/stackBuilder';

const baseRequest: StackBuilderRequest = {
  domain: 'general-productivity',
  requirements: [],
  strategy: 'balanced',
  monthlyBudget: 1000,
  teamSize: 10,
  preferences: {
    preferOpenSource: false,
    avoidLockIn: false,
    maximizeSavings: false,
    preferEstablishedVendors: false,
    requireZeroRetention: false,
  },
};

describe('Enterprise Audit & Decision Engine Logic — Comprehensive Regression Suite', () => {
  // ── TEST A — SECURITY CATEGORY ─────────────────────────────────────────────
  it('TEST A: Enterprise Security objective is determined by audited security/governance posture, not cheap pricing or generic capability', () => {
    const secReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'enterprise-security',
      requirements: ['enterprise-governance'],
      optimizationGoal: 'governance',
      debug: true,
    };
    const res = AIStackRecommendationEngine.run(secReq);
    const primary = res.stacks.bestOverall.primary;
    const bestEnt = res.categories.bestEnterprise.recommendedStack.primary;

    const allScores = KnowledgeScoringEngine.scoreAll();
    const primaryProfile = allScores.find((p) => p.id === primary.toolId);
    const bestEntProfile = allScores.find((p) => p.id === bestEnt.toolId);

    // Both recommended primary and enterprise stack primary must have high audited security posture
    expect(primaryProfile).toBeDefined();
    expect(bestEntProfile).toBeDefined();
    expect(primaryProfile!.securityScore).toBeGreaterThanOrEqual(70);
    expect(bestEntProfile!.securityScore).toBeGreaterThanOrEqual(70);

    // In general productivity under enterprise-security, Claude or ChatGPT (verified governance / enterprise security) leads
    expect(['chatgpt', 'claude', 'github-copilot']).toContain(bestEnt.toolId);
  });

  // ── TEST B — USED PRIMARY INDEPENDENCE ──────────────────────────────────────
  it('TEST B: A provider winning Best Overall is not disqualified from winning Enterprise Security; category ranking is independent', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'software-engineering',
      strategy: 'enterprise-security',
      requirements: ['editor-code-generation', 'enterprise-governance'],
    };
    const res = AIStackRecommendationEngine.run(req);

    const bestOverallPrimary = res.stacks.bestOverall.primary;
    const bestEnterprisePrimary = res.categories.bestEnterprise.recommendedStack.primary;

    // Both categories should independently identify the legitimate leader (GitHub Copilot for software-engineering + enterprise-governance)
    expect(bestOverallPrimary.toolId).toBe('github-copilot');
    expect(bestEnterprisePrimary.toolId).toBe('github-copilot');
    expect(res.categories.bestEnterprise.recommendedStack.rankTitle).toBe('#1 Recommended Architecture');
  });

  // ── TEST C — DOMAIN DELIVERY SURFACE MISMATCH ──────────────────────────────
  it('TEST C: Non-engineering domain disqualifies IDE-only tools from leading as primary workspace assistant', () => {
    const domains = ['content-communication', 'research-knowledge', 'business-operations', 'general-productivity'];

    for (const domain of domains) {
      const req: StackBuilderRequest = {
        ...baseRequest,
        domain,
        strategy: 'enterprise-security',
        requirements: ['enterprise-governance'],
      };
      const res = AIStackRecommendationEngine.run(req);
      const primary = res.stacks.bestOverall.primary;

      // Primary MUST be a conversational workspace application, never an IDE-only tool
      expect(primary.category).toBe('chat');
      expect(['cursor', 'windsurf', 'github-copilot']).not.toContain(primary.toolId);
    }
  });

  // ── TEST D — HARD CONSTRAINT GATING ────────────────────────────────────────
  it('TEST D: Hard constraints produce eligible = false; candidates failing mandatory requirements cannot win', () => {
    const hardReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'software-engineering',
      strategy: 'balanced',
      requirements: ['editor-code-generation'],
      debug: true,
    };

    const res = AIStackRecommendationEngine.run(hardReq);
    expect(res.trace?.candidateAudit).toBeDefined();

    // Tools with category 'chat' and no in-editor integration must fail the delivery surface or capability gate
    const chatCandidate = res.trace?.candidateAudit?.find((c) => c.providerId === 'claude');
    if (chatCandidate) {
      // Claude is a chat product with no native IDE autocomplete (autocomplete: 1, ideIntegration: 3)
      // When editor-code-generation (requires ideIntegration >= 5) is mandatory:
      expect(chatCandidate.eligible).toBe(false);
      expect(chatCandidate.disqualificationReasons.length).toBeGreaterThan(0);
    }

    // The winning primary MUST be eligible
    const primaryCandidate = res.trace?.candidateAudit?.find((c) => c.providerId === res.stacks.bestOverall.primary.toolId);
    expect(primaryCandidate).toBeDefined();
    expect(primaryCandidate!.eligible).toBe(true);
  });

  // ── TEST E — BEST VALUE AUDIT ──────────────────────────────────────────────
  it('TEST E: Best Value is calculated from audit fit relative to cost and requirement fulfillment, not hardcoded', () => {
    const lowBudgetReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'best-value',
      monthlyBudget: 200,
      teamSize: 10,
      requirements: [],
    };
    const resLow = AIStackRecommendationEngine.run(lowBudgetReq);
    const bestValueStack = resLow.categories.bestValue.recommendedStack;

    // Must be within budget: $200 / 10 seats = $20/seat/mo max
    expect(bestValueStack.perSeatMonthlyCost).toBeLessThanOrEqual(20);
    expect(bestValueStack.estimatedMonthlyCost).toBeLessThanOrEqual(200);

    // Best Value must be cheaper than or equal to Max Performance
    const maxPerfStack = resLow.categories.bestPerformance.recommendedStack;
    expect(bestValueStack.estimatedMonthlyCost).toBeLessThanOrEqual(maxPerfStack.estimatedMonthlyCost);
  });

  // ── TEST F — EXPLANATION CONSISTENCY & TRUTHFULNESS ─────────────────────────
  it('TEST F: All explanations, 7-factor breakdowns, and advantages correspond strictly to the selected candidate', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'balanced',
      requirements: ['enterprise-governance'],
      debug: true,
    };
    const res = AIStackRecommendationEngine.run(req);
    const bestOverall = res.stacks.bestOverall;

    // Explanations refer to the actual primary tool
    expect(bestOverall.primary.whyRecommended).toContain(bestOverall.primary.toolName);
    expect(bestOverall.whyThisStack).toContain(bestOverall.primary.toolName);

    // Confidence breakdown is populated deterministically
    expect(bestOverall.confidenceBreakdown.workflowMatch).toBeGreaterThan(0);
    expect(bestOverall.confidenceBreakdown.securityMatch).toBeGreaterThan(0);
    expect(bestOverall.confidenceScore).toBeGreaterThan(0);

    // Alternative cards must not make unearned superlative claims if the leader was already selected
    for (const alt of res.categories.bestOverall.alternativeComparisons) {
      if (alt.architectureType === 'enterprise-governance') {
        const altScore = KnowledgeScoringEngine.getScored(alt.stack.primary.toolId);
        expect(altScore?.securityScore).toBeGreaterThanOrEqual(70);
      }
    }
  });

  // ── MATHEMATICAL SCORE SYNCHRONIZATION TESTS ───────────────────────────────

  it('TEST 1: Score Consistency — overallScore equals confidenceScore and confidenceBreakdown.overall', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'ai-data-ml',
      strategy: 'balanced',
      requirements: ['large-document-processing', 'visual-diagram-understanding'],
      debug: true,
    };
    const res = AIStackRecommendationEngine.run(req);
    const stack = res.stacks.bestOverall;

    expect(stack.confidenceScore).toBe(stack.confidenceBreakdown.overall);
    expect(stack.confidenceScore).toBeGreaterThan(0);
  });

  it('TEST 2: Seven Factor Consistency — displayed factors match underlying stack audit dimensions', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'ai-data-ml',
      strategy: 'balanced',
      requirements: ['large-document-processing'],
    };
    const res = AIStackRecommendationEngine.run(req);
    const stack = res.stacks.bestOverall;
    const bd = stack.confidenceBreakdown;

    expect(bd.workflowMatch).toBe(stack.workflowFitScore);
    expect(bd.featureCoverage).toBe(stack.coverageResult.coverageScore);
    expect(bd.capabilitySuperiority).toBe(stack.capabilityCoverageScore);
  });

  it('TEST 3: Security Consistency — securityMatch is the true audited security score, never fabricated 100%', () => {
    const reqNoGov: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'balanced',
      requirements: [], // No governance box checked
    };
    const res = AIStackRecommendationEngine.run(reqNoGov);
    const stack = res.stacks.bestOverall;
    const bd = stack.confidenceBreakdown;

    const allScores = KnowledgeScoringEngine.scoreAll();
    const stackToolIds = stack.tools.map(t => t.toolId);
    const stackProfiles = allScores.filter(p => stackToolIds.includes(p.id));
    const stackAvg = Math.round(stackProfiles.reduce((sum, p) => sum + p.securityScore, 0) / stackProfiles.length);

    // securityMatch must reflect the actual audited security score of the active stack, never hardcoded 100
    expect(bd.securityMatch).toBe(stackAvg);
    expect(bd.securityMatch).toBeLessThan(100);
  });

  it('TEST 4: Weighted Score Proof — overallScore is mathematically proven to equal Σ(factor_i * weight_i)', () => {
    const strategies = ['balanced', 'best-value', 'max-performance', 'enterprise-security'] as const;

    for (const strategy of strategies) {
      const req: StackBuilderRequest = {
        ...baseRequest,
        domain: 'ai-data-ml',
        strategy,
        requirements: ['large-document-processing', 'visual-diagram-understanding'],
      };
      const res = AIStackRecommendationEngine.run(req);
      const stack = res.stacks.bestOverall;
      const bd = stack.confidenceBreakdown;
      const weights = AIStackRecommendationEngine.getStrategyAuditWeights(strategy, req);

      const expectedWeightedSum = Math.min(100, Math.max(0, Math.round(
        bd.workflowMatch * weights.workflowMatch +
        bd.featureCoverage * weights.featureCoverage +
        bd.budgetFit * weights.budgetFit +
        bd.capabilitySuperiority * weights.capabilitySuperiority +
        bd.securityMatch * weights.securityMatch +
        bd.vendorStability * weights.vendorStability +
        bd.futureGrowth * weights.futureGrowth
      )));

      // Proven: The overall score displayed in the card header is 100% equal to the weighted sum of the 7 factors!
      expect(stack.confidenceScore).toBe(expectedWeightedSum);
      expect(bd.overall).toBe(expectedWeightedSum);
    }
  });

  it('TEST 5: Explanation Consistency — generated explanation uses identical primary tool and alignment score', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'content-communication',
      strategy: 'balanced',
      requirements: [],
    };
    const res = AIStackRecommendationEngine.run(req);
    const stack = res.stacks.bestOverall;

    expect(stack.whyThisStack).toContain(stack.primary.toolName);
    expect(stack.primary.whyRecommended).toContain(stack.primary.toolName);
  });

  it('TEST 6: Different Objectives — each objective calculates distinct, traceable audit outcomes', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'software-engineering',
      strategy: 'balanced',
      requirements: ['editor-code-generation'],
    };
    const res = AIStackRecommendationEngine.run(req);

    const bestOverall = res.categories.bestOverall.recommendedStack;
    const bestValue = res.categories.bestValue.recommendedStack;
    const bestPerf = res.categories.bestPerformance.recommendedStack;
    const bestEnt = res.categories.bestEnterprise.recommendedStack;

    // All 4 categories produce valid, mathematically sound structured stacks
    expect(bestOverall.confidenceScore).toBeGreaterThan(0);
    expect(bestValue.confidenceScore).toBeGreaterThan(0);
    expect(bestPerf.confidenceScore).toBeGreaterThan(0);
    expect(bestEnt.confidenceScore).toBeGreaterThan(0);

    // Best value cost is less than or equal to performance cost
    expect(bestValue.estimatedMonthlyCost).toBeLessThanOrEqual(bestPerf.estimatedMonthlyCost);
  });

  // ── MANDATORY GOVERNANCE AUDIT INTEGRITY TESTS ─────────────────────────────

  it('TEST GOV 1: Mandatory governance missing under low budget ceiling triggers explicit budgetConstraint', () => {
    const tightGovReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'enterprise-security',
      requirements: ['enterprise-governance', 'live-web-research'],
      monthlyBudget: 25, // $25 total for 10 seats = $2.50/seat, cannot buy Team/Org plans ($20-$30/seat)
      teamSize: 10,
    };
    const res = AIStackRecommendationEngine.run(tightGovReq);
    const stack = res.categories.bestEnterprise.recommendedStack;

    // Must report governance as missing and attach budgetConstraint
    expect(stack.coverageResult.missing).toContain('enterprise-governance');
    expect(stack.budgetConstraint).toBeDefined();
    expect(stack.budgetConstraint?.reason).toBe('budget-blocks-full-coverage');
  });

  it('TEST GOV 2: Mandatory governance satisfied when budget allows entitling tier', () => {
    const ampleGovReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'enterprise-security',
      requirements: ['enterprise-governance', 'live-web-research'],
      monthlyBudget: 500, // $500 for 10 seats = $50/seat, easily affords Team/Org plans
      teamSize: 10,
    };
    const res = AIStackRecommendationEngine.run(ampleGovReq);
    const stack = res.categories.bestEnterprise.recommendedStack;

    // Must satisfy enterprise governance
    expect(stack.coverageResult.covered.some(c => c.featureKey === 'enterprise-governance')).toBe(true);
    expect(stack.coverageResult.missing).not.toContain('enterprise-governance');
    expect(stack.coverageResult.coverageScore).toBe(100);
  });

  it('TEST GOV 3: High security score does not override missing mandatory governance requirement', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'enterprise-security',
      requirements: ['enterprise-governance'],
      monthlyBudget: 30, // $30 for 10 seats = $3/seat
      teamSize: 10,
    };
    const res = AIStackRecommendationEngine.run(req);
    const stack = res.categories.bestEnterprise.recommendedStack;

    // Even if tools in stack have 75+ securityScore, coverageResult must reflect entitlement failure
    expect(stack.confidenceBreakdown.securityMatch).toBeGreaterThanOrEqual(70);
    expect(stack.coverageResult.missing).toContain('enterprise-governance');
    expect(stack.coverageResult.coverageScore).toBe(0);
  });

  it('TEST GOV 4: Multiple providers in consumer tiers collectively leave governance MISSING', () => {
    const req: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'balanced',
      requirements: ['deep-reasoning-analysis', 'large-document-processing', 'enterprise-governance'],
      monthlyBudget: 50, // $50 for 5 seats = $10/seat
      teamSize: 5,
    };
    const res = AIStackRecommendationEngine.run(req);
    const stack = res.stacks.bestOverall;

    // Both tools on consumer plans ($5/seat + $5/seat = $50 total) cannot claim enterprise governance
    expect(stack.coverageResult.missing).toContain('enterprise-governance');
  });

  it('TEST GOV 5: Entitlement repair automatically upgrades plan when stack budget allows', () => {
    const repairReq: StackBuilderRequest = {
      ...baseRequest,
      domain: 'general-productivity',
      strategy: 'enterprise-security',
      requirements: ['enterprise-governance', 'live-web-research'],
      monthlyBudget: 300, // $300 for 10 seats = $30/seat
      teamSize: 10,
    };
    const res = AIStackRecommendationEngine.run(repairReq);
    const stack = res.categories.bestEnterprise.recommendedStack;

    // Primary or companion must be upgraded to an organizational tier (e.g. Team, Business)
    const hasOrgPlan = stack.tools.some(t =>
      ['Team', 'Business', 'Enterprise', 'Org', 'Plus'].some(term => t.recommendedPlan.includes(term))
    );
    expect(hasOrgPlan).toBe(true);
    expect(stack.coverageResult.covered.some(c => c.featureKey === 'enterprise-governance')).toBe(true);
  });
});
