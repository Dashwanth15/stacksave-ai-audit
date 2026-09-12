# Offer Pipeline Operations Guide

## Overview

This guide covers operational procedures for monitoring, diagnosing, and maintaining the StackSave AI offer discovery and publication pipeline.

---

## Quick Health Check

### Run Diagnostic Script

```bash
cd backend
npx tsx scratch/forensic_offer_reconciliation.ts
```

**Expected Output:**
```
✅ Connected to MongoDB

═══════════════════════════════════════════════════════════════
FORENSIC OFFER RECONCILIATION DIAGNOSTIC
═══════════════════════════════════════════════════════════════

STEP 1: RAW DATABASE COUNTS
───────────────────────────────────────────────────────────────
Total Notification Events:       70
  eventType = 'NEW_OFFER':        70
  isActive != false:              43
  isPublic = true:                44
  sourceStatus = 'VERIFIED':      56

STEP 2: QUALIFICATION FUNNEL (MongoDB Query)
───────────────────────────────────────────────────────────────
Offers passing MongoDB filters:  43
  (eventType=NEW_OFFER, isActive!=false, isPublic=true)

...

SUMMARY
═══════════════════════════════════════════════════════════════
Total Offers in Database:         70
Active & Public (MongoDB):        43
Passed canPublishOffer (API):     43
Failed canPublishOffer:           0

EXPECTED API RESPONSE:            43 offers
═══════════════════════════════════════════════════════════════
```

**What to Check:**
- ✅ Active & Public count matches API pass count
- ✅ Failed canPublishOffer = 0
- ✅ Provider breakdown shows expected providers
- ✅ All active offers have evidence ≥20 chars

---

## Diagnostic Script Features

### Location
`backend/scratch/forensic_offer_reconciliation.ts`

### Purpose
Comprehensive pipeline validation that traces:
1. Raw database counts
2. MongoDB qualification funnel
3. Provider-level breakdown
4. Application-layer publication gate results
5. Complete offer inventory
6. Offer loss analysis
7. Sample offer verification

### When to Run

**Daily:**
- After GitHub Actions extraction completes
- Before deploying frontend changes
- After modifying validation gates

**As Needed:**
- When investigating "missing" offers
- Before adding new providers
- After partner offer updates
- When verifying offer counts

**After Issues:**
- User reports missing offers
- Extraction failures
- Database migrations
- Validation gate changes

---

## Understanding the Output

### Section 1: Raw Database Counts

```
Total Notification Events:       70
  eventType = 'NEW_OFFER':        70
  isActive != false:              43
  isPublic = true:                44
  sourceStatus = 'VERIFIED':      56
```

**What it means:**
- **Total Events:** All offer records in database (active + inactive)
- **NEW_OFFER:** Offers (vs other notification types)
- **isActive != false:** Offers that haven't expired or been deactivated
- **isPublic = true:** Offers marked for public display
- **sourceStatus = VERIFIED:** Offers from successfully scanned sources

**Health Check:**
- Active count should be 40-60% of total (normal churn)
- Public count should equal or exceed active count
- Verified count should be high (>80%)

---

### Section 2: Qualification Funnel

```
Offers passing MongoDB filters:  43
  (eventType=NEW_OFFER, isActive!=false, isPublic=true)
```

**What it means:**
- Number of offers that pass the initial MongoDB query
- These offers are candidates for API response

**Health Check:**
- Should match active public offer count from Section 1

---

### Section 3: Provider Breakdown

```
Provider                 Offers  Titles
─────────────────────────────────────────────────────────────
Gemini                   12      Google AI Student Bundle, ...
Perplexity                5      Perplexity Pro with Airtel, ...
ChatGPT                   4      ChatGPT Edu, Teachers K-12, ...
```

**What it means:**
- Active offer count per provider
- Sample offer titles for verification

**Health Check:**
- Major providers (ChatGPT, Gemini, Claude) should have offers
- New providers should appear if recently added
- Counts should align with known promotions

---

### Section 4: Application-Layer Publication Gate

```
MongoDB qualifying offers:        43
Passed canPublishOffer:           43 ✅
Failed canPublishOffer:           0 ❌
```

**What it means:**
- How many offers pass the second validation gate in the API
- **Critical metric:** Should be 0 failures

**Health Check:**
- ✅ Failures = 0 (all qualifying offers pass)
- ⚠️ Failures > 0 (investigate rejected offers list)

**If failures detected:**
```
REJECTED OFFERS (Failed canPublishOffer):
─────────────────────────────────────────────────────────────
  providerId           | title                              | reason
  cursor               | Cursor Student Offer               | INSUFFICIENT_EVIDENCE
  perplexity           | Annual Discount                    | NOT_IN_SOURCE_REGISTRY
```

**Common rejection reasons:**
- `INSUFFICIENT_EVIDENCE` - evidenceText < 20 chars
- `NOT_IN_SOURCE_REGISTRY` - sourceUrl not registered
- `NO_SOURCE_URL` - Missing source URL
- `STATUS_{X}` - Wrong status value
- `IS_ACTIVE_FALSE` - Deactivated offer

