import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const urls = [
    'https://www.jio.com/google-gemini-offer/',
    'https://www.jio.com/jcms/en-in/jio-google-gemini-terms-and-conditions/',
    'https://www.jio.com/fiber/',
    'https://www.jio.com/help/faq/mobile/offers/google-gemini-offer/'
  ];

  for (const u of urls) {
    try {
      console.log('--- Testing:', u);
      const res = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(2000);
      const title = await page.title();
      const finalUrl = page.url();
      const status = res?.status();
      const text = await page.innerText('body');
      const is404 = title.toLowerCase().includes('not found') || finalUrl.includes('page-not-found');
      console.log(`URL: ${u}`);
      console.log(`Final URL: ${finalUrl}`);
      console.log(`Status: ${status}`);
      console.log(`Title: ${title}`);
      console.log(`Is404: ${is404}`);
      console.log(`Text Length: ${text.length}`);
      console.log(`Snippet: "${text.replace(/\s+/g, ' ').slice(0, 150)}"`);
    } catch(err: any) {
      console.error('Error testing', u, err.message);
    }
  }
  await browser.close();
}

test();
