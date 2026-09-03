import { chromium } from 'playwright';

async function testPerpParser() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });

  await page.goto('https://www.perplexity.ai/pro', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  const res = await page.evaluate(() => {
    const bodyText = document.body.innerText || '';
    const plans: any[] = [];
    const offers: any[] = [];

    plans.push({ id: 'standard', label: 'Standard Free', monthlyPricePerSeat: 0, currency: 'USD' });

    // Pro
    const proMatch = /\$(\d+(?:\.\d+)?)\s*(?:\/month|\/mo)[\s\S]{0,60}?(?:billed annually|equivalent)/i.exec(bodyText);
    const proPrice = proMatch ? parseFloat(proMatch[1]) : null;
    if (proPrice !== null && proPrice > 0) {
      plans.push({ id: 'pro', label: 'Perplexity Pro', monthlyPricePerSeat: proPrice, annualPricePerSeat: proPrice, currency: 'USD' });
    }

    // Max (in section following "Get Pro")
    const getProIdx = bodyText.indexOf('Get Pro');
    if (getProIdx !== -1) {
      const maxSection = bodyText.slice(getProIdx);
      const maxMatch = /\$(\d+(?:\.\d+)?)\s*(?:\/month|\/mo)/i.exec(maxSection);
      const maxPrice = maxMatch ? parseFloat(maxMatch[1]) : null;
      if (maxPrice !== null && maxPrice > 0) {
        plans.push({ id: 'max', label: 'Perplexity Max', monthlyPricePerSeat: maxPrice, annualPricePerSeat: maxPrice, currency: 'USD' });
      }
    }

    // Computer Bonus credits offers
    const proCreditsMatch = bodyText.match(/\+\$(\d+)\s+free\s+Computer\s+credits\s+LIMITED\s+TIME[\s\S]{0,60}?Popular/i) ||
      bodyText.match(/\+\$(\d+)\s+free\s+Computer\s+credits/i);
    if (proCreditsMatch) {
      const creditsAmt = proCreditsMatch[1];
      const evidence = proCreditsMatch[0].replace(/\n+/g, ' ').trim();
      offers.push({
        title: 'Perplexity Pro Computer Credits Promotion',
        evidenceText: evidence,
        discount: `+$${creditsAmt} Free Credits`,
      });
    }

    const maxCreditsMatch = bodyText.match(/\+\$(\d+)\s+free\s+Computer\s+credits\s+LIMITED\s+TIME[\s\S]{0,60}?Unlimited/i);
    if (maxCreditsMatch) {
      const creditsAmt = maxCreditsMatch[1];
      const evidence = maxCreditsMatch[0].replace(/\n+/g, ' ').trim();
      offers.push({
        title: 'Perplexity Max Computer Credits Promotion',
        evidenceText: evidence,
        discount: `+$${creditsAmt} Free Credits`,
      });
    }

    return { plans, offers };
  });

  console.log('Parsed result:', JSON.stringify(res, null, 2));
  await browser.close();
}

testPerpParser().catch(console.error);
