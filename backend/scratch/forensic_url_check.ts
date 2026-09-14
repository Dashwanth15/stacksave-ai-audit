/**
 * FORENSIC URL VERIFICATION — Gemini & Perplexity Offers
 * Uses the existing StackSave Playwright infrastructure (headers, context creation)
 * to verify each destination URL currently stored in MongoDB and returned by the API.
 */
import dotenv from 'dotenv';
dotenv.config();
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';

// === Reuse headers from partnerOfferScanner.ts ===
const BROWSER_HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

// Offers to check — derived from live API inventory
const OFFERS_TO_CHECK = [
  // ── GEMINI PIXEL OFFERS ──────────────────────────────────
  {
    id: 'f5834a6fc76531a0580deb8cf1b9ac56',
    label: 'Pixel — 1yr Google One AI Premium (hl=en-US)',
    platform: 'GEMINI',
    partner: 'Google Pixel',
    title: '1 Year Google One AI Premium with Google Pixel',
    destinationUrl: 'https://store.google.com/category/phones?hl=en-US',
    offerType: 'BUNDLE',
  },
  {
    id: '5db0e34f34a5c55cf335ae781b5eb84c',
    label: 'Pixel — 1yr Google One AI Premium Pixel 10 Pro (hl=en-IN)',
    platform: 'GEMINI',
    partner: 'Google Pixel',
    title: '1 Year Google One AI Premium with Google Pixel 10 Pro',
    destinationUrl: 'https://store.google.com/category/phones?hl=en-IN',
    offerType: 'BUNDLE/PARTNER_BUNDLE',
  },
  {
    id: '2aaf8bbee2a6b5c766b3b3c2000e14c3',
    label: 'Pixel — 1yr Google One AI Premium (category/phones)',
    platform: 'GEMINI',
    partner: 'Google Pixel',
    title: '1 Year Google One AI Premium with Google Pixel',
    destinationUrl: 'https://store.google.com/category/phones',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: 'a324228fd46955d880bc998503aad867',
    label: 'Pixel — 1yr Google One AI Premium Pixel 10 Pro (no hl)',
    platform: 'GEMINI',
    partner: 'Google Pixel',
    title: '1 Year Google One AI Premium with Google Pixel 10 Pro',
    destinationUrl: 'https://store.google.com/category/phones',
    offerType: 'DEVICE_BUNDLE',
  },
  {
    id: 'a32b5f16cc519f5054116069a1d7d6d0',
    label: 'Pixel — 1yr Google One AI Premium (legacy seed)',
    platform: 'GEMINI',
    partner: 'Google Pixel',
    title: '1 Year Google One AI Premium with Google Pixel',
    destinationUrl: 'https://store.google.com/category/phones',
    offerType: 'DEVICE_BUNDLE',
  },
  // ── GEMINI ASUS OFFERS ──────────────────────────────────
  {
    id: '8050d26a50b2bcdaa8c48963096722e4',
    label: 'ASUS — Google One AI Premium (ASUS press release)',
    platform: 'GEMINI',
    partner: 'ASUS',
    title: 'Google One AI Premium with ASUS AI PC',
    destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
    offerType: 'BUNDLE',
  },
  {
    id: 'fd88ad653349437f04d7fb2268445abc',
    label: 'ASUS — Google One AI Premium (TELECOM_BUNDLE duplicate)',
    platform: 'GEMINI',
    partner: 'ASUS',
    title: 'Google One AI Premium with ASUS AI PC',
    destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: '7f8ce3d99166a018352b5e020f308db7',
    label: 'ASUS — Google One AI Premium & Chromebook Plus',
    platform: 'GEMINI',
    partner: 'ASUS',
    title: 'Google One AI Premium with ASUS AI PC & Chromebook Plus',
    destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
    offerType: 'DEVICE_BUNDLE',
  },
  {
    id: '7ce5297350cc5fc7ba11b686136bd6b7',
    label: 'ASUS — ASUS AI Offer (DEVICES_BUNDLE)',
    platform: 'GEMINI',
    partner: 'ASUS',
    title: 'ASUS AI Offer',
    destinationUrl: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
    offerType: 'DEVICES_BUNDLE',
  },
  // ── GEMINI JIO OFFERS ──────────────────────────────────
  {
    id: '55050a6564a630afc78a8ab24b11ed04',
    label: 'Jio — Google AI Pro with Jio 5G (seed #1)',
    platform: 'GEMINI',
    partner: 'Jio',
    title: 'Google AI Pro with Jio 5G',
    destinationUrl: 'https://www.jio.com/en-in/google-one-offer',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: '79ff7eedd2dbe25247a40929fd15214d',
    label: 'Jio — Google AI Pro with Jio 5G (seed #2)',
    platform: 'GEMINI',
    partner: 'Jio',
    title: 'Google AI Pro with Jio 5G',
    destinationUrl: 'https://www.jio.com/en-in/google-one-offer',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: 'c454a676f2b09de9ceb49521ecb53bb2',
    label: 'JioFiber — Google AI Pro Broadband',
    platform: 'GEMINI',
    partner: 'JioFiber',
    title: 'Google AI Pro Included with JioFiber / AirFiber',
    destinationUrl: 'https://www.jio.com/en-in/fiber',
    offerType: 'BROADBAND_BUNDLE',
  },
  // ── GEMINI DIRECT/OTHER ──────────────────────────────────
  {
    id: '0506b2ab8a086f02825c5d288fff18a4',
    label: 'Google Cloud Startups — $200k Credits',
    platform: 'GEMINI',
    partner: 'Google Cloud for Startups',
    title: 'Up to $200,000 Google Cloud AI Startup Program',
    destinationUrl: 'https://cloud.google.com/startup',
    offerType: 'CLOUD_BUNDLE',
  },
  {
    id: '88ad62c4cf77837db14d7f9bd7f20a02',
    label: 'Gemini Student Bundle',
    platform: 'GEMINI',
    partner: null,
    title: 'Google AI Student Bundle Promotion',
    destinationUrl: 'https://one.google.com/about/ai-premium',
    offerType: 'null',
  },
  // ── PERPLEXITY OFFERS ──────────────────────────────────
  {
    id: 'c4ea21c2e806784ffd794808afa38ff4',
    label: 'Telekom — Perplexity (telekom media page)',
    platform: 'PERPLEXITY',
    partner: 'Deutsche Telekom',
    title: 'Deutsche Telekom AI Offer',
    destinationUrl: 'https://www.telekom.com/en/media',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: '882593366b72dd5c2de245e1fd4608e9',
    label: 'Telekom — Perplexity Pro Bundle (newsroom/2024/11)',
    platform: 'PERPLEXITY',
    partner: 'Deutsche Telekom',
    title: 'Perplexity Pro Mobile Contract Bundle',
    destinationUrl: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
    offerType: 'TELECOM_BUNDLE',
  },
  {
    id: '20f01c3d007312f6bfc0d081a1003ffc',
    label: 'Perplexity Education Pro (help center article)',
    platform: 'PERPLEXITY',
    partner: null,
    title: 'Perplexity Education Pro',
    destinationUrl: 'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro',
    offerType: 'EDUCATION_BUNDLE',
  },
];

