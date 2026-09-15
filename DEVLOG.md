# DEVLOG — StackSave AI Engineering Log

A comprehensive chronological development log detailing the 4-month engineering evolution of StackSave AI from initial project scaffolding to full enterprise production.

---

## 3-Month Engineering Roadmap & Architecture Timeline

- **Project**: StackSave AI (Enterprise AI Spend Intelligence & Autonomous Architecture Recommendation Platform)
- **Active Development Window**: May 6, 2026 – September 16, 2026 (18 Weeks · 85+ Commits)
- **Production URL**: `https://stacksaveai.com/` (Render Web Services + GoDaddy DNS + MongoDB Atlas)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   4-MONTH SYSTEM DEVELOPMENT PHASES                                    │
├──────────────────────┬──────────────────────┬──────────────────────┬───────────────────────────────────┤
│  PHASE 1 (MAY 2026)  │  PHASE 2 (JUL 2026)  │  PHASE 3 (AUG 2026)  │       PHASE 4 (SEP 2026)          │
│ Core Audit Engine,   │ Grid Balancing,      │ Build My Stack Flow, │ Playwright Scraper Pipeline,      │
│ Living Re-Audits &   │ Mobile Responsive UI │ Platform Weights,    │ Anti-404 Quarantine, GA4 Telemetry│
│ PDF Document Engine  │ & Render Hardening   │ Custom Domain & DNS  │ & 50+ Verified Offers Directory   │
└──────────────────────┴──────────────────────┴──────────────────────┴───────────────────────────────────┘
```

---

## Phase 1: Inception, Deterministic Math & Living Re-Audits (May 2026)

### Day 1 — 2026-05-06: Monorepo Foundation & 7-Rule Audit Engine
**Hours worked:** 6.5  
**Key Commits:** `ad0f15e` (Initial commit), `9471bc1` (Project initialization), `b8a0033` (Type import fix), `f557608` (Database & AI keys)
- **What Was Built**:
  - Initialized monorepo with strict decoupling: `frontend/` (React 19 SPA + Vite + Tailwind CSS v4) and `backend/` (Node.js 20+ Express + TypeScript).
  - Designed `catalog.ts` containing the initial 8 AI tools with verified baseline pricing and capability profiles.
  - Implemented the deterministic 7-rule audit engine in `rules.ts`: duplicate tools, unused seats, unused tiers, retail vs. credit arbitrage, annual billing discounts, bundle savings, and companion downgrades.
  - Configured Vitest and wrote 16 unit tests for boundary conditions.
  - Connected MongoDB Atlas cluster with Mongoose models for `Audit` and `Lead` collections.
- **What Was Learned**:
  - Financial auditing requires 100% deterministic TypeScript logic. Generative LLMs hallucinate prices and calculation totals; confining LLMs purely to prose generation ensures zero mathematical errors.
  - A boundary condition in `ruleUnusedSeats` fired at exactly 25% spare capacity because the guard used `< 0.25` instead of `<= 0.25`. Unit tests caught this prior to commit.

---

### Day 2 — 2026-05-07: Verified Vendor Pricing & AI Spend Advisor
**Hours worked:** 7.5  
**Key Commits:** `ccadc14` (Middleware & validation), `7f0bead` (Real plan pricing), `a807ac4` (Chatbot integration), `ef0751d` (Lint & test fixes)
- **What Was Built**:
  - Extracted backend middleware: `rateLimit.ts` (100 req/15m public, 10 req/15m audit submit), `honeypot.ts`, and `validation.ts`.
  - Replaced mock values with real pricing tables: Cursor (6 tiers with annual discounts), ChatGPT (Plus $20/mo, Pro $200/mo, Team), Claude (Pro, Team, Max), Windsurf, and Gemini.
  - Implemented `/api/chat` with Groq (`llama-3.3-70b-versatile`) primed as an AI procurement advisor with quick-question suggestion chips.
  - Added 9 validation test suites (25 total passing).
- **What Was Learned**:
  - Real-world SaaS pricing is heterogeneous: Cursor offers 20% annual savings, ChatGPT does not offer annual billing for individuals, and Gemini discounts 16%. Normalizing these into unified monthly/annual figures is essential for credible audits.

---

### Day 3 — 2026-05-08: UI Design System & Progressive Disclosure
**Hours worked:** 8.0  
**Key Commits:** `1ffa17f` (Dashboard UI overhaul), `ea6a4bf` (Responsive layout), `f268da8` (Two-row desktop grid), `883b177` (CI lint fixes)
- **What Was Built**:
  - Styled tool selection cards with dark glassmorphic tokens (`bg-white/[0.03]`, hairline borders `border-white/[0.08]`, hover glow).
  - Implemented progressive disclosure accordions on tool cards, seat steppers, and read-only fixed pricing locks for subscription tiers.
  - Added adaptive layout logic: single-column centered grid for $\le 4$ tools, switching dynamically to two-column grid for $5+$ tools.
  - Resolved 5 React 19 linter errors regarding synchronous `setState` inside effect hooks and circular animation frame closures.
- **What Was Learned**:
  - React 19's hook semantics strictly penalize state mutation during render cycles. Resets must be moved into cleanup functions, and animation loops must be enclosed in self-contained inline closures.

---

### Day 4 — 2026-05-09: Production Hardening & Render Deployment
**Hours worked:** 7.0  
**Key Commits:** `584305d` (Render deployment readiness), `5108146` (Backend bug fixes), `b41fc1c` (SPA server routing), `5b73994` (Domain URL binding)
- **What Was Built**:
  - Deployed full stack to Render Web Services.
  - Authored custom Node.js static server (`server.js`) with client-side SPA history fallback, brotli/gzip compression, and cache headers for Vite chunks.
  - Resolved production CORS configuration and tightened domain reflection headers.
  - Fixed Gmail and Resend transactional email delivery issues under production IP pools.
- **What Was Learned**:
  - Single-Page Applications on cloud containers require an explicit Express history fallback server to prevent 404s when users refresh dynamic routes like `/results/:id`.

---

### Day 5 — 2026-05-10: Executive PDF Engine Architecture
**Hours worked:** 8.5  
**Key Commits:** `5d73177` (PDF export), `b038f7e` (PDF layout), `b4be544` (Document-first architecture), `4240712` (Branding polish), `818cd67` (ToolEntry typing)
- **What Was Built**:
  - Engineered client-side executive PDF export via `jsPDF` (`pdfService.ts`).
  - Separated document coordinate math from DOM rendering to guarantee consistent vector layouts across operating systems.
  - Formatted multi-page reports: Executive Spend Summary, Line-Item Consolidation Actions, and Audit Verification Hash.
  - Replaced loose `any` types with strictly typed `ToolEntry` domain interfaces.
- **What Was Learned**:
  - Web typography behaves differently in print canvases. Standardizing coordinate grid offsets with programmatic text wrapping avoids cross-browser layout clipping.

---

### Day 6 — 2026-05-11: Value-Added CTA & Credex Integration
**Hours worked:** 5.5  
**Key Commits:** `ed4588f` (Credex CTA section), `6557853` (CTA polish), `97286d6` (Results page layout), `372a5c2` (Button copy optimization)
- **What Was Built**:
  - Added high-savings consultation CTA on the results dashboard for teams spending $> \$500/\text{mo}$.
  - Positioned secondary credit program introductions below the primary savings breakdown.
  - Optimized CTA button microcopy and conversion event tracking.

---

### Day 7 — 2026-05-20: Living Audits, Snapshots & Re-Audit Engine
**Hours worked:** 8.5  
**Key Commits:** `39f24f2` (Persistent pricing snapshots), `9e6ddd7` (Pricing change detection), `629e833` (Re-audit diff engine), `2227802` (Living audit workflows)
- **What Was Built**:
  - Transitioned StackSave from one-time audits to a **Living Audit Architecture**.
  - Implemented historical pricing snapshot storage within MongoDB `Audit` documents.
  - Built the re-audit engine comparing an updated stack against a baseline audit to generate savings deltas and tool replacement diffs.
  - Developed `/api/audit/re-audit` endpoint computing line-item adjustments across seats, tiers, and net monthly spend.
- **What Was Learned**:
  - Audits cannot be static blobs; companies evolve their engineering teams continuously. Storing an immutable snapshot of vendor pricing at audit creation time guarantees historical audit reproducibility even if vendor prices rise later.

---

### Day 8 — 2026-05-21: Multi-Version Re-Audit UI & Rate Limit Tuning
**Hours worked:** 9.0  
**Key Commits:** `b17a0cc` (Multi-version change diffs), `b51ca9b` (3+ version comparison), `5117ad4` (Render trust proxy & rate limits), `d2b9521` (Render stabilization)
- **What Was Built**:
  - Built `ReAuditDiffPage.tsx` rendering lineage timelines (v1 $\to$ v2 $\to$ v3+).
  - Resolved 429 Too Many Requests errors on Render by configuring Express `trust proxy` and expanding rate-limit buckets for high-traffic sessions.
  - Hardened frontend error boundaries against missing tool entries in legacy audits.
- **What Was Learned**:
  - Behind a reverse proxy (like Render's routing mesh), Express reads the proxy's IP rather than the client's unless `app.set('trust proxy', 1)` is enabled, which previously caused all visitors to share a single rate-limiting bucket.

---

### Day 9 — 2026-05-22: CI/CD Pipeline Stability & Hook Refactoring
**Hours worked:** 6.0  
**Key Commits:** `830196e` (CI MongoDB URI secrets), `b94eba1` (State-reset & hook reference fixes), `36c3bc4` (Fallback MongoDB URI in tests)
- **What Was Built**:
  - Configured GitHub Actions CI secrets with fallback MongoDB mock URIs for containerized test suites.
  - Refactored `AuditPage.tsx` and `ReAuditDiffPage.tsx` to eliminate unstable hook references and lingering React hook warnings.
  - Verified all 25 backend integration tests pass in isolated CI containers.

---

## Phase 2: UI Evolution & Desktop Grid Balancing (July 2026)

### Day 10 — 2026-07-18: Desktop Platform Grid Balancing
**Hours worked:** 5.0  
**Key Commits:** `f18cbcc` (Balance platform grid), `3d45c6d` (StepBadge lint cleanup), `ce00fdc` (Branch merge)
- **What Was Built**:
  - Rebalanced the audit platform grid for ultra-wide desktop monitors, expanding summary sidebars to maintain scannability.
  - Cleaned up `StepBadge` component props and eliminated TypeScript interface warnings.

---

### Day 11 — 2026-07-19: Landing Page & Deployment Sync
**Hours worked:** 6.0  
**Key Commits:** `993abae` (Landing page update), `da77c99` (Deployment issue resolution), `4ec61d4` (Merge re-audit branch), `7526e17` (Push to main)
- **What Was Built**:
  - Refreshed marketing copy on `LandingPage.tsx` highlighting living audit features and annualized run-rate recovery.
  - Resolved production build script mismatches on Render and synchronized repository branches.

---

### Day 12 — 2026-07-22: Report Visual Hierarchy & Card Refinements
**Hours worked:** 7.0  
**Key Commits:** `f98ea7a` (Audit, landing & report UI overhaul), `6c94dd7` (Frontend issue fixes)
- **What Was Built**:
  - Enhanced report visual hierarchy: elevated savings delta badges, clearer typography contrast, and polished card elevation.
  - Fixed mobile responsive layout collapse on audit tool selector rows.

---

## Phase 3: "Build My Stack" Flow, Intelligence & Custom Domain (August 2026)

### Day 13 — 2026-08-14: Recommendation Logic & SaaS Polish
**Hours worked:** 7.5  
**Key Commits:** `b3f931d` (Audit recommendations & SaaS UI), `22d4f8f` (Deployment bug fixes)
- **What Was Built**:
  - Expanded recommendation engine to analyze capability dominance across multi-model subscriptions.
  - Elevated UI surface aesthetics with modern typography and refined border tokens.

---

### Day 14 — 2026-08-16: Strategic Decision Guidance Integration
**Hours worked:** 6.0  
**Key Commits:** `058631a` (Strategic Decision Guidance component)
- **What Was Built**:
  - Developed `StrategicGuidanceSection.tsx`: delivers qualitative architectural advice accompanying line-item mathematical savings.
  - Modeled migration risk, team learning curves, and vendor lock-in considerations.

---

### Day 15 — 2026-08-21: Official Pricing & Offer Ingestion Engine
**Hours worked:** 8.5  
**Key Commits:** `d9bba3e` (Official pricing & offer intelligence), `3f569b6` (Lint & test cleanup), `2559d70` (Workflow fixes), `34766de` (Notification bar & landing UI)
- **What Was Built**:
  - Introduced the automated AI Offers subsystem (`/offers`).
  - Added structured offer schemas covering Partner Bundles, Education/Student deals, API discounts, Annual savings, and Startup grants.
  - Implemented top notification banner announcing newly verified AI vendor pricing updates.
  - Cleared GitHub Actions CI workflow failures across frontend and backend builds.

---

### Day 16 — 2026-08-23: "Build My Stack" 4-Step Architecture Flow
**Hours worked:** 9.0  
**Key Commits:** `ae98694` (Four-flow stack builder), `93c4b2b` (Domain bias fix), `efa8189` (PR #2 merge)
- **What Was Built**:
  - Built the complete **Build My Stack** workflow (`/build-stack`):
    - Step 1: Operating Domain (Software Engineering, Data Science, AI/ML, Content, Product).
    - Step 2: Team Scale & Monthly Budget Ceiling.
    - Step 3: Granular Capability Needs (Code generation, reasoning, multimodal, context window).
    - Step 4: Strategic Mandate (Performance vs. Balanced vs. Cost-Optimized).
  - Fixed a domain scoring bias where generic software development requirements disproportionately penalized specialized AI platforms.

---

### Day 17 — 2026-08-26: Multi-Signal Platform Ranking Engine
**Hours worked:** 8.0  
**Key Commits:** `94978c4` (Accurate platform weights & UI interactivity), `9593097` (Backend platform weight adjustments)
- **What Was Built**:
  - Implemented `PlatformRankingEngine.ts` with transparent, multi-signal scoring:
    - Market Adoption (25%), Capabilities (25%), Ecosystem (15%), Growth (10%), Reliability (10%), Value (10%), Partner Deals (5%), and Data Confidence.
  - Added frontend interactivity on recommendation cards with deep-dive procurement drawers.
- **What Was Learned**:
  - Hardcoded platform rankings are indefensible. Weighting platforms mathematically across verified signals produces recommendations that engineering teams respect.

---

### Day 18 — 2026-08-28: Custom Domain, Mobile Pan-Scrolling & Resilient Chat
**Hours worked:** 9.5  
**Key Commits:** `04408a1` (Enterprise builder selections), `da04171` (GoDaddy CORS & backend routing), `2433a30` (Email notifications), `9399c03` (Groq model fallback), `d567cc8` (Chat diagnostics), `a68094e` / `5b0a224` (Touch pan-x/pan-y scrolling), `0810a68` (Mobile viewport containment)
- **What Was Built**:
  - Configured production domain `https://stacksaveai.com/` with GoDaddy DNS routing and updated backend CORS allowed origins.
  - Added resilient fallback models on `/api/chat` to handle Groq upstream rate limits gracefully.
  - Fixed touch event conflicts on mobile devices: enabled bidirectional `pan-x pan-y` scrolling across tool cards and multi-step progress indicators.
  - Contained dropdown notification menus within mobile screen bounds.

