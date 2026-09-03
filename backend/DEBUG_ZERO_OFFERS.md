# DEBUG: Zero Offers After Simplified Publication Gates

## Current Status (Production)
- UI Shows: 13 Official Vendor Feeds, 100% Official Sources, **0 Active Promotions**
- Latest Sync: September 3, 2026, 4:22 PM (succeeded)
- Commit: b3c7ac4 (simplified publication gates, updated diagnostic endpoint)

## Root Cause Hypothesis

After tracing the complete data pipeline, the problem is likely NOT in publication gates (already simplified), but in **offer extraction itself**.

### The Data Flow

1. **Extraction Phase**: official_pricing_extractor.ts runs Playwright on 13 configured AI platform URLs
2. **Offer Creation**: Each provider creates offers[]array based on DOM regex patterns
3. **Normalization**: offers[] → normalizedOffers[] with sourceStatus, evidenceText, etc.
4. **Ingestion**: Offers upserted to MongoDB if isPubliclyVerifiableOffer() returns true
5. **Retrieval**: /api/intelligence/offers queries and filters offers
6. **Display**: Frontend renders offers or "0 Active Promotions"

**Current Result**: Step 6 shows 0, which means step 5 returns empty array.

### Where Zero Occurs

#### Scenario A: Extraction Returns Zero Offers
If extraction finds zero qualifying offers despite successful page access:

```
[Claude] Scanning primary pricing: https://claude.com/pricing...
Page loaded successfully
Regex for "$20" Pro price → NO MATCH
annualPrice = null
NO offer created
offers[] = []
```

**Evidence**: Look at extractor output - does it show offer counts?

#### Scenario B: Offers Extracted but Rejected by isPubliclyVerifiableOffer()
If extraction succeeds but all offers fail the 4-gate check:

```
normalizedOffers = [Claude Pro Annual Savings, ...]
Call isPubliclyVerifiableOffer(offer, { providerStatus: 'VERIFIED' })
  Gate 1: providerStatus='VERIFIED' ✓
  Gate 2: isRegisteredOfficialSource('claude', 'https://claude.com/pricing') → should be ✓
  Gate 3: evidenceText.trim().length >= 20 → ?
  Gate 4: detectedAt exists → should be ✓
Result: false → offer not upserted
```

**Evidence**: MongoDB would have 0 or very few offers

#### Scenario C: Offers in MongoDB but /offers Endpoint Filters Them
If MongoDB has offers but API returns 0:

```
MongoDB: 25 NEW_OFFER records
Query: eventType='NEW_OFFER', isActive=true, isPublic=true → finds 25
Filter in GET /offers: isPublic=true && evidenceText exists && isRegisteredOfficialSource()
Result: 0 pass
```

**Evidence**: MongoDB query would show offers exist

## CRITICAL UNKNOWNS

We cannot answer without inspecting:

1. **Extractor Log Output**
   - Did extraction find pages successfully?
   - Were offers created (counts)?
   - Example: "Claude: 1 offer extracted, ChatGPT: 2 offers, ..."

2. **MongoDB State**
   - Total NEW_OFFER records: ?
   - With isPublic=true: ?
   - With evidenceText: ?
   - Example count per provider?

3. **API Behavior**
   - GET /api/intelligence/offers response length: ?
   - Are records being filtered before returning?

4. **Current evidenceText Values**
   - Is evidence actually captured in offers?
   - Are descriptions long enough (20+ chars)?

## Simplified Publication Gates (Currently Deployed)

### isPubliclyVerifiableOffer() - 4 Gates

```typescript
if (context.providerStatus !== 'VERIFIED') return false;              // Gate 1
if (!isRegisteredOfficialSource(offer.providerId, offer.sourceUrl)) return false; // Gate 2
if (!evidence || evidence.length < 20) return false;                 // Gate 3
if (!offer.detectedAt) return false;                                 // Gate 4
return true;
```

### /api/intelligence/offers - 3 Gates

```typescript
const offers = events.filter((e) => (
  e.isPublic === true &&                                             // Gate 1
  Boolean(e.evidenceText?.trim()) &&                                 // Gate 2
  isRegisteredOfficialSource(e.providerId, e.sourceUrl)              // Gate 3
))
```

## Next Steps to Diagnose

### STEP 1: Add Extraction Logging
Modify `official_pricing_extractor.ts` to log offer counts:

```typescript
// After normalizing Claude offers
const claudeOfferCount = normalizedOffers.length;
console.log(`[Claude] Extracted ${claudeOfferCount} offers`);

// At end of extraction summary
console.log(`
EXTRACTION SUMMARY:
- Cursor: X offers
- GitHub Copilot: X offers
- DeepSeek: X offers
- ChatGPT: X offers
- Claude: X offers
... (all 13 providers)
TOTAL: X offers extracted, Y offers normalized
`);
```

### STEP 2: Query MongoDB Diagnostic
Run `/api/intelligence/offers/diagnostic` (admin-only endpoint) to see:
- Total NEW_OFFER records
- Records with evidenceText
- Records with isPublic=true
- Final passing count

### STEP 3: Inspect Single Offer
Pick one provider (e.g., Claude) and find an offer:

```
db.notificationevents.find({
  providerId: "claude",
  eventType: "NEW_OFFER"
}).limit(1).pretty()
```

Check fields:
- Has sourceStatus = 'VERIFIED'?
- Has evidenceText = description text?
- Has detectedAt = recent date?
- Has sourceUrl = 'https://claude.com/pricing'?
- Has isPublic = true?
- Has isActive = true?

### STEP 4: Test isPubliclyVerifiableOffer() Directly
Create a test that manually checks the function against an actual extracted offer.

## Files Involved

- `backend/scripts/official_pricing_extractor.ts` - Extraction logic
- `backend/src/pricing/offerTrust.ts` - isPubliclyVerifiableOffer() validation
- `backend/src/pricing/syncOrchestrator.ts` - Ingestion decision point
- `backend/src/routes/intelligence.ts` - API endpoint filter + diagnostic
- `backend/src/pricing/sourceRegistry.ts` - URL allowlist (13 providers)
- `backend/tests/offerTrust.test.ts` - Validation tests

## Commits Related

- b3c7ac4: Updated diagnostic endpoint
- 16bde33: Simplified publication gates
- 011f29a: Decoupled offer ingestion from plan extraction
- 5dba202: Added evidence field

---

**To fix: First diagnose WHERE the count becomes zero. Then fix that layer only.**

Do not change multiple layers without understanding which one is failing.
