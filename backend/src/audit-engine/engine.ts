// ============================================================
// Audit Engine Orchestrator — StackSave AI Audit
//
// Coordinates audit execution. Integrates modular intelligence
// services and strategy engines to return G2/Gartner class reports.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { AuditRequest, AuditResult, Insight } from '../types';
import { OptimizationStrategyEngine } from './services/OptimizationStrategyEngine';

export function runAudit(req: AuditRequest, aiSummary: string, baseUrl: string): AuditResult {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const auditId = uuidv4();

  // Run the revamped, modular optimization strategy engine
  const insights = OptimizationStrategyEngine.run(
    req.tools,
    req.teamSize,
    req.useCase,
    req.optimizationGoal || 'balanced'
  );

  // Remove duplicate insights for the same tool + type + strategy (pick highest saving)
  const deduped = deduplicateInsights(insights);

  // Sort: highest priorityScore first, then high severity first
  const sorted = deduped.sort((a, b) => {
    const priorityA = a.priorityScore || 0;
    const priorityB = b.priorityScore || 0;
    if (priorityB !== priorityA) return priorityB - priorityA;

    const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  // Calculate totals based on 'performance' strategy (default user view)
  const totalMonthlySpend = req.tools.reduce((sum, t) => sum + t.monthlySpend, 0);
  const defaultStrategyInsights = sorted.filter((i) => !i.strategy || i.strategy === 'performance' || i.strategy === 'both');
  const estimatedMonthlySavings = defaultStrategyInsights.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);

  // Cap savings at total spend (can't save more than you spend)
  const cappedMonthlySavings = Math.min(estimatedMonthlySavings, totalMonthlySpend);
  const optimizedMonthlySpend = totalMonthlySpend - cappedMonthlySavings;
  const estimatedAnnualSavings = cappedMonthlySavings * 12;
  const savingsPercentage =
    totalMonthlySpend > 0 ? Math.round((cappedMonthlySavings / totalMonthlySpend) * 100) : 0;

  const isAlreadyOptimal = cappedMonthlySavings < 20;
  const isHighSavings = cappedMonthlySavings > 500;

  return {
    auditId,
    createdAt: new Date().toISOString(),
    totalMonthlySpend,
    optimizedMonthlySpend,
    estimatedMonthlySavings: cappedMonthlySavings,
    estimatedAnnualSavings,
    savingsPercentage,
    isAlreadyOptimal,
    isHighSavings,
    insights: sorted,
    aiSummary,
    publicUrl: `${normalizedBaseUrl}/audit/${auditId}`,
    companyName: req.companyName,
    teamSize: req.teamSize,
    tools: req.tools,
    useCase: req.useCase,
    optimizationGoal: req.optimizationGoal || 'balanced',
  };
}

// Deduplicate insights: same tool + same insight type + strategy → keep highest saving
function deduplicateInsights(insights: Insight[]): Insight[] {
  const map = new Map<string, Insight>();

  for (const insight of insights) {
    const key = `${insight.toolId}:${insight.type}:${insight.strategy}`;
    const existing = map.get(key);
    if (!existing || insight.potentialMonthlySaving > existing.potentialMonthlySaving) {
      map.set(key, insight);
    }
  }

  return Array.from(map.values());
}
