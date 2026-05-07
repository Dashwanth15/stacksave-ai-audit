# DEVLOG — StackSave AI Audit

One entry per day for the duration of the assignment.
Assignment received: 2026-05-06 | Deadline: 2026-05-16

---

## Day 1 — 2026-05-06

**Hours worked:** 6

**What I did:**
- Read the full assignment PDF carefully — identified 12 required deliverable files, the 100-point rubric, auto-rejection triggers (fewer than 5 commit days, missing files, fabricated USER_INTERVIEWS)
- Initialized Git repo, set up folder structure: `frontend/`, `backend/`, all 12 root-level markdown files
- Scaffolded backend: Express + TypeScript, Mongoose models (Audit, Lead), CORS, helmet, rate limiting
- Built the entire audit engine: `catalog.ts` (8 tools, all plans, pricing verified from official pages), `rules.ts` (7 rules), `engine.ts` (orchestrator)
- Wrote 16 audit engine tests — all pass after fixing one boundary condition in the unused-seats rule (the rule was firing at exactly 25% unused; should only fire at >25%)
- Set up Vitest config and GitHub Actions CI workflow
- Scaffolded frontend: Vite + React + TypeScript + Tailwind v4, wrote all pages (Landing, Audit form, Results, Shared)
- Integrated Grok AI service (xAI API, OpenAI-compatible) with template fallback
- Integrated Resend transactional email service
- Set up `.env.example` for both frontend and backend

**What I learned:**
- xAI's Grok API is fully OpenAI-SDK-compatible — you just change `baseURL` to `https://api.x.ai/v1`. This is a better DX than I expected.
- The assignment rubric weights Entrepreneurial thinking at 25 points — the single heaviest dimension. Most engineers probably under-invest there.
- Vitest boundary condition testing: `<= 0.25` vs `< 0.25` is the kind of off-by-one that matters in financial logic. Tests caught it before any human did.

**Blockers / what I'm stuck on:**
- Need to set up MongoDB Atlas cluster and add connection string to `.env` before backend can fully run
- Need to get Grok API key and Resend API key before the AI summary and email features can be tested end-to-end
- USER_INTERVIEWS.md requires 3 real conversations — need to start reaching out to founders this week

**Plan for tomorrow:**
- Set up MongoDB Atlas, create `.env` files with real credentials
- Test full backend API end-to-end (POST /api/audits → AI summary → MongoDB save)
- Start the frontend dev server, verify form → results flow works
- Begin reaching out to 3 founders/engineering managers for user interviews

---

## Day 2 — 2026-05-07

**Hours worked:** 7

**What I did:**
- Fixed critical MongoDB connection failure — migrated from legacy `mongodb://` format to `mongodb+srv://` with DNS SRV auto-discovery. Added IPv4 force (`family: 4`) and timeout settings to handle JioFiber router DNS quirks
- Tested full API end-to-end: `POST /api/audits` (with Groq AI summary), `GET /api/audits/:id`, `POST /api/leads`, `GET /api/health` — all working
- Extracted middleware into modules: `honeypot.ts`, `rateLimit.ts`, `logger.ts`, `validation.ts`
- **Major pricing refactor**: replaced all placeholder data with verified real-world pricing from official vendor pages
  - Cursor: 6 tiers (Hobby/Pro/$20/Pro+/$60/Ultra/$200/Teams/$40/Enterprise) with Monthly/Yearly toggle ($16/$48/$160/$32 annual)
  - ChatGPT: Added Go ($5) and Pro ($200) tiers — no annual billing for individual plans
  - Claude: Updated Pro to $17 annual/$20 monthly, added Max ($100), Team standard/premium seats
  - Windsurf: Updated to Free/Pro/$20/Max/$200/Teams/$40/Enterprise — no annual billing
  - Gemini: Added Plus/Pro/Ultra tiers with 16% annual savings
  - Anthropic API: Added credit tier info ($20/$50/$100/Custom)
- **Added Monthly/Yearly billing toggle** — pill-style buttons that auto-recalculate all tool prices, show "Annual billing not available" notice for platforms that don't offer it (ChatGPT, Windsurf)
- **Added plan features display** — each plan now shows ✓ checklist of key features with taglines, matching real pricing pages
- **Built AI chatbot**: floating bubble + sliding panel powered by Groq (llama-3.1-8b-instant), primed as AI SaaS pricing expert with quick-question chips
- Added 9 new validation tests (25 total, all passing)
- Generated OG image and rewrote SharedAuditPage as standalone component

**What I learned:**
- Real SaaS pricing is surprisingly inconsistent across vendors: Cursor has annual billing, ChatGPT doesn't for individual plans, Gemini saves 16% annually. This complexity is exactly what makes the audit tool valuable — teams don't know this stuff
- `mongodb+srv://` resolves via DNS SRV records for auto-discovery. The `@` in my MongoDB password needed URL-encoding to `%40` — silently fails without it
- Groq's llama-3.1-8b-instant is fast enough (~200ms) for a conversational chatbot UX. System prompt engineering is the key differentiator — priming with specific pricing knowledge makes the bot actually useful vs generic

**Blockers / what I'm stuck on:**
- Need to start user interviews urgently — USER_INTERVIEWS.md is still an empty template, rubric needs 3 real conversations
- Resend transactional emails are sending but some hit spam — need to verify domain DNS records

**Plan for tomorrow:**
- Deploy frontend to Vercel, backend to Render with production env vars
- Capture 3 screenshots for README.md from deployed URLs
- Start user interview outreach (need 3 real conversations by Day 5)
- Mobile responsiveness audit on the audit form page

---

## Day 3 — 2026-05-08

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 4 — 2026-05-09

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 5 — 2026-05-10

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 6 — 2026-05-11

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 7 — 2026-05-12

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 8 — 2026-05-13

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 9 — 2026-05-14

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** _[Fill in tonight]_

**Plan for tomorrow:** _[Fill in tonight]_

---

## Day 10 — 2026-05-15

**Hours worked:** _[Fill in tonight]_

**What I did:** _[Fill in tonight]_

**What I learned:** _[Fill in tonight]_

**Blockers / what I'm stuck on:** None — submission day

**Plan for tomorrow:** Submit via Google Form before deadline (2026-05-16)
