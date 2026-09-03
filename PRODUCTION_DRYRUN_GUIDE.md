# Production Pricing Sync DRY-RUN Guide

## Purpose

This guide explains how to execute the **safe GitHub Actions dry-run** of the pricing sync extraction **WITHOUT modifying MongoDB**.

The dry-run:
1. ✅ Executes the exact Playwright extraction used by production
2. ✅ Fetches current official provider pages
3. ✅ Extracts real commercial data with evidence text
4. ✅ Reads existing 26 MongoDB offers (READ-ONLY)
5. ✅ Simulates the strict public verification filter
6. ✅ Reports which existing offers can be recovered
7. ✅ **Does NOT write to MongoDB**
8. ✅ **Does NOT modify any data**

---

## When to Use This

**Use the dry-run before deploying the strict verification filter** to verify that:
- Official provider extraction works in GitHub Actions environment
- Existing offers can be recovered post-deployment
- The strict filter result is acceptable

---

## How to Run the Dry-Run

### Option 1: GitHub Actions Manual Trigger (Recommended)

1. **Push your code** to GitHub:
   ```bash
   git add .
   git commit -m "Add production dry-run workflow"
   git push origin main
   ```

2. **Go to GitHub Repository**:
   - Navigate to: **Settings → Actions → Workflows**
   - Select: **"Official AI Pricing Sync DRY-RUN (Read-Only Test)"**

3. **Run Workflow**:
   - Click **"Run workflow"** button
   - Choose branch: `main` (or your current branch)
   - Optional: Check "Enable detailed provider output" for verbose logs
   - Click **"Run workflow"**

4. **Wait for Completion**:
   - Workflow runs on Ubuntu 20.04 with Playwright + Chromium
   - Duration: ~10 minutes
   - Go to **Actions** tab to monitor progress

5. **View Results**:
   - Click on the completed workflow run
   - Scroll to **Artifacts** section
   - Download `pricing-sync-dryrun-report` (JSON file)
   - Or view console output directly in the workflow

### Option 2: Local Testing (With Playwright Installed)

If you want to test locally first:

```bash
cd backend
npm install --save-dev playwright
npx playwright install --with-deps chromium
npm run sync:dryrun
```

**Note:** Local results may differ from GitHub Actions due to network/IP differences.

---

## Understanding the Output

The dry-run produces a report with these sections:

### CURRENT DATABASE
Shows the state of existing MongoDB offers:
```
Total offers: 26
Currently passing strict filter: 0
Currently failing strict filter: 26
```

### PROVIDER EXTRACTION
Details for each of the 13 registered providers:
```
Provider        | Fetch   | Browser | Extraction  | Offers | Evidence
Cursor          | SUCCESS | NO      | SUCCESS     | 5      | 5
Claude          | BLOCKED | YES     | ERROR       | 0      | 0
ChatGPT         | BLOCKED | YES     | ERROR       | 0      | 0
...
```

**Fields:**
- **Fetch**: SUCCESS, BLOCKED (HTTP 403), TIMEOUT, or ERROR
- **Browser**: YES (requires Playwright), NO
- **Extraction**: SUCCESS (valid offers), PARSE_FAILED, NO_OFFERS, ERROR
- **Offers**: Number of offers extracted
- **Evidence**: Number of offers with evidenceText

### FRESH DATA
Total results from all providers:
```
Total offers extracted: 12
Offers with evidenceText: 10
Offers with complete provenance: 8
```

### EXISTING OFFER MATCHING
Comparison of existing 26 offers vs. fresh extraction:
```
Existing offers: 26
Matched to fresh extraction: 8
Not matched: 18
Matched and would pass strict filter: 3
Matched but would fail strict filter: 5
```

### SIMULATED POST-SYNC
Projection after deployment:
```
Existing offers that would pass strict filter: 3
Existing offers that would remain hidden: 23
New offers that would pass strict filter: 2
PROJECTED TOTAL PUBLIC OFFERS: 5
```

### VERDICT

**Two possible outcomes:**

1. **PRODUCTION_RECOVERY_VERIFIED** ✅
   - Fresh extraction successful
   - Existing offers matched to fresh data
   - Safe to deploy the strict filter

2. **PRODUCTION_RECOVERY_NOT_VERIFIED** ❌
   - Extraction failed or produced no offers
   - Existing offers could not be recovered
   - **DO NOT DEPLOY** without investigation

---

## Interpreting Results

### Good Sign: Offers Being Recovered
If you see:
- `Matched to fresh extraction: > 0`
- `Matched and would pass strict filter: > 0`
- `VERDICT: PRODUCTION_RECOVERY_VERIFIED`

**Action:** Safe to deploy the strict filter.

### Concerning Sign: No Offers Recovered
If you see:
- `Matched to fresh extraction: 0`
- `Not matched: 26`
- `VERDICT: PRODUCTION_RECOVERY_NOT_VERIFIED`

**Action:** Investigate why fresh extraction doesn't match existing offers.

### Partial Recovery
If you see:
- `Matched to fresh extraction: 8`
- `Matched but would fail strict filter: 5`
- Some offers matched but fail filter

**Investigation needed:** Why do matched offers lack evidence/timestamps?
- Is evidence being extracted correctly?
- Are provenance timestamps being set?

---

## What to Do With Results

### If PRODUCTION_RECOVERY_VERIFIED

You can proceed with deployment:

1. Review the projected public offers: `PROJECTED TOTAL PUBLIC OFFERS`
2. Confirm this meets your expectations
3. Deploy the strict filter changes to production
4. Monitor the real sync run to confirm recovery

### If PRODUCTION_RECOVERY_NOT_VERIFIED

Before deploying:

