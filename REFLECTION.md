# Reflection — StackSave AI Audit

> 5 questions, answered honestly. 150–400 words each.

---

## 1. The Hardest Bug I Hit This Week, and How I Debugged It

The hardest bug was the boundary condition in the `ruleUnusedSeats` audit rule. The rule was supposed to only fire when unused seats exceeded **25%** of total seats — the reasoning being that 1 spare seat on a 4-person team is normal buffer, not waste. But my original condition was `unusedRatio < 0.25`, which meant the rule fired at **exactly** 25% unused (4 seats, 3-person team → 1 unused = 25%).

I caught this because I wrote tests before assuming the code was correct — the test explicitly said "does NOT flag when unused seats is under 25%" and the test case used exactly 25% unused. The test failed. The fix was changing `< 0.25` to `<= 0.25` in the guard condition (one character).

What I learned: in financial logic, boundary conditions matter precisely because they affect real money advice. A rule that triggers on exactly 25% vs. strictly above 25% gives different suggestions to real users. This is the kind of bug that would never appear in a manual test ("it seems about right") but is obvious in a unit test with controlled inputs. Writing the test **before** trusting the rule output was the right call.

Debugging process: (1) saw the test fail with "expected null, got Insight object", (2) read the test case — 4 seats, 3-person team, exactly 25% unused, (3) traced back to the condition in `rules.ts`, (4) confirmed `unusedRatio` was `0.25`, (5) fixed the operator, re-ran, 16/16 passing.

---

## 2. A Decision I Reversed Mid-Week, and What Made Me Reverse It

I initially planned to use **Supabase** (PostgreSQL) as the database. The implementation plan even recommended it because the assignment document names Supabase explicitly.

I reversed this after thinking through the actual data shape. Each audit stores an `insights` array where every element has a different structure depending on which rule fired — 7 different rule types, each with slightly different fields. In PostgreSQL, this would either require: (a) a JSON column (basically MongoDB behavior inside Postgres), (b) a separate `insights` table with a nullable columns for each rule type (messy), or (c) normalization that adds joins without adding value at this scale.

MongoDB's flexible document model is genuinely the right fit here — audit results are JSON blobs with variable shape, and they're read in full (never partially). There are no relational queries (no "give me all audits where insight type = 'unused_seats' and tool = 'cursor'"). The schema flexibility isn't laziness — it's the right tradeoff for an immutable audit document.

The reverse also saved setup time: I have an existing MongoDB Atlas familiarity and the connection string pattern is simple.

---

## 3. What I Would Build in Week 2 If I Had It

**Benchmark mode.** The current audit tells you what you're spending and what you could save. What it doesn't tell you is whether your spend is normal for your team size and stage.

Week 2 would add: "Your team spends $X/developer/month on AI tools. Companies at your stage (seed, 5–15 engineers) average $Y/developer/month." This requires aggregating anonymized data from submitted audits — which we're already storing in MongoDB. After 200+ audits, the data exists to compute real benchmarks rather than made-up ones.

This is high shareability: "We're in the top 20% most efficient AI spenders for our team size" is a thing a CTO would tweet. And it creates a reason to re-run the audit as the team grows — making StackSave a recurring tool rather than a one-time check.

I'd also build **PDF export** because the use case "I want to show this to my CFO or board" is real and currently requires a screenshot. A PDF with the savings hero, per-tool breakdown, and AI summary makes the audit artifact more shareable in professional contexts.

---

## 4. How I Used AI Tools

**Tools used:** Claude Sonnet (primary), Cursor (code completion)

**What I used them for:**
- Generating boilerplate TypeScript (mongoose schemas, Express route structure, React component scaffolding)
- Drafting documentation files (ARCHITECTURE.md structure, ECONOMICS.md math formatting)
- Explaining errors when TypeScript compiler messages were unclear

**What I didn't trust them with:**
- Pricing data — every number in `catalog.ts` and `PRICING_DATA.md` was manually verified from vendor pricing pages. LLMs have training cutoffs and confidently cite outdated prices.
- Audit engine logic — the rules in `rules.ts` were written by me and tested before trusting them. LLMs tend to produce plausible-looking but subtly wrong financial logic.
- Business judgment calls — GTM.md, ECONOMICS.md, and METRICS.md were written by me. An LLM can structure a document, but it can't know which Slack groups have the right density of potential users, or what a realistic conversion rate is for a tool like this.

**One specific time the AI was wrong and I caught it:**
When drafting the `ruleRetailVsCredits` description, Claude suggested the saving should be "30-50%" of API spend. I checked: the Credex business model is described in the assignment as "substantial" discounts — but 50% would be unbelievably high and would lose credibility with a CFO reading the audit. I changed the estimate to "20-40%" in the code and "~25%" for the displayed saving amount. The prompt that generated the number was confident but the number was wrong for the context.

---

## 5. Self-Rating

| Dimension | Rating | Reason |
|---|---|---|
| **Discipline** | 7/10 | Started strong on Day 1 with full architecture + audit engine. Need to maintain daily commit velocity through Week 2 without cramming. |
| **Code quality** | 8/10 | TypeScript throughout, tests written before trusting the audit logic, clean module boundaries. Loses 2 points for not having 100% type coverage in the React components (some `any` types crept into Recharts integration). |
| **Design sense** | 7/10 | Dark glassmorphism is polished and matches modern SaaS aesthetics. The results page savings hero is visually strong. Could do more with micro-animations and the results page chart styling. |
| **Problem-solving** | 8/10 | The "AI only for prose, hardcoded rules for math" architecture decision was the right product judgment call. Caught the boundary condition bug via tests rather than manual testing. |
| **Entrepreneurial thinking** | 7/10 | GTM, ECONOMICS, and METRICS are specific and grounded. The USER_INTERVIEWS.md is the weakest link — real conversations need to happen this week and the insights need to genuinely change the product. |
