# Production Diagnostic Logging Guide

## Purpose

Temporary diagnostic logging has been added to trace offer flow through the extraction and ingestion pipeline. This allows us to identify exactly where offers become zero without making hypothesis-based code changes.

## Where to Find Logs

### GitHub Actions Workflow Run

1. Go to: https://github.com/Dashwanth15/stacksave-ai-audit/actions
2. Click: "Official AI Pricing & Offer Intelligence Sync" (latest run)
3. Click: "Run Official Pricing & Offer Extractor & Production Ingestion (Playwright + Fast Static)"
4. Scroll to: "Step: Run Official Pricing & Offer Extractor & Production Ingestion"
5. Look for section: "EXTRACTION DIAGNOSTIC SUMMARY"

## What the Logs Show

### Extraction Phase

**Log Format:**
```
[Claude] offers_extracted=1 offers_normalized=1
[Claude] VERIFIED: plans=2 offers=1

[ChatGPT] offers_extracted=3 offers_normalized=3
[ChatGPT] VERIFIED: plans=3 offers=3
```

**Meaning:**
- `offers_extracted`: Raw number of offers found by Playwright in the page DOM
- `offers_normalized`: Number converted to NormalizedOffer objects
- If PARSE_FAILED: plans extraction failed (plans < 2), but offers may still exist
- If VERIFIED: Both plans and offers extracted successfully

### Final Extraction Summary

**Log Format:**
```
========================================================================================================================
EXTRACTION DIAGNOSTIC SUMMARY (PER-PROVIDER OFFER COUNTS)
========================================================================================================================
cursor               | extracted=0  | status=VERIFIED
github-copilot       | extracted=1  | status=VERIFIED
deepseek             | extracted=0  | status=VERIFIED
chatgpt              | extracted=3  | status=VERIFIED
claude               | extracted=1  | status=VERIFIED
gemini               | extracted=1  | status=VERIFIED
windsurf             | extracted=1  | status=VERIFIED
perplexity           | extracted=2  | status=VERIFIED
kimi                 | extracted=1  | status=VERIFIED
anthropic-api        | extracted=2  | status=VERIFIED
openai-api           | extracted=1  | status=VERIFIED
codex                | extracted=0  | status=RETIRED
github-models        | extracted=0  | status=RETIRED
========================================================================================================================
TOTAL EXTRACTION RESULT: 16 offers extracted across 13 providers
========================================================================================================================
```

**Meaning:**
- Each row shows one provider
- `extracted`: Number of offers this provider contributed
- `status`: Provider sync status (VERIFIED, PARSE_FAILED, etc.)
- TOTAL: Sum of all offers from all providers

### Ingestion Phase

**Log Format (if offers exist):**
```
[PricingSync:Ingest] claude: offered=1 ingestion attempts
[PricingSync:Ingest] chatgpt: offered=3 ingestion attempts
```

**Meaning:**
- Shows how many offers per provider were passed to upsert
- If this line appears, offers reached the ingestion phase
- If no line appears for a provider that extracted offers, offers were filtered before ingestion

## How to Interpret the Data

### Scenario 1: Zero Offers Extracted
```
TOTAL EXTRACTION RESULT: 0 offers extracted across 13 providers
```
**Root Cause:** Extraction patterns don't match current page DOM
**Fix Location:** Update regex patterns in official_pricing_extractor.ts

### Scenario 2: Offers Extracted, Some/All Rejected at Ingestion
```
TOTAL EXTRACTION RESULT: 16 offers extracted across 13 providers
[PricingSync:Ingest] claude: offered=1 ingestion attempts
[PricingSync:Ingest] chatgpt: offered=2 ingestion attempts  ← Less than extracted!
```
**Root Cause:** Offers failing isPubliclyVerifiableOffer() validation
**Fix Location:** Check isPubliclyVerifiableOffer() gates in offerTrust.ts

### Scenario 3: Offers Ingested, but API Returns Zero
```
TOTAL EXTRACTION RESULT: 16 offers extracted
[PricingSync:Ingest] claude: offered=1 ingestion attempts
[PricingSync:Ingest] chatgpt: offered=3 ingestion attempts
→ GET /api/intelligence/offers returns 0
```
**Root Cause:** API endpoint filtering or retrieval issue
**Fix Location:** Check /offers endpoint filter in routes/intelligence.ts

### Scenario 4: API Returns Offers, Frontend Shows Zero
```
GET /api/intelligence/offers returns: {"count": 16, "offers": [...]}
→ UI shows: "0 Active Promotions"
```
**Root Cause:** Frontend component filtering or rendering issue
**Fix Location:** Check OffersPage.tsx in frontend

## Data Collection Checklist

After running the workflow with this diagnostic logging:

- [ ] Copy the "EXTRACTION DIAGNOSTIC SUMMARY" table
- [ ] Copy the "TOTAL EXTRACTION RESULT" line
- [ ] Copy any "[PricingSync:Ingest]" lines
- [ ] Record the final count shown by API endpoint
- [ ] Record what frontend displays

## Workflow to Run

1. Push code with this diagnostic logging (already done in commit 4d3d3bf)
2. Go to GitHub Actions → "Official AI Pricing & Offer Intelligence Sync"
3. Click "Run workflow" (manual trigger)
4. Wait for completion (~4-5 minutes)
5. Click on the run to view logs
6. Search logs for "EXTRACTION DIAGNOSTIC SUMMARY"
7. Copy the diagnostic output
8. Compare extracted count → ingestion attempts → API return → frontend display

## Important Notes

- **This is temporary logging only.** It will be removed after we collect the data.
- **No logic has changed.** Only console.log statements added.
- **Extraction will complete successfully** regardless of offer counts.
- **The workflow will still succeed** even if 0 offers are found.

## Commands to Check Data

If you have access to production systems:

```bash
# Check MongoDB diagnostic endpoint
curl -H "X-Admin-Secret: <SECRET>" \
  https://stacksave-production.com/api/intelligence/offers/diagnostic

# Call public API directly
curl https://stacksave-production.com/api/intelligence/offers
```

## Expected Outcome

After collecting this data, we will know EXACTLY where to fix the problem:

- Extraction layer
- Ingestion layer  
- API layer
- Frontend layer

Then we can make a targeted, evidence-based fix instead of guessing.
