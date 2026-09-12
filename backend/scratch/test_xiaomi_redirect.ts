/**
 * Test if Xiaomi FAQ URL redirects to 404 page
 */

import { chromium } from 'playwright';

async function testXiaomiUrl() {
  const url = 'https://www.mi.com/global/support/faq/details/KA-100223/';
  
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('TESTING XIAOMI URL REDIRECT');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
  console.log(`Original URL: ${url}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('[1] Navigating...');
    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    console.log(`[2] Initial Response Status: ${response?.status()}`);
    console.log(`[3] Final URL after redirects: ${page.url()}`);
    console.log(`[4] Page Title: ${await page.title()}`);
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`[5] Page Content (first 500 chars):`);
    console.log(bodyText.substring(0, 500));
    console.log('');

    const is404Page = 
      page.url().includes('/errors/404') ||
      page.url().includes('/404') ||
      bodyText.toLowerCase().includes('404') ||
      bodyText.toLowerCase().includes('oops') ||
      bodyText.toLowerCase().includes('page you\'re looking for cannot be reached') ||
      bodyText.toLowerCase().includes('page not found');

    console.log(`[6] Is 404 Page? ${is404Page}`);
    
    if (page.url() !== url) {
      console.log(`\n⚠️  REDIRECT DETECTED:`);
      console.log(`   FROM: ${url}`);
      console.log(`   TO:   ${page.url()}`);
    }

    if (is404Page) {
      console.log(`\n❌ CRITICAL BUG CONFIRMED:`);
      console.log(`   The Xiaomi offer URL redirects to a 404 page!`);
      console.log(`   This offer should be marked as UNAVAILABLE.`);
    } else {
      console.log(`\n✅ URL appears valid (no 404 detected)`);
    }

  } catch (err: any) {
    console.log(`[ERROR] ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════════\n');
}

testXiaomiUrl().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
