/**
 * VERIFICATION: Live Perplexity pages and partner pages
 */

import { chromium } from 'playwright';

async function verifyLivePages(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('LIVE PAGE VERIFICATION');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Check actual Perplexity signup/pricing with education tab
    console.log('1. PERPLEXITY SIGNUP PAGE (Education Tab)');
    console.log('   URL: https://www.perplexity.ai/onboarding?login_new=false&login_source=studentLandingPage\n');

    const eduSignupResp = await page.goto(
      'https://www.perplexity.ai/onboarding?login_new=false&login_source=studentLandingPage',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   HTTP Status: ${eduSignupResp?.status()}`);
    await page.waitForTimeout(3000);
    
    const pageText = await page.textContent('body');
    console.log(`   → Contains "education": ${pageText?.toLowerCase().includes('education') || false}`);
    console.log(`   → Contains "50%": ${pageText?.includes('50%') || pageText?.includes('50 %') || false}`);
    console.log(`   → Contains "student": ${pageText?.toLowerCase().includes('student') || false}`);
    console.log(`   → Contains "educator": ${pageText?.toLowerCase().includes('educator') || false}`);
    console.log(`   → Contains "SheerID": ${pageText?.toLowerCase().includes('sheerid') || false}`);
    console.log(`   → Contains "verify": ${pageText?.toLowerCase().includes('verify') || false}`);
    
    // Get page title
    const title = await page.title();
    console.log(`   Page Title: ${title}`);
    
    // Try to find pricing elements
    const pricingElements = await page.$$('[class*="price"], [class*="plan"], [class*="tier"]');
    console.log(`   → Pricing elements found: ${pricingElements.length}`);
    console.log('');

    // Check Airtel page
    console.log('2. AIRTEL PERPLEXITY PAGE');
    console.log('   URL: https://www.airtel.in/perplexity-pro\n');

    const airtelResp = await page.goto(
      'https://www.airtel.in/perplexity-pro',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   HTTP Status: ${airtelResp?.status()}`);
    
    if (airtelResp?.status() === 200) {
      await page.waitForTimeout(2000);
      const airtelText = await page.textContent('body');
      
      console.log(`   → Page loaded successfully`);
      console.log(`   → Contains "Perplexity": ${airtelText?.toLowerCase().includes('perplexity') || false}`);
      console.log(`   → Contains "1 year" or "12 months": ${airtelText?.toLowerCase().includes('1 year') || airtelText?.toLowerCase().includes('12 months') || false}`);
      console.log(`   → Contains "free": ${airtelText?.toLowerCase().includes('free') || false}`);
      console.log(`   → Contains "ended" or "expired": ${airtelText?.toLowerCase().includes('ended') || airtelText?.toLowerCase().includes('expired') || false}`);
      
      // Check if redirected to homepage
      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);
      console.log(`   → Redirected to homepage: ${currentUrl === 'https://www.airtel.in/' || currentUrl === 'https://www.airtel.in'}`);
    }
    console.log('');

    // Check Nothing page
    console.log('3. NOTHING TECHNOLOGY PAGE');
    console.log('   URL: https://nothing.tech/pages/news\n');

    const nothingResp = await page.goto(
      'https://nothing.tech/pages/news',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   HTTP Status: ${nothingResp?.status()}`);
    console.log('');

    // Try UNiDAYS
    console.log('4. UNIDAYS PERPLEXITY');
    console.log('   URL: https://www.myunidays.com/\n');

    const unidaysResp = await page.goto(
      'https://www.myunidays.com/',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   HTTP Status: ${unidaysResp?.status()}`);
    
    if (unidaysResp?.status() === 200) {
      await page.waitForTimeout(3000);
      const unidaysText = await page.textContent('body');
      
      console.log(`   → Contains "Perplexity": ${unidaysText?.toLowerCase().includes('perplexity') || false}`);
      console.log(`   → Contains "Perplexity Pro": ${unidaysText?.toLowerCase().includes('perplexity pro') || false}`);
      
      // Try to search for Perplexity on UNiDAYS
      try {
        // Check if there's a search or if Perplexity is listed
        const links = await page.$$('a');
        let perplexityLinkFound = false;
        
        for (const link of links.slice(0, 50)) { // Check first 50 links
          const href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href?.toLowerCase().includes('perplexity') || text?.toLowerCase().includes('perplexity')) {
            perplexityLinkFound = true;
            console.log(`   → Found Perplexity link: ${text?.substring(0, 50)} (${href?.substring(0, 80)})`);
            break;
          }
        }
        
        if (!perplexityLinkFound) {
          console.log(`   → No Perplexity links found in first 50 links`);
        }
      } catch (err) {
        console.log(`   → Error searching for Perplexity links: ${err}`);
      }
    }
    console.log('');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

if (require.main === module) {
  verifyLivePages()
    .then(() => {
      console.log('✅ Complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed:', err);
      process.exit(1);
    });
}

export { verifyLivePages };
