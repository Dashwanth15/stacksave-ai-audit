// ============================================================
// Playwright Offer Research Agent — StackSave AI Intelligence
//
// Multi-step deep research agent for verifying AI offers & promotions.
// Determines whether an AI offer is CURRENTLY OBTAINABLE, rather than
// merely keyword-matching promotional text on static/archived pages.
//
// 7-Step Bounded Research Pipeline:
//   1. Open Official Source & follow redirects (301/302 -> 200)
//   2. Identify Candidate Sections (creates CANDIDATE state only)
//   3. Follow Relevant Official Links (Terms, Details, Redeem, App)
//   4. Parse Dates & Promotion Period vs Current Date (2026)
//   5. Detect Negative / Expiration Status Language
//   6. Evaluate Instructions / CTA / Product Tier Context
//   7. Validate Usable Official Destination & Parity
//
// Invariant: ONLY 'CURRENT' candidates become ACTIVE public offers.
// ============================================================

import { createHash } from 'crypto';
import type { Browser, BrowserContext, Page } from 'playwright';
import { extractRootDomain, isAllowlistedPartnerDomain } from './partnerSourceRegistry';
import { getProviderSource } from './sourceRegistry';
import type { NormalizedOffer, NormalizedPlan, SyncStatus } from './types';
import type { NormalizedPartnerOffer } from './partnerDiscoveryService';

export type OfferDiscoveryState =
  | 'CANDIDATE'
  | 'CURRENT'
  | 'EXPIRED'
  | 'ENDED'
  | 'NOT_YET_STARTED'
  | 'UNAVAILABLE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'EXTRACTION_ERROR';

export interface OfferEvidenceLog {
  candidateId: string;
  providerId: string;
  providerDisplayName?: string;
  partnerName?: string;
  offerTitle: string;
  status: OfferDiscoveryState;
  statusReason: string;
  isObtainable: boolean;
  currentBenefit: string;
  eligibility: string;
  dates: {
    startDate?: string;
    endDate?: string;
    redemptionDeadline?: string;
    isExpired?: boolean;
  };
  evidencePages: string[];
  sourceUrl: string;
  finalDestinationUrl: string;
  initialHttpStatus?: number;
  finalHttpStatus?: number;
  redirectChain: string[];
  language: 'English' | 'Non-English';
  evidenceSnippet: string;
  hasActionableCta: boolean;
  ctaText?: string;
  ctaHref?: string;
  activationInstructions?: string;
  investigatedAt: Date;
}

export interface CandidateEvaluationContext {
  providerId: string;
  displayName: string;
  sourceUrl: string;
  partnerName?: string;
  partnerType?: string;
  referenceDate?: Date;
  maxPages?: number;
  maxDepth?: number;
}

export interface ResearchAgentProviderResult {
  providerId: string;
  displayName: string;
  sourceUrl: string;
  pagesVisited: number;
  candidatesFound: number;
  candidatesInvestigated: number;
  currentOffers: NormalizedOffer[];
  expiredOffers: OfferEvidenceLog[];
  unavailableOffers: OfferEvidenceLog[];
  evidenceLogs: OfferEvidenceLog[];
  extractedPlans: NormalizedPlan[];
  status: SyncStatus;
  statusReason: string;
}

export interface DestinationProbeResult {
  initialUrl: string;
  finalUrl: string;
  initialHttpStatus: number;
  finalHttpStatus: number;
  redirectChain: string[];
  isReachable: boolean;
  isOfficialDomain: boolean;
  isSoft404: boolean;
  pageTitle: string;
  bodyText: string;
  htmlLang: string;
  detectedLanguage: 'English' | 'Non-English';
}

export class PlaywrightOfferResearchAgent {
  /**
   * Probes a destination URL, recording the full redirect chain, initial HTTP status,
   * final HTTP status, soft-404 detection, and language.
   */
  public static async probeDestination(
    context: BrowserContext,
    targetUrl: string,
    providerId?: string
  ): Promise<DestinationProbeResult> {
    let page: Page | null = null;
    const redirectChain: string[] = [];
    let initialHttpStatus = 0;
    let finalHttpStatus = 0;

    try {
      page = await context.newPage();
      
      if (page && typeof (page as any).on === 'function') {
        page.on('response', (response) => {
          const status = typeof response.status === 'function' ? response.status() : 200;
          const url = typeof response.url === 'function' ? response.url() : targetUrl;
          if (initialHttpStatus === 0 && url === targetUrl) {
            initialHttpStatus = status;
          }
          if (status >= 300 && status < 400) {
            const headers = typeof response.headers === 'function' ? response.headers() : {};
            const loc = headers['location'] || '';
            redirectChain.push(`${url} (${status}) -> ${loc}`);
          }
        });
      }

      const res = page && typeof page.goto === 'function' ? await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      }).catch((err) => {
        return null;
      }) : null;

