// ============================================================
// Billing Service — StackSave AI Live Razorpay Subscription Billing
// Manages ongoing subscriptions, signature verification, webhook lifecycle,
// and authoritative user Premium entitlement synchronization.
// ============================================================

import crypto from 'crypto';
import mongoose from 'mongoose';
import {
  UserDocument,
  UserModel,
  SubscriptionDocument,
  SubscriptionModel,
  WebhookEventModel,
} from './dbService';

export interface RazorpayBillingConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  quarterlyPlanId: string;
  yearlyPlanId: string;
}

export class BillingServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'BILLING_ERROR', statusCode: number = 400) {
    super(message);
    this.name = 'BillingServiceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Reads Razorpay configuration strictly from environment variables.
 * CRITICAL: Zero hardcoded fallback strings for production Plan IDs or secrets.
 */
export function getRazorpayConfig(): {
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  quarterlyPlanId?: string;
  yearlyPlanId?: string;
} {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || undefined,
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || undefined,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || undefined,
    quarterlyPlanId: process.env.RAZORPAY_PREMIUM_QUARTERLY_PLAN_ID?.trim() || undefined,
    yearlyPlanId: process.env.RAZORPAY_PREMIUM_YEARLY_PLAN_ID?.trim() || undefined,
  };
}

/**
 * Single Authoritative Entitlement Checker across StackSave backend.
 * Determines whether a user currently has Premium entitlements based on
 * verified server-side subscription state.
 *
 * Rules:
 * - ACTIVE → PREMIUM
 * - PENDING + currentPeriodEnd > now → PREMIUM during retry/grace period
 * - CANCELLED at period end + currentPeriodEnd > now → PREMIUM
 * - HALTED → FREE (never Premium, even if cancelAtPeriodEnd=true and currentPeriodEnd in future)
 * - COMPLETED → FREE (never Premium)
 * - EXPIRED → FREE (never Premium)
 * - After currentPeriodEnd for a cancelled subscription → FREE
 */
export function isPremiumUser(
  user: UserDocument,
  subscription?: SubscriptionDocument | null
): boolean {
  if (!user) return false;

  const now = new Date();

  // If subscription document is supplied, evaluate its exact lifecycle state
  if (subscription) {
    // Terminal non-entitled statuses:
    // A HALTED, COMPLETED, or EXPIRED subscription can NEVER receive Premium,
    // even if cancelAtPeriodEnd=true and currentPeriodEnd is still in the future.
    if (
      subscription.status === 'halted' ||
      subscription.status === 'completed' ||
      subscription.status === 'expired'
    ) {
      return false;
    }

    // Paused subscriptions are temporarily suspended (FREE)
    if (subscription.status === 'paused') {
      return false;
    }

    // 1. ACTIVE: Always grants Premium
    if (subscription.status === 'active') {
      return true;
    }

    // 2. PENDING: Retain Premium during retry/grace period while currentPeriodEnd > now
    if (subscription.status === 'pending') {
      return !!(
        subscription.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd) > now
      );
    }

    // 3. CANCELLED (or active subscription marked for cancellation at period end):
    // Retain Premium entitlement strictly until currentPeriodEnd elapses
    if (
      subscription.status === 'cancelled' ||
      subscription.cancelAtPeriodEnd
    ) {
      return !!(
        subscription.currentPeriodEnd &&
        new Date(subscription.currentPeriodEnd) > now
      );
    }

    // All other statuses (e.g. 'created', 'authenticated') do not grant Premium
    return false;
  }

  // Fallback check on user record if subscription document is not queried directly:
  // User must be explicitly marked as PREMIUM plan, and either ACTIVE or
  // in non-terminal CANCELED / PAST_DUE grace period set by syncUserEntitlement.
  // Note: Halted/Completed/Expired always set user.plan = 'FREE'.
  return user.plan === 'PREMIUM' && user.subscriptionStatus !== 'NONE';
}

/**
 * Constant-time string / buffer equality comparison to prevent timing attacks.
 */
function safeTimingEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies Razorpay Checkout signature received upon successful client checkout:
 * HMAC_SHA256(payment_id + "|" + subscription_id, RAZORPAY_KEY_SECRET)
 */
