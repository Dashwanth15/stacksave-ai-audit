// ============================================================
// Email Notification System Production-Hardened Tests — StackSave
// Covers:
// 1. New Premium subscription → activation email once
// 2. Duplicate webhook → no duplicate activation email
// 3. New subscription after previous ended → activation email sent again
// 4. New offer → included in digest
// 5. Unchanged offer → not repeatedly included
// 6. Updated offer → included again
// 7. Free user → no digest
// 8. Expired Premium → no digest
// 9. Unsubscribed user → no digest
// 10. Resend failure → lastOfferDigestAt not updated
// 11. Multiple scheduler triggers → no duplicate digest
// 12. No meaningful new offers → no email
// 13. Tampered unsubscribe token → rejected
// 14. Protected POST /api/internal/email/premium-digest security
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import app from '../src/app';
import {
  UserModel,
  SubscriptionModel,
  NotificationEventModel,
  connectDB,
} from '../src/services/dbService';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  sendWelcomeEmail,
  sendPremiumActivationEmail,
  sendOfferDigestEmail,
} from '../src/services/emailService';
import * as emailService from '../src/services/emailService';
import {
  triggerDailyOfferDigest,
  getMsUntilNextExecution,
} from '../src/services/emailScheduler';
import { processRazorpayWebhookEvent } from '../src/services/billingService';

let server: http.Server;
let baseUrl: string;

const testUserIds: any[] = [];
const testSubIds: any[] = [];
const testOfferIds: any[] = [];

beforeAll(async () => {
  await connectDB();

  process.env.ADMIN_SECRET = 'test_admin_secret_123';
  process.env.PREMIUM_DIGEST_CRON_SECRET = 'test_cron_secret_456';

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}, 40000);

