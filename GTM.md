# GTM — Go-To-Market Strategy

---

## Exact Target Users

**Primary: Engineering Manager or CTO at a 5–40 person seed/Series-A startup**

Specifically: they manage 3–12 engineers, at least half of whom are using at least one AI coding tool. They approved the first Cursor or Copilot subscription without much analysis ("it's $20/month, just do it"), and then approved the second and third the same way. Now they're looking at a $2,000–$5,000/month AI tooling line item and genuinely don't know whether it's justified. They've never audited it systematically because there was no easy way to. They're not trying to eliminate AI spend — they want to feel confident the spend is rational.

Pain point in one sentence: *"I'm pretty sure we're wasting money somewhere in our AI subscriptions, but I have no benchmark and no time to figure it out."*

**Secondary: Indie hacker or solo technical founder**

They're personally paying for Claude Pro, ChatGPT Plus, and Cursor Pro simultaneously — $60/month minimum. They use each for slightly different things and have never stopped to ask whether they actually need all three. They're not price-sensitive (it's $60), but they're optimization-minded and feel mild guilt about paying for overlapping tools. They're also the most likely to share the audit result publicly.

**Not the target:**
- Large enterprises with procurement teams — they have vendor contracts and won't respond to a 2-minute form
- Non-technical founders — they don't control tool choices and can't act on the recommendations
- Teams using only free tiers — there's nothing to optimize

---

## What They Search and Scroll Before Needing This

These are the intent signals that precede wanting an audit tool. If we can be in any of these moments, we win the visit.

**Google searches:**
- "cursor pro vs hobby plan worth it"
- "github copilot business vs individual plan difference"
- "claude pro vs chatgpt plus for coding 2025"
- "how much does AI tooling cost per developer"
- "cursor vs windsurf which is better 2025"
- "is anthropic API cheaper than OpenAI"
- "cancel cursor pro" (post-purchase doubt — high intent)

**HN threads they read:**
- "Ask HN: How much does your team spend on AI tools?"
- "Ask HN: Has anyone done a proper cost-benefit analysis of Cursor/Copilot?"
- Any Show HN about AI tooling or developer cost optimization

**Twitter/X moments:**
- A founder tweets "our AI tool bill hit $3k this month, not sure all of it is being used"
- Someone posts a screenshot of their Stripe/Notion/Linear billing page and people reply with their own AI tool costs
- A debate thread about Cursor vs. Copilot that devolves into "it depends what you're paying for it"

**The frustration moment that precedes the click:**
An EM looks at a company credit card statement and sees 4 separate AI subscriptions — 2 of which are the same category — and searches "do I need both Claude and ChatGPT for a dev team."

---

## Where They Actually Hang Out

Specific enough to post in today:

| Channel | What to do there |
|---|---|
| **Hacker News** | "Show HN" at 9am ET on a Tuesday–Thursday. "Ask HN: what's your per-developer AI tool cost?" also works well as a discussion seeder |
| **r/ExperiencedDevs** | One of the few subreddits where eng managers and senior devs talk about team tooling honestly. Not r/programming (too broad) |
| **r/startups** | Founders talking about burn rate and tooling. A post framed as "I built a tool to audit AI subscriptions after we found $400/month of waste" works here |
| **r/LocalLLaMA** | Power users who are already thinking critically about AI tool costs and alternatives. Will audit their stack out of curiosity |
| **Cursor's official Discord** | ~100k members, many of whom are active subscribers wondering if Pro is worth it. A genuine post in #general gets seen by exactly the right people |
| **Anthropic/Claude Discord** | Same logic — paying users who are already thinking about value-for-money |
| **Indie Hackers community** | The tools/resources section (not just the product launch section). Founders who will try anything that saves them money |
| **YC's online community (Bookface)** | If accessible: YC founders are the exact ICP and trust tools that other founders built |
| **Twitter/X — build-in-public accounts** | Reply substantively to anyone who tweets about AI tool costs. Don't link immediately — add value first, link in reply to yourself |
| **The Pragmatic Engineer newsletter** | Gergely Orosz covers developer tools and costs. A cold email with a genuine product story has a nonzero chance of a mention |

**Channels that sound good but aren't worth time:**
- LinkedIn: too noisy, eng managers aren't in "optimize tooling" mode when scrolling
- ProductHunt: wrong audience for B2B lead-gen at this stage; engineers who launch on PH are themselves founders, not buyers
- General "AI" Discord servers: too broad, too consumer-focused

---

## First 100 Users with $0 Paid Budget

**Week 1 — Warm network and Credex list (target: 30–40 audits)**

The Credex customer list is the highest-leverage first move. These people are already paying for AI credits and thinking about AI spend. One email:

> Subject: We built a free audit tool for your AI subscriptions  
> "Hey — we built a 2-minute tool that audits AI tool spend for engineering teams. No login, no sales pitch. Just plug in your stack and see where you're overpaying. Thought you'd find it useful: [link]. Takes 2 min."

Don't ask for a consultation in this email. Let the tool ask for it after showing the savings.

Alongside that: post in 3 founder/eng Slack channels you're already in. Not a launch announcement — a conversation opener:

> "I've been thinking about how nobody actually benchmarks their AI tool costs across a team. Built a quick audit tool to answer the question — would love feedback from anyone paying for Cursor/Claude/Copilot."

**Week 2 — Hacker News (target: 50–80 audits if it lands)**

Title: `Show HN: StackSave – free audit tool for AI subscription overspend`

The comment that matters is the first reply from the author. Pre-write a comment that shares a real finding: "Most teams we've audited are paying for at least 2 tools in the same category. The most common waste pattern is Cursor + GitHub Copilot simultaneously — $30–$60/month per developer for near-identical functionality."

If it reaches the front page (>40 points), expect 300–600 visits in 48 hours. Even at 40% completion rate, that's 120–240 audits.

If it doesn't land: post "Ask HN: How much does your team spend per developer on AI tools? We built a tool to audit this after getting surprised by our own bill." Discussion threads like this regularly hit the front page and are lower-risk than Show HN.

**Week 3 — Twitter/X thread (target: 20–30 audits)**

The hook that works: personal story + surprising number + free tool.

> "I ran our startup's AI tool stack through a quick audit and found we were paying for 3 overlapping tools serving the same use case. $240/month, gone. Here's what I found and the tool I built to catch it: [link] [thread 🧵]"

Then in replies: screenshot of an anonymized audit result showing the savings. The shareable audit URL is the distribution mechanic here — people forward these internally to their team or CFO without being asked to.

Reply to every tweet from founders complaining about AI tool costs. Not with a link — with a useful response. Add the link in a reply to yourself two days later once the conversation is warm.

**Week 4 — Reddit and niche communities (target: 15–20 audits)**

r/ExperiencedDevs: frame it as a question, not a launch.
> "For those of you managing teams with Cursor/Copilot/Claude subscriptions — do you know your per-developer AI tooling cost? We put together a free calculator/audit after realizing we had no benchmark. Curious what others are paying."

Cursor Discord: find the channel where people discuss plans and costs. Participate in an existing thread first. Then drop the tool link naturally when someone asks "is Pro worth it for a team of 8?"

**Total realistic 30-day target: 80–120 completed audits, 20–35 email captures, 2–4 users flagged high-savings.**

---

## The Unfair Distribution Advantage

Three things that are hard for an external product to replicate:

**1. The Credex customer list is the exact ICP, pre-warmed.**
Credex already has relationships with companies that buy AI credits — meaning they're already spending seriously on AI infrastructure and are already thinking about cost. A cold email from Credex to their own customers isn't outbound; it's a product update from a trusted vendor. Conversion rate on this channel is meaningfully higher than cold.

**2. The shareable audit URL creates internal distribution.**
When a CTO runs an audit and finds $600/month in savings, they don't keep it to themselves — they share it with their team or CFO. Every shared URL is a warm impression with context ("look what I found") that no paid ad can replicate. The product is designed for this: the public share URL strips private fields and renders cleanly as a standalone page.

**3. High-savings audits create a natural upsell moment with no friction.**
The Credex CTA only appears on audits showing >$500/month in savings. At that savings level, the user is already in "I need to fix this" mode — the Credex pitch (discounted credits to reduce API spend further) lands on someone ready to act, not someone who needs convincing. This is the opposite of a cold outbound sequence.

---

## Week-1 Traction Expectations

These assume a solid Show HN launch (40–60 points) plus the Credex customer email going out the same week:

| Metric | Realistic | If HN Front Page |
|---|---|---|
| Unique visitors | 200–400 | 600–1,000 |
| Completed audits | 80–160 | 240–400 |
| Email captures | 20–40 | 60–100 |
| High-savings audits (>$500/mo) | 5–10 | 15–25 |
| Credex consultations booked | 1–2 | 3–5 |
| Audits shared via URL | 5–15 | 20–40 |

The number to watch isn't total visits — it's the consultation booking rate on high-savings audits. If 3–5 high-savings users are shown the Credex CTA and 0 book a call, the CTA copy needs work, not the traffic volume.
