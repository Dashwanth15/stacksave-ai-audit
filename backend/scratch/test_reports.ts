import { runAudit } from '../src/audit-engine/engine';
import { buildAuditAwareReport } from '../../frontend/src/data/providerKnowledge';
import { ToolEntry, AuditRequest } from '../src/types';

console.log('====================================================');
console.log('TESTING buildAuditAwareReport FOR ALL 7 CASES');
console.log('====================================================\n');

const cases: Array<{ name: string; req: AuditRequest }> = [
  {
    name: 'CASE 1: Claude Pro, 1 seat, Monthly, Mixed',
    req: {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 1, monthlySpend: 20, useCase: 'mixed' }],
      teamSize: 1,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    },
  },
  {
    name: 'CASE 2: Claude Pro, 3 seats, Monthly, Mixed',
    req: {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 60, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    },
  },
  {
    name: 'CASE 3: Claude Pro, 10 seats, Monthly, Mixed',
    req: {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 10, monthlySpend: 200, useCase: 'mixed' }],
      teamSize: 10,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    },
  },
  {
    name: 'CASE 4: Claude Pro, 3 seats, Annual, Mixed',
    req: {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 51, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'annual',
    },
  },
  {
    name: 'CASE 5: Claude Team, 3 seats, Monthly, Mixed',
    req: {
      tools: [{ toolId: 'claude', plan: 'team', seats: 3, monthlySpend: 75, useCase: 'mixed' }],
      teamSize: 3,
      useCase: 'mixed',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    },
  },
  {
    name: 'CASE 6: Claude Team, 10 seats, Annual, Coding',
    req: {
      tools: [{ toolId: 'claude', plan: 'team', seats: 10, monthlySpend: 200, useCase: 'coding' }],
      teamSize: 10,
      useCase: 'coding',
      optimizationGoal: 'productivity',
      billingCycle: 'annual',
    },
  },
  {
    name: 'CASE 7: Claude Pro, 3 seats, Monthly, Research',
    req: {
      tools: [{ toolId: 'claude', plan: 'pro', seats: 3, monthlySpend: 60, useCase: 'research' }],
      teamSize: 3,
      useCase: 'research',
      optimizationGoal: 'balanced',
      billingCycle: 'monthly',
    },
  },
];

for (const c of cases) {
  const result = runAudit(c.req, 'Summary', 'http://localhost:3000');
  console.log(`=== ${c.name} ===`);
  for (const ins of result.insights) {
    const report = buildAuditAwareReport(ins, result.tools, result.useCase);
    console.log(`Insight: ${ins.type} (${ins.suggestion})`);
    console.log(`  Sub Value: ${report?.subscriptionValue}`);
    console.log(`  Exec Summary: ${report?.executiveSummary}`);
    console.log(`  Consultant Verdict: ${report?.consultantVerdict}`);
  }
  console.log('\n');
}
