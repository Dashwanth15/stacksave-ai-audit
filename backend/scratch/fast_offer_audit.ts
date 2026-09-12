import { isAllowlistedPartnerDomain, extractRootDomain, resolveCanonicalOfferUrl } from '../src/pricing/partnerSourceRegistry';
import { getProviderSource } from '../src/pricing/sourceRegistry';
import { isRegisteredOfficialSource } from '../src/pricing/offerTrust';
import * as fs from 'fs';

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

function detectLanguage(htmlLang: string, bodyText: string, title: string): { lang: string; langCode: string } {
  const normLang = (htmlLang || '').toLowerCase().trim();
  const fullText = (bodyText + ' ' + title).slice(0, 5000);

  // Japanese characters detection (Hiragana: \u3040-\u309F, Katakana: \u30A0-\u30FF)
  const hasJapaneseKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(fullText);
  // Korean Hangul detection (\uAC00-\uD7AF, \u1100-\u11FF)
  const hasKoreanHangul = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(fullText);
  // Chinese Hanzi detection (\u4E00-\u9FFF) without Japanese kana
  const hasChineseHanzi = /[\u4E00-\u9FFF]/.test(fullText);

  if (hasJapaneseKana || normLang.startsWith('ja')) {
    return { lang: 'Japanese', langCode: 'ja' };
  }
  if (hasKoreanHangul || normLang.startsWith('ko')) {
    return { lang: 'Korean', langCode: 'ko' };
  }
  if ((hasChineseHanzi && !hasJapaneseKana) || normLang.startsWith('zh')) {
    return { lang: 'Chinese', langCode: 'zh' };
  }
  if (normLang.startsWith('de') || (fullText.includes('Datenschutz') && fullText.includes('Impressum'))) {
    return { lang: 'German', langCode: 'de' };
  }
  if (normLang.startsWith('fr') || fullText.includes('Tous droits réservés')) {
    return { lang: 'French', langCode: 'fr' };
  }
  if (normLang.startsWith('es') || fullText.includes('Todos los derechos reservados')) {
    return { lang: 'Spanish', langCode: 'es' };
  }
  
  return { lang: 'English', langCode: 'en' };
}

async function probeSingleUrl(targetUrl: string): Promise<{
  initialStatus: number;
  finalStatus: number;
  finalUrl: string;
  redirectChain: string[];
  htmlLang: string;
  bodyText: string;
  pageTitle: string;
  error?: string;
}> {
  const redirectChain: string[] = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // First do manual redirect tracing or standard follow
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeoutId);

    const finalStatus = response.status;
    const finalUrl = response.url || targetUrl;
    if (finalUrl !== targetUrl) {
      redirectChain.push(`${targetUrl} -> ${finalUrl}`);
    }

    let html = '';
    try {
      html = await response.text();
    } catch {
      html = '';
    }

    // Extract lang and title
    const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    const htmlLang = langMatch ? langMatch[1] : '';
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    // Strip tags to get raw text
    const bodyText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                         .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                         .replace(/<[^>]+>/g, ' ')
                         .replace(/\s+/g, ' ')
                         .slice(0, 5000);

    return {
      initialStatus: redirectChain.length > 0 ? 302 : finalStatus,
      finalStatus,
      finalUrl,
      redirectChain,
      htmlLang,
      bodyText,
      pageTitle,
    };
  } catch (err: any) {
    return {
      initialStatus: 0,
      finalStatus: 0,
      finalUrl: targetUrl,
      redirectChain,
      htmlLang: '',
      bodyText: '',
      pageTitle: '',
      error: err.name === 'AbortError' ? 'TIMEOUT' : err.message,
    };
  }
}

