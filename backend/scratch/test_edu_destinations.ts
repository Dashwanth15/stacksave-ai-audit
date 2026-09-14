import { chromium } from 'playwright';

async function testUrls() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const urlsToTest = [
    'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro',
    'https://www.perplexity.ai/hub/pricing',
    'https://www.perplexity.ai/pro',
    'https://www.perplexity.ai/enterprise/use-cases/education',
  ];

  for (const url of urlsToTest) {
    console.log(`\nTesting: ${url}`);
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('Status:', res?.status());
      console.log('Final URL:', page.url());
      const title = await page.title();
      console.log('Title:', title);
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }

  await browser.close();
}

testUrls();
