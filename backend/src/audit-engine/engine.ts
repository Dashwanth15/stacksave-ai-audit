// ============================================================
// Audit Engine Orchestrator — StackSave AI Audit
//
// Applies all rules to each tool in the user's stack and
// returns a structured AuditResult. Deterministic — no AI.
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { AuditRequest, AuditResult, Insight } from '../types';
import { ALL_RULES } from './rules';

export function runAudit(req: AuditRequest, aiSummary: string, baseUrl: string): AuditResult {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const auditId = uuidv4();
  const insights: Insight[] = [];

  const ctx = {
    teamSize: req.teamSize,
    primaryUseCase: req.useCase,
    allTools: req.tools,
  };

  // Apply all rules to each tool entry
  for (const entry of req.tools) {
    for (const rule of ALL_RULES) {
      const result = rule(entry, ctx);
      if (result !== null) {
        insights.push(result);
      }
    }
  }

  // Remove duplicate insights for the same tool+type (pick highest saving)
  const deduped = deduplicateInsights(insights);

  // Sort: high severity first, then by savings amount descending
  const sorted = deduped.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2, info: 3 };
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.potentialMonthlySaving - a.potentialMonthlySaving;
  });

  // Calculate totals
  const totalMonthlySpend = req.tools.reduce((sum, t) => sum + t.monthlySpend, 0);
  const estimatedMonthlySavings = sorted.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);

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
  };
}

// Deduplicate insights: same tool + same insight type → keep highest saving
function deduplicateInsights(insights: Insight[]): Insight[] {
  const map = new Map<string, Insight>();

  for (const insight of insights) {
    const key = `${insight.toolId}:${insight.type}`;
    const existing = map.get(key);
    if (!existing || insight.potentialMonthlySaving > existing.potentialMonthlySaving) {
      map.set(key, insight);
    }
  }

  return Array.from(map.values());
}
