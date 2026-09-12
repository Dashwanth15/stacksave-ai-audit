# Partner Offers Documentation

## Overview

StackSave AI Audit discovers and validates AI offers from two distinct sources:

1. **Direct Provider Offers** - Daily GitHub Actions Playwright extraction from official AI provider sources
2. **Partner Offers** - Static seeds and partner discovery from commercial bundling partners

Both types follow the same validation gates and quality standards before publication.

---

## Partner Offers vs Direct Provider Offers

### Direct Provider Offers (Primary Pipeline)

**Source:** Official AI provider websites (pricing pages, education portals, startup programs)

**Extraction Method:** 
- Automated daily Playwright extraction
- File: `backend/scripts/official_pricing_extractor.ts`
- Schedule: Daily at 02:00 UTC via GitHub Actions

**Examples:**
- Cursor Pro 14-Day Free Trial
- ChatGPT Edu for Universities
- Anthropic for Startups Program Credits
- Claude Pro Annual Savings

**Detection Method:** `PLAYWRIGHT_DOM`, `JSON_LD`, `HTML_TABLE`, `NEXTJS_EMBEDDED`

**Characteristics:**
- Refreshed daily
- Auto-expires if no longer present on official page
- Subject to grace period (2 scans or 48 hours)

---

### Partner Offers (Secondary Pipeline)

**Source:** Partner bundling programs (e.g., GitHub Education Pack)

**Extraction Method:**
- Static seed from partner discovery service
- File: `backend/src/pricing/partnerDiscoveryService.ts`
- Manual verification and periodic updates

**Examples:**
- **JetBrains AI Offer** - GitHub Education Pack
- Google AI Pro with Jio 5G - Telecom bundle
- Perplexity Pro with Airtel Thanks - Telecom bundle
- Galaxy AI with Google Gemini - Device bundle

**Detection Method:** `SEEDED`

**Characteristics:**
- Verified partner relationships
- Updated when partner programs change
- Requires manual confirmation from official partner sources

---

## JetBrains AI Offer (Case Study)

### Current Status

```
Provider ID:       jetbrains
Provider Name:     jetbrains
Title:             JetBrains AI Offer
Evidence:          94 chars
Source URL:        https://education.github.com/pack
Source Status:     VERIFIED
Is Active:         YES
Is Public:         YES
Detection Method:  SEEDED
Partner:           GitHub Education
Detected At:       2026-09-12
```

### Why JetBrains Uses SEEDED Method

1. **Source Type:** Part of GitHub Student Developer Pack (partner bundle)
2. **Extraction Challenge:** The pack page lists dozens of partners; extracting individual offers requires specific parsing
3. **Verification:** Manually confirmed from official GitHub Education documentation
4. **Stability:** Partner relationships change infrequently compared to pricing/promotions

### Why It Doesn't Appear in Daily Extraction

The daily GitHub Actions extraction (`official_pricing_extractor.ts`) focuses on **direct AI provider sources**, not partner bundle catalogs. JetBrains AI offers are verified through the GitHub Education Pack but seeded separately to avoid:

- Parsing complexity (60+ partners on one page)
- False positives from dynamic JavaScript content
- Extraction failures blocking the entire workflow

---

## Partner Offer Discovery Process

### 1. Source Identification

Partner offers are discovered from:
- GitHub Student Developer Pack
- Cloud platform startup programs (AWS Activate, Azure for Startups)
- Telecom bundles (Airtel, Jio, Deutsche Telekom)
- Device bundles (ASUS, Samsung Galaxy, Xiaomi)
- Credit card programs (Amex Business Platinum)
- Enterprise membership programs

### 2. Verification Requirements

All partner offers must pass:

✅ **Official Source Validation**
- URL must be from registered partner domain
- Partner relationship publicly documented
- Offer terms clearly stated

✅ **Evidence Requirements**
- Minimum 20 characters of extracted evidence text
- Describes the AI benefit explicitly
- Includes eligibility criteria

✅ **Commercial Validity**
- Partner organization name confirmed
- Partner type classified (telecom, devices, banking, etc.)
- AI provider and plan specified

### 3. Publication Gates

Partner offers pass through the **same validation gates** as direct provider offers:

**Gate 1: Ingestion** (`isPubliclyVerifiableOffer`)
```typescript
// Requirements:
✅ providerStatus === 'VERIFIED'
✅ isRegisteredOfficialSource(providerId, sourceUrl)
✅ evidenceText.length >= 20
✅ offer.detectedAt exists
```

