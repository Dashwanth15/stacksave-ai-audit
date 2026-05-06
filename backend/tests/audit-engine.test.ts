// ============================================================
// Audit Engine Tests — StackSave AI Audit
// Run: cd backend && npm test
//
// These tests verify the deterministic audit logic.
// Each rule is tested independently with controlled inputs.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  ruleOverpaidPlan,
  ruleUnusedSeats,
  ruleOverlappingTools,
  ruleCheaperAlternative,
  ruleAnnualDiscount,
  ruleRetailVsCredits,
} from '../src/audit-engine/rules';
import { runAudit } from '../src/audit-engine/engine';
import { ToolEntry, UseCase } from '../src/types';

const defaultCtx = {
  teamSize: 5,
  primaryUseCase: 'coding' as UseCase,
  allTools: [] as ToolEntry[],
};

// ── TEST 1: Overpaid Plan Rule ────────────────────────────────
describe('ruleOverpaidPlan', () => {
  it('flags team plan for a 1-person team', () => {
    const entry: ToolEntry = {
      toolId: 'claude',
      plan: 'team',
      monthlySpend: 25,
      seats: 1,
      useCase: 'writing',
    };
    const result = ruleOverpaidPlan(entry, { ...defaultCtx, teamSize: 1, allTools: [entry] });
    expect(result).not.toBeNull();
    expect(result?.type).toBe('overpaid_plan');
    expect(result?.potentialMonthlySaving).toBeGreaterThan(0);
  });

  it('does NOT flag Pro plan for a 1-person team (already cheapest paid)', () => {
    const entry: ToolEntry = {
      toolId: 'claude',
      plan: 'pro',
      monthlySpend: 20,
      seats: 1,
      useCase: 'writing',
    };
    const result = ruleOverpaidPlan(entry, { ...defaultCtx, teamSize: 1, allTools: [entry] });
    expect(result).toBeNull();
  });

  it('does NOT flag Business plan for a 10-person team (appropriate scale)', () => {
    const entry: ToolEntry = {
      toolId: 'cursor',
      plan: 'business',
      monthlySpend: 400,
      seats: 10,
      useCase: 'coding',
    };
    const result = ruleOverpaidPlan(entry, { ...defaultCtx, teamSize: 10, allTools: [entry] });
    expect(result).toBeNull();
  });
});

// ── TEST 2: Unused Seats Rule ─────────────────────────────────
describe('ruleUnusedSeats', () => {
  it('flags 8 seats paid for a 3-person team (>25% unused)', () => {
    const entry: ToolEntry = {
      toolId: 'github-copilot',
      plan: 'business',
      monthlySpend: 152, // 8 seats × $19
      seats: 8,
      useCase: 'coding',
    };
    const result = ruleUnusedSeats(entry, { ...defaultCtx, teamSize: 3, allTools: [entry] });
    expect(result).not.toBeNull();
    expect(result?.type).toBe('unused_seats');
    // Saving = (8 - 3) × $19 = $95
    expect(result?.potentialMonthlySaving).toBe(95);
  });

  it('does NOT flag when unused seats is under 25%', () => {
    const entry: ToolEntry = {
      toolId: 'github-copilot',
      plan: 'business',
      monthlySpend: 76, // 4 seats × $19
      seats: 4,
      useCase: 'coding',
    };
    const result = ruleUnusedSeats(entry, { ...defaultCtx, teamSize: 3, allTools: [entry] });
    // 1 unused out of 4 = 25%, should NOT fire (< 25% exclusive)
    expect(result).toBeNull();
  });

  it('does NOT flag free-tier tools (no saving possible)', () => {
    const entry: ToolEntry = {
      toolId: 'github-copilot',
      plan: 'free',
      monthlySpend: 0,
      seats: 5,
      useCase: 'coding',
    };
    const result = ruleUnusedSeats(entry, { ...defaultCtx, teamSize: 1, allTools: [entry] });
    expect(result).toBeNull();
  });
});

// ── TEST 3: Overlapping Tools Rule ────────────────────────────
describe('ruleOverlappingTools', () => {
  it('flags the more expensive of two IDE tools in the same stack', () => {
    const cursor: ToolEntry = {
      toolId: 'cursor',
      plan: 'pro',
      monthlySpend: 60, // 3 seats × $20
      seats: 3,
      useCase: 'coding',
    };
    const windsurf: ToolEntry = {
      toolId: 'windsurf',
      plan: 'pro',
      monthlySpend: 45, // 3 seats × $15
      seats: 3,
      useCase: 'coding',
    };
    const allTools = [cursor, windsurf];
    const ctx = { ...defaultCtx, teamSize: 3, allTools };

    const cursorResult = ruleOverlappingTools(cursor, ctx);
    const windsurfResult = ruleOverlappingTools(windsurf, ctx);

    // More expensive (cursor at $60) should be flagged
    expect(cursorResult).not.toBeNull();
    expect(cursorResult?.type).toBe('overlapping_tools');

    // Cheaper (windsurf at $45) should NOT be flagged
    expect(windsurfResult).toBeNull();
  });

  it('does NOT flag when only one IDE tool is in the stack', () => {
    const cursor: ToolEntry = {
      toolId: 'cursor',
      plan: 'pro',
      monthlySpend: 20,
      seats: 1,
      useCase: 'coding',
    };
    const claude: ToolEntry = {
      toolId: 'claude',
      plan: 'pro',
      monthlySpend: 20,
      seats: 1,
      useCase: 'writing',
    };
    // Different categories — no overlap
    const result = ruleOverlappingTools(cursor, { ...defaultCtx, allTools: [cursor, claude] });
    expect(result).toBeNull();
  });
});

