# Pricing Data — StackSave AI Audit

All pricing data used in the audit engine. Every number traces to an official vendor pricing page.
Last verified: **2026-05-06**

---

## Cursor
- **Hobby:** $0/user/month — https://cursor.com/pricing — verified 2026-05-06
- **Pro:** $20/user/month (monthly) | $16/user/month (billed annually = $192/yr) — https://cursor.com/pricing — verified 2026-05-06
- **Business:** $40/user/month — https://cursor.com/pricing — verified 2026-05-06

---

## GitHub Copilot
- **Free:** $0 — https://github.com/features/copilot#pricing — verified 2026-05-06
- **Individual:** $10/user/month | $8.33/user/month (billed annually = $100/yr) — https://github.com/features/copilot#pricing — verified 2026-05-06
- **Business:** $19/user/month — https://github.com/features/copilot#pricing — verified 2026-05-06
- **Enterprise:** $39/user/month — https://github.com/features/copilot#pricing — verified 2026-05-06

---

## Claude (Anthropic)
- **Free:** $0 — https://www.anthropic.com/pricing — verified 2026-05-06
- **Pro:** $20/user/month | $18/user/month (billed annually = $216/yr) — https://www.anthropic.com/pricing — verified 2026-05-06
- **Max:** $100/user/month — https://www.anthropic.com/pricing — verified 2026-05-06
- **Team:** $25/user/month (minimum 5 seats) — https://www.anthropic.com/pricing — verified 2026-05-06
- **Enterprise:** Custom pricing — https://www.anthropic.com/pricing — verified 2026-05-06

---

## ChatGPT (OpenAI)
- **Free:** $0 — https://openai.com/chatgpt/pricing — verified 2026-05-06
- **Plus:** $20/user/month — https://openai.com/chatgpt/pricing — verified 2026-05-06
- **Team:** $25/user/month (monthly) | $20.83/user/month (billed annually = $250/yr/user) — https://openai.com/chatgpt/pricing — verified 2026-05-06
- **Enterprise:** Custom pricing — https://openai.com/chatgpt/pricing — verified 2026-05-06
- **API Direct:** Pay-as-you-go (per token) — https://openai.com/api/pricing — verified 2026-05-06

---

## Anthropic API (Direct)
- **Pay As You Go:** Per-token pricing, no flat subscription
  - Claude Opus 4: $15/MTok input, $75/MTok output — https://www.anthropic.com/pricing — verified 2026-05-06
  - Claude Sonnet 4: $3/MTok input, $15/MTok output — https://www.anthropic.com/pricing — verified 2026-05-06
  - Claude Haiku 3.5: $0.80/MTok input, $4/MTok output — https://www.anthropic.com/pricing — verified 2026-05-06

---

## OpenAI API (Direct)
- **Pay As You Go:** Per-token pricing, no flat subscription
  - GPT-4o: $2.50/MTok input, $10/MTok output — https://openai.com/api/pricing — verified 2026-05-06
  - GPT-4o mini: $0.15/MTok input, $0.60/MTok output — https://openai.com/api/pricing — verified 2026-05-06
  - o3-mini: $1.10/MTok input, $4.40/MTok output — https://openai.com/api/pricing — verified 2026-05-06

---

## Gemini (Google)
- **Free:** $0 — https://one.google.com/about/ai-premium — verified 2026-05-06
- **Advanced (Google One AI Premium):** $19.99/user/month — https://one.google.com/about/ai-premium — verified 2026-05-06
- **Workspace Business Starter with Gemini:** $20/user/month — https://workspace.google.com/pricing — verified 2026-05-06
- **API (Google AI Studio):** Pay-as-you-go, free tier available — https://ai.google.dev/pricing — verified 2026-05-06

---

## Windsurf (Codeium)
- **Free:** $0 — https://windsurf.com/pricing — verified 2026-05-06
- **Pro:** $15/user/month | $12/user/month (billed annually = $144/yr) — https://windsurf.com/pricing — verified 2026-05-06
- **Teams:** $35/user/month | $30/user/month (billed annually) — https://windsurf.com/pricing — verified 2026-05-06

---

## Audit Engine Cross-Reference

| Rule | Tools Affected | Data Used |
|---|---|---|
| `ruleOverpaidPlan` | Claude, ChatGPT, GitHub Copilot | Plan tier prices per seat |
| `ruleUnusedSeats` | All per-seat tools | Price per seat × unused count |
| `ruleOverlappingTools` | Cursor + Windsurf, Claude + ChatGPT | Category matching |
| `ruleCheaperAlternative` | Cursor → Windsurf/Copilot, Claude → ChatGPT | Cheapest paid plan of alternative |
| `ruleAnnualDiscount` | Cursor Pro, GitHub Copilot Individual, Claude Pro, ChatGPT Team | Monthly vs annual price delta |
| `ruleRetailVsCredits` | Anthropic API, OpenAI API | 25% estimated savings via credits |
| `ruleFreeAlternativeAvailable` | GitHub Copilot, Windsurf, Gemini, Claude, ChatGPT | Free tier availability |