afterAll(async () => {
  if (testUserIds.length > 0) {
    await UserModel.deleteMany({ _id: { $in: testUserIds } });
  }
  if (testSubIds.length > 0) {
    await SubscriptionModel.deleteMany({ _id: { $in: testSubIds } });
  }
  if (testOfferIds.length > 0) {
    await NotificationEventModel.deleteMany({ _id: { $in: testOfferIds } });
  }
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('1. Unsubscribe AES-256-GCM Token Security', () => {
  it('generates and successfully decrypts/verifies a valid token', () => {
    const fakeUserId = '654321654321654321654321';
    const token = generateUnsubscribeToken(fakeUserId);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
    // Ensure raw MongoDB ID is encrypted and not directly visible in plain text
    expect(token).not.toContain(fakeUserId);

    const verifiedUserId = verifyUnsubscribeToken(token);
    expect(verifiedUserId).toBe(fakeUserId);
  });

  it('13. Tampered unsubscribe token is strictly rejected', () => {
    expect(verifyUnsubscribeToken('invalid-token')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();

    const fakeUserId = '654321654321654321654321';
    const validToken = generateUnsubscribeToken(fakeUserId);
    const tampered = validToken.substring(0, validToken.length - 6) + 'abcdef';
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });
});

describe('2. Premium Activation Email Idempotency & Lifecycle', () => {
  it('1. New Premium subscription sends activation email once', async () => {
    const timestamp = Date.now();
    const user = await UserModel.create({
      googleId: `prem-user-1-${timestamp}`,
      email: `prem-1-${timestamp}@stacksave.test`,
      name: 'Premium User One',
      plan: 'FREE',
      subscriptionStatus: 'NONE',
      sessionVersion: 1,
    });
    testUserIds.push(user._id);

    const sub = await SubscriptionModel.create({
      userId: user._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_test_1_${timestamp}`,
      razorpayPlanId: 'plan_quarterly',
      planKey: 'quarterly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    // Spy on emailService.sendPremiumActivationEmail
    const spy = vi.spyOn(emailService, 'sendPremiumActivationEmail').mockResolvedValueOnce({
      success: true,
      id: 'mock_resend_act_1',
    });

    // Simulate webhook event subscription.activated
    const webhookRes = await processRazorpayWebhookEvent({
      eventId: `evt_act_1_${timestamp}`,
      eventType: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: `sub_test_1_${timestamp}`,
            status: 'active',
          },
        },
      },
    });

    expect(webhookRes.processed).toBe(true);

    // Wait for fire-and-forget
    await new Promise((r) => setTimeout(r, 100));

    expect(spy).toHaveBeenCalledTimes(1);

    const updatedSub = await SubscriptionModel.findById(sub._id);
    expect(updatedSub?.activationEmailSentAt).toBeDefined();

    spy.mockRestore();
  });

  it('2. Duplicate webhook produces no duplicate activation email', async () => {
    const timestamp = Date.now();
    const user = await UserModel.create({
      googleId: `prem-user-2-${timestamp}`,
      email: `prem-2-${timestamp}@stacksave.test`,
      name: 'Premium User Two',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
    });
    testUserIds.push(user._id);

    const sub = await SubscriptionModel.create({
      userId: user._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_test_2_${timestamp}`,
      razorpayPlanId: 'plan_quarterly',
      planKey: 'quarterly',
      status: 'active',
      activationEmailSentAt: new Date(), // Already sent
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    const spy = vi.spyOn(emailService, 'sendPremiumActivationEmail');

    // Duplicate webhook with different eventId
    await processRazorpayWebhookEvent({
      eventId: `evt_act_dup_${timestamp}`,
      eventType: 'subscription.charged',
      payload: {
        subscription: {
          entity: {
            id: `sub_test_2_${timestamp}`,
            status: 'active',
          },
        },
      },
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('3. New subscription after previous subscription ended sends activation email again', async () => {
    const timestamp = Date.now();
    const user = await UserModel.create({
      googleId: `prem-user-3-${timestamp}`,
      email: `prem-3-${timestamp}@stacksave.test`,
      name: 'Renewed Premium User',
      plan: 'FREE',
      subscriptionStatus: 'CANCELED',
      sessionVersion: 1,
    });
    testUserIds.push(user._id);

    // Old ended subscription
    const oldSub = await SubscriptionModel.create({
      userId: user._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_old_${timestamp}`,
      razorpayPlanId: 'plan_quarterly',
      planKey: 'quarterly',
      status: 'cancelled',
      activationEmailSentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(oldSub._id);

    // New subscription
    const newSub = await SubscriptionModel.create({
      userId: user._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_new_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(newSub._id);

    const spy = vi.spyOn(emailService, 'sendPremiumActivationEmail').mockResolvedValueOnce({
      success: true,
      id: 'mock_resend_act_new',
    });

    await processRazorpayWebhookEvent({
      eventId: `evt_act_new_${timestamp}`,
      eventType: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: `sub_new_${timestamp}`,
            status: 'active',
          },
        },
      },
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(spy).toHaveBeenCalledTimes(1);

    const updatedNewSub = await SubscriptionModel.findById(newSub._id);
    expect(updatedNewSub?.activationEmailSentAt).toBeDefined();

    spy.mockRestore();
  });
});

describe('3. Daily Offer Digest Filtering, Dedup & Suppression', () => {
  it('4. New offer is included in digest, and 5. unchanged offer is not repeatedly included', async () => {
    const timestamp = Date.now();

    // Fetch existing active DB offers and treat them as already sent for baseline isolation
    const allExistingOffers = await NotificationEventModel.find({
      eventType: 'NEW_OFFER',
      isActive: { $ne: false },
      isPublic: true,
    }).lean();
    const baselineFPs = allExistingOffers.map((o) => o.fingerprint).filter(Boolean);

    const offerA = await NotificationEventModel.create({
      providerId: `prov-a-${timestamp}`,
      providerName: 'AI Provider A',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_a_${timestamp}`,
      title: '50% Off Annual Plan',
      description: 'Exclusive 50% discount for developers',
      sourceUrl: 'https://example.com/a',
      discount: '50% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offerA._id);

    const premiumUser = await UserModel.create({
      googleId: `prem-digest-user-${timestamp}`,
      email: `prem-digest-${timestamp}@stacksave.test`,
      name: 'Active Premium User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      sentOfferFingerprints: baselineFPs,
    });
    testUserIds.push(premiumUser._id);

    const sub = await SubscriptionModel.create({
      userId: premiumUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_digest_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    // Mock sendOfferDigestEmail to succeed
    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: true,
      id: 'mock_resend_digest_1',
    });

    // DAY 1: Run digest
    const stats1 = await triggerDailyOfferDigest();
    expect(stats1.sent).toBeGreaterThanOrEqual(1);

    const updatedUser1 = await UserModel.findById(premiumUser._id);
    expect(updatedUser1?.sentOfferFingerprints).toContain(`fp_a_${timestamp}`);
    expect(updatedUser1?.lastOfferDigestAt).toBeDefined();

    // Reset lastOfferDigestAt to simulate day 2, but offerA is UNCHANGED
    await UserModel.findByIdAndUpdate(premiumUser._id, {
      lastOfferDigestAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25h ago
    });

    digestSpy.mockClear();

    // DAY 2: Run digest with unchanged offer -> 12. No meaningful new offers -> no email
    await triggerDailyOfferDigest();
    // Since offerA fingerprint was already sent to this user and no other unread offers exist:
    expect(digestSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: premiumUser.email })
    );

    // 6. DAY 3: Offer is UPDATED with new discount & fingerprint
    const offerAUpdated = await NotificationEventModel.create({
      providerId: `prov-a-${timestamp}`,
      providerName: 'AI Provider A',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_a_updated_${timestamp}`,
      title: '70% Off Annual Plan (Updated)',
      description: 'Upgraded to 70% discount',
      sourceUrl: 'https://example.com/a',
      discount: '70% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offerAUpdated._id);

    // DAY 3 run
    await triggerDailyOfferDigest();
    expect(digestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: premiumUser.email,
        offers: expect.arrayContaining([
          expect.objectContaining({ title: '70% Off Annual Plan (Updated)' }),
        ]),
      })
    );

    digestSpy.mockRestore();
  });

  it('7. Free user, 8. Expired Premium, and 9. Unsubscribed user receive no digest', async () => {
    const timestamp = Date.now();

    const offer = await NotificationEventModel.create({
      providerId: `prov-test-${timestamp}`,
      eventType: 'NEW_OFFER',
      fingerprint: `fp_test_${timestamp}`,
      title: 'New AI Promo',
      description: 'Official test promotion description',
      sourceUrl: 'https://example.com/promo',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offer._id);

    // 7. Free user
    const freeUser = await UserModel.create({
      googleId: `free-user-${timestamp}`,
      email: `free-${timestamp}@stacksave.test`,
      name: 'Free User',
      plan: 'FREE',
      subscriptionStatus: 'NONE',
      sessionVersion: 1,
    });
    testUserIds.push(freeUser._id);

    // 8. Expired Premium user (subscription status expired)
    const expiredUser = await UserModel.create({
      googleId: `expired-user-${timestamp}`,
      email: `expired-${timestamp}@stacksave.test`,
      name: 'Expired User',
      plan: 'PREMIUM', // Stale plan flag in user doc
      subscriptionStatus: 'NONE',
      sessionVersion: 1,
    });
    testUserIds.push(expiredUser._id);

    const expiredSub = await SubscriptionModel.create({
      userId: expiredUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_exp_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'expired',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(expiredSub._id);

    // 9. Unsubscribed Premium user
    const unsubUser = await UserModel.create({
      googleId: `unsub-user-${timestamp}`,
      email: `unsub-${timestamp}@stacksave.test`,
      name: 'Unsubscribed User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      emailPreferences: {
        productEmails: true,
        premiumOfferDigest: false,
      },
    });
    testUserIds.push(unsubUser._id);

    const unsubSub = await SubscriptionModel.create({
      userId: unsubUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_unsub_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(unsubSub._id);

    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail');

    await triggerDailyOfferDigest();

    expect(digestSpy).not.toHaveBeenCalledWith(expect.objectContaining({ email: freeUser.email }));
    expect(digestSpy).not.toHaveBeenCalledWith(expect.objectContaining({ email: expiredUser.email }));
    expect(digestSpy).not.toHaveBeenCalledWith(expect.objectContaining({ email: unsubUser.email }));

    digestSpy.mockRestore();
  });

  it('10. Resend failure does NOT update lastOfferDigestAt or mark offers sent', async () => {
    const timestamp = Date.now();

    const offer = await NotificationEventModel.create({
      providerId: `prov-fail-${timestamp}`,
      eventType: 'NEW_OFFER',
      fingerprint: `fp_fail_${timestamp}`,
      title: 'Discount Under Failure Test',
      description: 'Test failure description for Resend error handling',
      sourceUrl: 'https://example.com/fail',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offer._id);

    const premUser = await UserModel.create({
      googleId: `prem-fail-user-${timestamp}`,
      email: `prem-fail-${timestamp}@stacksave.test`,
      name: 'Failure Test User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      sentOfferFingerprints: [],
    });
    testUserIds.push(premUser._id);

    const sub = await SubscriptionModel.create({
      userId: premUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_fail_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    // Mock sendOfferDigestEmail to FAIL
    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: false,
      error: 'Resend rate limit exceeded (HTTP 429)',
    });

    const stats = await triggerDailyOfferDigest();
    expect(stats.errors).toBeGreaterThanOrEqual(1);

    const userAfter = await UserModel.findById(premUser._id);
    expect(userAfter?.lastOfferDigestAt).toBeUndefined();
    expect(userAfter?.sentOfferFingerprints).not.toContain(`fp_fail_${timestamp}`);

    digestSpy.mockRestore();
  });

  it('11. Multiple rapid scheduler triggers do not send duplicate digests (<20h gap)', async () => {
    const timestamp = Date.now();

    const offer = await NotificationEventModel.create({
      providerId: `prov-rapid-${timestamp}`,
      eventType: 'NEW_OFFER',
      fingerprint: `fp_rapid_${timestamp}`,
      title: 'Rapid Trigger Offer',
      description: 'Rapid trigger test offer description',
      sourceUrl: 'https://example.com/rapid',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offer._id);

    const premUser = await UserModel.create({
      googleId: `prem-rapid-${timestamp}`,
      email: `prem-rapid-${timestamp}@stacksave.test`,
      name: 'Rapid Trigger User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      sentOfferFingerprints: [],
    });
    testUserIds.push(premUser._id);

    const sub = await SubscriptionModel.create({
      userId: premUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_rapid_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    let callCount = 0;
    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockImplementation(async (params) => {
      if (params.email === premUser.email) callCount++;
      return { success: true, id: 'mock_rapid_id' };
    });

    // First trigger
    await triggerDailyOfferDigest();
    expect(callCount).toBe(1);

    // Second trigger immediately after
    await triggerDailyOfferDigest();
    expect(callCount).toBe(1); // Dedup prevented second send

    digestSpy.mockRestore();
  });
});

describe('4. Protected POST /api/internal/email/premium-digest Endpoint', () => {
  it('rejects unauthorized requests with 401 or 503', async () => {
    const resNoAuth = await fetch(`${baseUrl}/api/internal/email/premium-digest`, {
      method: 'POST',
    });
    expect(resNoAuth.status).toBe(401);

    const resBadAuth = await fetch(`${baseUrl}/api/internal/email/premium-digest`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong_secret',
      },
    });
    expect(resBadAuth.status).toBe(401);
  });

  it('accepts authorized requests with PREMIUM_DIGEST_CRON_SECRET', async () => {
    const res = await fetch(`${baseUrl}/api/internal/email/premium-digest`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test_cron_secret_456',
        'Content-Type': 'application/json',
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeDefined();
    expect(json.data.attempted).toBeDefined();
  });

  it('accepts authorized requests with x-cron-secret header', async () => {
    const res = await fetch(`${baseUrl}/api/internal/email/premium-digest`, {
      method: 'POST',
      headers: {
        'x-cron-secret': 'test_cron_secret_456',
      },
    });
    expect(res.status).toBe(200);
  });
});
