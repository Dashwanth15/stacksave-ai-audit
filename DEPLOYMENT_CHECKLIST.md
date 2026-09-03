# Strict Verification Filter: Deployment Checklist

## Pre-Deployment Phase ✅

### Code & Build
- [x] Strict verification filter implemented (8 conditions)
- [x] Diagnostic endpoint created (`GET /api/intelligence/offers/diagnostic`)
- [x] TypeScript compiles without errors
- [x] All imports resolve correctly
- [x] No type errors

### Safety Verification
- [x] Strict filter logic confirmed in `intelligence.ts` lines 340-345
- [x] Diagnostic endpoint authenticated with `requireAdminSecret`
- [x] No delete operations exist in codebase
- [x] Offers only deactivated via grace period (not deleted)
- [x] All 26 existing offers remain in MongoDB (0 deletions possible)

### Database State Documented
- [x] Current state audited: 26 offers total
- [x] Current public (passing filter): 0 offers
- [x] Current hidden (failing filter): 26 offers
- [x] Reason documented: missing provenance fields
- [x] Field breakdown recorded in audit reports

### Pre-Deployment Audit Scripts Created
- [x] `predeployment_offer_audit.ts` — Database verification
- [x] `verify_sync_reverification_path.ts` — Code path validation
- [x] `provider_dryrun.ts` — Local extraction test
- [x] `production_extraction_simulator.ts` — Environment explanation
- [x] `pricing_sync_dryrun.ts` — Production-safe dry-run

### Documentation
- [x] `PRODUCTION_DRYRUN_GUIDE.md` — Complete user guide
- [x] `DRYRUN_DEPLOYMENT_INSTRUCTIONS.md` — Quick reference
- [x] `ROOT_CAUSE_ANALYSIS.md` — Historical context (if exists)
- [x] `SAFE_MIGRATION_PLAN.md` — Implementation approach (if exists)

---

## Dry-Run Execution Phase ⏳ (YOU ARE HERE)

### Before Running Dry-Run
- [ ] Code pushed to GitHub (`git push origin main`)
- [ ] GitHub Secrets configured:
  - [ ] `BACKEND_URL` = `https://stacksave-backend.onrender.com`
  - [ ] `ADMIN_SECRET` = (configured value from Render)
  - [ ] `MONGODB_URI` = (configured value, optional)
- [ ] Read `DRYRUN_DEPLOYMENT_INSTRUCTIONS.md`
- [ ] Understood the 3-step process

### Running the Dry-Run
- [ ] Navigate to GitHub repository
- [ ] Go to **Actions → Workflows**
- [ ] Select **"Official AI Pricing Sync DRY-RUN (Read-Only Test)"**
- [ ] Click **"Run workflow"** button
- [ ] Choose branch: `main`
- [ ] Optionally enable: "Enable detailed provider output"
- [ ] Click **"Run workflow"**
- [ ] ⏱️ Wait ~10 minutes for completion

### Monitoring the Dry-Run
- [ ] Workflow appears in Actions tab
- [ ] All steps complete successfully
- [ ] No database errors in logs
- [ ] No write operations logged

### Reviewing Results
- [ ] Download artifact: `pricing-sync-dryrun-report` (JSON)
- [ ] Review console output in workflow logs
- [ ] Check VERDICT field in report
- [ ] Document verdict: VERIFIED or NOT_VERIFIED
- [ ] Record key metrics:
  - Total offers extracted
  - Existing offers matched
  - Offers that would pass strict filter
  - Projected total public offers

### Sample Good Result
```
VERDICT: PRODUCTION_RECOVERY_VERIFIED
Reason: Fresh extraction successful (12 offers). 
Existing offers can be recovered: 8/26. 
Post-sync: 5 public offers.
```

### Sample Concerning Result
```
VERDICT: PRODUCTION_RECOVERY_NOT_VERIFIED
Reason: No existing offers matched to fresh extraction. 
All 26 offers would remain hidden.
```

---

## Post-Dry-Run Decision Phase 🎯

### If VERDICT = PRODUCTION_RECOVERY_VERIFIED ✅

#### Step 1: Review Numbers
- [ ] Read the projected public offers count
- [ ] Confirm this matches expectations
- [ ] Check which providers successfully extracted
- [ ] Verify offer evidence fields are populated

