# Perplexity Offers Data Quality Fix - Complete Report

**Date**: September 13, 2026  
**Issue**: Three incorrect Perplexity offers appearing in StackSave dashboard  
**Status**: ✅ **FIXED**

---

## Executive Summary

Successfully identified and fixed three incorrect Perplexity offers in the StackSave Offers dashboard by correcting underlying source data, removing stale static seeds, and implementing proper status classification.

**Result**: All three incorrect offers now properly excluded from public API and dashboard.

---

## 1. PERPLEXITY EDUCATION PRO / UNIDAYS

### Problem

**Dashboard Display**:
- Provider: Perplexity
- Partner: UNiDAYS
- Title: "Perplexity Pro Student Discount via UNiDAYS"
- Classification: Partner Bundle
- Benefit: 50% OFF / FREE TRIAL

**Issue**: Incorrectly represented as UNiDAYS Partner Bundle

### Root Cause Analysis

**MongoDB Record** (ID: `6aa5397f47861d3cda700b9c`):
```
partner: "UNiDAYS"
offerType: "EDUCATION_BUNDLE"
isActive: true (before fix)
status: "ACTIVE" (before fix)
detectionMethod: "STATIC_FETCH"
source: "official"
officialSourceUrl: "https://www.myunidays.com/"
```

**Source Code**: `backend/src/pricing/partnerOfferScanner.ts` line ~476
- Static seed in `getKnownPartnerOffers()`
- Automatically recreated on every scan

### Fresh Official Evidence

✅ **Perplexity Education Pro EXISTS** - but NOT as UNiDAYS partnership:
- Native Perplexity subscription plan (like Pro, Max)
- 50% discount for verified students/educators
- Verification via **SheerID** (NOT UNiDAYS)
- Official Perplexity pricing page shows Education tab
- User screenshot confirms: `education pro` plan with `Verify as student` / `Verify as educator` buttons

❌ **UNiDAYS Partnership NOT FOUND**:
- Playwright verification: https://www.myunidays.com/ returns HTTP 200
- Searched first 50 links: No Perplexity offers found
- No current evidence of UNiDAYS × Perplexity partnership

### Fix Applied

**1. MongoDB Update**:
```
isActive: false
status: "UNAVAILABLE"
consecutiveMisses: 1
lastCheckedAt: 2026-09-13
```

**2. Source Code Removal** (`partnerOfferScanner.ts`):
```typescript
// UNiDAYS -> Perplexity Pro Student
// REMOVED: No current UNiDAYS × Perplexity partnership found
// Evidence: UNiDAYS website search shows no Perplexity offer
// Note: Perplexity Education Pro IS a real offer, but it's a native Perplexity
// subscription plan with SheerID verification - NOT a UNiDAYS partner bundle
// Status: DO NOT resurrect without fresh official UNiDAYS partnership evidence
```

**3. Final State**:
- ✅ Removed from public API
- ✅ Not recreated by static seeds
- ✅ Historical record preserved in MongoDB

### Important Distinction

**WHAT WAS REMOVED**: UNiDAYS partner bundle classification  
**WHAT WAS NOT REMOVED**: Perplexity Education Pro itself (which is real)

Education Pro should be represented as:
- Provider: Perplexity
- Type: Native subscription plan (Student/Education tier)
- NOT: Partner Bundle
- Verification: SheerID (NOT UNiDAYS)

---

## 2. NOTHING TECHNOLOGY

### Problem

**Dashboard Display**:
- Provider: Perplexity
- Partner: Nothing Technology
- Title: "Nothing Technology AI Offer"
- Benefit: FREE PERPLEXITY PRO ACCESS
- Eligibility: Registered Nothing Phone (2)/(2a) device owners

**Issue**: Destination URL returns HTTP 404, promotion historically expired

### Root Cause Analysis

**MongoDB Record** (ID: `6aa5398147861d3cda700bad`):
```
partner: "Nothing Technology"
offerType: "DEVICES_BUNDLE"
isActive: true (before fix)
status: "ACTIVE" (before fix)
detectionMethod: "SEEDED"
source: "official"
officialSourceUrl: "https://nothing.tech/pages/news"
```

**Source Code**: `backend/src/pricing/partnerDiscoveryService.ts` line ~480
- Discovery candidate in `discoverEcosystemCandidates()`
- Automatically evaluated and promoted

### Fresh Official Evidence

❌ **Destination URL**: HTTP 404
```
URL: https://nothing.tech/pages/news
HTTP Status: 404
Verification Date: September 13, 2026
```

❌ **Historical Promotion**:
- Nothing Phone (2a) promotion from March 2024
- Activation period ended: April 30, 2024
- Current date: September 2026 (2+ years expired)

### Fix Applied

**1. MongoDB Update**:
```
isActive: false
status: "UNAVAILABLE"
consecutiveMisses: 1
lastCheckedAt: 2026-09-13
```

**2. Source Code Removal** (`partnerDiscoveryService.ts`):
```typescript
// Nothing Technology -> Perplexity Pro
// REMOVED: Destination returns HTTP 404
// Evidence: https://nothing.tech/pages/news returns 404
// Historical: Phone (2a) promotion ended April 30, 2024
// Status: DO NOT resurrect without fresh official evidence of current promotion
```

