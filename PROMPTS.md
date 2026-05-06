# Prompts — StackSave AI Audit

The full LLM prompts used in the AI summary feature, why they were written this way, and what was tried that didn't work.

---

## Feature: Personalized Audit Summary

**File:** `backend/src/services/aiService.ts`
**Model:** xAI Grok (`grok-3-mini`)
**Trigger:** Every time a user completes an audit — called after the deterministic engine runs

---

## Final System Prompt

```
You are a senior financial analyst specializing in SaaS and AI tool cost optimization for startups. You write clear, specific, and actionable 80-120 word summaries of AI spend audits. Your tone is direct, credible, and helpful — like advice from a trusted CFO, not a salesperson. Never use filler phrases like "as you can see" or "it's clear that". Always cite specific dollar amounts from the data provided.
```

**Why this framing:** The "CFO, not salesperson" instruction is the most important part. Without it, LLMs default to enthusiastic marketing language ("This is a fantastic opportunity to..."). The target reader is a startup founder or engineering manager who is naturally skeptical of automated financial advice — they need a tone that signals credibility.

---

## Final User Prompt

```
Write an 80-120 word personalized audit summary for a startup with the following profile:

Team size: {teamSize} people
Total monthly AI spend: ${totalMonthlySpend}
Estimated monthly savings: ${estimatedMonthlySavings}
Estimated annual savings: ${estimatedAnnualSavings}
Savings percentage: {savingsPercentage}%
{companyName if provided}
{isAlreadyOptimal note if applicable}
{isHighSavings note if applicable}

Top optimization opportunities:
{top 3 insights as bullet points}

Write the summary in second person ("Your team..."). Be specific about the dollar amounts. If they are already optimal, acknowledge it genuinely — don't manufacture urgency. End with one concrete next step.
```

**Why second person ("Your team..."):** Creates a personalized feel without needing to know the person's name. "Your team" implies the model understands the specific context rather than generating a generic summary.

**Why "End with one concrete next step":** The summary should move toward action. Without this instruction, the model tends to end with a vague positive statement. A concrete action ("Start with reducing your GitHub Copilot seats from 8 to 3") is more valuable.

**Why inject top 3 insights explicitly:** The model should not guess at savings opportunities from summary numbers alone. Giving it the actual rule outputs (toolName, suggestion, saving amount) ensures the summary references real insights, not hallucinated ones.

---

## Temperature and Token Settings

```json
{
  "model": "grok-3-mini",
  "max_tokens": 200,
  "temperature": 0.7
}
```

**Temperature 0.7 rationale:** Low enough (vs 1.0) to keep dollar amounts accurate and tone consistent, high enough to avoid robotic repetition when generating multiple summaries for similar inputs.

**200 max_tokens:** The target is 80-120 words. 200 tokens gives comfortable headroom without runaway generation.

---

## What Was Tried That Didn't Work

### Attempt 1: Single prompt, no system message
**Result:** The model produced enthusiastic but vague summaries ("Your AI stack has significant room for optimization!") with no specific numbers, even though the numbers were in the prompt.
**Fix:** Added system message establishing the CFO persona and explicitly instructing it to always cite dollar amounts.

### Attempt 2: Asking the model to generate the audit insights itself
**Rejected before implementation:** The whole point of the audit engine is deterministic, verifiable savings amounts. Letting the LLM generate the numbers would produce hallucinated figures — sometimes plausible-sounding but wrong. This is explicitly documented in the architecture: AI is only used for the prose layer, never the math layer.

### Attempt 3: Including all insights (not just top 3)
**Result:** For stacks with 6+ insights, the prompt became very long and the model would try to address every insight in the summary, resulting in an unreadable list. Limiting to top 3 by severity produces a more focused, readable summary.

### Attempt 4: "Already optimal" case without special instruction
**Result:** The model would manufacture urgency even when `isAlreadyOptimal = true`, suggesting the user "keep monitoring" and "consider future opportunities" in vague terms. The explicit instruction "If they are already optimal, acknowledge it genuinely — don't manufacture urgency" fixed this. Users with optimal stacks deserve an honest answer, not a upsell.

---

## Fallback Template

When the Grok API fails (network error, rate limit, invalid key), the AI service falls back to a template summary:

```typescript
// For isAlreadyOptimal:
`Your team of ${teamSize} is spending $${totalMonthlySpend}/month on AI tools — and based on this audit, you're spending it well...`

// For savings found:
`Your team of ${teamSize} is spending $${totalMonthlySpend}/month across ${toolCount} AI tools. This audit identified $${estimatedMonthlySavings}/month in potential savings...`
```

The template is explicitly data-driven (uses real numbers) so it reads as legitimate even without the model's prose polish.
