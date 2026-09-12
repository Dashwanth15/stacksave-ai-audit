/**
 * Offer Destination Health Check
 * 
 * Validates offer destination URLs before publishing offers as ACTIVE.
 * Detects 404s, expired pages, unavailable content, and dead campaign URLs.
 */

import { Page } from 'playwright';

export interface OfferDestinationHealthResult {
  reachable: boolean;
  initialStatus: number | null;
  finalStatus: number | null;
  finalUrl: string;
  redirectCount: number;
  pageNotFound: boolean;
  unavailable: boolean;
  expired: boolean;
  redirectsToGenericHomepage: boolean;
  status: 'VALID' | 'UNAVAILABLE' | 'EXPIRED' | 'NOT_FOUND' | 'ERROR';
  statusReason?: string;
  errorMessage?: string;
}

/**
 * Checks if a URL redirects to a generic homepage (indicating the specific offer page is gone)
 */
function isGenericHomepageRedirect(initialUrl: string, finalUrl: string): boolean {
  try {
    const initial = new URL(initialUrl);
    const final = new URL(finalUrl);
    
    // Same domain but went to root or very generic path
    if (initial.hostname === final.hostname) {
      const finalPath = final.pathname.toLowerCase().replace(/\/$/, '');
      const initialPath = initial.pathname.toLowerCase().replace(/\/$/, '');
      
      // Redirected to homepage
      if (finalPath === '' || finalPath === '/') {
        return initialPath.length > 1; // Was a specific path, now homepage
      }
      
      // Redirected to generic section (e.g., /offers -> /)
      if (initialPath.includes('/') && initialPath.split('/').length > 2) {
        if (finalPath === '' || finalPath === '/' || final.pathname.split('/').length <= 2) {
          return true;
        }
      }
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks page content for clear failure/unavailability signals
 */
function detectPageFailureSignals(content: string, title: string): {
  pageNotFound: boolean;
  unavailable: boolean;
  expired: boolean;
  matchedPhrase?: string;
} {
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const combined = `${lowerTitle} ${lowerContent}`;
  
  // 404 / Not Found patterns
  const notFoundPatterns = [
    '404 not found',
    'page not found',
    "page doesn't exist",
    'page does not exist',
    'page cannot be found',
    'sorry, this page',
    'the page you are looking for',
    'could not find the page',
    'this page is not available',
    'page no longer exists',
  ];
  
  for (const pattern of notFoundPatterns) {
    if (combined.includes(pattern)) {
      return {
        pageNotFound: true,
        unavailable: false,
        expired: false,
        matchedPhrase: pattern,
      };
    }
  }
  
  // Unavailable patterns
  const unavailablePatterns = [
    'page unavailable',
    'page is unavailable',
    'content unavailable',
    'this page is no longer available',
    'this content is no longer available',
    'no longer available',
    'not available anymore',
    'has been removed',
    'has been deleted',
    'page deleted',
    'content deleted',
  ];
  
  for (const pattern of unavailablePatterns) {
    if (combined.includes(pattern)) {
      return {
        pageNotFound: false,
        unavailable: true,
        expired: false,
        matchedPhrase: pattern,
      };
    }
  }
  
  // Expired / Ended patterns
  const expiredPatterns = [
    'offer unavailable',
    'offer expired',
    'offer has expired',
    'promotion ended',
    'promotion has ended',
    'offer ended',
    'offer has ended',
    'redemption ended',
    'campaign ended',
    'campaign has ended',
    'no longer accepting',
    'this offer is no longer',
    'this promotion is no longer',
  ];
  
  for (const pattern of expiredPatterns) {
    if (combined.includes(pattern)) {
      return {
        pageNotFound: false,
        unavailable: false,
        expired: true,
        matchedPhrase: pattern,
      };
    }
  }
  
  return {
    pageNotFound: false,
    unavailable: false,
    expired: false,
  };
}

/**
 * Performs comprehensive health check on an offer destination URL
 * 
 * @param page - Playwright Page instance
 * @param url - Offer destination URL to check
 * @param timeout - Navigation timeout in ms (default: 15000)
 * @returns Health check result with status and details
 */
export async function checkOfferDestination(
  page: Page,
  url: string,
  timeout: number = 15000
): Promise<OfferDestinationHealthResult> {
  let initialStatus: number | null = null;
  let finalStatus: number | null = null;
  let finalUrl = url;
  let redirectCount = 0;
  
  try {
    // Navigate with redirect tracking
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });
    
    if (!response) {
      return {
        reachable: false,
        initialStatus: null,
        finalStatus: null,
        finalUrl: url,
        redirectCount: 0,
        pageNotFound: false,
        unavailable: true,
        expired: false,
        redirectsToGenericHomepage: false,
        status: 'UNAVAILABLE',
        statusReason: 'No response received from server',
      };
    }
    
    // Track redirect chain
    const redirectChain = response.request().redirectedFrom();
    let current = redirectChain;
    while (current) {
      redirectCount++;
      current = current.redirectedFrom();
    }
    
    initialStatus = response.status();
    finalStatus = response.status();
    finalUrl = response.url();
    
    // Check for HTTP error statuses
    if (finalStatus === 404) {
      return {
        reachable: false,
        initialStatus,
        finalStatus,
        finalUrl,
        redirectCount,
        pageNotFound: true,
        unavailable: false,
        expired: false,
        redirectsToGenericHomepage: false,
        status: 'NOT_FOUND',
        statusReason: 'HTTP 404 Not Found',
      };
    }
    
    if (finalStatus === 410) {
      return {
        reachable: false,
        initialStatus,
        finalStatus,
        finalUrl,
        redirectCount,
        pageNotFound: false,
        unavailable: true,
        expired: true,
        redirectsToGenericHomepage: false,
        status: 'EXPIRED',
        statusReason: 'HTTP 410 Gone',
      };
    }
    
    // Check for generic homepage redirect
    const isGenericRedirect = isGenericHomepageRedirect(url, finalUrl);
    
    // For successful HTTP responses, inspect page content
    if (finalStatus >= 200 && finalStatus < 400) {
      // Get page content and title
      const title = await page.title().catch(() => '');
      const bodyText = await page.evaluate(() => {
        const body = document.body;
        return body ? body.innerText.slice(0, 5000) : ''; // First 5000 chars
      }).catch(() => '');
      
      // Detect failure signals in content
      const signals = detectPageFailureSignals(bodyText, title);
      
      if (signals.pageNotFound) {
        return {
          reachable: false,
          initialStatus,
          finalStatus,
          finalUrl,
          redirectCount,
          pageNotFound: true,
          unavailable: false,
          expired: false,
          redirectsToGenericHomepage: isGenericRedirect,
          status: 'NOT_FOUND',
          statusReason: `Page content indicates "Not Found": ${signals.matchedPhrase}`,
        };
      }
      
      if (signals.unavailable) {
        return {
          reachable: false,
          initialStatus,
          finalStatus,
          finalUrl,
          redirectCount,
          pageNotFound: false,
          unavailable: true,
          expired: false,
          redirectsToGenericHomepage: isGenericRedirect,
          status: 'UNAVAILABLE',
          statusReason: `Page content indicates unavailable: ${signals.matchedPhrase}`,
        };
      }
      
      if (signals.expired) {
        return {
          reachable: false,
          initialStatus,
          finalStatus,
          finalUrl,
          redirectCount,
          pageNotFound: false,
          unavailable: false,
          expired: true,
          redirectsToGenericHomepage: isGenericRedirect,
          status: 'EXPIRED',
          statusReason: `Page content indicates expired: ${signals.matchedPhrase}`,
        };
      }
      
      // Check for generic homepage redirect with no offer content
      if (isGenericRedirect) {
        // If we redirected to homepage, it's likely the offer is gone
        return {
          reachable: false,
          initialStatus,
          finalStatus,
          finalUrl,
          redirectCount,
          pageNotFound: false,
          unavailable: true,
          expired: true,
          redirectsToGenericHomepage: true,
          status: 'EXPIRED',
          statusReason: 'Redirected to generic homepage - specific offer page no longer available',
        };
      }
      
      // Page is reachable and valid
      return {
        reachable: true,
        initialStatus,
        finalStatus,
        finalUrl,
        redirectCount,
        pageNotFound: false,
        unavailable: false,
        expired: false,
        redirectsToGenericHomepage: false,
        status: 'VALID',
      };
    }
    
    // Other HTTP error codes (5xx, etc.)
    return {
      reachable: false,
      initialStatus,
      finalStatus,
      finalUrl,
      redirectCount,
      pageNotFound: false,
      unavailable: true,
      expired: false,
      redirectsToGenericHomepage: false,
      status: 'UNAVAILABLE',
      statusReason: `HTTP ${finalStatus} error`,
    };
    
  } catch (error: any) {
    // Navigation error (timeout, network error, etc.)
    const errorMessage = error.message || String(error);
    
    // Check if error indicates 404
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return {
        reachable: false,
        initialStatus,
        finalStatus: 404,
        finalUrl,
        redirectCount,
        pageNotFound: true,
        unavailable: false,
        expired: false,
        redirectsToGenericHomepage: false,
        status: 'NOT_FOUND',
        statusReason: 'Navigation failed with 404',
        errorMessage,
      };
    }
    
    return {
      reachable: false,
      initialStatus,
      finalStatus,
      finalUrl,
      redirectCount,
      pageNotFound: false,
      unavailable: true,
      expired: false,
      redirectsToGenericHomepage: false,
      status: 'ERROR',
      statusReason: 'Navigation failed',
      errorMessage,
    };
  }
}

/**
 * Batch health check for multiple URLs (reuses same page)
 */
export async function checkMultipleOfferDestinations(
  page: Page,
  urls: string[],
  timeout: number = 15000
): Promise<Map<string, OfferDestinationHealthResult>> {
  const results = new Map<string, OfferDestinationHealthResult>();
  
  for (const url of urls) {
    const result = await checkOfferDestination(page, url, timeout);
    results.set(url, result);
    
    // Brief delay between checks to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}
