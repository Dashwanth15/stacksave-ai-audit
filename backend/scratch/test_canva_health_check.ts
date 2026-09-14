import { chromium } from 'playwright';
import { checkOfferDestination } from '../src/pricing/offerDestinationHealthCheck';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();
  
  console.log('Testing Canva destination with offerDestinationHealthCheck:');
  const res = await checkOfferDestination(page, 'https://www.canva.com/education/', 20000);
  console.log('OFFER_DESTINATION_HEALTH_CHECK_RESULT:');
  console.log(JSON.stringify(res, null, 2));

  await browser.close();
}

run().catch(console.error);
