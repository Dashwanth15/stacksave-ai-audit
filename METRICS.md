# Metrics — StackSave AI Audit

## North Star Metric

**Qualified leads generated per week** (defined as: email captured on an audit showing ≥$100/month in savings)

**Why this, not DAU or total audits:**
- StackSave is a B2B lead-gen tool, not a consumer app. Most users will use it once or twice — "DAU" is a meaningless metric.
- Total audits is a vanity metric — someone can complete 100 audits with dummy data.
- A "qualified lead" represents someone who: (1) completed a real audit, (2) saw real savings, (3) trusted us enough to give their email. This person is actually convertible to a Credex consultation.
- "Per week" gives a fast feedback loop — weekly trends tell us if distribution is working before monthly summaries do.

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

## Pivot Trigger Numbers

| Metric | Current Target | Pivot Trigger |
|---|---|---|
| Audit completion rate | ≥35% | <15% after 500 visitors → simplify the form |
| Email capture rate | ≥25% | <10% after 100 audits with savings → redesign modal or change timing |
| Share rate | ≥15% | <5% after 200 audits → improve the share copy or savings display |
| Qualified leads/week | ≥5 by week 4 | 0 after week 3 with >1,000 visitors → revisit ICP or savings accuracy |
| Credex CTA CTR (high savings) | ≥15% | <5% → Credex value prop on results page isn't clear enough |

**The big pivot trigger:** If after 1,000 audit completions the average savings found is <$30/month, the tool isn't finding real waste and the audit engine needs to be recalibrated against fresher pricing data or more nuanced rules.
