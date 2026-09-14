import { chromium } from 'playwright';

interface UrlCheck {
  url: string;
  finalUrl: string;
  status: number | undefined;
  title: string;
  is404: boolean;
  hasOfferContent: boolean;
  snippet: string;
}

const URLS_TO_TEST = [
  'https://one.google.com/about/ai-premium',
  'https://www.jio.com/en-in/google-one-offer',
  'https://www.jio.com/google-gemini-offer/',
  'https://www.jio.com/en-in/fiber',
  'https://www.jio.com/fiber/',
  'https://store.google.com/category/phones',
  'https://store.google.com/category/phones?hl=en-IN',
  'https://store.google.com/category/phones?hl=en-US',
  'https://cloud.google.com/startup',
  'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/',
  'https://www.asus.com/campaign/google-one-ai-premium/',
  'https://www.telekom.com/en/media',
  'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone',
  'https://www.telekom.com/en/media/media-information/archive-news-details/telekom-and-perplexity-bring-ai-to-smartphones',
  'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro',
  'https://www.perplexity.ai/pro',
  'https://www.perplexity.ai/pricing',
  'https://www.airtel.in/perplexity-pro',
  'https://www.softbank.jp/mobile/special/perplexity/'
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'en-US'
  });
  const page = await context.newPage();

  const results: UrlCheck[] = [];

  for (const url of URLS_TO_TEST) {
    try {
      console.log(`Checking: ${url}`);
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const title = await page.title();
      const finalUrl = page.url();
      const status = res?.status();
      const text = (await page.innerText('body')).replace(/\s+/g, ' ').trim();
      
      const is404 = status === 404 || 
        title.toLowerCase().includes('not found') || 
        title.toLowerCase().includes('page not found') || 
        title.toLowerCase().includes('404') ||
        finalUrl.includes('page-not-found') ||
        finalUrl.includes('/404');

      results.push({
        url,
        finalUrl,
        status,
        title,
        is404,
        hasOfferContent: text.length > 200 && !is404,
        snippet: text.slice(0, 160)
      });
    } catch(err: any) {
      console.error(`Error on ${url}:`, err.message);
      results.push({
        url,
        finalUrl: 'ERROR',
        status: 0,
        title: 'ERROR: ' + err.message,
        is404: true,
        hasOfferContent: false,
        snippet: ''
      });
    }
  }

  await browser.close();

  console.log('\n=== COMPLETE URL FORENSIC REPORT ===\n');
  for (const r of results) {
    const mark = r.is404 ? '❌ BROKEN (404)' : '✅ ACTIVE (200)';
    console.log(`${mark} | ${r.url}`);
    console.log(`   Final: ${r.finalUrl}`);
    console.log(`   Title: ${r.title}`);
    console.log(`   Snippet: "${r.snippet}"`);
    console.log('');
  }
}

run();
