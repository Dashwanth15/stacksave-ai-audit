import { chromium } from 'playwright';

async function testFullPerp() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  const sourceUrl = 'https://www.perplexity.ai/pro';

  console.log('Navigating to', sourceUrl);
  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const extraction = await page.evaluate(() => {
    const title = document.title || '';
    const bodyText = document.body.innerText || '';
    const plans: any[] = [];
    const offers: any[] = [];

    plans.push({ id: 'standard', label: 'Standard Free', monthlyPricePerSeat: 0, currency: 'USD' });

    const proMatch = /\$(\d+(?:\.\d+)?)\s*(?:\/month|\/mo)[\s\S]{0,60}?(?:billed annually|equivalent)/i.exec(bodyText) ||
      /\$(\d+(?:\.\d+)?)\s*(?:\/month|\/mo)/i.exec(bodyText);
    const proAnnualPrice = proMatch ? parseFloat(proMatch[1]) : null;

    if (proAnnualPrice !== null && proAnnualPrice > 0) {
      plans.push({
        id: 'pro',
        label: 'Perplexity Pro',
        monthlyPricePerSeat: proAnnualPrice,
        annualPricePerSeat: proAnnualPrice,
        currency: 'USD',
      });
    }

    const getProIdx = bodyText.indexOf('Get Pro');
    if (getProIdx !== -1) {
      const maxSection = bodyText.slice(getProIdx);
      const maxMatch = /\$(\d+(?:\.\d+)?)\s*(?:\/month|\/mo)/i.exec(maxSection);
      const maxPrice = maxMatch ? parseFloat(maxMatch[1]) : null;
      if (maxPrice !== null && maxPrice > 0) {
        plans.push({
          id: 'max',
          label: 'Perplexity Max',
          monthlyPricePerSeat: maxPrice,
          annualPricePerSeat: maxPrice,
          currency: 'USD',
        });
      }
    }

    return {
      title,
      isBlocked: title.includes('Just a moment...') || title.includes('Cloudflare'),
      bodyLength: bodyText.length,
      proAnnualPrice,
      plans,
      offers,
    };
  });

  console.log('Extraction evaluated:', JSON.stringify(extraction, null, 2));
  await browser.close();
}

testFullPerp().catch(console.error);