---

### Day 19 — 2026-08-29: Google Analytics 4 (GA4) Telemetry & Brand Assets
**Hours worked:** 7.5  
**Key Commits:** `3a592e4` (Outcome-focused headline), `85ccc26` (Network port binding check), `6b292cf` (Landing header refinement), `e08301b` (GA4 integration), `d4c606a` (Official vector logo)
- **What Was Built**:
  - Integrated Google Analytics 4 (GA4) tracking across all SPA routes.
  - Built port detector (`findAvailablePort`) checking both `127.0.0.1` and default network interfaces to prevent local dev conflicts.
  - Replaced raster logos with polished SVG vector brand assets (`stacksave-logo.svg`).

---

## Phase 4: Scraper Pipeline, Anti-404 Quarantine & Production Launch (September 2026)

### Day 20 — 2026-09-03: Playwright Pipeline, Zero-Offers Fix & Dry-Runs
**Hours worked:** 10.0  
**Key Commits:** `589e911` (Production dry-run workflow), `5dba202` (Offer evidence), `011f29a` (Decouple ingestion from parsing), `16bde33` (Simplify publication gates), `b3c7ac4` / `8fdc04d` (Zero-offers diagnostic guide & fix), `4d3d3bf` / `178a9a9` (Diagnostic logging), `148e767` (GitHub Actions counts visibility), `86f3802` (Card quality), `202bf69` (Mobile responsiveness)
- **What Was Built**:
  - **The Zero-Offers Breakthrough**: Solved a critical bug where verified partner offers failed to display in the UI. Decoupled offer ingestion from full pricing table parsing so that verified partner links publish even if vendor HTML layout changes.
  - Simplified offer publication gates in `offerTrust.ts`, eliminating redundant validation filters.
  - Added temporary diagnostic telemetry and authored a comprehensive debugging guide.
  - Made offer ingestion counts visible directly in GitHub Actions run summaries.
  - Built GitHub Actions production dry-run workflow (`pricing-sync-dryrun.yml`).
