import { chromium } from 'playwright';

async function detailedProbe() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    viewport: { width: 1280, height: 800 },
  });

  console.log('=== DETAILED PROBE: GEMINI ===');
  const pageGemini = await context.newPage();
  await pageGemini.goto('https://one.google.com/about/google-ai-plans/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await pageGemini.waitForTimeout(3000);

  const geminiData = await pageGemini.evaluate(() => {
    const text = document.body.innerText || '';
    
    // Find all plan cards / pricing sections
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, [role="heading"]')).map(h => h.textContent?.trim());
    
    // Search for offer banner text
    const bannerMatch = text.match(/students save.*?(?:see offers|\.)/i) || text.match(/students.*?(?:gemini|pro|youtube).*?(?:\n|\.)/i);
    const offerBanner = bannerMatch ? bannerMatch[0].trim() : null;

    // Search for plans
    const cards = Array.from(document.querySelectorAll('*')).filter(el => {
      const t = el.textContent || '';
      return (t.includes('Google AI Pro') || t.includes('Google AI Plus') || t.includes('Google AI Ultra') || t.includes('AI Premium')) && t.length < 300;
    }).map(el => el.textContent?.trim());

    return {
      title: document.title,
      offerBanner,
      headings: headings.slice(0, 15),
      sampleCards: cards.slice(0, 5),
      fullTextSnippet: text.slice(0, 1500)
    };
  });
  console.log('Gemini Data:', JSON.stringify(geminiData, null, 2));
  await pageGemini.close();

  console.log('\n=== DETAILED PROBE: PERPLEXITY PRO ===');
  const pagePerp = await context.newPage();
  await pagePerp.goto('https://www.perplexity.ai/pro', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await pagePerp.waitForTimeout(3000);

  const perpData = await pagePerp.evaluate(() => {
    const text = document.body.innerText || '';

    // Look for toggle buttons (Monthly / Annual)
    const buttons = Array.from(document.querySelectorAll('button, [role="tab"], [role="switch"], [role="radio"]')).map(b => ({
      text: b.textContent?.trim(),
      ariaChecked: b.getAttribute('aria-checked'),
      ariaSelected: b.getAttribute('aria-selected'),
      className: b.className
    }));

    // Find price strings
    const priceElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const t = el.textContent || '';
      return /^\$\d+(?:\.\d+)?$/.test(t.trim()) || /^\$\d+\s*\/\s*(?:mo|month|yr|year)$/i.test(t.trim());
    }).map(el => el.textContent?.trim());

    // Search for Pro plan card context
    const proCardText = Array.from(document.querySelectorAll('*')).find(el => {
      const t = el.textContent || '';
      return t.includes('Perplexity Computer') && t.includes('Popular') && t.length < 500;
    })?.textContent?.trim();

    return {
      title: document.title,
      buttons: buttons.filter(b => (b.text || '').toLowerCase().includes('annual') || (b.text || '').toLowerCase().includes('month')),
      priceElements: Array.from(new Set(priceElements)),
      proCardText,
      fullTextSnippet: text.slice(0, 1500)
    };
  });
  console.log('Perplexity Data:', JSON.stringify(perpData, null, 2));

  // Let's test clicking the monthly toggle on Perplexity if available
  try {
    const monthlyToggle = await pagePerp.$('button:has-text("Monthly"), [role="tab"]:has-text("Monthly"), [role="radio"]:has-text("Monthly")');
    if (monthlyToggle) {
      console.log('Found monthly toggle, clicking...');
      await monthlyToggle.click();
      await pagePerp.waitForTimeout(1500);
      const afterClickPrices = await pagePerp.evaluate(() => {
        const text = document.body.innerText || '';
        return text.slice(0, 1500);
      });
      console.log('Perplexity Text after clicking Monthly:\n', afterClickPrices);
    }
  } catch (err: any) {
    console.log('Toggle click error:', err.message);
  }

  await pagePerp.close();
  await browser.close();
}

detailedProbe().catch(console.error);
