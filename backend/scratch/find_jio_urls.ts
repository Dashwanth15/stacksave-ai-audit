/**
 * Find correct current Jio Google AI Pro destination URLs via Playwright
 */
import { chromium } from 'playwright';

const JIO_CANDIDATES = [
  'https://www.jio.com/en-in/google-one',
  'https://www.jio.com/en-in/google-ai-pro',
  'https://www.jio.com/en-in/google-one-ai-premium',
  'https://www.jio.com/en-in/jio-google-one',
  'https://www.jio.com/en-in/google-one-offer',          // broken (known 404)
  'https://www.jio.com/en-in/jiofiber',
  'https://www.jio.com/en-in/jio-fiber',
  'https://www.jio.com/en-in/fiber',                      // broken (known 404)
  'https://www.jio.com',
];

const HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Upgrade-Insecure-Requests': '1',
};

async function check(url: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'en-US',
    extraHTTPHeaders: HEADERS,
  });
  const page = await context.newPage();

  let status: number | null = null;
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    status = resp?.status() ?? null;
    try { await page.waitForLoadState('networkidle', { timeout: 6000 }); } catch { /**/ }
  } catch (e: any) {
    await browser.close();
    return { url, finalUrl: url, status: null, title: '', evidence: '', isNotFound: false, error: e.message.slice(0, 80) };
  }

  const finalUrl = page.url();
  const title = await page.title().catch(() => '');
  const body = await page.evaluate(() => document.body?.innerText || '').catch(() => '');

  const keywords = ['google one', 'google ai pro', 'gemini advanced', 'ai premium', 'google one ai', 'fiber', 'jiofiber'];
  const found = keywords.filter(k => body.toLowerCase().includes(k));

  // Grab a snippet around first keyword hit
  let snippet = '';
  for (const kw of found.slice(0, 1)) {
    const idx = body.toLowerCase().indexOf(kw);
    if (idx >= 0) snippet = body.slice(Math.max(0, idx - 40), idx + 120).replace(/\s+/g, ' ').trim();
  }

  const isNotFound = title.toLowerCase().includes('page not found') || body.toLowerCase().includes('page not found');

  await browser.close();
  return { url, finalUrl, status, title: title.slice(0, 100), evidence: found.join(', '), snippet: snippet.slice(0, 200), isNotFound, error: null };
}

async function main() {
  console.log('=== JIO URL DISCOVERY — Google AI Pro Offer Destinations ===\n');
  for (const url of JIO_CANDIDATES) {
    process.stdout.write(`Testing: ${url}\n`);
    const r = await check(url);
    const badge = r.isNotFound ? '❌ NOT FOUND' : r.error ? '⚠  ERROR' : r.evidence ? '✅ HAS EVIDENCE' : '✓  LIVE (no offer evidence)';
    console.log(`  ${badge}`);
    console.log(`  final:    ${r.finalUrl}`);
    console.log(`  status:   ${r.status}`);
    console.log(`  title:    ${r.title}`);
    if (r.evidence) console.log(`  evidence: ${r.evidence}`);
    if (r.snippet)  console.log(`  snippet:  "${r.snippet}"`);
    if (r.error)    console.log(`  error:    ${r.error}`);
    console.log('');
  }
}

main().catch(console.error);
