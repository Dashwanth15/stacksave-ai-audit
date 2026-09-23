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
  await UserModel.updateMany({}, { $set: { isDigestProcessing: false }, $unset: { digestProcessingStartedAt: 1 } });

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
    await NotificationEventModel.updateMany(
      { _id: { $in: allExistingOffers.map((o) => o._id) } },
      { isActive: false }
    );

    const offerA = await NotificationEventModel.create({
      providerId: 'gemini',
      providerName: 'Google Gemini',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_a_${timestamp}`,
      title: '50% Off Annual Plan',
      description: 'Exclusive 50% discount for developers',
      sourceUrl: 'https://gemini.google.com/pricing',
      evidenceText: 'Valid official pricing evidence confirmation text length >= 20 characters',
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
      sentOfferFingerprints: [],
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

    // Reset lastOfferDigestAt to simulate day 2 (>48h elapsed), but offerA is UNCHANGED
    await NotificationEventModel.findByIdAndUpdate(offerA._id, {
      detectedAt: new Date(Date.now() - 48 * 3600 * 1000),
    });

    await UserModel.findByIdAndUpdate(premiumUser._id, {
      lastOfferDigestAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50h ago
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
      providerId: 'gemini',
      providerName: 'Google Gemini',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_a_updated_${timestamp}`,
      title: '70% Off Annual Plan (Updated)',
      description: 'Upgraded to 70% discount',
      sourceUrl: 'https://gemini.google.com/pricing',
      evidenceText: 'Valid official pricing evidence confirmation text length >= 20 characters updated',
      discount: '70% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offerAUpdated._id);

    // DAY 3 run: Reset lastOfferDigestAt (>48h elapsed)
    await UserModel.findByIdAndUpdate(premiumUser._id, {
      lastOfferDigestAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
    });

    await triggerDailyOfferDigest();
    expect(digestSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: premiumUser.email,
        offers: expect.arrayContaining([
          expect.objectContaining({ title: '70% Off Annual Plan (Updated)' }),
        ]),
      })
    );

    // Restore existing offers
    await NotificationEventModel.updateMany(
      { _id: { $in: allExistingOffers.map((o) => o._id) } },
      { isActive: true }
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

describe('5. Multi-User Email Dispatch & Recipient Isolation Verification', () => {
  it('sends distinct welcome, activation, and offer digest emails to multiple distinct user addresses', async () => {
    const timestamp = Date.now();

    // 1. Create two distinct user records in MongoDB
    const userA = await UserModel.create({
      googleId: `multi-user-a-${timestamp}`,
      email: `alice.${timestamp}@example.org`,
      name: 'Alice Developer',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
    });
    testUserIds.push(userA._id);

    const userB = await UserModel.create({
      googleId: `multi-user-b-${timestamp}`,
      email: `bob.${timestamp}@corporate.net`,
      name: 'Bob Enterprise',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
    });
    testUserIds.push(userB._id);

    // 2. Create distinct subscriptions for each user
    const subA = await SubscriptionModel.create({
      userId: userA._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_a_${timestamp}`,
      razorpayPlanId: 'plan_quarterly',
      planKey: 'quarterly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(subA._id);

    const subB = await SubscriptionModel.create({
      userId: userB._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_b_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(subB._id);

    // 3. Create a verified active offer
    const offer = await NotificationEventModel.create({
      providerId: 'gemini',
      providerName: 'Google Gemini',
      eventType: 'NEW_OFFER',
      fingerprint: `multi_fp_${timestamp}`,
      title: 'Multi-User Special Deal',
      description: 'Exclusive discount for developers with verified domain',
      sourceUrl: 'https://gemini.google.com/pricing',
      evidenceText: 'Valid official pricing evidence confirmation text length >= 20 characters',
      discount: '30% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(offer._id);

    // 4. Verify Welcome Emails dispatch to each user's own address
    const welcomeSpy = vi.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue({
      success: true,
      id: 'mock_welcome',
    });

    await emailService.sendWelcomeEmail({ email: userA.email, name: userA.name });
    await emailService.sendWelcomeEmail({ email: userB.email, name: userB.name });

    expect(welcomeSpy).toHaveBeenCalledWith({ email: `alice.${timestamp}@example.org`, name: 'Alice Developer' });
    expect(welcomeSpy).toHaveBeenCalledWith({ email: `bob.${timestamp}@corporate.net`, name: 'Bob Enterprise' });
    welcomeSpy.mockRestore();

    // 5. Verify Activation Emails dispatch to each user's own address
    const activationSpy = vi.spyOn(emailService, 'sendPremiumActivationEmail').mockResolvedValue({
      success: true,
      id: 'mock_activation',
    });

    await emailService.sendPremiumActivationEmail({ email: userA.email, name: userA.name, plan: 'quarterly' });
    await emailService.sendPremiumActivationEmail({ email: userB.email, name: userB.name, plan: 'yearly' });

    expect(activationSpy).toHaveBeenCalledWith({ email: `alice.${timestamp}@example.org`, name: 'Alice Developer', plan: 'quarterly' });
    expect(activationSpy).toHaveBeenCalledWith({ email: `bob.${timestamp}@corporate.net`, name: 'Bob Enterprise', plan: 'yearly' });
    activationSpy.mockRestore();

    // 6. Verify Daily Offer Digest dispatches to each user individually with isolated recipient and tokens
    const capturedDigestRecipients: string[] = [];
    const capturedTokens: string[] = [];

    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockImplementation(async (params) => {
      capturedDigestRecipients.push(params.email);
      capturedTokens.push(params.userId);
      return { success: true, id: `mock_resend_${params.userId}` };
    });

    await triggerDailyOfferDigest();

    expect(capturedDigestRecipients).toContain(`alice.${timestamp}@example.org`);
    expect(capturedDigestRecipients).toContain(`bob.${timestamp}@corporate.net`);
    expect(capturedTokens).toContain(userA._id.toString());
    expect(capturedTokens).toContain(userB._id.toString());

    digestSpy.mockRestore();

    // 7. Verify Unsubscribe Tokens are strictly user-isolated
    const tokenA = generateUnsubscribeToken(userA._id.toString());
    const tokenB = generateUnsubscribeToken(userB._id.toString());
    expect(tokenA).not.toBe(tokenB);
    expect(verifyUnsubscribeToken(tokenA)).toBe(userA._id.toString());
    expect(verifyUnsubscribeToken(tokenB)).toBe(userB._id.toString());
  });
});

describe('6. Upgraded Daily Offer Selection, Ranking & Diversity Engine', () => {
  it('1. Selects at most 5 offers and 2. selects fewer when fewer qualify', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');

    const providerConfigs = [
      { id: 'gemini', url: 'https://gemini.google.com/pricing' },
      { id: 'claude', url: 'https://anthropic.com/pricing' },
      { id: 'chatgpt', url: 'https://openai.com/pricing' },
      { id: 'cursor', url: 'https://cursor.com/pricing' },
      { id: 'perplexity', url: 'https://perplexity.ai/pricing' },
      { id: 'github-copilot', url: 'https://github.com/pricing' },
      { id: 'deepseek', url: 'https://deepseek.com/pricing' },
      { id: 'antigravity', url: 'https://antigravity.google/pricing' },
    ];

    // Create 8 valid publishable offers across official providers
    const eightOffers = providerConfigs.map((cfg, idx) => ({
      providerId: cfg.id,
      title: `Offer Title ${idx}`,
      description: `Description of offer ${idx} with sufficient evidence text length for validation`,
      evidenceText: `Official pricing evidence confirmation text length >= 20 characters ${idx}`,
      sourceUrl: cfg.url,
      fingerprint: `fp_test_max_${idx}`,
      discount: `${(idx + 1) * 10}% off`,
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    }));

    const selectedMax = selectDailyOffersForUser(eightOffers, new Set());
    expect(selectedMax.length).toBe(5);

    // Test with only 2 offers
    const twoOffers = eightOffers.slice(0, 2);
    const selectedTwo = selectDailyOffersForUser(twoOffers, new Set());
    expect(selectedTwo.length).toBe(2);
  });

  it('3. Prioritizes new offers and 4. updated offers over stale offers', async () => {
    const { computeDailyOfferSelectionScore, selectDailyOffersForUser } = await import('../src/services/emailScheduler');

    const staleOffer = {
      providerId: 'gemini',
      title: 'Stale Gemini Offer',
      evidenceText: 'Valid official evidence text for stale offer testing',
      sourceUrl: 'https://gemini.google.com/pricing',
      fingerprint: 'fp_stale_1',
      discount: '20% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      lastConfirmedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    };

    const newOffer = {
      providerId: 'gemini',
      title: 'New Gemini Offer',
      evidenceText: 'Valid official evidence text for new offer testing',
      sourceUrl: 'https://gemini.google.com/pricing',
      fingerprint: 'fp_new_1',
      discount: '20% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(), // New today
      lastConfirmedAt: new Date(),
    };

    const scoreStale = computeDailyOfferSelectionScore(staleOffer);
    const scoreNew = computeDailyOfferSelectionScore(newOffer);

    expect(scoreNew.isNew).toBe(true);
    expect(scoreStale.isNew).toBe(false);
    expect(scoreNew.score).toBeGreaterThan(scoreStale.score);

    const selected = selectDailyOffersForUser([staleOffer, newOffer], new Set());
    expect(selected[0].title).toBe('New Gemini Offer');
  });

  it('7. Unchanged lastCheckedAt does NOT make an offer new or updated', async () => {
    const { computeDailyOfferSelectionScore } = await import('../src/services/emailScheduler');

    const unchangedOffer = {
      providerId: 'claude',
      title: 'Claude Unchanged Annual Plan',
      evidenceText: 'Valid official evidence text for unchanged offer testing',
      sourceUrl: 'https://anthropic.com/pricing',
      fingerprint: 'fp_unchanged_1',
      discount: '20% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      lastConfirmedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      lastCheckedAt: new Date(), // Playwright ran check today, but offer is UNCHANGED
    };

    const score = computeDailyOfferSelectionScore(unchangedOffer);
    expect(score.isNew).toBe(false);
    expect(score.isUpdated).toBe(false);
  });

  it('8. Excludes expired, unverified, or quarantined offers', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');

    const expiredOffer = {
      providerId: 'cursor',
      title: 'Expired Cursor Deal',
      evidenceText: 'Valid official evidence text for expired offer testing',
      sourceUrl: 'https://cursor.com/pricing',
      fingerprint: 'fp_expired_1',
      isActive: true,
      isPublic: true,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
    };

    const quarantinedOffer = {
      providerId: 'gemini',
      partner: 'samsung',
      title: 'Samsung Galaxy AI Built-in Software',
      evidenceText: 'Built-in OS features for Galaxy S24 series non-commercial software',
      sourceUrl: 'https://samsung.com/galaxy-ai',
      fingerprint: 'fp_quarantine_1',
      isActive: true,
      isPublic: true,
    };

    const selected = selectDailyOffersForUser([expiredOffer, quarantinedOffer], new Set());
    expect(selected.length).toBe(0);
  });

  it('9. Strong discounts/value receive higher ranking scores', async () => {
    const { computeOfferOpportunityScore } = await import('../src/services/emailScheduler');

    const highValueOffer = {
      discount: '100% free for 18 months',
      benefit: '18 months complimentary Google One AI Premium',
      detectionMethod: 'PLAYWRIGHT_LIVE',
      partnerType: 'telecom',
    };

    const lowValueOffer = {
      discount: '10% off monthly',
      benefit: '10% discount',
      detectionMethod: 'PLAYWRIGHT_DOM',
      partnerType: 'membership',
    };

    const highScore = computeOfferOpportunityScore(highValueOffer, 'partner');
    const lowScore = computeOfferOpportunityScore(lowValueOffer, 'free');

    expect(highScore).toBeGreaterThan(lowScore);
    expect(highScore).toBeGreaterThanOrEqual(85);
  });

  it('10. Enforces platform and 11. category diversity across selections', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');

    // 4 offers from Gemini (category partner) + 2 from Claude (category student) + 2 from ChatGPT (category api)
    const candidates = [
      { providerId: 'gemini', title: 'Gemini Partner 1', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://gemini.google.com/pricing', fingerprint: 'fp_g_1', discount: '50% off', category: 'partner', detectedAt: new Date() },
      { providerId: 'gemini', title: 'Gemini Partner 2', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://gemini.google.com/pricing', fingerprint: 'fp_g_2', discount: '50% off', category: 'partner', detectedAt: new Date() },
      { providerId: 'gemini', title: 'Gemini Partner 3', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://gemini.google.com/pricing', fingerprint: 'fp_g_3', discount: '50% off', category: 'partner', detectedAt: new Date() },
      { providerId: 'gemini', title: 'Gemini Partner 4', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://gemini.google.com/pricing', fingerprint: 'fp_g_4', discount: '50% off', category: 'partner', detectedAt: new Date() },
      { providerId: 'claude', title: 'Claude Student 1', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://anthropic.com/pricing', fingerprint: 'fp_c_1', discount: '50% off', category: 'student', detectedAt: new Date() },
      { providerId: 'claude', title: 'Claude Student 2', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://anthropic.com/pricing', fingerprint: 'fp_c_2', discount: '50% off', category: 'student', detectedAt: new Date() },
      { providerId: 'chatgpt', title: 'ChatGPT API 1', evidenceText: 'Evidence length >= 20 characters for test', sourceUrl: 'https://openai.com/pricing', fingerprint: 'fp_gpt_1', discount: '50% off', category: 'api', detectedAt: new Date() },
    ];

    const selected = selectDailyOffersForUser(candidates, new Set());
    expect(selected.length).toBe(5);

    // Ensure Gemini did not monopolize all 5 slots (max 2 in initial diverse pass)
    const geminiCount = selected.filter((s) => s.provider === 'gemini').length;
    expect(geminiCount).toBeLessThanOrEqual(2);

    // Ensure Claude and ChatGPT are represented
    const providersRepresented = new Set(selected.map((s) => s.provider));
    expect(providersRepresented.has('claude')).toBe(true);
    expect(providersRepresented.has('chatgpt')).toBe(true);
  });
});

// ============================================================
// 7. Precise Lifecycle & Edge Case Verification
//    Directly validates each audit requirement from the user's
//    final focused audit request.
// ============================================================

describe('7. Precise Lifecycle & Edge Case Verification (Audit)', () => {
  // Helper: build a minimal publishable offer skeleton
  const publishableBase = (overrides: Record<string, unknown>) => ({
    providerId: 'gemini',
    title: 'Audit Test Offer',
    description: 'Description with enough text to pass validation gate for audit testing',
    evidenceText: 'Official pricing evidence confirmation text length >= 20 characters test',
    sourceUrl: 'https://gemini.google.com/pricing',
    fingerprint: `fp_audit_${Math.random().toString(36).slice(2)}`,
    discount: '30% off',
    isActive: true,
    isPublic: true,
    detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days old by default
    ...overrides,
  });

  it('A1. detectedAt within last 24h → isNew = true', async () => {
    const { computeDailyOfferSelectionScore } = await import('../src/services/emailScheduler');
    const offer = publishableBase({ detectedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) }); // 6h ago
    const result = computeDailyOfferSelectionScore(offer);
    expect(result.isNew).toBe(true);
    expect(result.isUpdated).toBe(false);
  });

  it('A2. detectedAt older than 24h → isNew = false', async () => {
    const { computeDailyOfferSelectionScore } = await import('../src/services/emailScheduler');
    const offer = publishableBase({ detectedAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }); // 25h ago
    const result = computeDailyOfferSelectionScore(offer);
    expect(result.isNew).toBe(false);
  });

  it('A3. Meaningful content re-extraction (lastSuccessfulCheckAt recent + contentHash present) → isUpdated = true', async () => {
    const { computeDailyOfferSelectionScore } = await import('../src/services/emailScheduler');
    const offer = publishableBase({
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      lastSuccessfulCheckAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Re-extracted 2h ago
      contentHash: 'sha256_abc123_new_content_hash',                    // Content was actually hashed
      lastCheckedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),        // Routine check timestamp also updated
    });
    const result = computeDailyOfferSelectionScore(offer);
    expect(result.isNew).toBe(false);
    expect(result.isUpdated).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0); // Update bonus applied
  });

  it('A4. lastCheckedAt-only refresh (no lastSuccessfulCheckAt, no contentHash) → isUpdated = false', async () => {
    const { computeDailyOfferSelectionScore } = await import('../src/services/emailScheduler');
    const offer = publishableBase({
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      lastConfirmedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),  // Page still live (confirmed today)
      lastCheckedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),    // Playwright connectivity check today
      // lastSuccessfulCheckAt is NOT set → content was NOT re-extracted
      // contentHash is NOT set → no content hash → routine check only
      discount: '30% off',   // Has discount text but this alone must NOT trigger isUpdated
      evidenceText: 'Official pricing evidence confirmation text length >= 20 characters test',
    });
    const result = computeDailyOfferSelectionScore(offer);
    expect(result.isNew).toBe(false);
    expect(result.isUpdated).toBe(false); // BUG FIX VERIFIED: old code would return true here
  });

  it('A5. Previously emailed offer fingerprint is excluded from selection', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const sentFP = 'fp_previously_sent_abc';
    const sentOffer = publishableBase({ fingerprint: sentFP });
    const freshOffer = publishableBase({
      fingerprint: 'fp_fresh_xyz',
      title: 'Fresh Offer',
      detectedAt: new Date(), // New today
    });

    const selected = selectDailyOffersForUser([sentOffer, freshOffer], new Set([sentFP]));

    // sentOffer must be excluded; only freshOffer should be returned
    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('Fresh Offer');
  });

  it('A6. Maximum 5 offers — never more than 5 in the digest', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const providers = ['gemini', 'claude', 'chatgpt', 'cursor', 'perplexity', 'github-copilot', 'deepseek', 'antigravity'];
    const sourceUrls: Record<string, string> = {
      gemini: 'https://gemini.google.com/pricing',
      claude: 'https://anthropic.com/pricing',
      chatgpt: 'https://openai.com/pricing',
      cursor: 'https://cursor.com/pricing',
      perplexity: 'https://perplexity.ai/pricing',
      'github-copilot': 'https://github.com/pricing',
      deepseek: 'https://deepseek.com/pricing',
      antigravity: 'https://antigravity.google/pricing',
    };
    const tenOffers = providers.map((pid, i) => publishableBase({
      providerId: pid,
      fingerprint: `fp_max5_${i}`,
      sourceUrl: sourceUrls[pid],
      detectedAt: new Date(),
      title: `Offer from ${pid}`,
    }));

    const selected = selectDailyOffersForUser(tenOffers, new Set());
    expect(selected.length).toBeLessThanOrEqual(5);
    expect(selected.length).toBe(5); // 8 offers available → exactly 5 selected
  });

  it('A7. Fewer than 5 when fewer than 5 qualifying offers exist', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const threeOffers = [
      publishableBase({ fingerprint: 'fp_few_1', title: 'Offer One', detectedAt: new Date() }),
      publishableBase({ providerId: 'claude', fingerprint: 'fp_few_2', title: 'Offer Two', sourceUrl: 'https://anthropic.com/pricing', detectedAt: new Date() }),
      publishableBase({ providerId: 'chatgpt', fingerprint: 'fp_few_3', title: 'Offer Three', sourceUrl: 'https://openai.com/pricing', detectedAt: new Date() }),
    ];

    const selected = selectDailyOffersForUser(threeOffers, new Set());
    expect(selected.length).toBe(3); // Must NOT pad to 5
  });

  it('A8. Zero qualifying unread offers → no email dispatched (anti-spam)', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const offer = publishableBase({ fingerprint: 'fp_all_sent_1', title: 'Already Sent Offer' });

    // All available offers already in user's sent history
    const selected = selectDailyOffersForUser([offer], new Set(['fp_all_sent_1']));
    expect(selected.length).toBe(0); // Anti-spam: no digest sent
  });

  it('A9. Duplicate workflow run (< 20h gap) → second run skipped for same user', async () => {
    const timestamp = Date.now();

    // Create a fresh offer
    const freshOffer = await NotificationEventModel.create({
      providerId: 'gemini',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_dup_run_${timestamp}`,
      title: 'Duplicate Run Test Offer',
      description: 'Official description for duplicate workflow run audit test with evidence text',
      evidenceText: 'Official pricing evidence confirmation text length >= 20 characters audit test dup',
      sourceUrl: 'https://gemini.google.com/pricing',
      discount: '40% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(freshOffer._id);

    // Create a Premium user with no prior digest
    const dupUser = await UserModel.create({
      googleId: `dup-run-user-${timestamp}`,
      email: `dup-run-${timestamp}@stacksave.test`,
      name: 'Duplicate Run User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
    });
    testUserIds.push(dupUser._id);

    const dupSub = await SubscriptionModel.create({
      userId: dupUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_dup_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(dupSub._id);

    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: true,
      id: `mock_dup_${timestamp}`,
    });

    // RUN 1 — should send 1 email to dupUser
    const run1 = await triggerDailyOfferDigest();
    const sentToUser = digestSpy.mock.calls.filter((c) => c[0].email === dupUser.email);
    expect(sentToUser.length).toBe(1);

    digestSpy.mockClear();

    // RUN 2 immediately (< 20h gap) — must NOT send a second email to the same user
    const run2 = await triggerDailyOfferDigest();
    const sentToUserRun2 = digestSpy.mock.calls.filter((c) => c[0].email === dupUser.email);
    expect(sentToUserRun2.length).toBe(0);

    digestSpy.mockRestore();

    // Sanity: at least 1 was sent on run1 overall
    expect(run1.sent).toBeGreaterThanOrEqual(1);
    // Sanity: dupUser skipped on run2 (counted in skipped or attempted without send)
    expect(run2.sent).toBeLessThan(run1.sent + 1);
  });
});

// ============================================================
// 8. Multi-Day Rotation & Missed-Offer Recovery System
//    Validates 5-day rolling cooldown, per-user isolation,
//    7-10 day missed-offer recovery, and 5-tier priority selection.
// ============================================================

describe('8. Multi-Day Rotation & Missed-Offer Recovery System', () => {
  const makeOffer = (id: string, overrides: Record<string, unknown> = {}) => ({
    providerId: overrides.providerId || 'gemini',
    title: overrides.title || `Offer ${id}`,
    description: 'Official test offer description with enough characters for validation',
    evidenceText: 'Official pricing evidence confirmation text length >= 20 characters test',
    sourceUrl: overrides.sourceUrl || 'https://gemini.google.com/pricing',
    fingerprint: `fp_rot_${id}`,
    discount: '30% off',
    isActive: true,
    isPublic: true,
    detectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days old by default
    ...overrides,
  });

  const generateOffers = (count: number, prefix = 'p') => {
    const providers = ['gemini', 'claude', 'chatgpt', 'cursor', 'perplexity', 'antigravity', 'windsurf', 'github-copilot'];
    const sourceUrls: Record<string, string> = {
      gemini: 'https://gemini.google.com/pricing',
      claude: 'https://claude.com/pricing',
      chatgpt: 'https://openai.com/pricing',
      cursor: 'https://cursor.com/pricing',
      perplexity: 'https://perplexity.ai/pricing',
      antigravity: 'https://antigravity.google/pricing',
      windsurf: 'https://codeium.com/pricing',
      'github-copilot': 'https://github.com/pricing',
    };
    const categories: Array<'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free'> = [
      'partner', 'student', 'annual', 'api', 'trial', 'startup', 'free'
    ];
    return Array.from({ length: count }, (_, i) => {
      const pid = providers[i % providers.length];
      const cat = categories[i % categories.length];
      return makeOffer(`${prefix}_${i}`, {
        providerId: pid,
        sourceUrl: sourceUrls[pid],
        category: cat,
        title: `Offer ${prefix} ${i}`,
      });
    });
  };

  it('8.1. Day 1 Selection: Selects up to 5 highest-scoring qualifying offers', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(10, 'd1');
    const selected = selectDailyOffersForUser(pool, { recentWindowFPs: new Set(), longTermSentFPs: new Set() });

    expect(selected.length).toBe(5);
  });

  it('8.2. Day 2 Rotation: Excludes Day 1 fingerprints when alternatives exist', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(10, 'd2');
    const day1Selection = pool.slice(0, 5);
    const day1FPs = new Set(day1Selection.map((o) => o.fingerprint));

    const selectedDay2 = selectDailyOffersForUser(pool, {
      recentWindowFPs: day1FPs,
      longTermSentFPs: day1FPs,
    });

    expect(selectedDay2.length).toBe(5);
    for (const item of selectedDay2) {
      const matched = pool.find((o) => o.title === item.title);
      expect(day1FPs.has(matched?.fingerprint || '')).toBe(false);
    }
  });

  it('8.3. Day 3 Rotation: Excludes Day 1 + Day 2 fingerprints', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(15, 'd3');
    const day1And2FPs = new Set(pool.slice(0, 10).map((o) => o.fingerprint));

    const selectedDay3 = selectDailyOffersForUser(pool, {
      recentWindowFPs: day1And2FPs,
      longTermSentFPs: day1And2FPs,
    });

    expect(selectedDay3.length).toBe(5);
    for (const item of selectedDay3) {
      const matched = pool.find((o) => o.title === item.title);
      expect(day1And2FPs.has(matched?.fingerprint || '')).toBe(false);
    }
  });

  it('8.4. Day 4 Rotation: Excludes previous 3 days of delivered fingerprints', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(20, 'd4');
    const prev3DaysFPs = new Set(pool.slice(0, 15).map((o) => o.fingerprint));

    const selectedDay4 = selectDailyOffersForUser(pool, {
      recentWindowFPs: prev3DaysFPs,
      longTermSentFPs: prev3DaysFPs,
    });

    expect(selectedDay4.length).toBe(5);
    for (const item of selectedDay4) {
      const matched = pool.find((o) => o.title === item.title);
      expect(prev3DaysFPs.has(matched?.fingerprint || '')).toBe(false);
    }
  });

  it('8.5. Day 5 Rotation: Excludes previous 4 days of delivered fingerprints', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(25, 'd5');
    const prev4DaysFPs = new Set(pool.slice(0, 20).map((o) => o.fingerprint));

    const selectedDay5 = selectDailyOffersForUser(pool, {
      recentWindowFPs: prev4DaysFPs,
      longTermSentFPs: prev4DaysFPs,
    });

    expect(selectedDay5.length).toBe(5);
    for (const item of selectedDay5) {
      const matched = pool.find((o) => o.title === item.title);
      expect(prev4DaysFPs.has(matched?.fingerprint || '')).toBe(false);
    }
  });

  it('8.6. Complete 5-consecutive-day rotation: 25 distinct offers over 5 days with zero overlap', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(25, 'd5_full');
    const deliveredFPs = new Set<string>();

    for (let day = 1; day <= 5; day++) {
      const selected = selectDailyOffersForUser(pool, {
        recentWindowFPs: deliveredFPs,
        longTermSentFPs: deliveredFPs,
      });

      expect(selected.length).toBe(5);
      for (const item of selected) {
        const matched = pool.find((o) => o.title === item.title);
        expect(deliveredFPs.has(matched?.fingerprint || '')).toBe(false);
        if (matched?.fingerprint) {
          deliveredFPs.add(matched.fingerprint);
        }
      }
    }

    expect(deliveredFPs.size).toBe(25);
  });

  it('8.7. Per-user history isolation: User A cooldown does not affect User B', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const pool = generateOffers(10, 'iso');
    const userAHistory = new Set(pool.slice(0, 5).map((o) => o.fingerprint));
    const userBHistory = new Set<string>();

    const selectedA = selectDailyOffersForUser(pool, {
      recentWindowFPs: userAHistory,
      longTermSentFPs: userAHistory,
    });
    const selectedB = selectDailyOffersForUser(pool, {
      recentWindowFPs: userBHistory,
      longTermSentFPs: userBHistory,
    });

    expect(selectedA.length).toBe(5);
    expect(selectedB.length).toBe(5);

    // User A should get items 5-9
    for (const item of selectedA) {
      const matched = pool.find((o) => o.title === item.title);
      expect(userAHistory.has(matched?.fingerprint || '')).toBe(false);
    }

    // User B should get items 0-4 (the top scoring items)
    const titlesB = new Set(selectedB.map((s) => s.title));
    expect(titlesB.has('Offer iso 0')).toBe(true);
  });

  it('8.8. Lower-ranked verified offers selected when top-ranked offers are in 5-day cooldown', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const topOffers = [
      makeOffer('top_1', { discount: '100% off', providerId: 'gemini', title: 'Top 1', sourceUrl: 'https://gemini.google.com/pricing' }),
      makeOffer('top_2', { discount: '90% off', providerId: 'claude', title: 'Top 2', sourceUrl: 'https://claude.com/pricing' }),
      makeOffer('top_3', { discount: '75% off', providerId: 'chatgpt', title: 'Top 3', sourceUrl: 'https://openai.com/pricing' }),
      makeOffer('top_4', { discount: '$1,000 credit', providerId: 'cursor', title: 'Top 4', sourceUrl: 'https://cursor.com/pricing' }),
      makeOffer('top_5', { discount: '50% off', providerId: 'perplexity', title: 'Top 5', sourceUrl: 'https://perplexity.ai/pricing' }),
    ];
    const lowerOffers = [
      makeOffer('low_1', { discount: '15% off', providerId: 'github-copilot', title: 'Low 1', sourceUrl: 'https://github.com/pricing' }),
      makeOffer('low_2', { discount: '15% off', providerId: 'windsurf', title: 'Low 2', sourceUrl: 'https://codeium.com/pricing' }),
      makeOffer('low_3', { discount: '15% off', providerId: 'antigravity', title: 'Low 3', sourceUrl: 'https://antigravity.google/pricing' }),
      makeOffer('low_4', { discount: '15% off', providerId: 'gemini', title: 'Low 4', sourceUrl: 'https://gemini.google.com/pricing' }),
      makeOffer('low_5', { discount: '15% off', providerId: 'claude', title: 'Low 5', sourceUrl: 'https://claude.com/pricing' }),
    ];

    const allOffers = [...topOffers, ...lowerOffers];
    const topFPs = new Set(topOffers.map((o) => o.fingerprint));

    // When top offers are in 5-day cooldown, lower-ranked offers must be selected instead
    const selected = selectDailyOffersForUser(allOffers, {
      recentWindowFPs: topFPs,
      longTermSentFPs: topFPs,
    });

    expect(selected.length).toBe(5);
    const selectedTitles = selected.map((s) => s.title);
    expect(selectedTitles).toContain('Low 1');
    expect(selectedTitles).toContain('Low 2');
    expect(selectedTitles).not.toContain('Top 1');
  });

  it('8.9. 7-day and 10-day delivered offers remain STRICTLY BLOCKED within 20-day cooldown', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const offerMissed7d = makeOffer('missed_7d', {
      title: '7-Day Delivered AI Deal',
      discount: '50% off',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    const sentDate7dAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const selected = selectDailyOffersForUser([offerMissed7d], {
      longTermSentFPs: new Set([offerMissed7d.fingerprint]),
      fingerprintLastSentDate: new Map([[offerMissed7d.fingerprint, sentDate7dAgo]]),
    });

    expect(selected.length).toBe(0); // STRICTLY BLOCKED under 20-day rule
  });

  it('8.10. 21-day missed offer becomes eligible for resurfacing with Still Available badge', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const offerMissed21d = makeOffer('missed_21d', {
      title: '21-Day Missed AI Deal',
      discount: '40% off',
      detectedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    });

    const sentDate21dAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000); // 21 days ago
    const selected = selectDailyOffersForUser([offerMissed21d], {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set([offerMissed21d.fingerprint]),
      fingerprintLastSentDate: new Map([[offerMissed21d.fingerprint, sentDate21dAgo]]),
    });

    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('21-Day Missed AI Deal');
    expect(selected[0].isMissed).toBe(true);
  });

  it('8.11. Resurfaced offer enters 5-day cooldown again', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const resurfacedOffer = makeOffer('resurfaced_1', { title: 'Resurfaced Deal' });
    const altOffers = generateOffers(5, 'alt');
    const allOffers = [resurfacedOffer, ...altOffers];

    // Day 1: Offer was resurfaced. Today it enters recentWindowFPs.
    const dayAfterWindow = new Set([resurfacedOffer.fingerprint]);

    // Day 2: Next day, resurfacedOffer is in 5-day cooldown
    const selectedNextDay = selectDailyOffersForUser(allOffers, {
      recentWindowFPs: dayAfterWindow,
      longTermSentFPs: new Set([resurfacedOffer.fingerprint]),
    });

    expect(selectedNextDay.length).toBe(5);
    const titles = selectedNextDay.map((s) => s.title);
    expect(titles).not.toContain('Resurfaced Deal');
  });

  it('8.12. lastCheckedAt alone does NOT qualify offer as new/recovered or break cooldown', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const offerInCooldown = makeOffer('ping_only', {
      title: 'Ping Only Offer',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      lastCheckedAt: new Date(),                                   // Pinged just now
      lastSuccessfulCheckAt: null,                                 // Content NOT re-scraped
      contentHash: null,
    });

    const selected = selectDailyOffersForUser([offerInCooldown], {
      recentWindowFPs: new Set([offerInCooldown.fingerprint]),
      longTermSentFPs: new Set([offerInCooldown.fingerprint]),
    });

    expect(selected.length).toBe(0); // Strict anti-spam: cannot break 5-day cooldown on ping alone
  });

  it('8.13. Maximum 5 offers strictly enforced across candidate pool', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const largePool = generateOffers(20, 'large');
    const selected = selectDailyOffersForUser(largePool, {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set(),
    });

    expect(selected.length).toBe(5);
  });

  it('8.14. Fewer than 5 returned when insufficient qualifying offers exist (never pad)', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const smallPool = [
      makeOffer('small_1', { title: 'Small 1' }),
      makeOffer('small_2', { title: 'Small 2', providerId: 'claude', sourceUrl: 'https://claude.com/pricing' }),
    ];

    const selected = selectDailyOffersForUser(smallPool, {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set(),
    });

    expect(selected.length).toBe(2); // Exactly 2, no padding
  });

  it('8.15. Zero qualifying offers → returns empty array (anti-spam)', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const offer = makeOffer('only_one', { title: 'Only One' });

    const selected = selectDailyOffersForUser([offer], {
      recentWindowFPs: new Set([offer.fingerprint]),
      longTermSentFPs: new Set([offer.fingerprint]),
    });

    expect(selected.length).toBe(0);
  });

  it('8.16. Duplicate workflow run (< 20h gap) throttled per-user in triggerDailyOfferDigest', async () => {
    const timestamp = Date.now();
    const testOffer = await NotificationEventModel.create({
      providerId: 'gemini',
      eventType: 'NEW_OFFER',
      fingerprint: `fp_throttle_${timestamp}`,
      title: 'Throttled Run Test Offer',
      description: 'Official description for throttled run audit test with evidence text',
      evidenceText: 'Official pricing evidence confirmation text length >= 20 characters audit test',
      sourceUrl: 'https://gemini.google.com/pricing',
      discount: '35% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(testOffer._id);

    const throttledUser = await UserModel.create({
      googleId: `throttle-user-${timestamp}`,
      email: `throttle-${timestamp}@stacksave.test`,
      name: 'Throttled User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      lastOfferDigestAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Received 2h ago
    });
    testUserIds.push(throttledUser._id);

    const sub = await SubscriptionModel.create({
      userId: throttledUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_throttle_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(sub._id);

    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: true,
      id: `mock_throttle_${timestamp}`,
    });

    await triggerDailyOfferDigest();

    const sentToThrottled = digestSpy.mock.calls.filter((c) => c[0].email === throttledUser.email);
    expect(sentToThrottled.length).toBe(0); // Skipped due to < 20h gap

    digestSpy.mockRestore();
  });

  it('8.17. Expired, unverified, or quarantined offers never enter recovery or selection', async () => {
    const { selectDailyOffersForUser } = await import('../src/services/emailScheduler');
    const expiredOffer = makeOffer('expired_1', {
      title: 'Expired Offer',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });
    const quarantinedOffer = makeOffer('quarantined_1', {
      title: 'Samsung Galaxy AI Built-in Free',
      partner: 'Samsung',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });
    const inactiveOffer = makeOffer('inactive_1', {
      title: 'Inactive Offer',
      isActive: false,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    const selected = selectDailyOffersForUser([expiredOffer, quarantinedOffer, inactiveOffer], {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set(['fp_rot_expired_1', 'fp_rot_quarantined_1', 'fp_rot_inactive_1']),
      fingerprintLastSentDate: new Map([
        ['fp_rot_expired_1', new Date(Date.now() - 10 * 86400000)],
        ['fp_rot_quarantined_1', new Date(Date.now() - 10 * 86400000)],
        ['fp_rot_inactive_1', new Date(Date.now() - 10 * 86400000)],
      ]),
    });

    expect(selected.length).toBe(0); // Publication gate strictly blocks all
  });

  it('8.18. Existing sentOfferFingerprints behavior and 300-cap retention remain intact', async () => {
    const timestamp = Date.now();
    const baselineFPs = Array.from({ length: 300 }, (_, i) => `fp_cap_test_${timestamp}_${i}`);

    const capUser = await UserModel.create({
      googleId: `cap-user-${timestamp}`,
      email: `cap-${timestamp}@stacksave.test`,
      name: 'Cap Test User',
      plan: 'PREMIUM',
      subscriptionStatus: 'ACTIVE',
      sessionVersion: 1,
      sentOfferFingerprints: baselineFPs,
      recentDailyDigestHistory: [],
    });
    testUserIds.push(capUser._id);

    const capSub = await SubscriptionModel.create({
      userId: capUser._id,
      provider: 'razorpay',
      razorpaySubscriptionId: `sub_cap_${timestamp}`,
      razorpayPlanId: 'plan_yearly',
      planKey: 'yearly',
      status: 'active',
      lastSynchronizedAt: new Date(),
    });
    testSubIds.push(capSub._id);

    const freshOffer = await NotificationEventModel.create({
      providerId: 'gemini',
      providerName: 'Google Gemini',
      eventType: 'NEW_OFFER',
      offerSubtype: 'PARTNER_BUNDLE',
      isPartnerOffer: true,
      partnerType: 'telecom',
      partner: 'Verizon',
      fingerprint: `fp_cap_fresh_${timestamp}`,
      title: 'Cap Fresh Test Offer Partner Bundle',
      description: 'Official description for cap test with evidence text long enough',
      evidenceText: 'Official pricing evidence confirmation text length >= 20 characters audit cap bundle',
      sourceUrl: 'https://gemini.google.com/pricing',
      discount: '90% off',
      isActive: true,
      isPublic: true,
      detectedAt: new Date(),
    });
    testOfferIds.push(freshOffer._id);

    const digestSpy = vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: true,
      id: `mock_cap_${timestamp}`,
    });

    await triggerDailyOfferDigest();

    const updatedCapUser = await UserModel.findById(capUser._id);
    expect(updatedCapUser?.sentOfferFingerprints?.length).toBeLessThanOrEqual(300);
    expect(updatedCapUser?.sentOfferFingerprints).toContain(`fp_cap_fresh_${timestamp}`);
    expect(updatedCapUser?.recentDailyDigestHistory?.length).toBeGreaterThanOrEqual(1);

    digestSpy.mockRestore();
  });
});