---

### Section 5: Complete Offer Inventory

```
Provider             Title                              Active  Public  Status    Evidence
────────────────────────────────────────────────────────────────────────────────────────
cursor               Cursor Pro 14-Day Free Trial       YES     YES     VERIFIED  119 chars ✅
chatgpt              ChatGPT Edu for Universities       YES     YES     VERIFIED  112 chars ✅
cursor               Cursor for Students (old)          NO      NO      N/A       0 chars ❌
```

**What it means:**
- Every offer in database (active + inactive)
- Status of each field used in publication gates
- Evidence length for quality verification

**Health Check:**
- Active offers should have evidence ≥20 chars (✅)
- Inactive offers may have 0 chars (expected for old versions)
- Status should be VERIFIED for most active offers

---

### Section 6: Offer Loss Analysis

```
Offers marked INACTIVE:           27
Offers marked NOT PUBLIC:         0
Offers failing canPublishOffer:   0
```

**What it means:**
- Why offers aren't reaching the frontend
- **Inactive:** Intentionally filtered (grace period expired, duplicates)
- **Not Public:** Failed ingestion validation
- **Failed Gate:** Rejected by API filter

**Health Check:**
- ✅ Only inactive offers are filtered
- ⚠️ Not public > 0 (ingestion validation issue)
- ⚠️ Failed gate > 0 (API filter issue)

---

### Section 7: Sample Offers

```
[✅] cursor | Cursor Pro 14-Day Free Trial
     Source: https://cursor.com/pricing
     Evidence: 119 chars
     Status: VERIFIED | Public: true | Active: true
```

**What it means:**
- Detailed view of first 10 qualifying offers
- Shows exact field values used in validation

**Health Check:**
- All samples should show ✅
- Evidence should be ≥20 chars
- Source should be official URL

---

## Common Scenarios

### Scenario 1: User Reports Missing Offer

**Steps:**
1. Run diagnostic script
2. Search for provider in Section 3 (Provider Breakdown)
3. Check Section 5 (Complete Inventory) for offer title
4. Verify offer fields:
   - Active: YES
   - Public: YES
   - Evidence: ≥20 chars
   - Status: VERIFIED

**If offer is inactive:**
- Check when it was last confirmed
- Verify it still exists on official source
- Re-run extraction if needed

**If offer is active but not passing gate:**
- Check Section 4 for rejection reason
- Fix source URL registration or evidence text
- Re-run ingestion

---

### Scenario 2: Extraction Shows Offers But Frontend Doesn't

**Steps:**
1. Run diagnostic script
2. Compare counts:
   - GitHub Actions log: Offers extracted THIS RUN
   - Diagnostic Section 2: Offers in database (cumulative)
   - Diagnostic Section 4: Offers passing API gate

**Expected behavior:**
- GitHub Actions: 10 offers extracted
- Database: 43 active offers (includes previous runs)
- API: 43 offers returned
- Frontend: 43 offers displayed

**If API count < Database count:**
- Check Section 4 for failures
- Review rejection reasons
- Fix validation issues

**If Frontend count < API count:**
- Check browser network tab
- Verify API response
- Check frontend console for errors

---

### Scenario 3: Partner Offer Not Appearing

**Steps:**
1. Run diagnostic script
2. Find partner offer in Section 5
3. Check fields:
   - detectionMethod: SEEDED
   - isActive: YES
   - isPublic: YES
   - evidenceText: ≥20 chars

**If marked inactive:**
- Check `backend/src/pricing/partnerDiscoveryService.ts`
- Verify `isActive: true` in source
- Re-run partner offer scanner

**If failing validation:**
- Check sourceUrl is in source registry
- Verify evidenceText meets requirements
- Update partner offer definition

---

### Scenario 4: High Inactive Offer Count

**Normal:**
```
Total Offers: 70
Active: 43
Inactive: 27
Ratio: 61% active
```

**Concerning:**
```
Total Offers: 100
Active: 20
Inactive: 80
Ratio: 20% active
```

**Investigation:**
1. Check Section 5 for inactive offer reasons
2. Look for patterns:
   - Many "0 chars evidence" → Extraction quality issue
   - Many recent deactivations → Grace period expiry
   - Same title repeated → Duplicate fingerprints

**Actions:**
- If evidence issues: Improve extraction
- If grace period: Verify sources still have offers
- If duplicates: Check fingerprint logic

---

## Maintenance Procedures

### Daily Health Check (Automated)

**Add to CI/CD:**
```yaml
- name: Verify Offer Pipeline Health
  run: |
    cd backend
    npx tsx scratch/forensic_offer_reconciliation.ts > /tmp/diagnostic.log
    
    # Extract key metrics
    ACTIVE=$(grep "Active & Public" /tmp/diagnostic.log | awk '{print $5}')
    FAILED=$(grep "Failed canPublishOffer" /tmp/diagnostic.log | awk '{print $3}')
    
    echo "Active Offers: $ACTIVE"
    echo "Failed Validation: $FAILED"
    
    if [ "$FAILED" -gt "0" ]; then
      echo "❌ Offers failing validation gate!"
      exit 1
    fi
```

