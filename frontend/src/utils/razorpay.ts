// ============================================================
// Razorpay Script Loader & Checkout Helper — StackSave AI
// Loads official checkout.js and wraps initialization in promises
// ============================================================

let razorpayScriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the official Razorpay Checkout SDK.
 * Singleton promise prevents redundant script tags.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<boolean>((resolve) => {
      // Check if already injected in DOM
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        if ((window as any).Razorpay) {
          return resolve(true);
        }
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay Checkout SDK.');
        razorpayScriptPromise = null;
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return razorpayScriptPromise;
}

export interface RazorpayCheckoutHandlerResponse {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface LaunchRazorpayOptions {
  keyId: string;
  subscriptionId: string;
  name?: string;
  description?: string;
  userName?: string;
  userEmail?: string;
  onSuccess: (response: RazorpayCheckoutHandlerResponse) => void;
  onDismiss?: () => void;
}

/**
 * Opens Razorpay Checkout configured for an ongoing Subscription.
 */
export async function launchRazorpaySubscriptionCheckout(
  options: LaunchRazorpayOptions
): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !(window as any).Razorpay) {
    throw new Error('Payment gateway could not be loaded. Please check your network connection.');
  }

  const checkoutOptions = {
    key: options.keyId,
    subscription_id: options.subscriptionId,
    name: options.name || 'StackSave',
    description: options.description || 'StackSave Premium Subscription',
    prefill: {
      name: options.userName || '',
      email: options.userEmail || '',
    },
    theme: {
      color: '#0f172a', // Slate-900 StackSave brand tone
    },
    handler: function (response: RazorpayCheckoutHandlerResponse) {
      if (options.onSuccess) {
        options.onSuccess(response);
      }
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      escape: true,
      backdropclose: false,
    },
  };

  const rzp = new (window as any).Razorpay(checkoutOptions);
  rzp.open();
}
