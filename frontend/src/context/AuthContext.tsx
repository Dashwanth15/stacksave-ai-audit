// ============================================================
// AuthContext — StackSave AI User Authentication State & Actions
// ============================================================

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { fetchCurrentUser, loginWithGoogle, logoutUser } from '../services/api';

interface OpenAuthModalOptions {
  reason?: string;
  onAuthSuccess?: () => void;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  loginWithGoogleToken: (params: string | { credential?: string; accessToken?: string }) => Promise<User>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalReason: string;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  pendingCallback: (() => void) | null;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<string>('Sign in to StackSave');
  
  // Ref to hold the pending action callback (e.g. save audit) across authentication
  const successCallbackRef = useRef<(() => void) | null>(null);

  // Restore authenticated session on initial app load
  useEffect(() => {
    let isMounted = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openAuthModal = useCallback((options?: OpenAuthModalOptions) => {
    if (options?.reason) {
      setAuthModalReason(options.reason);
    } else {
      setAuthModalReason('Sign in to your StackSave account');
    }
    if (options?.onAuthSuccess) {
      successCallbackRef.current = options.onAuthSuccess;
    } else {
      successCallbackRef.current = null;
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    // Note: Do not clear successCallbackRef immediately on close so if login just completed it can fire
  }, []);

  const loginWithGoogleToken = useCallback(
    async (params: string | { credential?: string; accessToken?: string }): Promise<User> => {
      const authenticatedUser = await loginWithGoogle(params);
      setUser(authenticatedUser);
      setIsAuthModalOpen(false);

      // Mandatory Correction 5: Execute preserved callback (e.g., save current audit)
      if (successCallbackRef.current) {
        try {
          successCallbackRef.current();
        } catch (err) {
          console.error('Error running auth success callback:', err);
        } finally {
          successCallbackRef.current = null;
        }
      }

      return authenticatedUser;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const refreshed = await fetchCurrentUser();
      setUser(refreshed);
      return refreshed;
    } catch {
      return null;
    }
  }, []);

  const value: AuthContextType = {
    user,
    authenticated: !!user,
    loading,
    loginWithGoogleToken,
    logout,
    isAuthModalOpen,
    authModalReason,
    openAuthModal,
    closeAuthModal,
    pendingCallback: successCallbackRef.current,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
