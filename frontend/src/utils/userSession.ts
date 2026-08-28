// ============================================================
// userSession — StackSave User-Scoped Session & Identity Layer
//
// Establishes a persistent, isolated client session identifier.
// All user-scoped state (read notifications, active audit, active
// recommendations) is namespaced per user session so no visitor
// inherits or pollutes another user's state.
// ============================================================

const SESSION_KEY = 'stacksave_session_id';

/**
 * Returns a stable unique session ID for the current client.
 * Generated once per client/browser and preserved across page refreshes.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid || sid.trim().length === 0) {
      sid = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'fallback_session';
  }
}

/**
 * Scopes any key to the current user's session.
 * Example: getUserScopedKey('read_offer_ids') -> 'stacksave_usr_abc123_read_offer_ids'
 */
export function getUserScopedKey(baseKey: string): string {
  const sessionId = getOrCreateSessionId();
  return `stacksave_${sessionId}_${baseKey}`;
}

/**
 * Helper to get user-scoped item from sessionStorage (or localStorage fallback).
 */
export function getUserSessionItem(baseKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const scopedKey = getUserScopedKey(baseKey);
    return window.sessionStorage.getItem(scopedKey) || window.sessionStorage.getItem(baseKey);
  } catch {
    return null;
  }
}

/**
 * Helper to set user-scoped item in sessionStorage.
 */
export function setUserSessionItem(baseKey: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = getUserScopedKey(baseKey);
    window.sessionStorage.setItem(scopedKey, value);
  } catch (err) {
    console.warn('setUserSessionItem error:', err);
  }
}

/**
 * Helper to remove user-scoped item from sessionStorage.
 */
export function removeUserSessionItem(baseKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = getUserScopedKey(baseKey);
    window.sessionStorage.removeItem(scopedKey);
  } catch (err) {
    console.warn('removeUserSessionItem error:', err);
  }
}
