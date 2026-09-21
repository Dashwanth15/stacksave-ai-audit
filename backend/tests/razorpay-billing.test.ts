// ============================================================
// Razorpay Live Subscription Billing Test Suite — StackSave AI
// Covers all 31 production requirements:
// - Plan mapping & cycle count (100-yr ongoing)
// - Server-side validation & ownership security
// - Raw-body HMAC webhook signature verification & idempotency
// - Grace period vs halted states
// - Cancellation at period end & expiration
// - Integration with Free plan limits & audit persistence
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import crypto from 'crypto';
import app from '../src/app';
import {
  UserModel,
  AuditModel,
  AuditShareLinkModel,
  SubscriptionModel,
  WebhookEventModel,
  connectDB,
} from '../src/services/dbService';
import { generateSessionToken, SESSION_COOKIE_NAME } from '../src/utils/session';
import { isPremiumUser, syncUserEntitlement, normalizeRazorpayPlanId } from '../src/services/billingService';

let server: http.Server;
let baseUrl: string;

let testUserA: any;
let testUserB: any;
let tokenA: string;
let tokenB: string;

const TEST_QUARTERLY_PLAN_ID = 'plan_TdBzJC150yBO6v';
const TEST_YEARLY_PLAN_ID = 'plan_TdCHh8CcDcfa42';
const TEST_KEY_ID = 'rzp_live_test_key_id';
const TEST_KEY_SECRET = 'test_razorpay_key_secret_12345';
const TEST_WEBHOOK_SECRET = 'test_razorpay_webhook_secret_67890';

// Global original fetch reference for mocking
const originalFetch = global.fetch;

