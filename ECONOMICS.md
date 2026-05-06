# Economics — StackSave AI Audit

> Unit economics for Credex deploying StackSave as a lead-generation tool.
> Numbers are estimates based on publicly available information and reasonable assumptions — approximate numbers beat no numbers.

---

## What's a Converted Lead Worth to Credex?

Credex sells discounted AI infrastructure credits. A typical deal structure (estimated):

- Average initial credit purchase: **$2,000–$5,000**
- Credex margin on credits: ~**20–30%** (discount from companies that overforecast)
- **Revenue per converted lead: $400–$1,500** (margin on one purchase)

If the customer is satisfied and repurchases:
- Average customer buys credits **3–4 times/year**
- **LTV (12 months): $1,200–$6,000** per customer

**Conservative estimate: $800 LTV per converted customer.**

---

## CAC per Channel (from GTM.md)

| Channel | Cost | Expected Converted Leads | **CAC** |
|---|---|---|---|
| Show HN | $0 (time only, ~4 hrs) | 1–3 consultations | ~$0 cash |
| Twitter organic | $0 (2 hrs/week) | 0–1 per week | ~$0 cash |
| Credex warm customer list | $0 (existing relationship) | 2–5 per email send | ~$0 cash |
| Targeted Slack/Discord | $0 (1 hr/week) | 0–1 per week | ~$0 cash |
| LinkedIn paid (future) | $500–$1,000/month | 2–5 leads/month | **$100–$500/lead** |

**Key insight:** The organic channels have near-zero CAC because StackSave is genuinely useful — it creates value before asking for anything. This is why the "free audit, email after value" design is correct.

---

## Conversion Funnel Math

Realistic conversion rates at each stage:

| Stage | Volume | Conversion Rate | Output |
|---|---|---|---|
| Tool visits (monthly) | 1,000 | — | 1,000 |
| Audit completed | 1,000 | 40% | 400 |
| Email captured | 400 | 30% | 120 leads |
| High-savings (>$500/mo) | 120 | 25% are high-savings | 30 qualified leads |
| Credex consultation booked | 30 | 20% | 6 consultations |
| Credit purchase closed | 6 | 50% | **3 customers/month** |
| Revenue (margin, ~$400 avg) | 3 customers | — | **$1,200/month** |

---

## What Makes This Profitable

This tool costs ~$0/month to run (Vercel free, Render free, MongoDB Atlas free, Grok API near-free, Resend 3k emails free). So any revenue is immediately profitable.

The question is whether the volume of audits justifies the engineering time. At 3 conversions/month on 1,000 visits, the unit economics work only if Credex can scale the traffic.

**At 10,000 visits/month:** ~30 customers/month × $800 LTV = **$24,000/month ARR contribution from this one channel.**

---

## Path to $1M ARR in 18 Months

**What would have to be true:**

1. **Month 1–3 (0 → $10k ARR):** Launch on Show HN and Credex customer list. Get 1,000 monthly audits. Prove the funnel converts at ~3 customers/month. Validate LTV assumptions with real purchase data.

2. **Month 4–6 ($10k → $100k ARR):** Show HN virality + Twitter snowball. Monthly audits grow to 5,000 via organic sharing (the shareable audit URL is the distribution mechanic). At 15 customers/month × $800 LTV × 12 months = **$144k ARR run rate.**

3. **Month 7–12 ($100k → $500k ARR):** SEO starts compounding on "cursor pricing", "github copilot cost", "is claude pro worth it" queries. Content marketing: one blog post per AI tool cost comparison. Estimated 20,000 monthly audits at this stage → 60 customers/month → **$576k ARR run rate.**

4. **Month 13–18 ($500k → $1M ARR):** Add benchmark mode ("your team spends $X/developer — industry average is $Y"). This creates earned media/shareability among CTOs. Introduce referral mechanic. At 30,000 monthly audits → 90 customers/month → **$864k ARR run rate.**

**The math to $1M ARR:** ~100 active Credex customers, each purchasing ~$10,000/year in credits. At 25% margin: $2,500 margin/customer × 400 customers = **$1M ARR.**

**Achievability check:** This requires StackSave to generate ~1,200 qualified consultations over 18 months, converting at 33%. That requires ~400,000 total audit completions over 18 months, or ~22,000/month by month 18. Realistic if the viral sharing mechanic works (every shared audit is free distribution).

---

## The Risk

The funnel breaks if:
1. **Audit completion rate is <20%** — means the form is too long or asks for too much
2. **Email capture rate is <15%** — means users don't trust us enough, or the savings aren't compelling enough to prompt action
3. **Credex consultation rate is <10% for high-savings cases** — means the Credex CTA isn't compelling or the audience doesn't know what Credex does

Each of these is measurable from Day 1. See METRICS.md.
