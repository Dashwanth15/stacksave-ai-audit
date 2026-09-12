# Xiaomi Offer Bug — Root Cause Analysis

**Date:** August 24, 2026  
**Bug:** Offers with broken destinations (404, 403, unavailable) appear in frontend  
**Example:** Xiaomi × Google Gemini offer  
**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## Problem Statement

The user reports that the Xiaomi × Google Gemini offer displays in the Offers dashboard, but clicking "View Offer" leads to:
- `https://www.mi.com/global/errors/404` (per user screenshot)
- Or HTTP 403 Access Denied (per our Playwright test)

This indicates broken offers are passing validation and being published as ACTIVE.

---

## Forensic Investigation Results

### MongoDB Record

```
Partner: Xiaomi
Title: Xiaomi AI Offer
Provider: gemini (Google Gemini)
Source URL: https://www.mi.com/global/support/faq/details/KA-100223/
Destination URL: https://www.mi.com/global/support/faq/details/KA-100223/
Is Active: true          ← BUG
Status: ACTIVE           ← BUG
Detection Method: SEEDED
Last Confirmed: 2026-09-12 21:16:13
```

### Playwright Health Check (Our Test)

```
[Navigating to] https://www.mi.com/global/support/faq/details/KA-100223/
[Initial Status] 403
[Final URL] https://www.mi.com/global/support/faq/details/KA-100223/
[Page Title] Access Denied
[Page Content] "Access Denied - You don't have permission to access..."
[Is Reachable] false
```

**Result:** URL is UNREACHABLE (HTTP 403 Access Denied)

---

## Root Cause Analysis

### Issue #1: Discovery Candidates Bypass Health Checks

**Evidence:**
1. Xiaomi is in `partnerDiscoveryService.ts` static ecosystem candidates (line ~499)
2. Detection method: `SEEDED` (from discovery candidates, not Playwright research)
3. Partner scanner Phase 4 processes discovery candidates
4. **Candidates are persisted as ACTIVE without Playwright destination validation**

**Data Flow:**
```
partnerDiscoveryService.discoverEcosystemCandidates()
    ↓
{
  partnerName: 'Xiaomi',
  sourceUrl: 'https://www.mi.com/global/support/faq/details/KA-100223/',
  possibleAiProvider: 'gemini',
  ...
}
    ↓
partnerOfferScanner.runFullScan() → Phase 4
    ↓
PartnerDiscoveryService.evaluateCandidate(candidate)
    ↓
if (evalResult.promoted) {
  await persistPartnerOffer(evalResult.offer, true);  ← MARKED ACTIVE WITHOUT HEALTH CHECK
}
    ↓
MongoDB: isActive=true, status=ACTIVE
    ↓
NO DESTINATION VALIDATION PERFORMED
```

###Issue #2: Source URL vs Destination URL Confusion