**Gate 2: API** (`canPublishOffer`)
```typescript
// Additional filters:
✅ sourceUrl exists and is official
✅ evidenceText.length >= 20
✅ status !== 'INACTIVE'
✅ isActive !== false
✅ partner name exists (for partner offers)
```

---

## Partner Offer Database Schema

```typescript
interface PartnerOffer {
  // Base offer fields (same as direct provider offers)
  providerId: string;         // e.g., 'jetbrains', 'gemini'
  providerName: string;       // e.g., 'JetBrains', 'Gemini'
  title: string;
  description: string;
  sourceUrl: string;
  evidenceText: string;
  detectionMethod: 'SEEDED'; // Distinguishes from PLAYWRIGHT_DOM
  
  // Partner-specific fields
  partner: string;            // e.g., 'GitHub Education', 'Airtel'
  partnerType: string;        // e.g., 'education', 'telecom', 'devices'
  aiProvider: string;         // e.g., 'JetBrains', 'Google'
  aiPlan?: string;           // e.g., 'AI Premium', 'Pro'
  
  // Standard metadata
  detectedAt: Date;
  lastConfirmedAt: Date;
  isActive: boolean;
  isPublic: boolean;
  fingerprint: string;
}
```

---

## Current Partner Offers (Active)

### Education Partners

| Partner | AI Provider | Offer | Evidence Source |
|---------|-------------|-------|-----------------|
| GitHub Education | JetBrains | JetBrains AI Offer | https://education.github.com/pack |
| GitHub Education | GitHub Copilot | Student Developer Pack | https://education.github.com/pack |

### Telecom Partners

| Partner | AI Provider | Offer | Region |
|---------|-------------|-------|--------|
| Airtel | Perplexity | Pro with Airtel Thanks | India |
| Jio | Google Gemini | AI Pro with Jio 5G | India |
| Deutsche Telekom | Perplexity | Deutsche Telekom AI Offer | Germany |
| SoftBank | Perplexity | SoftBank AI Offer | Japan |

### Device Partners

| Partner | AI Provider | Offer | Device Type |
|---------|-------------|-------|-------------|
| ASUS | Google Gemini | AI Premium with ASUS AI PC | Laptops |
| Samsung Galaxy | Google Gemini | Galaxy AI with Gemini | Smartphones |
| Xiaomi | Google Gemini | Xiaomi AI Offer | Smartphones |
| Nothing Technology | Perplexity | Nothing Technology AI Offer | Smartphones |

### Cloud & Startup Partners

| Partner | AI Provider | Offer | Program Type |
|---------|-------------|-------|--------------|
| AWS Activate | Claude | Up to $100,000 AI Credits | Startup Grant |
| Azure for Startups | ChatGPT | Up to $150,000 AI Credits | Startup Grant |
| Google Cloud | Gemini | Up to $200,000 AI Credits | Startup Grant |
| OpenAI | OpenAI API | Startup Credits Program | Startup Grant |
| Anthropic | Claude | Anthropic for Startups | Startup Grant |

### Financial Partners

| Partner | AI Provider | Offer | Card Type |
|---------|-------------|-------|-----------|
| Amex Business Platinum | ChatGPT | Technology & AI Credits | Credit Card |
| Google One | Gemini | AI Premium with Google Nest | Membership |

---

## Updating Partner Offers

### Adding a New Partner Offer

**1. Verify Official Source**
- Confirm partner relationship is publicly documented
- Obtain official source URL
- Verify AI provider and benefit details

**2. Add to Discovery Service**

File: `backend/src/pricing/partnerDiscoveryService.ts`

```typescript
// Example: New partner offer
export const KNOWN_PARTNER_OFFERS: NormalizedPartnerOffer[] = [
  // ... existing offers ...
  {
    partner: 'New Partner Name',
    partnerType: 'telecom', // or 'devices', 'banking', 'education', etc.
    providerId: 'target-ai-provider',
    providerName: 'Target AI Provider',
    aiProvider: 'Target AI Provider',
    aiPlan: 'Pro', // optional
    title: 'Descriptive Offer Title',
    description: 'Complete offer description with eligibility and benefits',
    benefit: '12 months free access', // or discount amount
    eligibility: 'Partner customers',
    activationMethod: 'Via partner portal', // optional
    duration: '12 months', // optional
    officialSourceUrl: 'https://partner.com/ai-offers',
    sourceType: 'PARTNER_OFFICIAL',
    country: 'US', // or 'GLOBAL'
    region: undefined, // or 'APAC', 'EMEA', etc.
    termsUrl: 'https://partner.com/terms', // optional
    detectedAt: new Date('2026-08-24'),
    fingerprint: buildPartnerOfferFingerprint({...}),
    isActive: true,
  },
];
```

