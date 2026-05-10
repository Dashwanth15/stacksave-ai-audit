# Economics — StackSave AI Audit

> Unit economics for Credex deploying StackSave as a lead-generation tool.
> Numbers are estimates based on reasonable assumptions — approximate numbers beat no numbers.

---

## What a Converted Lead Is Worth

Credex sells discounted AI infrastructure credits — sourced from companies that overforecast usage and resell at 20–40% below retail. The economics per converted customer:

| | Conservative | Mid | Optimistic |
|---|---|---|---|
| Initial credit purchase | $1,500 | $3,000 | $5,000 |
| Credex gross margin | 20% | 25% | 30% |
| **Revenue on first deal** | **$300** | **$750** | **$1,500** |
| Repurchases/year | 2× | 3× | 4× |
| **12-month LTV** | **$600** | **$2,250** | **$6,000** |

**Working assumption for this doc: $800 LTV per converted customer** (conservative mid-range — one $3k purchase + one repurchase at 25% margin). This is the number the funnel math runs on.

---

## Cost to Run StackSave

The tool is designed to run at effectively $0/month on the free tier:

| Service | Usage | Monthly Cost |
|---|---|---|
| Render (frontend static) | Free tier | $0 |
| Render (backend Node) | Free tier, 750hrs/month | $0 |
| MongoDB Atlas | M0 free cluster | $0 |
| Groq API | ~$0.001 per audit summary | ~$0.10 at 100 audits/month |
| Resend | Free tier, 3,000 emails/month | $0 |
| **Total at <100 audits/day** | | **~$0/month** |

The only real cost is engineer time. Infrastructure cost doesn't become meaningful until ~5,000 audits/month, at which point a paid Render instance ($25/month) and a dedicated MongoDB Atlas M10 cluster ($57/month) would be warranted. That's a problem worth having.

---

## CAC by Acquisition Channel

All channels from GTM.md. Time costs are real — the question is whether the expected lead output justifies the hours.

| Channel | Time cost | Expected leads/month | Est. CAC |
|---|---|---|---|
| Credex warm customer list | 2 hrs (1 email send) | 3–6 qualified leads | ~$0 cash |
| Show HN launch | 4 hrs (one-time) | 2–5 consultations | ~$0 cash |
| Founder Slack/Discord (3–4 groups) | 2 hrs/week | 1–3/month | ~$0 cash |
| Twitter/X thread + replies | 2 hrs/week | 1–2/month | ~$0 cash |
| Reddit (r/ExperiencedDevs, r/startups) | 1 hr/week | 0–2/month | ~$0 cash |
| LinkedIn paid (future, post-validation) | $700/month | 3–5/month | **$140–$230/lead** |

**The core insight:** Organic CAC is near-zero because StackSave delivers real value before asking for anything. The "free audit, email after results" model is PLG by design — users self-qualify by completing an audit with real savings.

LinkedIn paid is listed for completeness but shouldn't be touched until the organic funnel is validated. At $800 LTV and $230 CAC, LinkedIn paid works at 3.5× ROAS — fine, but only worth it once the conversion rates below are proven with real data.

---

## Conversion Funnel

Starting from 1,000 monthly visitors — a realistic target after a solid Show HN launch:

| Stage | In | Rate | Out | Notes |
|---|---|---|---|---|
| Landing → audit started | 1,000 | 40% | 400 | Form is short, no login required |
| Audit started → submitted | 400 | 80% | 320 | Low drop-off; form auto-saves to localStorage |
| Submitted → savings found (>$0) | 320 | 75% | 240 | ~25% of stacks are already optimal |
| Savings found → email captured | 240 | 25% | 60 leads | Email shown after results, not before |
| Leads → high-savings (>$500/mo) | 60 | 25% | 15 qualified | These see the Credex CTA |
| High-savings → consultation booked | 15 | 20% | 3 consultations | Warm leads, not cold outreach |
| Consultation → credit purchase | 3 | 50% | **1.5 customers/month** | |

**Monthly revenue at 1,000 visitors: 1.5 customers × $800 LTV = ~$1,200/month**

The funnel is narrow — 1,000 visitors → 1–2 customers. That's intentional: this is a high-value, low-volume B2B funnel, not a consumer growth loop. The metric that matters is qualified lead quality, not total volume.

**What this means for the first month:** Don't optimize for total audits. Optimize for hitting the 20% consultation rate on high-savings leads. If that number is working, everything else is just a traffic problem.

---

## The $1M ARR Scenario

$1M ARR from StackSave-sourced leads means ~1,250 active Credex customers contributing $800 LTV each over the course of the year.

Working backwards from that target:

| Input | Required value | What has to be true |
|---|---|---|
| Active Credex customers at end of 18 months | ~400 | ~23 new customers/month by month 18 |
| Consultations to produce 23 customers/month | ~46/month (50% close rate) | Credex sales capacity has to match this |
| Qualified leads to produce 46 consultations | ~230/month (20% booking rate) | |
| Audits with savings to produce 230 qualified leads | ~920/month (25% email capture) | |
| Total audits/month | ~1,200 (75% find savings) | |
| Monthly visitors required | ~3,000 (40% complete audits) | |

**3,000 visitors/month is the real constraint.** That's achievable — it's roughly "one good Show HN post every 2 months + steady Twitter/SEO compounding." It is not a given.

The riskier assumption is **Credex sales capacity**. The funnel can generate 46 consultations/month, but if the sales team can only close 5, the bottleneck isn't StackSave. This is worth aligning on before scaling traffic.

### Stage-by-stage milestones

| Phase | Timeline | Monthly visitors | Customers added/month | ARR run rate |
|---|---|---|---|---|
| Validation | Month 1–3 | 500–1,000 | 1–3 | $10–$30k |
| Traction | Month 4–6 | 1,500–3,000 | 5–10 | $50–$100k |
| Growth | Month 7–12 | 5,000–10,000 | 15–25 | $200–$500k |
| Scale | Month 13–18 | 15,000–30,000 | 30–50 | $600k–$1M+ |

The jump from Traction to Growth depends on SEO compounding (content on "cursor pricing", "github copilot cost", "is claude pro worth it") and the share URL mechanic — every audit result is a shareable link, which is free distribution every time someone sends it to their team or CFO.

---

## Where the Funnel Breaks

Three places the math falls apart, in order of likelihood:

**1. Email capture rate < 15%**
If users complete audits but don't give their email, they either don't trust the tool or the savings numbers aren't compelling enough to act on. Fix: A/B test modal timing (3 seconds vs. after scrolling insights) and test "get your results emailed" framing vs. "join the waitlist."

**2. Audit completion rate < 20%**
If fewer than 1 in 5 visitors finish the audit, the form is too long or the value proposition isn't clear above the fold. Fix: reduce the form to 3 tools minimum, add a progress indicator, and move a sample savings number onto the landing page.

**3. High-savings consultation rate < 10%**
If qualified leads don't book a Credex consultation, either the CTA copy is unclear or they don't understand what Credex sells. Fix: add 2 sentences explaining the Credex business model on the results page before the CTA. Most users won't know what "discounted AI credits" means without context.

Each of these is measurable from the first week of real traffic. See METRICS.md for the specific trigger numbers.
