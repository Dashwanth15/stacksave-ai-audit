# Strict Verification Filter: Safe GitHub Actions Dry-Run Deployment

## Status: Ready for Production Testing

The strict verification filter is **complete and tested locally**, but **NOT yet deployed to production**.

**Blocker:** We must verify that existing 26 offers can be recovered after deployment using the actual GitHub Actions Playwright environment.

---

## What Has Been Built

### 1. Strict Verification Filter ✅
- Location: `backend/src/routes/intelligence.ts` (lines 340-345)
- Logic: 8 required conditions (all must be true for public display)
  - `sourceStatus === 'VERIFIED'`
  - `isPublic === true`
  - `evidenceText` (non-empty)
  - `lastConfirmedAt` (valid timestamp)
  - `lastSuccessfulCheckAt` (valid timestamp)
  - `sourceFetchedAt` (valid timestamp)
  - `providerId` and `sourceUrl` (registered source)

### 2. Diagnostic Endpoint ✅
- Location: `backend/src/routes/intelligence.ts` (lines 213-317)
- Endpoint: `GET /api/intelligence/offers/diagnostic`
- Authentication: `requireAdminSecret` middleware
- Purpose: Admin-only offer analysis and filter verification

### 3. Pre-Deployment Audit Scripts ✅
- `predeployment_offer_audit.ts` — Database state verification
- `verify_sync_reverification_path.ts` — Re-verification path validation
- `provider_dryrun.ts` — Optional live provider testing

### 4. Production Dry-Run Capability ✅
- GitHub Actions Workflow: `.github/workflows/pricing-sync-dryrun.yml`
- Script: `backend/scripts/pricing_sync_dryrun.ts`
- Command: `npm run sync:dryrun`
- **Key feature:** Real Playwright extraction + in-memory simulation (NO database writes)

---

## Current Database State (Verified Real)

**Query Results:**
```
Total offers: 26
Passing strict filter: 0/26
Failing strict filter: 26/26

By provider:
  Cursor: 1 offer (fails: no evidenceText)
  Claude: 6 offers (fails: missing timestamps)
  ChatGPT: 8 offers (fails: missing timestamps)
  Others: 11 offers (various failures)

Key missing fields:
  evidenceText: 1/26 (only Cursor has it)
  sourceFetchedAt: 0/26 (ALL missing)
  lastSuccessfulCheckAt: 0/26 (ALL missing)
  lastConfirmedAt: 13/26 (13 missing)
```

**Why all 26 are hidden:**
- Offers lack post-remediation provenance fields
- These fields are set DURING sync, not at offer creation
- Legacy offers created before strict filter don't have them
- They will be populated when sync runs fresh extraction

---

## The Gap: Local Testing ≠ Production

**Local environment limitation:**
```
❌ 12/13 providers fail locally:
   - Claude: HTTP 403
   - ChatGPT: HTTP 403
   - Anthropic API: HTTP 403
   - Gemini: Timeout
   - Others: Playwright unavailable or network issues

✅ Only Cursor succeeds locally
```

**Why it matters:**
- Local ISP/VPN may block or rate-limit providers
- GitHub Actions has different IP range (AWS)
- Official pages may differ by IP/geography
- Local Playwright unavailable or blocked differently
- Cannot prove recovery without testing in GitHub Actions

**Decision:**
- **CANNOT** deploy based on local test results
- **MUST** run dry-run in GitHub Actions to prove recovery
- This is the ONLY way to verify production behavior

---

## How to Execute the Dry-Run

### Quick Start: 3 Steps

#### Step 1: Ensure Code is Pushed to GitHub
```bash
git add .
git commit -m "Add production dry-run for strict verification filter"
git push origin main
```

#### Step 2: Run Dry-Run Workflow in GitHub Actions
1. Go to: **Repository → Actions → Workflows**
2. Select: **"Official AI Pricing Sync DRY-RUN (Read-Only Test)"**
3. Click: **"Run workflow"** button
4. Choose: `main` branch
5. Optionally check: "Enable detailed provider output"
6. Click: **"Run workflow"**

#### Step 3: Wait and Review Results
- Workflow runs on Ubuntu 20.04 with Playwright installed
- Duration: ~10 minutes
- Go to **Actions** tab to view progress
- Download `pricing-sync-dryrun-report` artifact when complete

### What the Dry-Run Tests

**Execution in GitHub Actions:**
1. ✅ Installs Playwright + Chromium (same as production)
2. ✅ Runs real provider extraction (13 adapters)
3. ✅ Fetches current official pages
4. ✅ Extracts commercial data with evidence
5. ✅ Reads 26 existing MongoDB offers (READ-ONLY)
6. ✅ Matches fingerprints
7. ✅ Applies strict filter to simulated post-sync state
8. ✅ Reports which offers would pass
9. ❌ Does NOT write to MongoDB
10. ❌ Does NOT modify any data

---

## Expected Outcomes

### Scenario A: PRODUCTION_RECOVERY_VERIFIED ✅

**Output example:**
```
EXISTING OFFER MATCHING
────────────────────────────
Existing offers: 26
Matched to fresh extraction: 8
Matched and would pass strict filter: 3

SIMULATED POST-SYNC
────────────────────────────
Existing offers that would pass: 3
New offers that would pass: 2
PROJECTED TOTAL PUBLIC OFFERS: 5

VERDICT: PRODUCTION_RECOVERY_VERIFIED ✅
```

**What this means:**
- 8 of 26 existing offers matched fresh extraction
- 3 of 26 would pass strict filter after sync
- Fresh extraction is working in GitHub Actions
- Safe to deploy

