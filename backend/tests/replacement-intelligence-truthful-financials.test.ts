import { describe, it, expect, beforeAll } from 'vitest';
import { KnowledgeLoader } from '../src/audit-engine/services/KnowledgeLoader';
import { AIStackIntelligenceService } from '../src/audit-engine/services/AIStackIntelligenceService';
import type { ToolEntry } from '../src/types';

describe('Truthful Financials & Decision Intelligence in AI Replacements', () => {
  beforeAll(() => {
    KnowledgeLoader.initialize();
  });

  it('1. Gemini ($4.99) replacements calculate actual target tool costs and signed netCostDelta', () => {
    const tools: ToolEntry[] = [
      {
        toolId: 'gemini',
        plan: 'Google AI Plus',
        monthlySpend: 4.99,
        seats: 1,
        useCase: 'mixed',
      },
    ];

    const replacements = AIStackIntelligenceService.analyzeReplacements(tools, 'mixed');
    expect(replacements.length).toBeGreaterThan(0);

    const opp = replacements[0];
    expect(opp).toBeDefined();

    // Projected replacement cost must be the actual target tool cost, NOT capped at current spend ($4.99)!
    expect(opp.replacementMonthlyCost).toBeGreaterThanOrEqual(4.99);
    expect(opp.decisionReport.projectedMonthlyCost).toBe(opp.replacementMonthlyCost);

    // netCostDelta is targetMonthlyCost - currentSpend
    expect(opp.netCostDelta).toBeCloseTo(opp.replacementMonthlyCost - 4.99, 2);

    // Decision report contains per-seat breakdown
    expect(opp.decisionReport.perSeatBreakdown).toBeDefined();
    expect(opp.decisionReport.perSeatBreakdown.seats).toBe(1);
    expect(opp.decisionReport.financialExplanation).toBeDefined();
  });

  it('2. IDE replacements calculate actual pricing and accurate cost delta', () => {
    const tools: ToolEntry[] = [
      {
        toolId: 'cursor',
        plan: 'Pro',
        monthlySpend: 20,
        seats: 1,
        useCase: 'coding',
      },
    ];

    const replacements = AIStackIntelligenceService.analyzeReplacements(tools, 'coding');
    expect(replacements.length).toBeGreaterThan(0);

    const opp = replacements[0];
    expect(opp.replacementMonthlyCost).toBeGreaterThan(0);
    expect(opp.decisionReport.projectedMonthlyCost).toBe(opp.replacementMonthlyCost);
    expect(opp.netCostDelta).toBeCloseTo(opp.replacementMonthlyCost - 20, 2);
    expect(opp.decisionReport.financialExplanation).toBeDefined();
  });

  it('3. Multi-seat scaling (10 seats) scales cost deltas proportionally', () => {
    const tools: ToolEntry[] = [
      {
        toolId: 'gemini',
        plan: 'Google AI Plus',
        monthlySpend: 49.90,
        seats: 10,
        useCase: 'mixed',
      },
    ];

    const replacements = AIStackIntelligenceService.analyzeReplacements(tools, 'mixed');
    const opp = replacements[0];
    expect(opp).toBeDefined();

    expect(opp.decisionReport.perSeatBreakdown.seats).toBe(10);
    expect(opp.decisionReport.currentMonthlyCost).toBe(49.90);
    // Cost for 10 seats = pricePerSeat * 10
    expect(opp.replacementMonthlyCost).toBeCloseTo(opp.decisionReport.perSeatBreakdown.replacementCostPerSeat * 10, 2);
    expect(opp.netCostDelta).toBeCloseTo(opp.replacementMonthlyCost - 49.90, 2);
  });

  it('4. Why Not Selected contains truthful score comparison and monthly cost diffs', () => {
    const tools: ToolEntry[] = [
      {
        toolId: 'gemini',
        plan: 'Google AI Plus',
        monthlySpend: 4.99,
        seats: 1,
        useCase: 'coding',
      },
    ];

    const replacements = AIStackIntelligenceService.analyzeReplacements(tools, 'coding');
    const opp = replacements[0];
    expect(opp.decisionReport.whyNotSelected.length).toBeGreaterThan(0);

    const why = opp.decisionReport.whyNotSelected[0];
    expect(why.scoreDifferences.length).toBeGreaterThan(2);
    expect(why.monthlyCostDiff).toBeDefined();
    expect(why.tradeoffSummary).toBeDefined();
  });

  it('5. Feature Matrix contains capability evidence and dynamically formatted context windows', () => {
    const tools: ToolEntry[] = [
      {
        toolId: 'gemini',
        plan: 'Google AI Plus',
        monthlySpend: 4.99,
        seats: 1,
        useCase: 'coding',
      },
    ];

    const replacements = AIStackIntelligenceService.analyzeReplacements(tools, 'coding');
    const matrix = replacements[0].decisionReport.featureMatrix;
    expect(matrix.length).toBeGreaterThan(5);

    const contextRow = matrix.find((r) => r.featureKey === 'longContext');
    expect(contextRow).toBeDefined();
    expect(contextRow!.note).toBeDefined();
  });
});
