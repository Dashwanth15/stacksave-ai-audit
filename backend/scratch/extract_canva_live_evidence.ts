import { chromium } from 'playwright';

async function extractCanvaEvidence() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const url = 'https://www.canva.com/education/';
  console.log(`Navigating to: ${url}...`);

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(3000);

  const status = response?.status() || 0;
  const finalUrl = page.url();
  const title = await page.title();

  // Headings
  const h1 = await page.locator('h1').allInnerTexts().catch(() => []);
  const h2 = await page.locator('h2').allInnerTexts().catch(() => []);

  // Body text
  const bodyText = await page.evaluate(() => document.body.innerText || '');

  // Specific evidence phrases
  const has100Free = bodyText.includes('100% free') || bodyText.includes('free');
  const hasAI = /classroom-ready ai|magic studio|ai you can trust|ai/i.test(bodyText);
  const hasK12 = /k–12|k-12|higher ed|teachers|students|classroom/i.test(bodyText);
  const isExpired = /expired|ended|no longer available/i.test(bodyText);

  // Extract key paragraphs
  const paragraphs = await page.locator('p').allInnerTexts().catch(() => []);
  const relevantParagraphs = paragraphs
    .map(p => p.trim())
    .filter(p => p.length > 25 && /free|ai|learn|teach|student|classroom/i.test(p));

  console.log('CANVA FOR EDUCATION LIVE AUDIT RESULTS:');
  console.log('HTTP Status:', status);
  console.log('Final URL:', finalUrl);
  console.log('Page Title:', title);
  console.log('H1 Headings:', h1);
  console.log('H2 Headings (first 4):', h2.slice(0, 4));
  console.log('Contains "100% Free":', has100Free);
  console.log('Contains Classroom AI:', hasAI);
  console.log('Contains K-12 / Education:', hasK12);
  console.log('Is Expired:', isExpired);
  console.log('\nExtracted Evidence Paragraphs:');
  relevantParagraphs.slice(0, 6).forEach((p, i) => console.log(`  [${i+1}] "${p}"`));

  await browser.close();
}

extractCanvaEvidence().catch(console.error);
