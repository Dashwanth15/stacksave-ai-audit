# User Interviews — StackSave AI Audit

> Notes from three real conversations conducted after sharing the deployed product.
> These were informal — DM exchanges and quick calls, not structured research sessions.

---

## Interview 1 — Tushar Yadav

**Role:** Full Stack Software Engineer, Seventure Services
**Date:** 2026-05-09
**Duration:** ~15 minutes
**How contacted:** LinkedIn DM — Tushar reached out after I shared the deployed StackSave link publicly

---

### Background

Tushar is a working software engineer, so he came at the product from a technical angle rather than a business one. He wasn't interested in the landing page or the UI — he went straight to asking how the backend worked.

### Conversation Notes

The first thing he asked was roughly "what's the logic you added for the calculation?" — not "what does it do" but specifically how the recommendations were being generated. He wanted to know whether the savings amounts were coming from the AI or from hardcoded rules. When I explained the separation — deterministic engine for math, Grok only for the summary paragraph — he pushed on the overlap detection specifically. How does it decide two tools overlap? What's the threshold? Is it category-based or use-case-based?

He also asked what the tool was actually analyzing — meaning the list of supported tools — and whether recommendations could differ for the same input on two different runs (which would indicate LLM involvement in the numbers).

### Direct Quotes

- "What is the logic you added for the calculation?"
- "Are the recommendations AI-generated or rule-based?"
- "How is the overlap between tools being calculated?"

### Most Surprising Insight

I expected feedback on the UI or the savings numbers. Instead Tushar spent almost the entire conversation on explainability and determinism — he wanted to understand whether he could trust the output before he even looked at what the output said. He didn't ask "is $X accurate?" He asked "can this ever give a different answer for the same input?" The trust question came before the accuracy question.

### What It Changed

This reinforced keeping the audit engine fully deterministic and documenting the architecture clearly. It also pushed me to make the "why" more visible in each insight card — not just the recommendation, but the reason behind it ("At $19/seat/mo, 5 unused seats cost $95/mo with zero productivity return"). An engineer reading the output needs to be able to follow the math, not just accept the conclusion.

---

## Interview 2 — Rahul Madduri

**Role:** Mechanical Engineering Student, Osmania University
**Date:** 2026-05-09
**Duration:** ~10 minutes
**How contacted:** Shared the link directly — Rahul tested the deployed version independently

---

### Background

Rahul isn't in software or startups — he's a mechanical engineering student who I asked to test the product as a normal user. He had no context on how it was built and no stake in whether the recommendations were technically sound.

### Conversation Notes

He went through the full flow — selected tools, ran the audit, downloaded the PDF, and opened the shareable link. The functional parts worked fine. He didn't have much to say about the recommendations themselves, which I think is partly because the dollar amounts weren't relatable to him — he's not managing a team's SaaS budget.

What he focused on was the deployment. The `.onrender.com` URL came up almost immediately. He said it looked like a demo or student project rather than a real product. The transactional email he received after entering his address had similar issues — it came from a Resend test domain, not a branded address, and he wasn't sure if it was legitimate.

### Direct Quotes

- "The PDF download works well."
- "The email part feels less trustworthy on a render domain."
- "Most real SaaS products use proper domains — this looks like a test environment."

### Most Surprising Insight

I was expecting feedback on the AI recommendations or the savings calculations. He didn't mention either. The entire conversation was about whether the product looked real enough to trust with his email address. He'd actually hesitated before entering it. That's a conversion problem I hadn't thought about — users may bail at the lead capture step not because the value isn't there, but because the infrastructure signals "student project."

### What It Changed

Custom domain deployment moved up in priority. A `.com` with a proper SSL cert and a branded transactional email (`audit@stacksave.com` rather than a Resend subdomain) fixes the specific trust gap he identified. It's not a product feature — it's the floor of credibility for asking someone to hand over their email.

---

## Interview 3 — Jashvanth Reddy

**Role:** Student, Woxsen University
**Date:** 2026-05-10
**Duration:** ~12 minutes
**How contacted:** Classmate — tested the deployed product and shared feedback directly

---

### Background

Jashvanth is familiar with AI coding tools and uses a few of them personally, so he had more context than Rahul on what the tool was actually auditing. He came at it from a user perspective rather than a technical one.

### Conversation Notes

He ran through the audit with a small hypothetical stack — Cursor and ChatGPT — and looked at the recommendations. He thought the overlap detection and savings numbers were useful. His main question was about what happens next. The tool tells you to cancel something or downgrade a plan — but then what? You close the tab and go find the pricing page yourself?

He suggested the product should help users act on the recommendations directly — linking to the relevant plan page at minimum, ideally offering some way to switch or purchase the suggested plan from inside the tool. He specifically mentioned that most users won't follow through if the next step requires manual effort.

He also asked whether the tool would eventually support more tools. He uses Notion AI and wasn't sure why it wasn't listed.

### Direct Quotes

- "The recommendations are useful, but users may not search for those plans manually afterward."
- "If someone wants to switch tools, the platform should help them do it directly."
- "This feels like it could become more than just an audit tool."

### Most Surprising Insight

I assumed the main value was identifying the waste. Jashvanth's point was that identifying it and acting on it are two different things — and the gap between them is where most users drop off. He's probably right. A recommendation that requires three more steps to act on has a much lower completion rate than one with a direct link or a one-click path. The audit is only useful if people actually make the changes.

### What I want to  Change in future

Add direct pricing page links to each insight card (e.g., "Switch to Cursor annual billing" links to `cursor.com/pricing`). That's a small change with real impact on follow-through. The larger suggestion — in-platform switching, affiliate integrations — is a Week 2 or later consideration, but Jashvanth's framing of "optimization platform vs. audit tool" is the right direction for where this goes if it gets traction.