**3. Verify Evidence Quality**

Ensure the description field contains:
- ✅ Minimum 20 characters
- ✅ AI provider name
- ✅ Specific benefit (free access, discount %, credits)
- ✅ Eligibility criteria
- ✅ Duration or expiration (if applicable)

**4. Run Verification**

```bash
cd backend
npx tsx scratch/forensic_offer_reconciliation.ts
```

Confirm the new offer appears with:
- `isActive: true`
- `isPublic: true`
- `evidenceText.length >= 20`
- `sourceStatus: VERIFIED`

---

## Partner Offer Lifecycle

### Creation
```
Partner relationship identified
        ↓
Source URL verified
        ↓
Offer details extracted
        ↓
Added to partnerDiscoveryService.ts
        ↓
MongoDB: eventType=NEW_OFFER, detectionMethod=SEEDED
```

### Updates
```
Partner terms change
        ↓
Update partnerDiscoveryService.ts
        ↓
Re-run partner offer scanner
        ↓
Old version: isActive=false
New version: isActive=true
```

### Expiration
```
Partner program ends
        ↓
Set isActive=false in partnerDiscoveryService.ts
        ↓
Offer no longer returned by API
        ↓
Removed from frontend display
```

---

## Validation Script

The forensic reconciliation script verifies all offers (direct + partner):

```bash
cd backend
npx tsx scratch/forensic_offer_reconciliation.ts
```

**Output includes:**
- Total offers (active + inactive)
- Provider breakdown
- Partner offer identification
- Evidence quality verification
- Publication gate results

---

## Comparison: Direct vs Partner Offers

| Aspect | Direct Provider Offers | Partner Offers |
|--------|------------------------|----------------|
| **Source** | AI provider official sites | Partner bundle programs |
| **Extraction** | Automated daily (GitHub Actions) | Manual verification + seeding |
| **Method** | PLAYWRIGHT_DOM, JSON_LD, etc. | SEEDED |
| **Update Frequency** | Daily | As partner programs change |
| **Auto-Expiry** | Yes (48h grace period) | Manual deactivation |
| **Validation Gates** | Same as partner offers | Same as direct offers |
| **Evidence Quality** | ≥20 chars required | ≥20 chars required |
| **API Publication** | Yes | Yes |
| **Frontend Display** | Yes | Yes |

**Key Point:** Both offer types are treated equally in the publication pipeline. Partner offers simply use a different discovery method (`SEEDED` vs `PLAYWRIGHT_DOM`) but pass through identical validation gates.

---

## Troubleshooting Partner Offers

### Issue: Partner offer not appearing in frontend

**Check:**
1. Verify `isActive = true` in database
2. Verify `isPublic = true` in database
3. Check `evidenceText.length >= 20`
4. Confirm `sourceUrl` is in source registry
5. Run diagnostic script to test publication gates

```bash
cd backend
npx tsx scratch/forensic_offer_reconciliation.ts
```

### Issue: Partner offer shows as inactive

**Possible causes:**
1. Fingerprint collision with older version
2. Grace period expiry (shouldn't apply to SEEDED offers)
3. Manual deactivation in partnerDiscoveryService.ts
4. Provider status changed to RETIRED

**Resolution:**
- Check MongoDB for duplicate fingerprints
- Verify partnerDiscoveryService.ts has `isActive: true`
- Re-run partner offer scanner

---

## Best Practices

### ✅ DO

- Verify partner relationships from official sources before adding
- Include descriptive evidence text (≥20 chars)
- Specify partner type accurately (telecom, devices, banking, etc.)
- Update offers when partner terms change
- Run diagnostic script after adding new offers
- Document partner relationships in this file

### ❌ DON'T

- Add unverified partner offers
- Use generic or vague evidence text
- Leave outdated offers active
- Skip validation gates
- Hardcode offers in frontend
- Bypass source registry validation

---

## Related Documentation

- **OFFER_DATA_FLOW_FORENSIC_REPORT.md** - Complete pipeline analysis
- **backend/src/pricing/partnerDiscoveryService.ts** - Partner offer definitions
- **backend/src/pricing/offerTrust.ts** - Validation gate implementations
- **backend/scratch/forensic_offer_reconciliation.ts** - Diagnostic tool

---

## Maintenance Schedule

- **Weekly:** Review partner offers for accuracy
- **Monthly:** Verify partner relationships still active
- **Quarterly:** Audit all partner sources for changes
- **As needed:** Add new partner offers when discovered

---

**Last Updated:** August 24, 2026  
**Active Partner Offers:** 20+  
**Partner Types:** Education, Telecom, Devices, Cloud, Financial
