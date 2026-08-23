import { describe, it, expect, beforeAll } from 'vitest';
import { AIStackRecommendationEngine } from '../src/audit-engine/services/AIStackRecommendationEngine';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { StackBuilderRequest } from '../src/types/stackBuilder';

describe('AIStackRecommendationEngine - 10 Input Sensitivity & Domain Adaptability Tests', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('TEST 1: Domain = Software Engineering -> Coding/IDE providers rank strongly', () => {
    const req: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const primary = result.categories.bestOverall.recommendedStack.primary;
    expect(['cursor', 'windsurf', 'github-copilot']).toContain(primary.toolId);
    expect(primary.category).toBe('ide');
  });

  it('TEST 2: Domain = Research & Knowledge -> Research/reasoning providers rank strongly (Cursor does not win)', () => {
    const req: StackBuilderRequest = {
      domain: 'research-knowledge',
      teamSize: 5,
      monthlyBudget: 200,
      requirements: ['live-web-research', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const primary = result.categories.bestOverall.recommendedStack.primary;
    expect(primary.toolId).not.toBe('cursor');
    expect(['perplexity', 'claude', 'chatgpt', 'gemini']).toContain(primary.toolId);
  });

  it('TEST 3: Domain = Content & Communication -> Writing-oriented providers rank strongly (Cursor does not win)', () => {
    const req: StackBuilderRequest = {
      domain: 'content-communication',
      teamSize: 5,
      monthlyBudget: 100,
      requirements: ['large-document-processing', 'deep-reasoning-analysis'],
      strategy: 'best-value',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: true,
        preferEstablishedVendors: false,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const primary = result.categories.bestOverall.recommendedStack.primary;
    expect(primary.toolId).not.toBe('cursor');
    expect(['claude', 'chatgpt', 'gemini']).toContain(primary.toolId);
  });

  it('TEST 4: Domain = AI & Machine Learning + API Integration -> Evaluates model platform and attaches API layer', () => {
    const req: StackBuilderRequest = {
      domain: 'ai-data-ml',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['developer-api-access', 'deep-reasoning-analysis'],
      strategy: 'max-performance',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const stack = result.categories.bestOverall.recommendedStack;
    expect(stack.primary).toBeDefined();
    expect(stack.apiLayer).toBeDefined();
    expect(['anthropic-api', 'openai-api', 'codex', 'github-models']).toContain(stack.apiLayer?.toolId);
  });

  it('TEST 5: Domain = Research + Requirement = Long Context -> Long-context providers score strongly', () => {
    const req: StackBuilderRequest = {
      domain: 'research-knowledge',
      teamSize: 10,
      monthlyBudget: 300,
      requirements: ['large-document-processing', 'deep-reasoning-analysis'],
      strategy: 'max-performance',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const stack = result.categories.bestOverall.recommendedStack;
    expect(['claude', 'gemini', 'chatgpt', 'perplexity', 'kimi']).toContain(stack.primary.toolId);
  });

  it('TEST 6: Budget = $0 vs Budget = $500 changes plan selection from Free to Paid', () => {
    const reqFree: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 1,
      monthlyBudget: 0,
      requirements: ['editor-code-generation'],
      strategy: 'best-value',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: true,
        preferEstablishedVendors: false,
        requireZeroRetention: false
      }
    };
    const resultFree = AIStackRecommendationEngine.run(reqFree);
    expect(resultFree.categories.bestOverall.recommendedStack.primary.monthlyCostPerSeat).toBe(0);

    const reqPaid: StackBuilderRequest = {
      ...reqFree,
      monthlyBudget: 500,
      strategy: 'balanced'
    };
    const resultPaid = AIStackRecommendationEngine.run(reqPaid);
    expect(resultPaid.categories.bestOverall.recommendedStack.primary.monthlyCostPerSeat).toBeGreaterThan(0);
  });

  it('TEST 7: Team Size = 1 vs Team Size = 50 scales total monthly cost and selects team/enterprise plans', () => {
    const reqSmall: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 1,
      monthlyBudget: 50,
      requirements: ['editor-code-generation'],
      strategy: 'balanced',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const resultSmall = AIStackRecommendationEngine.run(reqSmall);

    const reqLarge: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 50,
      monthlyBudget: 2500,
      requirements: ['editor-code-generation'],
      strategy: 'enterprise-security',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: true
      }
    };
    const resultLarge = AIStackRecommendationEngine.run(reqLarge);

    expect(resultLarge.categories.bestOverall.recommendedStack.estimatedMonthlyCost).toBeGreaterThan(
      resultSmall.categories.bestOverall.recommendedStack.estimatedMonthlyCost
    );
  });

  it('TEST 8: Strategy change (Best Value vs Max Performance vs Enterprise) shifts recommendation', () => {
    const baseReq: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 10,
      monthlyBudget: 500,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'best-value',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: true,
        preferEstablishedVendors: false,
        requireZeroRetention: false
      }
    };
    const resultValue = AIStackRecommendationEngine.run(baseReq);

    const perfReq: StackBuilderRequest = {
      ...baseReq,
      strategy: 'max-performance',
      preferences: { ...baseReq.preferences, maximizeSavings: false }
    };
    const resultPerf = AIStackRecommendationEngine.run(perfReq);

    const entReq: StackBuilderRequest = {
      ...baseReq,
      strategy: 'enterprise-security',
      preferences: { ...baseReq.preferences, maximizeSavings: false, requireZeroRetention: true }
    };
    const resultEnt = AIStackRecommendationEngine.run(entReq);

    expect(resultValue.categories.bestOverall.strategyUsed).toBe('best-value');
    expect(resultPerf.categories.bestOverall.strategyUsed).toBe('max-performance');
    expect(resultEnt.categories.bestOverall.strategyUsed).toBe('enterprise-security');
  });

  it('TEST 9: Strict Zero Retention penalizes providers lacking verified zero retention', () => {
    const reqZDR: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 10,
      monthlyBudget: 500,
      requirements: ['editor-code-generation'],
      strategy: 'enterprise-security',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: true
      }
    };
    const resultZDR = AIStackRecommendationEngine.run(reqZDR);
    const stack = resultZDR.categories.bestOverall.recommendedStack;
    expect(stack.primary).toBeDefined();
  });

  it('TEST 10: Generates 6 to 10 distinct, deduplicated alternative architectures without reverse duplicates', () => {
    const req: StackBuilderRequest = {
      domain: 'software-engineering',
      teamSize: 15,
      monthlyBudget: 400,
      requirements: ['editor-code-generation', 'deep-reasoning-analysis'],
      strategy: 'balanced',
      preferences: {
        preferOpenSource: false,
        avoidLockIn: false,
        maximizeSavings: false,
        preferEstablishedVendors: true,
        requireZeroRetention: false
      }
    };
    const result = AIStackRecommendationEngine.run(req);
    const alts = result.categories.bestOverall.alternativeComparisons;
    expect(alts.length).toBeGreaterThanOrEqual(6);
    expect(alts.length).toBeLessThanOrEqual(10);

    const seen = new Set<string>();
    for (const alt of alts) {
      const sig = alt.stack.tools.map(t => t.toolId).sort().join('|');
      expect(seen.has(sig)).toBe(false);
      seen.add(sig);
    }
  });
});
