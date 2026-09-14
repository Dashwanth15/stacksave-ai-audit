import { chromium } from 'playwright';

async function verifySpecifics() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  });

  console.log('=== RUNNING TARGETED QA PROBES ===\n');

  // 1. Google Pixel Live Promo Probe
  console.log('--- Probing Google Store for Pixel AI Promotion ---');
  const pixelPage = await context.newPage();
  try {
    const res = await pixelPage.goto('https://store.google.com/category/phones', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = res?.status();
    const finalUrl = pixelPage.url();
    const title = await pixelPage.title();
    const body = await pixelPage.innerText('body').catch(() => '');

    console.log(`[Google Pixel] Status: ${status} | Final URL: ${finalUrl} | Title: ${title}`);
    
    // Look for Google One AI Premium or Gemini mentions on phone store
    const aiMatches = body.match(/Google\s+(?:One\s+)?AI\s+Premium[\s\S]{0,150}?(?:month|year|free|\$)/gi) || [];
    console.log('[Google Pixel] AI Mentions found:', aiMatches.slice(0, 3));

    // Look for Pixel model names (Pixel 9 Pro vs Pixel 10 Pro)
    const hasPixel9 = /Pixel\s+9\s+Pro/i.test(body);
    const hasPixel10 = /Pixel\s+10\s+Pro/i.test(body);
    console.log(`[Google Pixel] Mentions Pixel 9 Pro: ${hasPixel9} | Mentions Pixel 10 Pro: ${hasPixel10}`);

    // Check specific terms
    const promoSnippets = body.split('\n').filter(l => 
      l.toLowerCase().includes('google one') && (l.toLowerCase().includes('ai') || l.toLowerCase().includes('gemini') || l.toLowerCase().includes('year'))
    );
    console.log('[Google Pixel] Promo snippets:', promoSnippets.slice(0, 4));

  } catch (err: any) {
    console.error('[Google Pixel] Error:', err.message);
  } finally {
    await pixelPage.close();
  }

  // Also check one.google.com terms for Pixel offer
  console.log('\n--- Probing Google One Terms for Pixel Offer ---');
  const termsPage = await context.newPage();
  try {
    const res = await termsPage.goto('https://one.google.com/terms-of-service', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const body = await termsPage.innerText('body').catch(() => '');
    const pixelTerms = body.split('\n').filter(l => l.toLowerCase().includes('pixel') || (l.toLowerCase().includes('offer') && l.toLowerCase().includes('ai')));
    console.log('[Google One Terms] Snippets:', pixelTerms.slice(0, 3));
  } catch (err: any) {
    console.error('[Google One Terms] Error:', err.message);
  } finally {
    await termsPage.close();
  }

  // 2. Samsung Galaxy AI Probe
  console.log('\n--- Probing Samsung for Galaxy AI Commercial Entitlements ---');
  const samsungPage = await context.newPage();
  try {
    const res = await samsungPage.goto('https://www.samsung.com/us/smartphones/galaxy-s24-ultra/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = res?.status();
    const title = await samsungPage.title();
    const body = await samsungPage.innerText('body').catch(() => '');

    console.log(`[Samsung S24] Status: ${status} | Title: ${title}`);
    
    // Check if Samsung offers Google AI Pro / Google One or if it's purely built-in Galaxy AI
    const googleOneMatch = body.match(/Google\s+(?:One|AI|Gemini)[\s\S]{0,100}?(?:free|included|trial|subscription)/gi) || [];
    console.log('[Samsung S24] Google AI bundle match:', googleOneMatch.slice(0, 3));

    // Check Galaxy AI terms disclaimer
    const disclaimerMatch = body.match(/Galaxy\s+AI\s+features\s+will\s+be\s+provided\s+for\s+free\s+until\s+the\s+end\s+of\s+2025/i);
    console.log('[Samsung S24] Built-in Galaxy AI disclaimer match:', disclaimerMatch ? disclaimerMatch[0] : 'None found');
  } catch (err: any) {
    console.error('[Samsung S24] Error:', err.message);
  } finally {
    await samsungPage.close();
  }

  // Also check Samsung Galaxy S25 / promotions page
  console.log('\n--- Probing Samsung S25 / Promotions Page ---');
  const samsungPromoPage = await context.newPage();
  try {
    const res = await samsungPromoPage.goto('https://www.samsung.com/us/smartphones/galaxy-s25-ultra/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = res?.status();
    const title = await samsungPromoPage.title();
    const body = await samsungPromoPage.innerText('body').catch(() => '');
    console.log(`[Samsung S25] Status: ${status} | Title: ${title}`);

    const s25AiBundle = body.match(/Google\s+(?:One\s+)?AI[\s\S]{0,100}?(?:month|free|subscription)/gi) || [];
    console.log('[Samsung S25] AI bundle match:', s25AiBundle.slice(0, 3));

    const s25Disclaimer = body.match(/Galaxy\s+AI[\s\S]{0,80}?(?:free|fee|subscription|end\s+of)/gi) || [];
    console.log('[Samsung S25] Disclaimers:', s25Disclaimer.slice(0, 3));
  } catch (err: any) {
    console.error('[Samsung S25] Error:', err.message);
  } finally {
    await samsungPromoPage.close();
  }

  // 3. American Express Probe
  console.log('\n--- Probing American Express Business Platinum ChatGPT Benefit ---');
  const amexPage = await context.newPage();
  try {
    const res = await amexPage.goto('https://www.americanexpress.com/us/credit-cards/business-cards/business-platinum-credit-card-amex/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const status = res?.status();
    const title = await amexPage.title();
    const body = await amexPage.innerText('body').catch(() => '');
    console.log(`[Amex Platinum] Status: ${status} | Title: ${title}`);

    // Search for ChatGPT / AI / Technology credits
    const chatgptMatches = body.match(/ChatGPT[\s\S]{0,100}?(?:\$|credit|statement)/gi) || [];
    console.log('[Amex Platinum] ChatGPT matches:', chatgptMatches);

    const techCredits = body.match(/\$300[\s\S]{0,100}?(?:credit|statement|technology|software)/gi) || [];
    console.log('[Amex Platinum] $300 Credit matches:', techCredits.slice(0, 3));

    const allCredits = body.split('\n').filter(l => 
      l.includes('$') && (l.toLowerCase().includes('statement credit') || l.toLowerCase().includes('credit'))
    );
    console.log('[Amex Platinum] Statement credits listed:', allCredits.slice(0, 5));
  } catch (err: any) {
    console.error('[Amex Platinum] Error:', err.message);
  } finally {
    await amexPage.close();
  }

  await browser.close();
}

verifySpecifics().catch(console.error);
