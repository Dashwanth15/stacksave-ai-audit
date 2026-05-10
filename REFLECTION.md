# Reflection — StackSave AI Audit

> 5 questions, answered honestly. 150–400 words each.

---

## 1. The Hardest Bug I Hit This Week, and How I Debugged It

The hardest bug was the boundary condition in the `ruleUnusedSeats` audit rule. The rule was supposed to only fire when unused seats exceeded **25%** of total seats — the reasoning being that 1 spare seat on a 4-person team is normal buffer, not waste. But my original condition was `unusedRatio < 0.25`, which meant the rule fired at **exactly** 25% unused (4 seats, 3-person team → 1 unused = 25%).

I caught this because I wrote tests before assuming the code was correct — the test explicitly said "does NOT flag when unused seats is under 25%" and the test case used exactly 25% unused. The test failed. The fix was changing `< 0.25` to `<= 0.25` in the guard condition (one character).

Before landing on that fix, I ran through two wrong hypotheses first. My initial guess was that `unusedSeats` was being computed incorrectly — off-by-one in `entry.seats - ctx.teamSize`. I added a console log and confirmed the value was `1`, which was correct. My second hypothesis was that the `unusedRatio` division was producing a floating-point artifact (something like `0.2500000001`). I logged that too — it was exactly `0.25`. At that point the only remaining explanation was the operator itself, and it was obvious once I looked.

What I learned: in financial logic, boundary conditions matter precisely because they affect real money advice. A rule that triggers on exactly 25% vs. strictly above 25% gives different suggestions to real users. This is the kind of bug that would never appear in a manual test ("it seems about right") but is obvious in a unit test with controlled inputs. Writing the test **before** trusting the rule output was the right call — the test caught this before any user could see a spurious recommendation.

Debugging process: (1) saw the test fail with "expected null, got Insight object", (2) read the test case — 4 seats, 3-person team, exactly 25% unused, (3) logged `unusedSeats` — correct at `1`, (4) logged `unusedRatio` — exactly `0.25`, no float artifact, (5) identified the operator, changed `< 0.25` to `<= 0.25`, re-ran, 16/16 passing.

---

## 2. A Decision I Reversed Mid-Week, and What Made Me Reverse It

I initially planned to use **Supabase** (PostgreSQL) as the database. The implementation plan even recommended it because the assignment document names Supabase explicitly.

I reversed this after thinking through the actual data shape. Each audit stores an `insights` array where every element has a different structure depending on which rule fired — 7 different rule types, each with slightly different fields. In PostgreSQL, this would either require: (a) a JSON column (basically MongoDB behavior inside Postgres), (b) a separate `insights` table with nullable columns for each rule type (messy schema with structural nulls), or (c) normalization that adds joins without adding value at this scale.

The core issue is that audit documents are immutable blobs — they're written once and read in full. There's never a query like "give me all audits where insight type = 'unused_seats' and tool = 'cursor'". When the access pattern is always "fetch the whole document by ID", a relational model adds join complexity with no query benefit. MongoDB's flexible document model is genuinely the right fit here — not because it's easier to set up, but because the data shape and access pattern actually match it.

It's also worth noting: the assignment recommending Supabase isn't a reason to use it if the data model doesn't fit. Recommendations in specs are defaults, not requirements. The right call is to match the database to the actual data shape and justify the deviation clearly — which is what ARCHITECTURE.md does.

The reverse also saved setup time: I have existing MongoDB Atlas familiarity and the connection string pattern is simple. But the setup speed was secondary — the architectural fit was the real reason.

---

## 3. What I Would Build in Week 2 If I Had It

**Benchmark mode.** The current audit tells you what you're spending and what you could save. What it doesn't tell you is whether your spend is normal for your team size and stage.

Week 2 would add: "Your team spends $X/developer/month on AI tools. Companies at your stage (seed, 5–15 engineers) average $Y/developer/month." This requires aggregating anonymized data from submitted audits — which we're already storing in MongoDB. After 200+ audits, the data exists to compute real benchmarks rather than made-up ones.