// ── TEST 4: Annual Discount Rule ──────────────────────────────
describe('ruleAnnualDiscount', () => {
  it('flags Cursor Pro monthly when annual saves 20%', () => {
    const entry: ToolEntry = {
      toolId: 'cursor',
      plan: 'pro',
      monthlySpend: 40, // 2 seats × $20 monthly
      seats: 2,
      useCase: 'coding',
    };
    const result = ruleAnnualDiscount(entry, defaultCtx);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('annual_discount');
    // Annual = $16/user/mo → saving = ($20 - $16) × 2 = $8/mo
    expect(result?.potentialMonthlySaving).toBe(8);
  });

  it('does NOT flag free plans', () => {
    const entry: ToolEntry = {
      toolId: 'cursor',
      plan: 'hobby',
      monthlySpend: 0,
      seats: 1,
      useCase: 'coding',
    };
    const result = ruleAnnualDiscount(entry, defaultCtx);
    expect(result).toBeNull();
  });
});

// ── TEST 5: Retail vs Credits Rule ───────────────────────────
describe('ruleRetailVsCredits', () => {
  it('flags high OpenAI API spend (>$200/mo)', () => {
    const entry: ToolEntry = {
      toolId: 'openai-api',
      plan: 'pay-as-you-go',
      monthlySpend: 800,
      seats: 1,
      useCase: 'coding',
    };
    const result = ruleRetailVsCredits(entry, defaultCtx);
    expect(result).not.toBeNull();
    expect(result?.type).toBe('retail_vs_credits');
    // 25% of $800 = $200 estimated saving
    expect(result?.potentialMonthlySaving).toBe(200);
  });

  it('does NOT flag low API spend (<$200/mo)', () => {
    const entry: ToolEntry = {
      toolId: 'openai-api',
      plan: 'pay-as-you-go',
      monthlySpend: 150,
      seats: 1,
      useCase: 'coding',
    };
    const result = ruleRetailVsCredits(entry, defaultCtx);
    expect(result).toBeNull();
  });

  it('does NOT fire on non-API tools (e.g., ChatGPT Plus)', () => {
    const entry: ToolEntry = {
      toolId: 'chatgpt',
      plan: 'plus',
      monthlySpend: 500,
      seats: 25,
      useCase: 'writing',
    };
    const result = ruleRetailVsCredits(entry, defaultCtx);
    expect(result).toBeNull();
  });
});

// ── TEST 6: Full Engine Integration Test ──────────────────────
describe('runAudit (integration)', () => {
  it('returns a complete AuditResult with correct totals', () => {
    const request = {
      tools: [
        {
          toolId: 'cursor' as const,
          plan: 'pro',
          monthlySpend: 20,
          seats: 1,
          useCase: 'coding' as UseCase,
        },
        {
          toolId: 'claude' as const,
          plan: 'team',
          monthlySpend: 25,
          seats: 1,
          useCase: 'writing' as UseCase,
        },
      ],
      teamSize: 1,
      useCase: 'coding' as UseCase,
      companyName: 'Test Co',
    };

    const result = runAudit(request, 'Test AI summary', 'https://stacksave.ai');

    expect(result.auditId).toBeTruthy();
    expect(result.totalMonthlySpend).toBe(45); // $20 + $25
    expect(result.estimatedMonthlySavings).toBeGreaterThanOrEqual(0);
    expect(result.estimatedAnnualSavings).toBe(result.estimatedMonthlySavings * 12);
    expect(result.estimatedMonthlySavings).toBeLessThanOrEqual(result.totalMonthlySpend);
    expect(result.publicUrl).toContain(result.auditId);
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('marks audit as already optimal when stack is well-optimized', () => {
    const request = {
      tools: [
        {
          toolId: 'github-copilot' as const,
          plan: 'individual',
          monthlySpend: 10,
          seats: 1,
          useCase: 'coding' as UseCase,
        },
      ],
      teamSize: 1,
      useCase: 'coding' as UseCase,
    };

    const result = runAudit(request, '', 'https://stacksave.ai');
    // Single user, individual plan, correct seat count → minimal savings
    expect(result.estimatedMonthlySavings).toBeLessThan(20);
  });

  it('marks high savings audits correctly', () => {
    const request = {
      tools: [
        {
          toolId: 'openai-api' as const,
          plan: 'pay-as-you-go',
          monthlySpend: 3000,
          seats: 1,
          useCase: 'data' as UseCase,
        },
        {
          toolId: 'anthropic-api' as const,
          plan: 'pay-as-you-go',
          monthlySpend: 2000,
          seats: 1,
          useCase: 'data' as UseCase,
        },
      ],
      teamSize: 5,
      useCase: 'data' as UseCase,
    };

    const result = runAudit(request, '', 'https://stacksave.ai');
    expect(result.isHighSavings).toBe(true);
  });
});