1. **Check provider extraction failures**:
   - Which providers failed and why?
   - Are they blocked by HTTP 403?
   - Are they timeouts?

2. **Compare extracted vs. existing offers**:
   - Download the detailed report
   - Analyze why offers don't match
   - Check fingerprint generation

3. **Possible solutions**:
   - Fix provider adapters if extraction failed
   - Adjust evidence/timestamp generation
   - Contact provider if their page changed
   - Consider relaxing filter requirements (last resort)

---

## Report Format

The dry-run saves a detailed JSON report: `dryrun-report.json`

**Key fields:**
```json
{
  "timestamp": "2024-08-24T12:00:00.000Z",
  "environment": "github_actions",
  "currentDatabase": {
    "totalOffers": 26,
    "passingStrictFilter": 0,
    "failingStrictFilter": 26
  },
  "providerExtraction": [...],
  "freshData": {...},
  "existingOfferMatching": {...},
  "simulatedPostSync": {...},
  "verdict": "PRODUCTION_RECOVERY_VERIFIED",
  "verdictReason": "..."
}
```

---

## Database Safety

**The dry-run is 100% read-only:**

❌ Does NOT:
- Insert offers
- Update offers
- Delete offers
- Deactivate offers
- Modify timestamps
- Modify sourceStatus
- Modify isPublic
- Modify isActive
- Call `upsertOffer()`
- Call `ingestOfficialExtractedPricing()`
- Make ANY MongoDB write operations

✅ Only:
- Reads existing offers
- Simulates matching in memory
- Applies filter to simulated state
- Writes report to file

---

## Troubleshooting

### Workflow Fails: Missing Secrets
**Error:** "BACKEND_URL secret is missing"

**Fix:** Add to GitHub Repository Secrets:
1. Settings → Secrets and variables → Actions
2. New secret: `BACKEND_URL` = `https://stacksave-backend.onrender.com`
3. New secret: `ADMIN_SECRET` = (your ADMIN_SECRET from Render)

### All Providers Fail
**Likely cause:** Network issues in GitHub Actions environment

**Action:** Check provider URLs manually:
- Are the official pages accessible from the internet?
- Are they blocking automated scraping?
- Have they changed their structure?

### Offers Don't Match
**Likely cause:** Fingerprint generation differs between environments

**Action:** 
- Check fingerprint calculation in both environments
- Verify offer title/text normalization
- Compare hashes locally vs. production

### Report Not Generated
**Likely cause:** Extraction script crashed

**Action:**
- Check workflow logs in GitHub Actions
- Look for error messages
- Check MongoDB connection
- Verify Playwright installed correctly

---

## Next Steps After Dry-Run

### If Results are Good (VERIFIED)

1. **Review the numbers**:
   ```
   Existing offers that would pass strict filter: X
   New offers that would pass strict filter: Y
   PROJECTED TOTAL PUBLIC OFFERS: X + Y
   ```

2. **Deploy the strict filter**:
   ```bash
   git push origin main
   # Trigger production deployment
   ```

3. **Monitor the real sync**:
   - Watch pricing-sync workflow run
   - Verify offers appear in public API
   - Check offer counts match projection

### If Results are Unclear (NOT VERIFIED)

1. **Analyze the report carefully**

2. **Check which providers failed**
3. **Verify extraction logic**
4. **Run local tests** to understand differences
5. **Retry dry-run** if you made fixes

---

## Example: Good Result

```
═══════════════════════════════════════════════════════════
               PRICING SYNC DRY-RUN RESULTS
═══════════════════════════════════════════════════════════

CURRENT DATABASE
───────────────────────────────────────────────────────────
Total offers: 26
Currently passing strict filter: 0
Currently failing strict filter: 26

PROVIDER EXTRACTION
───────────────────────────────────────────────────────────
Provider        | Fetch   | Browser | Extraction | Offers | Evidence
Cursor          | SUCCESS | NO      | SUCCESS    | 5      | 5
Claude          | BLOCKED | YES     | ERROR      | 0      | 0
ChatGPT         | BLOCKED | YES     | ERROR      | 0      | 0
GitHub Copilot  | SUCCESS | NO      | SUCCESS    | 3      | 3
DeepSeek        | SUCCESS | NO      | SUCCESS    | 2      | 2
...

FRESH DATA
───────────────────────────────────────────────────────────
Total offers extracted: 12
Offers with evidenceText: 10
Offers with complete provenance: 8

EXISTING OFFER MATCHING
───────────────────────────────────────────────────────────
Existing offers: 26
Matched to fresh extraction: 8
Not matched: 18
Matched and would pass strict filter: 3
Matched but would fail strict filter: 5

SIMULATED POST-SYNC
───────────────────────────────────────────────────────────
Existing offers that would pass strict filter: 3
Existing offers that would remain hidden: 23
New offers that would pass strict filter: 2
PROJECTED TOTAL PUBLIC OFFERS: 5

═══════════════════════════════════════════════════════════

✨ VERDICT: PRODUCTION_RECOVERY_VERIFIED
Reason: Fresh extraction successful (12 offers). Existing offers can be 
recovered: 8/26. Post-sync: 5 public offers.

✅ SAFE TO DEPLOY
Production extraction verified. Existing offers can be recovered.
8 of 26 existing offers matched to fresh extraction.
5 offers would become public after sync.
```

---

## Support

If you have questions:

1. Check the detailed report JSON for exact numbers
2. Review provider-specific errors in extraction section
3. Compare with local tests: `npm run sync:dryrun`
4. Check GitHub Actions logs for full error messages

---

**Remember:** This dry-run proves that production extraction works and offers can be recovered BEFORE you deploy the strict filter. Use it to make an informed decision.
