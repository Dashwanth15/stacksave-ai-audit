# SoftBank × Perplexity Offer Bug — Root Cause Analysis & Solution

**Date:** August 24, 2026  
**Bug:** Expired/404 offers still appear in Offers dashboard  
**Example:** SoftBank × Perplexity (https://softbank.jp/mobile/special/perplexity/ returns 404)  
**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## Executive Summary

The SoftBank × Perplexity offer appears active in the frontend despite its destination returning 404. Forensic analysis reveals the offer exists in MongoDB with `isActive: true` and was seeded through the Partner Discovery Service ecosystem candidates. The critical bug: **Discovery candidates are persisted as ACTIVE without Playwright destination health checks, and stale offers are NEVER revalidated or deactivated when absent from successful extraction runs**.

---

## Forensic Investigation Results

### MongoDB Record

```
✅ FOUND MONGODB RECORD:
   _id:                    6aa5398147861d3cda700baa
   fingerprint:            fd922b96bc87db59e3294f948f35c7b8
   providerId:             perplexity
   providerName:           Perplexity
   title:                  SoftBank AI Offer
   partner:                SoftBank
   partnerType:            telecom
   isPartnerOffer:         undefined
   offerType:              TELECOM_BUNDLE
   sourceUrl:              https://www.softbank.jp/mobile/special/perplexity/
   destinationUrl:         N/A
   isActive:               true           ❌ SHOULD BE false
   status:                 ACTIVE          ❌ SHOULD BE UNAVAILABLE
   isPublic:               true
   detectionMethod:        SEEDED          ← Origin: Discovery candidates
   sourceStatus:           VERIFIED
   detectedAt:             2026-09-12 17:07:36
   lastCheckedAt:          2026-09-12 20:42:12    ← Recently "checked"
   lastConfirmedAt:        2026-09-12 20:42:12    ← Falsely "confirmed"
   lastSuccessfulCheckAt:  2026-09-12 17:07:37
   consecutiveMisses:      0                      ← Never missed because never validated
```

### Data Flow Trace

```
Frontend Card "SoftBank × Perplexity"
    ↓
GET /api/intelligence/offers
    ↓
MongoDB: NotificationEventModel
    ↓
fingerprint: fd922b96bc87db59e3294f948f35c7b8
    ↓
partner: SoftBank
isActive: true
status: ACTIVE
    ↓
Origin: Partner Discovery Service → discoverEcosystemCandidates()
    ↓
partnerDiscoveryService.ts (line 466-474):
{
  partnerName: 'SoftBank',
  category: 'telecom',
  sourceUrl: 'https://www.softbank.jp/mobile/special/perplexity/',
  possibleAiProvider: 'perplexity',
  possibleAiPlan: 'Perplexity Pro',
  benefit: '1 Year Free',
  duration: '12 Months',
}
    ↓
partnerOfferScanner.ts → runFullScan() → Phase 4
    ↓
PartnerDiscoveryService.evaluateCandidate(candidate)
    ↓
if (evalResult.promoted && evalResult.offer) {
  await this.persistPartnerOffer(evalResult.offer, true);  ← MARKED ACTIVE
}
    ↓
NO DESTINATION HEALTH CHECK PERFORMED
    ↓
MongoDB: isActive=true, status=ACTIVE
    ↓
GET /api/intelligence/offers returns it
    ↓
Frontend displays card with "View Offer" → 404 ❌
```

### Source Analysis

**✅ SoftBank IS in:**
1. `partnerSourceRegistry.ts` - Registered partner (partnerId: 'softbank', offersUrl: 'https://www.softbank.jp/mobile/special/perplexity/')
2. `partnerDiscoveryService.ts` - Ecosystem candidates (static seed array)

**❌ SoftBank is NOT in:**
1. `official_pricing_extractor.ts` → `extractOfficialPartnerOffers()` hardcoded array
   - Current list: Jio, Airtel, Google Pixel, Samsung, ASUS only
2. `partnerOfferScanner.ts` → `getKnownPartnerOffers()` static seed list
   - Current list: Jio, Airtel, Samsung, Google Pixel, Amex, JioFiber

---

## Root Cause

### Primary Issue: NO RECONCILIATION LOGIC

The partner offer lifecycle has **NO MECHANISM** to deactivate stale offers:

1. **Discovery candidates are persisted without validation**: Phase 4 of `runFullScan()` evaluates ecosystem candidates from `partnerDiscoveryService` and marks them as ACTIVE without checking if their destinations are reachable.

2. **Existing offers are never revalidated**: When an offer is NOT in the current extraction run, it is never re-checked. The `persistPartnerOffer()` function only updates `lastConfirmedAt` if the offer IS provided in the current scan.

3. **"Confirmed" without actual confirmation**: The SoftBank offer shows `lastConfirmedAt: 2026-09-12 20:42:12` but this is a **false confirmation**. It was "confirmed" by the discovery candidate evaluation, not by Playwright destination health check.

4. **Static seeds resurrect stale offers**: Discovery candidates in `partnerDiscoveryService.ts` are hardcoded and will persistently re-activate SoftBank on every scan, even if it's expired.

### Secondary Issue: DISCOVERY CANDIDATES BYPASS HEALTH CHECKS

The Playwright Research Agent (`extractOfficialPartnerOffers`) performs destination health checks with `PlaywrightOfferResearchAgent.researchPartnerBundle()` which includes:
- HTTP status validation
- Soft-404 detection  
- Content analysis
- Redirect validation

But **discovery candidates** (Phase 4) skip this entirely and go straight to database persistence.

---

## Data Flow Comparison

### Correct Flow (Partners in Playwright List)

```
extractOfficialPartnerOffers()
    ↓
Hardcoded partner source (Jio, Airtel, ASUS, etc.)
    ↓
PlaywrightOfferResearchAgent.researchPartnerBundle(browser, source)
    ↓
Health Check:
  - Navigate to destination
  - Check HTTP status
  - Detect soft-404
  - Validate content
    ↓
if (status === 'CURRENT' && verifiedOffer) {
  extractedLiveOffers.push(verifiedOffer);  ✅
} else {
  console.log(`REJECTED: ${status}`);       ✅
}
    ↓
runFullScan(liveExtractedOffers)
    ↓
persistPartnerOffer(liveOffer, true)
    ↓
MongoDB: isActive=true (only if validated)
```

###broken Flow (Discovery Candidates)

```
partnerDiscoveryService.discoverEcosystemCandidates()
    ↓
Static candidate array (includes SoftBank)
    ↓
runFullScan() → Phase 4
    ↓
PartnerDiscoveryService.evaluateCandidate(candidate)
    ↓
❌ NO PLAYWRIGHT HEALTH CHECK
❌ NO DESTINATION VALIDATION
❌ NO HTTP STATUS CHECK
    ↓
if (evalResult.promoted) {
  await persistPartnerOffer(evalResult.offer, true);  ← BLINDLY MARKED ACTIVE
}
    ↓
MongoDB: isActive=true (ALWAYS, even if 404)
    ↓
Stale offer remains active forever
```

---

## Why Health Checks Don't Fix This

The previous health check implementation in `multiSignalOfferScanner.ts` and `PlaywrightOfferResearchAgent.ts` **works correctly** for:
1. New Playwright-extracted provider offers
2. Partner offers in the `extractOfficialPartnerOffers()` array

**But it does NOT apply to:**
1. Discovery candidates from `partnerDiscoveryService`
2. Static seeds from `getKnownPartnerOffers()`
3. Existing MongoDB offers that are absent from current extraction runs

---

## The Missing Reconciliation Logic

### What's Needed

For every successful partner scan, the system must:

1. **Track which offers were confirmed** in the current run
2. **Identify existing active offers** NOT confirmed in the current run
3. **Health check missing offers** to determine if they're genuinely unavailable or if the scan failed
4. **Deactivate stale offers** that return 404/expired/unavailable
5. **Preserve active offers** when scan failures occur (network issues, rate limits, etc.)

### Critical Distinction

```
SCAN SUCCESS + OFFER NOT FOUND
    ↓
Candidate for deactivation
(Offer may have expired)

VS.

SCAN FAILED / TIMEOUT / BLOCKED
    ↓
Do NOT deactivate
(Scan issue, not offer issue)
```

---

## Solution Architecture

### Phase 1: Add Health Checks to Discovery Candidates

**File:** `backend/src/pricing/partnerOfferScanner.ts`  
**Location:** Phase 4 (Line ~745)

Before persisting discovery candidates, validate their destinations:

```typescript
// ── Phase 4: Layer 2 Discovered Candidates & Ecosystem Signals ──
PartnerDiscoveryService.discoverEcosystemCandidates();
const candidates = PartnerDiscoveryService.getAllCandidates();

for (const candidate of candidates) {
  result.totalScanned++;
  try {
    const evalResult = PartnerDiscoveryService.evaluateCandidate(candidate);
    
    if (evalResult.promoted && evalResult.offer) {
      // ✅ NEW: Health check discovery candidate destination
      if (evalResult.offer.officialSourceUrl) {
        const healthCheck = await checkOfferDestination(
          page,  // Need Playwright page instance
          evalResult.offer.officialSourceUrl,
          10000
        );
        
        if (healthCheck.status !== 'VALID') {
          console.log(`   ❌ [Discovery Candidate REJECTED] ${candidate.partnerName}: ${healthCheck.statusReason}`);
          continue; // Skip persistence
        }
      }
      
      const res = await this.persistPartnerOffer(evalResult.offer, true);
      // ... rest of logic
    }
  } catch (err) {
    console.error(`[PartnerScanner] Error evaluating candidate (${candidate.partnerName}):`, err);
    result.errorsCount++;
  }
}
```

### Phase 2: Implement Reconciliation Logic

**File:** `backend/src/pricing/partnerOfferScanner.ts`  
**New Method:** `reconcileStaleOffers()`

Add reconciliation after all phases complete:

```typescript
public static async reconcileStaleOffers(
  confirmedFingerprints: Set<string>,
  scanSuccessful: boolean
): Promise<{ deactivatedCount: number; preservedCount: number }> {
  if (!scanSuccessful) {
    console.log('[PartnerScanner:Reconcile] Scan failed — preserving all active offers');
    return { deactivatedCount: 0, preservedCount: 0 };
  }

  // Find active partner offers NOT confirmed in this scan
  const staleOffers = await NotificationEventModel.find({
    isActive: true,
    isPartnerOffer: true,
    fingerprint: { $nin: Array.from(confirmedFingerprints) },
  });

  let deactivatedCount = 0;
  let preservedCount = 0;

  for (const offer of staleOffers) {
    // Check if offer should be deactivated based on lastConfirmedAt age
    const daysSinceConfirmation = (Date.now() - offer.lastConfirmedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceConfirmation > 7) {
      // Offer hasn't been confirmed in 7+ days — mark as EXPIRED
      offer.isActive = false;
      offer.status = 'EXPIRED';
      offer.lastCheckedAt = new Date();
      offer.consecutiveMisses = (offer.consecutiveMisses || 0) + 1;
      await offer.save();
      
      console.log(`   ⚠️ [Reconcile: DEACTIVATED] ${offer.partner} × ${offer.title} (${daysSinceConfirmation.toFixed(0)} days unconfirmed)`);
      deactivatedCount++;
    } else {
      preservedCount++;
    }
  }

  return { deactivatedCount, preservedCount };
}
```

### Phase 3: Invoke Reconciliation in runFullScan

**File:** `backend/src/pricing/partnerOfferScanner.ts`  
**Method:** `runFullScan()`

```typescript
public static async runFullScan(liveExtractedOffers?: NormalizedPartnerOffer[]): Promise<PartnerScanResult> {
  const result: PartnerScanResult = { /* ... */ };
  const confirmedFingerprints = new Set<string>();
  let scanSuccessful = true;

  // ── Phase 0-4: Extract and persist offers ──
  // ... existing logic, track confirmedFingerprints for each persisted offer ...
  
  for (const offer of allOffers) {
    const res = await this.persistPartnerOffer(offer, true);
    if (res.status !== 'EXPIRED') {
      confirmedFingerprints.add(offer.fingerprint);
    }
  }

  // ── Phase 5: Reconcile Stale Offers ──
  const reconcileResult = await this.reconcileStaleOffers(confirmedFingerprints, scanSuccessful);
  result.expiredOffersCount += reconcileResult.deactivatedCount;

  console.log(`[PartnerScanner:Reconcile] Deactivated: ${reconcileResult.deactivatedCount}, Preserved: ${reconcileResult.preservedCount}`);

  return result;
}
```

### Phase 4: Remove SoftBank from Static Seeds

**Option A:** Remove SoftBank entirely from `partnerDiscoveryService.ts`

**Option B:** Keep for discovery but let reconciliation deactivate if 404

Recommendation: **Option B** - Keep discovery seeds for historical tracking, let reconciliation handle expiration.

---

## Implementation Strategy

### Immediate Fix (Minimum Viable)

1. **Manually deactivate SoftBank offer in MongoDB**
   ```typescript
   await NotificationEventModel.updateOne(
     { fingerprint: 'fd922b96bc87db59e3294f948f35c7b8' },
     { 
       $set: { 
         isActive: false, 
         status: 'UNAVAILABLE',
         lastCheckedAt: new Date()
       } 
     }
   );
   ```

2. **Add SoftBank to Playwright extraction list** (if offer is genuinely expired, it will be rejected)
   OR
   **Remove SoftBank from discovery candidates** (if permanently unavailable)

### Complete Fix (Production Ready)

1. **Add health checks to discovery candidate persistence** (partnerOfferScanner.ts Phase 4)
2. **Implement reconciliation logic** (reconcileStaleOffers method)
3. **Track confirmed fingerprints** during scan
4. **Invoke reconciliation** after all phases complete
5. **Add 7-day grace period** before deactivation (prevents false positives from temporary scan issues)
6. **Log deactivations** for audit trail
7. **Test with SoftBank and Airtel** regression cases

---

## Testing Strategy

### Regression Tests Required

1. **SoftBank × Perplexity**
   - Initial: `isActive: true, status: ACTIVE`
   - After reconciliation: `isActive: false, status: EXPIRED`
   - API response: Should NOT include SoftBank
   - Frontend: Should NOT display SoftBank card

2. **Airtel × Perplexity**
   - If 404/generic homepage: Same as SoftBank
   - If currently researched and rejected: Already handled by Playwright agent

3. **Valid Offers (Jio, ASUS, etc.)**
   - Should remain `isActive: true`
   - Should be confirmed on every scan
   - API and frontend should continue displaying them

4. **Temporary Scan Failures**
   - Network timeout during scan: Offers should remain active
   - Rate limit during scan: Offers should remain active
   - Only mark EXPIRED after successful scan + grace period

---

## Verification Checklist

- [ ] SoftBank offer deactivated in MongoDB
- [ ] SoftBank does NOT appear in GET /api/intelligence/offers
- [ ] SoftBank does NOT appear in frontend Offers dashboard
- [ ] Airtel offer status verified (deactivated if 404)
- [ ] Valid offers (Jio, ASUS, Samsung, Pixel) remain active
- [ ] Reconciliation logic added to partnerOfferScanner
- [ ] Health checks added to discovery candidate persistence
- [ ] 7-day grace period implemented
- [ ] Deactivation audit logs visible
- [ ] Backend tests pass
- [ ] Frontend cache cleared and verified

---

## Estimated Impact

**Before Fix:**
- Active offers: ~30 (includes stale SoftBank, possibly stale Airtel)
- Broken "View Offer" links: 1-2

**After Fix:**
- Active offers: ~28-29 (only verified current offers)
- Broken "View Offer" links: 0
- Stale offers deactivated: 1-2
- False deactivations: 0 (grace period prevents)

---

## Conclusion

The SoftBank × Perplexity bug is caused by **lack of reconciliation logic** in the partner offer lifecycle. Discovery candidates are persisted as ACTIVE without destination validation, and stale offers are never revalidated when absent from extraction runs. The solution requires:

1. Adding health checks to discovery candidate persistence
2. Implementing reconciliation to deactivate unconfirmed offers after a grace period
3. Tracking confirmed fingerprints during each scan
4. Distinguishing between "scan success + offer missing" vs "scan failure"

This is a **generic architectural fix** that applies to all partners and will prevent future stale offer bugs.
