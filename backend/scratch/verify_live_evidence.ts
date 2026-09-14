import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  console.log('--- 1. Perplexity Help Center: Education Pro ---');
  try {
    const res = await page.goto('https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('HTTP Status:', res?.status());
    const title = await page.title();
    console.log('Title:', title);
    const bodyText = await page.innerText('body');
    console.log('Snippet:', bodyText.substring(0, 1000).replace(/\n+/g, ' '));
  } catch (err: any) {
    console.error('Error fetching Education Pro article:', err.message);
  }

  console.log('\n--- 2. Perplexity Pricing / Onboarding / Hub Page ---');
  try {
    const res = await page.goto('https://www.perplexity.ai/hub/pricing', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Pricing Status:', res?.status());
    const title = await page.title();
    console.log('Title:', title);
    const bodyText = await page.innerText('body');
    const hasEdu = bodyText.toLowerCase().includes('education');
    console.log('Mentions education:', hasEdu);
    if (hasEdu) {
      const match = bodyText.match(/.{0,100}education.{0,100}/gi);
      console.log('Matches:', match?.slice(0, 5));
    }
  } catch (err: any) {
    console.error('Error fetching Perplexity pricing:', err.message);
  }

  console.log('\n--- 3. Airtel Perplexity Promo Help Center ---');
  try {
    const res = await page.goto('https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Airtel Promo Article Status:', res?.status());
    const title = await page.title();
    console.log('Title:', title);
    const bodyText = await page.innerText('body');
    console.log('Snippet:', bodyText.substring(0, 1000).replace(/\n+/g, ' '));
  } catch (err: any) {
    console.error('Error fetching Airtel promo article:', err.message);
  }

  console.log('\n--- 4. Airtel Destination URL (https://www.airtel.in/perplexity-pro) ---');
  try {
    const res = await page.goto('https://www.airtel.in/perplexity-pro', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Airtel Destination Status:', res?.status());
    console.log('Airtel Final URL:', page.url());
    const title = await page.title();
    console.log('Title:', title);
    const bodyText = await page.innerText('body');
    console.log('Has perplexity mentioned:', bodyText.toLowerCase().includes('perplexity'));
  } catch (err: any) {
    console.error('Error fetching Airtel destination:', err.message);
  }

  console.log('\n--- 5. Nothing Destination URL (https://nothing.tech/pages/news) ---');
  try {
    const res = await page.goto('https://nothing.tech/pages/news', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Nothing Destination Status:', res?.status());
    console.log('Nothing Final URL:', page.url());
    const title = await page.title();
    console.log('Title:', title);
  } catch (err: any) {
    console.error('Error fetching Nothing destination:', err.message);
  }

  await browser.close();
}

main();
