import { chromium } from 'playwright';

interface Target {
  name: string;
  url: string;
}

const targets: Target[] = [
  { name: 'Google Pixel', url: 'https://store.google.com/category/phones' },
  { name: 'American Express', url: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum' },
  { name: 'Deutsche Telekom', url: 'https://www.telekom.com/en/newsroom/latest-updates/media-information/2024/11/ai-for-everyone' },
  { name: 'ASUS', url: 'https://press.asus.com/news/press-releases/chromebook-plus-google-one-ai-premium-offer/' },
  { name: 'Notion Education', url: 'https://www.notion.com/product/notion-for-education' },
  { name: 'Canva Education', url: 'https://www.canva.com/education/' },
  { name: 'Figma Education', url: 'https://www.figma.com/education/' },
  { name: 'Notion Startups', url: 'https://www.notion.com/startups' },
  { name: 'ElevenLabs Startups', url: 'https://elevenlabs.io/startup-grants' },
  { name: 'v0 Startups', url: 'https://vercel.com/startups' },
];

async function verifyAllViewOffers() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results: any[] = [];

  for (const t of targets) {
    console.log(`Checking [${t.name}]: ${t.url}...`);
    try {
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      const status = res?.status() || 0;
      const finalUrl = page.url();
      const title = await page.title();
      const is404 = status === 404 || /404|not found/i.test(title);
      const isExpired = /expired|ended|no longer available/i.test(title);

      results.push({
        name: t.name,
        destinationUrl: t.url,
        httpStatus: status,
        finalUrl,
        pageTitle: title.slice(0, 60),
        is404,
        isExpired,
        result: (status >= 200 && status < 400 && !is404 && !isExpired) ? 'VALID_ACTIVE' : 'FAILED',
      });
    } catch (err: any) {
      results.push({
        name: t.name,
        destinationUrl: t.url,
        httpStatus: 0,
        finalUrl: t.url,
        pageTitle: err.message,
        is404: true,
        isExpired: false,
        result: 'ERROR: ' + err.message,
      });
    }
  }

  console.log('\n==================================================');
  console.log('EXACT VIEW OFFER URL VERIFICATION RESULTS:');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
}

verifyAllViewOffers().catch(console.error);
