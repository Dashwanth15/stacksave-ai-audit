/**
 * VERIFICATION: Fresh Playwright verification of Perplexity official sources
 * 
 * 1. Perplexity pricing page - check for Education Pro
 * 2. Perplexity Education Pro help article
 * 3. Airtel Perplexity promo help article (expiration date)
 * 4. Nothing Technology news/offers page
 */

import { chromium } from 'playwright';

async function verifyPerplexityOfficialSources(): Promise<void> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('FRESH PLAYWRIGHT VERIFICATION: PERPLEXITY OFFICIAL SOURCES');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Perplexity Pricing Page - check for Education Pro
    console.log('1. PERPLEXITY PRICING PAGE');
    console.log('   URL: https://www.perplexity.ai/hub/pricing');
    console.log('   Checking for: Education Pro plan...\n');

    await page.goto('https://www.perplexity.ai/hub/pricing', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);

    const pricingText = await page.textContent('body');
    const hasEducationPro = pricingText?.toLowerCase().includes('education') || false;
    const has50Discount = pricingText?.includes('50%') || pricingText?.includes('50 %') || false;
    const hasSheerID = pricingText?.toLowerCase().includes('sheerid') || false;
    const hasStudent = pricingText?.toLowerCase().includes('student') || false;

    console.log(`   ✓ Page loaded (HTTP ${page.url()})`);
    console.log(`   → Contains "education": ${hasEducationPro}`);
    console.log(`   → Contains "50%": ${has50Discount}`);
    console.log(`   → Contains "student": ${hasStudent}`);
    console.log(`   → Contains "SheerID": ${hasSheerID}`);
    
    // Try to find Education Pro section
    const educationSection = await page.$$('text=/education/i');
    console.log(`   → Education sections found: ${educationSection.length}`);
    console.log('');

    // 2. Perplexity Education Pro Help Article
    console.log('2. PERPLEXITY EDUCATION PRO HELP ARTICLE');
    console.log('   URL: https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro');
    console.log('   Verifying: Current Education Pro offer details...\n');

    const eduProResponse = await page.goto(
      'https://www.perplexity.ai/help-center/en/articles/12590157-what-is-education-pro',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   ✓ HTTP Status: ${eduProResponse?.status()}`);
    
    if (eduProResponse?.status() === 200) {
      await page.waitForTimeout(2000);
      const eduProText = await page.textContent('body');
      
      const hasSheerIDVerification = eduProText?.toLowerCase().includes('sheerid') || false;
      const hasStudentDiscount = eduProText?.includes('50%') || eduProText?.toLowerCase().includes('discount') || false;
      const hasEducatorMention = eduProText?.toLowerCase().includes('educator') || eduProText?.toLowerCase().includes('faculty') || false;
      
      console.log(`   → Mentions SheerID verification: ${hasSheerIDVerification}`);
      console.log(`   → Mentions student discount/50%: ${hasStudentDiscount}`);
      console.log(`   → Mentions educators/faculty: ${hasEducatorMention}`);
      
      // Extract key sentences
      const sentences = eduProText?.split('.').filter(s => 
        s.toLowerCase().includes('education') || 
        s.toLowerCase().includes('student') ||
        s.toLowerCase().includes('sheerid')
      ).slice(0, 3) || [];
      
      console.log(`\n   KEY EVIDENCE:`);
      sentences.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.trim().substring(0, 150)}...`);
      });
    } else {
      console.log(`   ⚠️  Failed to load (HTTP ${eduProResponse?.status()})`);
    }
    console.log('');

    // 3. Airtel Perplexity Promo Help Article
    console.log('3. AIRTEL PERPLEXITY PROMO HELP ARTICLE');
    console.log('   URL: https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo');
    console.log('   Checking for: Expiration date...\n');

    const airtelResponse = await page.goto(
      'https://www.perplexity.ai/help-center/en/articles/11842322-perplexity-pro-airtel-promo',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   ✓ HTTP Status: ${airtelResponse?.status()}`);
    
    if (airtelResponse?.status() === 200) {
      await page.waitForTimeout(2000);
      const airtelText = await page.textContent('body');
      
      const hasEndedMention = airtelText?.toLowerCase().includes('ended') || false;
      const hasJanuary2026 = airtelText?.includes('January') && airtelText?.includes('2026') || false;
      const hasPromoExpired = airtelText?.toLowerCase().includes('promotional offer ended') || false;
      
      console.log(`   → Mentions "ended": ${hasEndedMention}`);
      console.log(`   → Mentions "January 2026": ${hasJanuary2026}`);
      console.log(`   → Mentions "promotional offer ended": ${hasPromoExpired}`);
      
      // Extract expiration evidence
      const expirationSentences = airtelText?.split('.').filter(s => 
        s.toLowerCase().includes('ended') || 
        s.toLowerCase().includes('january') ||
        s.toLowerCase().includes('expir')
      ).slice(0, 2) || [];
      
      console.log(`\n   EXPIRATION EVIDENCE:`);
      expirationSentences.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.trim().substring(0, 200)}...`);
      });
    } else {
      console.log(`   ⚠️  Failed to load (HTTP ${airtelResponse?.status()})`);
    }
    console.log('');

    // 4. Nothing Technology News Page
    console.log('4. NOTHING TECHNOLOGY NEWS/OFFERS PAGE');
    console.log('   URL: https://nothing.tech/pages/news');
    console.log('   Checking for: Current Perplexity offer...\n');

    const nothingResponse = await page.goto(
      'https://nothing.tech/pages/news',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    console.log(`   ✓ HTTP Status: ${nothingResponse?.status()}`);
    
    if (nothingResponse?.status() === 200 || nothingResponse?.status() === 404) {
      await page.waitForTimeout(2000);
      
      if (nothingResponse?.status() === 404) {
        console.log(`   ❌ Page returned 404 - Nothing news page not found`);
      } else {
        const nothingText = await page.textContent('body');
        
        const hasPerplexity = nothingText?.toLowerCase().includes('perplexity') || false;
        const hasPhone2 = nothingText?.toLowerCase().includes('phone (2)') || nothingText?.toLowerCase().includes('phone 2') || false;
        const hasMarch2024 = nothingText?.includes('March 2024') || nothingText?.includes('march 2024') || false;
        const hasApril2024 = nothingText?.includes('April') && nothingText?.includes('2024') || false;
        
        console.log(`   → Mentions "Perplexity": ${hasPerplexity}`);
        console.log(`   → Mentions "Phone (2)/Phone 2": ${hasPhone2}`);
        console.log(`   → Mentions "March 2024": ${hasMarch2024}`);
        console.log(`   → Mentions "April 2024": ${hasApril2024}`);
        
        if (hasPerplexity) {
          const perplexitySentences = nothingText?.split('.').filter(s => 
            s.toLowerCase().includes('perplexity')
          ).slice(0, 2) || [];
          
          console.log(`\n   PERPLEXITY MENTIONS:`);
          perplexitySentences.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s.trim().substring(0, 200)}...`);
          });
        }
      }
    }
    console.log('');

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('════════════════════════════════════════════════════════════════════════════════');
  console.log('VERIFICATION COMPLETE');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  verifyPerplexityOfficialSources()
    .then(() => {
      console.log('✅ Verification complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Verification failed:', err);
      process.exit(1);
    });
}

export { verifyPerplexityOfficialSources };
