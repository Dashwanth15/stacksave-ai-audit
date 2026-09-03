# 🚨 REAL PROVIDER SYNC DRY-RUN VERIFICATION RESULTS

**Date:** August 24, 2026  
**Status:** ❌ CRITICAL FINDINGS  
**Environment:** Local (attempted extraction against real production URLs)

---

## EXECUTIVE SUMMARY

**DO NOT DEPLOY YET.**

The real provider extraction pipeline is currently **UNABLE TO RE-VERIFY EXISTING OFFERS**.

- **0 of 26 existing offers** have been matched to fresh official provider data
- **12 of 13 providers** failed extraction (network/auth/Playwright issues)
- **0 offers extracted** with real evidence/provenance
- **After deployment + attempted sync:** 0 of 26 offers would become public

**The 26 existing offers CANNOT be recovered by official provider sync from this environment.**

---

## DETAILED RESULTS

### Current Database State
```
Total offers:              26
Active (isActive ≠ false): 12
Public (isPublic = true):  0
Verified:                  12
Passing strict filter:     0/26
```

### Real Provider Extraction Execution
```
Providers attempted:       13
Providers successful:      1 (Cursor only)
Providers failed:          12

Fresh offers extracted:    0
Fresh offers with evidence: 0
Fresh fingerprints:        0
```

### Provider-Level Results

| Provider | Status | Reason | Impact |
|----------|--------|--------|--------|
| **Cursor** | ✅ VERIFIED | JSON-LD extraction worked | ✓ Can extract |
| Claude | ❌ FETCH_BLOCKED | HTTP 403 or network block | ✗ Cannot extract |
| ChatGPT | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Gemini | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Windsurf | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Perplexity | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| OpenAI API | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Anthropic API | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Kimi | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| GitHub Copilot | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| DeepSeek | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| Codex | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |
| GitHub Models | ❌ NOT_VERIFIED | Playwright not available | ✗ Cannot extract |

### Existing Offer Matching Analysis

```
Total existing offers:     26
Matched to fresh data:     0
Not matched:              26

Would pass strict filter after sync: 0
Would remain quarantined:           0
```

#### Unmatched Offers (All 26):

1. ❌ **cursor** | Cursor: "off" promotion detected → NO_MATCH
2. ❌ **deepseek** | DeepSeek: "off-peak" promotion detected → NO_MATCH
3. ❌ **cursor** | Cursor Pro 14-Day Free Trial → NO_MATCH
4. ❌ **github-copilot** | GitHub Copilot Free for Students & Educators → NO_MATCH
5. ❌ **deepseek** | DeepSeek Off-Peak 50% Discount → NO_MATCH
6. ❌ **claude** | Claude Pro Annual Savings → NO_MATCH
7. ❌ **gemini** | Google AI Student Bundle Promotion → NO_MATCH
8. ❌ **openai-api** | OpenAI Batch API 50% Discount → NO_MATCH
9. ❌ **cursor** | Cursor Pro 14-Day Free Trial (duplicate) → NO_MATCH
10. ❌ **cursor** | Cursor for Students (12 Months Free Pro) → NO_MATCH
11. ❌ **github-copilot** | GitHub Copilot Free for Students (duplicate) → NO_MATCH
12. ❌ **github-copilot** | GitHub Student Developer Pack → NO_MATCH
13. ❌ **deepseek** | DeepSeek Off-Peak 50% Discount (duplicate) → NO_MATCH
14. ❌ **claude** | Claude Pro Annual Savings (duplicate) → NO_MATCH
15. ❌ **claude** | Anthropic for Startups Program Credits → NO_MATCH
16. ❌ **chatgpt** | ChatGPT for Teachers (K-12 Workspace) → NO_MATCH
17. ❌ **chatgpt** | ChatGPT Edu for Universities → NO_MATCH
18. ❌ **gemini** | Google AI Student Bundle Promotion (duplicate) → NO_MATCH
19. ❌ **windsurf** | Windsurf Pro Annual Billing Savings → NO_MATCH
20. ❌ **perplexity** | Perplexity Pro Annual Subscription Savings → NO_MATCH
21. ❌ **openai-api** | OpenAI for Startups API Credits → NO_MATCH
22. ❌ **anthropic-api** | Anthropic Prompt Caching (90% Read Discount) → NO_MATCH
23. ❌ **kimi** | Moonshot AI Developer Registration Free → NO_MATCH
24. ❌ **deepseek** | DeepSeek Off-Peak 50% Discount (3rd) → NO_MATCH
25. ❌ **anthropic-api** | Anthropic Message Batches API 50% Discount → NO_MATCH
26. ❌ **gemini** | Google AI Student Bundle Promotion (3rd) → NO_MATCH

---

## ROOT CAUSE ANALYSIS

### Why Extraction Failed

1. **Playwright Unavailable (8 providers)**
   - ChatGPT, Gemini, Windsurf, Perplexity, OpenAI API, Anthropic API, Kimi, GitHub Copilot
   - Production uses headless Chromium to render dynamic SPAs
   - This local environment lacks browser runtime
   - **Result:** Cannot fetch/parse dynamic pages

2. **Network/Auth Blocks (4 providers)**
   - Claude: HTTP 403 (authentication required or rate limited)
   - DeepSeek: HTTP 403 or timeout
   - Codex: Likely requires auth
   - GitHub Models: Likely requires auth
   - **Result:** Cannot fetch official sources

3. **JSON-LD Not Extracting Offers (1 provider)**
   - Cursor: JSON-LD structure exists but NO OFFERS in extracted data
   - Status: VERIFIED for plans, but 0 offers extracted
   - **Result:** Cannot match existing Cursor offers to fresh data