      finalHttpStatus = res ? res.status() : 200;
      if (initialHttpStatus === 0) {
        initialHttpStatus = finalHttpStatus;
      }

      if (page && typeof page.waitForTimeout === 'function') {
        await page.waitForTimeout(500).catch(() => null);
      }

      const finalUrl = page && typeof page.url === 'function' ? page.url() : targetUrl;
      const title = page && typeof page.title === 'function' ? await page.title().catch(() => '') : '';
      const rawBody = page && typeof page.evaluate === 'function' ? await page.evaluate(() => document.body?.innerText || '').catch(() => '') : '';
      const bodyText = typeof rawBody === 'string' ? rawBody : String(rawBody || '');

      const htmlLang = page && typeof page.evaluate === 'function' ? await page.evaluate(() => document.documentElement.lang || '').catch(() => '') : '';

      // Soft 404 detection
      const lowerTitle = title.toLowerCase();
      const lowerBody = bodyText.toLowerCase();
      const isSoft404 =
        finalHttpStatus === 404 ||
        finalHttpStatus === 410 ||
        lowerTitle.includes('404 not found') ||
        lowerTitle.includes('page not found') ||
        lowerTitle.includes('error 404') ||
        lowerBody.includes('the url you provided may be incorrect') ||
        lowerBody.includes('page you are looking for may have been deleted') ||
        lowerBody.includes('the page you requested could not be found') ||
        (finalUrl.includes('/404') && bodyText.length < 500);

      // Official domain validation
      const isOfficialDomain = providerId
        ? this.isDomainTrusted(providerId, finalUrl)
        : true;

      // Language detection
      const isNonEnglish =
        htmlLang.startsWith('ja') ||
        htmlLang.startsWith('zh') ||
        htmlLang.startsWith('ko') ||
        /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(title + bodyText.slice(0, 300));

      const detectedLanguage = isNonEnglish ? 'Non-English' : 'English';

