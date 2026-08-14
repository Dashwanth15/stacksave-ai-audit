// ============================================================
// Version-Aware Audit & Stack Intelligence Integration Tests
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { StackProfileBuilder } from '../src/audit-engine/services/StackProfileBuilder';
import { OptimizationStrategyEngine } from '../src/audit-engine/services/OptimizationStrategyEngine';
import { AIStackIntelligenceService } from '../src/audit-engine/services/AIStackIntelligenceService';
import { runAudit } from '../src/audit-engine/engine';
import type { ToolEntry } from '../src/types';

describe('Version-Aware AI Stack Selection & Audit System', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('1. Loads provider models correctly from knowledge repository', () => {
    const claudeModels = KnowledgeLoader.loadModels('claude');
    expect(claudeModels.length).toBeGreaterThanOrEqual(3);

    const sonnet = claudeModels.find(m => m.modelId === 'claude-3-5-sonnet');
    const haiku = claudeModels.find(m => m.modelId === 'claude-3-5-haiku');
    const opus = claudeModels.find(m => m.modelId === 'claude-3-opus');

    expect(sonnet).toBeDefined();
    expect(haiku).toBeDefined();
    expect(opus).toBeDefined();
  });

  it('2. Synthesizes model-specific ProviderProfile based on selected modelId', () => {
    const sonnetProfile = KnowledgeLoader.getProvider('claude', 'claude-3-5-sonnet');
    const haikuProfile = KnowledgeLoader.getProvider('claude', 'claude-3-5-haiku');

    expect(sonnetProfile).not.toBeNull();
    expect(haikuProfile).not.toBeNull();

    // Haiku reasoning/coding scores differ from Sonnet in knowledge JSONs
    expect(sonnetProfile!.name).toBe('Claude');
    expect(haikuProfile!.name).toBe('Claude');
    expect(sonnetProfile!.capabilities.reasoning.score).toBeGreaterThanOrEqual(haikuProfile!.capabilities.reasoning.score);
  });

  it('3. StackProfileBuilder integrates selected modelId into aggregated stack profile', () => {
    const haikuStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 10, monthlySpend: 200, useCase: 'coding', modelId: 'claude-3-5-haiku', versionName: 'Claude 3.5 Haiku' }
    ];

    const sonnetStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 10, monthlySpend: 200, useCase: 'coding', modelId: 'claude-3-5-sonnet', versionName: 'Claude 3.5 Sonnet' }
    ];

    const profileHaiku = StackProfileBuilder.build(haikuStack, 10, 'coding');
    const profileSonnet = StackProfileBuilder.build(sonnetStack, 10, 'coding');

    expect(profileHaiku.profiles[0]).toBeDefined();
    expect(profileSonnet.profiles[0]).toBeDefined();
    expect(profileSonnet.capabilityCoverage.reasoning).toBeGreaterThanOrEqual(profileHaiku.capabilityCoverage.reasoning);
  });

  it('4. OptimizationStrategyEngine emits Version Shift Optimization when lower version is selected', () => {
    const lowerVersionStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 5, monthlySpend: 100, useCase: 'coding', modelId: 'claude-3-5-haiku', versionName: 'Claude 3.5 Haiku' }
    ];

    const insights = OptimizationStrategyEngine.run(lowerVersionStack, 5, 'coding', 'balanced');
    const versionShiftInsight = insights.find(i => i.recommendationType === 'Version Optimization');

    expect(versionShiftInsight).toBeDefined();
    expect(versionShiftInsight?.message).toContain('Switch from Claude 3.5 Haiku to Claude 3.5 Sonnet');
  });

  it('5. Backward compatibility: Audit with no modelId defaults cleanly without breaking', () => {
    const legacyStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 5, monthlySpend: 100, useCase: 'coding' }
    ];

    const profile = StackProfileBuilder.build(legacyStack, 5, 'coding');
    expect(profile.profiles[0]).toBeDefined();
    expect(profile.profiles[0].name).toBe('Claude');

    const insights = OptimizationStrategyEngine.run(legacyStack, 5, 'coding');
    expect(insights).toBeDefined();
    expect(insights.length).toBeGreaterThan(0);
  });

  it('6. Loads Kimi membership plans (Moderato, Allegretto, Allegro, Vivace) correctly', () => {
    const kimiPlans = KnowledgeLoader.loadPlans('kimi');
    expect(kimiPlans.length).toBeGreaterThanOrEqual(4);

    const moderato = kimiPlans.find(p => p.id === 'moderato');
    const allegretto = kimiPlans.find(p => p.id === 'allegretto');
    const allegro = kimiPlans.find(p => p.id === 'allegro');
    const vivace = kimiPlans.find(p => p.id === 'vivace');

    expect(moderato?.monthlyPricePerSeat).toBe(15);
    expect(allegretto?.monthlyPricePerSeat).toBe(31);
    expect(allegro?.monthlyPricePerSeat).toBe(79);
    expect(vivace?.monthlyPricePerSeat).toBe(159);

    const kimiStack: ToolEntry[] = [
      { toolId: 'kimi', plan: 'allegretto', seats: 5, monthlySpend: 155, useCase: 'coding' }
    ];

    const profile = StackProfileBuilder.build(kimiStack, 5, 'coding');
    expect(profile.totalMonthlySpend).toBe(155);
  });

  it('7. Kimi plan selection dynamically changes audit recommendations and financial calculations', () => {
    // Vivace plan selected ($159/mo) for 1 seat with coding use case
    const vivaceStack: ToolEntry[] = [
      { toolId: 'kimi', plan: 'vivace', seats: 1, monthlySpend: 159, useCase: 'coding' }
    ];

    const vivaceInsights = OptimizationStrategyEngine.run(vivaceStack, 1, 'coding', 'savings');
    const vivaceDowngrade = vivaceInsights.find(i => i.toolId === 'kimi' && i.type === 'overpaid_plan');

    // Should recommend downgrade to Moderato to save money
    expect(vivaceDowngrade).toBeDefined();
    expect(vivaceDowngrade?.suggestion).toContain('Downgrade to Kimi Moderato');
    expect(vivaceDowngrade?.potentialMonthlySaving).toBe(144); // $159 - $15 = $144/mo saving

    // Moderato plan selected ($15/mo) for 1 seat with coding use case
    const moderatoStack: ToolEntry[] = [
      { toolId: 'kimi', plan: 'moderato', seats: 1, monthlySpend: 15, useCase: 'coding' }
    ];

    const moderatoInsights = OptimizationStrategyEngine.run(moderatoStack, 1, 'coding', 'balanced');
    const moderatoOptimal = moderatoInsights.find(i => i.toolId === 'kimi' && (i.type === 'already_optimal' || i.recommendationType === 'Validation'));

    // Should verify Moderato as optimal plan
    expect(moderatoOptimal).toBeDefined();
    expect(moderatoInsights.some(i => i.suggestion.includes('Downgrade'))).toBe(false);
  });

  it('8. Claude plan selection dynamically drives plan tier optimization', () => {
    // Claude Max ($100/mo) for 1 seat with coding usecase -> should suggest downgrade to Pro ($20)
    const maxStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'max', seats: 1, monthlySpend: 100, useCase: 'coding' }
    ];
    const maxInsights = OptimizationStrategyEngine.run(maxStack, 1, 'coding', 'savings');
    const maxDowngrade = maxInsights.find(i => i.toolId === 'claude' && i.type === 'overpaid_plan');
    expect(maxDowngrade).toBeDefined();
    expect(maxDowngrade?.suggestion).toContain('Downgrade to Claude Pro');

    // Claude Pro ($20/mo) for 1 seat -> should be verified cleanly
    const proStack: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'coding' }
    ];
    const proProfile = StackProfileBuilder.build(proStack, 1, 'coding');
    expect(proProfile.profiles[0].selectedPlan?.id).toBe('pro');
    expect(proProfile.profiles[0].selectedPlan?.monthlyPricePerSeat).toBe(20);
  });

  it('9. ChatGPT plan selection dynamically drives plan tier optimization', () => {
    // ChatGPT Pro ($200/mo) for 1 seat -> should suggest downgrade to Go ($5)
    const proStack: ToolEntry[] = [
      { toolId: 'chatgpt', plan: 'pro', seats: 1, monthlySpend: 200, useCase: 'writing' }
    ];
    const proInsights = OptimizationStrategyEngine.run(proStack, 1, 'writing', 'savings');
    const proDowngrade = proInsights.find(i => i.toolId === 'chatgpt' && i.type === 'overpaid_plan');
    expect(proDowngrade).toBeDefined();
    expect(proDowngrade?.suggestion).toContain('Downgrade to ChatGPT Go');

    // ChatGPT Plus ($20/mo) -> profile selectedPlan resolves to Plus
    const plusStack: ToolEntry[] = [
      { toolId: 'chatgpt', plan: 'plus', seats: 1, monthlySpend: 20, useCase: 'writing' }
    ];
    const plusProfile = StackProfileBuilder.build(plusStack, 1, 'writing');
    expect(plusProfile.profiles[0].selectedPlan?.id).toBe('plus');
    expect(plusProfile.profiles[0].selectedPlan?.monthlyPricePerSeat).toBe(20);
  });

  it('10. Cursor plan selection dynamically drives plan tier optimization', () => {
    // Cursor Ultra ($200/mo) for 1 seat -> should suggest downgrade to Pro ($20)
    const ultraStack: ToolEntry[] = [
      { toolId: 'cursor', plan: 'ultra', seats: 1, monthlySpend: 200, useCase: 'coding' }
    ];
    const ultraInsights = OptimizationStrategyEngine.run(ultraStack, 1, 'coding', 'savings');
    const ultraDowngrade = ultraInsights.find(i => i.toolId === 'cursor' && i.type === 'overpaid_plan');
    expect(ultraDowngrade).toBeDefined();
    expect(ultraDowngrade?.suggestion).toContain('Downgrade to Cursor Pro');

    // Cursor Pro ($20/mo) -> profile selectedPlan resolves to Pro
    const proStack: ToolEntry[] = [
      { toolId: 'cursor', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'coding' }
    ];
    const proProfile = StackProfileBuilder.build(proStack, 1, 'coding');
    expect(proProfile.profiles[0].selectedPlan?.id).toBe('pro');
    expect(proProfile.profiles[0].selectedPlan?.monthlyPricePerSeat).toBe(20);
  });

  it('11. Preserves usage-based API provider behavior without forcing seat subscription logic', () => {
    const apiStack: ToolEntry[] = [
      { toolId: 'anthropic-api', plan: 'pay-as-you-go', seats: 1, monthlySpend: 250, useCase: 'coding' }
    ];
    const apiProfile = StackProfileBuilder.build(apiStack, 1, 'coding');
    expect(apiProfile.profiles[0].category).toBe('api');
    expect(apiProfile.profiles[0].apiSupport).toBe(true);

    const apiInsights = OptimizationStrategyEngine.run(apiStack, 1, 'coding', 'balanced');
    // Usage-based API provider should not produce subscription seat downgrade insights
    expect(apiInsights.some(i => i.type === 'overpaid_plan')).toBe(false);
  });

  it('12. Plan Change Test & Data Integrity: Audit 2 cleanly reflects new stack without stale data from Audit 1', () => {
    // Audit 1 Configuration
    const stack1: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 2, monthlySpend: 40, useCase: 'coding' },
      { toolId: 'cursor', plan: 'pro', seats: 2, monthlySpend: 40, useCase: 'coding' },
      { toolId: 'chatgpt', plan: 'plus', seats: 2, monthlySpend: 40, useCase: 'coding' }
    ];
    const result1 = runAudit({ tools: stack1, teamSize: 2, useCase: 'coding', optimizationGoal: 'balanced' }, '', 'http://localhost:3000');

    expect(result1.totalMonthlySpend).toBe(120);
    expect(result1.tools.map(t => t.plan)).toEqual(['pro', 'pro', 'plus']);
    expect(result1.tools.map(t => t.toolId)).toEqual(['claude', 'cursor', 'chatgpt']);

    // Audit 2 Configuration (Different tools, different plans, different seats, different goal)
    // Use 'writing' use case so Vivace's 1M context & goal mode premium features are NOT justified,
    // and small team (2) so high agent credits are not justified either → expect downgrade insight.
    const stack2: ToolEntry[] = [
      { toolId: 'kimi', plan: 'vivace', seats: 2, monthlySpend: 318, useCase: 'writing' },
      { toolId: 'perplexity', plan: 'pro', seats: 2, monthlySpend: 40, useCase: 'writing' }
    ];
    const result2 = runAudit({ tools: stack2, teamSize: 2, useCase: 'writing', optimizationGoal: 'savings' }, '', 'http://localhost:3000');

    // Verify Audit 2 is 100% clean of Audit 1 data
    expect(result2.totalMonthlySpend).toBe(358);
    expect(result2.teamSize).toBe(2);
    expect(result2.useCase).toBe('writing');
    expect(result2.optimizationGoal).toBe('savings');
    expect(result2.tools.map(t => t.toolId)).toEqual(['kimi', 'perplexity']);
    expect(result2.tools.map(t => t.plan)).toEqual(['vivace', 'pro']);

    // Ensure no insights from Audit 1 exist in Audit 2
    expect(result2.insights.some(i => i.toolId === 'claude' || i.toolId === 'cursor' || i.toolId === 'chatgpt')).toBe(false);

    // Kimi Vivace ($159/seat x 2 = $318) on writing+savings goal with small team
    // should produce a downgrade insight (1M context & goal mode not relevant to writing)
    const vivaceInsight = result2.insights.find(i => i.toolId === 'kimi' && i.type === 'overpaid_plan');
    expect(vivaceInsight).toBeDefined();
    expect(vivaceInsight?.suggestion).toContain('Kimi Moderato');
  });
});
