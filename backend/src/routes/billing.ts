// ============================================================
// Billing Routes — StackSave AI Live Razorpay Subscription Billing
// Endpoints:
// - POST /api/billing/create-subscription (auth required)
// - POST /api/billing/verify (auth required)
// - GET  /api/billing/status (auth required)
// - POST /api/billing/cancel (auth required)
// - POST /api/billing/razorpay/webhook (public, HMAC rawBody verified)
// ============================================================

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import {
  SubscriptionModel,
  UserModel,
} from '../services/dbService';
import {
  isPremiumUser,
  getRazorpayConfig,
  createRazorpaySubscription,
  fetchRazorpaySubscription,
  cancelRazorpaySubscription,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  syncUserEntitlement,
  processRazorpayWebhookEvent,
  BillingServiceError,
} from '../services/billingService';

const router = Router();

// ── POST /api/billing/create-subscription ─────────────────────
// Creates an ongoing recurring subscription with Razorpay for authenticated user
router.post('/create-subscription', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { plan } = req.body;

    // 1. Validate plan key
    if (plan !== 'quarterly' && plan !== 'yearly') {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected. Choose either "quarterly" or "yearly".',
        code: 'BILLING_INVALID_PLAN',
      });
    }

    // 2. Strictly validate Razorpay configuration & required environment variables
    const config = getRazorpayConfig();
    if (!config.keyId || !config.keySecret) {
      return res.status(503).json({
        success: false,
        error: 'Billing configuration error: Live Razorpay credentials are not configured.',
        code: 'BILLING_CONFIGURATION_ERROR',
      });
    }

    const planId = plan === 'quarterly' ? config.quarterlyPlanId : config.yearlyPlanId;
    if (!planId) {
      return res.status(503).json({
        success: false,
        error: `Billing configuration error: Missing environment variable for ${plan} plan ID.`,
        code: 'BILLING_CONFIGURATION_ERROR',
      });
    }

    // 3. Prevent duplicate active subscriptions
    const existingActive = await SubscriptionModel.findOne({
      userId: user._id,
      status: 'active',
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active Premium subscription.',
        code: 'BILLING_ALREADY_SUBSCRIBED',
      });
    }

    // 3. Create subscription with Razorpay
    const rzpSub = await createRazorpaySubscription({
      planKey: plan,
      user,
    });

    if (!rzpSub || !rzpSub.id) {
      return res.status(502).json({
        success: false,
        error: 'Failed to initialize subscription with payment provider.',
        code: 'BILLING_PROVIDER_ERROR',
      });
    }

    // 4. Record pending subscription in database
    await SubscriptionModel.create({
      userId: user._id,
      provider: 'razorpay',
      razorpaySubscriptionId: rzpSub.id,
      razorpayPlanId: rzpSub.plan_id,
      planKey: plan,
      status: 'created',
      lastSynchronizedAt: new Date(),
    });

    // 5. Return safe checkout payload (NEVER secrets)
    return res.status(201).json({
      success: true,
      data: {
        subscriptionId: rzpSub.id,
        keyId: config.keyId,
        plan,
        amount: plan === 'quarterly' ? 5900 : 19900, // paise (₹59 or ₹199)
        currency: 'INR',
        name: 'StackSave',
        description:
          plan === 'quarterly'
            ? 'StackSave Premium – Quarterly (₹59 every 3 months)'
            : 'StackSave Premium – Yearly (₹199 per year)',
      },
    });
  } catch (err: any) {
    if (err instanceof BillingServiceError) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }

    console.error('POST /api/billing/create-subscription error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while creating your subscription.',
      code: 'BILLING_INTERNAL_ERROR',
    });
  }
});

// ── POST /api/billing/verify ──────────────────────────────────
// Immediate server-side signature verification after checkout
router.post('/verify', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

    if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification identifiers.',
        code: 'BILLING_VERIFICATION_FAILED',
      });
    }

    // 1. Subscription Ownership Security: Validate that subscription belongs to authenticated user
    const subscription = await SubscriptionModel.findOne({
      razorpaySubscriptionId: razorpay_subscription_id,
      userId: user._id,
    });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Subscription not found or belongs to another user account.',
        code: 'BILLING_VERIFICATION_FAILED',
      });
    }

    // 2. Cryptographic Signature Verification
    const isValidSignature = verifyCheckoutSignature({
      paymentId: razorpay_payment_id,
      subscriptionId: razorpay_subscription_id,
      signature: razorpay_signature,
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid cryptographic signature.',
        code: 'BILLING_VERIFICATION_FAILED',
      });
    }

    // 3. Fetch canonical state from Razorpay API to sync timestamps
    let rzpSub: any = null;
    try {
      rzpSub = await fetchRazorpaySubscription(razorpay_subscription_id);
    } catch (syncErr) {
      console.warn('Could not sync with Razorpay during verify:', syncErr);
    }

    subscription.status = rzpSub?.status || 'active';
    subscription.lastPaymentId = razorpay_payment_id;
    if (rzpSub?.current_start) {
      subscription.currentPeriodStart = new Date(rzpSub.current_start * 1000);
    }
    if (rzpSub?.current_end) {
      subscription.currentPeriodEnd = new Date(rzpSub.current_end * 1000);
    }
    subscription.lastSynchronizedAt = new Date();
    await subscription.save();

    // 4. Synchronize user entitlement authoritatively
    await syncUserEntitlement(user._id, subscription);

    return res.status(200).json({
      success: true,
      message: 'Subscription verified and activated successfully.',
      data: {
        plan: 'PREMIUM',
        subscriptionStatus: 'ACTIVE',
        billingInterval: subscription.planKey,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (err: any) {
    if (err instanceof BillingServiceError) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }

    console.error('POST /api/billing/verify error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during subscription verification.',
      code: 'BILLING_INTERNAL_ERROR',
    });
  }
});

