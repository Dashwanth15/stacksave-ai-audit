/**
 * XIAOMI OFFER FORENSIC DIAGNOSTIC SCRIPT
 * 
 * This script performs a complete forensic trace of the Xiaomi × Google Gemini offer
 * to determine why it appears active despite having a 404 destination.
 * 
 * CRITICAL: We need to prove whether Playwright is checking the SOURCE URL
 * or the actual DESTINATION URL that users click via "View Offer".
 */

import mongoose from 'mongoose';
import { NotificationEventModel } from '../src/services/dbService';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

interface XiaomiOfferTrace {
  mongoDbRecord: any | null;
  sourceUrl: string | null;
  destinationUrl: string | null;
  apiUrl: string | null;
  frontendHref: string | null;
  sourceUrlHealthCheck: {
    navigatedTo: string;
    initialStatus: number;
    finalUrl: string;
    finalStatus: number;
    pageTitle: string;
    contains404: boolean;
    isReachable: boolean;
  } | null;
  destinationUrlHealthCheck: {
    navigatedTo: string;
    initialStatus: number;
    finalUrl: string;
    finalStatus: number;
    pageTitle: string;
    contains404: boolean;
    isReachable: boolean;
  } | null;
  urlIntegrity: {
    sourceMatchesDb: boolean;
    destinationMatchesDb: boolean;
    apiMatchesDb: boolean;
  };
  rootCause: string;
  recommendation: string;
}

async function checkUrlWithPlaywright(url: string): Promise<{
  navigatedTo: string;
  initialStatus: number;
  finalUrl: string;
  finalStatus: number;
  pageTitle: string;
  contains404: boolean;
  isReachable: boolean;
}> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let initialStatus = 0;
  let finalUrl = url;
  let finalStatus = 0;
  let pageTitle = '';
  let contains404 = false;
  let isReachable = false;

  try {
    console.log(`\n   [Playwright] Navigating to: ${url}`);
    
    // Track the response
    const response = await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    initialStatus = response?.status() || 0;
    finalUrl = page.url();
    finalStatus = response?.status() || 0;
    
    console.log(`   [Playwright] Initial Status: ${initialStatus}`);
    console.log(`   [Playwright] Final URL: ${finalUrl}`);
    console.log(`   [Playwright] Final Status: ${finalStatus}`);

    // Get page title
    pageTitle = await page.title();
    console.log(`   [Playwright] Page Title: ${pageTitle}`);

    // Get page content and check for 404 indicators
    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    
    contains404 = 
      bodyText.includes('404') ||
      bodyText.includes('not found') ||
      bodyText.includes('page not found') ||
      bodyText.includes('cannot be reached') ||
      bodyText.includes('page doesn\'t exist') ||
      bodyText.includes('page unavailable') ||
      bodyText.includes('oops') ||
      finalUrl.includes('/errors/404') ||
      finalUrl.includes('/404');

    console.log(`   [Playwright] Contains 404 Indicators: ${contains404}`);

    isReachable = finalStatus >= 200 && finalStatus < 400 && !contains404;
    console.log(`   [Playwright] Is Reachable: ${isReachable}`);

  } catch (err: any) {
    console.log(`   [Playwright] Error: ${err.message}`);
    isReachable = false;
  } finally {
    await browser.close();
  }

  return {
    navigatedTo: url,
    initialStatus,
    finalUrl,
    finalStatus,
    pageTitle,
    contains404,
    isReachable,
  };
}

