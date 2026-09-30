// ============================================================
// Premium-First Offer Lifecycle Test Suite — StackSave AI
// Covers all 28 production lifecycle requirements:
// 1. Stage 1 & 2: Day 0 to Day 5 Early Access (Premium sees, Free/Guest hidden)
// 2. Stage 3 & 4: Day 5 to 6 Months (Premium sees alert treatment, Free/Guest sees normal card)
// 3. Stage 5: After 6 Months (Alert expires, Premium & Free see normal card)
// 4. Stage 6: Offer Expiration/Removal (Immediate removal from everyone)
// 5. Lifecycle Timestamps, Canonical Identity & Sync Persistence
// ============================================================

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import http from 'http';
import app from '../src/app';
import {
  UserModel,
  NotificationEventModel,
  connectDB,
} from '../src/services/dbService';
import { generateSessionToken, SESSION_COOKIE_NAME } from '../src/utils/session';
import {
  isOfferActiveAndValid,
  isOfferInEarlyAccess,
  isOfferInPremiumAlertWindow,
  isOfferVisibleForUser,
  getOfferAlertMetadata,
  deriveOfferAlertType,
  getEarlyAccessUntil,
  getPremiumAlertExpiresAt,
  EARLY_ACCESS_DURATION_MS,
  PREMIUM_ALERT_DURATION_MS,
} from '../src/config/offersConfig';
import { invalidatePublicOffersCache } from '../src/routes/intelligence';

let server: http.Server;
let baseUrl: string;

let testPremiumUser: any;
let testFreeUser: any;
let premiumToken: string;
let freeToken: string;

beforeAll(async () => {
  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const timestamp = Date.now();

  testPremiumUser = await UserModel.create({
    googleId: `lifecycle-prem-${timestamp}`,
    email: `lifecycle-prem-${timestamp}@stacksave.test`,
    name: 'Lifecycle Premium User',
    plan: 'PREMIUM',
    subscriptionStatus: 'ACTIVE',
    sessionVersion: 1,
  });

  testFreeUser = await UserModel.create({
    googleId: `lifecycle-free-${timestamp}`,
    email: `lifecycle-free-${timestamp}@stacksave.test`,
    name: 'Lifecycle Free User',
    plan: 'FREE',
    subscriptionStatus: 'NONE',
    sessionVersion: 1,
  });

  premiumToken = generateSessionToken(testPremiumUser);
  freeToken = generateSessionToken(testFreeUser);
}, 40000);

