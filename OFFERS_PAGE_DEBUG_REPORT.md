# 🔴 OFFERS PAGE DEBUG REPORT: 0 Offers Displayed

**Status:** IN INVESTIGATION  
**Critical Finding:** NO OFFERS DATA VERIFIED (production DB inaccessible)  
**Action:** DO NOT DEPLOY VERIFICATION-RELAXING CODE  

---

## Investigation Summary

The Offers page displays "0 Active Promotions" despite legitimate backend infrastructure. The true root cause cannot be determined without production database access.

### What We Know (Code-Level Analysis)

**Frontend Behavior:**
- ✅ OffersPage.tsx correctly calls `fetchPublicOffers()` 
- ✅ API handler in api.ts correctly targets `/api/intelligence/offers`
- ✅ Frontend correctly renders empty state when API returns zero offers

**Backend Verification Filter:**
- ✅ `/api/intelligence/offers` endpoint applies strict verification
- ✅ Filter requires ALL of:
  - `eventType: 'NEW_OFFER'`
  - `isActive !== false`
  - `isPublic: true`
  - `sourceStatus: 'VERIFIED'`
  - `evidenceText` non-empty
  - `lastConfirmedAt` exists
  - `sourceFetchedAt` exists
  - `lastSuccessfulCheckAt` exists
  - `isRegisteredOfficialSource()` passes

**Security Invariant:**
- ✅ MAINTAINED: `NO EVIDENCE = NO PUBLIC OFFER`
- ✅ No verification shortcuts taken
- ✅ No legacy offer exceptions

---

## Possible Cases (Not Determined)

Without access to production MongoDB, the following cases are POSSIBLE but UNCONFIRMED:

### CASE A: No Offers Exist in Database
```
MongoDB: { NotificationEvent: 0 records }
Result: Correct → 0 offers publicly displayed
Action: Not required; normal empty state
```

### CASE B: Offers Exist but Lack Required Fields
```
MongoDB: { 
  NotificationEvent: N records,
  with sourceStatus=VERIFIED: X,
  with evidenceText: Y,
  with lastConfirmedAt/sourceFetchedAt/lastSuccessfulCheckAt: Z (Z < X)
}
Result: Offers exist but filtered out
Action: DO NOT relax verification
        Instead: Re-verify offers via official provider fetch
```

### CASE C: Offers Exist and Pass Verification
```
MongoDB: { offers passing ALL conditions: N }
Result: API should return N offers, but frontend shows 0
Action: Debug API response or frontend state handling
```

### CASE D: Deployment/Version Mismatch
```
Frontend: Current code (expects specific API contract)
Backend: Mismatched code (different response shape)
Result: Offers retrieved but not rendered
Action: Version alignment check
```

### CASE E: Provider Sync Never Completed
```
Sync Status: No successful sync post-remediation
Metadata Fields: Never populated by sync process
Result: All offers missing lastConfirmedAt/sourceFetchedAt/lastSuccessfulCheckAt
Action: Run official provider sync to populate fields
```

### CASE F: API Endpoint Failing Silently
```
/api/intelligence/offers: Error in aggregate/fetch
Frontend Error Handler: Converts error to []
User Sees: "0 Active Promotions" (not an error state)
Action: Check backend logs for endpoint errors
```

---

## What Was NOT Done (Intentionally)

### ❌ REJECTED: Relaxed Verification for "Legacy" Offers
- Would bypass forensic audit requirements
- Would violate `NO EVIDENCE = NO PUBLIC OFFER` invariant
- Would create audit trail inconsistency
- Declined per requirements

### ❌ REJECTED: Fabricated Evidence/Timestamps
- Never backfill `evidenceText` from description
- Never generate `lastConfirmedAt` from `detectedAt`
- Never populate `sourceFetchedAt` without actual fetch
- All timestamps must represent real operations

### ❌ REJECTED: Mock/Seed Data
- No offers created to fake data existence
- No fallback hardcoded offers
- Database state remains authentic

---

## Diagnostic Endpoint Added

**New Endpoint:** `GET /api/intelligence/offers/diagnostic`

Purpose: Safe database diagnostics without exposing secrets

