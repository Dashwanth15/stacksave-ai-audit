# Metrics — StackSave AI Audit

## North Star Metric

**Qualified leads generated per week** (defined as: email captured on an audit showing ≥$100/month in savings)

**Why this, not DAU or total audits:**
- StackSave is a B2B lead-gen tool, not a consumer app. Most users will use it once or twice — "DAU" is a meaningless metric.
- Total audits is a vanity metric — someone can complete 100 audits with dummy data.
- A "qualified lead" represents someone who: (1) completed a real audit, (2) saw real savings, (3) trusted us enough to give their email. This person is actually convertible to a Credex consultation.
- "Per week" gives a fast feedback loop — weekly trends tell us if distribution is working before monthly summaries do.
- This metric maps directly to Credex revenue potential. A qualified lead with ≥$100/month in savings is someone spending real money on AI infrastructure — the exact customer Credex exists to serve. Ten qualified leads per week is worth more than 10,000 page views from the wrong audience.

**Leading vs. lagging:** Qualified leads/week is the lagging outcome — it tells you whether the business is working. Audit completion rate, email capture rate, and share rate are the leading indicators that predict it. If those three are healthy, qualified leads follow. If the north star is weak, the leading metrics tell you exactly where the funnel is leaking.

---

## Three Input Metrics That Drive the North Star

### 1. Audit Completion Rate
**Formula:** Audits submitted / Landing page unique visitors
**Current baseline:** Unknown (Day 1)
**Target:** ≥35%
**Why it matters:** A low completion rate means the form is too long, too confusing, or the value proposition isn't clear enough on the landing page. This is the first conversion step — everything downstream depends on it.

### 2. Email Capture Rate (on audits showing >$0 savings)
**Formula:** Emails captured / Audits with savings > $0
**Current baseline:** Unknown
**Target:** ≥25%
**Why it matters:** If people complete the audit but don't give their email, they don't trust us or the savings weren't compelling enough. This also determines whether the modal timing (3 seconds after results load) is right.

### 3. Share Rate
**Formula:** Unique share URL visits / Total audits completed
**Current baseline:** Unknown
**Target:** ≥15% (1 in 7 audit results gets shared)
**Why it matters:** Organic sharing is the free growth engine. Each share is a free impression with warm context ("my colleague found $340/mo in savings"). If sharing isn't happening, either the savings aren't impressive or the share UX is broken.

At MVP stage, shareability matters more than retention. Most users will run one audit and not return — that's fine and expected. The question is whether that single session generates a referral. One user sharing their results with three colleagues is worth more than three users returning to a product they've already extracted value from. A shared audit link is warm-context acquisition: the recipient already knows what was found and approximately what to expect, which drives higher completion rates than cold traffic.

---

## What We'd Instrument First

In priority order (Day 1 of real production traffic):

1. **Page views → audit form open rate** — Is the hero CTA converting? (Google Analytics or Posthog)
2. **Audit form → submission rate** — Where do people drop off in the form? (Posthog session replay)
3. **Submission → results page load** — Is the API timing out? (Sentry + backend latency logs)
4. **Results page → email modal shown → email submitted** — Capture funnel (custom events)
5. **Share URL visits per audit** — Track which audits get shared (MongoDB analytics query)
6. **High-savings (>$500/mo) → Credex CTA click rate** — Is the Credex button working? (UTM parameters on the Credex link)

Tools: Start with **Posthog** (free, self-hostable, session replay + events). Add Sentry for error monitoring. Skip Google Analytics until Posthog is saturated.

---

## Metrics We Intentionally Ignore

- **DAU / WAU / MAU** — Irrelevant for a tool people use once or twice. High DAU on a one-time audit tool means bots or confused users, not engagement.
- **Time on site** — Optimizing for time on site would push toward adding unnecessary complexity. A fast audit that converts is better than an elaborate one that entertains.
- **Raw page views** — Page views without audit completions are just ad impressions. Traffic that doesn't convert tells you nothing about product-market fit.
- **Total signups / emails collected** — Volume without savings context is noise. An email from someone who found $12/month in savings is not equivalent to one from someone who found $800/month. Aggregating them together obscures what the funnel is actually producing.

The pattern: at this stage, vanity metrics are actively dangerous because they create the impression of traction before it exists. A small number of high-intent actions is a better signal than large numbers of low-intent ones.

---

## Pivot Trigger Numbers

| Metric | Current Target | Pivot Trigger |
|---|---|---|
| Audit completion rate | ≥35% | <15% after 500 visitors → simplify the form |
| Email capture rate | ≥25% | <10% after 100 audits with savings → redesign modal or change timing |
| Share rate | ≥15% | <5% after 200 audits → improve the share copy or savings display |
| Qualified leads/week | ≥5 by week 4 | 0 after week 3 with >1,000 visitors → revisit ICP or savings accuracy |
| Credex CTA CTR (high savings) | ≥15% | <5% → Credex value prop on results page isn't clear enough |

**The big pivot trigger:** If after 1,000 audit completions the average savings found is <$30/month, the tool isn't finding real waste and the audit engine needs to be recalibrated against fresher pricing data or more nuanced rules.

Low average savings is the existential risk for this product — more so than low traffic or low email capture. Those are distribution and UX problems, which are fixable. But if the engine consistently surfaces weak recommendations, trust collapses fast. A user who acts on a suggestion and finds it was wrong, or who shows the audit to their CFO and can't defend the numbers, won't come back and won't share. "No savings found" is an honest and acceptable result — some stacks are genuinely well-optimized. Consistently finding $8/month across every audit is worse than that, because it signals the engine is reaching rather than finding real waste, and that's the kind of thing word-of-mouth kills quickly.
