// ============================================================
// StackSave Google Analytics 4 Integration
// Centralized, privacy-safe, production-ready GA4 utilities
// ============================================================

export const GA_MEASUREMENT_ID = 'G-412VVCKC22';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __GA_INITIALIZED__?: boolean;
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

/**
 * Initialize GA4 script and dataLayer exactly once
 */
export function initGA(): void {
  if (typeof window === 'undefined') return;
  if (window.__GA_INITIALIZED__) return;

  // Prevent duplicate initialization in React StrictMode
  window.__GA_INITIALIZED__ = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: unknown[]) {
    window.dataLayer?.push(args);
  };

  window.gtag('js', new Date());
  // Disable automatic pageview on init because React Router handles SPA route changes
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false,
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
}

/**
 * Track SPA page views on client-side route changes
 */
export function trackPageView(path?: string, title?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_path: path || window.location.pathname + window.location.search,
    page_title: title || document.title,
    page_location: window.location.href,
  });
}

/**
 * Privacy-safe event tracker that strips any private/sensitive fields
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !window.gtag) return;

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

  window.gtag('event', eventName, safeParams);
}

// ── Specific StackSave Behavioral Event Helpers ──────────────

export function trackAuditStarted(metadata?: { tool_count?: number }): void {
  trackEvent('audit_started', metadata);
}

export function trackAuditSubmitted(metadata?: { tool_count?: number }): void {
  trackEvent('audit_submitted', metadata);
}

export function trackAuditResultsViewed(): void {
  trackEvent('audit_results_viewed');
}

export function trackBuildStackStarted(): void {
  trackEvent('build_stack_started');
}

export function trackBuildStackCompleted(metadata?: { recommended_count?: number }): void {
  trackEvent('build_stack_completed', metadata);
}

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

export function trackOfferClicked(providerName?: string): void {
  trackEvent('offer_clicked', { provider_name: providerName || 'unknown' });
}

export function trackCtaClicked(ctaName: string): void {
  trackEvent('cta_clicked', { cta_name: ctaName });
}
