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
      previousPrice: 30,
      currentPrice: 20,
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
    expect(premOffer.alertType).toBe('PRICE_DROP');
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
      previousPrice: 30,
      currentPrice: 20,
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
    expect(premOffer.alertType).toBe('PRICE_DROP');

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
      previousPrice: 30,
      currentPrice: 20,
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
      previousPrice: 30,
      currentPrice: 20,
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

  // ── 22, 23, 24, 25: Notifications & Early Access Gating ─────
  it('TEST 22, 23, 24, 25: Alert metadata and early access gating strictly isolate Premium from Free', () => {
    const day2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const earlyPriceDropOffer = {
      title: 'Anthropic Claude Pro Rate Reduction',
      detectedAt: day2,
      previousPrice: 30,
      currentPrice: 20,
      isActive: true,
      isPublic: true,
    };

    // Premium gets PRICE_DROP alert metadata
    const premMeta = getOfferAlertMetadata(earlyPriceDropOffer, true);
    expect(premMeta.isIntelligenceAlert).toBe(true);
    expect(premMeta.alertType).toBe('PRICE_DROP');

    // Free metadata is NEVER returned
    const freeMeta = getOfferAlertMetadata(earlyPriceDropOffer, false);
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

  // ══════════════════════════════════════════════════════════════
  // ── 17 EXACT REQUIRED TEST CASES & NEGATIVE TEST SUITE ───────
  // ══════════════════════════════════════════════════════════════

  it('CASE 1: $100,000 startup credits -> NORMAL OFFER', () => {
    const offer = {
      title: 'OpenAI for Startups — $100,000 Credits',
      description: 'Eligible early-stage startups receive up to $100,000 in API credits.',
      discount: '$100,000 Credits',
      category: 'startup',
      annualSavingsAmount: 100000,
      finalRecommendedScore: 95,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 2: $150,000 startup credits -> NORMAL OFFER', () => {
    const offer = {
      title: 'Microsoft for Startups Founders Hub — $150,000 Credits',
      description: 'Get up to $150k in Azure AI and OpenAI model credits.',
      discount: '$150,000 Credits',
      category: 'startup',
      annualSavingsAmount: 150000,
      finalRecommendedScore: 98,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 3: $300 American Express ChatGPT credit -> NORMAL OFFER', () => {
    const offer = {
      title: 'ChatGPT Plus + American Express Statement Credit',
      description: 'Get up to $300 back on eligible Business Platinum card purchases for AI services.',
      discount: '$300 Statement Credit',
      category: 'partner',
      isPartnerOffer: true,
      partner: 'American Express',
      annualSavingsAmount: 300,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 4: Major provider + 100% free access -> IMPORTANT', () => {
    const offer = {
      title: 'ChatGPT for Teachers & Students Free Access',
      description: 'Verified academic institutions receive free access to ChatGPT Edu.',
      discount: '100% FREE',
      category: 'student',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('IMPORTANT');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('IMPORTANT');
  });

  it('CASE 4b: Normal student offer without 100% free -> NORMAL OFFER', () => {
    const offer = {
      title: 'Perplexity Student Discount',
      description: 'Students receive 20% discount on Perplexity Pro with valid .edu email.',
      discount: '20% OFF',
      category: 'student',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 5: Non-major 100% FREE offer -> PRICE_DROP', () => {
    const offer = {
      title: 'Notion Education Plus — 100% FREE',
      description: 'Free Plus plan for students and educators.',
      discount: '100% FREE',
      category: 'education',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('PRICE_DROP');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('PRICE_DROP');
  });

  it('CASE 6: Partner promotional access (3 months free) -> LIMITED_TIME', () => {
    const offer = {
      title: 'Google One AI Premium + ASUS Hardware Bundle',
      description: 'Complimentary 3-month AI Premium with laptop purchase.',
      discount: '3 Months Free',
      category: 'partner',
      isPartnerOffer: true,
      partner: 'ASUS',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('LIMITED_TIME');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('LIMITED_TIME');
  });

  it('CASE 7: Generic API discount -> NORMAL OFFER', () => {
    const offer = {
      title: 'Anthropic Prompt Caching API Savings',
      description: 'Save 50% on cached prompt tokens.',
      discount: '50% OFF',
      category: 'api',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 8: Generic annual savings -> NORMAL OFFER', () => {
    const offer = {
      title: 'Copy.ai Annual Billing Discount',
      description: 'Save 20% with annual subscription.',
      discount: '20% OFF',
      category: 'annual',
      annualSavingsPercent: 20,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 9: 14-day free trial -> LIMITED_TIME', () => {
    const offer = {
      title: 'Midjourney 14-Day Free Trial',
      description: 'Try Midjourney v6 free for 14 days.',
      discount: '14 Days Free',
      category: 'trial',
      offerSubtype: 'FREE_TRIAL',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('LIMITED_TIME');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('LIMITED_TIME');
  });

  it('CASE 10: Generic free access -> NORMAL OFFER', () => {
    const offer = {
      title: 'Hugging Face Free Inference Tier',
      description: 'Free community inference endpoints.',
      discount: 'FREE',
      category: 'free',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 11: Actual verified historical price $30 -> current price $20 -> PRICE_DROP', () => {
    const offer = {
      title: 'Claude 3.5 Sonnet Rate Reduction',
      previousPrice: 30,
      currentPrice: 20,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('PRICE_DROP');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('PRICE_DROP');
  });

  it('CASE 12: Explicit verified promotion ending on a specific date -> LIMITED_TIME', () => {
    const expiringIn5Days = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const offer = {
      title: 'Midjourney Spring Flash Sale',
      expiresAt: expiringIn5Days,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('LIMITED_TIME');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('LIMITED_TIME');
  });

  it('CASE 13: High-impact verified intelligence event -> IMPORTANT', () => {
    const offer = {
      title: 'OpenAI Commercial Restructuring & Global Rate Adjustment',
      alertType: 'IMPORTANT',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('IMPORTANT');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('IMPORTANT');
  });

  it('CASE 14: Ambiguous promotional wording -> NORMAL OFFER', () => {
    const offer = {
      title: 'Unbelievable AI Deal — Best Price of the Year!',
      description: 'Save big on generative AI today with our special promotional promo.',
      discount: 'Huge Savings',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 15: 70% off promotional discount -> PRICE_DROP', () => {
    const offer = {
      title: 'Synthesia 70% Off Annual Plan',
      discount: '70% OFF',
      annualSavingsPercent: 70,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBe('PRICE_DROP');
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(true);
    expect(meta.alertType).toBe('PRICE_DROP');
  });

  it('CASE 16: Large monetary value with no intelligence evidence -> NORMAL OFFER', () => {
    const offer = {
      title: 'AWS AI Startup Grants — $500,000 in Credits',
      discount: '$500,000',
      category: 'startup',
      annualSavingsAmount: 500000,
      finalRecommendedScore: 99,
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  it('CASE 17: Premium-only offer with no intelligence event -> isPremiumOnly=true, alertType=null', () => {
    const offer = {
      providerId: 'copy-ai',
      title: 'Copy.ai Standard Pro Plan',
      isPremiumOnly: true,
      category: 'annual',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    };
    expect(offer.isPremiumOnly).toBe(true);
    expect(deriveOfferAlertType(offer)).toBeNull();
    const meta = getOfferAlertMetadata(offer, true);
    expect(meta.isIntelligenceAlert).toBe(false);
  });

  // ── EXPLICIT NEGATIVE TESTS ───────────────────────────────────
  // ── EXPLICIT NEGATIVE TESTS ───────────────────────────────────
  describe('Selective Intelligence Negative Tests', () => {
    it('Negative: High recommendation score (99/100) does NOT produce intelligence alert', () => {
      const offer = {
        title: 'Top Ranked AI Tool',
        finalRecommendedScore: 99,
        platformIntelligenceScore: 98,
        offerOpportunityScore: 100,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer)).toBeNull();
      expect(getOfferAlertMetadata(offer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: High dollar credit ($250k) does NOT produce intelligence alert', () => {
      const offer = {
        title: 'Enterprise AI Grant',
        value: '$250,000',
        annualSavingsAmount: 250000,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer)).toBeNull();
      expect(getOfferAlertMetadata(offer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: Popular provider (OpenAI / Anthropic / Google) does NOT produce intelligence alert', () => {
      const offer = {
        providerId: 'openai',
        providerName: 'OpenAI',
        title: 'ChatGPT Plus Standard Offer',
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(offer)).toBeNull();
      expect(getOfferAlertMetadata(offer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: Expired promotion (> 14 days away or in past) does NOT produce LIMITED_TIME alert', () => {
      const pastOffer = {
        title: 'Past Flash Sale',
        expiresAt: new Date(Date.now() - 1000), // in past
        detectedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(pastOffer)).toBeNull();

      const farFutureOffer = {
        title: 'Year-Round Promo',
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days in future
        detectedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(farFutureOffer)).toBeNull();
    });

    it('Negative: Routine expiresAt timestamp in DB WITHOUT campaign-ending copy remains NORMAL OFFER', () => {
      // Routine scraper TTL / DB refresh expiration set to 5 days from now
      const routineOffer = {
        title: 'Midjourney Standard Subscription',
        description: 'Create hyperrealistic images with standard GPU allocation.',
        category: 'subscription',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(routineOffer)).toBeNull();
      const meta = getOfferAlertMetadata(routineOffer, true);
      expect(meta.isIntelligenceAlert).toBe(false);
      expect(meta.alertType).toBeUndefined();
    });

    it('Negative: Ungrounded isPriceDrop flag without previousPrice/currentPrice numbers remains NORMAL OFFER', () => {
      // Annual plan marketing tagged with isPriceDrop: true by scraper
      const annualOffer = {
        title: 'Canva Pro Annual Savings',
        description: 'Save 20% by paying annually instead of monthly.',
        isPriceDrop: true,
        category: 'annual',
        annualSavingsPercent: 20,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(annualOffer)).toBeNull();
      const meta = getOfferAlertMetadata(annualOffer, true);
      expect(meta.isIntelligenceAlert).toBe(false);
    });

    it('Positive: 30-day promotional free trial -> LIMITED_TIME', () => {
      const trialOffer = {
        title: 'GitHub Copilot 30-Day Free Trial',
        description: 'Free trial for individual developers. Terms apply.',
        category: 'trial',
        offerSubtype: 'FREE_TRIAL',
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(trialOffer)).toBe('LIMITED_TIME');
      const meta = getOfferAlertMetadata(trialOffer, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('LIMITED_TIME');
    });

    it('Negative: Newly discovered offer (Day 0) remains NORMAL OFFER without artificial alerts', () => {
      const dayZeroOffer = {
        title: 'New AI Voice Generator Plan',
        description: 'Brand new tier just launched.',
        detectedAt: new Date(), // Day 0
      };
      expect(deriveOfferAlertType(dayZeroOffer)).toBeNull();
      const meta = getOfferAlertMetadata(dayZeroOffer, true);
      expect(meta.isIntelligenceAlert).toBe(false);
    });

    it('Negative: "20% off annual billing" and "Save $50" marketing copy remains NORMAL OFFER', () => {
      const copyOffer = {
        title: 'Framer AI Annual Discount — Save $50',
        description: 'Get 20% off annual billing today and save $50 on your web design workflow.',
        discount: '20% OFF',
        category: 'annual',
        annualSavingsAmount: 50,
        annualSavingsPercent: 20,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(copyOffer)).toBeNull();
      expect(getOfferAlertMetadata(copyOffer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: Upstream crawler setting alertType="IMPORTANT" on commercial startup offer is REJECTED', () => {
      const spoofedStartupOffer = {
        title: 'OpenAI for Startups — $100,000 Credits',
        description: 'Eligible early-stage startups receive up to $100,000 in API credits.',
        category: 'startup',
        alertType: 'IMPORTANT', // Raw unverified upstream flag
        annualSavingsAmount: 100000,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(spoofedStartupOffer)).toBeNull();
      expect(getOfferAlertMetadata(spoofedStartupOffer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: Upstream crawler setting alertType="LIMITED_TIME" without expiry or copy is REJECTED', () => {
      const spoofedLimitedOffer = {
        title: 'Perplexity Standard Academic Plan',
        description: 'Standard plan for verified students.',
        category: 'student',
        alertType: 'LIMITED_TIME', // Raw unverified upstream flag
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(spoofedLimitedOffer)).toBeNull();
      expect(getOfferAlertMetadata(spoofedLimitedOffer, true).isIntelligenceAlert).toBe(false);
    });

    it('Negative: expiresAt from crawler TTL (7 days) without promotional copy remains NORMAL OFFER', () => {
      const ttlOffer = {
        title: 'Anthropic Claude Pro Standard',
        description: 'Official monthly subscription for Claude 3.5 Sonnet.',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Crawler refresh TTL
        category: 'subscription',
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(ttlOffer)).toBeNull();
      expect(getOfferAlertMetadata(ttlOffer, true).isIntelligenceAlert).toBe(false);
    });
  });

  // ── EXPLICIT POSITIVE VERIFIED FIXTURES ───────────────────────
  describe('Selective Intelligence Positive Verified Fixtures', () => {
    it('Positive: previousPrice ($30) > currentPrice ($20) -> PRICE_DROP', () => {
      const dropOffer = {
        title: 'Anthropic Claude Pro Rate Reduction',
        description: 'Monthly price dropped from $30 to $20.',
        previousPrice: 30,
        currentPrice: 20,
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(dropOffer)).toBe('PRICE_DROP');
      const meta = getOfferAlertMetadata(dropOffer, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('PRICE_DROP');
    });

    it('Positive: Active near-term expiry + explicit "Promotion ends October 15" copy -> LIMITED_TIME', () => {
      const limitedOffer = {
        title: 'Midjourney Fall Promotion',
        description: 'Special seasonal pricing. Promotion ends October 15.',
        expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(limitedOffer)).toBe('LIMITED_TIME');
      const meta = getOfferAlertMetadata(limitedOffer, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('LIMITED_TIME');
    });

    it('Positive: Explicit verified IMPORTANT event signal -> IMPORTANT', () => {
      const importantOffer = {
        title: 'OpenAI Enterprise Model Pricing Restructuring',
        description: 'Major platform pricing model revision impacting all standard API tiers.',
        eventType: 'IMPORTANT',
        detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      };
      expect(deriveOfferAlertType(importantOffer)).toBe('IMPORTANT');
      const meta = getOfferAlertMetadata(importantOffer, true);
      expect(meta.isIntelligenceAlert).toBe(true);
      expect(meta.alertType).toBe('IMPORTANT');
    });
  });

  // ── SECTION 12 TEST MATRIX ───────────────────────────────────
  describe('Hybrid Intelligence Engine — Section 12 Test Matrix', () => {
    // NORMAL
    it('10% annual discount -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool', discount: '10% OFF', category: 'annual', annualSavingsPercent: 10 })).toBeNull();
    });

    it('15% annual discount -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool', discount: '15% OFF', category: 'annual', annualSavingsPercent: 15 })).toBeNull();
    });

    it('20% annual discount -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool', discount: '20% OFF', category: 'annual', annualSavingsPercent: 20 })).toBeNull();
    });

    it('normal student offer -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'Student Plan', description: 'Student discount', discount: '20% OFF', category: 'student' })).toBeNull();
    });

    it('normal startup credits -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'Startup Program', discount: '$100,000 Credits', category: 'startup' })).toBeNull();
    });

    it('normal API discount -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'Prompt Caching API Savings', description: 'Prompt caching tokens', category: 'api' })).toBeNull();
    });

    it('normal provider pricing -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'AI Platform Standard', description: '$20/month plan' })).toBeNull();
    });

    it('newly discovered offer -> NORMAL', () => {
      expect(deriveOfferAlertType({ title: 'New AI Tool', detectedAt: new Date() })).toBeNull();
    });

    it('Major provider + ordinary 10% discount -> NORMAL', () => {
      expect(deriveOfferAlertType({ providerId: 'openai', title: 'ChatGPT 10% Off', discount: '10% OFF' })).toBeNull();
    });

    it('Major provider + ordinary 20% annual savings -> NORMAL', () => {
      expect(deriveOfferAlertType({ providerId: 'openai', title: 'ChatGPT Annual Savings', discount: '20% OFF', category: 'annual', annualSavingsPercent: 20 })).toBeNull();
    });

    it('Major provider + normal pricing -> NORMAL', () => {
      expect(deriveOfferAlertType({ providerId: 'openai', title: 'ChatGPT Plus Standard' })).toBeNull();
    });

    // PRICE_DROP
    it('50% off -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool 50% Off', discount: '50% OFF' })).toBe('PRICE_DROP');
    });

    it('60% off -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool 60% Off', discount: '60% OFF' })).toBe('PRICE_DROP');
    });

    it('70% off -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool 70% Off', discount: '70% OFF' })).toBe('PRICE_DROP');
    });

    it('90% off -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'AI Tool 90% Off', discount: '90% OFF' })).toBe('PRICE_DROP');
    });

    it('100% free (non-major) -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'Framer Education Plus — 100% FREE', discount: '100% FREE' })).toBe('PRICE_DROP');
    });

    it('verified $30 -> $20 -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ title: 'Tool Rate Cut', previousPrice: 30, currentPrice: 20 })).toBe('PRICE_DROP');
    });

    // LIMITED_TIME
    it('7-day free trial -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 7-Day Free Trial', discount: '7-Day Free Trial' })).toBe('LIMITED_TIME');
    });

    it('14-day free trial -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 14-Day Free Trial', discount: '14-Day Free Trial' })).toBe('LIMITED_TIME');
    });

    it('15-day free trial -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 15-Day Free Trial', discount: '15-Day Free Trial' })).toBe('LIMITED_TIME');
    });

    it('30-day free trial -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 30-Day Free Trial', discount: '30-Day Free Trial' })).toBe('LIMITED_TIME');
    });

    it('3 months free -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 3 Months Free', discount: '3 Months Free' })).toBe('LIMITED_TIME');
    });

    it('6 months free -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 6 Months Free', discount: '6 Months Free' })).toBe('LIMITED_TIME');
    });

    it('12 months free (non-major) -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 12 Months Free', discount: '12 Months Free' })).toBe('LIMITED_TIME');
    });

    it('16 months free (non-major) -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Tool 16 Months Free', discount: '16 Months Free' })).toBe('LIMITED_TIME');
    });

    it('"Offer ends October 15" -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ title: 'Flash Promo', description: 'Offer ends October 15' })).toBe('LIMITED_TIME');
    });

    // IMPORTANT
    it('Major provider + 100% free -> IMPORTANT', () => {
      expect(deriveOfferAlertType({ providerId: 'chatgpt', title: 'ChatGPT for Teachers — 100% Free', discount: '100% FREE' })).toBe('IMPORTANT');
    });

    it('Major provider + 12 months free -> IMPORTANT', () => {
      expect(deriveOfferAlertType({ providerId: 'perplexity', title: 'Perplexity 12 Months Free', discount: '12 Months Free' })).toBe('IMPORTANT');
    });

    it('Major provider + 16 months free -> IMPORTANT', () => {
      expect(deriveOfferAlertType({ providerId: 'gemini', title: 'Gemini 16 Months Free', discount: '16 Months Free' })).toBe('IMPORTANT');
    });

    it('Major provider + exceptional promotion (50% off) -> IMPORTANT', () => {
      expect(deriveOfferAlertType({ providerId: 'claude', title: 'Claude Pro — 50% Off', discount: '50% OFF' })).toBe('IMPORTANT');
    });

    // ── LIVE CALIBRATION REGRESSION FIXTURES ──
    it('DeepSeek + 50% API discount -> PRICE_DROP (not IMPORTANT)', () => {
      expect(deriveOfferAlertType({ providerId: 'deepseek', title: 'DeepSeek Off-Peak 50% Discount', category: 'api', discount: '50% Off-Peak' })).toBe('PRICE_DROP');
    });

    it('Mistral + 50% discount -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ providerId: 'mistral', title: 'Mistral 50% Discount', discount: '50% OFF' })).toBe('PRICE_DROP');
    });

    it('Cursor + 50% discount -> PRICE_DROP', () => {
      expect(deriveOfferAlertType({ providerId: 'cursor', title: 'Cursor Pro 50% Discount', discount: '50% OFF' })).toBe('PRICE_DROP');
    });

    it('Cursor 14-day free trial -> LIMITED_TIME', () => {
      expect(deriveOfferAlertType({ providerId: 'cursor', title: 'Cursor Pro 14-Day Free Trial', category: 'trial', discount: '14-Day Free Trial' })).toBe('LIMITED_TIME');
    });

    it('Amazon Q Developer Free Tier -> NORMAL', () => {
      expect(deriveOfferAlertType({
        providerId: 'amazon-q',
        title: 'Amazon Q Developer Free Tier',
        category: 'free',
        offerSubtype: 'FREE_PLAN',
        discount: '100% Free Developer Tier',
        duration: 'Ongoing free tier'
      })).toBeNull();
    });

    it('Fireworks AI Developer Free Credits -> NORMAL', () => {
      expect(deriveOfferAlertType({
        providerId: 'fireworks-ai',
        title: 'Fireworks AI Developer Free Credits',
        category: 'api',
        offerSubtype: 'API_DISCOUNT',
        discount: '$1 Free Credit',
        duration: 'Upon registration'
      })).toBeNull();
    });

    it('Cohere Developer API Free Tier -> NORMAL', () => {
      expect(deriveOfferAlertType({
        providerId: 'cohere',
        title: 'Cohere Developer API Free Tier',
        category: 'api',
        offerSubtype: 'API_DISCOUNT',
        discount: 'Free Trial Key',
        duration: 'Ongoing developer rate limit'
      })).toBeNull();
    });

    it('Together AI Developer Trial Credits -> NORMAL', () => {
      expect(deriveOfferAlertType({
        providerId: 'together-ai',
        title: 'Together AI Developer Trial Credits',
        category: 'api',
        offerSubtype: 'API_DISCOUNT',
        discount: '$5 Free Trial Credit',
        duration: '3 months from signup'
      })).toBeNull();
    });

    it('Tier-1 Gemini + 18 months free -> IMPORTANT', () => {
      expect(deriveOfferAlertType({
        providerId: 'gemini',
        title: 'Google AI Pro with Jio 5G',
        category: 'partner',
        discount: '18 Months FREE',
        duration: '18 months'
      })).toBe('IMPORTANT');
    });
  });
});

