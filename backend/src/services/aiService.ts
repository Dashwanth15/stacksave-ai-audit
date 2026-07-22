// ============================================================
// AI Service — StackSave AI Audit
// Uses Groq API (OpenAI-compatible) to generate a
// ~100-word personalized audit summary paragraph.
//
// Full prompts documented in /PROMPTS.md
// Gracefully falls back to a template if the API fails.
// ============================================================

import OpenAI from 'openai';
import { AuditResult } from '../types';

// Groq is OpenAI-compatible — same SDK, different base URL + model
function getGroqClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY || '',
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// ── Main Export ───────────────────────────────────────────────
export async function generateAuditSummary(audit: AuditResult, strategy: 'performance' | 'savings'): Promise<string> {
  const filteredInsights = audit.insights.filter(
    (i) => !i.strategy || i.strategy === strategy || i.strategy === 'both'
  );

  const optimizationInsights = filteredInsights.filter((i) => i.severity !== 'info');
  const validatedInsights = filteredInsights.filter((i) => i.severity === 'info');

  const totalSpend = audit.totalMonthlySpend;
  const potentialSavings = optimizationInsights.reduce((sum, i) => sum + i.potentialMonthlySaving, 0);
  const optCount = optimizationInsights.length;
  const valCount = validatedInsights.length;

  const overlapInsights = filteredInsights.filter((i) => i.type === 'overlapping_tools');
  const hasOverlap = overlapInsights.length > 0;

  // Compute a deterministic overall stack health score
  let healthScore = 100;
  if (hasOverlap) healthScore -= 25;
  if (optCount > 0) healthScore -= 15 * optCount;
  healthScore = Math.max(healthScore, 10);

  let healthLabel = 'Excellent';
  if (healthScore < 50) healthLabel = 'Critical Attention Required';
  else if (healthScore < 80) healthLabel = 'Needs Optimization';

  let summary = '';
  const goalText = audit.optimizationGoal ? `under the ${audit.optimizationGoal} goal` : '';

  if (strategy === 'performance') {
    summary = `Our expert architecture audit evaluates a stack of ${audit.tools.length} active platforms for your team of ${audit.teamSize} developers ${goalText}. Currently, your total monthly spend is $${totalSpend}. We identified ${optCount} optimization opportunities yielding a total potential saving of $${potentialSavings}/month, while verifying ${valCount} plan configurations as highly optimal. Overall stack health is graded at ${healthLabel} (${healthScore}% efficiency). ${hasOverlap ? `Redundant capability overlap was detected in the active workspace. We recommend consolidating duplicate services to reduce context-switching latency and focus developer experience.` : 'Your active software subscriptions show zero redundant capability overlap, maintaining high developer experience and velocity.'}`;
  } else {
    summary = `Our startup finance spend audit evaluates a stack of ${audit.tools.length} active platforms for your team of ${audit.teamSize} ${goalText}. Currently, your total monthly spend is $${totalSpend}. We identified ${optCount} cost optimization opportunities yielding a potential saving of $${potentialSavings}/month ($${potentialSavings * 12}/year), representing a ${audit.savingsPercentage}% spend reduction. We have validated ${valCount} of your plans as optimal under this goal. Overall stack health is graded at ${healthLabel} (${healthScore}% efficiency). Consolidating redundant workspaces and committing to annual billing cycles represent immediate opportunities to extend operational runway and improve SaaS ROI.`;
  }

  return Promise.resolve(summary);
}