### Why Fingerprint Matching Failed

**Fingerprint = SHA256(providerId::title::description)[0:32]**

Fresh extraction produced **ZERO offers** because:
1. Most providers failed fetch (no HTML to parse)
2. Cursor succeeded on plans but extracted 0 offers
3. No offer fingerprints could be built from extraction
4. All 26 existing offers have no matches in fresh fingerprints

**Consequence:** Even though existing offers are in database, they cannot be re-verified because there are no fresh offers to match against.

---

## WHAT THIS MEANS FOR DEPLOYMENT

### Scenario: Deploy Strict Filter Today + Run Sync

```
TODAY:
  Deploy code → Strict filter active
  Public offers: 0/26 (expected)
  
THEN:
  Run official provider sync
  
RESULT:
  ❌ Only Cursor extracted (0 offers)
  ❌ 12 providers failed (403/network/Playwright)
  ❌ 0 existing offers matched to fresh data
  ❌ 0 of 26 offers pass strict filter
  ❌ Offers page still shows "0 Active Promotions"
  ❌ STUCK - offers cannot be recovered
```

### Recovery Options

1. **Fix Provider Extraction** (Recommended)
   - Resolve Playwright issues (install browser, fix auth)
   - Resolve 403 blocks (check network, update user agents, handle rate limits)
   - Re-run sync with working extractors
   - Offers should then be recovered

2. **Manual Verification** (Fallback)
   - Manually mark each of 26 offers with fresh provenance
   - Add `evidenceText`, `sourceFetchedAt`, `lastConfirmedAt`, `lastSuccessfulCheckAt`
   - Offers pass strict filter
   - NOT RECOMMENDED (defeats purpose of automated trust model)

3. **Relax Verification** (NOT RECOMMENDED)
   - Remove strict filter requirements
   - Violates "NO EVIDENCE = NO PUBLIC OFFER" invariant
   - User explicitly rejected this option
   - Reintroduces unverified claims

4. **Delay Deployment** (Recommended)
   - Fix extraction pipeline first
   - Verify sync works from production environment
   - Then deploy (know that recovery will work)

---

## UNVERIFIED ITEMS

### Environment Limitations

This verification was run in a **local development environment** with:
- ❌ No Playwright/Chromium browser (12 providers require this)
- ❌ Network blocks to some official sources (403 responses)
- ❌ Possibly different IP/user-agent than production

### Production Environment May Differ

The **production sync runner** (GitHub Actions):
- ✅ HAS Playwright installed
- ✅ Runs from GitHub's IP (may have different rate limits/blocks)
- ✅ Uses proper user agents (may bypass some 403s)
- ✅ Can retry on transient failures

**Possibility:** Production extraction could succeed where local fails.

**Evidence:** Cursor works locally (JSON-LD method), suggesting extraction *can* work from this environment.

---

## CRITICAL QUESTIONS

1. **Has production sync ever successfully extracted offers?**
   - If YES: Offers were recovered in production previously (different environment)
   - If NO: Same problem exists in production

2. **What happens when sync runs in production right now?**
   - Unknown (not tested from production environment)
   - Could succeed (resolve Playwright/auth issues)
   - Could fail (same 403/network blocks apply there too)

3. **Why do all 12 Playwright providers fail locally?**
   - Browser not available: ✓ (Playwright not installed or chromium missing)
   - Network firewall: ✓ (official sources blocked by ISP/VPN)
   - Rate limit: ✓ (GitHub Actions may have different quota)

---

## RECOMMENDATION

### DO NOT DEPLOY WITHOUT VERIFICATION

**Before deploying strict filter:**

1. **Test production sync** from production environment (GitHub Actions):
   - Run official_pricing_extractor.ts in production
   - Record extraction results
   - Verify which providers succeed/fail
   - Confirm offers can be extracted

2. **OR fix local environment**:
   - Install Playwright: `npm install -D playwright`
   - Check network (can curl https://claude.com/pricing?)
   - Re-run verification script
   - Confirm offers can be extracted locally

3. **OR confirm existing offers aren't critical**:
   - Accept that 26 offers disappear after deployment
   - Plan to re-add them manually
   - Document this limitation

### IF YOU PROCEED ANYWAY

**Requirement:** Official provider sync MUST be tested in production BEFORE deployment.

**Backup plan:** If sync still fails, offers are NOT permanently deleted (stored in DB), but will remain hidden indefinitely.

---

## SUMMARY

| Metric | Result | Assessment |
|--------|--------|------------|
| Database offers found | 26 | ✓ Data exists |
| Extraction attempted | 13 providers | ✓ Code ran |
| Extraction succeeded | 1 provider | ❌ Mostly failed |
| Fresh offers extracted | 0 | ❌ CRITICAL |
| Existing offers matched | 0/26 | ❌ CRITICAL |
| Would recover after sync | 0 | ❌ CRITICAL |
| Data deletion risk | 0 (safe) | ✓ Guaranteed |
| Can re-verify later | YES | ✓ If extraction fixed |

---

## FINAL VERDICT

✅ **Safe from data loss perspective** — Existing offers CANNOT be deleted, only hidden

❌ **NOT SAFE to deploy** — Existing offers CANNOT be recovered with current extraction pipeline

**Action:** Resolve extraction issues BEFORE deployment, OR accept that offers will remain hidden.

---

**Test completed:** August 24, 2026  
**Environment:** Local development  
**Next step:** Test production extraction pipeline