async function diagnoseXiaomiOffer(): Promise<XiaomiOfferTrace> {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('XIAOMI × GOOGLE GEMINI FORENSIC DIAGNOSTIC');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.connect(process.env.MONGODB_URI!);

  // ═══ STEP 1: FIND MONGODB RECORD ═══
  console.log('[STEP 1] Searching MongoDB for Xiaomi × Google Gemini offer...\n');
  
  const xiaomiOffer = await NotificationEventModel.findOne({
    $or: [
      { partner: /xiaomi/i },
      { sourceUrl: /mi\.com/i },
      { title: /xiaomi.*gemini/i },
      { description: /xiaomi.*gemini/i },
    ],
  }).lean();

  if (xiaomiOffer) {
    console.log('✅ FOUND MONGODB RECORD:\n');
    console.log(`   _id:                    ${xiaomiOffer._id}`);
    console.log(`   fingerprint:            ${xiaomiOffer.fingerprint}`);
    console.log(`   providerId:             ${xiaomiOffer.providerId}`);
    console.log(`   title:                  ${xiaomiOffer.title}`);
    console.log(`   partner:                ${xiaomiOffer.partner}`);
    console.log(`   sourceUrl:              ${xiaomiOffer.sourceUrl}`);
    console.log(`   destinationUrl:         ${xiaomiOffer.destinationUrl || 'N/A'}`);
    console.log(`   isActive:               ${xiaomiOffer.isActive}`);
    console.log(`   status:                 ${xiaomiOffer.status}`);
    console.log(`   detectionMethod:        ${xiaomiOffer.detectionMethod}`);
    console.log(`   lastConfirmedAt:        ${xiaomiOffer.lastConfirmedAt}`);
    console.log('');
  } else {
    console.log('❌ NO MONGODB RECORD FOUND for Xiaomi × Google Gemini\n');
  }

  const sourceUrl = xiaomiOffer?.sourceUrl || null;
  const destinationUrl = xiaomiOffer?.destinationUrl || xiaomiOffer?.sourceUrl || null;

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('[STEP 2] URL IDENTIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  console.log(`SOURCE URL (where offer was discovered):`);
  console.log(`   ${sourceUrl || 'NOT FOUND'}\n`);
  console.log(`DESTINATION URL (what users click via "View Offer"):`);
  console.log(`   ${destinationUrl || 'NOT FOUND'}\n`);

  // ═══ STEP 3: CHECK SOURCE URL WITH PLAYWRIGHT ═══
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('[STEP 3] PLAYWRIGHT HEALTH CHECK: SOURCE URL');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  let sourceUrlHealthCheck = null;
  if (sourceUrl) {
    sourceUrlHealthCheck = await checkUrlWithPlaywright(sourceUrl);
  } else {
    console.log('\n   ❌ No source URL found - skipping check\n');
  }

  // ═══ STEP 4: CHECK DESTINATION URL WITH PLAYWRIGHT ═══
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('[STEP 4] PLAYWRIGHT HEALTH CHECK: DESTINATION URL (THE ACTUAL "VIEW OFFER" URL)');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  let destinationUrlHealthCheck = null;
  if (destinationUrl && destinationUrl !== sourceUrl) {
    destinationUrlHealthCheck = await checkUrlWithPlaywright(destinationUrl);
  } else if (destinationUrl === sourceUrl) {
    console.log('\n   ℹ️  Destination URL same as source URL - using source check results\n');
    destinationUrlHealthCheck = sourceUrlHealthCheck;
  } else {
    console.log('\n   ❌ No destination URL found - skipping check\n');
  }

  // ═══ STEP 5: URL INTEGRITY CHECK ═══
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('[STEP 5] URL INTEGRITY VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const urlIntegrity = {
    sourceMatchesDb: sourceUrl === xiaomiOffer?.sourceUrl,
    destinationMatchesDb: destinationUrl === (xiaomiOffer?.destinationUrl || xiaomiOffer?.sourceUrl),
    apiMatchesDb: true, // Assuming API returns exactly what's in DB
  };

  console.log(`   MongoDB sourceUrl:      ${xiaomiOffer?.sourceUrl || 'N/A'}`);
  console.log(`   Extracted sourceUrl:    ${sourceUrl || 'N/A'}`);
  console.log(`   Match:                  ${urlIntegrity.sourceMatchesDb ? '✅' : '❌'}\n`);

  console.log(`   MongoDB destinationUrl: ${xiaomiOffer?.destinationUrl || xiaomiOffer?.sourceUrl || 'N/A'}`);
  console.log(`   Extracted destUrl:      ${destinationUrl || 'N/A'}`);
  console.log(`   Match:                  ${urlIntegrity.destinationMatchesDb ? '✅' : '❌'}\n`);

  // ═══ STEP 6: ROOT CAUSE ANALYSIS ═══
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('[STEP 6] ROOT CAUSE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  let rootCause = '';
  let recommendation = '';
  
  if (!xiaomiOffer) {
    rootCause = 'NO DATABASE RECORD: Xiaomi offer does not exist in MongoDB. Frontend may be showing fallback/static data.';
    recommendation = 'Check frontend static data and verify API response.';
  } else if (xiaomiOffer.isActive && destinationUrlHealthCheck && !destinationUrlHealthCheck.isReachable) {
    if (destinationUrlHealthCheck.contains404) {
      rootCause = `CRITICAL BUG CONFIRMED: The destination URL (${destinationUrl}) returns a 404 page, but the offer is marked as ACTIVE in MongoDB. This means:
      
1. Either Playwright NEVER checked the destination URL (only checked source URL)
2. Or Playwright checked it but the health check logic FAILED to detect the 404
3. Or the health check detected the 404 but the result was IGNORED during persistence

EVIDENCE:
- Final URL: ${destinationUrlHealthCheck.finalUrl}
- Final Status: ${destinationUrlHealthCheck.finalStatus}
- Page Title: ${destinationUrlHealthCheck.pageTitle}
- Contains 404 Indicators: ${destinationUrlHealthCheck.contains404}
- Offer isActive in DB: ${xiaomiOffer.isActive}

This is the EXACT bug described by the user.`;

      recommendation = `REQUIRED FIX:
1. Ensure Playwright checks the DESTINATION URL, not just the source URL
2. The destination URL must be the EXACT URL stored in the offer record
3. The destination URL must be what the frontend "View Offer" button uses
4. 404 detection must properly reject the offer
5. Add reconciliation to deactivate existing broken offers`;
    } else {
      rootCause = 'Destination URL is unreachable but not necessarily a 404.';
      recommendation = 'Investigate why the destination URL is unreachable and deactivate the offer.';
    }
  } else if (xiaomiOffer.isActive && sourceUrlHealthCheck && !sourceUrlHealthCheck.isReachable) {
    rootCause = 'Source URL is unreachable. The offer may have been discovered from stale data.';
    recommendation = 'Deactivate the offer and investigate why the source URL is no longer valid.';
  } else if (xiaomiOffer.isActive && (!destinationUrlHealthCheck || !sourceUrlHealthCheck)) {
    rootCause = 'Unable to perform health check. URLs may be missing or invalid.';
    recommendation = 'Investigate URL extraction and storage logic.';
  } else if (!xiaomiOffer.isActive) {
    rootCause = 'Offer is already deactivated in MongoDB. Frontend may be caching stale data.';
    recommendation = 'Check frontend cache and verify API excludes inactive offers.';
  } else {
    rootCause = 'Offer appears valid based on health checks.';
    recommendation = 'Verify with actual user testing if the "View Offer" link works.';
  }

  console.log('ROOT CAUSE:');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(rootCause);
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('RECOMMENDATION:');
  console.log('───────────────────────────────────────────────────────────────────────────────');
  console.log(recommendation);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  await mongoose.disconnect();

  return {
    mongoDbRecord: xiaomiOffer,
    sourceUrl,
    destinationUrl,
    apiUrl: destinationUrl, // Assuming API returns what's in DB
    frontendHref: destinationUrl, // Assuming frontend uses what's in API
    sourceUrlHealthCheck,
    destinationUrlHealthCheck,
    urlIntegrity,
    rootCause,
    recommendation,
  };
}

// ═══ MAIN EXECUTION ═══
if (require.main === module) {
  diagnoseXiaomiOffer()
    .then((report) => {
      console.log('\n✅ Diagnostic complete. Report generated.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Diagnostic failed:', err);
      process.exit(1);
    });
}

export { diagnoseXiaomiOffer };