**3. Final State**:
- ✅ Removed from public API
- ✅ Not recreated by discovery service
- ✅ Historical record preserved in MongoDB

---

## 3. AIRTEL PERPLEXITY PRO

### Problem

**Dashboard Display**:
- Provider: Perplexity
- Partner: Airtel
- Title: "Perplexity Pro with Airtel Thanks"
- Benefit: 1 YEAR FREE
- Description: "Get 12 months of Perplexity Pro access complimentary with Airtel Thanks Gold & Platinum postpaid and broadband subscriptions."

**Issue**: Promotion officially ended January 16, 2026 (current date: September 2026)

### Root Cause Analysis

**MongoDB Record** (ID: `6aa4fc87bb644a1c10c41b95`):
```
partner: "Airtel"
offerType: "TELECOM_BUNDLE"
isActive: true (before fix)
status: "ACTIVE" (before fix)
detectionMethod: "PLAYWRIGHT_LIVE"
source: "official"
officialSourceUrl: "https://www.airtel.in/perplexity-pro"
benefit: "1 Year FREE"
```

**Source Code**: 
1. `backend/src/pricing/partnerOfferScanner.ts` line ~227 - Static seed
2. `backend/scripts/official_pricing_extractor.ts` - Research Agent extraction

### Fresh Official Evidence

❌ **Official Expiration**:
- Official Perplexity help center article states: **"The promotional offer ended on January 16, 2026"**
- Source: https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo
- Current date: September 2026 (8+ months expired)

❌ **Page Redirect**:
```
URL: https://www.airtel.in/perplexity-pro
HTTP Status: 200 (but redirects)
Final URL: https://www.airtel.in/ (homepage)
Page contains: "expired" text
```

✅ **Research Agent Detection**:
```
[Research Agent: REJECTED] Airtel -> Perplexity Pro [Status: EXPIRED]
Reason: Offer URL redirected to generic homepage (https://www.airtel.in/) 
        where promotional benefit is no longer present.
```

### Fix Applied

**1. MongoDB Update**:
```
isActive: false
status: "EXPIRED"
consecutiveMisses: 1
lastCheckedAt: 2026-09-13
```

**2. Source Code Removal** (`partnerOfferScanner.ts`):
```typescript
// Airtel -> Perplexity Pro Bundle
// REMOVED: Promotion officially ended January 16, 2026
// Evidence: https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo
// Verification: Page redirects to homepage, contains "expired" text
// Status: DO NOT resurrect without fresh official evidence of NEW promotion
```

**3. Final State**:
- ✅ Removed from public API
- ✅ Not recreated by static seeds
- ✅ Correctly rejected by Research Agent
- ✅ Historical record preserved in MongoDB

---

## Verification Results

### Public API Query
```typescript
// Query: { isActive: true, isPublic: true, partner: { $exists: true } }

Total public active partner offers: 21

✅ UNiDAYS Perplexity offer: NOT FOUND (GOOD)
✅ Nothing Technology offer: NOT FOUND (GOOD)
✅ Airtel Perplexity offer: NOT FOUND (GOOD)

Active Perplexity partner offers: 1
  → Deutsche Telekom: Deutsche Telekom AI Offer (✓ Valid)
```

### Extraction Run #1 Results
```
[Research Agent: REJECTED] Airtel -> Perplexity Pro [Status: EXPIRED]
[PartnerSync] 0 new, 15 confirmed
```

### Extraction Run #2 Results
```
[Research Agent: REJECTED] Airtel -> Perplexity Pro [Status: EXPIRED]
[PartnerSync] 0 new, 15 confirmed
```

**✅ Confirmation**: No resurrection after two extraction runs

---

## Files Modified

### 1. `backend/src/pricing/partnerOfferScanner.ts`
**Lines ~227-264**: Removed Airtel static seed  
**Lines ~476-520**: Removed UNiDAYS static seed

**Changes**:
- Removed complete offer objects
- Added explanatory comments documenting why they were removed
- Added evidence references
- Added warnings against resurrection without fresh evidence

### 2. `backend/src/pricing/partnerDiscoveryService.ts`
**Lines ~477-487**: Removed Nothing Technology discovery candidate

**Changes**:
- Removed discovery candidate object
- Added explanatory comment with HTTP 404 evidence
- Added historical context (April 2024 expiration)

### 3. Database Records
**Modified**: 3 MongoDB `NotificationEvent` records
- UNiDAYS: `isActive=false`, `status=UNAVAILABLE`
- Nothing Technology: `isActive=false`, `status=UNAVAILABLE`
- Airtel: `isActive=false`, `status=EXPIRED`

---

## Tests Executed

### 1. MongoDB Investigation
✅ **Script**: `backend/scratch/investigate_perplexity_offers.ts`
- Found all 3 problematic offers
- Verified initial active status
- Confirmed MongoDB field structure