**Next action:** Deploy the strict filter to production

### Scenario B: PRODUCTION_RECOVERY_NOT_VERIFIED ❌

**Output example:**
```
EXISTING OFFER MATCHING
────────────────────────────
Existing offers: 26
Matched to fresh extraction: 0
Matched and would pass strict filter: 0

SIMULATED POST-SYNC
────────────────────────────
Existing offers that would pass: 0
New offers that would pass: 0
PROJECTED TOTAL PUBLIC OFFERS: 0

VERDICT: PRODUCTION_RECOVERY_NOT_VERIFIED ❌
```

**What this means:**
- No existing offers matched fresh extraction
- All 26 would remain hidden after sync
- Fresh extraction failed or doesn't match

**Next action:** Investigate before deploying
- Check why extraction failed
- Verify fingerprint generation
- Fix provider adapters if needed
- Re-run dry-run after fixes

---

## After the Dry-Run

### If VERIFIED: Deploy the Filter

1. **Review the numbers** from the report
   - How many offers would become public?
   - Is this acceptable?

2. **Deploy with confidence**:
   ```bash
   # The strict filter code is already in place, ready to use
   # Just trigger your production deployment
   ```

3. **Monitor the real sync**:
   - Trigger `pricing-sync` workflow to run full sync
   - Check `/api/intelligence/pricing-status` for results
   - Verify offers appear in public API
   - Compare actual vs. projected numbers

### If NOT VERIFIED: Investigate

1. **Check provider extraction**:
   - Which providers succeeded?
   - Which failed and why?
   - Are adapters working correctly?

2. **Check offer matching**:
   - Review detailed report
   - Why don't existing offers match fresh extraction?
   - Is fingerprint generation correct?

3. **Fix issues** and retry
   - Adjust extraction if needed
   - Fix provider adapters
   - Re-run dry-run

4. **Do NOT deploy** without verification

---

## Files Created for Safe Deployment

```
.github/
└── workflows/
    ├── pricing-sync.yml          [existing - production sync]
    └── pricing-sync-dryrun.yml   [NEW - safe dry-run]

backend/
├── scripts/
│   ├── predeployment_offer_audit.ts
│   ├── verify_sync_reverification_path.ts
│   ├── provider_dryrun.ts
│   ├── production_extraction_simulator.ts
│   └── pricing_sync_dryrun.ts    [NEW - main dry-run]
│
└── src/
    └── routes/
        └── intelligence.ts       [contains strict filter + diagnostic]

PRODUCTION_DRYRUN_GUIDE.md       [NEW - comprehensive guide]
```

---

## Safety Guarantees

**The dry-run is 100% safe:**

✅ **READ-ONLY Operations:**
- Only reads existing offers from MongoDB
- Simulates matching in memory
- Simulates filter application in memory
- Writes report to file only

❌ **NO Write Operations:**
- Does NOT insert offers
- Does NOT update offers
- Does NOT delete offers
- Does NOT deactivate offers
- Does NOT modify timestamps
- Does NOT call `upsertOffer()`
- Does NOT call `ingestOfficialExtractedPricing()`
- Does NOT run the real sync
- Does NOT modify production data in any way

---

## Timeline

**Phase 1: Complete** ✅
- Built strict verification filter
- Created diagnostic endpoint
- Created pre-deployment audits
- Built production dry-run capability
- Code TypeScript compiles successfully
- Database state confirmed

**Phase 2: In Progress** ⏳
- Run GitHub Actions dry-run (you do this)
- Review results
- Make deployment decision

**Phase 3: Post-Verification** 🎯
- If VERIFIED: Deploy filter to production
- If NOT VERIFIED: Investigate and fix
- Monitor real sync after deployment

---

## Key Decision Points

### Before Running Dry-Run
- ✅ Code is complete and compiles
- ✅ Database state documented
- ✅ All safety checks in place

### During Dry-Run
- GitHub Actions will test real extraction
- No data will be modified
- Results will guide deployment decision

### After Dry-Run
- **VERIFIED** → Safe to deploy
- **NOT VERIFIED** → Investigate before deploying

---

## Command Reference

**Local testing (optional):**
```bash
cd backend
npm run sync:dryrun
```

**Database audit:**
```bash
npm run audit:offers:predeploy
```

**Build:**
```bash
npm run build
```

---

## Questions Before Running?

**Q: Will the dry-run modify my database?**
A: No. It only reads offers and simulates in memory. Zero writes.

**Q: What if all providers fail in GitHub Actions too?**
A: Then VERDICT will be NOT_VERIFIED. Don't deploy. Investigate why extraction fails.

**Q: How long does the dry-run take?**
A: ~10 minutes on GitHub Actions (includes Playwright setup time).

**Q: Can I run this multiple times?**
A: Yes, as many times as you want. Each run is independent and read-only.

**Q: What if I see different results than I expect?**
A: Download the detailed JSON report and analyze. Each offer's status is documented.

---

## Next: You Are Here 👈

```
┌─────────────────────────────────────────┐
│ 1. Build + Test ✅ (DONE)               │
│ 2. Run GitHub Actions Dry-Run ⏳ (YOU) │
│ 3. Review Results                       │
│ 4. Deploy to Production (if verified)   │
└─────────────────────────────────────────┘
```

**You are at Step 2.**

Go to GitHub Actions and run the dry-run workflow. It will tell you whether it's safe to deploy.

---

## Support

Full guide with details: See `PRODUCTION_DRYRUN_GUIDE.md`

For questions during the dry-run:
1. Check the detailed JSON report
2. Review workflow logs in GitHub Actions
3. Consult the guide for interpretation help
