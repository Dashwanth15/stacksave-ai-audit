# Offer Pipeline Quick Reference

## 📚 Documentation Index

### Core Documentation

1. **[OFFER_DATA_FLOW_FORENSIC_REPORT.md](./OFFER_DATA_FLOW_FORENSIC_REPORT.md)**
   - Complete forensic analysis of offer pipeline
   - Data flow architecture
   - Validation gates explained
   - Offer reconciliation results
   - **Read this first** to understand the entire system

2. **[PARTNER_OFFERS.md](./PARTNER_OFFERS.md)**
   - Partner offers vs direct provider offers
   - JetBrains offer case study
   - How to add new partner offers
   - Partner offer lifecycle
   - Current active partner relationships

3. **[OFFER_PIPELINE_OPERATIONS.md](./OFFER_PIPELINE_OPERATIONS.md)**
   - Daily operations guide
   - Diagnostic script usage
   - Troubleshooting procedures
   - Monitoring and alerting
   - Maintenance schedules

---

## 🚀 Quick Start

### Run Pipeline Diagnostic

```bash
cd backend
npm run diagnose:offers
```

**Or manually:**
```bash
cd backend
npx tsx scratch/forensic_offer_reconciliation.ts
```

### What You'll See

```
✅ Connected to MongoDB

═══════════════════════════════════════════════════════════════
FORENSIC OFFER RECONCILIATION DIAGNOSTIC
═══════════════════════════════════════════════════════════════

SUMMARY
═══════════════════════════════════════════════════════════════
Total Offers in Database:         70
Active & Public (MongoDB):        43
Passed canPublishOffer (API):     43
Failed canPublishOffer:           0

EXPECTED API RESPONSE:            43 offers
═══════════════════════════════════════════════════════════════
```

### Health Check Criteria

✅ **Healthy Pipeline:**
- Active & Public count: 40-60 offers
- API pass rate: 100% (0 failures)
- Evidence quality: All active offers ≥20 chars
- Major providers present: ChatGPT, Gemini, Claude, GitHub Copilot

⚠️ **Needs Attention:**
- API failures > 0
- Active offers < 30
- Major provider missing
- Evidence quality issues

❌ **Critical Issue:**
- Cannot connect to MongoDB
- All offers failing validation
- Active offers < 20

---

## 📊 Understanding Offer Counts

### Why Extraction ≠ Frontend

**GitHub Actions Extraction Log:**
```
TOTAL EXTRACTION RESULT: 13 offers extracted
```
_This shows offers found in THIS extraction run (new/updated)_

**Diagnostic Script:**
```
Active & Public (MongoDB): 43
```
_This shows ALL currently active offers (cumulative)_

**Frontend Display:**
```
43 Active Promotions
```
_This shows what users see (matches database active count)_

### Normal Behavior

```
Day 1 Extraction:  10 offers → Database: 10 active
Day 2 Extraction:   5 offers → Database: 15 active (10 + 5 new)
Day 3 Extraction:   0 offers → Database: 15 active (no changes)
Day 4 Extraction:   3 offers → Database: 18 active (15 + 3 new)
```

Old offer versions are automatically deactivated when updated.

---

## 🔍 Common Questions

### Q: "Why does frontend show more offers than GitHub Actions extracted?"

**A:** GitHub Actions shows offers extracted **in that specific run**. The frontend shows **all cumulative active offers** from multiple runs. This is correct behavior.