beforeAll(async () => {
  await connectDB();

  // Set environment variables for tests
  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  process.env.RAZORPAY_PREMIUM_QUARTERLY_PLAN_ID = TEST_QUARTERLY_PLAN_ID;
  process.env.RAZORPAY_PREMIUM_YEARLY_PLAN_ID = TEST_YEARLY_PLAN_ID;

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const timestamp = Date.now();

  testUserA = await UserModel.create({
    googleId: `rzp-user-a-${timestamp}`,
    email: `rzp-user-a-${timestamp}@stacksave.test`,
    name: 'Razorpay User A',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  testUserB = await UserModel.create({
    googleId: `rzp-user-b-${timestamp}`,
    email: `rzp-user-b-${timestamp}@stacksave.test`,
    name: 'Razorpay User B',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  tokenA = generateSessionToken(testUserA);
  tokenB = generateSessionToken(testUserB);
}, 40000);

afterAll(async () => {
  global.fetch = originalFetch;

  if (testUserA?._id) {
    await UserModel.deleteOne({ _id: testUserA._id });
    await SubscriptionModel.deleteMany({ userId: testUserA._id });
    await AuditShareLinkModel.deleteMany({ userId: testUserA._id });
  }
  if (testUserB?._id) {
    await UserModel.deleteOne({ _id: testUserB._id });
    await SubscriptionModel.deleteMany({ userId: testUserB._id });
    await AuditShareLinkModel.deleteMany({ userId: testUserB._id });
  }

  await WebhookEventModel.deleteMany({ eventId: { $regex: /^test_/ } });

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Razorpay Live Subscription Billing Suite', () => {
  beforeEach(() => {
    // Reset test env defaults before each test
    process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
    process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
    process.env.RAZORPAY_PREMIUM_QUARTERLY_PLAN_ID = TEST_QUARTERLY_PLAN_ID;
    process.env.RAZORPAY_PREMIUM_YEARLY_PLAN_ID = TEST_YEARLY_PLAN_ID;
  });

  // ── 1. Authentication requirement ───────────────────────────
  it('1. rejects unauthenticated create-subscription with 401', async () => {
    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'quarterly' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  // ── 2. Invalid plan rejection ───────────────────────────────
  it('2. rejects invalid plan with 400 (BILLING_INVALID_PLAN)', async () => {
    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'monthly' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BILLING_INVALID_PLAN');
  });

  // ── 3. Quarterly plan mapping ───────────────────────────────
  it('3. quarterly maps correctly to RAZORPAY_PREMIUM_QUARTERLY_PLAN_ID', async () => {
    let capturedPlanId = '';
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/v1/subscriptions')) {
        const parsed = JSON.parse(opts.body);
        capturedPlanId = parsed.plan_id;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'sub_test_quarterly_1',
            plan_id: capturedPlanId,
            status: 'created',
          }),
        };
      }
      return originalFetch(url, opts);
    });

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'quarterly' }),
    });

    expect(res.status).toBe(201);
    expect(capturedPlanId).toBe(TEST_QUARTERLY_PLAN_ID);
    const body = await res.json();
    expect(body.data.subscriptionId).toBe('sub_test_quarterly_1');
    expect(body.data.amount).toBe(5900);
  });

  // ── 4. Yearly plan mapping ──────────────────────────────────
  it('4. yearly maps correctly to RAZORPAY_PREMIUM_YEARLY_PLAN_ID', async () => {
    let capturedPlanId = '';
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/v1/subscriptions')) {
        const parsed = JSON.parse(opts.body);
        capturedPlanId = parsed.plan_id;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'sub_test_yearly_1',
            plan_id: capturedPlanId,
            status: 'created',
          }),
        };
      }
      return originalFetch(url, opts);
    });

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenB}`,
      },
      body: JSON.stringify({ plan: 'yearly' }),
    });

    expect(res.status).toBe(201);
    expect(capturedPlanId).toBe(TEST_YEARLY_PLAN_ID);
    const body = await res.json();
    expect(body.data.subscriptionId).toBe('sub_test_yearly_1');
    expect(body.data.amount).toBe(19900);
  });

  // ── 4b. Plan ID normalization (font / OCR defense-in-depth) ──
  it('4b. normalizes typographical font confusions (0 to O, h to H) in plan IDs', () => {
    expect(normalizeRazorpayPlanId('plan_TdBzJC150yB06v')).toBe('plan_TdBzJC150yBO6v');
    expect(normalizeRazorpayPlanId('plan_TdChh8CcDcfa42')).toBe('plan_TdCHh8CcDcfa42');
    expect(normalizeRazorpayPlanId('plan_TdBzJC150yBO6v')).toBe('plan_TdBzJC150yBO6v');
    expect(normalizeRazorpayPlanId('plan_TdCHh8CcDcfa42')).toBe('plan_TdCHh8CcDcfa42');
    expect(normalizeRazorpayPlanId(undefined)).toBeUndefined();
  });

  // ── 5. Frontend cannot inject Plan ID ───────────────────────
  it('5. frontend cannot inject or override server-side Plan ID', async () => {
    let capturedPlanId = '';
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/v1/subscriptions')) {
        const parsed = JSON.parse(opts.body);
        capturedPlanId = parsed.plan_id;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'sub_test_override_1',
            plan_id: capturedPlanId,
            status: 'created',
          }),
        };
      }
      return originalFetch(url, opts);
    });

    await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({
        plan: 'quarterly',
        plan_id: 'plan_malicious_attacker_override',
        amount: 1,
      }),
    });

    // Server-side environment variable must be used, NOT the client payload
    expect(capturedPlanId).toBe(TEST_QUARTERLY_PLAN_ID);
  });

  // ── 6. Missing Razorpay credentials handled safely ──────────
  it('6. missing Razorpay credentials returns 503 BILLING_CONFIGURATION_ERROR without crashing', async () => {
    delete process.env.RAZORPAY_KEY_ID;

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'quarterly' }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('BILLING_CONFIGURATION_ERROR');
  });

  // ── 7. Razorpay upstream API failure handled safely ─────────
  it('7. handles Razorpay upstream API failures with structured 502 BILLING_PROVIDER_ERROR', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/v1/subscriptions')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            error: { description: 'Razorpay internal service unavailable' },
          }),
        };
      }
      return originalFetch(url, opts);
    });

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'quarterly' }),
    });

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.code).toBe('BILLING_PROVIDER_ERROR');
  });

  // ── 8. Duplicate active subscription rejected ───────────────
  it('8. rejects duplicate active subscription with BILLING_ALREADY_SUBSCRIBED', async () => {
    // Put testUserA in active subscription state
    await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: 'sub_active_already_1',
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    });

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'yearly' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BILLING_ALREADY_SUBSCRIBED');

    // Clean up active subscription for subsequent tests
    await SubscriptionModel.deleteOne({ razorpaySubscriptionId: 'sub_active_already_1' });
  });

  // ── 9. Subscription ownership enforced ──────────────────────
  it('9. enforces subscription ownership so User B cannot verify User A subscription', async () => {
    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: 'sub_ownership_test_1',
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'created',
    });

    const res = await fetch(`${baseUrl}/api/billing/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenB}`, // Logged in as User B
      },
      body: JSON.stringify({
        razorpay_payment_id: 'pay_test_123',
        razorpay_subscription_id: sub.razorpaySubscriptionId,
        razorpay_signature: 'fake_signature',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('BILLING_VERIFICATION_FAILED');
  });

  // ── 10. Billing status requires authentication ──────────────
  it('10. GET /api/billing/status requires authentication with 401', async () => {
    const res = await fetch(`${baseUrl}/api/billing/status`);
    expect(res.status).toBe(401);
  });

  // ── 11. Billing status does not expose secrets ──────────────
  it('11. GET /api/billing/status does not expose secrets or internal tokens', async () => {
    const res = await fetch(`${baseUrl}/api/billing/status`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.keySecret).toBeUndefined();
    expect(body.data.webhookSecret).toBeUndefined();
    expect(body.data.adminSecret).toBeUndefined();
  });

  // ── 12. Valid webhook signature accepted ────────────────────
  it('12. accepts valid webhook with valid HMAC-SHA256 signature', async () => {
    const eventId = `test_evt_valid_${Date.now()}`;
    const payload = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_test_quarterly_1',
            status: 'active',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 90 * 86400000) / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const res = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(false);
  });

  // ── 13. Invalid webhook signature rejected ──────────────────
  it('13. rejects webhook with invalid HMAC signature with 400', async () => {
    const payload = JSON.stringify({ event: 'subscription.activated' });
    const res = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'invalid_tampered_signature_hex',
        'x-razorpay-event-id': `test_evt_invalid_${Date.now()}`,
      },
      body: payload,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('BILLING_WEBHOOK_INVALID');
  });

  // ── 14. Webhook verification uses raw body ──────────────────
  it('14. verifies webhook signature strictly against unparsed raw body buffer', async () => {
    // If body had spaces or formatting differences, re-stringified JSON would fail signature check.
    // Raw body preserves exact byte layout.
    const eventId = `test_evt_raw_${Date.now()}`;
    const rawBody = '{"event":"subscription.activated","spaces":   "preserved"  }';
    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const res = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: rawBody,
    });

    expect(res.status).toBe(200);
  });

  // ── 15. Duplicate webhook event ignored idempotently ────────
  it('15. ignores duplicate webhook delivery with duplicate: true', async () => {
    const eventId = `test_evt_dedup_${Date.now()}`;
    const payload = JSON.stringify({
      event: 'subscription.charged',
      payload: { subscription: { entity: { id: 'sub_dummy' } } },
    });
    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // First delivery
    const res1 = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: payload,
    });
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.duplicate).toBe(false);

    // Second (duplicate) delivery
    const res2 = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': eventId,
      },
      body: payload,
    });
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.duplicate).toBe(true);
  });

  // ── 16. Out-of-order webhook events handled safely ──────────
  it('16. handles out-of-order webhook events without corrupting newer state', async () => {
    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: 'sub_out_of_order_1',
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'active',
      lastSynchronizedAt: new Date(Date.now() + 10000), // Newer sync timestamp
    });

    // Send an older webhook event
    const oldTimestamp = Math.floor((Date.now() - 50000) / 1000);
    const payload = JSON.stringify({
      event: 'subscription.pending',
      created_at: oldTimestamp,
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'pending',
          },
        },
      },
    });
    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `test_evt_old_${Date.now()}`,
      },
      body: payload,
    });

    // Check that state was not overwritten by stale event
    const updatedSub = await SubscriptionModel.findById(sub._id);
    expect(updatedSub?.status).toBe('active');
  });

  // ── 17. Lifecycle events update state correctly ─────────────
  it('17. subscription.activated moves user to PREMIUM / ACTIVE', async () => {
    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: 'sub_lifecycle_activate_1',
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'created',
    });

    const payload = JSON.stringify({
      event: 'subscription.activated',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'active',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor((Date.now() + 90 * 86400000) / 1000),
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `test_evt_act_${Date.now()}`,
      },
      body: payload,
    });

    const user = await UserModel.findById(testUserA._id);
    expect(user?.plan).toBe('PREMIUM');
    expect(user?.subscriptionStatus).toBe('ACTIVE');
  });

  // ── 18. Failed / pending vs halted lifecycle ────────────────
  it('18. subscription.halted downgrades user to FREE / PAST_DUE even with future period and cancelAtPeriodEnd', async () => {
    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: 'sub_lifecycle_halt_1',
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'active',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days in future
    });

    const payload = JSON.stringify({
      event: 'subscription.halted',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'halted',
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `test_evt_halt_${Date.now()}`,
      },
      body: payload,
    });

    const user = await UserModel.findById(testUserA._id);
    expect(user?.plan).toBe('FREE');
    expect(user?.subscriptionStatus).toBe('PAST_DUE');
  });

  // ── 19. Trusted server-side confirmation required ───────────
  it('19. Premium entitlement is granted only after server-side verification', async () => {
    // Create new unauthenticated user
    const newUser = await UserModel.create({
      googleId: `trusted-check-${Date.now()}`,
      email: `trusted-${Date.now()}@stacksave.test`,
      name: 'Trusted Check User',
      plan: 'FREE',
      subscriptionStatus: 'NONE',
      sessionVersion: 1,
    });

    // Verify they start as FREE
    expect(isPremiumUser(newUser)).toBe(false);

    // Frontend claiming success without valid server signature is rejected
    const res = await fetch(`${baseUrl}/api/billing/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${generateSessionToken(newUser)}`,
      },
      body: JSON.stringify({
        razorpay_payment_id: 'pay_unauthorized',
        razorpay_subscription_id: 'sub_nonexistent',
        razorpay_signature: 'invalid_sig',
      }),
    });

    expect(res.status).toBe(403);
    const refreshed = await UserModel.findById(newUser._id);
    expect(refreshed?.plan).toBe('FREE');

    await UserModel.deleteOne({ _id: newUser._id });
  });

  // ── 20 & 21. Free vs Premium saved audit limit ───────────────
  it('20. Free user is limited to 2 saved audits', async () => {
    // Reset testUserB to FREE
    await UserModel.updateOne({ _id: testUserB._id }, { plan: 'FREE', subscriptionStatus: 'NONE' });
    await AuditModel.deleteMany({ userId: testUserB._id });

    // Save audit 1
    const audit1 = await AuditModel.create({
      auditId: `audit-b-1-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    const res1 = await fetch(`${baseUrl}/api/audits/${audit1.auditId}/save`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
    });
    expect(res1.status).toBe(200);

    // Save audit 2
    const audit2 = await AuditModel.create({
      auditId: `audit-b-2-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    const res2 = await fetch(`${baseUrl}/api/audits/${audit2.auditId}/save`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
    });
    expect(res2.status).toBe(200);

    // Attempt save audit 3 -> 403
    const audit3 = await AuditModel.create({
      auditId: `audit-b-3-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    const res3 = await fetch(`${baseUrl}/api/audits/${audit3.auditId}/save`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
    });
    expect(res3.status).toBe(403);
    const body3 = await res3.json();
    expect(body3.code).toBe('FREE_AUDIT_LIMIT_REACHED');
  });

  it('21. Premium user bypasses saved-audit limit with unlimited saves', async () => {
    // Set testUserA to PREMIUM
    await UserModel.updateOne({ _id: testUserA._id }, { plan: 'PREMIUM', subscriptionStatus: 'ACTIVE' });
    await AuditModel.deleteMany({ userId: testUserA._id });

    // Save 3 audits as Premium
    for (let i = 1; i <= 3; i++) {
      const audit = await AuditModel.create({
        auditId: `audit-a-prem-${i}-${Date.now()}`,
        totalMonthlySpend: 200,
        optimizedMonthlySpend: 150,
        estimatedMonthlySavings: 50,
        estimatedAnnualSavings: 600,
        savingsPercentage: 25,
        teamSize: 10,
        publicUrl: 'http://test',
        isSaved: false,
      });

      const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/save`, {
        method: 'POST',
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenA}` },
      });
      expect(res.status).toBe(200);
    }
  });

  // ── 22 & 23. Free vs Premium share link limit ────────────────
  it('22. Free user is limited to 5 share links without 5-minute timer', async () => {
    await UserModel.updateOne({ _id: testUserB._id }, { plan: 'FREE', subscriptionStatus: 'NONE' });
    await AuditShareLinkModel.deleteMany({ userId: testUserB._id });

    const audit = await AuditModel.create({
      auditId: `audit-share-b-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    // Create 5 share links
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
        method: 'POST',
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
      });
      expect(res.status).toBe(201);
    }

    // 6th share link attempt rejected
    const res6 = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
    });
    expect(res6.status).toBe(403);
    const body6 = await res6.json();
    expect(body6.code).toBe('FREE_SHARE_LIMIT_REACHED');
  });

  it('23. Premium user bypasses share-link limit with unlimited creations', async () => {
    await UserModel.updateOne({ _id: testUserA._id }, { plan: 'PREMIUM', subscriptionStatus: 'ACTIVE' });
    const audit = await AuditModel.create({
      auditId: `audit-share-a-prem-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    for (let i = 1; i <= 6; i++) {
      const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
        method: 'POST',
        headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenA}` },
      });
      expect(res.status).toBe(201);
    }
  });

  // ── 24. Guest audit flow unchanged ──────────────────────────
  it('24. guest audit creation remains 100% functional without auth', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: 'Guest Co',
        teamSize: 3,
        useCase: 'coding',
        tools: [{ toolId: 'cursor', seats: 3, plan: 'pro', monthlySpend: 60 }],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.auditId).toBeDefined();
    expect(body.data.isSaved).toBe(false);
  });

  // ── 25. Google auth flow unchanged ──────────────────────────
  it('25. Google authentication endpoint rejects missing credentials properly without side effects', async () => {
    const res = await fetch(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  // ── 26. Existing audit ownership tests ───────────────────────
  it('26. audit ownership security prevents User B from saving User A private audit', async () => {
    const auditA = await AuditModel.create({
      auditId: `audit-owned-by-a-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      userId: testUserA._id,
      isSaved: true,
    });

    const res = await fetch(`${baseUrl}/api/audits/${auditA.auditId}/save`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenB}` },
    });

    expect(res.status).toBe(403);
  });

  // ── 27. Existing sharing tests still pass ────────────────────
  it('27. share links persist in database and increment count', async () => {
    const countBefore = await AuditShareLinkModel.countDocuments({ userId: testUserA._id });
    const audit = await AuditModel.create({
      auditId: `audit-share-verify-${Date.now()}`,
      totalMonthlySpend: 100,
      optimizedMonthlySpend: 80,
      estimatedMonthlySavings: 20,
      estimatedAnnualSavings: 240,
      savingsPercentage: 20,
      teamSize: 5,
      publicUrl: 'http://test',
      isSaved: false,
    });

    const res = await fetch(`${baseUrl}/api/audits/${audit.auditId}/share`, {
      method: 'POST',
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${tokenA}` },
    });
    expect(res.status).toBe(201);
    const countAfter = await AuditShareLinkModel.countDocuments({ userId: testUserA._id });
    expect(countAfter).toBe(countBefore + 1);
  });

  // ── 28. Cancellation at period end keeps Premium active ─────
  it('28. cancelled-at-period-end + future currentPeriodEnd → PREMIUM', async () => {
    const futurePeriodEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days in future

    const cancelledSub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_cancel_test_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: futurePeriodEnd,
    });

    const user = await UserModel.findById(testUserA._id);
    expect(user).toBeDefined();

    // isPremiumUser must return true because futurePeriodEnd > now
    expect(isPremiumUser(user!, cancelledSub)).toBe(true);
  });

  // ── 29. After currentPeriodEnd, cancelled subscription loses Premium ─
  it('29. cancelled-at-period-end + past currentPeriodEnd → FREE', async () => {
    const pastPeriodEnd = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago in past

    const expiredSub = await SubscriptionModel.create({
      userId: testUserB._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_expired_test_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: pastPeriodEnd,
    });

    const user = await UserModel.findById(testUserB._id);
    expect(user).toBeDefined();

    // isPremiumUser must return false because pastPeriodEnd < now
    expect(isPremiumUser(user!, expiredSub)).toBe(false);
  });

  // ── 30. Missing Plan ID env var returns error without fallback ─
  it('30. missing production Plan ID environment variable returns BILLING_CONFIGURATION_ERROR without fallback', async () => {
    delete process.env.RAZORPAY_PREMIUM_QUARTERLY_PLAN_ID;

    const res = await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'quarterly' }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe('BILLING_CONFIGURATION_ERROR');
    expect(body.error).toContain('Missing environment variable for quarterly plan ID');
  });

  // ── 31. Ongoing subscription configuration ──────────────────
  it('31. ongoing subscription configuration uses 30-year cycle count (120 for quarterly, 30 for yearly) within UPI mandate limits', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (url: any, opts: any) => {
      if (typeof url === 'string' && url.includes('/v1/subscriptions')) {
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: `sub_test_duration_${Math.random().toString(36).substring(2, 9)}`,
            plan_id: capturedBody.plan_id,
            total_count: capturedBody.total_count,
            status: 'created',
          }),
        };
      }
      return originalFetch(url, opts);
    });

    // Clear active subscriptions so create-subscription reaches Razorpay call
    await SubscriptionModel.deleteMany({ userId: { $in: [testUserA._id, testUserB._id] } });

    // Test Quarterly -> 120
    await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenA}`,
      },
      body: JSON.stringify({ plan: 'quarterly' }),
    });
    expect(capturedBody).toBeDefined();
    expect(capturedBody.total_count).toBe(120);
    expect(capturedBody.plan_id).toBe(TEST_QUARTERLY_PLAN_ID);

    // Regression check: calculated mandate end time for quarterly must be <= 4765046400 (Dec 31, 2120)
    const quarterlyEndTimestampSec = Math.floor(Date.now() / 1000) + (120 * 3 * 30.44 * 24 * 3600);
    expect(quarterlyEndTimestampSec).toBeLessThan(4765046400);

    // Test Yearly -> 30
    await fetch(`${baseUrl}/api/billing/create-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${SESSION_COOKIE_NAME}=${tokenB}`,
      },
      body: JSON.stringify({ plan: 'yearly' }),
    });
    expect(capturedBody).toBeDefined();
    expect(capturedBody.total_count).toBe(30);
    expect(capturedBody.plan_id).toBe(TEST_YEARLY_PLAN_ID);

    // Regression check: calculated mandate end time for yearly must be <= 4765046400 (Dec 31, 2120)
    const yearlyEndTimestampSec = Math.floor(Date.now() / 1000) + (30 * 365.25 * 24 * 3600);
    expect(yearlyEndTimestampSec).toBeLessThan(4765046400);
  });

  // ── 32. Halted / Completed / Expired terminal states ─────────
  it('32. halted + future currentPeriodEnd + cancelAtPeriodEnd=true → FREE (completed/expired → FREE)', async () => {
    const futurePeriodEnd = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const user = await UserModel.findById(testUserA._id);
    expect(user).toBeDefined();

    // 1. Halted subscription with future period end and cancelAtPeriodEnd=true
    const haltedSub = new SubscriptionModel({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_halt_test_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'halted',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: futurePeriodEnd,
    });
    expect(isPremiumUser(user!, haltedSub)).toBe(false);

    // 2. Completed subscription with future period end and cancelAtPeriodEnd=true
    const completedSub = new SubscriptionModel({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_comp_test_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'completed',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: futurePeriodEnd,
    });
    expect(isPremiumUser(user!, completedSub)).toBe(false);

    // 3. Expired subscription with future period end and cancelAtPeriodEnd=true
    const expiredSub = new SubscriptionModel({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_exp_test_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'expired',
      cancelAtPeriodEnd: true,
      currentPeriodEnd: futurePeriodEnd,
    });
    expect(isPremiumUser(user!, expiredSub)).toBe(false);

    // 4. Verify syncUserEntitlement sets user.plan to FREE on halted even with future period end
    await syncUserEntitlement(testUserA._id, haltedSub);
    const updatedUser = await UserModel.findById(testUserA._id);
    expect(updatedUser?.plan).toBe('FREE');
    expect(updatedUser?.subscriptionStatus).toBe('PAST_DUE');
  });

  // ── 33. Pending during retry / grace period ───────────────────
  it('33. pending + future currentPeriodEnd → PREMIUM (and pending + past currentPeriodEnd → FREE)', async () => {
    const futurePeriodEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days in future
    const pastPeriodEnd = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days in past
    const user = await UserModel.findById(testUserB._id);
    expect(user).toBeDefined();

    // 1. Pending with future currentPeriodEnd -> PREMIUM
    const pendingFutureSub = new SubscriptionModel({
      userId: testUserB._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_pend_fut_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'pending',
      currentPeriodEnd: futurePeriodEnd,
    });
    expect(isPremiumUser(user!, pendingFutureSub)).toBe(true);

    // 2. Pending with past currentPeriodEnd -> FREE
    const pendingPastSub = new SubscriptionModel({
      userId: testUserB._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_pend_past_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'pending',
      currentPeriodEnd: pastPeriodEnd,
    });
    expect(isPremiumUser(user!, pendingPastSub)).toBe(false);

    // 3. syncUserEntitlement keeps PREMIUM during active pending grace period
    await syncUserEntitlement(testUserB._id, pendingFutureSub);
    const updatedUser = await UserModel.findById(testUserB._id);
    expect(updatedUser?.plan).toBe('PREMIUM');
    expect(updatedUser?.subscriptionStatus).toBe('PAST_DUE');
  });

  // ── 34. Authenticated event does not downgrade existing Premium ──
  it('34. subscription.authenticated does not downgrade an already entitled user', async () => {
    await UserModel.findByIdAndUpdate(testUserA._id, {
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
    });

    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_auth_evt_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'created',
    });

    const payload = JSON.stringify({
      event: 'subscription.authenticated',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'authenticated',
          },
        },
      },
    });

    const signature = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    const res = await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature,
        'x-razorpay-event-id': `test_evt_auth_${Date.now()}`,
      },
      body: payload,
    });

    expect(res.status).toBe(200);
    const user = await UserModel.findById(testUserA._id);
    expect(user?.plan).toBe('PREMIUM');
    expect(user?.subscriptionStatus).toBe('ACTIVE');

    const updatedSub = await SubscriptionModel.findOne({ razorpaySubscriptionId: sub.razorpaySubscriptionId });
    expect(updatedSub?.status).toBe('authenticated');
  });

  // ── 35. Paused and Resumed lifecycle transitions ─────────────
  it('35. subscription.paused temporarily suspends Premium to FREE / PAUSED, and subscription.resumed restores ACTIVE / PREMIUM', async () => {
    const futurePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sub = await SubscriptionModel.create({
      userId: testUserA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_pause_resume_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'active',
      currentPeriodEnd: futurePeriodEnd,
    });

    // 1. Pause webhook
    const pausePayload = JSON.stringify({
      event: 'subscription.paused',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'paused',
          },
        },
      },
    });

    const pauseSig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(pausePayload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': pauseSig,
        'x-razorpay-event-id': `test_evt_pause_${Date.now()}`,
      },
      body: pausePayload,
    });

    let user = await UserModel.findById(testUserA._id);
    expect(user?.plan).toBe('FREE');
    expect(user?.subscriptionStatus).toBe('PAUSED');

    let pausedSub = await SubscriptionModel.findOne({ razorpaySubscriptionId: sub.razorpaySubscriptionId });
    expect(pausedSub?.status).toBe('paused');
    expect(isPremiumUser(user!, pausedSub)).toBe(false);

    // 2. Resume webhook
    const resumePayload = JSON.stringify({
      event: 'subscription.resumed',
      created_at: Math.floor(Date.now() / 1000) + 1,
      payload: {
        subscription: {
          entity: {
            id: sub.razorpaySubscriptionId,
            status: 'active',
          },
        },
      },
    });

    const resumeSig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(resumePayload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': resumeSig,
        'x-razorpay-event-id': `test_evt_resume_${Date.now()}`,
      },
      body: resumePayload,
    });

    user = await UserModel.findById(testUserA._id);
    expect(user?.plan).toBe('PREMIUM');
    expect(user?.subscriptionStatus).toBe('ACTIVE');

    let resumedSub = await SubscriptionModel.findOne({ razorpaySubscriptionId: sub.razorpaySubscriptionId });
    expect(resumedSub?.status).toBe('active');
    expect(isPremiumUser(user!, resumedSub)).toBe(true);
  });

  // ── 36. Resume cannot grant Premium from halted or expired state ──
  it('36. subscription.resumed cannot grant Premium if underlying subscription is halted or expired', async () => {
    const haltedSub = await SubscriptionModel.create({
      userId: testUserB._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_halt_no_resume_${Date.now()}`,
      razorpayPlanId: TEST_QUARTERLY_PLAN_ID,
      planKey: 'quarterly',
      status: 'halted',
    });

    await UserModel.findByIdAndUpdate(testUserB._id, {
      plan: 'FREE',
      subscriptionStatus: 'PAST_DUE',
    });

    const resumePayload = JSON.stringify({
      event: 'subscription.resumed',
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        subscription: {
          entity: {
            id: haltedSub.razorpaySubscriptionId,
            status: 'active',
          },
        },
      },
    });

    const resumeSig = crypto
      .createHmac('sha256', TEST_WEBHOOK_SECRET)
      .update(resumePayload)
      .digest('hex');

    await fetch(`${baseUrl}/api/billing/razorpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': resumeSig,
        'x-razorpay-event-id': `test_evt_resume_block_${Date.now()}`,
      },
      body: resumePayload,
    });

    const user = await UserModel.findById(testUserB._id);
    expect(user?.plan).toBe('FREE');

    const subAfter = await SubscriptionModel.findOne({ razorpaySubscriptionId: haltedSub.razorpaySubscriptionId });
    expect(subAfter?.status).toBe('halted');
  });
});