// ── GET /api/billing/status ───────────────────────────────────
// Authenticated billing status check returning safe frontend information
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Query most recent subscription for this user
    const subscription = await SubscriptionModel.findOne({ userId: user._id }).sort({
      createdAt: -1,
    });

    const isPremium = isPremiumUser(user, subscription);

    return res.status(200).json({
      success: true,
      data: {
        plan: isPremium ? 'PREMIUM' : 'FREE',
        subscriptionStatus: user.subscriptionStatus,
        billingInterval: subscription ? subscription.planKey : null,
        razorpaySubscriptionId: subscription ? subscription.razorpaySubscriptionId : null,
        currentPeriodStart: subscription?.currentPeriodStart || null,
        currentPeriodEnd: subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
        isPremium,
      },
    });
  } catch (err) {
    console.error('GET /api/billing/status error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve billing status.',
      code: 'BILLING_INTERNAL_ERROR',
    });
  }
});

// ── POST /api/billing/cancel ──────────────────────────────────
// Cancels active subscription with Razorpay (defaults to cycle end)
router.post('/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { cancelAtCycleEnd = true } = req.body;

    const subscription = await SubscriptionModel.findOne({
      userId: user._id,
      status: 'active',
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found to cancel.',
        code: 'BILLING_SUBSCRIPTION_NOT_FOUND',
      });
    }

    // Call Razorpay API to cancel
    try {
      await cancelRazorpaySubscription(
        subscription.razorpaySubscriptionId,
        cancelAtCycleEnd !== false
      );
    } catch (rzpErr: any) {
      console.warn('Razorpay cancel API warning:', rzpErr);
    }

    subscription.status = 'cancelled';
    subscription.cancelAtPeriodEnd = cancelAtCycleEnd !== false;
    subscription.canceledAt = new Date();
    subscription.lastSynchronizedAt = new Date();
    await subscription.save();

    // Re-evaluate entitlement (if cancelAtPeriodEnd and currentPeriodEnd > now, still PREMIUM)
    await syncUserEntitlement(user._id, subscription);

    return res.status(200).json({
      success: true,
      message:
        subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd
          ? `Your subscription has been scheduled for cancellation. You will retain Premium access until ${subscription.currentPeriodEnd.toLocaleDateString()}.`
          : 'Your subscription has been cancelled.',
      data: {
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
        isPremium: isPremiumUser(user, subscription),
      },
    });
  } catch (err: any) {
    if (err instanceof BillingServiceError) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }

    console.error('POST /api/billing/cancel error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription.',
      code: 'BILLING_INTERNAL_ERROR',
    });
  }
});

// ── POST /api/billing/razorpay/webhook ────────────────────────
// Authoritative asynchronous webhook handler for subscription lifecycle
router.post('/razorpay/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const eventId =
      (req.headers['x-razorpay-event-id'] as string) || req.body?.event_id;

    // 1. Raw Body Signature Verification
    const rawBody = (req as any).rawBody;
    if (!signature || !rawBody) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook signature or raw body.',
        code: 'BILLING_WEBHOOK_INVALID',
      });
    }

    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.warn('[Razorpay Webhook] Invalid signature rejected.');
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature.',
        code: 'BILLING_WEBHOOK_INVALID',
      });
    }

    const eventType = req.body?.event;
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing webhook event type.',
        code: 'BILLING_WEBHOOK_INVALID',
      });
    }

    // 2. Idempotent Event Processing
    const result = await processRazorpayWebhookEvent({
      eventId: eventId || `fallback_evt_${Date.now()}`,
      eventType,
      payload: req.body?.payload,
    });

    return res.status(200).json({
      success: true,
      received: true,
      eventId: result.eventId,
      duplicate: result.duplicate,
    });
  } catch (err: any) {
    if (err instanceof BillingServiceError) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.message,
        code: err.code,
      });
    }

    console.error('POST /api/billing/razorpay/webhook error:', err);
    return res.status(500).json({
      success: false,
      error: 'Webhook processing error.',
      code: 'BILLING_INTERNAL_ERROR',
    });
  }
});

export default router;
