# StackSave Round 2 — Pull Request & Feature Overview

## Feature: Re-audit on Pricing Change ("Living Audits")

### Overview
This pull request introduces Phase 2 of StackSave: "Living Audits". In Round 1, audits were treated as static, ephemeral, one-time recommendations that were immediately discarded. Round 2 brings full state persistence, automatic and manual pricing change detection, versioned re-audits with deep recommendation/pricing diffs, and real-time email alerts. 

Now, when provider pricing models shift in our catalog (e.g., Cursor Pro pricing increases, or Claude team sizing structures change), we can run a single command or endpoint trigger to automatically scan every active client stack, detect exactly who is affected, recalculate their potential savings, create versioned history chains, and deliver a tailored transactional notification with a side-by-side comparison.

---

### Implementation Summary
1. **Persistent Audit Storage**: Configured a complete MongoDB storage layer. All audits are now indexed, stored, and retrievable via unique `auditId` hashes.
2. **Pricing Snapshot System**: Captured a full, immutable vendor catalog pricing snapshot at the exact time of the original audit and persisted it directly inside each audit document to establish a historical baseline.
3. **Pricing Change Detection Engine**: Developed an $O(1)$ pricing hash comparison utility that evaluates saved snapshots against the live database catalog to detect tool additions, removals, and plan pricing changes.
4. **Versioned Re-audit Workflow**: Implemented an incremental versioning chain (`isLatestVersion`, `auditVersion`, `reAuditOf`) that preserves original historical audits while executing fresh, updated audits against new catalog rates.
5. **Detailed Diff Analysis Engine**: Formulated a structured comparison algorithm that identifies added, removed, or changed recommendations (severity, potential savings, suggested moves) and pricing assumptions.
6. **Transactional Notification alert**: Integrated a Resend email trigger that dispatches alert emails with comparison metrics (previous savings, new savings, and a list of updated vendor plans).
7. **Frontend Comparison UI (`/audit/:id/diff`)**: Developed a modern side-by-side and mobile-stacked comparison view with collapsible unchanged elements, green/red highlight indicators for visual clarity, and version selectors.
8. **Render Production Readiness**: Standardized all routing rules (Vite + SPA rewrite configuration in `render.yaml` and `_redirects`) and optimized database cold-starts with automatic retry logic.

---

### Key Changes

#### Backend (TypeScript)
- [NEW] `src/services/pricingChangeDetectionService.ts` — Pricing comparison engine and bulk audit scan logic.
- [NEW] `src/services/reAuditService.ts` — Engine recalculation, version chaining, and structured diff generation.
- [NEW] `src/services/pricingService.ts` — Static catalog snapshot helper.
- [MODIFY] `src/services/dbService.ts` — Added Mongoose schema attributes (`inputStack`, `pricingSnapshot`, `reAuditOf`, `isLatestVersion`, `auditVersion`, `pricingChanged`) and hardened the `publicUrl` virtual getter.
- [MODIFY] `src/services/emailService.ts` — Added Resend transactional `sendReAuditNotification` HTML mailing code.
- [MODIFY] `src/routes/audit.ts` — Configured `/api/audits/:id/re-audit`, `/api/audits/:id/diff`, and `/api/audits/detect-pricing-changes` routes.
- [NEW] `tests/re-audit.test.ts` — Robust unit & integration testing suite covering pricing updates, diff calculation, multi-version chaining, and notification deduplication.

#### Frontend (React + TypeScript)
- [NEW] `src/pages/ReAuditDiffPage.tsx` — Premium diff view interface showing original vs latest pricing/insights side-by-side, visual metrics delta cards, and version chains.
- [MODIFY] `src/pages/ResultsPage.tsx` — Integrated top warning banners notifying users when provider prices change or if they are looking at an older version.
- [MODIFY] `src/services/api.ts` — Typed Axios request functions for re-auditing (`triggerReAudit`, `fetchAuditDiff`) with auto-detecting base URL.
- [MODIFY] `render.yaml` — Configured SPA routing rules to prevent 404 on refresh for `/audit/:id/diff` or `/results/:id`.
- [MODIFY] `public/_redirects` — Applied fallback routing wildcard.

---

### Testing & Verification
- **Automated Tests**: Wrote 8 comprehensive integration tests in `backend/tests/re-audit.test.ts` covering:
  - Plan spend recalculations (`recalculateInputStack`).
  - Added/removed/changed recommendations tracking (`generateAuditDiff`).
  - Database version increments (v1 -> v2 -> v3) and latest version tracking (`runReAudit`).
  - Duplicate email protection.
- **Verification Commands**:
  - Run backend tests: `cd backend && npm test` (all 33 tests pass)
  - Typecheck backend: `cd backend && npm run typecheck`
  - Typecheck frontend: `cd frontend && npm run typecheck`
  - Lint frontend: `cd frontend && npm run lint`

---

### Known Limitations
1. **Manual Run Endpoints**: The pricing checks are initiated via on-demand HTTP triggers (`GET/POST /api/audits/detect-pricing-changes`) or UI actions, avoiding continuous resource overhead on Render's free tier.
2. **Duplicate Notification Protection**: Clients are only notified once per version change. If a subsequent pricing change happens before they re-audit, it updates their status flags without sending multiple spammed messages.

---

### Deployment Notes
- **Environment Variables**: Make sure `RESEND_API_KEY`, `MONGODB_URI`, and `FRONTEND_URL` are fully declared in Render dashboard.
- **SPA Rewrites**: Static hosting on Render relies on the `routes` property in `frontend/render.yaml` to ensure direct access to nested URLs maps to `index.html`.