- **What Was Learned**:
  - Overly strict cascading verification gates can silently discard 100% valid offers if a single non-essential parsing assertion fails. Decoupling destination health from complex pricing table extraction restored 100% offer visibility.

---

### Day 21 — 2026-09-04: Card Polish & Responsive Builder Layout
**Hours worked:** 6.0  
**Key Commits:** `f33fe3f` (Offers card, Build My Stack & mobile responsive updates)
- **What Was Built**:
  - Polished offer card typography, opportunity score badges, and category pill alignments.
  - Enhanced Build My Stack responsive layouts on tablet viewports.

---

### Day 22 — 2026-09-05: Dynamic Notification Bell 2.0 & Landing Polish
**Hours worked:** 7.5  
**Key Commits:** `f5f9b96` / `0a7f6fd` / `fa53e16` (Interactive dynamic notification bell 2.0), `5ead697` / `5023cb8` (Landing page UI updates), `9f227cd` (Removed unused email feature)
- **What Was Built**:
  - Built interactive dynamic notification bell dropdown in header, highlighting newly discovered AI credits and price cuts.
  - Refined landing page hero visual balance and removed obsolete email capture form code.

---

### Day 23 — 2026-09-06: Interactive Demo Cards & Live GA4 Telemetry
**Hours worked:** 8.0  
**Key Commits:** `f5f7880` (Interactive demo-example card), `caf01ea` (Interactive contact UI), `e59c452` (Added GA4 tracking), `c1d5338` (Updated GA4 analytics), `edca5b9` (Deployment issue resolution)
- **What Was Built**:
  - Created interactive demo cards on the landing page showing real-time spend simulation.
  - Integrated `@google-analytics/data` API in `googleAnalyticsService.ts` to query real-time concurrent users, 30-day active user trajectories, and average engagement times (~2m 23s).
  - Resolved production deployment routing on Render.

