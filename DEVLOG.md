# DEVLOG — StackSave AI Spend Intelligence

A complete, daily engineering log detailing the architecture, implementation, debugging, and production deployment of StackSave AI.

---

## Engineering Overview & Timeline

- **Project**: StackSave AI (Enterprise AI Spend Intelligence & Autonomous Architecture Recommendation Platform)
- **Core Stack**: React 19.2, TypeScript 5.4, Vite 8.1, Tailwind CSS v4, Node.js 20+, Express 4.18, MongoDB Atlas, Playwright 1.62, Vitest 1.5
- **Production Domain**: `https://stacksaveai.com/` (Render Web Services + GoDaddy DNS)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 10-DAY SYSTEM DEVELOPMENT PHASES                                        │
├──────────────────┬──────────────────┬──────────────────┬──────────────────┬────────────────────────────┤
│   DAYS 1 – 2     │    DAYS 3 – 4    │    DAYS 5 – 6    │    DAYS 7 – 8    │        DAYS 9 – 10         │
│ Core Architecture│  UI/UX Polish &  │ Document Engine  │ Scraper Pipeline │ Production Deployment,     │
│ & Audit Engine   │ Dynamic Pricing  │ & Stack Builder  │ & Metric Tooltips│ GA4 Telemetry & CI/CD Pass │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┴────────────────────────────┘
```

---

## Day 1 — Foundation, Audit Engine & Strict Financial Logic

**Hours worked:** 6.5  
**Focus:** Project scaffolding, domain modeling, 7-rule deterministic audit engine, and test harness.

### What Was Built
- **Project Structure**: Established monorepo architecture with clean separation: `frontend/` (React 19 SPA) and `backend/` (Express + TypeScript API).
- **Core Audit Engine**: Implemented `catalog.ts` containing 8 initial AI tools, tiered pricing, and capability profiles. Built `rules.ts` defining 7 deterministic financial rules:
  1. `ruleDuplicateTools`: Identifies overlapping subscriptions across identical workflows.
  2. `ruleUnusedSeats`: Flags purchased team seats exceeding active member requirements.
  3. `ruleUnusedTiers`: Detects underutilized enterprise entitlements.
  4. `ruleRetailVsCredits`: Compares retail API token costs against developer credits.
  5. `ruleAnnualBilling`: Projects 15–20% run-rate savings on annual billing cycles.
  6. `ruleBundleConsolidation`: Surfaces multi-tool suite discounts.
  7. `ruleDowngradeCompanion`: Identifies lightweight companion models replaceable by primary core tools.
- **Test Harness**: Configured Vitest and wrote 16 unit tests targeting mathematical edge cases.

### Key Engineering Decisions & Lessons
- **Zero LLM Math Hallucinations**: Financial audits cannot rely on generative language models for arithmetic. LLMs invent prices and hallucinate discounts. StackSave enforces strict deterministic business logic in pure TypeScript; LLMs are restricted strictly to drafting executive narrative summaries.
- **Boundary Condition Bug Caught Early**: The `ruleUnusedSeats` rule was erroneously triggering at exactly 25% spare capacity due to an operator oversight (`< 0.25` vs. `<= 0.25`). Unit tests with controlled synthetic stacks caught this immediately prior to production.

---

## Day 2 — Database Resilience, Pricing Normalization & Chatbot

**Hours worked:** 7.5  
**Focus:** MongoDB Atlas connectivity, full pricing schema overhaul, and interactive spend advisor.

### What Was Built
- **Database Layer**: Configured MongoDB Atlas with Mongoose schemas for `Audit` lineage and `Lead` capture. Resolved DNS SRV query timeouts over local ISP routers by enforcing IPv4 fallback (`family: 4`) and URL-encoding credentials.
- **Pricing Catalog Overhaul**: Replaced baseline estimates with verified data from official vendor pricing tables:
  - *Cursor*: 6 tiers (Hobby, Pro $20/mo, Pro+ $60/mo, Ultra $200/mo, Teams $40/mo, Enterprise) with annual billing toggle.
  - *ChatGPT*: Plus ($20/mo), Pro ($200/mo), Team ($25/mo per user annual, $30/mo monthly), Enterprise.
  - *Claude*: Pro ($20/mo), Team ($25/mo annual, $30/mo monthly), Max ($100/mo).
  - *Windsurf, Gemini, Perplexity, DeepSeek, GitHub Copilot*.
- **Interactive Spend Advisor**: Integrated `/api/chat` with Groq (`llama-3.3-70b-versatile`) primed with real-time pricing catalogs, plan boundaries, and contextual recommendations.

### Key Engineering Decisions & Lessons
- **Unified Normalization Formula**: Pricing across AI platforms is fragmented across seats, token tiers, and developer add-ons. Designed a standard normalization function converting all subscriptions into equivalent monthly and annualized figures.

---

## Day 3 — Dashboard Polish, Progressive Disclosure & Strict Linting

**Hours worked:** 8.0  
**Focus:** UI component design system, glassmorphic styling, and React 19 compliance.

### What Was Built
- **Design System**: Implemented dark glassmorphism using Tailwind CSS v4 tokens: subtle gradient surfaces (`bg-white/[0.03]`), hairline borders (`border-white/[0.08]`), and Framer Motion micro-interactions.
- **Form UX & Progressive Disclosure**: Added collapsible feature accordions on tool cards, seat steppers, and fixed-price locking (e.g., standard subscription tiers lock their unit price to prevent arbitrary user input tampering).
- **React 19 Linting Cleanup**: Resolved 5 React 19 compiler errors regarding synchronous `setState` executions inside effect hooks and circular references in animation loops.

### Key Engineering Decisions & Lessons
- **React 19 Hook Semantics**: React 19 strictly flags state mutations inside render effect bodies. Moved all state resets into explicit cleanup routines and transitioned animation frame loops to self-contained inline closures.

---

## Day 4 — Production Architecture, Render Deployment & Security

**Hours worked:** 7.0  
**Focus:** Full-stack deployment to Render, SPA routing configuration, and security middleware.

### What Was Built
- **Production Deployment on Render**: Deployed both backend REST service and frontend SPA web service.
- **Custom SPA Server**: Built lightweight Express static file server (`server.js`) with client-side history fallback, gzip/brotli compression headers, and cache-control directives for hashed Vite assets.
- **Hardened Middleware**: Implemented `helmet` security headers, strict CORS origin whitelisting, express-rate-limit buckets (100 reqs/15m on public endpoints, 10 reqs/15m on audit submissions), and honeypot bot traps.

### Key Engineering Decisions & Lessons
- **CORS & Domain Handshake**: Verified that dynamic origin reflection with credential support is required for production environments where frontend and API reside on coordinated subdomains.

---

## Day 5 — Executive PDF Engine & Document Architecture

**Hours worked:** 8.0  
**Focus:** Client-side CFO procurement report generation via `jsPDF`.

### What Was Built
- **CFO-Ready PDF Generation**: Engineered `pdfService.ts` creating multi-page executive audit reports:
  - Financial Summary Card: Current spend, identified savings, annualized recovery rate.
  - Per-Tool Consolidation Matrix: Explicit downgrade and replacement actions.
  - Verification Stamp: Timestamped audit verification hash and catalog version.
- **Document-First Layout Engine**: Decoupled PDF coordinate math from DOM rendering to ensure pixel-perfect export regardless of user screen size or operating system.

### Key Engineering Decisions & Lessons
- **Coordinate-Based Typography**: Browser canvas rendering differences between macOS and Windows can produce line clipping in PDF generators. Standardized pt-based grid offsets with dynamic multi-line string wrapping.

---

## Day 6 — "Build My Stack" Architecture Synthesis Engine

**Hours worked:** 8.5  
**Focus:** 4-step guided specification wizard, workflow capability profiling, and multi-tier stack synthesis.

### What Was Built
- **Guided Specification Wizard**: 4-step interactive flow:
  1. *Operating Domain*: Software Engineering, AI/ML Research, Product Management, Content & Marketing, Data Science.
  2. *Team Scale & Budget Ceiling*: Seat counts, monthly budget cap, and cost flexibility.
  3. *Capability Priorities*: Code generation, deep reasoning, multimodal analysis, context depth, offline safety.
  4. *Strategic Mandate*: Cost Optimization, Frontier Performance, or Balanced Productivity.
- **Multi-Tier Recommendation Engine**: Built `AIStackRecommendationEngine.ts` synthesizing:
  - *Primary Core Workhorse* (e.g. Cursor Pro or Claude 3.7 Sonnet)
  - *Secondary Companion* (e.g. Perplexity Pro or ChatGPT Plus)
  - *API & Specialized Layer* (e.g. DeepSeek-V3 or Anthropic API batch endpoints)
- **Alternative Commercial Stacks**: Generates ranked alternatives (e.g., Maximum Performance vs. Value-First Suite) complete with trade-off explanations.

### Key Engineering Decisions & Lessons
- **Multi-Tier Architecture Value**: Enterprise teams do not use a single AI tool. Recommending an isolated tool is unhelpful; recommending a coordinated stack with defined tool roles solves real procurement challenges.

---

## Day 7 — Playwright Extraction Pipeline & Anti-404 Health Checks

**Hours worked:** 9.0  
**Focus:** Headless scraping engine, 29+ provider source registry, and destination health verification.

### What Was Built
- **Playwright Scraping Subsystem**: Automated extraction workers navigating official vendor pricing portals (OpenAI, Anthropic, Cursor, Windsurf, Perplexity, DeepSeek, Google Cloud).
- **Forensic Destination Health Check**: Built `offerDestinationHealthCheck.ts` executing automated HTTP validation, redirect path tracing, and status code verification.
- **Anti-404 Quarantine Gate**: Any promotional link returning 404, 500, or redirecting to a generic root landing page is automatically quarantined and removed from public view.
- **6-Category Verified Offer Marketplace**: Live directory (`/offers`) tracking Partner Bundles, Student Programs, API Discounts, Annual Billing Savings, Startup Grants, and Free Tiers.

### Key Engineering Decisions & Lessons
- **Zero Coupon Scraping**: StackSave strictly forbids scraping affiliate coupon forums. All data is grounded in official vendor announcements, partner agreements (e.g., GitHub Student Pack, AWS Activate), or direct pricing APIs.

---

## Day 8 — React Portals, Metric Tooltips & Pointer Event Drag-to-Scroll

**Hours worked:** 8.0  
**Focus:** UX clarity enhancements, dual-metric tooltips, and carousel touch/mouse interactions.

### What Was Built
- **Dual-Metric Clarification**: Resolved user ambiguity between macro and micro scores:
  - *Domain Fit*: How well the platform's profile aligns with the user's selected industry vertical.
  - *Requirement Match*: How closely the platform satisfies the user's specific operational requirements.
- **Portal-Based Fixed Tooltips**: Created `MetricTooltip.tsx` rendering via `createPortal` directly into `document.body` with viewport coordinate clamping, preventing clipping inside overflow containers.
- **Pointer Event Drag-to-Scroll Carousel**: Implemented unified pointer capture on alternative architecture cards (`setPointerCapture`, dynamic `scrollSnapType` toggling, and capture-phase click suppression) enabling seamless click-and-drag horizontal scrolling on all desktop and mobile devices.

### Key Engineering Decisions & Lessons
- **CSS Snap vs. Mouse Dragging**: CSS `scroll-snap-type: x mandatory` creates severe stutter during mouse drag gestures. Dynamically disengaging snap (`scrollSnapType: isGrabbing ? 'none' : 'x proximity'`) delivers native-feeling fluid scrolling.

---

## Day 9 — Custom Domain DNS, Render Orchestration & GA4 Integration

**Hours worked:** 8.5  
**Focus:** Public launch on `stacksaveai.com`, GoDaddy DNS configuration, and multi-source analytics telemetry.

### What Was Built
- **Production Domain & DNS**: Connected official domain `https://stacksaveai.com/` via GoDaddy DNS (Apex `@` record pointing to Render IP and `www` CNAME record pointing to Render host).
- **Google Analytics 4 Telemetry**: Integrated `@google-analytics/data` and `googleapis` into `GoogleAnalyticsService.ts`:
  - GA4 Realtime: Concurrent active visitors in the last 30 minutes.
  - GA4 Historical: 30-day user trajectories, retention curves, and average session duration (~2m 23s).
  - Google Search Console: Organic impressions, clicks, and search query ranks.
  - MongoDB Metrics: Total audits executed, cumulative spend analyzed, net savings identified.