See: [OFFER_DATA_FLOW_FORENSIC_REPORT.md](./OFFER_DATA_FLOW_FORENSIC_REPORT.md#why-extraction-count--frontend-count)

---

### Q: "Where does the JetBrains offer come from?"

**A:** JetBrains is a **partner offer** (detection method: `SEEDED`) from GitHub Education Pack, not daily extraction. It's verified and legitimate.

See: [PARTNER_OFFERS.md](./PARTNER_OFFERS.md#jetbrains-ai-offer-case-study)

---

### Q: "How do I add a new partner offer?"

**A:** 
1. Verify official source
2. Add to `backend/src/pricing/partnerDiscoveryService.ts`
3. Run `npm run diagnose:offers` to verify
4. Document in `PARTNER_OFFERS.md`

See: [PARTNER_OFFERS.md](./PARTNER_OFFERS.md#adding-a-new-partner-offer)

---

### Q: "Why are some offers marked inactive?"

**A:** Offers become inactive when:
- Grace period expired (absent from source for 2 scans or 48 hours)
- Replaced by newer version (duplicate fingerprint)
- Provider marked as RETIRED
- Insufficient evidence on extraction

This is **correct behavior** - maintains data integrity.

See: [OFFER_DATA_FLOW_FORENSIC_REPORT.md](./OFFER_DATA_FLOW_FORENSIC_REPORT.md#inactive-offers-analysis)

---

### Q: "How do I troubleshoot missing offers?"

**A:**
1. Run `npm run diagnose:offers`
2. Find provider in output
3. Check offer status (Active, Public, Evidence)
4. Review rejection reasons if any
5. Fix validation issues or re-run extraction

See: [OFFER_PIPELINE_OPERATIONS.md](./OFFER_PIPELINE_OPERATIONS.md#scenario-1-user-reports-missing-offer)

---

## 🏗️ Pipeline Architecture

```
Official Provider Sources
        ↓
GitHub Actions (Daily)
        ↓
Playwright Extraction
        ↓
Offer Normalization
        ↓
POST /api/admin/pricing/ingest
        ↓
isPubliclyVerifiableOffer() ← GATE 1
(provider verified, official source, evidence ≥20 chars)
        ↓
MongoDB NotificationEventModel
(isActive=true, isPublic=true)
        ↓
GET /api/intelligence/offers
        ↓
canPublishOffer() ← GATE 2
(redundant validation + partner checks)
        ↓
Frontend API Client
        ↓
OffersPage.tsx
(no filtering, displays all)
        ↓
User sees offer cards
```

---

## 🛠️ Key Files

### Extraction
- `backend/scripts/official_pricing_extractor.ts` - Main extraction runner
- `backend/src/pricing/adapters/*.ts` - Provider-specific extractors
- `backend/src/pricing/multiSignalOfferScanner.ts` - Generic offer scanner

### Validation
- `backend/src/pricing/offerTrust.ts` - Publication gates
- `backend/src/pricing/sourceRegistry.ts` - Official source URLs

### Ingestion
- `backend/src/pricing/syncOrchestrator.ts` - Ingestion logic
- `backend/src/routes/admin.ts` - Admin API endpoints

### API
- `backend/src/routes/intelligence.ts` - Public offers endpoint

### Partner Offers
- `backend/src/pricing/partnerDiscoveryService.ts` - Partner offer seeds
- `backend/src/pricing/partnerOfferScanner.ts` - Partner scan logic

### Diagnostics
- `backend/scratch/forensic_offer_reconciliation.ts` - Pipeline health check

### Frontend
- `frontend/src/pages/OffersPage.tsx` - Offers display
- `frontend/src/utils/offerFormatter.ts` - Offer formatting
- `frontend/src/services/api.ts` - API client

---

## 📝 npm Scripts

```bash
# Offer Pipeline
npm run diagnose:offers      # Run forensic diagnostic
npm run extract:pricing      # Run extraction manually

# Other Audits
npm run audit:all           # Run all audit scripts
npm run audit:offers:predeploy  # Pre-deployment offer audit
npm run test                # Run tests
npm run lint                # Lint code
```

---

## 🚨 Emergency Procedures

### All Offers Missing from Frontend

1. **Check API:**
   ```bash
   curl https://stacksave-backend.onrender.com/api/intelligence/offers
   ```

2. **Run Diagnostic:**
   ```bash
   npm run diagnose:offers
   ```

3. **Check Ingestion Logs:**
   - Review GitHub Actions logs
   - Look for `[PricingSync:Ingest] REJECTED:` messages

4. **Verify Database:**
   ```bash
   mongosh $MONGODB_URI
   > use stacksave
   > db.notificationevents.countDocuments({eventType:"NEW_OFFER", isActive:{$ne:false}, isPublic:true})
   ```

---

### Specific Provider Missing

1. **Run diagnostic and search for provider:**
   ```bash
   npm run diagnose:offers | grep -i "provider-name"
   ```

2. **Check extraction:**
   - Review GitHub Actions logs for provider
   - Look for extraction status (VERIFIED, FETCH_BLOCKED, PARSE_FAILED)

3. **Check source registry:**
   - Verify provider is in `sourceRegistry.ts`
   - Confirm URLs are correct

---

### High Rejection Rate

1. **Run diagnostic to see rejections:**
   ```bash
   npm run diagnose:offers
   ```

2. **Review Section 4 output:**
   ```
   REJECTED OFFERS (Failed canPublishOffer):
   ─────────────────────────────────────────
     providerId | title | reason
   ```

3. **Fix common issues:**
   - `INSUFFICIENT_EVIDENCE`: Improve extraction to get ≥20 chars
   - `NOT_IN_SOURCE_REGISTRY`: Add source URL to registry
   - `NO_SOURCE_URL`: Fix extraction to include sourceUrl

---

## 📈 Monitoring

### Daily Checks
- [ ] Run diagnostic script
- [ ] Verify 0 validation failures
- [ ] Check active offer count (40-60 range)
- [ ] Confirm major providers present

### Weekly Checks
- [ ] Review provider breakdown
- [ ] Audit inactive offers
- [ ] Verify partner offers active
- [ ] Check evidence quality distribution

### Monthly Checks
- [ ] Deep audit (compare trends)
- [ ] Test sample of offers on official sites
- [ ] Update partner relationships
- [ ] Review inactive offer patterns

---

## 🔗 Related Files

- **Root Project Docs:**
  - `../ARCHITECTURE.md` - Overall system architecture
  - `../OFFER_DATA_FLOW_FORENSIC_REPORT.md` - Complete forensic report

- **Backend Docs:**
  - `./PARTNER_OFFERS.md` - Partner offer guide
  - `./OFFER_PIPELINE_OPERATIONS.md` - Operations manual

- **Scripts:**
  - `./scripts/official_pricing_extractor.ts` - Extraction runner
  - `./scratch/forensic_offer_reconciliation.ts` - Diagnostic tool

---

## 💡 Tips

1. **Always run the diagnostic script first** when investigating issues
2. **Read the forensic report** to understand the complete pipeline
3. **Check GitHub Actions logs** to see what was extracted vs what reached the frontend
4. **Remember:** Extraction count ≠ Frontend count (cumulative vs per-run)
5. **Partner offers are legitimate** - they use SEEDED method instead of daily extraction

---

## 📞 Support

**Questions?** 
- Check documentation first
- Run diagnostic script
- Review GitHub Actions logs
- Search for similar issues in repo

**Still stuck?**
- Tag issue with `offer-pipeline` label
- Include diagnostic script output
- Provide GitHub Actions run link
- Describe expected vs actual behavior

---

**Last Updated:** August 24, 2026  
**Pipeline Status:** ✅ Healthy (43/43 offers passing validation)  
**Documentation Status:** ✅ Complete
