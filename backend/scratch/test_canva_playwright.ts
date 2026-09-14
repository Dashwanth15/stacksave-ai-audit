import { chromium } from 'playwright';

async function testCanva() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const candidates = [
    'https://www.canva.com/education/',
    'https://www.canva.com/en_us/education/',
    'https://www.canva.com/pricing/',
    'https://www.canva.com/help/article/canva-for-education/',
  ];

  for (const url of candidates) {
    console.log(`\n==================================================`);
    console.log(`PROBING: ${url}`);
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);
      const status = res?.status() || 0;
      const finalUrl = page.url();
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText || '').catch(() => '');
      
      console.log(`HTTP Status: ${status}`);
      console.log(`Final URL: ${finalUrl}`);
      console.log(`Page Title: ${title}`);
      console.log(`Body text length: ${bodyText.length}`);

      const isChallenge = bodyText.includes('Verify you are human') || 
                          bodyText.includes('Attention Required! | Cloudflare') || 
                          title.includes('Just a moment...') ||
                          title.includes('Attention Required');
      
      console.log(`Cloudflare Challenge Detected: ${isChallenge}`);

      // Check for education / AI / free offer evidence in text
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
      const relevant = lines.filter(l => /education|student|teacher|k-12|free|magic studio|ai/i.test(l));
      console.log(`Relevant evidence lines (found ${relevant.length}):`);
      for (const line of relevant.slice(0, 5)) {
        console.log(`  - "${line}"`);
      }
    } catch (err: any) {
      console.log(`Error testing ${url}: ${err.message}`);
    }
  }

  await browser.close();
}

testCanva().catch(console.error);
