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
import type { User, SubscriptionPlanKey } from '../types';
import type { UpgradeModalTrigger } from '../components/UpgradeModal';
import {
  fetchCurrentUser,
  loginWithGoogle,
  logoutUser,
  createBillingSubscription,
  verifyBillingPayment,
  invalidateOffersCache,
} from '../services/api';
import { launchRazorpaySubscriptionCheckout } from '../utils/razorpay';

export interface OpenAuthModalOptions {
  reason?: string;
  isPremiumIntent?: boolean;
  selectedPlan?: SubscriptionPlanKey;
  onAuthSuccess?: (user?: User) => void;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  loginWithGoogleToken: (params: string | { credential?: string; accessToken?: string }) => Promise<User>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  authModalReason: string;
  isPremiumIntent: boolean;
  selectedPlanIntent: SubscriptionPlanKey | null;
  openAuthModal: (options?: OpenAuthModalOptions) => void;
  closeAuthModal: () => void;
  isUpgradeModalOpen: boolean;
  upgradeModalType: UpgradeModalTrigger;
  openUpgradeModal: (type?: UpgradeModalTrigger) => void;
  closeUpgradeModal: () => void;
  pendingCallback: ((user?: User) => void) | null;
  refreshUser: () => Promise<User | null>;
  startDirectSubscription: (plan: SubscriptionPlanKey, targetUser?: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalReason, setAuthModalReason] = useState<string>('Sign in to StackSave');
  const [isPremiumIntent, setIsPremiumIntent] = useState<boolean>(false);
  const [selectedPlanIntent, setSelectedPlanIntent] = useState<SubscriptionPlanKey | null>(null);
  
  // Ref to hold the pending action callback (e.g. save audit or continue checkout) across authentication
  const successCallbackRef = useRef<((user?: User) => void) | null>(null);

  // Restore authenticated session on initial app load
  useEffect(() => {
    let isMounted = true;

    // Support mock session for automated UI & visual regression testing
    const mockSession = sessionStorage.getItem('mock_user');
    if (mockSession) {
      try {
        const parsed = JSON.parse(mockSession);
        if (parsed && isMounted) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      } catch {}
    }

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
    setIsPremiumIntent(!!options?.isPremiumIntent);
    setSelectedPlanIntent(options?.selectedPlan || null);

    if (options?.onAuthSuccess) {
      successCallbackRef.current = options.onAuthSuccess;
    } else {
      successCallbackRef.current = null;
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsPremiumIntent(false);
    setSelectedPlanIntent(null);
    // Note: Do not clear successCallbackRef immediately on close so if login just completed it can fire
  }, []);

  const loginWithGoogleToken = useCallback(
    async (params: string | { credential?: string; accessToken?: string }): Promise<User> => {
      const authenticatedUser = await loginWithGoogle(params);
      invalidateOffersCache();
      setUser(authenticatedUser);
      setIsAuthModalOpen(false);
      setIsPremiumIntent(false);
      setSelectedPlanIntent(null);

      // Execute preserved callback with the newly authenticated user
      if (successCallbackRef.current) {
        try {
          successCallbackRef.current(authenticatedUser);
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
      invalidateOffersCache();
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
      invalidateOffersCache();
      setUser(refreshed);
      return refreshed;
    } catch {
      return null;
    }
  }, []);

  const startDirectSubscription = useCallback(
    async (plan: SubscriptionPlanKey, targetUser?: User) => {
      const effectiveUser = targetUser || user;
      if (!effectiveUser) {
        console.warn('Cannot start direct subscription without an authenticated user.');
        return;
      }
      try {
        const checkoutConfig = await createBillingSubscription(plan);
        await launchRazorpaySubscriptionCheckout({
          keyId: checkoutConfig.keyId,
          subscriptionId: checkoutConfig.subscriptionId,
          name: checkoutConfig.name,
          description: checkoutConfig.description,
          userName: effectiveUser.name,
          userEmail: effectiveUser.email,
          onSuccess: async (rzpResponse) => {
            try {
              await verifyBillingPayment({
                razorpay_payment_id: rzpResponse.razorpay_payment_id,
                razorpay_subscription_id: rzpResponse.razorpay_subscription_id,
                razorpay_signature: rzpResponse.razorpay_signature,
              });
              invalidateOffersCache();
              await refreshUser();
            } catch (verifyErr) {
              console.error('Subscription verification error:', verifyErr);
              setTimeout(async () => {
                invalidateOffersCache();
                await refreshUser();
              }, 3000);
            }
          },
          onDismiss: () => {
            console.log('Razorpay payment dismissed by user.');
          },
        });
      } catch (err) {
        console.error('Direct subscription launch failed:', err);
      }
    },
    [user, refreshUser]
  );

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [upgradeModalType, setUpgradeModalType] = useState<UpgradeModalTrigger>('general');

  // Auto-close upgrade modal if user becomes Premium mid-flow
  useEffect(() => {
    if (user?.plan === 'PREMIUM' && isUpgradeModalOpen && upgradeModalType !== 'general') {
      setIsUpgradeModalOpen(false);
    }
  }, [user?.plan, isUpgradeModalOpen, upgradeModalType]);

  const openUpgradeModal = useCallback((type?: UpgradeModalTrigger) => {
    setUpgradeModalType(type || 'general');
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
  }, []);

  const value: AuthContextType = {
    user,
    authenticated: !!user,
    loading,
    loginWithGoogleToken,
    logout,
    isAuthModalOpen,
    authModalReason,
    isPremiumIntent,
    selectedPlanIntent,
    openAuthModal,
    closeAuthModal,
    isUpgradeModalOpen,
    upgradeModalType,
    openUpgradeModal,
    closeUpgradeModal,
    pendingCallback: successCallbackRef.current,
    refreshUser,
    startDirectSubscription,
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