---

### Weekly Provider Audit

**Checklist:**
1. Run diagnostic script
2. Review provider breakdown
3. Verify major providers have offers:
   - ✅ ChatGPT: 3-5 offers
   - ✅ Gemini: 10-15 offers
   - ✅ Claude: 2-4 offers
   - ✅ GitHub Copilot: 2-3 offers
   - ✅ Perplexity: 4-6 offers
4. Check for new providers in database
5. Verify inactive offers are legitimate

---

### Monthly Deep Audit

**Process:**
1. Run diagnostic script and save output
2. Compare with previous month:
   - Total offer count trend
   - Active/inactive ratio
   - Provider coverage
   - Evidence quality distribution
3. Review inactive offers:
   - Identify patterns
   - Verify grace period working
   - Check for extraction issues
4. Test random sample of 10 offers:
   - Visit source URL
   - Confirm offer still exists
   - Verify evidence matches page

---

## Alerting Thresholds

### Critical Alerts (Immediate Action)

```
❌ CRITICAL: Failed canPublishOffer > 0
❌ CRITICAL: Active offers < 30
❌ CRITICAL: API pass rate < 95%
```

**Action:** Run diagnostic, investigate failures, fix validation issues

---

### Warning Alerts (Review Within 24h)

```
⚠️ WARNING: Active offers < 40
⚠️ WARNING: Inactive ratio > 50%
⚠️ WARNING: Major provider missing offers (ChatGPT, Gemini, Claude)
```

**Action:** Review provider breakdown, check extraction logs, verify sources

---

### Info Alerts (Monitor)

```
ℹ️ INFO: Total offers > 100
ℹ️ INFO: New provider detected
ℹ️ INFO: Unusual offer count spike (+20% in 24h)
```

**Action:** Review for data quality, verify new provider is legitimate

---

## Troubleshooting Guide

### Problem: Diagnostic script fails to connect to MongoDB

**Symptoms:**
```
❌ Connection error: MongooseError: ...
```

**Resolution:**
1. Check `.env` file has `MONGODB_URI`
2. Verify MongoDB instance is running
3. Test connection: `mongosh $MONGODB_URI`
4. Check network/firewall rules

---

### Problem: All offers failing canPublishOffer

**Symptoms:**
```
Passed canPublishOffer:  0 ❌
Failed canPublishOffer: 43 ❌
```

**Resolution:**
1. Check rejection reasons in Section 4
2. Verify source registry is loaded
3. Check `offerTrust.ts` validation logic
4. Review recent code changes

---

### Problem: Evidence text showing 0 chars

**Symptoms:**
```
cursor  Cursor Pro Trial  YES  YES  VERIFIED  0 chars ❌
```

**Resolution:**
1. Check extraction function for provider
2. Verify `evidenceText` field is populated
3. Review Playwright selector logic
4. Test extraction locally

---

### Problem: High rejection rate for specific provider

**Symptoms:**
```
REJECTED OFFERS:
  gemini  | Google AI Offer 1  | NOT_IN_SOURCE_REGISTRY
  gemini  | Google AI Offer 2  | NOT_IN_SOURCE_REGISTRY
  gemini  | Google AI Offer 3  | NOT_IN_SOURCE_REGISTRY
```

**Resolution:**
1. Check source registry for provider
2. Verify sourceUrl matches registered URLs
3. Add missing URLs to source registry
4. Re-run extraction

---

## Integration with Monitoring

### Datadog/New Relic Integration

```typescript
// Add to diagnostic script
import { datadogMetrics } from './monitoring';

const result = await runDiagnostic();

datadogMetrics.gauge('offers.active', result.activeCount);
datadogMetrics.gauge('offers.inactive', result.inactiveCount);
datadogMetrics.gauge('offers.api_pass_rate', result.apiPassRate);
datadogMetrics.gauge('offers.validation_failures', result.validationFailures);
```

### Slack Notifications

```bash
# Add to CI/CD after diagnostic run
if [ "$FAILED" -gt "0" ]; then
  curl -X POST $SLACK_WEBHOOK \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"⚠️ Offer Pipeline Alert: $FAILED offers failing validation\",
      \"channel\": \"#engineering-alerts\"
    }"
fi
```

---

## Related Documentation

- **OFFER_DATA_FLOW_FORENSIC_REPORT.md** - Complete pipeline analysis
- **PARTNER_OFFERS.md** - Partner offer documentation
- **backend/src/pricing/offerTrust.ts** - Validation gate code
- **backend/scripts/official_pricing_extractor.ts** - Extraction code

---

## Support

### Diagnostic Script Issues

**GitHub Issues:** Tag with `offer-pipeline` label  
**Slack Channel:** `#stacksave-engineering`  
**On-Call:** Check PagerDuty rotation

### Emergency Contacts

**Offer Pipeline Owner:** [Engineering Lead]  
**Database Admin:** [DBA Team]  
**DevOps:** [DevOps Team]

---

**Last Updated:** August 24, 2026  
**Script Version:** 1.0.0  
**Monitoring Status:** ✅ Active
