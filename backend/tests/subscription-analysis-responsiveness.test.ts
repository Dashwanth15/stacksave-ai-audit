import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { AuditRequest } from '../src/types';
import { buildAuditAwareReport } from '../../frontend/src/data/providerKnowledge';

describe('Subscription Analysis Responsiveness Tests', () => {

  it('CASE 1: Claude Pro, 1 seat, Monthly, Mixed', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'mixed' }],
      teamSize: 1,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(20);
    const ins = result.insights.find(i => i.toolId === 'claude');
    expect(ins).toBeDefined();
    expect(ins?.type).toBe('annual_discount');
    expect(ins?.suggestion).toContain('Annual');
    expect(ins?.message).toContain('1 seat');
    expect(ins?.currentSetup).toContain('1 seat');

    // Frontend report verification
    const report = buildAuditAwareReport(ins!, req.tools, req.useCase);
    expect(report).toBeDefined();
    expect(report?.executiveSummary).toContain('1 seat');
    expect(report?.consultantVerdict).toContain('Claude Pro');
  });

  it('CASE 2: Claude Pro, 3 seats, Monthly, Mixed', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 60, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(60);
    const ins = result.insights.find(i => i.toolId === 'claude');
    expect(ins).toBeDefined();
    expect(ins?.type).toBe('annual_discount');
    expect(ins?.potentialMonthlySaving).toBe(9); // $3/seat * 3 seats
    expect(ins?.message).toContain('3 seats');

    // Frontend report verification - small team framing
    const report = buildAuditAwareReport(ins!, req.tools, req.useCase);
    expect(report).toBeDefined();
    expect(report?.executiveSummary).toContain('3 seats');
    expect(report?.billingAnalysis.monthlySpend).toBe(60);
    expect(report?.billingAnalysis.potentialSaving).toBe(9);
  });

  it('CASE 3: Claude Pro, 30 seats, Monthly, Mixed', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 30, monthlySpend: 600, useCase: 'mixed' }],
      teamSize: 30,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(600);
    const ins = result.insights.find(i => i.toolId === 'claude');
    expect(ins?.type).toBe('annual_discount');
    expect(ins?.potentialMonthlySaving).toBe(90); // $3/seat * 30 seats = $90/mo
    expect(result.isAlreadyOptimal).toBe(false);
    expect(ins?.message).toContain('30 seats');

    // Frontend report verification - large team / enterprise spend framing
    const report = buildAuditAwareReport(ins!, req.tools, req.useCase);
    expect(report).toBeDefined();
    expect(report?.executiveSummary).toContain('30 seats');
    expect(report?.executiveSummary).toContain('$600/mo');
    expect(report?.consultantVerdict).toContain('critical cost action');
  });

  it('CASE 4: Claude Pro, 3 seats, Annual, Mixed', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 51, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'annual',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(51);
    expect(result.estimatedMonthlySavings).toBe(0);
    // Since already on annual, annual_discount MUST NOT fire
    expect(result.insights.some(i => i.type === 'annual_discount')).toBe(false);
    expect(result.isAlreadyOptimal).toBe(true);

    const verifiedIns = result.insights.find(i => i.toolId === 'claude');
    expect(verifiedIns?.type).toBe('already_optimal');
    expect(verifiedIns?.message).toContain('3 seats');

    const report = buildAuditAwareReport(verifiedIns!, req.tools, req.useCase);
    expect(report?.executiveSummary).toContain('3-person team');
  });

  it('CASE 5: Claude Team, 3 seats, Monthly, Mixed', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'team', seats: 3, monthlySpend: 75, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(75);
    const overpaidIns = result.insights.find(i => i.toolId === 'claude' && i.type === 'overpaid_plan');
    expect(overpaidIns).toBeDefined();
    expect(overpaidIns?.suggestion).toContain('Claude Pro');
  });

  it('CASE 6: Claude Team, 10 seats, Annual, Coding', () => {
    const req: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'team', seats: 10, monthlySpend: 200, useCase: 'coding' }],
      teamSize: 10,
      useCase: 'coding',
      optimizationGoal: 'productivity',
      billingCycle: 'annual',
    };
    const result = runAudit(req, 'Summary', 'http://localhost:3000');
    expect(result.totalMonthlySpend).toBe(200);
    expect(result.useCase).toBe('coding');
    const verifiedIns = result.insights.find(i => i.toolId === 'claude');
    expect(verifiedIns?.type).toBe('already_optimal');
    expect(verifiedIns?.message).toContain('Coding & Development');
    expect(verifiedIns?.message).toContain('10 seats');
  });

  it('CASE 7: Cursor Pro 5 seats ($100/mo) vs 50 seats ($1000/mo) Annual Savings Scaling', () => {
    const req5: AuditRequest = {
      tools: [{ toolId: 'cursor', plan: 'pro', seats: 5, monthlySpend: 100, useCase: 'coding' }],
      teamSize: 5,
      useCase: 'coding',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const res5 = runAudit(req5, 'Summary', 'http://localhost:3000');
    const ins5 = res5.insights.find(i => i.toolId === 'cursor');
    expect(ins5?.potentialMonthlySaving).toBe(20); // ($20 - $16) * 5 = $20/mo

    const req50: AuditRequest = {
      tools: [{ toolId: 'cursor', plan: 'pro', seats: 50, monthlySpend: 1000, useCase: 'coding' }],
      teamSize: 50,
      useCase: 'coding',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    };
    const res50 = runAudit(req50, 'Summary', 'http://localhost:3000');
    const ins50 = res50.insights.find(i => i.toolId === 'cursor');
    expect(ins50?.potentialMonthlySaving).toBe(200); // ($20 - $16) * 50 = $200/mo
  });

  it('Multi-Provider Verification: Cursor, ChatGPT, Copilot, Gemini, Windsurf, Kimi, Perplexity, DeepSeek, Anthropic API, OpenAI API', () => {
    const providers = [
      { toolId: 'cursor', plan: 'pro', seats: 5, monthlySpend: 100 },
      { toolId: 'chatgpt', plan: 'plus', seats: 5, monthlySpend: 100 },
      { toolId: 'github-copilot', plan: 'business', seats: 5, monthlySpend: 95 },
      { toolId: 'gemini', plan: 'advanced', seats: 5, monthlySpend: 100 },
      { toolId: 'windsurf', plan: 'pro', seats: 5, monthlySpend: 75 },
      { toolId: 'kimi', plan: 'moderato', seats: 5, monthlySpend: 75 },
      { toolId: 'perplexity', plan: 'pro', seats: 5, monthlySpend: 100 },
      { toolId: 'deepseek', plan: 'api-pay-as-you-go', seats: 5, monthlySpend: 50 },
      { toolId: 'anthropic-api', plan: 'api-pay-as-you-go', seats: 5, monthlySpend: 300 },
      { toolId: 'openai-api', plan: 'api-pay-as-you-go', seats: 5, monthlySpend: 350 },
    ];

    for (const p of providers) {
      const req: AuditRequest = {
        tools: [{ toolId: p.toolId as any, plan: p.plan, seats: p.seats, monthlySpend: p.monthlySpend, useCase: 'coding' }],
        teamSize: p.seats,
        useCase: 'coding',
        optimizationGoal: 'balanced',
        billingCycle: 'monthly'
      };

      const res = runAudit(req, 'Summary', 'http://localhost:3000');
      expect(res.tools[0].toolId).toBe(p.toolId);
      expect(res.totalMonthlySpend).toBe(p.monthlySpend);
      expect(res.insights.length).toBeGreaterThan(0);
    }
  });

});
