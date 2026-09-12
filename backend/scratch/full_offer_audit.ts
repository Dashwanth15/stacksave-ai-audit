import { chromium } from 'playwright';
import { isAllowlistedPartnerDomain, extractRootDomain, resolveCanonicalOfferUrl } from '../src/pricing/partnerSourceRegistry';
import { getProviderSource } from '../src/pricing/sourceRegistry';
import { isRegisteredOfficialSource } from '../src/pricing/offerTrust';

interface AuditRecord {
  index: number;
  offerId: string;
  providerId: string;
  providerName: string;
  title: string;
  category: string;
  offerType: string;
  partner?: string;
  apiSourceUrl: string;
  frontendHref: string;
  hrefMatch: boolean;
  
  // Probe results
  initialStatus: number;
  finalStatus: number;
  finalUrl: string;
  redirectChain: string[];
  finalHostname: string;
  isOfficialDomain: boolean;
  htmlLang: string;
  detectedLanguage: string;
  isRelevant: boolean;
  relevanceNotes: string;
  classification: string;
  
  // English equivalent investigation
  hasEnglishEquivalent?: boolean;
  englishEquivalentUrl?: string;
  englishDiscoveryMethod?: string;
}

// Helper to detect language from text and HTML lang tag
function detectLanguage(htmlLang: string, pageText: string, title: string): { lang: string; langCode: string } {
  const normLang = (htmlLang || '').toLowerCase().trim();
  
  // Japanese characters detection (Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF)
  const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(pageText);
  // Chinese Hanzi detection (\u4E00-\u9FFF) without Japanese kana
  const hasChineseHanzi = /[\u4E00-\u9FFF]/.test(pageText);
  // Korean Hangul detection (\uAC00-\uD7AF, \u1100-\u11FF)
  const hasKoreanHangul = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(pageText);

  if (hasJapaneseKana || normLang.startsWith('ja')) {
    return { lang: 'Japanese', langCode: 'ja' };
  }
  if (hasKoreanHangul || normLang.startsWith('ko')) {
    return { lang: 'Korean', langCode: 'ko' };
  }
  if ((hasChineseHanzi && !hasJapaneseKana) || normLang.startsWith('zh')) {
    return { lang: 'Chinese', langCode: 'zh' };
  }
  if (normLang.startsWith('de') || (pageText.includes('Datenschutz') && pageText.includes('Impressum'))) {
    return { lang: 'German', langCode: 'de' };
  }
  if (normLang.startsWith('fr') || pageText.includes('Tous droits réservés')) {
    return { lang: 'French', langCode: 'fr' };
  }
  if (normLang.startsWith('es') || pageText.includes('Todos los derechos reservados')) {
    return { lang: 'Spanish', langCode: 'es' };
  }
  
  return { lang: 'English', langCode: 'en' };
}

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('STACKSAVE — COMPLETE OFFER URL + ENGLISH LANGUAGE AUDIT');
  console.log('================================================================\n');

  // Step 1: Fetch all active offers from live API
  console.log('Fetching active offers from http://localhost:5000/api/intelligence/offers...');
  let rawOffers: any[] = [];
  try {
    const apiRes = await fetch('http://localhost:5000/api/intelligence/offers');
    const json = await apiRes.json();
    rawOffers = json.data.offers || [];
  } catch (err: any) {
    console.error('Failed to fetch from live API, trying direct route execution...', err.message);
    process.exit(1);
  }

  console.log(`TOTAL ACTIVE OFFERS RETRIEVED: ${rawOffers.length}\n`);

  // Launch Playwright for headless browser audits
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
  });

  const auditRecords: AuditRecord[] = [];

  for (let i = 0; i < rawOffers.length; i++) {
    const raw = rawOffers[i];
    const apiSourceUrl = raw.sourceUrl || '';
    const frontendHref = resolveCanonicalOfferUrl(raw.sourceUrl || '');
    const hrefMatch = apiSourceUrl === frontendHref;

    console.log(`[${i + 1}/${rawOffers.length}] Auditing: ${raw.providerName} - "${raw.title}"`);
    console.log(`    API URL:       ${apiSourceUrl}`);
    console.log(`    Frontend Href: ${frontendHref}`);

    let initialStatus = 0;
    let finalStatus = 0;
    let finalUrl = frontendHref;
    const redirectChain: string[] = [];
    let htmlLang = '';
    let pageText = '';
    let pageTitle = '';
    let isRelevant = false;
    let relevanceNotes = '';
    let classification = 'UNKNOWN';

    const page = await context.newPage();

    // Track redirect responses
    page.on('response', (response) => {
      const respUrl = response.url();
      const status = response.status();
      if (status >= 300 && status < 400) {
        redirectChain.push(`${respUrl} (${status})`);
      }
    });

    try {
      const response = await page.goto(frontendHref, { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (response) {
        initialStatus = redirectChain.length > 0 ? 302 : response.status();
        finalStatus = response.status();
        finalUrl = page.url();
      } else {
        finalStatus = 0;
      }

      // Extract DOM metadata
      htmlLang = await page.evaluate(() => document.documentElement.lang || document.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') || '');
      pageTitle = await page.title();
      pageText = await page.evaluate(() => (document.body ? document.body.innerText.slice(0, 4000) : ''));

      // Check relevance
      const pLower = (raw.providerName || '').toLowerCase();
      const tLower = (raw.title || '').toLowerCase();
      const partnerLower = (raw.partner || '').toLowerCase();
      const bodyLower = pageText.toLowerCase() + ' ' + pageTitle.toLowerCase();

      const mentionsProvider = bodyLower.includes(pLower) || (partnerLower && bodyLower.includes(partnerLower)) || bodyLower.includes('pricing') || bodyLower.includes('plan') || bodyLower.includes('offer');
      const is404Page = finalStatus === 404 || pageTitle.includes('404') || bodyLower.includes('page not found') || bodyLower.includes('not found') || bodyLower.includes('does not exist');

      if (is404Page || finalStatus === 404) {
        isRelevant = false;
        relevanceNotes = 'Page returns 404 Not Found or error page.';
      } else if (mentionsProvider) {
        isRelevant = true;
        relevanceNotes = `Relevant: matches provider/offer tokens in page (${pageTitle.slice(0, 40)}...)`;
      } else {
        isRelevant = true;
        relevanceNotes = `Loaded official landing: ${pageTitle.slice(0, 50)}`;
      }

    } catch (err: any) {
      if (err.message.includes('Timeout')) {
        finalStatus = 0;
        relevanceNotes = 'Navigation TIMEOUT';
        classification = 'TIMEOUT';
      } else if (err.message.includes('ERR_NAME_NOT_RESOLVED')) {
        finalStatus = 0;
        relevanceNotes = 'DNS Resolution Error';
        classification = 'DNS_ERROR';
      } else if (err.message.includes('403')) {
        finalStatus = 403;
        relevanceNotes = 'Bot Protection / Cloudflare WAF Blocked';
        classification = 'BLOCKED';
      } else {
        finalStatus = 0;
        relevanceNotes = `Fetch Error: ${err.message}`;
        classification = 'UNKNOWN';
      }
    } finally {
      await page.close();
    }

    const parsedFinal = (() => {
      try { return new URL(finalUrl); } catch { return null; }
    })();
    const finalHostname = parsedFinal ? parsedFinal.hostname : '';
    const isOfficialDomain = isRegisteredOfficialSource(raw.providerId, finalUrl);

    // Language detection
    const { lang: detectedLanguage, langCode } = detectLanguage(htmlLang, pageText, pageTitle);

    // Determine Classification
    if (finalStatus === 404) {
      classification = 'NOT_FOUND_404';
    } else if (finalStatus >= 400 && finalStatus < 500) {
      classification = finalStatus === 403 ? 'BLOCKED' : 'CLIENT_ERROR_4XX';
    } else if (finalStatus >= 500) {
      classification = 'SERVER_ERROR_5XX';
    } else if (!isOfficialDomain) {
      classification = 'OFFICIAL_DOMAIN_MISMATCH';
    } else if (finalStatus >= 200 && finalStatus < 400) {
      const isRedirected = redirectChain.length > 0 || (finalUrl !== frontendHref && !frontendHref.endsWith('/') && finalUrl !== `${frontendHref}/`);
      if (detectedLanguage === 'English') {
        classification = isRedirected ? 'VALID_ENGLISH_REDIRECT' : 'VALID_ENGLISH';
      } else {
        classification = isRedirected ? 'VALID_NON_ENGLISH_REDIRECT' : 'VALID_NON_ENGLISH';
      }
    }

    // Step 4: If non-English, check for official English equivalent on same official domain
    let hasEnglishEquivalent: boolean | undefined = undefined;
    let englishEquivalentUrl: string | undefined = undefined;
    let englishDiscoveryMethod: string | undefined = undefined;

    if (classification.startsWith('VALID_NON_ENGLISH')) {
      console.log(`    🔍 Investigating English equivalent for non-English offer (${detectedLanguage})...`);
      // Check for official English paths on domain
      const root = parsedFinal ? `${parsedFinal.protocol}//${parsedFinal.hostname}` : '';
      const candidateEnglishUrls: Array<{ url: string; method: string }> = [];

      if (parsedFinal?.hostname.includes('softbank.jp')) {
        candidateEnglishUrls.push({ url: 'https://www.softbank.jp/en/', method: 'SoftBank Global English Portal' });
      }
      if (parsedFinal?.hostname.includes('moonshot.cn')) {
        candidateEnglishUrls.push({ url: 'https://platform.moonshot.cn/pricing', method: 'Official Moonshot Pricing Surface' });
      }
      if (parsedFinal?.hostname.includes('mi.com')) {
        candidateEnglishUrls.push({ url: 'https://www.mi.com/global/support/faq/details/KA-100223/', method: 'Xiaomi Global English FAQ' });
      }

      for (const cand of candidateEnglishUrls) {
        try {
          const testPage = await context.newPage();
          const candRes = await testPage.goto(cand.url, { waitUntil: 'domcontentloaded', timeout: 12000 });
          if (candRes && candRes.status() === 200) {
            const candLang = await testPage.evaluate(() => document.documentElement.lang || '');
            const candText = await testPage.evaluate(() => (document.body ? document.body.innerText.slice(0, 1000) : ''));
            const { lang } = detectLanguage(candLang, candText, '');
            if (lang === 'English') {
              hasEnglishEquivalent = true;
              englishEquivalentUrl = cand.url;
              englishDiscoveryMethod = cand.method;
              break;
            }
          }
          await testPage.close();
        } catch {
          // Continue
        }
      }

      if (!hasEnglishEquivalent) {
        hasEnglishEquivalent = false;
      }
    }

    auditRecords.push({
      index: i + 1,
      offerId: raw.id || raw.fingerprint,
      providerId: raw.providerId,
      providerName: raw.providerName,
      title: raw.title,
      category: raw.categoryLabel || raw.discountType || 'Direct',
      offerType: raw.isPartnerOffer ? 'Partner' : (raw.partner ? 'Partner' : 'Direct'),
      partner: raw.partner,
      apiSourceUrl,
      frontendHref,
      hrefMatch,
      initialStatus: initialStatus || finalStatus,
      finalStatus,
      finalUrl,
      redirectChain,
      finalHostname,
      isOfficialDomain,
      htmlLang,
      detectedLanguage,
      isRelevant,
      relevanceNotes,
      classification,
      hasEnglishEquivalent,
      englishEquivalentUrl,
      englishDiscoveryMethod,
    });

    console.log(`    Result: [${classification}] Language: ${detectedLanguage} | Final: ${finalUrl} (${finalStatus})\n`);
  }

  await browser.close();

  // Save audit data to scratch for comprehensive reporting
  const fs = await import('fs');
  fs.writeFileSync('scratch/full_offer_audit_results.json', JSON.stringify(auditRecords, null, 2));
  console.log('Saved complete audit dataset to scratch/full_offer_audit_results.json\n');

  // Print Summary Table
  console.log('================================================================');
  console.log('COMPLETE AUDIT RESULTS TABLE');
  console.log('================================================================');
  console.log('# | Provider | Offer | Type | View URL | HTTP | Final URL | Final HTTP | Language | Official Domain | Result');
  console.log('---|---|---|---|---|---|---|---|---|---|---');

  for (const r of auditRecords) {
    const isOff = r.isOfficialDomain ? 'YES' : 'NO';
    console.log(`${r.index} | ${r.providerName} | ${r.title.slice(0, 35)} | ${r.offerType} | ${r.frontendHref.slice(0, 45)} | ${r.initialStatus} | ${r.finalUrl.slice(0, 45)} | ${r.finalStatus} | ${r.detectedLanguage} | ${isOff} | ${r.classification}`);
  }

  // Calculate Metrics
  const total = auditRecords.length;
  const validEnglish = auditRecords.filter(r => r.classification === 'VALID_ENGLISH').length;
  const validEnglishRedirect = auditRecords.filter(r => r.classification === 'VALID_ENGLISH_REDIRECT').length;
  const validNonEnglish = auditRecords.filter(r => r.classification === 'VALID_NON_ENGLISH').length;
  const validNonEnglishRedirect = auditRecords.filter(r => r.classification === 'VALID_NON_ENGLISH_REDIRECT').length;
  const notFound404 = auditRecords.filter(r => r.classification === 'NOT_FOUND_404').length;
  const other4xx = auditRecords.filter(r => r.classification === 'CLIENT_ERROR_4XX').length;
  const server5xx = auditRecords.filter(r => r.classification === 'SERVER_ERROR_5XX').length;
  const timeouts = auditRecords.filter(r => r.classification === 'TIMEOUT').length;
  const dnsErrors = auditRecords.filter(r => r.classification === 'DNS_ERROR').length;
  const domainMismatches = auditRecords.filter(r => r.classification === 'OFFICIAL_DOMAIN_MISMATCH').length;
  const blocked = auditRecords.filter(r => r.classification === 'BLOCKED').length;
  const unknown = auditRecords.filter(r => r.classification === 'UNKNOWN').length;

  const validTotal = validEnglish + validEnglishRedirect + validNonEnglish + validNonEnglishRedirect;
  const englishTotal = validEnglish + validEnglishRedirect;
  const englishRate = total > 0 ? ((englishTotal / total) * 100).toFixed(1) : '0';

  console.log('\n================================================================');
  console.log('METRICS & LANGUAGE SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL ACTIVE OFFERS: ${total}`);
  console.log(`VALID_ENGLISH: ${validEnglish}`);
  console.log(`VALID_ENGLISH_REDIRECT: ${validEnglishRedirect}`);
  console.log(`VALID_NON_ENGLISH: ${validNonEnglish}`);
  console.log(`VALID_NON_ENGLISH_REDIRECT: ${validNonEnglishRedirect}`);
  console.log(`NOT_FOUND_404: ${notFound404}`);
  console.log(`OTHER_4XX: ${other4xx}`);
  console.log(`SERVER_5XX: ${server5xx}`);
  console.log(`TIMEOUT: ${timeouts}`);
  console.log(`DNS_ERROR: ${dnsErrors}`);
  console.log(`DOMAIN_MISMATCH: ${domainMismatches}`);
  console.log(`BLOCKED: ${blocked}`);
  console.log(`UNKNOWN: ${unknown}`);
  console.log(`\nENGLISH DESTINATION RATE: ${englishRate}% (${englishTotal}/${total})`);
}

runComprehensiveAudit().catch(console.error);
