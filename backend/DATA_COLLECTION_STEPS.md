# Data Collection: Trace 12 Offers → 0 Display

## Known Facts

- **Playwright extraction**: CONFIRMED WORKING (12 offers discovered)
- **Official sources**: CONFIRMED WORKING (13 providers verified)
- **Production sync**: CONFIRMED WORKING (HTTP 200, successful ingestion)
- **Problem**: 12 discovered → 0 displayed

## Data Collection Required

### STEP 1: Ingestion Acceptance/Rejection Counts

**From GitHub Actions Workflow Log:**

After latest successful sync run, find lines like:

```
[PricingSync:Ingest] claude: offered=1 accepted=1 rejected=0
[PricingSync:Ingest] chatgpt: offered=3 accepted=3 rejected=0
[PricingSync:Ingest] gemini: offered=1 accepted=1 rejected=0
...
```

**Report:**
```
Total offered: 12
Total accepted: __
Total rejected: __
```

If all 12 are accepted → problem is downstream (MongoDB/API/frontend)
If < 12 accepted → problem is ingestion validation gates

### STEP 2: MongoDB Diagnostic Endpoint

**Call the production diagnostic endpoint:**

```bash
curl -H "X-Admin-Secret: <SECRET>" \
  "https://stacksave-production/api/intelligence/offers/diagnostic"
```

**Report the response:**

```
Total notification events: __
NEW_OFFER events: __
Records with isPublic=true: __
Records with isActive=true: __
Records with evidenceText: __
```

Expected if all 12 accepted:
```
Total: 12+
NEW_OFFER: 12+
isPublic: 12+
isActive: 12+ (or less if expiry logic deactivates them)
evidenceText: 12
```

### STEP 3: One Sample Offer Document

**Query MongoDB for one offer:**

```javascript
db.notificationevents.findOne({ eventType: "NEW_OFFER" })
```

**Report (safe fields only):**

```
providerId: __
eventType: __
isPublic: __
isActive: __
sourceStatus: __
sourceUrl: __
evidenceText length: __
detectedAt: __
sourceFetchedAt: __
lastConfirmedAt: __
lastSuccessfulCheckAt: __
expiresAt: __
validFrom: __
```

Look for fields that might be `false` or missing.

### STEP 4: Call Production Offers API Directly

**Call the exact public endpoint:**

```bash
curl "https://stacksave-production/api/intelligence/offers"
```

**Report:**

```
HTTP Status: __
Response body count: __
Response shape: {"success": __, "data": {"offers": [...], "count": __}}
Number of offers: __
```

Expected:
- If 12 in MongoDB: should return 12
- If returns 0: problem is in API filter
- If returns 12: problem is frontend

### STEP 5: API Filter Analysis

**Read current /intelligence/offers endpoint implementation:**

backend/src/routes/intelligence.ts (GET /intelligence/offers)

List every filter:

1. `eventType === 'NEW_OFFER'`
2. `isActive !== false` (in query)
3. `isPublic === true` (in query)
4. `isPublic === true` (in filter)
5. `evidenceText?.trim()` (in filter)
6. `isRegisteredOfficialSource()` (in filter)

For each filter, calculate how many records survive:

```
MongoDB total: 12
→ NEW_OFFER: 12
→ isActive: ?
→ isPublic (query): ?
→ Filter 1 (isPublic): ?
→ Filter 2 (evidence): ?
→ Filter 3 (source): ?
→ API returns: ?
```

### STEP 6: Check Active Status Mapping

**Compare:**
- Extractor says: "12 active promotions discovered"
- DB shows: isActive = __
- API returns: __ offers (all active?)
- UI displays: 0 "Active Promotions"

If isActive = false in DB, trace why:
- Were they created with isActive=false?
- Is expiry logic deactivating them?
- Is date logic treating them as inactive?

### STEP 7: Check Event Type

**From MongoDB:**

```javascript
db.notificationevents.aggregate([
  { $match: { providerId: "claude" } },
  { $group: { _id: "$eventType", count: { $sum: 1 } } }
])
```

Expected: All should be `NEW_OFFER`

If any are different event type, API may be filtering them out.

### STEP 8: Check isPublic Persistence

**From MongoDB:**

```javascript
db.notificationevents.aggregate([
  { $match: { eventType: "NEW_OFFER" } },
  { $group: { _id: "$isPublic", count: { $sum: 1 } } }
])
```

Expected: All should have `isPublic: true`

If any have `isPublic: false` or missing, they won't appear publicly.

---

## Root Cause Decision Tree

After collecting this data, follow the decision tree:

```
12 discovered
  ├─ All 12 accepted by ingestion?
  │  ├─ YES → Continue to MongoDB
  │  └─ NO → ROOT CAUSE: Ingestion validation gates rejecting offers
  │          
  └─ 12 in MongoDB?
     ├─ NO → ROOT CAUSE: upsertOffer not actually storing them
     └─ YES → Continue to API
        │
        ├─ All have eventType=NEW_OFFER?
        │  ├─ NO → ROOT CAUSE: Wrong event type stored
        │  └─ YES → Continue to next check
        │
        ├─ All have isPublic=true?
        │  ├─ NO → ROOT CAUSE: isPublic not set correctly
        │  └─ YES → Continue to next check
        │
        ├─ All have isActive=true?
        │  ├─ NO → ROOT CAUSE: Offers deactivated (expiry/grace period logic)
        │  └─ YES → Continue to API call
        │
        └─ API returns 12?
           ├─ NO → ROOT CAUSE: API filtering removes all offers
           │        (Check /intelligence/offers filter logic)
           │
           └─ YES → API returns 12
              └─ Frontend displays 0?
                 ├─ NO → ALL WORKING (problem was already fixed)
                 └─ YES → ROOT CAUSE: Frontend display logic filtering them out
```

---

## How to Report

Once you have collected this data, report:

```
Playwright discovered: 12

[Ingestion]
Offers accepted: __
Offers rejected: __

[MongoDB]
Total NEW_OFFER records: __
Records with isPublic=true: __
Records with isActive=true: __

[API]
GET /intelligence/offers returns: __ offers

[Frontend]
OffersPage displays: __ offers

FIRST POINT WHERE 12 BECOMES 0:
__ (layer name)

ROOT CAUSE:
__ (specific reason)

FIX REQUIRED:
__ (layer and specific change)
```

---

## CRITICAL: Do Not Guess

Do not report assumptions. Only report what the actual logs and API calls show.

If you cannot access production systems to collect this data, request the data from operations/DevOps and report here.
