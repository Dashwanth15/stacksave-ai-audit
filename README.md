# StackSave AI Audit

**Free AI spend optimization for startups and engineering teams.** Enter your AI tool subscriptions, get an instant audit showing where you're overspending, what to cut, and how much you'll save — monthly and annually.

> Built as part of the Credex Web Development Intern Assignment (May 2026).

## Live Demo

🔗 **[stacksave.vercel.app](https://stacksave.vercel.app)** ← deployed URL (update after deployment)

## Screenshots

> _Add 3 screenshots or a Loom/YouTube link here after deployment_

1. Landing page — hero section
2. Audit form — tool selection + plan details
3. Results page — savings dashboard + per-tool insights

## Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier works)
- xAI Grok API key (free at [console.x.ai](https://console.x.ai))
- Resend API key (free tier: 3,000 emails/month)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, XAI_API_KEY, RESEND_API_KEY in .env
npm install
npm run dev
# → http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev
# → http://localhost:5173
```

### Run Tests

```bash
cd backend
npm test
# 16 tests, all passing
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system diagram and data flow.

## Decisions

Five key trade-offs made during this build:

1. **Deterministic audit engine over LLM-generated insights** — The audit math (savings amounts, rule triggers) uses hardcoded business logic, not AI. LLMs hallucinate numbers. A finance person needs to trust this output. AI is only used for the prose summary paragraph, where inexact language is fine.

2. **xAI Grok API over OpenAI** — Grok's API is free-tier accessible, OpenAI-compatible (same SDK, different baseURL), and performs well for structured summary generation. The graceful fallback to template summaries means the app works even when the API is down.

3. **MongoDB over Supabase/PostgreSQL** — Assignment lists multiple options. MongoDB Atlas free tier has no cold-start penalty, flexible schema for audit JSON blobs (insights vary per audit), and was faster to set up. If this needed relational joins or complex queries, PostgreSQL would be the right call.

4. **Honeypot + rate limiting over hCaptcha for abuse protection** — hCaptcha adds friction at the lead capture step, exactly where we want zero friction. Honeypot (hidden field bots fill, humans don't) + express-rate-limit (20 audits/hour/IP) stops automated abuse without degrading UX for real users.

5. **Form state in localStorage over server-side sessions** — Audits are stateless from the server's perspective until submission. Storing form state in localStorage (with a typed `useLocalStorage` hook) gives free persistence across page reloads with no server round-trip, no auth requirement, and no session management complexity.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Charts | Recharts |
| HTTP | Axios |
| Routing | React Router v7 |
| Backend | Node.js + Express + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| AI | xAI Grok API (OpenAI-compatible) |
| Email | Resend |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend) + Render (backend) |

## Entrepreneurial Context

This tool is a lead-generation asset for [Credex](https://credex.rocks), which sells discounted AI infrastructure credits. See [GTM.md](./GTM.md), [ECONOMICS.md](./ECONOMICS.md), and [METRICS.md](./METRICS.md) for the full product strategy.
