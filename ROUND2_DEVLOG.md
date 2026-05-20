# StackSave Round 2 DevLog — Re-audit on Pricing Change

## 2026-05-20 09:00 — Initial planning & scope lock

Read the brief. Feature is simple in theory: store pricing snapshots, detect changes, trigger re-audit, send email. 36 hours to ship.

Decided against cron-based pricing checks (infrastructure overhead, Render limitations). Going with manual trigger endpoint + email notification when pricing changes detected. Client can call endpoint to check for changes, or we add a simple background job later if needed.

Architecture decision: Store audit snapshots in MongoDB with timestamp. New schema: `AuditSnapshot { auditId, timestamp, data, pricingHash }`. Separate pricing index to make change detection O(1).

Database overhead acceptable. Not going full event sourcing (overkill). Time budget forces pragmatism.

## 2026-05-20 10:30 — MongoDB schema & persistence layer

Created `AuditSnapshot` model in dbService. Added schema migration to handle legacy audits (ones without snapshots). Realizing existing audit records need backfilling, but decided to handle new audits first—can patch old ones later if needed.

Pricing comparison logic: hash current prices against stored hash. If mismatch, flag as stale, trigger re-audit. Simple SHA256 hash of pricing array sorted by tool ID.

Committed: schema, basic persistence, hash logic.

## 2026-05-20 12:45 — Backend endpoints scaffolding

Started `/api/audit/check-pricing-changes` endpoint. Returns list of audits with stale pricing. No auth on this yet (will add if time). Test locally with hardcoded pricing delta.

Hit first blocker: UUID generation inconsistency. Old audits use string IDs, new ones use MongoDB ObjectId. Quick fix: accept both formats in comparison logic. Not ideal, but acceptable tech debt for MVP.

Endpoint working but untested end-to-end.

## 2026-05-20 14:15 — Email service integration blocker

Tried to hook up Resend for pricing-change emails. API key missing in `.env`. Searched Render dashboard—credentials not pushed to production yet. Locally working but can't test email flow without credentials.

Temporarily mocking email service to unblock other work. Will patch credentials later. This is annoying but common deployment pain.

Added email template structure. Simple HTML: "New pricing detected. Click here to re-audit." Links to shared audit page.

## 2026-05-20 15:50 — Re-audit endpoint & diff detection

Created `/api/audit/re-audit` endpoint. Takes old audit ID, runs new audit, stores both snapshots, calculates diff.

Diff logic: compare tool recommendations, pricing changes, optimization suggestions. Decided to show delta instead of full diff (performance + clarity). Shows what *changed* between audits, not absolute state.

Realized I need to handle tool catalog changes too (new tools in pricing). Added `toolCatalogVersion` to snapshot to track. If versions differ, mark diff as containing structural changes.

Code getting messy. Need to refactor diff calculation into separate utility. Committing checkpoint anyway—functionality works, architecture TBD.

## 2026-05-20 17:20 — Frontend diff-view component scaffolding

Started building `DiffView` component in React. Shows two audit snapshots side-by-side. Realized comparing full JSON is noisy. Filtering to show only changed fields.

Layout decision: Changed vs. Unchanged in collapsible sections. Unchanged tools hidden by default (can expand if user wants).

Component is basic but functional. Styling is minimal (CSS grid, no fancy animations). Time is the constraint, not design.

## 2026-05-20 18:45 — Debugging: audit data serialization

Ran test audit end-to-end. Frontend diff-view breaks on MongoDB ObjectId serialization. React can't render ObjectId directly.

Fixed: custom JSON serializer in apiService. Converts ObjectIds to strings before sending to frontend. Feels hacky but works.

Added `.toJSON()` override in MongoDB model. Should have done this earlier (schema design lesson).

## 2026-05-20 20:10 — Email credentials finally pushed

Credentials arrived in Slack from DevOps. Updated `.env` locally and in Render config. Resend API is live.

Tested email sending with test address. First attempt failed (rate limit on test domain). Second attempt worked. Email delivered in 2 seconds.

Pricing-change email notification flow now functional end-to-end locally.

## 2026-05-20 21:55 — Deployment: preview build to Render

Deployed backend + frontend to Render preview. Things that broke:
1. MongoDB connection string formatting (escaped characters in password)
2. Resend API key was in `.env.local` but not in `render.yaml` (config misalignment)
3. Frontend build had wrong API endpoint URL

Fixed all three. Deployment took 45 minutes due to these, but now live.

Realizing I should have tested deployment earlier. Lesson learned (again).

## 2026-05-21 00:30 — End-to-end test: pricing change detection

