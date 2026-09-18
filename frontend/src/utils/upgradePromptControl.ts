// ============================================================
// Upgrade Prompt Control — StackSave Frequency & Session Registry
// Manages display eligibility, dismissal cooldowns, and coordinates
// single-active floating prompt surfaces across all page views.
// ============================================================

import {
  getUserSessionItem,
  setUserSessionItem,
  getUserScopedKey,
} from './userSession';

export type UpgradePromptVariant = 'scroll' | 'audit' | 'stack' | 'offers';

// 7-day cooldown in milliseconds for persistent dismissals (scroll & offers)
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory single active floating prompt tracker
let currentActiveFloatingVariant: string | null = null;

/**
 * Register a floating upgrade prompt as currently mounted/visible.
 * Returns true if registration succeeded, false if another floating prompt is already active.
 */
export function registerActiveFloatingPrompt(variant: UpgradePromptVariant): boolean {
  if (variant !== 'scroll' && variant !== 'offers') return true;
  if (currentActiveFloatingVariant && currentActiveFloatingVariant !== variant) {
    return false;
  }
  currentActiveFloatingVariant = variant;
  return true;
}

/**
 * Unregister an active floating upgrade prompt when dismissed or unmounted.
 */
export function unregisterActiveFloatingPrompt(variant: UpgradePromptVariant): void {
  if (currentActiveFloatingVariant === variant) {
    currentActiveFloatingVariant = null;
  }
}

// In development mode, automatically purge stale 7-day test lockouts on load
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.includes('nudge_scroll') || key.includes('nudge_offers'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));

    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key && (key.includes('nudge_scroll') || key.includes('nudge_offers'))) {
        sessionKeysToRemove.push(key);
      }
    }
    sessionKeysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {
    // Ignore storage cleanup errors
  }
}

/**
 * Check if an upgrade prompt should be displayed to the user.
 *
 * Rules:
 * 1. If user has active Premium entitlement → false.
 * 2. If prompt was dismissed in current session → false.
 * 3. If prompt is under 7-day localStorage cooldown (for scroll/offers) → false.
 * 4. For floating prompts (scroll, offers): if another floating surface is active → false.
 */
export function shouldShowUpgradePrompt(
  variant: UpgradePromptVariant,
  id?: string,
  isPremium?: boolean
): boolean {
  // 1. Premium users never see any upgrade prompts
  if (isPremium) {
    return false;
  }

  // Safe window check for SSR/test environments
  if (typeof window === 'undefined') {
    return false;
  }

  // In development, do not lock developers and testers out with the 7-day cooldown
  if (import.meta.env.DEV) {
    return true;
  }

  // 2. Cooldown and dismissal checks per variant
  if (variant === 'audit') {
    const auditKey = `nudge_audit_dismissed_${id || 'default'}`;
    if (getUserSessionItem(auditKey) === 'true') {
      return false;
    }
    return true;
  }

  if (variant === 'stack') {
    const stackKey = `nudge_stack_dismissed_${id || 'default'}`;
    if (getUserSessionItem(stackKey) === 'true' || getUserSessionItem('nudge_stack_dismissed') === 'true') {
      return false;
    }
    return true;
  }

  // Floating variants (scroll, offers): check session dismissal + 7-day localStorage cooldown
  if (variant === 'scroll' || variant === 'offers') {
    // Check session dismissal
    const sessionKey = `nudge_${variant}_dismissed`;
    if (getUserSessionItem(sessionKey) === 'true') {
      return false;
    }

    // Check 7-day localStorage cooldown
    try {
      const cooldownKey = getUserScopedKey(`nudge_${variant}_cooldown_until`);
      const cooldownUntilStr = window.localStorage.getItem(cooldownKey);
      if (cooldownUntilStr) {
        const cooldownUntil = parseInt(cooldownUntilStr, 10);
        if (!isNaN(cooldownUntil) && Date.now() < cooldownUntil) {
          return false;
        }
      }
    } catch {
      // Ignore storage read errors
    }

    // Check single active floating surface coordination
    if (currentActiveFloatingVariant && currentActiveFloatingVariant !== variant) {
      return false;
    }

    return true;
  }

  return true;
}

/**
 * Record dismissal of an upgrade prompt.
 *
 * Per-result variants (audit, stack) use sessionStorage so they only apply to that specific result experience.
 * Floating variants (scroll, offers) use sessionStorage + 7-day localStorage cooldown so dismissal persists across visits.
 */
export function dismissUpgradePrompt(variant: UpgradePromptVariant, id?: string): void {
  if (typeof window === 'undefined') return;

  if (variant === 'audit') {
    const auditKey = `nudge_audit_dismissed_${id || 'default'}`;
    setUserSessionItem(auditKey, 'true');
  } else if (variant === 'stack') {
    const stackKey = `nudge_stack_dismissed_${id || 'default'}`;
    setUserSessionItem(stackKey, 'true');
    setUserSessionItem('nudge_stack_dismissed', 'true');
  } else if (variant === 'scroll' || variant === 'offers') {
    // In development mode, don't set a persistent 7-day lockout
    if (!import.meta.env.DEV) {
      // Record session dismissal
      const sessionKey = `nudge_${variant}_dismissed`;
      setUserSessionItem(sessionKey, 'true');

      // Record 7-day cooldown in localStorage
      try {
        const cooldownKey = getUserScopedKey(`nudge_${variant}_cooldown_until`);
        const cooldownUntil = Date.now() + SEVEN_DAYS_MS;
        window.localStorage.setItem(cooldownKey, String(cooldownUntil));
      } catch {
        // Ignore storage write errors
      }
    }

    // Unregister floating surface
    unregisterActiveFloatingPrompt(variant);
  }

  // Notify any active listeners across the page
  try {
    window.dispatchEvent(
      new CustomEvent('stacksave:upgrade_prompt_dismissed', {
        detail: { variant, id },
      })
    );
  } catch {
    // Ignore event dispatch errors
  }
}
