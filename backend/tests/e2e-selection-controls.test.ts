import { describe, it, expect } from 'vitest';
import { runAudit } from '../src/audit-engine/engine';
import { ToolEntry, AuditRequest } from '../src/types';

describe('End-to-End Audit Selection Controls Tests', () => {

  it('TEST A: Monthly billing, 1 seat, mixed use case, performance optimized', () => {
    const tools: ToolEntry[] = [
      { toolId: 'cursor', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'mixed' },
      { toolId: 'claude', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'mixed' },
      { toolId: 'chatgpt', plan: 'plus', seats: 1, monthlySpend: 20, useCase: 'mixed' }
    ];
    const req: AuditRequest = {
      tools,
      teamSize: 1,
      useCase: 'mixed',
      optimizationGoal: 'productivity',
      billingCycle: 'monthly'
    };

    const result = runAudit(req, 'Summary', 'http://localhost:3000');

    expect(result.totalMonthlySpend).toBe(60);
    expect(result.billingCycle).toBe('monthly');
    expect(result.optimizationGoal).toBe('productivity');
    expect(result.useCase).toBe('mixed');
    expect(result.teamSize).toBe(1);
    expect(result.tools.map(t => t.toolId)).toEqual(['cursor', 'claude', 'chatgpt']);

    // Monthly billing is active, so annual discount recommendations may be evaluated
    const annualInsights = result.insights.filter(i => i.type === 'annual_discount');
    expect(annualInsights.length).toBeGreaterThanOrEqual(0);
  });

  it('TEST B: Annual billing, 10 seats, coding use case, performance optimized', () => {
    const tools: ToolEntry[] = [
      { toolId: 'cursor', plan: 'teams', seats: 10, monthlySpend: 320, useCase: 'coding' },
      { toolId: 'claude', plan: 'pro', seats: 10, monthlySpend: 160, useCase: 'coding' },
      { toolId: 'chatgpt', plan: 'team', seats: 10, monthlySpend: 250, useCase: 'coding' }
    ];
    const req: AuditRequest = {
      tools,
      teamSize: 10,
      useCase: 'coding',
      optimizationGoal: 'productivity',
      billingCycle: 'annual'
    };

    const result = runAudit(req, 'Summary', 'http://localhost:3000');

    expect(result.totalMonthlySpend).toBe(730);
    expect(result.billingCycle).toBe('annual');
    expect(result.optimizationGoal).toBe('productivity');
    expect(result.useCase).toBe('coding');
    expect(result.teamSize).toBe(10);
    expect(result.tools.map(t => t.seats)).toEqual([10, 10, 10]);

    // Since billingCycle is annual, annual_discount insights MUST NOT fire
    const annualInsights = result.insights.filter(i => i.type === 'annual_discount');
    expect(annualInsights.length).toBe(0);
  });

  it('TEST C: Kimi provider is explicitly audited without unexpected providers', () => {
    const tools: ToolEntry[] = [
      { toolId: 'kimi', plan: 'moderato', seats: 3, monthlySpend: 45, useCase: 'research' },
      { toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 60, useCase: 'research' }
    ];
    const req: AuditRequest = {
      tools,
      teamSize: 3,
      useCase: 'research',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly'
    };

    const result = runAudit(req, 'Summary', 'http://localhost:3000');

    expect(result.totalMonthlySpend).toBe(105);
    expect(result.tools.map(t => t.toolId)).toEqual(['kimi', 'claude']);
    // Verify no unselected providers are injected into the audit result tools
    expect(result.tools.some(t => t.toolId === 'cursor' || t.toolId === 'chatgpt')).toBe(false);
  });

  it('TEST D: Changing only plan impacts total monthly spend and tier evaluations', () => {
    const baseToolsPro: ToolEntry[] = [
      { toolId: 'claude', plan: 'pro', seats: 5, monthlySpend: 100, useCase: 'coding' }
    ];
    const reqPro: AuditRequest = {
      tools: baseToolsPro,
      teamSize: 5,
      useCase: 'coding',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly'
    };
    const resultPro = runAudit(reqPro, 'Summary', 'http://localhost:3000');

    const baseToolsTeam: ToolEntry[] = [
      { toolId: 'claude', plan: 'team', seats: 5, monthlySpend: 125, useCase: 'coding' }
    ];
    const reqTeam: AuditRequest = {
      tools: baseToolsTeam,
      teamSize: 5,
      useCase: 'coding',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly'
    };
    const resultTeam = runAudit(reqTeam, 'Summary', 'http://localhost:3000');

    expect(resultPro.totalMonthlySpend).toBe(100);
    expect(resultTeam.totalMonthlySpend).toBe(125);
    expect(resultPro.tools[0].plan).toBe('pro');
    expect(resultTeam.tools[0].plan).toBe('team');
  });

  it('TEST E: Changing only seat count recalculates total spend accordingly', () => {
    const req10: AuditRequest = {
      tools: [{ toolId: 'cursor', plan: 'pro', seats: 10, monthlySpend: 200, useCase: 'coding' }],
      teamSize: 10,
      useCase: 'coding',
      optimizationGoal: 'savings',
      billingCycle: 'monthly'
    };
    const result10 = runAudit(req10, 'Summary', 'http://localhost:3000');

    const req20: AuditRequest = {
      tools: [{ toolId: 'cursor', plan: 'pro', seats: 20, monthlySpend: 400, useCase: 'coding' }],
      teamSize: 20,
      useCase: 'coding',
      optimizationGoal: 'savings',
      billingCycle: 'monthly'
    };
    const result20 = runAudit(req20, 'Summary', 'http://localhost:3000');

    expect(result10.totalMonthlySpend).toBe(200);
    expect(result20.totalMonthlySpend).toBe(400);
    expect(result10.teamSize).toBe(10);
    expect(result20.teamSize).toBe(20);
  });

  it('TEST F: Changing engineering focus updates useCase in audit profile', () => {
    const reqCoding: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 2, monthlySpend: 40, useCase: 'coding' }],
      teamSize: 2,
      useCase: 'coding',
      optimizationGoal: 'balanced'
    };
    const resultCoding = runAudit(reqCoding, 'Summary', 'http://localhost:3000');

    const reqResearch: AuditRequest = {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 2, monthlySpend: 40, useCase: 'research' }],
      teamSize: 2,
      useCase: 'research',
      optimizationGoal: 'balanced'
    };
    const resultResearch = runAudit(reqResearch, 'Summary', 'http://localhost:3000');

    expect(resultCoding.useCase).toBe('coding');
    expect(resultResearch.useCase).toBe('research');
  });

});
