import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  console.log('=== Reading Education Pro Help Center Article ===');
  await page.goto('https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro', { waitUntil: 'domcontentloaded' });
  const articleText = await page.innerText('article, main, body');
  console.log(articleText);

  console.log('\n=== Checking student landing / onboarding URL ===');
  try {
    await page.goto('https://www.perplexity.ai/onboarding?login-new=false&login-source=studentLandingPage', { waitUntil: 'networkidle', timeout: 25000 });
    const text = await page.innerText('body');
    console.log('Student onboarding page body snippet:');
    console.log(text.substring(0, 2000));
  } catch (e: any) {
    console.log('Error on onboarding page:', e.message);
  }

  await browser.close();
}

main();