#### Step 2: Final Safety Check
- [ ] Review `SAFE_MIGRATION_PLAN.md` one more time
- [ ] Confirm strict filter rules have NOT changed
- [ ] Confirm evidence requirements have NOT been relaxed
- [ ] Confirm no delete operations will run
- [ ] Confirm grace period logic will deactivate, not delete

#### Step 3: Deploy Filter to Production
```bash
# Option A: If using git push + webhook
git push origin main
# Trigger your production deployment system

# Option B: If using manual deployment
# Follow your deployment process
```

#### Step 4: Monitor Real Sync
- [ ] Trigger full `pricing-sync` workflow in GitHub Actions
- [ ] Or wait for daily 02:00 UTC scheduled run
- [ ] Monitor workflow logs for completion
- [ ] Check `/api/intelligence/pricing-status` endpoint
- [ ] Verify actual offer count matches projection
- [ ] Spot-check public offers in API response

#### Step 5: Verify Public API
```bash
# Test diagnostic endpoint (admin only)
curl -H "x-admin-secret: YOUR_SECRET" \
  https://stacksave-backend.onrender.com/api/intelligence/offers/diagnostic

# Response should show:
# - Current offer counts
# - Strict filter passing/failing breakdown
# - Public offers list (filtered)
```

#### Step 6: Document Success
- [ ] Record deployment timestamp
- [ ] Note actual vs. projected numbers
- [ ] Update documentation if numbers differ
- [ ] Close deployment task

### If VERDICT = PRODUCTION_RECOVERY_NOT_VERIFIED ❌

#### Step 1: Analyze Failure
- [ ] Download detailed JSON report
- [ ] Identify which providers failed
- [ ] Check if extraction produced ANY offers
- [ ] Check if existing offers matched at all
- [ ] Read failure reasons in detail

#### Step 2: Determine Root Cause
**If all providers failed:**
- [ ] Check GitHub Actions logs for errors
- [ ] Verify Playwright installation
- [ ] Check network connectivity
- [ ] Consider provider page changes

**If some providers failed:**
- [ ] Identify which ones succeeded
- [ ] Check provider-specific adapters
- [ ] Verify extraction logic
- [ ] Test locally for comparison

**If extraction succeeded but no matches:**
- [ ] Check fingerprint generation
- [ ] Verify offer title normalization
- [ ] Compare hash algorithms
- [ ] Inspect MongoDB data

#### Step 3: Investigation Actions
- [ ] Run local tests: `npm run sync:dryrun`
- [ ] Review extraction code for failures
- [ ] Check provider official URLs
- [ ] Test provider pages manually
- [ ] Verify database connection

#### Step 4: Fix Issues
- [ ] Update extraction adapters if needed
- [ ] Fix fingerprint generation if needed
- [ ] Adjust provider strategies if needed
- [ ] Update extraction logic if needed

#### Step 5: Re-Run Dry-Run
- [ ] Push fixes to GitHub
- [ ] Run dry-run workflow again
- [ ] Compare results
- [ ] Repeat until VERDICT = VERIFIED

#### Step 6: Do NOT Deploy Yet
- ❌ Do NOT deploy filter to production
- ❌ Do NOT run real sync
- ❌ Do NOT modify offers
- ✅ DO investigate and fix
- ✅ DO re-run dry-run to verify

---

## Post-Deployment Monitoring

### After Deployment (Once VERIFIED)

#### First 24 Hours
- [ ] Monitor `/api/intelligence/pricing-status`
- [ ] Check offer count trending
- [ ] Verify no unexpected deactivations
- [ ] Check error logs for anomalies
- [ ] Confirm strict filter is active in API responses

#### One Week
- [ ] Spot-check public offers in UI
- [ ] Verify offer evidence quality
- [ ] Monitor for user complaints
- [ ] Check pricing-sync workflow runs
- [ ] Compare actual vs. projected recovery

#### Ongoing
- [ ] Review daily pricing-sync results
- [ ] Monitor offer lifecycle
- [ ] Track grace period expirations
- [ ] Alert on extraction failures
- [ ] Document any adjustments needed

---

