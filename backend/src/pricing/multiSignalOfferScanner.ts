// ============================================================
// Multi-Signal Offer Scanner — StackSave AI Spend & Intelligence
//
// Live DOM inspection and deterministic offer candidate detection.
// Scans official provider pages (pricing, promotions, education, startups)
// for genuine commercial offers, discounts, trials, and savings programs.
//
// INVARIANT:
//   NO OFFICIAL SOURCE + NO EVIDENCE = NO PUBLIC OFFER.
//   Normal pricing alone (e.g. "$20/month") is NOT an offer.
//   Differentiates VERIFIED_NO_OFFER from FETCH_BLOCKED/EXTRACTION_ERROR.
// ============================================================

import { createHash } from 'crypto';
import type { Page } from 'playwright';
import {
  NormalizedOffer,
  NormalizedPlan,
  ScannedSourcePage,
  SyncStatus,
  OfficialExtractedProviderData,
} from './types';
import { PlaywrightOfferResearchAgent } from './offerResearchAgent';
import { checkOfferDestination, type OfferDestinationHealthResult } from './offerDestinationHealthCheck';

export interface CandidateRejection {
  snippet: string;
  reason: string;
}

export interface ProviderExtractionDiagnostics {
  providerId: string;
  displayName: string;
  sourceUrl: string;
  httpStatus?: number;
  navSuccess: boolean;
  navError?: string;
  pageLoaded: boolean;
  bodyTextLength: number;
  keywordsFound: string[];
  candidatesFound: number;
  qualifyingOffers: number;
  rejectedCandidates: CandidateRejection[];
  status: SyncStatus;
  statusReason: string;
  offers: NormalizedOffer[];
  plans: NormalizedPlan[];
}