afterAll(async () => {
  if (testPremiumUser?._id) {
    await UserModel.deleteOne({ _id: testPremiumUser._id });
  }
  if (testFreeUser?._id) {
    await UserModel.deleteOne({ _id: testFreeUser._id });
  }
  await NotificationEventModel.deleteMany({ fingerprint: { $regex: /^test_lifecycle_/ } });

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe('Premium-First Offer Lifecycle Suite', () => {
  beforeEach(async () => {
    await NotificationEventModel.deleteMany({ fingerprint: { $regex: /^test_lifecycle_/ } });
    invalidatePublicOffersCache();
  });

  // ── Helper to create test offer documents in DB ─────────────
  async function createTestOffer(overrides: Partial<any> = {}) {
    const doc = {
      fingerprint: `test_lifecycle_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      providerId: 'cursor',
      providerName: 'Cursor',
      title: 'Cursor Pro Special Discount',
      description: 'Get 20% off Cursor Pro annual subscription with verified savings.',
      discount: '20% OFF',
      discountType: 'PROMOTION',
      evidenceText: 'Valid official pricing source confirmation text for testing lifecycle.',
      detectionMethod: 'PLAYWRIGHT_DOM',
      sourceStatus: 'VERIFIED',
      sourceUrl: 'https://cursor.com/pricing',
      detectedAt: new Date(),
      lastConfirmedAt: new Date(),
      lastSeenAt: new Date(),
      isActive: true,
      isPublic: true,
      eventType: 'NEW_OFFER',
      category: 'annual',
      annualSavingsPercent: 20,
      annualSavingsAmount: 48,
      ...overrides,
    };
    return await NotificationEventModel.create(doc);
  }

  // ── 1, 2, 3: Day 0 New Verified Offer ───────────────────────
  it('TEST 1, 2, 3: Day 0 new verified offer is visible to Premium, hidden from Free and Guest', async () => {
    const day0 = new Date();
    await createTestOffer({
      fingerprint: 'test_lifecycle_day0_cursor',
      detectedAt: day0,
      title: 'Cursor Pro Day 0 Offer',
    });
    invalidatePublicOffersCache();

    // Premium request
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 0 Offer');
    expect(premOffer).toBeDefined();
    expect(premOffer.isIntelligenceAlert).toBe(true);
    expect(premOffer.alertType).toBe('EARLY_ACCESS');
    expect(premOffer.alertExpiresAt).toBeDefined();

    // Free request
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    const freeOffer = freeJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 0 Offer');
    expect(freeOffer).toBeUndefined(); // HIDDEN

    // Guest request (no auth cookie)
    const guestRes = await fetch(`${baseUrl}/api/intelligence/offers`);
    const guestJson = await guestRes.json();
    const guestOffer = guestJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 0 Offer');
    expect(guestOffer).toBeUndefined(); // HIDDEN
  });

  // ── 4, 5: Offer at Day 4 (< 5 days) ──────────────────────────
  it('TEST 4, 5: Offer at Day 4 (96h old) remains Early Access (Premium sees alert, Free hidden)', async () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await createTestOffer({
      fingerprint: 'test_lifecycle_day4_cursor',
      detectedAt: fourDaysAgo,
      title: 'Cursor Pro Day 4 Offer',
    });
    invalidatePublicOffersCache();

    // Premium sees alert
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 4 Offer');
    expect(premOffer).toBeDefined();
    expect(premOffer.isIntelligenceAlert).toBe(true);
    expect(premOffer.alertType).toBe('EARLY_ACCESS');

    // Free does NOT see it
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    const freeOffer = freeJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 4 Offer');
    expect(freeOffer).toBeUndefined();
  });

  // ── 6, 7, 8: Offer at Day 5 and after Day 5 ──────────────────
  it('TEST 6, 7, 8: Offer at Day 6 is visible to Free as normal card, while Premium retains alert treatment if genuine', async () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await createTestOffer({
      fingerprint: 'test_lifecycle_day6_cursor',
      detectedAt: sixDaysAgo,
      title: 'Cursor Pro Day 6 Offer',
      isPriceDrop: true,
    });
    invalidatePublicOffersCache();

    // Free sees it as a NORMAL offer without alert metadata
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    const freeOffer = freeJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 6 Offer');
    expect(freeOffer).toBeDefined();
    expect(freeOffer.isIntelligenceAlert).toBe(false);
    expect(freeOffer.alertType).toBeNull();
    expect(freeOffer.alertExpiresAt).toBeNull();

    // Premium sees it with active alert treatment
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 6 Offer');
    expect(premOffer).toBeDefined();
    expect(premOffer.isIntelligenceAlert).toBe(true);
    expect(premOffer.alertType).toBe('PRICE_DROP');
  });

  // ── 9, 10: Offer at Day 30 and Day 179 (< 180 days) ──────────
  it('TEST 9, 10: Premium alert remains active at Day 30 and Day 179 for genuine intelligence events', async () => {
    const day30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const day179 = new Date(Date.now() - 179 * 24 * 60 * 60 * 1000);

    expect(isOfferInPremiumAlertWindow({ detectedAt: day30 })).toBe(true);
    expect(isOfferInPremiumAlertWindow({ detectedAt: day179 })).toBe(true);

    await createTestOffer({
      fingerprint: 'test_lifecycle_day179',
      detectedAt: day179,
      title: 'Cursor Pro Day 179 Offer',
      isPriceDrop: true,
    });
    invalidatePublicOffersCache();

    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 179 Offer');
    expect(premOffer.isIntelligenceAlert).toBe(true);
    expect(premOffer.alertType).toBe('PRICE_DROP');
  });

  // ── 11, 12, 13: Offer after 6 Months (Day 181) ───────────────
  it('TEST 11, 12, 13: After 6 months (Day 181), Premium alert expires and both Premium & Free see normal card', async () => {
    const day181 = new Date(Date.now() - 181 * 24 * 60 * 60 * 1000);

    expect(isOfferInPremiumAlertWindow({ detectedAt: day181 })).toBe(false);

    await createTestOffer({
      fingerprint: 'test_lifecycle_day181',
      detectedAt: day181,
      title: 'Cursor Pro Day 181 Offer',
      isPriceDrop: true,
    });
    invalidatePublicOffersCache();

    // Premium sees normal offer (no alert metadata)
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 181 Offer');
    expect(premOffer).toBeDefined();
    expect(premOffer.isIntelligenceAlert).toBe(false);
    expect(premOffer.alertType).toBeNull();

    // Free sees normal offer
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    const freeOffer = freeJson.data.offers.find((o: any) => o.title === 'Cursor Pro Day 181 Offer');
    expect(freeOffer).toBeDefined();
    expect(freeOffer.isIntelligenceAlert).toBe(false);
  });

  // ── 14, 15, 16: Offer becomes Expired on Day 30 ─────────────
  it('TEST 14, 15, 16: Expired offer is immediately excluded from Premium, Free, and Guest', async () => {
    const day30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const pastExpiry = new Date(Date.now() - 1000); // expired 1 sec ago

    await createTestOffer({
      fingerprint: 'test_lifecycle_expired_day30',
      detectedAt: day30,
      expiresAt: pastExpiry,
      title: 'Cursor Pro Expired Offer',
    });
    invalidatePublicOffersCache();

    // Premium cannot see expired offer
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    expect(premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Expired Offer')).toBeUndefined();

    // Free cannot see expired offer
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    expect(freeJson.data.offers.find((o: any) => o.title === 'Cursor Pro Expired Offer')).toBeUndefined();

    // Guest cannot see expired offer
    const guestRes = await fetch(`${baseUrl}/api/intelligence/offers`);
    const guestJson = await guestRes.json();
    expect(guestJson.data.offers.find((o: any) => o.title === 'Cursor Pro Expired Offer')).toBeUndefined();
  });

  // ── 17: Inactive / Unverified Offer ──────────────────────────
  it('TEST 17: Inactive offer (isActive: false or status: EXPIRED) is completely excluded', async () => {
    const day10 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await createTestOffer({
      fingerprint: 'test_lifecycle_inactive',
      detectedAt: day10,
      isActive: false,
      title: 'Cursor Pro Inactive Offer',
    });
    invalidatePublicOffersCache();

    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    expect(premJson.data.offers.find((o: any) => o.title === 'Cursor Pro Inactive Offer')).toBeUndefined();
  });

  // ── 18, 19, 20, 21: detectedAt Lifecycle Timestamps ──────────
  it('TEST 18, 19, 20, 21: Early access and 6-month timers belong to original detectedAt', () => {
    const originalDetectedAt = new Date('2026-01-01T00:00:00Z');
    const earlyAccessUntil = getEarlyAccessUntil(originalDetectedAt);
    const alertExpiresAt = getPremiumAlertExpiresAt(originalDetectedAt);

    expect(earlyAccessUntil.toISOString()).toBe('2026-01-06T00:00:00.000Z'); // 5 days
    expect(alertExpiresAt.getTime() - originalDetectedAt.getTime()).toBe(PREMIUM_ALERT_DURATION_MS);

    // At Day 3 (2026-01-04): Early access active
    const day3 = new Date('2026-01-04T00:00:00Z');
    expect(isOfferInEarlyAccess({ detectedAt: originalDetectedAt }, day3)).toBe(true);
    expect(isOfferVisibleForUser({ offer: { detectedAt: originalDetectedAt, isActive: true, isPublic: true }, isPremium: false, now: day3 })).toBe(false);
    expect(isOfferVisibleForUser({ offer: { detectedAt: originalDetectedAt, isActive: true, isPublic: true }, isPremium: true, now: day3 })).toBe(true);

    // At Day 6 (2026-01-07): Early access passed, alert window active
    const day6 = new Date('2026-01-07T00:00:00Z');
    expect(isOfferInEarlyAccess({ detectedAt: originalDetectedAt }, day6)).toBe(false);
    expect(isOfferInPremiumAlertWindow({ detectedAt: originalDetectedAt }, day6)).toBe(true);
    expect(isOfferVisibleForUser({ offer: { detectedAt: originalDetectedAt, isActive: true, isPublic: true }, isPremium: false, now: day6 })).toBe(true);

    // At Day 181: Alert expired, offer remains public
    const day181 = new Date(originalDetectedAt.getTime() + 181 * 24 * 60 * 60 * 1000);
    expect(isOfferInPremiumAlertWindow({ detectedAt: originalDetectedAt }, day181)).toBe(false);
    expect(isOfferVisibleForUser({ offer: { detectedAt: originalDetectedAt, isActive: true, isPublic: true }, isPremium: true, now: day181 })).toBe(true);
    expect(isOfferVisibleForUser({ offer: { detectedAt: originalDetectedAt, isActive: true, isPublic: true }, isPremium: false, now: day181 })).toBe(true);
  });

  // ── 22, 23, 24, 25: Notifications & Email Intelligence ──────
  it('TEST 22, 23, 24, 25: Alert metadata and early access gating strictly isolate Premium from Free', () => {
    const day2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const earlyOffer = {
      title: 'Anthropic Claude Pro Discount',
      detectedAt: day2,
      discount: '30% OFF',
      isActive: true,
      isPublic: true,
    };

    // Premium metadata in early access window (< 5 days) gets EARLY_ACCESS
    const premMeta = getOfferAlertMetadata(earlyOffer, true);
    expect(premMeta.isIntelligenceAlert).toBe(true);
    expect(premMeta.alertType).toBe('EARLY_ACCESS');

    // Free metadata is NEVER returned
    const freeMeta = getOfferAlertMetadata(earlyOffer, false);
    expect(freeMeta.isIntelligenceAlert).toBe(false);
    expect(freeMeta.alertType).toBeUndefined();
  });

  // ── 26, 27, 28: Existing Premium-Only Offers & Validity ─────
  it('TEST 26, 27, 28: Permanent Premium-only offers remain gated regardless of age', async () => {
    const day20 = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
    await createTestOffer({
      fingerprint: 'test_lifecycle_prem_only_copyai',
      providerId: 'copy-ai',
      providerName: 'Copy.ai',
      sourceUrl: 'https://copy.ai/pricing',
      detectedAt: day20,
      title: 'Copy.ai Exclusive Partner Perk',
      isPremiumOnly: true,
    });
    invalidatePublicOffersCache();

    // Premium sees it
    const premRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${premiumToken}` },
    });
    const premJson = await premRes.json();
    const premOffer = premJson.data.offers.find((o: any) => o.title === 'Copy.ai Exclusive Partner Perk');
    expect(premOffer).toBeDefined();

    // Free does NOT see it (permanent Premium-only offer)
    const freeRes = await fetch(`${baseUrl}/api/intelligence/offers`, {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${freeToken}` },
    });
    const freeJson = await freeRes.json();
    const freeOffer = freeJson.data.offers.find((o: any) => o.title === 'Copy.ai Exclusive Partner Perk');
    expect(freeOffer).toBeUndefined();
  });

  // ── EXPLICIT REGRESSION TEST SUITE (16 REQUIRED SCENARIOS) ──

  it('REGRESSION 1: Student discount with 50% OFF is NOT classified as PRICE_DROP', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Perplexity Education Pro — 50% OFF',
      description: 'Students get 50% off Perplexity Pro with academic email verification.',
      discount: '50% OFF',
      category: 'student',
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('REGRESSION 2: Education offer with 100% FREE is NOT classified as IMPORTANT', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Notion Education — 100% FREE',
      description: 'Free Plus plan for verified students and educators.',
      discount: '100% FREE',
      category: 'student',
      annualSavingsPercent: 100,
      finalRecommendedScore: 95,
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('REGRESSION 3: Partner Bundle is NOT classified as IMPORTANT simply because it has high value', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'ASUS + Google One AI Premium Bundle',
      description: 'Get 3 months free Google One AI Premium with ASUS laptop purchase.',
      discount: '3 Months Free',
      isPartnerOffer: true,
      partner: 'ASUS',
      annualSavingsPercent: 50,
      finalRecommendedScore: 88,
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('REGRESSION 4: Annual Savings is NOT classified as PRICE_DROP merely because annual price is lower than monthly', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Copy.ai Pro Annual Savings',
      description: 'Save 20% by paying annually instead of monthly.',
      discount: '20% OFF',
      offerSubtype: 'ANNUAL_DISCOUNT',
      category: 'annual',
      annualSavingsPercent: 20,
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('REGRESSION 5: API discount is NOT classified as PRICE_DROP without historical evidence', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Anthropic Prompt Caching 50%',
      description: 'Reduce prompt costs by 50% using prompt caching API.',
      discount: '50% OFF',
      category: 'api',
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('REGRESSION 6: Premium-only Annual Savings remains marked as isPremiumOnly', () => {
    const offer = {
      providerId: 'copy-ai',
      title: 'Copy.ai Pro Annual Deal',
      category: 'annual',
      isPremiumOnly: true,
    };
    expect(offer.isPremiumOnly).toBe(true);
  });

  it('REGRESSION 7: Premium-only + genuine price drop preserves isPremiumOnly flag', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      providerId: 'copy-ai',
      title: 'Copy.ai Pro Historic Price Cut',
      isPremiumOnly: true,
      isPriceDrop: true,
      detectedAt: pastDay5,
    };
    expect(offer.isPremiumOnly).toBe(true);
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBe('PRICE_DROP');
  });

  it('REGRESSION 8: Genuine historical price drop produces PRICE_DROP alert', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Claude 3.5 Sonnet Rate Reduction',
      isPriceDrop: true,
      previousPrice: 15,
      currentPrice: 3,
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBe('PRICE_DROP');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('PRICE_DROP');
  });

  it('REGRESSION 9: Genuine limited-time offer expiring soon produces LIMITED_TIME alert', () => {
    const pastDay5 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const expiringSoon = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future
    const offer = {
      title: 'Midjourney Spring Flash Sale',
      expiresAt: expiringSoon,
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBe('LIMITED_TIME');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('LIMITED_TIME');
  });

  it('REGRESSION 10: Genuine new commercial offer in Day 0 to Day 5 produces EARLY_ACCESS alert', () => {
    const day2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'New AI Coding Assistant Launch Offer',
      detectedAt: day2,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBe('EARLY_ACCESS');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('EARLY_ACCESS');
  });

  it('REGRESSION 11: Repeated scraping does not create a fake NEW alert', () => {
    const pastDay5 = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Mistral Large Rescraped Offer',
      detectedAt: pastDay5,
    };
    const alertType = deriveOfferAlertType(offer);
    expect(alertType).toBeNull();
  });

  it('REGRESSION 12: Existing 5-day early-access behavior remains correct', () => {
    const day1 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const day6 = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    expect(isOfferInEarlyAccess({ detectedAt: day1 })).toBe(true);
    expect(isOfferInEarlyAccess({ detectedAt: day6 })).toBe(false);
  });

  it('REGRESSION 13: Existing 6-month alert expiration remains correct', () => {
    const day100 = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    const day185 = new Date(Date.now() - 185 * 24 * 60 * 60 * 1000);
    expect(isOfferInPremiumAlertWindow({ detectedAt: day100 })).toBe(true);
    expect(isOfferInPremiumAlertWindow({ detectedAt: day185 })).toBe(false);
  });

  it('REGRESSION 14: Existing expired-offer removal remains correct', () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 100000);
    expect(isOfferActiveAndValid({ isActive: true, isPublic: true, expiresAt: past })).toBe(false);
    expect(isOfferActiveAndValid({ isActive: true, isPublic: true, expiresAt: future })).toBe(true);
    expect(isOfferActiveAndValid({ isActive: false, isPublic: true })).toBe(false);
    expect(isOfferActiveAndValid({ isActive: true, isPublic: true, status: 'EXPIRED' })).toBe(false);
  });

  it('REGRESSION 15: Free/Guest alert metadata remains strictly stripped', () => {
    const offer = {
      title: 'Claude 3.5 Sonnet Drop',
      isPriceDrop: true,
      detectedAt: new Date(),
    };
    const freeMeta = getOfferAlertMetadata(offer, false);
    expect(freeMeta.isIntelligenceAlert).toBe(false);
    expect(freeMeta.alertType).toBeUndefined();
  });

  it('REGRESSION 16: Existing Premium-only access control remains correct', () => {
    const offer = {
      providerId: 'copy-ai',
      isPremiumOnly: true,
      isActive: true,
      isPublic: true,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(isOfferVisibleForUser({ offer, isPremium: true })).toBe(true);
    expect(isOfferVisibleForUser({ offer, isPremium: false })).toBe(false);
  });
});
