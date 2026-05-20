# StackSave Round 2 — Engineering Reflection

## What Went Well
- **Highly Modular Domain Services**: Decoupling the change detection (`pricingChangeDetectionService.ts`) and recalculation/version execution (`reAuditService.ts`) layers allowed us to write clear, isolated business logic. This separation made both components easier to develop and test.
- **Robust Integration Testing**: Setting up the comprehensive test suite in `tests/re-audit.test.ts` early in the process paid huge dividends. It immediately caught serialization edge cases (like Mongoose getters on `.lean()` results vs full documents) and let us verify the version chains (v1 -> v2 -> v3) reliably.
- **Dynamic API Auto-Detection**: Building environment detection into the Axios fetcher meant zero manual configuration was required to switch the base URL dynamically between localhost (for local tests) and Render's backend endpoints.

---

## What Was Difficult
- **Mongoose vs. Lean Object Differences**: One of the main challenges was dealing with how Mongoose hooks up virtual properties and getters. When querying with `.lean()`, the virtual getter for `publicUrl` would not fire. We solved this by ensuring that endpoints retrieving comparison documents query for full, active Mongoose documents, while our background scanning service manually creates URLs based on raw document attributes, allowing it to continue using fast, lightweight `.lean()` queries.
- **SPA Deep Linking in Static Hosting**: Deploying a single-page app (Vite + React Router) to static hosting on Render causes a `404 Not Found` error when refreshing nested URLs (like `/audit/:id/diff` or `/results/:id`). Standardizing rewrite policies in `render.yaml` and `public/_redirects` was critical to ensure all traffic resolves gracefully back to `index.html`.

---

## Key Decisions
- **Manual vs. Scheduled Pricing Scans**: We opted for a manual/triggered pricing scan model rather than a recurring system cron. This was a pragmatic choice given the constraints of Render's free tier (which suspends idle instances) and successfully avoids unnecessary background CPU/DB utilization when no catalog changes have occurred.
- **Duplicate Notification Protections**: To prevent users from receiving multiple duplicate alerts for a single vendor price shift, we introduced protection fields (`lastNotificationSentAt` and `notificationVersion`). Users are only notified once per version change.

---

## Architecture Decisions
- **Embedded Snapshots in Audit Records**: Rather than creating a separate `PricingSnapshots` collection, we chose to embed the snapshot directly inside the `Audit` document at creation time. This guarantees that historical snapshots are immutable, simplifies our read queries (avoiding database joins), and keeps document payloads well under MongoDB's 16MB document size limit.
- **Version Chain Modeling**: Modeling re-audits as new versioned audit documents referencing the root original ID (`reAuditOf`) instead of mutating existing records preserves the historical integrity of client stacks, making it simple to calculate exactly what changed in recommendation deltas over time.

---

## What I'd Do Differently
- **Seed Data Helper scripts**: Having a predefined utility script to mock vendor catalog adjustments (e.g., increasing Cursor Pro pricing by $5/mo and updating database hashes) would have accelerated integration testing, reducing reliance on manual MongoDB Atlas edits.
- **Advanced State Adjustments on Params Shift**: While using `useEffect` for data-fetching is simple, React can throw lint warnings for setting state synchronously in an effect when route parameters change. Adjusting state in the render phase is a much cleaner approach.

---

## Lessons Learned
- **Plan for Deployment Constraints Early**: Issues like environment variable propagation, database connection string formats, and SPA routing rewrites are common deployment friction points. Testing on Render previews early in the cycle prevents late-stage pipeline bottlenecks.
- **Hardened Error Handling on Database Cold-Starts**: Render's free tier can cause database request timeouts if a database connection is requested before Atlas wakes up. Adding exponential retry logic to the initial database connection wrapper provides a seamless recovery mechanism.

---

## Technical Debt & Future Work
- **Cron/Scheduler Integration**: Once the product scales and moves off a free hosting plan, integrating a real scheduler (like BullMQ or a dedicated chron service) to query `/api/audits/detect-pricing-changes` once a day will make the pricing scans fully automated.
- **Granular Pricing Deltas**: Currently, price alerts notify users based on catalog changes across the whole system. A more advanced scanner could cross-reference the exact tools in a user's `inputStack` first, so we only alert them if a tool they *actually use* changes price.
