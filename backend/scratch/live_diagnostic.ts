import { chromium } from 'playwright';

async function diagnose() {
  console.log('--- STARTING LIVE FORENSIC DIAGNOSTIC ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });

  const urls = [
    { provider: 'Google Gemini AI Premium', url: 'https://one.google.com/about/ai-premium' },
    { provider: 'Google Gemini Student', url: 'https://one.google.com/ai-student' },
    { provider: 'Google Gemini Advanced', url: 'https://gemini.google.com/advanced' },
    { provider: 'Perplexity Pro', url: 'https://www.perplexity.ai/pro' },
    { provider: 'Perplexity Enterprise', url: 'https://www.perplexity.ai/enterprise' },
    { provider: 'GitHub Models', url: 'https://github.com/marketplace/models' },
    { provider: 'OpenAI Codex', url: 'https://openai.com/codex' },
  ];

  for (const item of urls) {
    console.log(`\n========================================`);
    console.log(`PROBING: ${item.provider} (${item.url})`);
    console.log(`========================================`);
    const page = await context.newPage();
    try {
      const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const status = response ? response.status() : 0;
      const finalUrl = page.url();
      console.log(`HTTP Status: ${status}`);
      console.log(`Final URL: ${finalUrl}`);

      // Wait a few seconds for hydration
      await page.waitForTimeout(3000);

      const title = await page.title();
      console.log(`Page Title: ${title}`);

      const bodyText = await page.evaluate(() => document.body.innerText || '');
      console.log(`Body Length: ${bodyText.length}`);
      console.log(`Body Snippet (first 500 chars):\n${bodyText.slice(0, 500)}`);

      // Search for pricing patterns
      const dollarMatches = bodyText.match(/\$\d+(?:\.\d+)?(?:\s*\/\s*(?:mo|month|yr|year|user|seat))?/gi) || [];
      console.log(`Dollar amounts found in text:`, Array.from(new Set(dollarMatches)).slice(0, 10));

      // Check for JSON-LD
      const jsonLd = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        return scripts.map(s => s.textContent);
      });
      console.log(`JSON-LD count: ${jsonLd.length}`);
      if (jsonLd.length > 0) {
        console.log(`JSON-LD sample: ${jsonLd[0]?.slice(0, 300)}`);
      }

      // Check specific keywords
      const hasStudent = /student|university|education|\.edu|sheerid/i.test(bodyText);
      const hasPro = /pro|advanced|premium/i.test(bodyText);
      const hasFree = /free|trial|no cost/i.test(bodyText);
      console.log(`Keyword flags -> student: ${hasStudent}, pro/adv/prem: ${hasPro}, free/trial: ${hasFree}`);

    } catch (err: any) {
      console.log(`ERROR probing ${item.url}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\n--- DIAGNOSTIC COMPLETE ---');
}

diagnose().catch(console.error);