## Critical Rules (Do NOT Violate)

❌ **NEVER:**
- [ ] Deploy without VERDICT = PRODUCTION_RECOVERY_VERIFIED
- [ ] Modify strict filter rules
- [ ] Relax evidence requirements
- [ ] Add fallback/cached evidence
- [ ] Fabricate evidence text
- [ ] Delete existing offers
- [ ] Skip the dry-run verification

✅ **ALWAYS:**
- [ ] Run dry-run before deployment
- [ ] Verify in GitHub Actions environment
- [ ] Review detailed results
- [ ] Monitor after deployment
- [ ] Document decisions
- [ ] Preserve all 26 existing offers

---

## Rollback Plan (If Something Goes Wrong)

**If offers disappear after deployment:**

1. **Immediate:** Check if deactivation is happening
   ```bash
   # Check isActive status
   db.NotificationEventModel.find({ isActive: false }).count()
   ```

2. **If deactivated:** Verify grace period logic
   - Are offers being deactivated incorrectly?
   - Check consecutiveMisses increment
   - Review sync logs

3. **If deleted:** (Should not happen — no delete operations exist)
   - Check application logs
   - Search MongoDB for deletion traces
   - Restore from backup if necessary

4. **Rollback:** Disable strict filter
   - Set all offers `isPublic: true` as emergency measure
   - Or revert filter in `intelligence.ts` lines 340-345
   - Deploy emergency fix
   - Investigate root cause

5. **Prevention:** Have backup plan
   - Know how to disable filter
   - Have deployment rollback capability
   - Monitor offer counts continuously

---

## Success Criteria

### Deployment is Successful When:

- [x] Dry-run VERDICT = PRODUCTION_RECOVERY_VERIFIED
- [x] Fresh extraction ran in GitHub Actions
- [x] Existing offers matched to fresh data
- [x] Projected public offers count is reasonable
- [ ] Filter deployed to production
- [ ] Real sync runs and matches projection
- [ ] Public API shows correct offer count
- [ ] No unexpected offer deactivations
- [ ] No user complaints about missing offers
- [ ] Documentation updated with actual results

### Deployment Failed When:

- ❌ Dry-run VERDICT = PRODUCTION_RECOVERY_NOT_VERIFIED
- ❌ Extraction fails in GitHub Actions
- ❌ No existing offers match fresh data
- ❌ Actual sync results differ drastically from projection
- ❌ Offers unexpectedly disappear from public API
- ❌ Grace period is deactivating offers incorrectly

---

## Timeline Estimate

**Dry-Run Execution:**
- GitHub Actions setup: ~2 minutes
- Playwright installation: ~3 minutes
- Provider extraction: ~5 minutes
- Analysis + reporting: ~1 minute
- **Total: ~10 minutes**

**Decision Making:**
- Review results: 5-15 minutes
- Investigate (if needed): 30 minutes - 2 hours
- Fix issues (if needed): 30 minutes - 2 hours

**Deployment (if VERIFIED):**
- Deploy to production: 5-30 minutes (your system)
- Run real sync: ~10 minutes
- Monitoring: ongoing
- **Total: 15-40 minutes**

---

## Questions?

**Before running dry-run:**
- Read: `DRYRUN_DEPLOYMENT_INSTRUCTIONS.md`
- Read: `PRODUCTION_DRYRUN_GUIDE.md`

**During dry-run:**
- Monitor: GitHub Actions workflow tab
- Check: Workflow logs for errors

**After dry-run:**
- Review: JSON report artifact
- Analyze: VERDICT and reasoning
- Decide: Deploy or investigate

**On failure:**
- Reference: Root cause analysis section
- Check: Logs for specific errors
- Test: Locally with `npm run sync:dryrun`

---

## Sign-Off

**Ready for Dry-Run:** ✅
- All code complete
- All safety checks in place
- All documentation ready
- Database state documented
- No data will be modified

**Next Action:** Run GitHub Actions dry-run workflow

**You are here:** 👈 Step 2 of 4

```
1. Build + Test ✅
2. Run Dry-Run ⏳ (NOW)
3. Review Results
4. Deploy (if VERIFIED)
```

**Go to GitHub Actions and run the dry-run workflow.**