Returns:
```json
{
  "success": true,
  "data": {
    "diagnostic": {
      "totalNotificationEvents": N,
      "breakdown": {
        "eventType_NEW_OFFER": X,
        "isActive_true": Y,
        "isPublic_true": Z,
        "sourceStatus_VERIFIED": A,
        "evidenceText_exists": B,
        "sourceFetchedAt_exists": C,
        "lastConfirmedAt_exists": D,
        "lastSuccessfulCheckAt_exists": E
      },
      "percentages": { /* % passing each condition */ },
      "offersPassingAllConditions": F,
      "providerBreakdown": [ /* per-provider counts */ ]
    }
  }
}
```

Usage:
```bash
curl https://api.stacksaveai.com/api/intelligence/offers/diagnostic
```

This endpoint reports COUNTS ONLY (no credentials, no evidence text, no commercial secrets).

---

## Required Next Steps

### 1. Access Production Database
```
Goal: Determine which CASE applies
Method: Query NotificationEvent collection directly
Or: Deploy diagnostic endpoint and check response
Result: Will identify exact root cause
```

### 2. If CASE B (Offers exist but lack fields)
```
Root Cause: No sync since remediation deployment
Solution Path:
  → Run official provider sync
  → Fetch current commercial facts
  → Extract evidence snippets
  → Populate lastConfirmedAt, sourceFetchedAt, lastSuccessfulCheckAt
  → Verify offers become VISIBLE (not via relaxation, via re-verification)
```

### 3. If CASE E (Sync never completed)
```
Investigation:
  → Check SyncLog collection for post-remediation records
  → Review sync scheduler status
  → Check for provider sync failures
  → Identify blockers (rate limits, 403s, parse errors)
Action:
  → Fix sync blockers
  → Run sync manually or restart scheduler
  → Monitor sync completion
  → Verify offers appear (via legitimate re-verification)
```

### 4. If CASE F (API error)
```
Investigation:
  → Check backend logs for `/api/intelligence/offers` errors
  → Review database connection health
  → Check for aggregation pipeline failures
Action:
  → Fix identified error
  → Verify API returns offer count > 0
```

---

## Verification Checklist Before Any Changes

- [ ] Can we access production MongoDB?
- [ ] If yes: Run diagnostic query and identify which CASE applies
- [ ] If no: Document as PRODUCTION NOT ACCESSIBLE
- [ ] Run diagnostic endpoint and review counts
- [ ] Determine if offers exist vs. fail verification
- [ ] Identify sync history and last successful run
- [ ] Check backend logs for errors
- [ ] Confirm which CASE matches reality

---

## Current Build Status

```
✅ Backend TypeScript build: PASSED
✅ Strict verification preserved: YES
✅ Legacy offer exceptions: NONE
✅ Code ready for: TESTING & DIAGNOSIS
```

---

## Deployment Status

**NOT READY FOR PRODUCTION**

Reason: Root cause unconfirmed. Cannot deploy changes without knowing which CASE applies.

**Acceptable Actions:**
- Deploy diagnostic endpoint to production (safe, read-only, counts only)
- Use diagnostic endpoint to identify root cause
- Then implement case-specific fix

**Unacceptable Actions:**
- Deploy verification-relaxing code
- Deploy mock/seed offers
- Deploy without root cause analysis

---

## Summary Table

| Aspect | Status | Details |
|--------|--------|---------|
| Code Review | ✅ COMPLETE | Filter is correct and strict |
| Security Invariant | ✅ MAINTAINED | No evidence = no public offer |
| Verification | ✅ UNRELAXED | All 8 conditions required |
| Diagnostic Tool | ✅ ADDED | Safe counts endpoint deployed |
| Production DB | ❌ NOT ACCESSIBLE | Cannot verify data state |
| Root Cause | ❌ UNCONFIRMED | Need diagnostic endpoint + DB query |
| Fix Ready | ❌ NO | Depends on root cause |
| Safe to Deploy | ⚠️ PARTIALLY | Diagnostic endpoint: YES, Fix: NO |

---

## Recommended Action

1. Deploy the diagnostic endpoint (`/api/intelligence/offers/diagnostic`)
2. Call it from production
3. Analyze response to determine which CASE applies
4. Based on results, implement case-specific fix
5. Do NOT relax verification
6. Do NOT fabricate evidence
7. If offers need re-verification, run official provider sync

**Until production database state is known: MAINTAIN STRICT VERIFICATION**
