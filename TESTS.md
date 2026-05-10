# TESTS.md

List every automated test you wrote: filename, what it covers, how to run it

---

## Testing Philosophy

The audit engine received the highest testing priority because it's the only part of the codebase where a bug directly produces wrong financial advice. A miscalculated saving, a rule that fires when it shouldn't, or a boundary condition off by one character gives a real user a recommendation to cancel a subscription they should keep — or miss one they should cancel. That's a credibility problem, not just a code bug.

Deterministic financial logic needs edge-case tests specifically because the interesting behavior lives at the boundaries: exactly 25% unused seats, exactly $200/mo API spend, two tools with identical cost. Manual testing naturally gravitates to the "obvious" cases. Unit tests with controlled inputs force the boundary conditions to be explicit and verified.

Integration tests were included in addition to unit tests because individual rule correctness doesn't guarantee the engine orchestration is correct. The deduplication logic, savings cap (`min(savings, totalSpend)`), and `isAlreadyOptimal`/`isHighSavings` flags only exist at the engine level — those needed an end-to-end test to confirm the wiring was right.

---

## How to Run Tests

```bash
cd backend
npm test
# or for watch mode during development:
npm run test:watch
```

**Expected output:** 25 tests, all passing.

---

## Primary Test File

**Filename:** `backend/tests/audit-engine.test.ts`  
**Framework:** Vitest  
**Coverage:** All 7 audit engine rules + 3 integration tests + 9 validation tests  
**How to run:** `cd backend && npm test`

---

## Complete Test List (25 Tests Total)

### Audit Engine Rules (13 Tests)

| # | Test Suite | Test Name | What It Covers |
|---|---|---|---|
| 1 | `ruleOverpaidPlan` | flags team plan for a 1-person team | Detects when team plan chosen for single user, calculates correct saving |
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

### Integration Tests (3 Tests)

| # | Test Suite | Test Name | What It Covers |
|---|---|---|---|
| 14 | `runAudit (integration)` | returns a complete AuditResult with correct totals | End-to-end: 2-tool audit produces valid AuditResult with correct totalMonthlySpend, annualSavings = monthlySavings × 12, savings ≤ total spend, publicUrl contains auditId |
| 15 | `runAudit (integration)` | marks audit as already optimal when stack is well-optimized | Single individual-plan user → savings < $20 → isAlreadyOptimal behavior |
| 16 | `runAudit (integration)` | marks high savings audits correctly | $5,000/mo API spend → isHighSavings = true |

### Validation Tests (9 Tests)

| # | Test Suite | Test Name | What It Covers |
|---|---|---|---|
| 17 | `validateAuditRequest` | rejects empty request body | null/undefined body → validation error |
| 18 | `validateAuditRequest` | rejects request with no tools | Empty tools array → validation error |
| 19 | `validateAuditRequest` | rejects invalid tool ID | Unknown tool ID → validation error |
| 20 | `validateAuditRequest` | rejects duplicate tools | Same tool twice → validation error |
| 21 | `validateAuditRequest` | rejects team size over 10,000 | Bounds check — prevents absurd inputs |
| 22 | `validateAuditRequest` | accepts valid audit request | Well-formed request → valid |
| 23 | `validateEmail` | rejects empty email | Empty string → validation error |
| 24 | `validateEmail` | rejects invalid email format | Missing @ → validation error |
| 25 | `validateEmail` | accepts valid email | Standard email → valid |

---

## GitHub Actions CI Workflow

**File:** `.github/workflows/ci.yml`

### Purpose

CI exists specifically to prevent regression in audit calculations. Because the engine is deterministic, its outputs should never silently change — a rule that saved $95 last week should save $95 this week unless the pricing data was intentionally updated. Automated checks on every push to main mean that a catalog change or rule edit that accidentally breaks the math fails loudly in CI before it reaches users, rather than quietly producing wrong financial recommendations in production.

### What It Covers:
- **Backend Lint & Tests**: Runs TypeScript type check and all 25 tests on every push to main/develop
- **Frontend Lint & Type Check**: Runs TypeScript type check and ESLint on frontend code
- **Triggers**: Push to main/develop branches, pull requests to main
- **Node Version**: 20
- **Cache**: npm dependencies for faster builds

### How to Verify Green Checks:
1. Go to: `https://github.com/Dashwanth15/stacksave-ai-audit/actions`
2. Latest commit should show green ✓ checks for both jobs
3. `backend-lint-test` job must show "25 tests passed"

### CI Commands:
```yaml
# Backend tests
npm test                    # Runs all 25 tests
npm run typecheck          # TypeScript compilation check

# Frontend checks  
npm run typecheck          # TypeScript compilation check
npm run lint               # ESLint code quality check
```

---

## What Is NOT Tested (and Why)

The testing priority was the core business logic — the audit engine rules, savings calculations, and input validation. These are the only parts of the codebase where a bug produces a wrong answer that a user acts on. Infrastructure and external services were intentionally left out of the automated test suite at MVP stage; mocking them adds setup complexity without increasing confidence in the logic that actually matters.

- **MongoDB integration** — Requires live Atlas connection; not suitable for CI without secrets. The DB layer (`dbService.ts`) is simple Mongoose CRUD — the interesting logic is in the engine, which is fully unit-tested.
- **Grok API** — External API; deeply mocking it would test the mock, not the behavior. The graceful fallback is implicitly covered by the integration tests (AI summary defaults to empty string in test environment).
- **Resend email** — External service. Not mocked in unit tests; tested manually during deployment validation.
- **PDF generation** — Visual output testing requires browser automation; core logic is tested through the audit engine tests that generate the data used in PDFs.