This matters for a few reasons. First, it's high shareability: "We're in the top 20% most efficient AI spenders for our team size" is a thing a CTO would tweet, which is free distribution. Second, it creates a reason to re-run the audit as the team grows — turning StackSave from a one-time check into a recurring tool with retention. Third, the aggregated benchmark data becomes a defensible moat over time: it's real, anonymized spend data from real startups, which no competitor can replicate without the same audit volume. The more audits run, the more accurate the benchmarks, the more valuable the product — a compounding data advantage that starts small but gets stronger.

**PDF export** is the second priority, because "I want to show this to my CFO or board" is a real use case that currently requires a screenshot. A structured PDF — savings hero, per-tool breakdown, AI summary, audit ID — makes the output shareable in professional contexts where a browser link isn't appropriate. It also signals product maturity: tools that can be presented to finance teams get taken more seriously than browser-only experiences. The internal sharing use case is also how word spreads inside companies — one CTO shares the PDF in a Slack channel, three others run their own audit.

---

## 4. How I Used AI Tools

**Tools used:** Claude Sonnet (primary), Cursor (code completion)

**What I used them for:**
- Generating boilerplate TypeScript (mongoose schemas, Express route structure, React component scaffolding)
- Drafting documentation files (ARCHITECTURE.md structure, ECONOMICS.md math formatting)
- Explaining errors when TypeScript compiler messages were unclear

AI meaningfully accelerated implementation speed — scaffolding a typed Mongoose schema or an Express route with correct middleware ordering is mechanical work where generation is faster than typing. That's the right use: eliminate the boilerplate cost so engineering time goes to the decisions that actually matter.

**What I didn't trust them with:**
- Pricing data — every number in `catalog.ts` and `PRICING_DATA.md` was manually verified from vendor pricing pages. LLMs have training cutoffs and confidently cite outdated prices.
- Audit engine logic — the rules in `rules.ts` were written by me and tested before trusting them. LLMs tend to produce plausible-looking but subtly wrong financial logic.
- Business judgment calls — GTM.md, ECONOMICS.md, and METRICS.md were written by me. An LLM can structure a document, but it can't know which Slack groups have the right density of potential users, or what a realistic conversion rate is for a tool like this.

**One specific time the AI was wrong and I caught it:**
When drafting the `ruleRetailVsCredits` description, Claude suggested the saving should be "30-50%" of API spend. I checked: the Credex business model is described in the assignment as "substantial" discounts — but 50% would be unbelievably high and would lose credibility with a CFO reading the audit. I changed the estimate to "20-40%" in the code and "~25%" for the displayed saving amount. The prompt that generated the number was confident but the number was wrong for the context.

This was AI-assisted engineering, not AI-generated outsourcing. The generation handled the mechanical parts; the judgment — what's defensible, what's realistic, what a finance person would actually trust — stayed with me.

---

## 5. Self-Rating

| Dimension | Rating | Reason |
|---|---|---|
| **Discipline** | 9/10 | Started strong on Day 1 with full architecture + audit engine. Need to maintain daily commit velocity through Week 2 without cramming. |
| **Code quality** | 8/10 | TypeScript throughout, tests written before trusting the audit logic, clean module boundaries. Loses 2 points for not having 100% type coverage in the React components (some `any` types crept into Recharts integration). |
| **Design sense** | 8/10 | Dark glassmorphism is polished and matches modern SaaS aesthetics. The results page savings hero is visually strong. Could do more with micro-animations and the results page chart styling. |
| **Problem-solving** | 10/10 | The "AI only for prose, hardcoded rules for math" architecture decision was the right product judgment call. Caught the boundary condition bug via tests rather than manual testing. |
| **Entrepreneurial thinking** | 9/10 | GTM, ECONOMICS, and METRICS are specific and grounded. The USER_INTERVIEWS.md is the weakest link — real conversations need to happen this week and the insights need to genuinely change the product. |
