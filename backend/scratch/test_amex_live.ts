import { chromium } from 'playwright';

async function testAmex() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum',
    'https://global.americanexpress.com/card-benefits/detail/openai',
    'https://www.americanexpress.com/us/credit-cards/business-cards/business-platinum-credit-card-amex/',
  ];

  for (const url of urls) {
    console.log('\n==================================================');
    console.log('TESTING URL:', url);
    const redirects: string[] = [];
    page.on('response', response => {
      const status = response.status();
      if (status >= 300 && status < 400) {
        redirects.push(`${response.url()} -> ${status} -> ${response.headers()['location']}`);
      }
    });

    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      const status = res?.status() || 0;
      const finalUrl = page.url();
      const title = await page.title();
      console.log('HTTP Status:', status);
      console.log('Redirect Chain:', redirects);
      console.log('Final URL:', finalUrl);
      console.log('Page Title:', title);
      
      const bodyText = await page.locator('body').innerText().catch(() => '');
      console.log('Body Text Preview (first 300 chars):', bodyText.slice(0, 300).replace(/\n+/g, ' '));
      
      const hasChatGPT = /chatgpt/i.test(bodyText);
      const hasOpenAI = /openai/i.test(bodyText);
      const hasCredit = /300|credit|statement/i.test(bodyText);
      console.log('AI Evidence Detected:', { hasChatGPT, hasOpenAI, hasCredit });
    } catch (err: any) {
      console.error('Error navigating to', url, ':', err.message);
    }
  }

  await browser.close();
}

testAmex().catch(err => {
  console.error(err);
  process.exit(1);
});