interface CheckResult {
  id: string;
  label: string;
  platform: string;
  partner: string | null;
  title: string;
  destinationUrl: string;
  initialStatus: number | null;
  finalUrl: string;
  finalStatus: number | null;
  redirectCount: number;
  pageTitle: string;
  pageNotFound: boolean;
  redirectsToGenericHomepage: boolean;
  domTextLength: number;
  offerEvidence: string;
  classification: 'VALID_ACTIVE' | 'WRONG_DESTINATION' | 'STALE_DESTINATION' | 'REDIRECTED_TO_GENERIC_PAGE' | 'HTTP_404' | 'HTTP_403' | 'REGION_RESTRICTED' | 'LOGIN_REQUIRED' | 'EXPIRED' | 'UNVERIFIED';
  classificationReason: string;
  recommendedAction: string;
}

function classifyResult(
  destinationUrl: string,
  initialStatus: number | null,
  finalUrl: string,
  finalStatus: number | null,
  pageTitle: string,
  domText: string,
  redirectCount: number,
): { classification: CheckResult['classification']; reason: string } {
  const lower = domText.toLowerCase();
  const titleLower = pageTitle.toLowerCase();

  // Check for obvious 404
  if (finalStatus === 404 || titleLower.includes('page not found') || titleLower.includes('404') ||
    lower.includes('page not found') || lower.includes('404 not found')) {
    return { classification: 'HTTP_404', reason: 'Page returned 404 or explicit page-not-found content' };
  }

  // Check for 403
  if (finalStatus === 403) {
    return { classification: 'HTTP_403', reason: 'HTTP 403 — access blocked (possible Cloudflare or geo-restriction)' };
  }

  // Check for login wall
  if (titleLower.includes('sign in') || titleLower.includes('log in') || lower.includes('sign in to continue')) {
    return { classification: 'LOGIN_REQUIRED', reason: 'Page requires login before offer content is visible' };
  }

  // Check for expiry signals in content
  if (lower.includes('offer expired') || lower.includes('promotion has ended') || lower.includes('this offer has ended') ||
    lower.includes('no longer available') || lower.includes('promotion ended')) {
    return { classification: 'EXPIRED', reason: 'Page contains explicit expiration language' };
  }

  // Check if final URL is a generic homepage (path lost)
  try {
    const initial = new URL(destinationUrl);
    const final = new URL(finalUrl);
    if (initial.hostname === final.hostname) {
      const finalPath = final.pathname.replace(/\/$/, '');
      const initialPath = initial.pathname.replace(/\/$/, '');
      if ((finalPath === '' || finalPath === '/') && initialPath.length > 2) {
        return { classification: 'REDIRECTED_TO_GENERIC_PAGE', reason: `Redirected from ${initialPath} to homepage` };
      }
    }
  } catch { /* ignore */ }

  // If domain changed completely (cross-domain redirect to unrelated site)
  try {
    const initial = new URL(destinationUrl);
    const final = new URL(finalUrl);
    if (initial.hostname !== final.hostname && !finalUrl.includes(initial.hostname)) {
      return { classification: 'WRONG_DESTINATION', reason: `Cross-domain redirect: ${initial.hostname} → ${final.hostname}` };
    }
  } catch { /* ignore */ }

  // If we got 200 but content is very thin (< 500 chars) it might be a stub
  if (finalStatus === 200 && domText.length < 500) {
    return { classification: 'UNVERIFIED', reason: 'HTTP 200 but rendered DOM is suspiciously thin (possible Cloudflare/block)' };
  }

  if (finalStatus === 200) {
    return { classification: 'VALID_ACTIVE', reason: 'HTTP 200 with adequate rendered content' };
  }

  return { classification: 'UNVERIFIED', reason: `Unexpected status ${finalStatus} or unknown issue` };
}

