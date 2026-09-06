// ============================================================
// StackSave Google Analytics 4 Integration
// Centralized, privacy-safe, production-ready GA4 utilities
// ============================================================

export const GA_MEASUREMENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GA_MEASUREMENT_ID) ||
  'G-412VVCKC22';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __GA_INITIALIZED__?: boolean;
    __LAST_TRACKED_PAGEVIEW__?: {
      path: string;
      timestamp: number;
    };
  }
}

// Strictly disallowed keys to prevent accidental PII / sensitive data leakage
const FORBIDDEN_KEYS = new Set([
  'email',
  'name',
  'companyName',
  'company',
  'auditId',
  'id',
  'token',
  'ownerToken',
  'apiKey',
  'password',
  'prompt',
  'message',
  'content',
  'query',
  'response',
  'tools',
  'spend',
  'currentSpend',
  'monthlySpend',
]);

// Synchronously ensure window.dataLayer and window.gtag exist immediately on script evaluation
if (typeof window !== 'undefined') {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }
}

/**
 * Check if GA4 DebugView / Dev mode is requested
 */
export function isGaDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isDev = import.meta.env.DEV;
    const urlDebug = window.location.search.includes('debug_ga=true');
    const storageDebug = window.localStorage.getItem('debug_ga') === 'true';
    return isDev || urlDebug || storageDebug;
  } catch {
    return false;
  }
}

/**
 * Initialize GA4 script and dataLayer exactly once
 */
export function initGA(): void {
  if (typeof window === 'undefined') return;
  if (window.__GA_INITIALIZED__) return;

  // Prevent duplicate initialization in React StrictMode
  window.__GA_INITIALIZED__ = true;

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }

  window.gtag('js', new Date());

  const debugMode = isGaDebugMode();

  // Configure GA4 with beacon transport and SPA route control
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
    transport_type: 'beacon',
    ...(debugMode ? { debug_mode: true } : {}),
  });

  // Inject the official gtag.js script if not already present
  const scriptId = 'ga4-gtag-script';
  if (!document.getElementById(scriptId)) {
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  }

  if (debugMode) {
    console.log(`[GA4 Analytics] Initialized measurement ID: ${GA_MEASUREMENT_ID} (DebugView active)`);
  }
}

// Auto-run initGA immediately in browser context
if (typeof window !== 'undefined') {
  initGA();
}

/**
 * Track SPA page views on client-side route changes with duplicate suppression
 */
export function trackPageView(path?: string, title?: string): void {
  if (typeof window === 'undefined') return;

  // Ensure GA is initialized before tracking
  if (!window.__GA_INITIALIZED__ || !window.gtag) {
    initGA();
  }

  const currentPath = path || window.location.pathname + window.location.search;
  const now = Date.now();

  // Deduplicate exact same page view firing within 250ms (common in React StrictMode)
  if (
    window.__LAST_TRACKED_PAGEVIEW__ &&
    window.__LAST_TRACKED_PAGEVIEW__.path === currentPath &&
    now - window.__LAST_TRACKED_PAGEVIEW__.timestamp < 250
  ) {
    return;
  }

  window.__LAST_TRACKED_PAGEVIEW__ = {
    path: currentPath,
    timestamp: now,
  };

  const debugMode = isGaDebugMode();
  const params: Record<string, unknown> = {
    page_path: currentPath,
    page_title: title || document.title,
    page_location: window.location.href,
    ...(debugMode ? { debug_mode: true } : {}),
  };

  if (window.gtag) {
    window.gtag('event', 'page_view', params);
  }

  if (debugMode) {
    console.log('[GA4 PageView]', currentPath, params);
  }
}

/**
 * Privacy-safe event tracker that strips any private/sensitive fields
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;

  // Ensure GA is initialized before tracking
  if (!window.__GA_INITIALIZED__ || !window.gtag) {
    initGA();
  }

  const safeParams: Record<string, unknown> = {};

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      // Omit forbidden keys
      if (!FORBIDDEN_KEYS.has(key)) {
        // Only allow primitives (string, number, boolean)
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          safeParams[key] = value;
        }
      }
    }
  }

  const debugMode = isGaDebugMode();
  if (debugMode) {
    safeParams.debug_mode = true;
    console.log(`[GA4 Event Delivery] ${eventName}:`, safeParams);
  }

  if (window.gtag) {
    window.gtag('event', eventName, safeParams);
  }
}

// ── Specific StackSave Behavioral Event Helpers ──────────────

/**
 * Triggered when a visitor lands on /audit and begins configuring their stack.
 * Distinct from completion!
 */
export function trackAuditStarted(metadata?: { tool_count?: number; is_reaudit?: boolean }): void {
  trackEvent('audit_started', metadata);
}

/**
 * Triggered when a visitor clicks "Run AI Audit" to submit their audit form.
 */
export function trackAuditSubmitted(metadata?: { tool_count?: number }): void {
  trackEvent('audit_submitted', metadata);
}

/**
 * Triggered strictly when the backend returns a successful AuditResult.
 * This represents a genuinely COMPLETED audit.
 */
export function trackAuditCompleted(metadata?: {
  tool_count?: number;
  savings_percentage?: number;
  monthly_savings?: number;
}): void {
  trackEvent('audit_completed', metadata);
}

/**
 * Triggered if the audit submission request fails.
 */
export function trackAuditFailed(errorReason?: string): void {
  trackEvent('audit_failed', { error_reason: errorReason || 'unknown' });
}

/**
 * Triggered when viewing an audit results breakdown page (/audit/:id).
 */
export function trackAuditResultsViewed(): void {
  trackEvent('audit_results_viewed');
}

/**
 * Triggered when entering the Stack Builder wizard.
 */
export function trackBuildStackStarted(): void {
  trackEvent('build_stack_started');
}

/**
 * Triggered when the Stack Builder recommendation is generated.
 */
export function trackBuildStackCompleted(metadata?: { recommended_count?: number }): void {
  trackEvent('build_stack_completed', metadata);
}

/**
 * Triggered when viewing public offer discounts.
 */
export function trackOfferViewed(offerId?: string, providerName?: string): void {
  trackEvent('offer_viewed', {
    offer_id: offerId || 'unknown',
    provider_name: providerName || 'unknown',
  });
}

/**
 * Triggered when clicking through to a vendor's official offer landing page.
 */
export function trackOfferClicked(providerName?: string): void {
  trackEvent('offer_clicked', { provider_name: providerName || 'unknown' });
}

/**
 * Triggered when viewing the pricing intelligence overlay.
 */
export function trackPricingViewed(providerId?: string): void {
  trackEvent('pricing_viewed', { provider_id: providerId || 'all' });
}

/**
 * Triggered when opening the AI chat assistant.
 */
export function trackAiAssistantOpened(): void {
  trackEvent('ai_assistant_opened');
}

export function trackAiAssistantMessageSent(): void {
  // Action only — NO user message content is ever transmitted
  trackEvent('ai_assistant_message_sent');
}

export function trackAiAssistantResponseReceived(): void {
  // Action only — NO assistant response text is ever transmitted
  trackEvent('ai_assistant_response_received');
}

export function trackNotificationOpened(): void {
  trackEvent('notification_opened');
}

export function trackCtaClicked(ctaName: string): void {
  trackEvent('cta_clicked', { cta_name: ctaName });
}

export function trackSignupStarted(): void {
  trackEvent('signup_started');
}

export function trackSignupCompleted(leadType?: string): void {
  trackEvent('signup_completed', { lead_type: leadType || 'general' });
}
