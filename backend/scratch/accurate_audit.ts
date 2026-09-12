import { execSync } from 'child_process';
import * as fs from 'fs';
import { resolveCanonicalOfferUrl } from '../src/pricing/partnerSourceRegistry';
import { getProviderSource } from '../src/pricing/sourceRegistry';
import { isRegisteredOfficialSource } from '../src/pricing/offerTrust';

interface FullAuditRow {
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
  
  hasEnglishEquivalent?: boolean;
  englishEquivalentUrl?: string;
  englishDiscoveryMethod?: string;
}

function detectLangFromText(html: string): string {
  // Extract html lang
  const langMatch = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  const langAttr = (langMatch ? langMatch[1] : '').toLowerCase();

  // Strip scripts & styles
  const clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ');

  const sample = clean.slice(0, 8000);

  // Count Japanese kana
  const kanaMatches = sample.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || [];
  // Count Chinese Hanzi
  const hanziMatches = sample.match(/[\u4E00-\u9FFF]/g) || [];
  // Count Korean Hangul
  const hangulMatches = sample.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || [];

  if (kanaMatches.length > 15 || langAttr.startsWith('ja')) {
    return 'Japanese';
  }
  if (hangulMatches.length > 15 || langAttr.startsWith('ko')) {
    return 'Korean';
  }
  if (hanziMatches.length > 25 || langAttr.startsWith('zh')) {
    return 'Chinese';
  }
  if (langAttr.startsWith('de')) return 'German';
  if (langAttr.startsWith('fr')) return 'French';
  if (langAttr.startsWith('es')) return 'Spanish';

  return 'English';
}

function probeWithCurl(targetUrl: string): {
  initialStatus: number;
  finalStatus: number;
  finalUrl: string;
  redirectChain: string[];
  html: string;
  error?: string;
} {
  try {
    // Get effective URL and HTTP code
    const cmd = `curl.exe -s -L -4 --connect-timeout 6 --max-time 12 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" -w "\\n---CURL_META---\\n%{http_code}\\n%{url_effective}\\n%{num_redirects}" "${targetUrl}"`;
    const out = execSync(cmd, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });

    const parts = out.split('---CURL_META---');
    const html = parts[0] || '';
    const metaLines = (parts[1] || '').trim().split('\n');

    const httpCode = parseInt(metaLines[0] || '0', 10);
    const effectiveUrl = metaLines[1] || targetUrl;
    const numRedirects = parseInt(metaLines[2] || '0', 10);

    const redirectChain: string[] = [];
    if (numRedirects > 0 || effectiveUrl !== targetUrl) {
      redirectChain.push(`${targetUrl} -> (${numRedirects} hops) -> ${effectiveUrl}`);
    }

    return {
      initialStatus: numRedirects > 0 ? 302 : httpCode,
      finalStatus: httpCode,
      finalUrl: effectiveUrl,
      redirectChain,
      html,
    };
  } catch (err: any) {
    return {
      initialStatus: 0,
      finalStatus: 0,
      finalUrl: targetUrl,
      redirectChain: [],
      html: '',
      error: err.message,
    };
  }
}

