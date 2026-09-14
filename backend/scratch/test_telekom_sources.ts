import { chromium } from 'playwright';

async function testTelekomSources() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    'https://www.telekom.de/unterwegs/smartphones-und-tablets/t-phone-2-pro',
    'https://www.telekom.de/unterwegs/smartphones-und-tablets/t-tablet',
  ];

  for (const url of urls) {
    console.log('\n==================================================');
    console.log('TESTING URL:', url);
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const status = res?.status() || 0;
      const title = await page.title();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      
      console.log('HTTP Status:', status);
      console.log('Final URL:', page.url());
      console.log('Page Title:', title);
      
      const hasPerplexity = /perplexity/i.test(bodyText);
      console.log('Perplexity in text:', hasPerplexity);
      
      const lines = bodyText.split('\n').filter(l => /perplexity|18 monate|12 monate/i.test(l));
      console.log('Matching lines:', lines.slice(0, 5));
    } catch (err: any) {
      console.error('Error on', url, err.message);
    }
  }

  await browser.close();
}

testTelekomSources().catch(err => {
  console.error(err);
  process.exit(1);
});