**Critical Distinction:**
- **Source URL**: Where Playwright discovered the offer (e.g., partner's offers page)
- **Destination URL**: What users click via "View Offer" button

**Problem:** The Xiaomi offer has:
- `sourceUrl`: `https://www.mi.com/global/support/faq/details/KA-100223/`
- `destinationUrl`: `N/A` (not set)
- Frontend uses `sourceUrl` as the View Offer href

**If the health check only validated the source page, it would NOT detect that the destination is broken.**

### Issue #3: Health Check Detects Wrong Status Codes

The existing health check in `offerDestinationHealthCheck.ts` checks for:
- HTTP 404
- HTTP 410
- Page content: "404 not found", "page not found", etc.

**But it does NOT check for:**
- HTTP 403 (Access Denied)
- HTTP 401 (Unauthorized)
- HTTP 50x (Server Errors)
- Other non-200 success codes

### Issue #4: Reconciliation Has 7-Day Grace Period

The reconciliation logic added for SoftBank has a 7-day grace period. This means:
- Day 1: Xiaomi offer discovered, marked ACTIVE
- Day 2-7: Offer remains ACTIVE even if not confirmed
- Day 8: Offer deactivated if still not confirmed

**This is intentional** to prevent false positives from temporary network issues, but it means broken offers can remain active for up to 7 days.

---

## Why This Happens

### Discovery Candidates Are Trusted Without Validation

**Current Logic:**
```typescript
// Phase 4: Discovery candidates
const candidates = PartnerDiscoveryService.discoverEcosystemCandidates();
for (const candidate of candidates) {
  const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
  if (evalResult.promoted && evalResult.offer) {
    // ❌ NO HEALTH CHECK HERE
    await persistPartnerOffer(evalResult.offer, true);
  }
}
```

**Missing Step:**
```typescript
// Phase 4: Discovery candidates (CORRECTED)
const candidates = PartnerDiscoveryService.discoverEcosystemCandidates();
for (const candidate of candidates) {
  const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
  if (evalResult.promoted && evalResult.offer) {
    // ✅ ADD HEALTH CHECK HERE
    const healthCheck = await checkOfferDestination(page, evalResult.offer.officialSourceUrl, 10000);
    if (healthCheck.status !== 'VALID') {
      console.log(`   ❌ [Discovery Candidate REJECTED] ${candidate.partnerName}: ${healthCheck.statusReason}`);
      continue;
    }
    await persistPartnerOffer(evalResult.offer, true);
  }
}
```

### Health Check Scope Is Too Narrow

**Current Detection:**
- HTTP 404 ✅
- HTTP 410 ✅
- Page content "404" ✅
- Page content "not found" ✅

**Missing Detection:**
- HTTP 403 ❌
- HTTP 401 ❌
- HTTP 50x ❌
- HTTP 3xx redirects to error pages ❌
- "Access Denied" content ❌
- "Forbidden" content ❌

---

## Comparison: Playwright Research vs Discovery Candidates

### Playwright Research (Works Correctly)

**Partners in `extractOfficialPartnerOffers()` hardcoded array:**
- Jio
- Airtel  
- Google Pixel
- Samsung
- ASUS

**Process:**
```
extractOfficialPartnerOffers(browser)
    ↓
For each hardcoded partner source:
    ↓
PlaywrightOfferResearchAgent.researchPartnerBundle(browser, source)
    ↓
probeDestination(page, url) → includes health check
    ↓
if (status === 'CURRENT' && verifiedOffer) {
  extractedLiveOffers.push(verifiedOffer);  ✅
} else {
  console.log(`REJECTED: ${status}`);  ✅
}
    ↓
runFullScan(liveExtractedOffers)
    ↓
Only VALIDATED offers persisted
```

### Discovery Candidates (Broken)

**Partners in `partnerDiscoveryService.discoverEcosystemCandidates()`:**
- SoftBank
- Xiaomi
- Nothing Technology
- Deutsche Telekom
- JetBrains
- (others)

**Process:**
```
partnerDiscoveryService.discoverEcosystemCandidates()
    ↓
Static candidate array
    ↓
runFullScan() → Phase 4
    ↓
PartnerDiscoveryService.evaluateCandidate(candidate)
    ↓
❌ NO PLAYWRIGHT HEALTH CHECK
❌ NO DESTINATION VALIDATION
    ↓
if (evalResult.promoted) {
  await persistPartnerOffer(evalResult.offer, true);  ← ALWAYS ACTIVE
}
    ↓
MongoDB: isActive=true (even if 403/404)
```

---

## Solution Requirements

### 1. Add Health Checks to Discovery Candidate Persistence

**File:** `backend/src/pricing/partnerOfferScanner.ts`  
**Location:** Phase 4 (line ~773-800)

**Before persisting discovery candidates:**
1. Check if `evalResult.offer.officialSourceUrl` exists
2. Use Playwright to navigate to the URL
3. Check HTTP status code
4. Inspect page content for error indicators
5. Only persist if validation passes

**Required:**
- Access to Playwright `page` instance in `runFullScan()`
- OR create standalone Playwright instance for health checks
- OR delegate health check to a separate async job

### 2. Expand Health Check Status Code Detection

**File:** `backend/src/pricing/offerDestinationHealthCheck.ts`

**Add detection for:**
```typescript
const isReachable = 
  finalStatus >= 200 && finalStatus < 300 &&  // Only 2xx success codes
  !contains404 &&
  !containsAccessDenied &&
  !containsForbidden &&
  !containsServerError;
```

**New content patterns:**
- "access denied"
- "forbidden"
- "permission denied"
- "unauthorized"
- "server error"
- "service unavailable"

### 3. Validate Destination URL, Not Just Source URL

**Critical:** Ensure the health check validates:
- The EXACT URL that the frontend "View Offer" button will use
- NOT just the page where the offer was discovered

**Example:**
- Source page: `https://partner.com/offers` (might be valid)
- Destination: `https://partner.com/campaign/ai-2026` (might be 404)
- **Must check the destination**, not the source

### 4. Remove Broken Offers from Static Seeds

**Options:**

**Option A:** Remove Xiaomi from `partnerDiscoveryService.ts` entirely  
**Option B:** Keep for tracking but let reconciliation deactivate  
**Option C:** Add health check before adding to candidates

**Recommendation:** Option B - Keep discovery seeds for historical tracking, but add health checks before persistence.

### 5. Reduce Reconciliation Grace Period (Optional)

Current: 7 days  
Proposed: 3-5 days

**Trade-off:**
- Shorter grace → Faster removal of broken offers
- Shorter grace → Higher risk of false positives from temporary network issues

---

## Immediate Fix

### Manual Deactivation

```typescript
await NotificationEventModel.updateOne(
  { fingerprint: 'ac999528440a68ce19332fe1cf59357f' }, // Xiaomi offer
  {
    $set: {
      isActive: false,
      status: 'UNAVAILABLE',
      lastCheckedAt: new Date(),
    }
  }
);
```

### Remove from Discovery Seeds (Optional)

Remove Xiaomi from `partnerDiscoveryService.ts` lines 499-509 if the offer is permanently unavailable.

---

## Complete Fix Implementation

### Step 1: Add Playwright Page Instance to runFullScan

**Problem:** Phase 4 needs Playwright page to validate URLs, but `runFullScan()` doesn't have access to one.

**Solution Options:**

**A. Pass browser/page instance:**
```typescript
public static async runFullScan(
  liveExtractedOffers?: NormalizedPartnerOffer[],
  browser?: Browser  // NEW
): Promise<PartnerScanResult>
```

**B. Create standalone browser:**
```typescript
// Inside Phase 4
if (evalResult.promoted && evalResult.offer?.officialSourceUrl) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const healthCheck = await checkOfferDestination(page, evalResult.offer.officialSourceUrl, 10000);
  await browser.close();
  
  if (healthCheck.status !== 'VALID') {
    continue; // Skip persistence
  }
}
```

**C. Delegate to async queue:**
Health check happens asynchronously after persistence, then reconciliation deactivates if check fails.

**Recommendation:** Option A (pass browser instance) - Most efficient, reuses existing Playwright context.

### Step 2: Expand Health Check Logic

**File:** `backend/src/pricing/offerDestinationHealthCheck.ts`

```typescript
// Add more status code checks
const isError = 
  finalStatus === 401 ||
  finalStatus === 403 ||
  finalStatus === 404 ||
  finalStatus === 410 ||
  finalStatus >= 500;

// Add more content patterns
const errorPatterns = [
  '404',
  'not found',
  'page not found',
  'cannot be reached',
  'page unavailable',
  'access denied',
  'forbidden',
  '403 forbidden',
  'permission denied',
  'unauthorized',
  'server error',
  'service unavailable',
];

const containsError = errorPatterns.some(pattern => 
  bodyText.toLowerCase().includes(pattern.toLowerCase())
);

const status = isError || containsError ? 'UNAVAILABLE' : 'VALID';
```

### Step 3: Test All Active Offers

Run diagnostic script to check ALL currently active partner offers:

```bash
cd backend
npx tsx scratch/check_all_active_offers.ts
```

For each offer, validate the destination URL and deactivate if broken.

---

## Testing Strategy

### Regression Tests

1. **Xiaomi × Google Gemini**
   - URL: `https://www.mi.com/global/support/faq/details/KA-100223/`
   - Expected: `isActive: false`, `status: UNAVAILABLE`
   - Reason: HTTP 403 Access Denied

2. **SoftBank × Perplexity**
   - URL: `https://www.softbank.jp/mobile/special/perplexity/`
   - Expected: `isActive: false`, `status: UNAVAILABLE`
   - Reason: HTTP 404 or generic homepage redirect

3. **Valid Offers (Jio, ASUS, Samsung, Pixel)**
   - Should remain `isActive: true`
   - Destinations should return HTTP 200
   - Should NOT be deactivated by health checks

### Test Matrix

| Offer | Source URL | Destination URL | Expected HTTP | Expected Status | Should Be Active |
|-------|----------|----------------|--------------|----------------|-----------------|
| Xiaomi | FAQ page | FAQ page | 403 | UNAVAILABLE | NO |
| SoftBank | Perplexity page | Perplexity page | 404 | UNAVAILABLE | NO |
| Jio | Google One offer | Google One offer | 200 | VALID | YES |
| ASUS | Press release | Press release | 200 | VALID | YES |
| Samsung | Galaxy AI page | Galaxy AI page | 200 | VALID | YES |

---

## Conclusion

The Xiaomi offer bug is caused by:
1. **Discovery candidates bypass Playwright health checks**
2. **Health check doesn't detect HTTP 403 (only 404/410)**
3. **Reconciliation grace period allows broken offers to remain active for 7 days**

The complete fix requires:
1. Adding Playwright destination validation to discovery candidate persistence
2. Expanding health check to detect 403, 401, 50x, and "Access Denied" content
3. Ensuring destination URL (not source URL) is validated
4. Manually deactivating currently broken offers (Xiaomi, SoftBank)

This is the same root cause as the SoftBank bug, but manifests with HTTP 403 instead of 404.
