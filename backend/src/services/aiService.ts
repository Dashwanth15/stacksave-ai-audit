// ============================================================
// AI Service — StackSave AI Audit
// Uses xAI Grok API (OpenAI-compatible) to generate a
// ~100-word personalized audit summary paragraph.
//
// Full prompts documented in /PROMPTS.md
// Gracefully falls back to a template if the API fails.
// ============================================================

import OpenAI from 'openai';
import { AuditResult } from '../types';

// xAI Grok is OpenAI-compatible — same SDK, different base URL + model
function getGrokClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.XAI_API_KEY || '',
    baseURL: 'https://api.x.ai/v1',
  });
}

// ── Main Export ───────────────────────────────────────────────
export async function generateAuditSummary(audit: AuditResult): Promise<string> {
  try {
    return await callGrokAPI(audit);
  } catch (err) {
    console.warn('⚠️  Grok API failed, using template summary:', (err as Error).message);
    return generateTemplateSummary(audit);
  }
}

// ── Grok API Call ─────────────────────────────────────────────
async function callGrokAPI(audit: AuditResult): Promise<string> {
  const client = getGrokClient();

  const topInsights = audit.insights
    .slice(0, 3)
    .map((i) => `- ${i.toolName}: ${i.suggestion} (saves $${i.potentialMonthlySaving}/mo)`)
    .join('\n');

  const systemPrompt = `You are a senior financial analyst specializing in SaaS and AI tool cost optimization for startups. You write clear, specific, and actionable 80-120 word summaries of AI spend audits. Your tone is direct, credible, and helpful — like advice from a trusted CFO, not a salesperson. Never use filler phrases like "as you can see" or "it's clear that". Always cite specific dollar amounts from the data provided.`;

  const userPrompt = `Write an 80-120 word personalized audit summary for a startup with the following profile:

Team size: ${audit.teamSize} people
Total monthly AI spend: $${audit.totalMonthlySpend}
Estimated monthly savings: $${audit.estimatedMonthlySavings}
Estimated annual savings: $${audit.estimatedAnnualSavings}
Savings percentage: ${audit.savingsPercentage}%
${audit.companyName ? `Company: ${audit.companyName}` : ''}
${audit.isAlreadyOptimal ? 'Note: This team is spending efficiently — no major savings found.' : ''}
${audit.isHighSavings ? 'Note: This is a high-savings case — significant optimization opportunity exists.' : ''}

Top optimization opportunities:
${topInsights || 'Stack is already well-optimized.'}

Write the summary in second person ("Your team..."). Be specific about the dollar amounts. If they are already optimal, acknowledge it genuinely — don't manufacture urgency. End with one concrete next step.`;

  const response = await client.chat.completions.create({
    model: 'grok-3-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Grok API');

  return content.trim();
}

// ── Template Fallback ─────────────────────────────────────────
// Used when API is unavailable. Still personalized with real numbers.
function generateTemplateSummary(audit: AuditResult): string {
  if (audit.isAlreadyOptimal) {
    return `Your team of ${audit.teamSize} is spending $${audit.totalMonthlySpend}/month on AI tools — and based on this audit, you're spending it well. Your current stack appears to be appropriately sized for your team and use cases. We didn't find any major inefficiencies. Keep an eye on seat counts as your team grows, and revisit this audit if you add new tools or change your primary use case. Small teams that right-size early avoid the budget bloat that's common at the Series A stage.`;
  }

  const topInsight = audit.insights[0];
  const toolCount = audit.tools.length;

  return `Your team of ${audit.teamSize} is spending $${audit.totalMonthlySpend}/month across ${toolCount} AI tool${toolCount > 1 ? 's' : ''}. This audit identified $${audit.estimatedMonthlySavings}/month in potential savings — $${audit.estimatedAnnualSavings}/year — without reducing your team's capabilities. ${topInsight ? `The biggest opportunity: ${topInsight.suggestion}. ${topInsight.reason}` : ''} Implementing these changes would bring your monthly AI spend to approximately $${audit.optimizedMonthlySpend} — a ${audit.savingsPercentage}% reduction. Review each suggestion with your team and prioritize the highest-impact items first.`;
}