---

### Day 24 — 2026-09-08: Perplexity Pricing Sync & KnowledgeLoader Baseline
**Hours worked:** 7.0  
**Key Commits:** `bee20c5` (Perplexity Enterprise Pro & Max canonical pricing), `2d5e7f3` (Dynamic KnowledgeLoader baseline reloading)
- **What Was Built**:
  - Updated Perplexity canonical pricing: Enterprise Pro ($40/mo, $33.33 annual) and Enterprise Max ($100/mo, $83.33 annual).
  - Implemented dynamic KnowledgeLoader baseline reloading without requiring full server restarts.

---

### Day 25 — 2026-09-09: Catalog Expansion: Antigravity, GLM & Grok
**Hours worked:** 6.5  
**Key Commits:** `79318fd` (Added Antigravity, GLM, Grok)
- **What Was Built**:
  - Added new frontier AI platforms to catalog: Google Antigravity, Zhipu AI GLM-4, and xAI Grok.
  - Documented model context windows, rate limits, and tiered pricing structures.

---

### Day 26 — 2026-09-12: Playwright Dependency Fix & Anti-404 Quarantine
**Hours worked:** 9.5  
**Key Commits:** `fde23ea` (AI features update), `f49caa4` (Missing imports in offerTrust.ts), `2cff32d` (Move Playwright to dependencies), `0f87a1a` (Dynamic provider count), `fce3de8` (GitHub Actions workflow fix), `975cb91` (Interactive website source links), `6f97c9b` / `7888172` / `a905a8e` (Removed broken/404 offers)
- **What Was Built**:
  - Moved Playwright from `devDependencies` to `dependencies` in `backend/package.json` to ensure browser binaries are accessible in production container jobs.
  - Replaced hardcoded provider counts with dynamic database-driven aggregations across the UI.
  - Automated detection and immediate quarantine of dead promotional links (anti-404 verification).