Set up test scenario: created audit with tool pricing. Manually changed pricing in MongoDB (simulate vendor price update). Called `/check-pricing-changes`.

Endpoint correctly detected stale pricing. Triggered re-audit. Email sent successfully.

Found bug: diff calculation showed wrong baseline (was comparing against live prices, not stored snapshot). Fixed comparison logic to use stored snapshot as "old" baseline.

Test passed after fix. Committing core feature as working.

## 2026-05-21 02:15 — Discovered: shared audit link diff-view not working

Shared audit endpoint wasn't returning diff data. Turns out re-audit endpoint creates new audit ID, breaks sharing link.

Architecture issue: shared links are keyed to specific audit ID. If we create new audit on re-audit, link breaks.

Decision: store re-audit as linked child record, not separate audit. Shared link stays same, but shows toggle: "Original" vs. "Latest" + diff-view.

This is a bigger refactor. Implement quick version first (separate audits, document limitation), iterate if time allows.

Committing workaround. Not ideal, but acceptable for MVP.

## 2026-05-21 04:00 — Refactoring: pricing-change email trigger

Email trigger was happening in re-audit endpoint (wrong layer). Moved to service layer. Now:
1. `AuditService.reAudit()` handles logic
2. Emits event on completion
3. Separate email service subscribes to event

Cleaner separation. Service layer doesn't know about email details.

Also added rate limiting: only send email if 30+ min since last re-audit for same original audit (prevents spam).

## 2026-05-21 06:20 — Bug: timestamp inconsistency across snapshots

Timestamps in MongoDB were being saved with different timezone awareness. Audits created on React frontend had UTC-0, backend audits had local timezone offset.

Root cause: JavaScript `new Date()` is browser-local, backend was using Python `datetime.now()` (server-local).

Fixed: explicitly standardize all timestamps to UTC ISO string in persistence layer. Added validation.

This was subtle. Spent 90 minutes debugging why diff was showing timestamps as different fields.

## 2026-05-21 08:00 — Performance check: re-audit speed

Re-audited large account (50 tools). Query took 3 seconds. Not acceptable for user experience.

Profiled: audit engine was recalculating recommendations from scratch (expected). But MongoDB queries for pricing history were N+1 (bad).

Fixed: aggregation pipeline to fetch all pricing in single query. Re-audit now 800ms. Good enough.

Added index on `(auditId, timestamp)` for faster snapshots retrieval.

## 2026-05-21 10:15 — Testing: edge cases & data validation

Tested re-audit with:
1. Audit with no pricing changes (should not trigger email) ✓
2. Audit with all tools removed (schema handles null) ✓
3. Concurrent re-audits (race condition on snapshot creation) ✗

Found race condition: two simultaneous re-audit requests created duplicate snapshots. Added unique index on `(auditId, timestamp_bucket)` to prevent duplicates (timestamps bucketed to 1-second precision).

Also added idempotent key to email service (prevents double-sends if request retried).

## 2026-05-21 11:45 — Final testing: shared audit diff-view rendering

Tested shared link with re-audit. Diff-view shows pricing changes correctly. UI is minimal but clear:

- Original pricing vs. Latest pricing side-by-side
- Green highlights new recommendations
- Red highlights removed recommendations
- Collapsible unchanged sections

No fancy animations (time constraint), but readable and functional.

Realized diff-view CSS breaks on mobile (fixed-width columns). Quick fix: responsive grid switches to stacked layout on small screens.

## 2026-05-21 13:20 — Deployment final & status check

Re-deployed with fixes: email rate-limiting, timestamp standardization, performance improvements, mobile responsive diff-view.

Render preview build is stable. All endpoints responding. Email notifications working.

Spot-checked: audit creation, pricing comparison, re-audit trigger, email delivery, shared link rendering, diff-view display.

Manual testing complete. Feature is ready.

Committed final version. Documentation still pending (will add README update before submission).

## 2026-05-21 14:30 — Honest assessment & known limitations

Feature works, but has tradeoffs:

**What's solid:**
- Core re-audit logic robust (tested)
- Email delivery reliable (Resend is solid)
- Diff-view clear and readable
- Performance acceptable (<1s for typical accounts)

**Known limitations:**
- Shared audit link creates new audit on re-audit (documented workaround)
- No auth on pricing-change endpoint (would add if needed)
- Backfill for legacy audits not implemented (acceptable for MVP)
- No UI for manually triggering re-audit (API exists, UI can follow)
- Pricing change detection only compares hashes (not granular per-tool yet)

Architecture is pragmatic for 36-hour constraint. Solid foundation for iteration.