export function verifyCheckoutSignature(params: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const { paymentId, subscriptionId, signature } = params;
  const { keySecret } = getRazorpayConfig();

  if (!keySecret) {
    throw new BillingServiceError(
      'Billing configuration error: Razorpay key secret is not configured.',
      'BILLING_CONFIGURATION_ERROR',
      503
    );
  }

  if (!paymentId || !subscriptionId || !signature) {
    return false;
  }

  const payload = `${paymentId}|${subscriptionId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(payload).digest('hex');
  return safeTimingEqual(signature, expected);
}

/**
 * Verifies Razorpay Webhook signature against raw request body:
 * HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)
 */
export function verifyWebhookSignature(params: {
  rawBody: Buffer | string;
  signature: string;
}): boolean {
  const { rawBody, signature } = params;
  const { webhookSecret } = getRazorpayConfig();

  if (!webhookSecret) {
    throw new BillingServiceError(
      'Billing configuration error: Razorpay webhook secret is not configured.',
      'BILLING_CONFIGURATION_ERROR',
      503
    );
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return safeTimingEqual(signature, expected);
}

/**
 * Helper to call Razorpay official REST API with Basic Auth.
 */
async function callRazorpayApi<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
  } = {}
): Promise<T> {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new BillingServiceError(
      'Billing configuration error: Live Razorpay credentials are not configured.',
      'BILLING_CONFIGURATION_ERROR',
      503
    );
  }

  const url = `https://api.razorpay.com/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;

  const headers: Record<string, string> = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const responseData = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg =
        responseData?.error?.description ||
        responseData?.error?.message ||
        `Razorpay API returned status ${res.status}`;
      console.error(`[Razorpay API Error] ${options.method || 'GET'} ${endpoint} -> ${res.status}:`, errorMsg);
      throw new BillingServiceError(
        errorMsg,
        'BILLING_PROVIDER_ERROR',
        res.status >= 500 ? 502 : 400
      );
    }

    return responseData as T;
  } catch (err: any) {
    if (err instanceof BillingServiceError) throw err;
    console.error(`[Razorpay Network Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw new BillingServiceError(
      'Unable to communicate with payment provider. Please try again.',
      'BILLING_PROVIDER_ERROR',
      502
    );
  }
}

/**
 * Creates an ongoing recurring subscription in Razorpay.
 * Uses Razorpay's 100-year cycle configuration:
 * - Quarterly: 400 cycles (4 cycles/year × 100 years)
 * - Yearly: 100 cycles (1 cycle/year × 100 years)
 * Subscription runs continuously until cancelled by the customer.
 */
export async function createRazorpaySubscription(params: {
  planKey: 'quarterly' | 'yearly';
  user: UserDocument;
}): Promise<any> {
  const { planKey, user } = params;
  const config = getRazorpayConfig();

  // Validate credentials
  if (!config.keyId || !config.keySecret) {
    throw new BillingServiceError(
      'Billing configuration error: Razorpay Live API keys are missing on the server.',
      'BILLING_CONFIGURATION_ERROR',
      503
    );
  }

  // Validate Plan ID from environment variables strictly
  const planId =
    planKey === 'quarterly' ? config.quarterlyPlanId : config.yearlyPlanId;

  if (!planId) {
    throw new BillingServiceError(
      `Billing configuration error: Missing environment variable for ${planKey} plan ID.`,
      'BILLING_CONFIGURATION_ERROR',
      503
    );
  }

  // Ongoing subscription cycles: 100 years duration until customer cancellation
  const totalCount = planKey === 'quarterly' ? 400 : 100;

  const payload = {
    plan_id: planId,
    total_count: totalCount,
    quantity: 1,
    customer_notify: 1,
    notes: {
      userId: user._id.toString(),
      userEmail: user.email,
      planKey,
    },
  };

  return callRazorpayApi('/subscriptions', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Fetches current canonical subscription state from Razorpay API.
 */
export async function fetchRazorpaySubscription(subscriptionId: string): Promise<any> {
  return callRazorpayApi(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'GET',
  });
}

/**
 * Cancels a subscription in Razorpay.
 * Default: cancel_at_cycle_end: 1 (retains entitlement until currentPeriodEnd).
 */
export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = true
): Promise<any> {
  return callRazorpayApi(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: 'POST',
    body: {
      cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
    },
  });
}

/**
 * Synchronizes user model entitlement based on authoritative subscription state.
 */
export async function syncUserEntitlement(
  userId: mongoose.Types.ObjectId | string,
  subscription: SubscriptionDocument
): Promise<UserDocument | null> {
  const user = await UserModel.findById(userId);
  if (!user) return null;

  const isEntitled = isPremiumUser(user, subscription);

  // 1. Explicit handling for subscription.authenticated:
  // Do NOT incorrectly downgrade an already entitled user during mandate authentication
  if (subscription.status === 'authenticated') {
    if (user.plan !== 'PREMIUM') {
      user.plan = 'FREE';
      user.subscriptionStatus = 'NONE';
    }
    await user.save();
    return user;
  }

  user.plan = isEntitled ? 'PREMIUM' : 'FREE';

  // Map Razorpay subscription status to user subscription status
  switch (subscription.status) {
    case 'active':
      user.subscriptionStatus = 'ACTIVE';
      break;
    case 'pending':
      // Grace period: marked PAST_DUE on subscription, but plan remains PREMIUM if within period
      user.subscriptionStatus = 'PAST_DUE';
      break;
    case 'paused':
      // Temporary pause: access suspended (FREE), status modeled as PAUSED
      user.subscriptionStatus = 'PAUSED';
      user.plan = 'FREE';
      break;
    case 'halted':
      user.subscriptionStatus = 'PAST_DUE';
      user.plan = 'FREE';
      break;
    case 'cancelled':
      user.subscriptionStatus = 'CANCELED';
      user.plan = isEntitled ? 'PREMIUM' : 'FREE';
      break;
    case 'completed':
    case 'expired':
      user.subscriptionStatus = 'CANCELED';
      user.plan = 'FREE';
      break;
    case 'created':
    default:
      if (!isEntitled) {
        user.subscriptionStatus = 'NONE';
      }
      break;
  }

  await user.save();
  return user;
}

/**
 * Processes an incoming Razorpay webhook event idempotently.
 */
export async function processRazorpayWebhookEvent(params: {
  eventId: string;
  eventType: string;
  payload: any;
}): Promise<{ processed: boolean; duplicate: boolean; eventId: string }> {
  const { eventId, eventType, payload } = params;

  if (!eventId) {
    throw new BillingServiceError('Missing webhook event ID header.', 'BILLING_WEBHOOK_INVALID', 400);
  }

  // 1. Idempotency Check: Check if this event was already processed
  const existingEvent = await WebhookEventModel.findOne({ eventId });
  if (existingEvent) {
    return { processed: false, duplicate: true, eventId };
  }

  const subEntity = payload?.subscription?.entity;
  const paymentEntity = payload?.payment?.entity;
  const subscriptionId = subEntity?.id;

  if (subscriptionId) {
    const subscription = await SubscriptionModel.findOne({
      razorpaySubscriptionId: subscriptionId,
    });

    if (subscription) {
      // Check event ordering against last updated timestamp if available
      const eventTimestamp = payload?.created_at
        ? new Date(payload.created_at * 1000)
        : new Date();

      if (!subscription.lastSynchronizedAt || eventTimestamp >= subscription.lastSynchronizedAt) {
        // Update subscription state based on webhook event
        const isTerminalNonEntitled =
          subscription.status === 'halted' ||
          subscription.status === 'completed' ||
          subscription.status === 'expired';

        if (subEntity.status && !isTerminalNonEntitled) {
          subscription.status = subEntity.status;
        }

        if (subEntity.current_start) {
          subscription.currentPeriodStart = new Date(subEntity.current_start * 1000);
        }
        if (subEntity.current_end) {
          subscription.currentPeriodEnd = new Date(subEntity.current_end * 1000);
        }
        if (subEntity.charge_at) {
          subscription.chargeAt = new Date(subEntity.charge_at * 1000);
        }
        if (subEntity.customer_id) {
          subscription.razorpayCustomerId = subEntity.customer_id;
        }

        if (paymentEntity?.id) {
          subscription.lastPaymentId = paymentEntity.id;
        }

        subscription.lastWebhookEventId = eventId;
        subscription.lastSynchronizedAt = new Date();

        // Handle specific lifecycle events
        if (eventType === 'subscription.cancelled') {
          subscription.status = 'cancelled';
          subscription.canceledAt = new Date();
          // If currentPeriodEnd is in future, cancelAtPeriodEnd is true
          if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()) {
            subscription.cancelAtPeriodEnd = true;
          }
        } else if (eventType === 'subscription.halted') {
          subscription.status = 'halted';
        } else if (eventType === 'subscription.completed') {
          subscription.status = 'completed';
        } else if (eventType === 'subscription.expired') {
          subscription.status = 'expired';
        } else if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
          subscription.status = 'active';
        } else if (eventType === 'subscription.pending') {
          subscription.status = 'pending';
        } else if (eventType === 'subscription.authenticated') {
          subscription.status = 'authenticated';
        } else if (eventType === 'subscription.paused') {
          subscription.status = 'paused';
        } else if (eventType === 'subscription.resumed') {
          // Model resume: only paused, authenticating, or created subscriptions can transition to active
          // Cannot accidentally grant Premium from a halted, completed, or expired state
          if (
            subscription.status === 'paused' ||
            subscription.status === 'authenticated' ||
            subscription.status === 'created'
          ) {
            subscription.status = 'active';
          }
        }

        await subscription.save();

        // Authoritatively synchronize user entitlement
        await syncUserEntitlement(subscription.userId, subscription);
      }
    }
  }

  // 2. Persist processed event ID for durable idempotency
  await WebhookEventModel.create({
    eventId,
    eventType,
    subscriptionId,
    processedAt: new Date(),
    payloadSummary: {
      status: subEntity?.status,
      paymentId: paymentEntity?.id,
    },
  });

  return { processed: true, duplicate: false, eventId };
}