async function checkUrl(browser: Browser, offer: typeof OFFERS_TO_CHECK[0]): Promise<CheckResult> {
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  
  const result: CheckResult = {
    id: offer.id,
    label: offer.label,
    platform: offer.platform,
    partner: offer.partner,
    title: offer.title,
    destinationUrl: offer.destinationUrl,
    initialStatus: null,
    finalUrl: offer.destinationUrl,
    finalStatus: null,
    redirectCount: 0,
    pageTitle: '',
    pageNotFound: false,
    redirectsToGenericHomepage: false,
    domTextLength: 0,
    offerEvidence: '',
    classification: 'UNVERIFIED',
    classificationReason: 'Not yet checked',
    recommendedAction: 'Investigate manually',
  };

  try {
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: BROWSER_HEADERS,
    });
    page = await context.newPage();

    // Track redirects
    const redirects: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 300 && response.status() < 400) {
        redirects.push(response.url());
      }
    });

    // Navigate
    let initialStatus: number | null = null;
    let finalStatus: number | null = null;

    const response = await page.goto(offer.destinationUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 25000,
    });

    initialStatus = response?.status() ?? null;

    // Wait for page to settle
    try {
      await page.waitForLoadState('networkidle', { timeout: 8000 });
    } catch {
      // proceed anyway
    }

    const finalUrl = page.url();
    finalStatus = initialStatus; // approximate — we track final via current URL

    // Try to get the actual HTTP status of the final page
    try {
      const finalResponse = await page.evaluate(() => document.readyState);
    } catch { /* */ }

    // Get page title and body text
    const pageTitle = await page.title().catch(() => '');
    const domText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

    // Look for offer-specific evidence
    let evidence = '';
    const evidenceKeywords = [
      'google one', 'ai premium', 'gemini advanced', 'pixel', 'asus',
      'perplexity pro', 'telekom', 'jio', 'google ai pro', '18 months', '12 months', '1 year',
      'education pro', 'sheerid', '50%', 'google cloud', 'startup', 'credits',
    ];
    const domLower = domText.toLowerCase();
    const found = evidenceKeywords.filter(kw => domLower.includes(kw));
    if (found.length) {
      evidence = `Evidence found: ${found.slice(0, 5).join(', ')}`;
      // Get a snippet
      for (const kw of found.slice(0, 2)) {
        const idx = domLower.indexOf(kw);
        if (idx >= 0) {
          const snippet = domText.slice(Math.max(0, idx - 30), idx + 100).replace(/\s+/g, ' ').trim();
          evidence += ` | Snippet: "${snippet}"`;
          break;
        }
      }
    }

    const { classification, reason } = classifyResult(
      offer.destinationUrl,
      initialStatus,
      finalUrl,
      finalStatus,
      pageTitle,
      domText,
      redirects.length,
    );

    result.initialStatus = initialStatus;
    result.finalUrl = finalUrl;
    result.finalStatus = finalStatus;
    result.redirectCount = redirects.length;
    result.pageTitle = pageTitle.slice(0, 120);
    result.pageNotFound = classification === 'HTTP_404';
    result.redirectsToGenericHomepage = classification === 'REDIRECTED_TO_GENERIC_PAGE';
    result.domTextLength = domText.length;
    result.offerEvidence = evidence.slice(0, 300);
    result.classification = classification;
    result.classificationReason = reason;

    // Recommend action
    if (classification === 'VALID_ACTIVE') {
      result.recommendedAction = 'No change needed';
    } else if (classification === 'HTTP_404') {
      result.recommendedAction = 'REPAIR: Find correct current official destination for this offer';
    } else if (classification === 'REDIRECTED_TO_GENERIC_PAGE') {
      result.recommendedAction = 'REPAIR: URL redirects to generic homepage — find specific offer page';
    } else if (classification === 'WRONG_DESTINATION') {
      result.recommendedAction = 'REPAIR: Cross-domain redirect detected — verify correct destination';
    } else if (classification === 'EXPIRED') {
      result.recommendedAction = 'MARK_EXPIRED: Page confirms offer has ended';
    } else if (classification === 'HTTP_403') {
      result.recommendedAction = 'VERIFY_MANUALLY: 403 may be geo-restriction or Cloudflare (does not prove offer expired)';
    } else {
      result.recommendedAction = 'MONITOR: Investigate manually';
    }

  } catch (err: any) {
    result.classification = 'UNVERIFIED';
    result.classificationReason = `Navigation error: ${err.message?.slice(0, 100)}`;
    result.recommendedAction = 'VERIFY_MANUALLY: Playwright navigation failed';
  } finally {
    await page?.close().catch(() => {});
    await context?.close().catch(() => {});
  }

  return result;
}