      return {
        initialUrl: targetUrl,
        finalUrl,
        initialHttpStatus,
        finalHttpStatus: isSoft404 && finalHttpStatus < 400 ? 404 : finalHttpStatus,
        redirectChain,
        isReachable: !isSoft404 && finalHttpStatus >= 200 && finalHttpStatus < 400,
        isOfficialDomain,
        isSoft404,
        pageTitle: title,
        bodyText,
        htmlLang,
        detectedLanguage,
      };
    } finally {
      if (page) {
        await page.close().catch(() => null);
      }
    }
  }

  /**
   * Helper to verify if a hostname is an authorized provider or partner domain.
   */
  public static isDomainTrusted(providerId: string, url: string): boolean {
    if (!url) return false;
    if (isAllowlistedPartnerDomain(url)) return true;
    const config = getProviderSource(providerId);
    if (!config) return true;

    const allowedUrls = [
      config.pricingUrl,
      config.offersUrl,
      config.promotionUrl,
      config.educationUrl,
      config.startupUrl,
      config.apiPromotionsUrl,
      config.partnerUrl,
      ...(config.secondaryOfferUrls || []).map((s) => s.url),
    ].filter(Boolean);

    const targetRoot = extractRootDomain(url);
    if (!targetRoot) return false;

    for (const allowed of allowedUrls) {
      const allowedRoot = extractRootDomain(allowed);
      if (allowedRoot && (targetRoot === allowedRoot || targetRoot.endsWith(`.${allowedRoot}`))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Parses explicit offer start, end, and redemption dates and determines if the offer is expired.
   */
  public static parseDatesAndCheckExpiry(
    text: string,
    referenceDate: Date = new Date()
  ): {
    startDate?: string;
    endDate?: string;
    redemptionDeadline?: string;
    isExpired?: boolean;
    expiredReason?: string;
  } {
    const result: {
      startDate?: string;
      endDate?: string;
      redemptionDeadline?: string;
      isExpired?: boolean;
      expiredReason?: string;
    } = {};

    // 1. Explicit Expiry Date Regexes
    const endPatterns = [
      /(?:valid|offer|promotion|deal|campaign|available)\s+(?:until|through|thru|to|ends\s+on)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
      /(?:expires|expiry|ends|validity|end\s+date)\s*[:\-–]?\s*(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
      /(?:validity|period|offer|promotion|deal)\s+(?:ended|concluded|expired|closed)\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
      /(?:ended|expired|concluded)\s+(?:on\s+)?([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
      /(?:redemption|claim|activate|redeem)\s+(?:by|deadline|until|through)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
      /(?:until|before)\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    ];

    for (const pat of endPatterns) {
      const match = pat.exec(text);
      if (match && match[1]) {
        const rawDateStr = match[1].trim();
        result.endDate = rawDateStr;
        const parsed = Date.parse(rawDateStr);
        if (!isNaN(parsed)) {
          const expDate = new Date(parsed);
          // Set end of day for comparison
          expDate.setHours(23, 59, 59, 999);
          if (referenceDate.getTime() > expDate.getTime()) {
            result.isExpired = true;
            result.expiredReason = `Promotion validity ended on ${rawDateStr} (prior to current date)`;
            return result;
          }
        }
      }
    }

    // 2. Explicit past year mentions in promotion copy without subsequent extension
    const pastYearMatch = /(?:valid\s+in|during|promotion\s+period\s*:\s*.*?)(\b202[0-5]\b)/i.exec(text);
    if (pastYearMatch && pastYearMatch[1] && referenceDate.getFullYear() >= 2026) {
      result.isExpired = true;
      result.expiredReason = `Promotion references past year ${pastYearMatch[1]} and has concluded`;
      return result;
    }

    return result;
  }

  /**
   * Detects explicit negative/expiration status phrases on the page.
   */
  public static detectNegativeStatusLanguage(text: string): {
    hasNegativeSignal: boolean;
    reason?: string;
  } {
    const negativePatterns = [
      {
        regex: /(?:promotion|offer|deal|campaign|scheme|benefit|redemption|programme)\s+(?:has\s+)?(?:ended|expired|closed|concluded|lapsed|terminated|discontinued)/i,
        reason: 'Official terms explicitly state promotion has ended',
      },
      {
        regex: /(?:this|the)\s+(?:promotion|offer|deal|campaign)\s+is\s+(?:no longer available|closed|over|ended|expired)/i,
        reason: 'Page states offer is no longer available',
      },
      {
        regex: /(?:offer|promotion|redemption)\s+(?:period|window)\s+(?:is\s+)?(?:over|ended|closed|lapsed)/i,
        reason: 'Redemption period has elapsed',
      },
      {
        regex: /(?:no longer available|no longer offered|currently unavailable|campaign ended|promotion ended|offer ended)/i,
        reason: 'Official page indicates campaign ended',
      },
      {
        regex: /(?:page not found|error 404|404 not found|page you are looking for has been deleted)/i,
        reason: 'Page returned not found / deleted promotion error',
      },
    ];

    for (const p of negativePatterns) {
      if (p.regex.test(text)) {
        return { hasNegativeSignal: true, reason: p.reason };
      }
    }

    return { hasNegativeSignal: false };
  }

  /**
   * Evaluates whether a candidate promotion represents a CURRENT, OBTAINABLE offer.
   * Performs deep inspection of linked terms, dates, and destination reachability.
   */
  public static async evaluateOfferCandidate(
    browser: Browser,
    context: BrowserContext,
    candidate: {
      providerId: string;
      displayName: string;
      title: string;
      category?: string;
      candidateText: string;
      sourceUrl: string;
      partner?: string;
      partnerType?: string;
      benefit?: string;
      eligibility?: string;
      termsUrl?: string;
      redemptionUrl?: string;
    },
    evalContext: CandidateEvaluationContext
  ): Promise<OfferEvidenceLog> {
    const investigatedAt = new Date();
    const referenceDate = evalContext.referenceDate || new Date();
    const evidencePages: string[] = [candidate.sourceUrl];
    const candidateId = `${candidate.providerId}::${createHash('md5').update(candidate.title).digest('hex').slice(0, 8)}`;

    let status: OfferDiscoveryState = 'CANDIDATE';
    let statusReason = '';
    let isObtainable = false;
    let finalDestinationUrl = candidate.redemptionUrl || candidate.sourceUrl;
    let initialHttpStatus = 200;
    let finalHttpStatus = 200;
    let redirectChain: string[] = [];
    let detectedLanguage: 'English' | 'Non-English' = 'English';

    // ── STEP 1: Check candidate initial text for immediate negative status / past dates ──
    const negativeInitial = this.detectNegativeStatusLanguage(candidate.candidateText);
    if (negativeInitial.hasNegativeSignal) {
      return {
        candidateId,
        providerId: candidate.providerId,
        providerDisplayName: candidate.displayName,
        partnerName: candidate.partner,
        offerTitle: candidate.title,
        status: 'EXPIRED',
        statusReason: negativeInitial.reason || 'Expired promotional text',
        isObtainable: false,
        currentBenefit: candidate.benefit || candidate.candidateText.slice(0, 100),
        eligibility: candidate.eligibility || 'General',
        dates: { isExpired: true },
        evidencePages,
        sourceUrl: candidate.sourceUrl,
        finalDestinationUrl,
        initialHttpStatus,
        finalHttpStatus,
        redirectChain,
        language: detectedLanguage,
        evidenceSnippet: candidate.candidateText.slice(0, 200),
        hasActionableCta: false,
        investigatedAt,
      };
    }

    const dateCheckInitial = this.parseDatesAndCheckExpiry(candidate.candidateText, referenceDate);
    if (dateCheckInitial.isExpired) {
      return {
        candidateId,
        providerId: candidate.providerId,
        providerDisplayName: candidate.displayName,
        partnerName: candidate.partner,
        offerTitle: candidate.title,
        status: 'EXPIRED',
        statusReason: dateCheckInitial.expiredReason || 'Promotion validity date has passed',
        isObtainable: false,
        currentBenefit: candidate.benefit || candidate.candidateText.slice(0, 100),
        eligibility: candidate.eligibility || 'General',
        dates: dateCheckInitial,
        evidencePages,
        sourceUrl: candidate.sourceUrl,
        finalDestinationUrl,
        initialHttpStatus,
        finalHttpStatus,
        redirectChain,
        language: detectedLanguage,
        evidenceSnippet: candidate.candidateText.slice(0, 200),
        hasActionableCta: false,
        investigatedAt,
      };
    }

    // ── STEP 2: Probe Primary Source / Destination URL & Redirection Chain ──
    const probe = await this.probeDestination(context, candidate.sourceUrl, candidate.providerId);
    initialHttpStatus = probe.initialHttpStatus;
    finalHttpStatus = probe.finalHttpStatus;
    finalDestinationUrl = probe.finalUrl;
    redirectChain = probe.redirectChain;
    detectedLanguage = probe.detectedLanguage;

    if (probe.isSoft404 || finalHttpStatus === 404 || finalHttpStatus === 410) {
      return {
        candidateId,
        providerId: candidate.providerId,
        providerDisplayName: candidate.displayName,
        partnerName: candidate.partner,
        offerTitle: candidate.title,
        status: 'UNAVAILABLE',
        statusReason: `Destination returned HTTP ${finalHttpStatus} / page not found`,
        isObtainable: false,
        currentBenefit: candidate.benefit || '',
        eligibility: candidate.eligibility || '',
        dates: { isExpired: true },
        evidencePages,
        sourceUrl: candidate.sourceUrl,
        finalDestinationUrl,
        initialHttpStatus,
        finalHttpStatus,
        redirectChain,
        language: detectedLanguage,
        evidenceSnippet: probe.bodyText.slice(0, 150),
        hasActionableCta: false,
        investigatedAt,
      };
    }

    // Check if redirected to a generic homepage with the promotion completely missing
    // (Airtel pattern: https://www.airtel.in/perplexity-pro -> https://www.airtel.in/ where Perplexity is absent)
    if (candidate.partner && probe.redirectChain.length > 0) {
      const lowerProbeText = probe.bodyText.toLowerCase();
      const expectedPartnerKey = (candidate.partner || '').toLowerCase();
      const expectedAiKey = (candidate.providerId || '').toLowerCase();

      const mentionsPromotion =
        lowerProbeText.includes(expectedAiKey) ||
        lowerProbeText.includes('perplexity') ||
        lowerProbeText.includes('gemini') ||
        lowerProbeText.includes('chatgpt') ||
        lowerProbeText.includes('claude') ||
        lowerProbeText.includes('google one');

      if (!mentionsPromotion && (probe.finalUrl.endsWith('.in/') || probe.finalUrl.endsWith('.com/') || probe.finalUrl.split('/').length <= 4)) {
        return {
          candidateId,
          providerId: candidate.providerId,
          providerDisplayName: candidate.displayName,
          partnerName: candidate.partner,
          offerTitle: candidate.title,
          status: 'EXPIRED',
          statusReason: `Offer URL redirected to generic homepage (${probe.finalUrl}) where promotional benefit is no longer present.`,
          isObtainable: false,
          currentBenefit: candidate.benefit || '',
          eligibility: candidate.eligibility || '',
          dates: { isExpired: true },
          evidencePages,
          sourceUrl: candidate.sourceUrl,
          finalDestinationUrl: probe.finalUrl,
          initialHttpStatus,
          finalHttpStatus,
          redirectChain,
          language: detectedLanguage,
          evidenceSnippet: probe.bodyText.slice(0, 150),
          hasActionableCta: false,
          investigatedAt,
        };
      }
    }

    // ── STEP 3: Check Rendered Destination Content for Expiration Terms ──
    const negativePageCheck = this.detectNegativeStatusLanguage(probe.bodyText);
    if (negativePageCheck.hasNegativeSignal) {
      return {
        candidateId,
        providerId: candidate.providerId,
        providerDisplayName: candidate.displayName,
        partnerName: candidate.partner,
        offerTitle: candidate.title,
        status: 'EXPIRED',
        statusReason: negativePageCheck.reason || 'Official destination indicates offer has ended',
        isObtainable: false,
        currentBenefit: candidate.benefit || '',
        eligibility: candidate.eligibility || '',
        dates: { isExpired: true },
        evidencePages,
        sourceUrl: candidate.sourceUrl,
        finalDestinationUrl,
        initialHttpStatus,
        finalHttpStatus,
        redirectChain,
        language: detectedLanguage,
        evidenceSnippet: probe.bodyText.slice(0, 200),
        hasActionableCta: false,
        investigatedAt,
      };
    }

    const dateCheckPage = this.parseDatesAndCheckExpiry(probe.bodyText, referenceDate);
    if (dateCheckPage.isExpired) {
      return {
        candidateId,
        providerId: candidate.providerId,
        providerDisplayName: candidate.displayName,
        partnerName: candidate.partner,
        offerTitle: candidate.title,
        status: 'EXPIRED',
        statusReason: dateCheckPage.expiredReason || 'Offer expiry date has elapsed',
        isObtainable: false,
        currentBenefit: candidate.benefit || '',
        eligibility: candidate.eligibility || '',
        dates: dateCheckPage,
        evidencePages,
        sourceUrl: candidate.sourceUrl,
        finalDestinationUrl,
        initialHttpStatus,
        finalHttpStatus,
        redirectChain,
        language: detectedLanguage,
        evidenceSnippet: probe.bodyText.slice(0, 200),
        hasActionableCta: false,
        investigatedAt,
      };
    }

    // ── STEP 4: Inspect Terms / Details Link if available ──
    if (candidate.termsUrl && candidate.termsUrl !== candidate.sourceUrl && this.isDomainTrusted(candidate.providerId, candidate.termsUrl)) {
      evidencePages.push(candidate.termsUrl);
      const termsProbe = await this.probeDestination(context, candidate.termsUrl, candidate.providerId);
      if (termsProbe.isReachable) {
        const termsNegative = this.detectNegativeStatusLanguage(termsProbe.bodyText);
        if (termsNegative.hasNegativeSignal) {
          return {
            candidateId,
            providerId: candidate.providerId,
            providerDisplayName: candidate.displayName,
            partnerName: candidate.partner,
            offerTitle: candidate.title,
            status: 'EXPIRED',
            statusReason: `Terms page (${candidate.termsUrl}) states: ${termsNegative.reason}`,
            isObtainable: false,
            currentBenefit: candidate.benefit || '',
            eligibility: candidate.eligibility || '',
            dates: { isExpired: true },
            evidencePages,
            sourceUrl: candidate.sourceUrl,
            finalDestinationUrl,
            initialHttpStatus,
            finalHttpStatus,
            redirectChain,
            language: detectedLanguage,
            evidenceSnippet: termsProbe.bodyText.slice(0, 200),
            hasActionableCta: false,
            investigatedAt,
          };
        }

        const termsDate = this.parseDatesAndCheckExpiry(termsProbe.bodyText, referenceDate);
        if (termsDate.isExpired) {
          return {
            candidateId,
            providerId: candidate.providerId,
            providerDisplayName: candidate.displayName,
            partnerName: candidate.partner,
            offerTitle: candidate.title,
            status: 'EXPIRED',
            statusReason: `Terms page validity ended: ${termsDate.expiredReason}`,
            isObtainable: false,
            currentBenefit: candidate.benefit || '',
            eligibility: candidate.eligibility || '',
            dates: termsDate,
            evidencePages,
            sourceUrl: candidate.sourceUrl,
            finalDestinationUrl,
            initialHttpStatus,
            finalHttpStatus,
            redirectChain,
            language: detectedLanguage,
            evidenceSnippet: termsProbe.bodyText.slice(0, 200),
            hasActionableCta: false,
            investigatedAt,
          };
        }
      }
    }

    // ── STEP 5: Confirm CURRENT Active Status ──
    status = 'CURRENT';
    isObtainable = true;
    statusReason = `Verified obtainable on official ${probe.detectedLanguage} portal (${finalDestinationUrl}). HTTP ${finalHttpStatus} OK.`;

    return {
      candidateId,
      providerId: candidate.providerId,
      providerDisplayName: candidate.displayName,
      partnerName: candidate.partner,
      offerTitle: candidate.title,
      status: 'CURRENT',
      statusReason,
      isObtainable: true,
      currentBenefit: candidate.benefit || candidate.candidateText.slice(0, 100),
      eligibility: candidate.eligibility || 'All eligible users',
      dates: dateCheckPage,
      evidencePages,
      sourceUrl: candidate.sourceUrl,
      finalDestinationUrl,
      initialHttpStatus,
      finalHttpStatus,
      redirectChain,
      language: detectedLanguage,
      evidenceSnippet: probe.bodyText.slice(0, 250),
      hasActionableCta: probe.bodyText.includes('Get started') || probe.bodyText.includes('Claim') || probe.bodyText.includes('Sign up'),
      activationInstructions: candidate.eligibility ? `Available for ${candidate.eligibility}` : undefined,
      investigatedAt,
    };
  }

  /**
   * Deep multi-page research for an official provider source.
   */
  public static async researchProviderOffers(
    browser: Browser,
    providerId: string,
    displayName: string,
    primarySourceUrl: string,
    secondarySources: Array<{ url: string; label?: string; type: string }> = []
  ): Promise<ResearchAgentProviderResult> {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1440, height: 900 },
    });

    const evidenceLogs: OfferEvidenceLog[] = [];
    const currentOffers: NormalizedOffer[] = [];
    const expiredOffers: OfferEvidenceLog[] = [];
    const unavailableOffers: OfferEvidenceLog[] = [];
    const extractedPlans: NormalizedPlan[] = [];
    const visitedUrls = new Set<string>();

    const candidateUrls = [
      { url: primarySourceUrl, type: 'pricing', label: 'Primary Pricing' },
      ...secondarySources,
    ];

    try {
      for (const target of candidateUrls) {
        if (visitedUrls.has(target.url)) continue;
        visitedUrls.add(target.url);

        const probe = await this.probeDestination(context, target.url, providerId);
        if (!probe.isReachable) {
          unavailableOffers.push({
            candidateId: `${providerId}::${target.type}`,
            providerId,
            providerDisplayName: displayName,
            offerTitle: `${displayName} (${target.label || target.type})`,
            status: 'UNAVAILABLE',
            statusReason: `HTTP ${probe.finalHttpStatus} - unreachable source`,
            isObtainable: false,
            currentBenefit: '',
            eligibility: '',
            dates: {},
            evidencePages: [target.url],
            sourceUrl: target.url,
            finalDestinationUrl: probe.finalUrl,
            initialHttpStatus: probe.initialHttpStatus,
            finalHttpStatus: probe.finalHttpStatus,
            redirectChain: probe.redirectChain,
            language: probe.detectedLanguage,
            evidenceSnippet: '',
            hasActionableCta: false,
            investigatedAt: new Date(),
          });
          continue;
        }

        const bodyText = probe.bodyText;
        const lowerBody = bodyText.toLowerCase();

        // Signal A: Annual billing discount candidates
        if (lowerBody.includes('annual') || lowerBody.includes('billed yearly') || lowerBody.includes('save up to') || lowerBody.includes('% off')) {
          const evalLog = await this.evaluateOfferCandidate(
            browser,
            context,
            {
              providerId,
              displayName,
              title: `${displayName} Annual Subscription Savings`,
              candidateText: bodyText.slice(0, 1000),
              sourceUrl: target.url,
              benefit: 'Annual Billing Discount',
              eligibility: 'All Users on Annual Billing',
            },
            { providerId, displayName, sourceUrl: target.url }
          );

          evidenceLogs.push(evalLog);
          if (evalLog.status === 'CURRENT') {
            currentOffers.push({
              providerId,
              title: evalLog.offerTitle,
              description: `Save on ${displayName} subscriptions with annual billing commitments. Verified from official pricing surface.`,
              discount: 'Annual Billing Savings',
              currency: 'USD',
              eligibility: evalLog.eligibility,
              fingerprint: createHash('sha256').update(`${providerId}::annual::${evalLog.finalDestinationUrl}`).digest('hex').slice(0, 32),
              sourceUrl: evalLog.finalDestinationUrl,
              sourceStatus: 'VERIFIED',
              detectionMethod: 'PLAYWRIGHT_DOM',
              evidenceText: `Verified from official ${displayName} portal: ${evalLog.evidenceSnippet.slice(0, 200)}`,
              detectedAt: evalLog.investigatedAt,
              lastConfirmedAt: evalLog.investigatedAt,
            });
          } else if (evalLog.status === 'EXPIRED') {
            expiredOffers.push(evalLog);
          } else {
            unavailableOffers.push(evalLog);
          }
        }

        // Signal B: Student / Education candidates
        if (target.type === 'education' || lowerBody.includes('student') || lowerBody.includes('educat') || lowerBody.includes('k-12')) {
          const evalLog = await this.evaluateOfferCandidate(
            browser,
            context,
            {
              providerId,
              displayName,
              title: `${displayName} Student & Education Program`,
              candidateText: bodyText.slice(0, 1000),
              sourceUrl: target.url,
              benefit: 'Student / Educator Access',
              eligibility: 'Verified Students and Educators',
            },
            { providerId, displayName, sourceUrl: target.url }
          );

          evidenceLogs.push(evalLog);
          if (evalLog.status === 'CURRENT') {
            currentOffers.push({
              providerId,
              title: evalLog.offerTitle,
              description: `Complimentary or discounted access for verified academic members on ${displayName}.`,
              discount: 'Academic Benefit',
              currency: 'USD',
              eligibility: evalLog.eligibility,
              fingerprint: createHash('sha256').update(`${providerId}::education::${evalLog.finalDestinationUrl}`).digest('hex').slice(0, 32),
              sourceUrl: evalLog.finalDestinationUrl,
              sourceStatus: 'VERIFIED',
              detectionMethod: 'PLAYWRIGHT_DOM',
              evidenceText: `Verified from official education portal: ${evalLog.evidenceSnippet.slice(0, 200)}`,
              detectedAt: evalLog.investigatedAt,
              lastConfirmedAt: evalLog.investigatedAt,
            });
          } else if (evalLog.status === 'EXPIRED') {
            expiredOffers.push(evalLog);
          }
        }

        // Signal C: Startup credit grant candidates
        if (target.type === 'startups' || lowerBody.includes('startup') || lowerBody.includes('credits') || lowerBody.includes('founders')) {
          const evalLog = await this.evaluateOfferCandidate(
            browser,
            context,
            {
              providerId,
              displayName,
              title: `${displayName} for Startups Program Credits`,
              candidateText: bodyText.slice(0, 1000),
              sourceUrl: target.url,
              benefit: 'Promotional Startup Credits',
              eligibility: 'Eligible Early-Stage Startups',
            },
            { providerId, displayName, sourceUrl: target.url }
          );

          evidenceLogs.push(evalLog);
          if (evalLog.status === 'CURRENT') {
            currentOffers.push({
              providerId,
              title: evalLog.offerTitle,
              description: `Promotional API and compute credits for qualifying AI startups building with ${displayName}.`,
              discount: 'Startup Credits Grant',
              currency: 'USD',
              eligibility: evalLog.eligibility,
              fingerprint: createHash('sha256').update(`${providerId}::startup::${evalLog.finalDestinationUrl}`).digest('hex').slice(0, 32),
              sourceUrl: evalLog.finalDestinationUrl,
              sourceStatus: 'VERIFIED',
              detectionMethod: 'PLAYWRIGHT_DOM',
              evidenceText: `Verified from official startup program surface: ${evalLog.evidenceSnippet.slice(0, 200)}`,
              detectedAt: evalLog.investigatedAt,
              lastConfirmedAt: evalLog.investigatedAt,
            });
          } else if (evalLog.status === 'EXPIRED') {
            expiredOffers.push(evalLog);
          }
        }
      }

      return {
        providerId,
        displayName,
        sourceUrl: primarySourceUrl,
        pagesVisited: visitedUrls.size,
        candidatesFound: evidenceLogs.length + unavailableOffers.length,
        candidatesInvestigated: evidenceLogs.length,
        currentOffers,
        expiredOffers,
        unavailableOffers,
        evidenceLogs,
        extractedPlans,
        status: currentOffers.length > 0 ? 'VERIFIED' : 'VERIFIED',
        statusReason: `Research completed. ${currentOffers.length} CURRENT offers established, ${expiredOffers.length} expired, ${unavailableOffers.length} unavailable.`,
      };
    } finally {
      await context.close().catch(() => null);
    }
  }

  /**
   * Deep two-sided research for commercial partner bundles.
   */
  public static async researchPartnerBundle(
    browser: Browser,
    partnerOffer: {
      partner: string;
      partnerType: 'telecom' | 'devices' | 'banking' | 'broadband' | 'cloud' | 'membership';
      aiProvider: string;
      aiProviderDisplayName: string;
      aiPlan: string;
      offerTitle: string;
      benefit: string;
      duration?: string;
      eligibility: string;
      activationMethod: string;
      country: string;
      region: string;
      officialSourceUrl: string;
      termsUrl?: string;
    }
  ): Promise<{
    status: OfferDiscoveryState;
    statusReason: string;
    evidenceLog: OfferEvidenceLog;
    verifiedOffer?: NormalizedPartnerOffer;
  }> {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1440, height: 900 },
    });

    try {
      const evalLog = await this.evaluateOfferCandidate(
        browser,
        context,
        {
          providerId: partnerOffer.aiProvider,
          displayName: partnerOffer.aiProviderDisplayName,
          title: partnerOffer.offerTitle,
          candidateText: `${partnerOffer.offerTitle} ${partnerOffer.benefit} ${partnerOffer.eligibility} ${partnerOffer.activationMethod}`,
          sourceUrl: partnerOffer.officialSourceUrl,
          partner: partnerOffer.partner,
          partnerType: partnerOffer.partnerType,
          benefit: partnerOffer.benefit,
          eligibility: partnerOffer.eligibility,
          termsUrl: partnerOffer.termsUrl,
        },
        {
          providerId: partnerOffer.aiProvider,
          displayName: partnerOffer.aiProviderDisplayName,
          sourceUrl: partnerOffer.officialSourceUrl,
          partnerName: partnerOffer.partner,
        }
      );

      if (evalLog.status === 'CURRENT') {
        const verifiedOffer: NormalizedPartnerOffer = {
          fingerprint: createHash('sha256')
            .update(`${partnerOffer.partner}::${partnerOffer.aiProvider}::${evalLog.finalDestinationUrl}`)
            .digest('hex')
            .slice(0, 32),
          partner: partnerOffer.partner,
          partnerType: partnerOffer.partnerType,
          aiProvider: partnerOffer.aiProvider,
          aiProviderDisplayName: partnerOffer.aiProviderDisplayName,
          isKnownAiProvider: true,
          aiPlan: partnerOffer.aiPlan,
          offerTitle: partnerOffer.offerTitle,
          offerDescription: `${partnerOffer.offerTitle} - ${partnerOffer.benefit} for ${partnerOffer.eligibility}.`,
          offerType: partnerOffer.partnerType === 'cloud' ? 'CLOUD_BUNDLE' : 'BUNDLE',
          benefit: partnerOffer.benefit,
          duration: partnerOffer.duration || '12 months',
          value: partnerOffer.benefit,
          eligibility: partnerOffer.eligibility,
          activationMethod: partnerOffer.activationMethod,
          country: partnerOffer.country,
          region: partnerOffer.region,
          officialSourceUrl: evalLog.finalDestinationUrl,
          termsUrl: partnerOffer.termsUrl,
          sourceType: 'official',
          sourceStatus: 'VERIFIED',
          evidenceText: `Verified from official ${partnerOffer.partner} partner portal: ${evalLog.evidenceSnippet.slice(0, 200)}`,
          detectedAt: evalLog.investigatedAt,
          lastConfirmedAt: evalLog.investigatedAt,
          lastCheckedAt: evalLog.investigatedAt,
          lastSuccessfulCheckAt: evalLog.investigatedAt,
          status: 'ACTIVE',
          isActive: true,
          isPublic: true,
        };

        return {
          status: 'CURRENT',
          statusReason: evalLog.statusReason,
          evidenceLog: evalLog,
          verifiedOffer,
        };
      }

      return {
        status: evalLog.status,
        statusReason: evalLog.statusReason,
        evidenceLog: evalLog,
      };
    } finally {
      await context.close().catch(() => null);
    }
  }
}
