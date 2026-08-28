// ============================================================
// useUserScopedStorage Hook
//
// Type-safe localStorage hook automatically namespaced to the
// current user's session identifier. Ensures complete state
// isolation between users.
// ============================================================

import { useState, useCallback } from 'react';
import { getUserScopedKey } from '../utils/userSession';

export function useUserScopedStorage<T>(baseKey: string, initialValue: T) {
  const scopedKey = getUserScopedKey(baseKey);

  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(scopedKey);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prev) => {
          const valueToStore = value instanceof Function ? value(prev) : value;
          window.localStorage.setItem(scopedKey, JSON.stringify(valueToStore));
          return valueToStore;
        });
      } catch (error) {
        console.warn('useUserScopedStorage setValue error:', error);
      }
    },
    [scopedKey]
  );

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(scopedKey);
      setStoredValue(initialValue);
    } catch (error) {
      console.warn('useUserScopedStorage removeValue error:', error);
    }
  }, [scopedKey, initialValue]);

  return [storedValue, setValue, removeValue] as const;
}