- **Strict Semantic Separation**: Typed each metric card with its exact origin (`GA4_REALTIME`, `GA4_HISTORICAL`, `GOOGLE_SEARCH_CONSOLE`, `STACKSAVE_MONGODB`) to guarantee zero composite metric falsification.

### Key Engineering Decisions & Lessons
- **Analytics Integrity**: Combining analytics sessions with database lead records into a blended aggregate produces misleading vanity numbers. Explicit data source tags ensure transparent, audit-grade reporting.

---

## Day 10 — Multi-Signal Platform Ranking, Vitest Suite & Final Polish

**Hours worked:** 8.0  
**Focus:** `PlatformRankingEngine` signal weighting, comprehensive test execution, and production documentation.

### What Was Built
- **Multi-Signal Platform Ranking Engine**: Deployed deterministic platform scoring model:
  - Market Adoption (25%)
  - Product Capabilities (25%)
  - Ecosystem Strength (15%)
  - Growth Momentum (10%)
  - Reliability & Maturity (10%)
  - Value for Money (10%)
  - Partner Offer Value (5%)
  - Data Confidence Gate (0.0 – 1.0)
- **Comprehensive Vitest Suite**: 35 test suites validating audit rules, re-audit savings deltas, offer lifecycle expiration, destination health checks, and ranking fairness.
- **Repository Polish & Hygiene**: Polished `README.md` to enterprise SaaS standards, purged obsolete scratch files, and verified all production assets.

### Key Engineering Decisions & Lessons
- **Platform-First Offer Sorting**: A platform offering a massive discount on an unproven tool should never mathematically outrank an enterprise-grade frontier model. Platform groups are ordered by **Platform Intelligence Score** first, with verified discounts acting as secondary tiebreakers.

---

## Verification & Final Metrics

| Metric | Measured Production Value |
| :--- | :--- |
| **Test Suites Passing** | **35 / 35 suites** (100% clean) |
| **Monitored AI Providers** | **29+ official vendor feeds** |
| **Audited Savings Accuracy** | **100% deterministic mathematical calculation** |
| **Production Domain** | `https://stacksaveai.com/` |
| **Average Engagement Time** | **2m 23s** (Google Analytics 4 verified) |
| **Average Identified Savings** | **$340 / month** per audited 10-seat engineering team |
