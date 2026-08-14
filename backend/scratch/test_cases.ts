import { runAudit } from '../src/audit-engine/engine';
import { ToolEntry, AuditRequest } from '../src/types';

console.log('====================================================');
console.log('TESTING THE 7 AUDIT CONFIGURATION CASES');
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
  console.log(`--- ${c.name} ---`);
  console.log(`Total Spend: $${result.totalMonthlySpend}/mo | Savings: $${result.estimatedMonthlySavings}/mo | Optimal: ${result.isAlreadyOptimal}`);
  console.log(`Insights (${result.insights.length}):`);
  for (const ins of result.insights) {
    console.log(`  - Type: ${ins.type} | Suggestion: "${ins.suggestion}" | Saving: $${ins.potentialMonthlySaving}/mo`);
    console.log(`    Message: ${ins.message}`);
    console.log(`    Reason: ${ins.reason}`);
  }
  console.log('\n');
}
