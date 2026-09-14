import { chromium } from 'playwright';
import { PlaywrightOfferResearchAgent } from '../src/pricing/offerResearchAgent';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  const url = 'https://www.telekom.de/unterwegs/tarife-und-optionen/perplexity-pro';
  const probe = await PlaywrightOfferResearchAgent.probeDestination(context, url);
  console.log('PROBE RESULT FOR TELEKOM:', {
    initialHttpStatus: probe.initialHttpStatus,
    finalHttpStatus: probe.finalHttpStatus,
    finalUrl: probe.finalUrl,
    isSoft404: probe.isSoft404,
    pageTitle: probe.pageTitle,
    bodyLength: probe.bodyText.length,
    bodyPreview: probe.bodyText.slice(0, 200),
  });

  await browser.close();
}

test().catch(console.error);
