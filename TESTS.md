# Tests — StackSave AI Audit

## How to Run

```bash
cd backend
npm test
# or for watch mode during development:
npm run test:watch
```

**Expected output:** 16 tests, all passing.

---

## Test File

**File:** `backend/tests/audit-engine.test.ts`
**Framework:** Vitest
**Coverage scope:** All 7 audit engine rules + 3 integration tests

---

## Test List

| # | Test Suite | Test Name | What It Covers |
|---|---|---|---|
| 1 | `ruleOverpaidPlan` | flags team plan for a 1-person team | Detects when a team plan is chosen for a single user, calculates correct saving |
| 2 | `ruleOverpaidPlan` | does NOT flag Pro plan for a 1-person team | Ensures cheapest paid plan isn't falsely flagged |
| 3 | `ruleOverpaidPlan` | does NOT flag Business plan for a 10-person team | Ensures appropriately-sized plans aren't incorrectly downgraded |
| 4 | `ruleUnusedSeats` | flags 8 seats paid for a 3-person team (>25% unused) | Detects seat waste, verifies exact saving calculation (5 unused × $19 = $95) |
| 5 | `ruleUnusedSeats` | does NOT flag when unused seats is under 25% | Boundary condition — 25% exactly should NOT fire (only >25%) |
| 6 | `ruleUnusedSeats` | does NOT flag free-tier tools (no saving possible) | Free plans can't generate savings from seat reduction |
| 7 | `ruleOverlappingTools` | flags the more expensive of two IDE tools in the same stack | When Cursor ($60) and Windsurf ($45) are both in stack, Cursor is flagged; Windsurf is not |
| 8 | `ruleOverlappingTools` | does NOT flag when only one IDE tool is in the stack | Single-tool stacks shouldn't generate overlap insights |
| 9 | `ruleAnnualDiscount` | flags Cursor Pro monthly when annual saves 20% | Detects annual billing savings, calculates $8/mo saving correctly (2 seats × $4 delta) |
| 10 | `ruleAnnualDiscount` | does NOT flag free plans | Free plans have no annual equivalent |
| 11 | `ruleRetailVsCredits` | flags high OpenAI API spend (>$200/mo) | High API spend triggers credits recommendation, 25% of $800 = $200 saving |
| 12 | `ruleRetailVsCredits` | does NOT flag low API spend (<$200/mo) | $150/mo is below threshold |
| 13 | `ruleRetailVsCredits` | does NOT fire on non-API tools (e.g., ChatGPT Plus) | Credits rule only applies to raw API tools, not chat subscriptions |
| 14 | `runAudit (integration)` | returns a complete AuditResult with correct totals | End-to-end: 2-tool audit produces valid AuditResult with correct totalMonthlySpend, annualSavings = monthlySavings × 12, savings ≤ total spend, publicUrl contains auditId |
| 15 | `runAudit (integration)` | marks audit as already optimal when stack is well-optimized | Single individual-plan user → savings < $20 → isAlreadyOptimal behavior |
| 16 | `runAudit (integration)` | marks high savings audits correctly | $5,000/mo API spend → isHighSavings = true |

---

## CI Integration

Tests run automatically on every push to `main` via GitHub Actions.
See `.github/workflows/ci.yml` — the `backend-lint-test` job runs `npm test`.

CI must show green checks on the latest commit. Verify at:
`https://github.com/<your-username>/stacksave/actions`

---

## What Is NOT Tested (and Why)

- **MongoDB integration** — Requires live Atlas connection; not suitable for CI without secrets. The DB layer (`dbService.ts`) is simple Mongoose CRUD — the interesting logic is in the engine, which is fully unit-tested.
- **Grok API** — External API; mocked in production tests would require additional setup. The graceful fallback is implicitly tested by the engine integration tests (AI summary defaults to empty string in test environment).
- **Resend email** — External service. Not mocked in unit tests; tested manually during deployment validation.