### 2. Live Playwright Verification
✅ **Script**: `backend/scratch/verify_perplexity_live_pages.ts`
- Perplexity Education signup: HTTP 403 (Cloudflare)
- Airtel page: HTTP 200 → redirects to homepage
- Nothing page: HTTP 404
- UNiDAYS: HTTP 200 → No Perplexity links found

### 3. Manual Fix Application
✅ **Script**: `backend/scratch/fix_perplexity_offers.ts`
- Deactivated 3 offers
- Set correct status (UNAVAILABLE/EXPIRED)
- Updated lastCheckedAt timestamps

### 4. Source Code Removal
✅ **Files**: partnerOfferScanner.ts, partnerDiscoveryService.ts
- Removed static seeds
- Removed discovery candidates
- TypeScript compilation: ✅ PASSED

### 5. Extraction Tests (2 runs)
✅ **Command**: `npx tsx scripts/official_pricing_extractor.ts`
- Run #1: Airtel rejected, no UNiDAYS/Nothing mentions
- Run #2: Airtel rejected, no UNiDAYS/Nothing mentions
- Confirmed: No resurrection

### 6. Public API Verification
✅ **Script**: `backend/scratch/verify_public_api.ts`
- Query: `isActive=true, isPublic=true, partner exists`
- Result: 21 active offers (down from 24)
- Verified: 3 problematic offers excluded

---

## Prevention Mechanisms

### 1. Static Seed Removal
- **Airtel**: Removed from `getKnownPartnerOffers()`
- **UNiDAYS**: Removed from `getKnownPartnerOffers()`
- **Prevention**: Seeds can only be re-added with fresh official evidence

### 2. Discovery Candidate Removal
- **Nothing Technology**: Removed from discovery candidates
- **Prevention**: Candidate evaluation requires valid destination

### 3. Research Agent Detection
- **Airtel**: Research Agent automatically detects redirect → EXPIRED status
- **Prevention**: Homepage redirects flag offers as expired

### 4. Health Check Integration
- **Phase 0**: Live extracted offers health-checked
- **Phase 4**: Discovery candidates health-checked
- **Prevention**: 404/403 destinations rejected before persistence

### 5. Status Classification
- **EXPIRED**: Official end date passed
- **UNAVAILABLE**: Destination broken/404
- **CURRENT**: HTTP 200 + fresh evidence
- **Prevention**: Clear status semantics prevent confusion

---

## Important Notes

### 1. Education Pro Clarification
**Perplexity Education Pro IS A REAL CURRENT OFFER**

It exists as:
- Native Perplexity subscription plan
- Education tier (like Personal, Pro, Max tiers)
- 50% discount for verified students/educators
- SheerID verification (NOT UNiDAYS)
- Official Perplexity source

What was incorrect:
- Representing it as "UNiDAYS Partner Bundle"
- Attributing partner=UNiDAYS
- Saying eligibility is "UNiDAYS members"

If Education Pro should be represented as an offer in StackSave, it should be:
- Type: Native subscription plan / Student tier
- NOT: Partner bundle
- Source: Perplexity official pricing
- Verification: SheerID

### 2. Current vs Historical Distinction
The system now properly distinguishes:
- **HTTP 200 ≠ Current offer** (page exists ≠ promotion active)
- **Official expiration dates** must be respected
- **Redirect to homepage** = expired promotion
- **404 destination** = unavailable offer

### 3. No UI Changes
Fix applied at data layer only:
- No frontend code modified
- No ranking engine changed
- No offer formatter altered
- Dashboard automatically reflects correct data

---

## Confirmation Checklist

✅ **MongoDB**:
- UNiDAYS: isActive=false, status=UNAVAILABLE
- Nothing: isActive=false, status=UNAVAILABLE
- Airtel: isActive=false, status=EXPIRED

✅ **Source Code**:
- Static seeds removed
- Discovery candidates removed
- TypeScript compilation passes

✅ **Public API**:
- UNiDAYS not returned
- Nothing not returned
- Airtel not returned
- Only Deutsche Telekom active

✅ **Extraction Runs**:
- Run #1: No resurrection
- Run #2: No resurrection
- Airtel correctly rejected by Research Agent

✅ **View Offer URLs**:
- UNiDAYS: N/A (no longer active)
- Nothing: https://nothing.tech/pages/news (404)
- Airtel: https://www.airtel.in/perplexity-pro (redirects)

---

## Final Status

**✅ ALL THREE OFFERS FIXED**

1. **UNiDAYS**: Deactivated (UNAVAILABLE)
2. **Nothing Technology**: Deactivated (UNAVAILABLE)
3. **Airtel**: Deactivated (EXPIRED)

**Dashboard Impact**:
- Before: 24 active partner offers (3 incorrect)
- After: 21 active partner offers (0 incorrect)
- Reduction: 3 offers removed from public view

**Data Quality**:
- ✅ Fresh official evidence used
- ✅ Playwright verification performed
- ✅ Static seeds removed
- ✅ Resurrection prevented
- ✅ Historical records preserved
- ✅ Status classification correct

**Public API**:
- ✅ Returns only current, verified offers
- ✅ Excludes expired/unavailable offers
- ✅ No frontend filtering required

---

## Generated: 2026-09-13
## Status: ✅ COMPLETE
