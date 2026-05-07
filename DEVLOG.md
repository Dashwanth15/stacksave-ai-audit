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

**Hours worked:** 5

**What I did:**
- Fixed critical MongoDB connection failure — migrated from legacy `mongodb://` format to `mongodb+srv://` with DNS SRV auto-discovery. Added IPv4 force (`family: 4`) and timeout settings to handle JioFiber router DNS quirks
- Tested full API end-to-end: `POST /api/audits` (with Groq AI summary), `GET /api/audits/:id` (public-safe, strips email/companyName), `POST /api/leads` (honeypot + MongoDB), `GET /api/health` — all working
- Extracted middleware into proper modules: `middleware/honeypot.ts`, `middleware/rateLimit.ts`, `middleware/logger.ts`, `middleware/validation.ts` — matches documented architecture in ARCHITECTURE.md
- Built centralized input validation layer with bounds checking, duplicate tool detection, email regex validation. Used by both audit and leads routes
- Added 9 new validation tests (25 total, all passing) — covers edge cases: null body, empty tools, invalid tool IDs, duplicate tools, team size bounds, email format
- Added request logging middleware — logs method, path, status, and duration with emoji indicators for quick scanning
- Generated OG image (1200×630) and placed in `frontend/public/og-image.png` for social sharing previews
- Rewrote `SharedAuditPage.tsx` as a proper standalone component — no auto-email popup for visitors, "Audit My Stack" CTA for viral conversion, "Shared Audit Report" badge
- Created `useAudit` custom hook — encapsulates audit submission/fetching logic, separating API concerns from UI
- Fixed duplicate Google Fonts loading — removed from CSS (already loaded via index.html with preconnect)
- Added `leadLimiter` (10/hr/IP) to the leads route — tighter than audit since email spam is higher risk

**What I learned:**
- `mongodb+srv://` resolves via DNS SRV records which lets MongoDB Atlas handle shard auto-discovery. The old explicit-shard format fails on home routers that can't resolve internal shard hostnames
- Extracting middleware into separate files makes the app.ts ~40% shorter and each concern independently testable
- The `@` in my MongoDB password needed URL-encoding to `%40` — easy to miss, hard to debug (connection just silently fails)

**Blockers / what I'm stuck on:**
- Resend API key is still a placeholder — emails won't actually send until I add a real key. The code handles this gracefully (catch + log)
- Need to start user interviews urgently — USER_INTERVIEWS.md is still an empty template

**Plan for tomorrow:**
- Deploy frontend to Vercel, backend to Render
- Capture 3 screenshots for README.md
- Start user interview outreach (need 3 real conversations by Day 5)
- Update README with deployed URLs

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