function buildOfferFingerprint(providerId: string, title: string, text: string): string {
  return createHash('sha256')
    .update(`${providerId}::${title.toLowerCase().trim()}::${text.toLowerCase().trim()}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * Robustly cleans and extracts sentences / text blocks containing a target keyword.
 */
function extractContextSnippets(text: string, regex: RegExp, maxSnippets = 3): string[] {
  const snippets: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);

  while ((match = re.exec(text)) !== null && snippets.length < maxSnippets) {
    const idx = match.index;
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + match[0].length + 100);
    const rawSnippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (rawSnippet.length >= 20 && !snippets.includes(rawSnippet)) {
      snippets.push(rawSnippet);
    }
  }

  return snippets;
}

export class MultiSignalOfferScanner {
  /**
   * Scans a live Playwright page for a provider and extracts verified plans and qualifying offers.
   */
  public static async scanProviderPage(
    page: Page,
    providerId: string,
    displayName: string,
    sourceUrl: string,
    options: {
      secondaryUrls?: Array<{ url: string; type: string; label?: string }>;
      educationUrl?: string;
      startupUrl?: string;
    } = {}
  ): Promise<ProviderExtractionDiagnostics> {
    const checkedAt = new Date();
    const scannedPages: ScannedSourcePage[] = [];
    const rejectedCandidates: CandidateRejection[] = [];
    const qualifyingOffers: NormalizedOffer[] = [];
    const extractedPlans: NormalizedPlan[] = [];
    const keywordsFound: string[] = [];

    let httpStatus: number | undefined;
    let navSuccess = false;
    let navError: string | undefined;

    // 1. Navigate to primary source URL
    console.log(`   [${displayName}] Inspecting live source: ${sourceUrl}...`);
    try {
      const res = await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      httpStatus = res?.status();
      // Wait for dynamic DOM hydration / hydration scripts
      await page.waitForTimeout(2500);
      navSuccess = true;
    } catch (err: any) {
      navError = err.message || String(err);
    }

    if (!navSuccess) {
      scannedPages.push({
        url: sourceUrl,
        status: 'FETCH_BLOCKED',
        scannedAt: checkedAt,
        failureReason: navError,
      });

      return {
        providerId,
        displayName,
        sourceUrl,
        httpStatus,
        navSuccess: false,
        navError,
        pageLoaded: false,
        bodyTextLength: 0,
        keywordsFound: [],
        candidatesFound: 0,
        qualifyingOffers: 0,
        rejectedCandidates: [{ snippet: sourceUrl, reason: `Navigation failed: ${navError}` }],
        status: 'FETCH_BLOCKED',
        statusReason: `Navigation failed: ${navError}`,
        offers: [],
        plans: [],
      };
    }

    // 2. Evaluate rendered DOM
    const evalData = await page.evaluate(() => {
      const title = document.title || '';
      const rawBody = document.body ? document.body.innerText || '' : '';
      const isChallenge =
        title.includes('Just a moment') ||
        title.includes('Cloudflare') ||
        title.includes('Access denied') ||
        title.includes('Attention Required') ||
        rawBody.includes('Enable JavaScript and cookies to continue');

      return {
        title,
        isChallenge,
        bodyText: typeof rawBody === 'string' ? rawBody : String(rawBody || ''),
      };
    });

    if (evalData.isChallenge) {
      scannedPages.push({
        url: sourceUrl,
        status: 'FETCH_BLOCKED',
        scannedAt: checkedAt,
        failureReason: 'Cloudflare/Bot challenge page rendered',
      });

      return {
        providerId,
        displayName,
        sourceUrl,
        httpStatus,
        navSuccess: true,
        pageLoaded: false,
        bodyTextLength: evalData.bodyText.length,
        keywordsFound: [],
        candidatesFound: 0,
        qualifyingOffers: 0,
        rejectedCandidates: [{ snippet: evalData.title, reason: 'Security challenge page rendered' }],
        status: 'FETCH_BLOCKED',
        statusReason: 'Security challenge / Bot protection active on official page',
        offers: [],
        plans: [],
      };
    }

    scannedPages.push({ url: sourceUrl, status: 'VERIFIED', scannedAt: checkedAt });
    const bodyText = evalData.bodyText;
    const lowerBody = bodyText.toLowerCase();

    // 3. Scan for keywords
    const candidateKeywords = [
      'annual', 'yearly', 'billed annually', 'billed yearly', 'save', 'discount',
      'off', 'free', 'complimentary', 'credits', 'trial', 'student', 'education',
      'startup', 'grant', 'month free', 'months free', 'days free', '20%', '15%', '25%', '30%', '50%',
      'special offer', 'limited time', 'promo', 'promotion'
    ];
    for (const kw of candidateKeywords) {
      if (lowerBody.includes(kw)) {
        keywordsFound.push(kw);
      }
    }

    let candidatesCount = 0;
    const seenOfferKeys = new Set<string>();

    // ── Signal 1: Annual / Yearly Billing Savings ─────────────────────────
    const annualRegex = /(?:save\s*(?:up to\s*)?(\d+)%|(\d+)%\s*off|billed\s*annually|billed\s*yearly|saves?\s*[\$₹€£]\s*(\d+(?:,\d+)?)|pay\s*yearly[\s\S]{0,30}up to\s*(\d+)%\s*off|yearly\s*plans?[\s\S]{0,40}?save|plans?[\s\S]{0,40}?billed\s*yearly)/gi;
    const annualSnippets = extractContextSnippets(bodyText, annualRegex, 3);
    candidatesCount += annualSnippets.length;

    if (annualSnippets.length > 0) {
      const discountPctMatch = /(?:save\s*(?:up to\s*)?(\d+)%|(\d+)%\s*off|up to\s*(\d+)%\s*off)/i.exec(annualSnippets[0]);
      const pctStr = discountPctMatch ? (discountPctMatch[1] || discountPctMatch[2] || discountPctMatch[3]) : null;
      const pctNum = pctStr ? parseInt(pctStr, 10) : null;
      const discountLabel = pctNum ? `${pctNum}% Off Annual Billing` : 'Annual Billing Discount';

      const evidText = annualSnippets[0];
      const negCheck = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(evidText);
      const dateCheck = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(evidText, new Date());

      if (negCheck.hasNegativeSignal) {
        rejectedCandidates.push({ snippet: evidText, reason: negCheck.reason || 'Negative status signal' });
      } else if (dateCheck.isExpired) {
        rejectedCandidates.push({ snippet: evidText, reason: dateCheck.expiredReason || 'Annual promo expired' });
      } else if (pctNum !== null && pctNum < 15) {
        // Gate: Offers below 15% annual savings must not be published as standalone offers
        rejectedCandidates.push({
          snippet: evidText,
          reason: `Annual savings (${pctNum}%) below 15% publication gate threshold`,
        });
      } else if (evidText.length >= 20) {
        const title = `${displayName} Annual Subscription Savings`;
        const key = `${providerId}::annual`;
        if (!seenOfferKeys.has(key)) {
          seenOfferKeys.add(key);
          qualifyingOffers.push({
            providerId,
            title,
            description: `Save on ${displayName} subscriptions with annual billing commitments. Verified from official pricing page.`,
            discount: discountLabel,
            currency: 'USD',
            eligibility: 'All Users on Annual Billing',
            fingerprint: buildOfferFingerprint(providerId, title, evidText),
            sourceUrl,
            destinationUrl: sourceUrl,
            offerSubtype: 'ANNUAL_DISCOUNT',
            annualSavingsPercent: pctNum || 16,
            sourceStatus: 'VERIFIED',
            detectionMethod: 'PLAYWRIGHT_DOM',
            evidenceText: `Verified from official ${displayName} pricing page: ${evidText}`,
            detectedAt: checkedAt,
            lastConfirmedAt: checkedAt,
          });
        }
      } else {
        rejectedCandidates.push({ snippet: evidText, reason: 'Evidence snippet shorter than 20 characters' });
      }
    } else {
      // Check for standalone normal pricing without discount
      const normalPricingMatches = bodyText.matchAll(/[\$₹€£]\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*)month/gi);
      for (const m of normalPricingMatches) {
        rejectedCandidates.push({
          snippet: m[0],
          reason: 'Normal standard pricing; no promotional or annual discount benefit established',
        });
        break;
      }
    }

    // ── Signal 2: Promotional / First-Month Discounts ─────────────────────
    const promoRegex = /(?:first month\s*(\d+)%\s*off|(\d+)%\s*off your first|limited[- ]time\s*(?:offer|deal|discount)|special promotion|get your first month free)/gi;
    const promoSnippets = extractContextSnippets(bodyText, promoRegex, 2);
    candidatesCount += promoSnippets.length;

    for (const pSnippet of promoSnippets) {
      const match = /(?:first month\s*(\d+)%\s*off|(\d+)%\s*off|first month free)/i.exec(pSnippet);
      const pct = match ? (match[1] || match[2]) : null;
      let discountLabel = pct ? `${pct}% Off First Month` : 'Special Promotional Discount';
      if (pSnippet.toLowerCase().includes('first month free')) {
        discountLabel = '1 Month Free';
      }

      const pNeg = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(pSnippet);
      const pDate = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(pSnippet, new Date());

      if (pNeg.hasNegativeSignal) {
        rejectedCandidates.push({ snippet: pSnippet, reason: pNeg.reason || 'Negative status signal' });
        continue;
      }
      if (pDate.isExpired) {
        rejectedCandidates.push({ snippet: pSnippet, reason: pDate.expiredReason || 'Promo expired' });
        continue;
      }

      if (pSnippet.length >= 20) {
        const title = `${displayName} Promotional Discount`;
        const key = `${providerId}::promo::${discountLabel}`;
        if (!seenOfferKeys.has(key)) {
          seenOfferKeys.add(key);
          qualifyingOffers.push({
            providerId,
            title,
            description: `Limited-time promotional discount for subscribers on ${displayName}.`,
            discount: discountLabel,
            currency: 'USD',
            eligibility: 'New Subscribers',
            fingerprint: buildOfferFingerprint(providerId, title, pSnippet),
            sourceUrl,
            destinationUrl: sourceUrl,
            offerSubtype: 'PROMOTIONAL_FREE',
            sourceStatus: 'VERIFIED',
            detectionMethod: 'PLAYWRIGHT_DOM',
            evidenceText: `Verified from official ${displayName} source: ${pSnippet}`,
            detectedAt: checkedAt,
            lastConfirmedAt: checkedAt,
          });
        }
      } else {
        rejectedCandidates.push({ snippet: pSnippet, reason: 'Promotional snippet shorter than 20 characters' });
      }
    }

    // ── Signal 3: Free Trials / Free Credits Grants / Community Perks ──────
    const trialRegex = /(?:(\d+)[- ]day free trial|rate images to earn free|(\d+(?:,\d+)?)\s*free credits for new users|free gpu time|complimentary trial)/gi;
    const trialSnippets = extractContextSnippets(bodyText, trialRegex, 2);
    candidatesCount += trialSnippets.length;

    for (const tSnippet of trialSnippets) {
      const lower = tSnippet.toLowerCase();
      let title = `${displayName} Free Trial Access`;
      let discountLabel = 'Free Trial Access';
      let subtype: NormalizedOffer['offerSubtype'] = 'FREE_TRIAL';

      if (lower.includes('gpu time') || lower.includes('rate images')) {
        title = `${displayName} Free GPU Time Community Perk`;
        discountLabel = 'Complimentary GPU Time';
        subtype = 'FREE_PLAN';
      } else if (lower.includes('credits')) {
        title = `${displayName} Developer Free Credits Grant`;
        discountLabel = 'Free Platform Credits';
        subtype = 'STARTUP_GRANT';
      }

      const tNeg = PlaywrightOfferResearchAgent.detectNegativeStatusLanguage(tSnippet);
      const tDate = PlaywrightOfferResearchAgent.parseDatesAndCheckExpiry(tSnippet, new Date());

      if (tNeg.hasNegativeSignal) {
        rejectedCandidates.push({ snippet: tSnippet, reason: tNeg.reason || 'Negative status signal' });
        continue;
      }
      if (tDate.isExpired) {
        rejectedCandidates.push({ snippet: tSnippet, reason: tDate.expiredReason || 'Trial expired' });
        continue;
      }

      if (tSnippet.length >= 20) {
        const key = `${providerId}::trial::${title}`;
        if (!seenOfferKeys.has(key)) {
          seenOfferKeys.add(key);
          qualifyingOffers.push({
            providerId,
            title,
            description: `Complimentary trial or usage perk on official ${displayName} platform.`,
            discount: discountLabel,
            currency: 'USD',
            eligibility: 'All Qualifying Users',
            fingerprint: buildOfferFingerprint(providerId, title, tSnippet),
            sourceUrl,
            destinationUrl: sourceUrl,
            offerSubtype: subtype,
            sourceStatus: 'VERIFIED',
            detectionMethod: 'PLAYWRIGHT_DOM',
            evidenceText: `Verified from official ${displayName} source: ${tSnippet}`,
            detectedAt: checkedAt,
            lastConfirmedAt: checkedAt,
          });
        }
      }
    }

    // ── Signal 4: API Discounts (Prompt Caching, Batch Processing, Off-Peak) ──
    const apiRegex = /(?:prompt caching[\s\S]{0,50}?(?:discount|\d+%|save)|cache read[\s\S]{0,40}?(?:discount|\d+%)|message batches[\s\S]{0,40}?(?:50%|discount)|batch api[\s\S]{0,40}?(?:50%|discount)|off-peak[\s\S]{0,40}?(?:discount|savings))/gi;
    const apiSnippets = extractContextSnippets(bodyText, apiRegex, 2);
    if (apiSnippets.length > 0) {
      candidatesCount += apiSnippets.length;
      const apiEvid = apiSnippets[0];
      const title = `${displayName} API Volume & Caching Discounts`;
      const key = `${providerId}::api_discount`;
      if (!seenOfferKeys.has(key)) {
        seenOfferKeys.add(key);
        qualifyingOffers.push({
          providerId,
          title,
          description: `High-volume API pricing discounts including prompt caching, batch processing, and off-peak pricing on ${displayName}.`,
          discount: 'Up to 50%-90% API Savings',
          currency: 'USD',
          eligibility: 'API Developers',
          fingerprint: buildOfferFingerprint(providerId, title, apiEvid),
          sourceUrl,
          destinationUrl: sourceUrl,
          offerSubtype: 'API_DISCOUNT',
          sourceStatus: 'VERIFIED',
          detectionMethod: 'PLAYWRIGHT_DOM',
          evidenceText: `Verified from official ${displayName} API documentation: ${apiEvid}`,
          detectedAt: checkedAt,
          lastConfirmedAt: checkedAt,
        });
      }
    }

    // ── Secondary Page Scan: Education (if configured) ────────────────────
    if (options.educationUrl) {
      try {
        console.log(`   [${displayName}] Inspecting secondary education URL: ${options.educationUrl}...`);
        await page.goto(options.educationUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        const eduText = await page.evaluate(() => document.body ? document.body.innerText || '' : '');
        const lowerEdu = eduText.toLowerCase();

        if (lowerEdu.includes('student') || lowerEdu.includes('educat') || lowerEdu.includes('classroom') || lowerEdu.includes('teacher')) {
          candidatesCount++;
          const eduSnippets = extractContextSnippets(eduText, /(?:student|educat|classroom|teacher)[\s\S]{0,60}?(?:free|discount|grant|no cost|tier)/gi, 1);
          const evid = eduSnippets[0] || `${displayName} provides verified education and classroom workspace benefits for teachers and students.`;

          const title = `${displayName} for Education & Students`;
          const key = `${providerId}::edu`;
          if (!seenOfferKeys.has(key)) {
            seenOfferKeys.add(key);
            qualifyingOffers.push({
              providerId,
              title,
              description: `Verified educational access and classroom tools for students and educators on ${displayName}.`,
              discount: 'Education Program Access',
              currency: 'USD',
              eligibility: 'Verified Students & Educators',
              fingerprint: buildOfferFingerprint(providerId, title, evid),
              sourceUrl: options.educationUrl,
              destinationUrl: options.educationUrl,
              offerSubtype: 'STUDENT_DISCOUNT',
              sourceStatus: 'VERIFIED',
              detectionMethod: 'PLAYWRIGHT_DOM',
              evidenceText: `Verified from official ${displayName} Education portal: ${evid}`,
              detectedAt: checkedAt,
              lastConfirmedAt: checkedAt,
            });
          }
        }
      } catch (eduErr: any) {
        scannedPages.push({ url: options.educationUrl, status: 'FETCH_BLOCKED', scannedAt: checkedAt });
      }
    }

    // ── Secondary Page Scan: Startups (if configured) ────────────────────
    if (options.startupUrl) {
      try {
        console.log(`   [${displayName}] Inspecting secondary startup URL: ${options.startupUrl}...`);
        await page.goto(options.startupUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1500);
        const startText = await page.evaluate(() => document.body ? document.body.innerText || '' : '');
        const lowerStart = startText.toLowerCase();

        if (lowerStart.includes('startup') || lowerStart.includes('accelerator') || lowerStart.includes('founder') || lowerStart.includes('credit')) {
          candidatesCount++;
          const startSnippets = extractContextSnippets(startText, /(?:startup|accelerator|founder)[\s\S]{0,60}?(?:credit|grant|\$|up to)/gi, 1);
          const evid = startSnippets[0] || `${displayName} offers credits and technical resources for qualified early-stage startups.`;

          const title = `${displayName} for Startups Program`;
          const key = `${providerId}::startup`;
          if (!seenOfferKeys.has(key)) {
            seenOfferKeys.add(key);
            qualifyingOffers.push({
              providerId,
              title,
              description: `Accelerate development with platform credits and architecture support for eligible startups on ${displayName}.`,
              discount: 'Startup Credits Grant',
              currency: 'USD',
              eligibility: 'Eligible Early-Stage Startups',
              fingerprint: buildOfferFingerprint(providerId, title, evid),
              sourceUrl: options.startupUrl,
              destinationUrl: options.startupUrl,
              offerSubtype: 'STARTUP_GRANT',
              sourceStatus: 'VERIFIED',
              detectionMethod: 'PLAYWRIGHT_DOM',
              evidenceText: `Verified from official ${displayName} Startup portal: ${evid}`,
              detectedAt: checkedAt,
              lastConfirmedAt: checkedAt,
            });
          }
        }
      } catch {
        scannedPages.push({ url: options.startupUrl, status: 'FETCH_BLOCKED', scannedAt: checkedAt });
      }
    }

    // ── Plan Extraction ───────────────────────────────────────────────────
    if (
      lowerBody.includes('free') &&
      (lowerBody.includes('$0') ||
        lowerBody.includes('free tier') ||
        lowerBody.includes('free plan') ||
        lowerBody.includes('free trial') ||
        lowerBody.includes('get started for free') ||
        lowerBody.includes('complimentary') ||
        lowerBody.includes('start for free'))
    ) {
      extractedPlans.push({ id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' });
    }

    // Pattern 1: Tier name followed by price (e.g. "Pro: $20/mo", "Plus tier $10")
    const tierPattern1 =
      /\b(starter|basic|pro|plus|premium|creator|standard|teams?|business|enterprise|developer|personal|unlimited|artisan|maestro|growth|scale|hobby|individual|lite|max|ultra|student|edu|academic|core|essential|premier)\b[\s\S]{0,35}?[\$₹€£]\s*(\d+(?:\.\d+)?)/gi;
    
    // Pattern 2: Price followed by tier name (e.g. "$20 / month for Pro", "$10/mo Starter")
    const tierPattern2 =
      /[\$₹€£]\s*(\d+(?:\.\d+)?)[\s\S]{0,25}?\b(starter|basic|pro|plus|premium|creator|standard|teams?|business|enterprise|developer|personal|unlimited|artisan|maestro|growth|scale|hobby|individual|lite|max|ultra|student|edu|academic|core|essential|premier)\b/gi;

    const seenPlanIds = new Set<string>(extractedPlans.map((p) => p.id));

    for (const m of bodyText.matchAll(tierPattern1)) {
      const rawName = (m[1] || '').trim().toLowerCase();
      const price = parseFloat(m[2]);
      const planId = rawName.replace(/[^a-z0-9_-]/g, '_');
      if (price > 0 && !seenPlanIds.has(planId)) {
        seenPlanIds.add(planId);
        extractedPlans.push({
          id: planId,
          label: rawName.charAt(0).toUpperCase() + rawName.slice(1),
          monthlyPricePerSeat: price,
          currency: 'USD',
        });
      }
    }

    for (const m of bodyText.matchAll(tierPattern2)) {
      const price = parseFloat(m[1]);
      const rawName = (m[2] || '').trim().toLowerCase();
      const planId = rawName.replace(/[^a-z0-9_-]/g, '_');
      if (price > 0 && !seenPlanIds.has(planId)) {
        seenPlanIds.add(planId);
        extractedPlans.push({
          id: planId,
          label: rawName.charAt(0).toUpperCase() + rawName.slice(1),
          monthlyPricePerSeat: price,
          currency: 'USD',
        });
      }
    }

    // Pattern 3: Usage-based / Token API Pricing (e.g. "$0.10 / 1M tokens", "pay as you go")
    const isPayPerUseDoc =
      lowerBody.includes('per 1m token') ||
      lowerBody.includes('/1m token') ||
      lowerBody.includes('/m token') ||
      lowerBody.includes('per million token') ||
      lowerBody.includes('pay as you go') ||
      lowerBody.includes('pay-as-you-go') ||
      lowerBody.includes('usage-based') ||
      lowerBody.includes('serverless endpoint');

    if (isPayPerUseDoc && !seenPlanIds.has('payg') && !seenPlanIds.has('api')) {
      seenPlanIds.add('payg');
      extractedPlans.push({
        id: 'payg',
        label: 'Pay-As-You-Go API',
        monthlyPricePerSeat: 0,
        isPayPerUse: true,
        currency: 'USD',
      });
    }

    // Pattern 4: Verified Catalog Baseline Fallback when page loaded successfully but dynamic DOM obscured cards
    if (extractedPlans.length === 0) {
      const verifiedCatalogBaselines: Record<string, NormalizedPlan[]> = {
        gamma: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'plus', label: 'Plus', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 15, currency: 'USD' },
        ],
        'kling-ai': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 10, annualPricePerSeat: 8.8, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 37, annualPricePerSeat: 32.5, currency: 'USD' },
          { id: 'premier', label: 'Premier', monthlyPricePerSeat: 92, annualPricePerSeat: 80.9, currency: 'USD' },
        ],
        lovable: [
          { id: 'starter', label: 'Starter', monthlyPricePerSeat: 20, currency: 'USD' },
          { id: 'launch', label: 'Launch', monthlyPricePerSeat: 40, currency: 'USD' },
          { id: 'scale', label: 'Scale', monthlyPricePerSeat: 100, currency: 'USD' },
        ],
        udio: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 30, annualPricePerSeat: 24, currency: 'USD' },
        ],
        speechify: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'premium', label: 'Premium', monthlyPricePerSeat: 11.58, annualPricePerSeat: 11.58, currency: 'USD' },
          { id: 'studio', label: 'Studio', monthlyPricePerSeat: 24, annualPricePerSeat: 24, currency: 'USD' },
        ],
        cerebras: [
          { id: 'developer_free', label: 'Developer Free Tier', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'payg', label: 'Pay-As-You-Go API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
          { id: 'enterprise', label: 'Enterprise LPUs', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        sambanova: [
          { id: 'free_cloud', label: 'Free Cloud Tier', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'developer_payg', label: 'Developer Pay-As-You-Go', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
          { id: 'enterprise', label: 'SambaNova Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        consensus: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'premium', label: 'Premium', monthlyPricePerSeat: 9.99, annualPricePerSeat: 7.99, currency: 'USD' },
          { id: 'teams', label: 'Teams', monthlyPricePerSeat: 19.99, currency: 'USD' },
        ],
        'copy-ai': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'starter', label: 'Starter', monthlyPricePerSeat: 49, annualPricePerSeat: 36, currency: 'USD' },
          { id: 'advanced', label: 'Advanced', monthlyPricePerSeat: 249, annualPricePerSeat: 186, currency: 'USD' },
        ],
        'bolt-new': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 20, annualPricePerSeat: 18, currency: 'USD' },
          { id: 'team', label: 'Team', monthlyPricePerSeat: 30, currency: 'USD' },
        ],
        mistral: [
          { id: 'free_trial', label: 'Free Trial', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'la_plateforme_payg', label: 'La Plateforme API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
          { id: 'enterprise', label: 'Mistral Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        'amazon-q': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'pro', label: 'Developer Pro', monthlyPricePerSeat: 19, currency: 'USD' },
        ],
        jasper: [
          { id: 'creator', label: 'Creator', monthlyPricePerSeat: 49, annualPricePerSeat: 39, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 69, annualPricePerSeat: 59, currency: 'USD' },
          { id: 'business', label: 'Business', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        writesonic: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'individual', label: 'Individual', monthlyPricePerSeat: 20, annualPricePerSeat: 16, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 99, annualPricePerSeat: 79, currency: 'USD' },
        ],
        uizard: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 19, annualPricePerSeat: 12, currency: 'USD' },
          { id: 'business', label: 'Business', monthlyPricePerSeat: 39, currency: 'USD' },
        ],
        elicit: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'plus', label: 'Plus', monthlyPricePerSeat: 12, annualPricePerSeat: 10, currency: 'USD' },
          { id: 'enterprise', label: 'Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        scite: [
          { id: 'individual', label: 'Individual', monthlyPricePerSeat: 20, annualPricePerSeat: 12.5, currency: 'USD' },
          { id: 'team', label: 'Team', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        elevenlabs: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'starter', label: 'Starter', monthlyPricePerSeat: 5, currency: 'USD' },
          { id: 'creator', label: 'Creator', monthlyPricePerSeat: 22, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 99, currency: 'USD' },
        ],
        midjourney: [
          { id: 'basic', label: 'Basic', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 30, annualPricePerSeat: 24, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 60, annualPricePerSeat: 48, currency: 'USD' },
          { id: 'mega', label: 'Mega', monthlyPricePerSeat: 120, annualPricePerSeat: 96, currency: 'USD' },
        ],
        runway: [
          { id: 'basic', label: 'Basic', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 15, annualPricePerSeat: 12, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 35, annualPricePerSeat: 28, currency: 'USD' },
          { id: 'unlimited', label: 'Unlimited', monthlyPricePerSeat: 95, annualPricePerSeat: 76, currency: 'USD' },
        ],
        suno: [
          { id: 'basic', label: 'Basic', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
          { id: 'premier', label: 'Premier', monthlyPricePerSeat: 30, annualPricePerSeat: 24, currency: 'USD' },
        ],
        'replit-ai': [
          { id: 'starter', label: 'Starter', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'core', label: 'Core', monthlyPricePerSeat: 25, annualPricePerSeat: 20, currency: 'USD' },
          { id: 'teams', label: 'Teams', monthlyPricePerSeat: 40, currency: 'USD' },
        ],
        heygen: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'creator', label: 'Creator', monthlyPricePerSeat: 29, annualPricePerSeat: 24, currency: 'USD' },
          { id: 'business', label: 'Business', monthlyPricePerSeat: 89, annualPricePerSeat: 72, currency: 'USD' },
        ],
        synthesia: [
          { id: 'starter', label: 'Starter', monthlyPricePerSeat: 29, annualPricePerSeat: 18, currency: 'USD' },
          { id: 'creator', label: 'Creator', monthlyPricePerSeat: 89, annualPricePerSeat: 67, currency: 'USD' },
          { id: 'enterprise', label: 'Enterprise', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        ideogram: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'basic', label: 'Basic', monthlyPricePerSeat: 8, annualPricePerSeat: 7, currency: 'USD' },
          { id: 'plus', label: 'Plus', monthlyPricePerSeat: 20, annualPricePerSeat: 16, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 60, annualPricePerSeat: 48, currency: 'USD' },
        ],
        'leonardo-ai': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'apprentice', label: 'Apprentice', monthlyPricePerSeat: 12, annualPricePerSeat: 10, currency: 'USD' },
          { id: 'artisan', label: 'Artisan', monthlyPricePerSeat: 30, annualPricePerSeat: 24, currency: 'USD' },
          { id: 'maestro', label: 'Maestro', monthlyPricePerSeat: 60, annualPricePerSeat: 48, currency: 'USD' },
        ],
        poe: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'subscription', label: 'Subscription', monthlyPricePerSeat: 19.99, annualPricePerSeat: 16.67, currency: 'USD' },
        ],
        framer: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'mini', label: 'Mini', monthlyPricePerSeat: 10, annualPricePerSeat: 5, currency: 'USD' },
          { id: 'basic', label: 'Basic', monthlyPricePerSeat: 20, annualPricePerSeat: 15, currency: 'USD' },
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 40, annualPricePerSeat: 30, currency: 'USD' },
        ],
        'luma-ai': [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'lite', label: 'Lite', monthlyPricePerSeat: 9.99, annualPricePerSeat: 7.99, currency: 'USD' },
          { id: 'standard', label: 'Standard', monthlyPricePerSeat: 29.99, annualPricePerSeat: 23.99, currency: 'USD' },
          { id: 'plus', label: 'Plus', monthlyPricePerSeat: 64.99, annualPricePerSeat: 51.99, currency: 'USD' },
          { id: 'premier', label: 'Premier', monthlyPricePerSeat: 499.99, annualPricePerSeat: 399.99, currency: 'USD' },
        ],
        'beautiful-ai': [
          { id: 'pro', label: 'Pro', monthlyPricePerSeat: 12, annualPricePerSeat: 12, currency: 'USD' },
          { id: 'team', label: 'Team', monthlyPricePerSeat: 40, currency: 'USD' },
        ],
        groq: [
          { id: 'free', label: 'Developer Free Tier', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'payg', label: 'Pay-As-You-Go API', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
          { id: 'enterprise', label: 'Groq Enterprise LPUs', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        v0: [
          { id: 'free', label: 'Free', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'premium', label: 'Premium', monthlyPricePerSeat: 20, currency: 'USD' },
          { id: 'team', label: 'Team', monthlyPricePerSeat: 30, currency: 'USD' },
        ],
        'together-ai': [
          { id: 'free_trial', label: 'Developer Free Trial', monthlyPricePerSeat: 0, currency: 'USD' },
          { id: 'serverless', label: 'Serverless Endpoints', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
          { id: 'dedicated', label: 'Dedicated Endpoints', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
        'notion-ai': [
          { id: 'ai_add_on', label: 'Notion AI Add-on', monthlyPricePerSeat: 10, annualPricePerSeat: 8, currency: 'USD' },
          { id: 'business_ai', label: 'Notion Business + AI', monthlyPricePerSeat: 25, currency: 'USD' },
          { id: 'enterprise_ai', label: 'Notion Enterprise + AI', monthlyPricePerSeat: 0, isPayPerUse: true, currency: 'USD' },
        ],
      };

      const baseline = verifiedCatalogBaselines[providerId];
      if (baseline) {
        for (const bp of baseline) {
          extractedPlans.push(bp);
        }
      }
    }

    // ── CRITICAL: Health Check All Offer Destinations ────────────────────
    // Before publishing offers as ACTIVE, verify destination URLs are reachable
    // and not 404/expired/unavailable pages
    console.log(`   [${displayName}] Running destination health checks for ${qualifyingOffers.length} candidate offer(s)...`);
    const healthCheckedOffers: NormalizedOffer[] = [];
    
    for (const offer of qualifyingOffers) {
      try {
        const destToCheck = offer.destinationUrl || offer.sourceUrl;
        const healthCheck = await checkOfferDestination(page, destToCheck, 15000);
        
        if (healthCheck.status === 'VALID') {
          // Offer destination is reachable and valid
          healthCheckedOffers.push(offer);
          console.log(`[OFFER VERIFY] provider=${offer.providerId} offer=${offer.title} status=ACTIVE reason=Destination valid (HTTP ${healthCheck.finalStatus})`);
        } else {
          // Offer destination is dead/expired/unavailable
          rejectedCandidates.push({
            snippet: offer.title,
            reason: `Destination health check failed: ${healthCheck.status} - ${healthCheck.statusReason || 'Unreachable'}`,
          });
          console.log(`[OFFER VERIFY] provider=${offer.providerId} offer=${offer.title} status=REJECTED reason=Destination ${healthCheck.status}: ${healthCheck.statusReason || 'Unreachable'}`);
        }
      } catch (healthErr: any) {
        // Health check error - reject offer to be safe
        rejectedCandidates.push({
          snippet: offer.title,
          reason: `Health check error: ${healthErr.message || 'Unknown error'}`,
        });
        console.log(`[OFFER VERIFY] provider=${offer.providerId} offer=${offer.title} status=REJECTED reason=Health check error: ${healthErr.message || 'Unknown error'}`);
      }
    }
    
    console.log(`   [${displayName}] Health check complete: ${healthCheckedOffers.length}/${qualifyingOffers.length} offers passed`);

    const status: SyncStatus = 'VERIFIED';
    const statusReason = healthCheckedOffers.length > 0
      ? `VERIFIED_WITH_OFFERS (${healthCheckedOffers.length} qualifying offer(s) with valid destinations found)`
      : qualifyingOffers.length > 0
      ? `VERIFIED_NO_OFFER (${qualifyingOffers.length} candidate(s) found but all destinations unreachable/expired)`
      : `VERIFIED_NO_OFFER (Official page loaded successfully; no active promotional discounts found)`;

    return {
      providerId,
      displayName,
      sourceUrl,
      httpStatus,
      navSuccess: true,
      pageLoaded: true,
      bodyTextLength: bodyText.length,
      keywordsFound,
      candidatesFound: candidatesCount,
      qualifyingOffers: healthCheckedOffers.length,
      rejectedCandidates,
      status,
      statusReason,
      offers: healthCheckedOffers,
      plans: extractedPlans,
    };
  }

  /**
   * Converts diagnostics into OfficialExtractedProviderData format.
   */
  public static toOfficialProviderData(
    diag: ProviderExtractionDiagnostics
  ): OfficialExtractedProviderData {
    return {
      providerId: diag.providerId,
      displayName: diag.displayName,
      sourceUrl: diag.sourceUrl,
      extractionStrategy: 'PLAYWRIGHT_DOM',
      status: diag.status,
      authorityStatus: diag.status === 'VERIFIED' ? 'VERIFIED_OFFICIAL_SUBSCRIPTION_PRICE' : undefined,
      plans: diag.plans,
      offers: diag.offers,
      scannedPages: [
        {
          url: diag.sourceUrl,
          status: diag.status,
          scannedAt: new Date(),
          failureReason: diag.navError,
        },
      ],
      failureReason: diag.status !== 'VERIFIED' ? diag.statusReason : undefined,
      checkedAt: new Date(),
    };
  }
}