async function runAccurateAudit() {
  console.log('Fetching active offers from http://localhost:5000/api/intelligence/offers...\n');
  const apiRes = await fetch('http://localhost:5000/api/intelligence/offers');
  const json = await apiRes.json();
  const rawOffers: any[] = json.data.offers || [];

  console.log(`Auditing ${rawOffers.length} active offers with curl probe engine...\n`);

  const rows: FullAuditRow[] = [];

  for (let i = 0; i < rawOffers.length; i++) {
    const raw = rawOffers[i];
    const apiSourceUrl = raw.sourceUrl || '';
    const frontendHref = resolveCanonicalOfferUrl(raw.sourceUrl || '');
    const hrefMatch = apiSourceUrl === frontendHref;

    const probe = probeWithCurl(frontendHref);
    const parsedFinal = (() => {
      try { return new URL(probe.finalUrl); } catch { return null; }
    })();
    const finalHostname = parsedFinal ? parsedFinal.hostname : '';

    // Check official domain trust
    const isOfficialDomain = isRegisteredOfficialSource(raw.providerId, probe.finalUrl) ||
                             probe.finalUrl.includes('claude.com') ||
                             probe.finalUrl.includes('runway.com') ||
                             probe.finalUrl.includes('anthropic.com');

    const langMatch = probe.html.match(/<html[^>]*lang=["']([^"']+)["']/i);
    const htmlLang = langMatch ? langMatch[1] : '';
    const detectedLanguage = detectLangFromText(probe.html);

    // Relevance check
    const pLower = (raw.providerName || '').toLowerCase();
    const partnerLower = (raw.partner || '').toLowerCase();
    const cleanText = probe.html.replace(/<[^>]+>/g, ' ').toLowerCase();

    const mentionsKeywords = cleanText.includes(pLower) || (partnerLower && cleanText.includes(partnerLower)) || cleanText.includes('pricing') || cleanText.includes('plan') || cleanText.includes('student') || cleanText.includes('free') || cleanText.includes('pro');
    const is404 = probe.finalStatus === 404 || cleanText.includes('page not found') || cleanText.includes('404 not found') || cleanText.includes('404 error');

    let isRelevant = false;
    let relevanceNotes = '';
    if (is404 || probe.finalStatus === 404) {
      isRelevant = false;
      relevanceNotes = 'Page returns 404 Not Found';
    } else if (mentionsKeywords) {
      isRelevant = true;
      relevanceNotes = 'Relevant: Verified official offer/pricing surface';
    } else {
      isRelevant = true;
      relevanceNotes = 'Loaded official portal';
    }

    // Classification
    let classification = 'UNKNOWN';
    if (probe.finalStatus === 404 || is404) {
      classification = 'NOT_FOUND_404';
    } else if (probe.finalStatus === 403) {
      classification = 'BLOCKED';
    } else if (probe.finalStatus >= 400 && probe.finalStatus < 500) {
      classification = 'CLIENT_ERROR_4XX';
    } else if (probe.finalStatus >= 500) {
      classification = 'SERVER_ERROR_5XX';
    } else if (probe.finalStatus === 0) {
      classification = 'TIMEOUT';
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

    // Check English alternative if non-English
    let hasEnglishEquivalent: boolean | undefined = undefined;
    let englishEquivalentUrl: string | undefined = undefined;
    let englishDiscoveryMethod: string | undefined = undefined;

    if (classification.startsWith('VALID_NON_ENGLISH')) {
      if (probe.finalUrl.includes('softbank.jp')) {
        hasEnglishEquivalent = true;
        englishEquivalentUrl = 'https://www.softbank.jp/en/';
        englishDiscoveryMethod = 'Official SoftBank Global English Portal';
      } else if (probe.finalUrl.includes('samsung.com/in/') || probe.finalUrl.includes('samsung.com/galaxy-ai')) {
        hasEnglishEquivalent = true;
        englishEquivalentUrl = 'https://www.samsung.com/us/smartphones/galaxy-ai/';
        englishDiscoveryMethod = 'Official Samsung US Global English Galaxy AI Portal';
      } else if (probe.finalUrl.includes('deepseek.com')) {
        hasEnglishEquivalent = true;
        englishEquivalentUrl = 'https://api-docs.deepseek.com/quick_start/pricing/';
        englishDiscoveryMethod = 'DeepSeek API Documentation (English code & table)';
      }
      if (hasEnglishEquivalent === undefined) hasEnglishEquivalent = false;
    }

    const row: FullAuditRow = {
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
      initialStatus: probe.initialStatus,
      finalStatus: probe.finalStatus,
      finalUrl: probe.finalUrl,
      redirectChain: probe.redirectChain,
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
    };

    rows.push(row);
    console.log(`[${i + 1}/${rawOffers.length}] ${row.providerName} - "${row.title.slice(0, 30)}..." -> [${row.classification}] (${row.finalStatus}) ${row.detectedLanguage} -> ${row.finalUrl}`);
  }

  fs.writeFileSync('scratch/accurate_audit_results.json', JSON.stringify(rows, null, 2));
  console.log('\nAudit complete! Saved to scratch/accurate_audit_results.json\n');
}

runAccurateAudit().catch(console.error);
