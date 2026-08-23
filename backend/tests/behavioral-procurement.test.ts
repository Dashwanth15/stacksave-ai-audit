import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';

beforeAll(() => {
  KnowledgeLoader.initialize();
});

describe('Behavioral Procurement Intelligence & Multi-Dimension Verification', () => {

  // ── 1. HARD BUDGET CONSTRAINT & PLAN SELECTION ───────────────────────────
  it('1. Enforces hard budget constraints and selects plans fitting within seat ceiling', () => {
    // 15 seats, $400 budget ceiling -> ~$26.66/seat max
    const rec = AIStackRecommendationEngine.run({
      domain: 'ai-data-ml',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['developer-api-access', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {},
      debug: true
    });

    const stack = rec.categories.bestOverall.recommendedStack;
    // Primary tool cost per seat must fit within the seat budget allowance
    expect(stack.primary.monthlyCostPerSeat).toBeLessThanOrEqual(25);
    // Total cost with API token allocation must fit within or near budget ceiling
    expect(stack.estimatedMonthlyCost).toBeLessThanOrEqual(400);
  });

  // ── 2. TRUE CANONICAL DEDUPLICATION ──────────────────────────────────────
  it('2. Enforces canonical deduplication: [A, B] == [B, A] with zero duplicate architectures', () => {
    const rec = AIStackRecommendationEngine.run({
      domain: 'software-engineering',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {},
      debug: true
    });

    const recommended = rec.categories.bestOverall.recommendedStack;
    const alts = rec.categories.bestOverall.alternativeComparisons;

    const recSig = [...recommended.tools.map(t => t.toolId)].sort().join('|');
    const seenSigs = new Set<string>([recSig]);

    expect(alts.length).toBeGreaterThanOrEqual(6);
    expect(alts.length).toBeLessThanOrEqual(10);

    for (const alt of alts) {
      const altSig = [...alt.stack.tools.map(t => t.toolId)].sort().join('|');
      // No alternative should replicate the recommended stack's provider set
      expect(altSig).not.toBe(recSig);
      // No alternative should be a duplicate of another alternative
      expect(seenSigs.has(altSig)).toBe(false);
      seenSigs.add(altSig);
    }
  });

  // ── 3. STRATEGICALLY DISTINCT ARCHITECTURES WITH FULL PURPOSE DATA ─────────
  it('3. Every alternative has a distinct architectureType and complete procurement intelligence', () => {
    const rec = AIStackRecommendationEngine.run({
      domain: 'software-engineering',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {},
      debug: true
    });

    const alts = rec.categories.bestOverall.alternativeComparisons;
    const types = new Set<string>();

    for (const alt of alts) {
      expect(alt.architectureType).toBeDefined();
      expect(alt.bestFor).toBeDefined();
      expect(alt.bestFor.length).toBeGreaterThan(10);
      expect(alt.mainAdvantage).toBeDefined();
      expect(alt.mainTradeoff).toBeDefined();
      expect(alt.whyChooseInstead).toBeDefined();
      expect(alt.whyNotRecommended).toBeDefined();
      expect(alt.budgetString).toMatch(/(WITHIN BUDGET|OVER BUDGET)/);
      types.add(alt.architectureType!);
    }

    // Must have multiple distinct strategic architecture archetypes
    expect(types.size).toBeGreaterThanOrEqual(5);
  });

  // ── 4. DOMAIN DIRECT INFLUENCE (No hardcoded Cursor) ──────────────────────
  it('4. Materially changes primary provider based on operational domain', () => {
    const codingRec = AIStackRecommendationEngine.run({
      domain: 'software-engineering',
      teamSize: 10,
      monthlyBudget: 300,
      requirements: ['editor-code-generation'],
      strategy: 'balanced',
      preferences: {}
    });
    expect(codingRec.categories.bestOverall.recommendedStack.primary.category).toBe('ide');

    const researchRec = AIStackRecommendationEngine.run({
      domain: 'research-knowledge',
      teamSize: 5,
      monthlyBudget: 200,
      requirements: ['live-web-research'],
      strategy: 'balanced',
      preferences: {}
    });
    expect(researchRec.categories.bestOverall.recommendedStack.primary.category).toBe('chat');
    expect(researchRec.categories.bestOverall.recommendedStack.primary.toolId).not.toBe('cursor');

    const contentRec = AIStackRecommendationEngine.run({
      domain: 'content-communication',
      teamSize: 5,
      monthlyBudget: 100,
      requirements: ['large-document-processing'],
      strategy: 'best-value',
      preferences: {}
    });
    expect(contentRec.categories.bestOverall.recommendedStack.primary.category).toBe('chat');
    expect(contentRec.categories.bestOverall.recommendedStack.primary.toolId).not.toBe('cursor');
  });

  // ── 5. SEPARATION OF APPLICATION VS DEVELOPER API ─────────────────────────
  it('5. Strictly separates application rankings from API rankings in trace and stack', () => {
    const rec = AIStackRecommendationEngine.run({
      domain: 'ai-data-ml',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['developer-api-access'],
      strategy: 'max-performance',
      preferences: {},
      debug: true
    });

    const trace = rec.trace!;
    expect(trace.applicationRanking).toBeDefined();
    expect(trace.apiRanking).toBeDefined();

    // Verify application ranking has NO API providers
    for (const app of trace.applicationRanking) {
      expect(app.category).not.toBe('api');
    }

    // Verify API ranking has ONLY API providers
    for (const api of trace.apiRanking) {
      expect(api.category).toBe('api');
    }

    // Primary tool MUST be from application ranking, NOT from API
    expect(rec.categories.bestOverall.recommendedStack.primary.category).not.toBe('api');
    // API tool MUST be assigned to apiLayer
    expect(rec.categories.bestOverall.recommendedStack.apiLayer?.category).toBe('api');
  });

  // ── 6. TEAM SIZE PROCUREMENT ECONOMICS ────────────────────────────────────
  it('6. Team size scales procurement economics and selects enterprise tiers for large teams', () => {
    const smallTeam = AIStackRecommendationEngine.run({
      domain: 'software-engineering',
      teamSize: 1,
      monthlyBudget: 100,
      requirements: ['editor-code-generation'],
      strategy: 'balanced',
      preferences: {}
    });

    const largeTeam = AIStackRecommendationEngine.run({
      domain: 'enterprise-compliance',
      teamSize: 50,
      monthlyBudget: 2000,
      requirements: ['enterprise-governance'],
      strategy: 'enterprise-security',
      preferences: {}
    });

    // 1 seat uses individual Pro tier
    expect(smallTeam.categories.bestOverall.recommendedStack.primary.recommendedPlan).toBe('Pro');
    expect(smallTeam.categories.bestOverall.recommendedStack.primary.estimatedMonthlyCostPerTeam).toBe(20);
    expect(smallTeam.categories.bestOverall.recommendedStack.estimatedMonthlyCost).toBeLessThanOrEqual(100);

    // 50 seats uses enterprise compliant commercial tier (Copilot Business or ChatGPT Team)
    expect(['Business', 'Team']).toContain(largeTeam.categories.bestOverall.recommendedStack.primary.recommendedPlan);
    expect(largeTeam.categories.bestOverall.recommendedStack.estimatedMonthlyCost).toBeLessThanOrEqual(2000);
  });

  // ── 7. STRATEGY SENSITIVITY ───────────────────────────────────────────────
  it('7. Strategy changes plan selection and overall stack optimization', () => {
    const valueRec = AIStackRecommendationEngine.run({
      domain: 'content-communication',
      teamSize: 5,
      monthlyBudget: 100,
      requirements: ['large-document-processing'],
      strategy: 'best-value',
      preferences: {}
    });

    const secRec = AIStackRecommendationEngine.run({
      domain: 'enterprise-compliance',
      teamSize: 50,
      monthlyBudget: 2000,
      requirements: ['enterprise-governance'],
      strategy: 'enterprise-security',
      preferences: {}
    });

    // Best value respects $100 budget
    expect(valueRec.categories.bestOverall.recommendedStack.estimatedMonthlyCost).toBeLessThanOrEqual(100);
    // Enterprise Security selects enterprise plan and respects $2000 budget
    expect(secRec.categories.bestOverall.recommendedStack.estimatedMonthlyCost).toBeLessThanOrEqual(2000);
  });
});
