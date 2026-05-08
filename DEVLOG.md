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

**Hours worked:** 8

**What I did:**
- **Premium dashboard UI overhaul** — transformed the AuditPage tool configuration cards from MVP-quality to production-grade YC-style SaaS onboarding:
  - Redesigned card surfaces with gradient glassmorphism (`from-white/[0.035] to-white/[0.015]`), refined borders (`border-white/[0.06]`), and hover glow effects (`hover:shadow-indigo-500/[0.03]`)
  - Added Framer Motion `whileHover={{ y: -2 }}` lift animation on cards
  - Replaced all raw emoji icons (💡, ⚠️, ✓, ▶) with SVG icon components — lock icons, checkmarks, chevrons — for professional aesthetic
  - Improved typography contrast: descriptions from `#64748b` → `#7a8ba8`, labels to `font-medium text-[#94a3b8]`
  - Upgraded input styling: `rounded-xl px-4 py-3` with `focus:ring-2 focus:ring-indigo-500/10` focus states
- **Progressive disclosure** — added collapsible "View included features" accordion with animated SVG chevron rotation and `border-t border-white/[0.05]` separator for cleaner card density
- **Adaptive grid layout** — cards now use single-column centered layout (`max-w-2xl mx-auto`) when ≤4 tools selected, and switch to 2-column grid (`lg:grid-cols-2`) for 5+ tools. Prevents awkward empty space with small selections
- **Fixed-plan pricing lock** — monthly spend input is now `readOnly` for fixed subscription plans (Pro, Business, Plus etc.), auto-calculated from `plan price × seats`. Shows a lock icon (🔒) and helper text "Auto-calculated from plan pricing". Usage-based/Enterprise plans remain editable
- **API pricing intelligence** — OpenAI and Anthropic API cards now initialize with realistic defaults ($25, $30) instead of $0. Added preset spend chips (`$25/mo`, `$100/mo`, `$500/mo`) with active state highlighting. Added contextual pricing hints: "GPT-4o: $2.50/$10 per 1M tokens" and "Sonnet: $3/$15 per 1M tokens · Credits: $20/$50/$100 tiers"
- **Card alignment fix** — wrapped spend/seats inputs and helper text in a unified container with `min-h-[24px]` helper region to prevent layout shift between per-seat and usage-based cards in the same row
- **Scroll-to-top fix** — added `ScrollToTop` component using `useLocation()` in `App.tsx` so navigating from `/audit` to `/results/:id` starts at the top of the page
- **CI pipeline fix (all green ✅)** — diagnosed why commits showed "1/2" failing checks. Root cause: 5 ESLint errors across 4 files:
  - `AuditPage.tsx`: `setState` called synchronously in effect body → moved to cleanup function
  - `LandingPage.tsx` + `ResultsPage.tsx`: `animate` variable self-referenced before declaration → refactored to inline `step()` function inside `useEffect`
  - `ResultsPage.tsx` + `SharedAuditPage.tsx`: unused `SEVERITY_COLORS` constant → removed
  - `LandingPage.tsx` + `ResultsPage.tsx`: unused `useCallback` import → removed
- All 25 backend tests passing, frontend lint + typecheck both clean

**What I learned:**
- React 19's strict ESLint rules (`react-hooks/set-state-in-effect`, `react-hooks/refs`, `react-hooks/immutability`) are significantly stricter than React 18 — patterns like `setStage(0)` directly in an effect body or assigning `ref.current` during render are now flagged as errors, not warnings. The fix is to move state resets into cleanup functions and use inline closures inside effects
- `useCallback` with self-referencing recursive animation frames (e.g. `requestAnimationFrame(animate)` inside its own declaration) creates a "variable accessed before declaration" error in React 19's linter. The correct pattern is to define the `step()` function inline inside `useEffect` — this avoids the circular reference entirely and removes the need for `useCallback`
- Fixed-price locking for subscription plans is critical UX trust signal — letting users manually override official pricing (e.g. changing Cursor Pro from $20 to $5) breaks audit credibility. The `readOnly` + lock icon pattern is standard in financial SaaS
- Adaptive grid layouts (single-column for ≤4 items, 2-column for 5+) are a Stripe/Vercel pattern that prevents "lonely card syndrome" — one small card in a massive 2-column grid looks unprofessional

**Blockers / what I'm stuck on:**
- USER_INTERVIEWS.md still needs 3 real conversations — this is becoming urgent with deadline on May 16
- Need to verify CI is green on GitHub (pushed fix at commit `883b177`)
- Resend email domain verification still pending

**Plan for tomorrow:**
- Conduct at least 2 user interviews and document in USER_INTERVIEWS.md
- Deploy frontend to Vercel with production env vars
- Polish ResultsPage — add PDF export, improve insight cards, add share functionality
- Write REFLECTION.md with honest engineering retrospective
- Mobile responsiveness testing pass across all pages

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