---

### Day 27 — 2026-09-13 to 2026-09-14: Forensic Removal of Unverified Deals
**Hours worked:** 7.0  
**Key Commits:** `514c37c` (Removed unverified Perplexity offers), `2290d4c` (Removed invalid offer entries)
- **What Was Built**:
  - Audited external deal feeds and purged expired third-party promotions.
  - Confirmed all remaining offers link to active, official vendor portals with verifiable terms.

---

### Day 28 — 2026-09-15: 50+ Verified Offers, Tooltip Portals & Carousel Drag
**Hours worked:** 9.0  
**Key Commits:** `51d15e6` (Filtered and added 50+ offers), `78453e3` (Build My Stack UI edits), `6c95c76` (README update)
- **What Was Built**:
  - Expanded verified promotion catalog to 50+ active offers across 29+ monitored providers.
  - Built React Portal floating tooltips for "Domain Fit" vs. "Requirement Match" to eliminate container clipping.
  - Engineered pointer-event horizontal drag-to-scroll on alternative architecture carousels with click suppression.

---

### Day 29 — 2026-09-16: Final Documentation Polish & Suite Consolidation
**Hours worked:** 8.5  
**Key Commits:** `1900987` (Added professional README), `6b0af8b` (Consolidated documentation)
- **What Was Built**:
  - Completely overhauled `README.md` to enterprise SaaS standards: architecture diagrams, Mermaid pipelines, real ranking signal weights, and GA4 telemetry gallery.
  - Purged 56 outdated scratch files and consolidated core engineering documentation: `DEVLOG.md`, `ECONOMICS.md`, `GTM.md`, `METRICS.md`, and `REFLECTION.md`.
  - Verified all 35 Vitest test suites pass with zero warnings.

---

## 4-Month Cumulative Metrics & Production Achievements

| Dimension | Measured Production Outcome |
| :--- | :--- |
| **Total Engineering Duration** | **May 6, 2026 – September 16, 2026 (18 Weeks)** |
| **Total Git Commits** | **85+ Commits across Full Stack** |
| **Production Domain** | `https://stacksaveai.com/` (Active on Render & GoDaddy DNS) |
| **Automated Test Coverage** | **35 comprehensive Vitest test suites (100% passing)** |
| **Monitored AI Providers** | **29+ official vendor feeds** |
| **Active Verified Offers** | **50+ deals with 100% anti-404 destination health** |
| **Average Verified Audit Savings** | **$340 / month (~$4,080 annual run-rate recovery)** |
| **Average Engagement Time** | **2m 23s** (Google Analytics 4 telemetry verified) |
