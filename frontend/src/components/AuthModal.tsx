// ============================================================
// AuthModal — StackSave Premium SaaS Authentication Dialog
// Unified design system with tactile elevation and clear hierarchy
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            error_callback?: (err: any) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt?: (momentListener?: (notification: any) => void) => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: any) => void;
          };
        };
      };
    };
  }
}

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginWithGoogleToken } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasOfficialButton, setHasOfficialButton] = useState<boolean>(false);
  const officialButtonRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isAuthModalOpen) {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  // Attempt to initialize GIS & render official button if supported
  useEffect(() => {
    if (!isAuthModalOpen) {
      setErrorMsg(null);
      setIsProcessing(false);
      setHasOfficialButton(false);
      return;
    }

    if (!googleClientId) return;

    let intervalId: ReturnType<typeof setInterval>;
    let checkAttempts = 0;

    const tryInitGis = () => {
      checkAttempts++;
      if (window.google?.accounts?.id && officialButtonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response) => {
              try {
                setIsProcessing(true);
                setErrorMsg(null);
                await loginWithGoogleToken({ credential: response.credential });
              } catch (err: any) {
                setErrorMsg(err?.message || "Google sign-in couldn't be completed. Please try again.");
                setIsProcessing(false);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          officialButtonRef.current.innerHTML = '';
          const containerWidth = officialButtonRef.current.parentElement?.clientWidth || (window.innerWidth - 64);
          const computedWidth = Math.min(320, Math.max(220, Math.floor(containerWidth)));
          window.google.accounts.id.renderButton(officialButtonRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: computedWidth,
          });

          setTimeout(() => {
            if (officialButtonRef.current && officialButtonRef.current.children.length > 0) {
              setHasOfficialButton(true);
            }
          }, 300);
        } catch (e) {
          console.warn('[StackSave Auth] GIS renderButton warning:', e);
        }
      }

      if (checkAttempts >= 15 && intervalId) {
        clearInterval(intervalId);
      }
    };

    tryInitGis();
    intervalId = setInterval(tryInitGis, 200);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthModalOpen, googleClientId, loginWithGoogleToken]);

  // Direct OAuth2 popup handler (Always available, robust, and reliable)
  const handleDirectGoogleLogin = useCallback(() => {
    setErrorMsg(null);
    setIsProcessing(true);

    if (!googleClientId) {
      setErrorMsg('Google Client ID is missing. Please check your environment configuration.');
      setIsProcessing(false);
      return;
    }

    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'email profile openid',
          callback: async (tokenResponse) => {
            if (tokenResponse.error) {
              console.error('Google OAuth token error:', tokenResponse.error);
              setIsProcessing(false);
              setErrorMsg(
                tokenResponse.error === 'access_denied'
                  ? 'Sign in was cancelled.'
                  : `Google authentication error: ${tokenResponse.error}`
              );
              return;
            }
            if (tokenResponse.access_token) {
              try {
                await loginWithGoogleToken({ accessToken: tokenResponse.access_token });
              } catch (err: any) {
                setIsProcessing(false);
                setErrorMsg(err?.message || "Google sign-in couldn't be completed. Please try again.");
              }
            } else {
              setIsProcessing(false);
              setErrorMsg('No access token received from Google.');
            }
          },
          error_callback: (err: any) => {
            console.error('Google OAuth popup error:', err);
            setIsProcessing(false);
            setErrorMsg(
              'Could not open Google sign-in window. If popups are blocked, please allow them for localhost.'
            );
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch (err: any) {
        console.error('Failed to trigger token client:', err);
        setIsProcessing(false);
        setErrorMsg(err?.message || "Couldn't initiate Google sign-in.");
      }
    } else if (window.google?.accounts?.id?.prompt) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsProcessing(false);
            setErrorMsg(
              'Google Sign-In prompt could not be displayed. Please verify Authorized JavaScript origins in Google Cloud Console.'
            );
          }
        });
      } catch {
        setIsProcessing(false);
        setErrorMsg('Failed to prompt Google sign-in.');
      }
    } else {
      setIsProcessing(false);
      setErrorMsg(
        'Google Sign-In is still loading or blocked by an ad-blocker. Please pause shields or ad-blocker for localhost.'
      );
    }
  }, [googleClientId, loginWithGoogleToken]);

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          {/* Backdrop: Refined dark translucent overlay with subtle blur */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.16 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2.5px]"
            onClick={closeAuthModal}
            aria-hidden="true"
          />

          {/* Modal Card: Solid, confident enterprise surface (390px responsive width) */}
          <m.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 6 }}
            transition={{ duration: shouldReduceMotion ? 0.05 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[390px] rounded-2xl sm:rounded-[20px] bg-white p-5 sm:p-7 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.03)] border border-slate-200/90 text-center z-10 max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            {/* Minimalist Close Action */}
            <button
              type="button"
              onClick={closeAuthModal}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100/60 sm:bg-transparent hover:bg-slate-100 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-0"
              aria-label="Close dialog"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            {/* ── 1. Unified Brand & Header Section ── */}
            <div className="flex flex-col items-center">
              <div className="mb-2 sm:mb-2.5">
                <Logo size="sm" asDiv />
              </div>

              <h2
                id="auth-modal-title"
                className="text-[22px] sm:text-[24px] font-semibold text-slate-900 tracking-[-0.02em] leading-tight"
              >
                Sign in to StackSave
              </h2>

              <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-slate-500 leading-normal max-w-[280px]">
                Save your audits and personalize your AI intelligence.
              </p>
            </div>

            {/* Error Message (if any) */}
            {errorMsg && (
              <div className="mt-3.5 p-2.5 rounded-xl bg-red-50/90 border border-red-200/80 text-xs font-medium text-red-700 text-left leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold leading-none select-none">!</span>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {/* ── 2. Primary Action: Continue with Google (Hero CTA) ── */}
            <div className="mt-4 sm:mt-5 flex flex-col items-center justify-center">
              {isProcessing ? (
                <div className="w-full h-[46px] sm:h-[50px] flex items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-medium text-slate-600">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-800 animate-spin" />
                  <span>Connecting with Google…</span>
                </div>
              ) : googleClientId ? (
                <div className="w-full flex flex-col items-center">
                  {/* Official GIS Button container (if rendered by Google) */}
                  <div
                    ref={officialButtonRef}
                    className={`flex justify-center w-full transition-opacity ${hasOfficialButton ? 'block' : 'hidden'}`}
                  />

                  {/* Primary Google CTA with distinct 3D elevation, border darkening, and icon pop */}
                  {(!hasOfficialButton || !officialButtonRef.current?.children.length) && (
                    <button
                      type="button"
                      onClick={handleDirectGoogleLogin}
                      disabled={isProcessing}
                      className="group relative w-full h-[46px] sm:h-[50px] flex items-center justify-center gap-2.5 px-3.5 sm:px-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-400/80 hover:bg-slate-50/60 text-slate-800 hover:text-slate-950 font-medium text-[13.5px] sm:text-[14.5px] transition-all duration-200 ease-out shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_6px_20px_-4px_rgba(15,23,42,0.12),0_2px_6px_-1px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] active:shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 disabled:opacity-60 disabled:cursor-not-allowed min-h-0"
                    >
                      <svg
                        className="w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span className="tracking-[-0.01em]">Continue with Google</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-left">
                  <p className="font-semibold mb-1">Google Client ID Required</p>
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    Please configure <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_GOOGLE_CLIENT_ID</code> in your environment file.
                  </p>
                </div>
              )}
            </div>

            {/* ── 3. Subordinate Legal Microcopy ── */}
            <p className="my-2.5 sm:my-3 text-[11px] sm:text-[11.5px] text-slate-400 text-center leading-normal px-1">
              By continuing, you agree to our{' '}
              <Link
                to="/terms"
                onClick={closeAuthModal}
                className="text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Terms
              </Link>{' '}
              and{' '}
              <Link
                to="/privacy"
                onClick={closeAuthModal}
                className="text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors cursor-pointer"
              >
                Privacy Policy
              </Link>
              .
            </p>

            {/* ── 4. Secondary Action: Subordinate, Non-Dominating Guest Button ── */}
            <button
              type="button"
              onClick={closeAuthModal}
              className="w-full h-[36px] sm:h-[38px] min-h-0 rounded-lg border border-slate-200/60 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100/90 active:bg-slate-200/60 text-slate-500 hover:text-slate-800 text-[12.5px] sm:text-[13px] font-medium transition-all duration-150 ease-out flex items-center justify-center cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
            >
              Continue without an account
            </button>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
