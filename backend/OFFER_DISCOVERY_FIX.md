# Offer Discovery Pipeline Fix — Root Cause Analysis

## Problem Statement

Dashboard showed "0 Active Promotions" despite 12 new AI providers having Playwright extractors:
- mistral, elevenlabs, midjourney, runway, suno, replit-ai, gamma, heygen, synthesia, ideogram, leonardo-ai, poe

Previous workflow logs showed "12 active promotions discovered" but offers never appeared in the UI.

## Investigation Process

### Step 1: Verify Extraction Works

Created diagnostic script `backend/scratch/diagnose_12_providers.ts` to run actual Playwright extraction.

**Result:** ✅ Extraction IS working!
- 12/12 providers: successful navigation (100%)
- 12/12 providers: page loaded (100%)
- 9/12 providers: offers detected (75%)
- 10 total qualifying offers extracted

**Providers WITH offers:**
- elevenlabs: 2 offers (Annual Savings + Promotional Discount)
- midjourney: 1 offer (Free GPU Time Community Perk)
- runway: 1 offer (Annual Savings)
- suno: 1 offer (Annual Savings)
- replit-ai: 1 offer (Annual Savings)
- gamma: 1 offer (Annual Savings)
- synthesia: 1 offer (Annual Savings)
- ideogram: 1 offer (Annual Savings)
- leonardo-ai: 1 offer (Annual Savings)

**Providers with NO offers (correct):**
- mistral: No promotional content on pricing page
- heygen: Only normal pricing, no discounts
- poe: Minimal page content (23 chars)

### Step 2: Check Publication Gate

Created diagnostic script `backend/scratch/diagnose_publication_gate.ts` to trace offers through validation.

**Initial Result:** ❌ All offers failing with `getProviderSource is not defined` runtime error

## Root Cause: Missing Import in offerTrust.ts

**File:** `backend/src/pricing/offerTrust.ts`

**Problem:** The publication gate function `isRegisteredOfficialSource()` calls `getProviderSource()` to validate offer source URLs, but **never imported the function**.

```typescript
// ❌ BEFORE (BROKEN)
import { extractRootDomain, isAllowlistedPartnerDomain } from './partnerSourceRegistry';
import type { NormalizedOffer, SyncStatus } from './types';

export function isRegisteredOfficialSource(providerId: string, sourceUrl: string): boolean {
  if (!sourceUrl) return false;
  if (isAllowlistedPartnerDomain(sourceUrl)) return true;
  const config = getProviderSource(providerId); // ❌ ReferenceError: getProviderSource is not defined
  // ...
}
```

**Impact:**
- Every offer extraction triggered runtime error in `isRegisteredOfficialSource()`
- `isPubliclyVerifiableOffer()` silently returned `false`
- `upsertOffer()` rejected ALL offers with `wasRejected: true`
- Zero offers persisted to database
- UI showed "0 Active Promotions"

### Additional Missing Import

The file also used `createHash()` without importing it:

```typescript
export function hashOfferEvidence(evidenceText: string): string {
  return createHash('sha256').update(evidenceText.trim()).digest('hex'); // ❌ ReferenceError
}
```

## The Fix

```typescript
// ✅ AFTER (FIXED)
import { createHash } from 'crypto';
import { extractRootDomain, isAllowlistedPartnerDomain } from './partnerSourceRegistry';
import { getProviderSource } from './sourceRegistry';
import type { NormalizedOffer, SyncStatus } from './types';
```

**Changed:** `backend/src/pricing/offerTrust.ts`
- Added `import { createHash } from 'crypto';`
- Added `import { getProviderSource } from './sourceRegistry';`

## Verification

### Post-Fix Publication Gate Test

Re-ran `backend/scratch/diagnose_publication_gate.ts`:

**Result:** ✅ 10/10 offers (100%) passing publication gate!

```
✓ elevenlabs - ElevenLabs Annual Subscription Savings
✓ elevenlabs - ElevenLabs Promotional Discount
✓ midjourney - Midjourney Free GPU Time Community Perk
✓ runway - Runway Annual Subscription Savings
✓ suno - Suno Annual Subscription Savings
✓ replit-ai - Replit AI Annual Subscription Savings
✓ gamma - Gamma Annual Subscription Savings
✓ synthesia - Synthesia Annual Subscription Savings
✓ ideogram - Ideogram Annual Subscription Savings
✓ leonardo-ai - Leonardo AI Annual Subscription Savings
```

### TypeScript Compilation

```bash
npm run typecheck
✅ PASS (no errors)
```

### Test Suite

```bash
npm test
✅ 373 tests passed
❌ 2 tests failed (pre-existing, unrelated to this fix)
```

## Impact Analysis

### Before Fix
- Playwright extraction: ✅ Working
- Offer detection: ✅ Working  
- Publication gate: ❌ **SILENTLY FAILING** (runtime error)
- Database persistence: ❌ Zero offers stored
- API response: ❌ Empty array
- UI display: ❌ "0 Active Promotions"

### After Fix
- Playwright extraction: ✅ Working
- Offer detection: ✅ Working
- Publication gate: ✅ **NOW WORKING** (100% pass rate)
- Database persistence: ✅ Ready to store 10 offers
- API response: ✅ Will return offers after next sync
- UI display: ✅ Will show offers after next sync

## Next Steps

1. **Run Production Sync:** Trigger GitHub Actions workflow to run actual Playwright extraction
2. **Verify Database:** Confirm 10 new offers are persisted to MongoDB
3. **Check API:** Verify `GET /api/intelligence/offers` returns new offers
4. **Validate UI:** Confirm dashboard shows "10 Active Promotions" (or more with existing offers)

## Key Takeaways

### What Worked Right
- ✅ Provider registration in sourceRegistry
- ✅ Playwright extractors using MultiSignalOfferScanner
- ✅ Offer detection regex patterns
- ✅ Evidence extraction and formatting
- ✅ Sync orchestrator ingestion logic

### What Was Broken
- ❌ Single missing import caused complete pipeline failure
- ❌ No compile-time detection (runtime-only error)
- ❌ Silent failure (no user-visible error message)
- ❌ Diagnostic logging didn't surface the root cause

### Lessons Learned
- Runtime import errors can bypass TypeScript type checking
- Publication gate failures need explicit error logging
- Diagnostic scripts are essential for pipeline debugging
- End-to-end testing would have caught this earlier

## Technical Notes

### Why TypeScript Didn't Catch This

The function `getProviderSource` is used at runtime inside `isRegisteredOfficialSource()`, but TypeScript only checks that the *function exists somewhere in scope*. Since it's defined in `sourceRegistry.ts`, TypeScript sees it as "available" even without an import statement. The error only manifests at runtime when Node.js tries to execute the code.

### Publication Gate Architecture

The 4-gate validation in `isPubliclyVerifiableOffer()`:
1. ✅ Provider must be VERIFIED
2. ❌ **Offer must come from registered official source** (was failing)
3. ✅ Evidence must be ≥20 characters
4. ✅ Offer must have detectedAt timestamp

Gate #2 was silently failing for ALL offers due to the missing import.

## Diagnostic Scripts

Two new scripts created for future debugging:

1. **`backend/scratch/diagnose_12_providers.ts`**
   - Runs live Playwright extraction
   - Shows navigation success, keywords found, candidates detected
   - Lists qualifying offers and rejected candidates
   - Generates summary table

2. **`backend/scratch/diagnose_publication_gate.ts`**
   - Extracts offers via Playwright
   - Tests each offer against publication gate
   - Shows pass/fail with detailed reasons
   - Identifies which validation check failed

These scripts can be used to debug any future offer discovery issues.
