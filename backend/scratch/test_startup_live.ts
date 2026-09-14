import { chromium } from 'playwright';

async function testStartupPages() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const targets = [
    { name: 'Notion Startups', url: 'https://www.notion.com/startups' },
    { name: 'ElevenLabs Startups', url: 'https://elevenlabs.io/startup-grants' },
    { name: 'Vercel Startups', url: 'https://vercel.com/startups' },
    { name: 'Google Pixel', url: 'https://store.google.com/category/phones' },
    { name: 'Amex Business Platinum', url: 'https://global.americanexpress.com/card-benefits/detail/chatgpt-business-credit/business-platinum' },
  ];

  for (const t of targets) {
    console.log('\n==================================================');
    console.log('TESTING:', t.name, 'URL:', t.url);
    try {
      const res = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);
      const status = res?.status() || 0;
      const title = await page.title();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      
      console.log('HTTP Status:', status);
      console.log('Final URL:', page.url());
      console.log('Page Title:', title);
      console.log('Body Text Length:', bodyText.length);
      
      // Look for dollar values, duration, credits
      const dollarMatches = bodyText.match(/\$[\d,]+(?:\.\d+)?/g) || [];
      const monthMatches = bodyText.match(/\b\d+\s*(?:month|year)s?\b/gi) || [];
      console.log('Dollar matches found:', dollarMatches.slice(0, 10));
      console.log('Duration matches found:', monthMatches.slice(0, 5));
      
      // Look for lines containing credits / grants / ai
      const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 20);
      const relevantLines = lines.filter(l => /\$|credit|free|ai|grant|plan|month/i.test(l));
      console.log('Relevant lines (up to 5):', relevantLines.slice(0, 5));
    } catch (err: any) {
      console.error('Error testing', t.name, err.message);
    }
  }

  await browser.close();
}

testStartupPages().catch(err => {
  console.error(err);
  process.exit(1);
});
