import { chromium } from 'playwright';

async function testTelekom() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const url = 'https://www.telekom.de/unterwegs/tarife-und-optionen/perplexity-pro';
  console.log('TESTING TELEKOM URL:', url);
  
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const status = res?.status() || 0;
    const finalUrl = page.url();
    const title = await page.title();
    const content = await page.content();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    
    console.log('HTTP Status:', status);
    console.log('Final URL:', finalUrl);
    console.log('Page Title:', title);
    console.log('Body text length:', bodyText.length);
    
    // Check for German or English terms
    const hasPerplexity = /perplexity/i.test(bodyText);
    const monthsMatch = /(\d+)\s*(?:monate|months|monat)/i.exec(bodyText);
    const gratisMatch = /(?:kostenlos|gratis|free|0\s*€|0\s*euro)/i.exec(bodyText);
    const kundMatch = /(?:telekom|mobilfunk|kunden|vertrag|tarife)/i.exec(bodyText);
    
    console.log('Perplexity found:', hasPerplexity);
    console.log('Months match:', monthsMatch ? monthsMatch[0] : 'None');
    console.log('Gratis/Cost match:', gratisMatch ? gratisMatch[0] : 'None');
    console.log('Customer match:', kundMatch ? kundMatch[0] : 'None');
    
    // Extract relevant lines
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
    const perplexityLines = lines.filter(l => /perplexity|monat|kosten|pro/i.test(l));
    console.log('Relevant lines (up to 10):', perplexityLines.slice(0, 10));
  } catch (err: any) {
    console.error('Telekom test error:', err.message);
  }

  await browser.close();
}

testTelekom().catch(err => {
  console.error(err);
  process.exit(1);
});