async function runAudit() {
  console.log('================================================================');
  console.log('STACKSAVE — COMPLETE READ-ONLY OFFER URL & LANGUAGE AUDIT');
  console.log('================================================================\n');

  console.log('Fetching all active offers from http://localhost:5000/api/intelligence/offers...');
  const apiRes = await fetch('http://localhost:5000/api/intelligence/offers');
  const json = await apiRes.json();
  const rawOffers: any[] = json.data.offers || [];

  console.log(`TOTAL ACTIVE OFFERS: ${rawOffers.length}\n`);

  const records: AuditRecord[] = [];
  const batchSize = 8;

  for (let i = 0; i < rawOffers.length; i += batchSize) {
    const batch = rawOffers.slice(i, i + batchSize);
    const batchPromises = batch.map(async (raw, bIdx) => {
      const globalIndex = i + bIdx + 1;
      const apiSourceUrl = raw.sourceUrl || '';
      const frontendHref = resolveCanonicalOfferUrl(raw.sourceUrl || '');
      const hrefMatch = apiSourceUrl === frontendHref;

      const probe = await probeSingleUrl(frontendHref);
      const parsedFinal = (() => {
        try { return new URL(probe.finalUrl); } catch { return null; }
      })();
      const finalHostname = parsedFinal ? parsedFinal.hostname : '';
      const isOfficialDomain = isRegisteredOfficialSource(raw.providerId, probe.finalUrl);

      const { lang: detectedLanguage } = detectLanguage(probe.htmlLang, probe.bodyText, probe.pageTitle);

      // Check relevance
      const pLower = (raw.providerName || '').toLowerCase();
      const tLower = (raw.title || '').toLowerCase();
      const partnerLower = (raw.partner || '').toLowerCase();
      const bodyLower = (probe.bodyText + ' ' + probe.pageTitle).toLowerCase();

      const mentionsProvider = bodyLower.includes(pLower) || 
                               (partnerLower && bodyLower.includes(partnerLower)) || 
                               bodyLower.includes('pricing') || 
                               bodyLower.includes('plan') || 
                               bodyLower.includes('student') ||
                               bodyLower.includes('free') ||
                               bodyLower.includes('offer');
      const is404Page = probe.finalStatus === 404 || probe.pageTitle.toLowerCase().includes('404') || bodyLower.includes('page not found') || bodyLower.includes('404 not found');

      let isRelevant = false;
      let relevanceNotes = '';
      if (is404Page || probe.finalStatus === 404) {
        isRelevant = false;
        relevanceNotes = 'Page returns 404 Not Found or error page.';
      } else if (mentionsProvider) {
        isRelevant = true;
        relevanceNotes = `Relevant: matches provider/offer keywords (${probe.pageTitle.slice(0, 45)}...)`;
      } else {
        isRelevant = true;
        relevanceNotes = `Loaded official surface: ${probe.pageTitle.slice(0, 50)}`;
      }

      // Classification
      let classification = 'UNKNOWN';
      if (probe.finalStatus === 404) {
        classification = 'NOT_FOUND_404';
      } else if (probe.finalStatus === 403) {
        classification = 'BLOCKED';
      } else if (probe.finalStatus >= 400 && probe.finalStatus < 500) {
        classification = 'CLIENT_ERROR_4XX';
      } else if (probe.finalStatus >= 500) {
        classification = 'SERVER_ERROR_5XX';
      } else if (probe.error === 'TIMEOUT') {
        classification = 'TIMEOUT';
      } else if (probe.error && probe.error.includes('ENOTFOUND')) {
        classification = 'DNS_ERROR';
      } else if (!isOfficialDomain && probe.finalStatus === 200) {
        classification = 'OFFICIAL_DOMAIN_MISMATCH';
      } else if (probe.finalStatus >= 200 && probe.finalStatus < 400) {
        const isRedirected = probe.redirectChain.length > 0 || (probe.finalUrl !== frontendHref && !frontendHref.endsWith('/') && probe.finalUrl !== `${frontendHref}/`);
        if (detectedLanguage === 'English') {
          classification = isRedirected ? 'VALID_ENGLISH_REDIRECT' : 'VALID_ENGLISH';
        } else {
          classification = isRedirected ? 'VALID_NON_ENGLISH_REDIRECT' : 'VALID_NON_ENGLISH';
        }
      }

      // If non-English, check official English alternative
      let hasEnglishEquivalent: boolean | undefined = undefined;
      let englishEquivalentUrl: string | undefined = undefined;
      let englishDiscoveryMethod: string | undefined = undefined;

      if (classification.startsWith('VALID_NON_ENGLISH')) {
        if (probe.finalUrl.includes('softbank.jp')) {
          const engProbe = await probeSingleUrl('https://www.softbank.jp/en/');
          if (engProbe.finalStatus === 200) {
            hasEnglishEquivalent = true;
            englishEquivalentUrl = 'https://www.softbank.jp/en/';
            englishDiscoveryMethod = 'Official SoftBank Global English Portal';
          }
        } else if (probe.finalUrl.includes('moonshot.cn')) {
          const engProbe = await probeSingleUrl('https://platform.moonshot.cn/pricing');
          if (engProbe.finalStatus === 200) {
            hasEnglishEquivalent = true;
            englishEquivalentUrl = 'https://platform.moonshot.cn/pricing';
            englishDiscoveryMethod = 'Official Moonshot Global Pricing Hub';
          }
        } else if (probe.finalUrl.includes('mi.com')) {
          const engProbe = await probeSingleUrl('https://www.mi.com/global/support/faq/details/KA-100223/');
          if (engProbe.finalStatus === 200) {
            hasEnglishEquivalent = true;
            englishEquivalentUrl = 'https://www.mi.com/global/support/faq/details/KA-100223/';
            englishDiscoveryMethod = 'Official Xiaomi Global English FAQ (KA-100223)';
          }
        }
        if (hasEnglishEquivalent === undefined) {
          hasEnglishEquivalent = false;
        }
      }

      return {
        index: globalIndex,
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
        initialStatus: probe.initialStatus,
        finalStatus: probe.finalStatus,
        finalUrl: probe.finalUrl,
        redirectChain: probe.redirectChain,
        finalHostname,
        isOfficialDomain,
        htmlLang: probe.htmlLang,
        detectedLanguage,
        isRelevant,
        relevanceNotes,
        classification,
        hasEnglishEquivalent,
        englishEquivalentUrl,
        englishDiscoveryMethod,
      } as AuditRecord;
    });

    const batchResults = await Promise.all(batchPromises);
    records.push(...batchResults);
    console.log(`Processed batch ${Math.min(i + batchSize, rawOffers.length)} / ${rawOffers.length} offers...`);
  }

  fs.writeFileSync('scratch/full_offer_audit_results.json', JSON.stringify(records, null, 2));
  console.log('\nAudit complete! Saved full audit dataset to scratch/full_offer_audit_results.json\n');

  // Print Summary Table
  console.log('# | Provider | Offer | Type | View URL | HTTP | Final URL | Final HTTP | Language | Official Domain | Result');
  console.log('---|---|---|---|---|---|---|---|---|---|---');
  for (const r of records) {
    const isOff = r.isOfficialDomain ? 'YES' : 'NO';
    console.log(`${r.index} | ${r.providerName} | ${r.title} | ${r.offerType} | ${r.frontendHref} | ${r.initialStatus} | ${r.finalUrl} | ${r.finalStatus} | ${r.detectedLanguage} | ${isOff} | ${r.classification}`);
  }

  // Metrics
  const total = records.length;
  const validEnglish = records.filter(r => r.classification === 'VALID_ENGLISH').length;
  const validEnglishRedirect = records.filter(r => r.classification === 'VALID_ENGLISH_REDIRECT').length;
  const validNonEnglish = records.filter(r => r.classification === 'VALID_NON_ENGLISH').length;
  const validNonEnglishRedirect = records.filter(r => r.classification === 'VALID_NON_ENGLISH_REDIRECT').length;
  const notFound404 = records.filter(r => r.classification === 'NOT_FOUND_404').length;
  const other4xx = records.filter(r => r.classification === 'CLIENT_ERROR_4XX').length;
  const server5xx = records.filter(r => r.classification === 'SERVER_ERROR_5XX').length;
  const timeouts = records.filter(r => r.classification === 'TIMEOUT').length;
  const dnsErrors = records.filter(r => r.classification === 'DNS_ERROR').length;
  const domainMismatches = records.filter(r => r.classification === 'OFFICIAL_DOMAIN_MISMATCH').length;
  const blocked = records.filter(r => r.classification === 'BLOCKED').length;
  const unknown = records.filter(r => r.classification === 'UNKNOWN').length;

  const englishTotal = validEnglish + validEnglishRedirect;
  const englishRate = total > 0 ? ((englishTotal / total) * 100).toFixed(1) : '0';

  console.log('\n================================================================');
  console.log('METRICS SUMMARY');
  console.log('================================================================');
  console.log(`TOTAL ACTIVE OFFERS: ${total}`);
  console.log(`VALID_ENGLISH: ${validEnglish}`);
  console.log(`VALID_ENGLISH_REDIRECT: ${validEnglishRedirect}`);
  console.log(`VALID_NON_ENGLISH: ${validNonEnglish}`);
  console.log(`VALID_NON_ENGLISH_REDIRECT: ${validNonEnglishRedirect}`);
  console.log(`404: ${notFound404}`);
  console.log(`OTHER_4XX: ${other4xx}`);
  console.log(`5XX: ${server5xx}`);
  console.log(`TIMEOUT: ${timeouts}`);
  console.log(`DNS_ERROR: ${dnsErrors}`);
  console.log(`DOMAIN_MISMATCH: ${domainMismatches}`);
  console.log(`BLOCKED: ${blocked}`);
  console.log(`UNKNOWN: ${unknown}`);
  console.log(`\nENGLISH DESTINATION RATE: ${englishRate}% (${englishTotal}/${total})`);
}

runAudit().catch(console.error);