async function main() {
  console.log('\n=== STACKSAVE FORENSIC URL AUDIT: GEMINI + PERPLEXITY ===');
  console.log(`Checking ${OFFERS_TO_CHECK.length} destination URLs via Playwright...\n`);

  const browser = await chromium.launch({ headless: true });
  const results: CheckResult[] = [];

  for (const offer of OFFERS_TO_CHECK) {
    process.stdout.write(`Checking: ${offer.label}... `);
    const result = await checkUrl(browser, offer);
    results.push(result);
    console.log(`${result.classification} (${result.initialStatus} → ${result.finalStatus}, ${result.domTextLength} chars)`);
  }

  await browser.close();

  // === REPORT ===
  console.log('\n' + '═'.repeat(100));
  console.log('FORENSIC AUDIT RESULTS');
  console.log('═'.repeat(100));

  for (const r of results) {
    console.log(`\n[${r.platform}${r.partner ? ' | ' + r.partner : ''}] ${r.title}`);
    console.log(`  ID:            ${r.id}`);
    console.log(`  destinationUrl: ${r.destinationUrl}`);
    console.log(`  finalUrl:       ${r.finalUrl}`);
    console.log(`  HTTP:           ${r.initialStatus} → ${r.finalStatus} | redirects: ${r.redirectCount}`);
    console.log(`  pageTitle:      ${r.pageTitle}`);
    console.log(`  domLength:      ${r.domTextLength} chars`);
    console.log(`  evidence:       ${r.offerEvidence || '(none detected)'}`);
    console.log(`  ► CLASSIFICATION: ${r.classification}`);
    console.log(`  ► REASON:         ${r.classificationReason}`);
    console.log(`  ► ACTION:         ${r.recommendedAction}`);
  }

  // Summary
  const valid = results.filter(r => r.classification === 'VALID_ACTIVE').length;
  const broken = results.filter(r => ['HTTP_404', 'REDIRECTED_TO_GENERIC_PAGE', 'WRONG_DESTINATION', 'EXPIRED'].includes(r.classification)).length;
  const needsVerify = results.filter(r => ['HTTP_403', 'UNVERIFIED', 'REGION_RESTRICTED', 'LOGIN_REQUIRED'].includes(r.classification)).length;

  console.log('\n' + '═'.repeat(100));
  console.log('SUMMARY');
  console.log(`  Total checked:      ${results.length}`);
  console.log(`  VALID_ACTIVE:       ${valid}`);
  console.log(`  BROKEN (need fix):  ${broken}`);
  console.log(`  UNVERIFIED/MANUAL:  ${needsVerify}`);
  console.log('');

  const broken_items = results.filter(r => r.classification !== 'VALID_ACTIVE');
  console.log('BROKEN / SUSPECT OFFERS:');
  broken_items.forEach(r => {
    console.log(`  ${r.classification.padEnd(30)} ${r.label}`);
    console.log(`    ${r.destinationUrl}`);
    console.log(`    → ${r.finalUrl}`);
  });

  // Save results for the plan
  fs.writeFileSync('./scratch/forensic_results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to scratch/forensic_results.json');
}

main().catch(console.error);
