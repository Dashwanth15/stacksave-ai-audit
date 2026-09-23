import { describe, it, expect, vi } from 'vitest';
import {
  selectDailyOffersForUser,
  triggerDailyOfferDigest,
  TWENTY_DAYS_MS,
  MIN_DIGEST_INTERVAL_MS,
  UserDigestContext,
} from '../src/services/emailScheduler';
import {
  buildCanonicalOfferKey,
  canPublishOffer,
} from '../src/pricing/offerTrust';
import { UserModel, NotificationEventModel, SubscriptionModel } from '../src/services/dbService';
import * as emailService from '../src/services/emailService';

describe('Strict 20-Day Premium Email Offer Rotation & Anti-Duplication Suite', () => {
  const PROVIDERS = [
    { id: 'gemini', url: 'https://one.google.com/about/ai-premium', name: 'Gemini' },
    { id: 'claude', url: 'https://claude.com/pricing', name: 'Claude' },
    { id: 'chatgpt', url: 'https://openai.com/pricing', name: 'ChatGPT' },
    { id: 'cursor', url: 'https://cursor.com/pricing', name: 'Cursor' },
    { id: 'perplexity', url: 'https://perplexity.ai/pricing', name: 'Perplexity' },
    { id: 'antigravity', url: 'https://antigravity.google/pricing', name: 'Antigravity' },
    { id: 'windsurf', url: 'https://codeium.com/pricing', name: 'Windsurf' },
    { id: 'github-copilot', url: 'https://github.com/pricing', name: 'GitHub Copilot' },
  ];

  function makeOffer(
    id: string,
    overrides: Record<string, any> = {}
  ) {
    const p = PROVIDERS[Math.abs(id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % PROVIDERS.length];
    return {
      providerId: overrides.providerId || p.id,
      providerName: overrides.providerName || p.name,
      title: overrides.title || `${p.name} Pro Plan ${id}`,
      description: overrides.description || 'Verified official AI subscription discount for production use',
      evidenceText: overrides.evidenceText || 'Verified pricing evidence extracted from official pricing page >= 20 chars',
      sourceUrl: overrides.sourceUrl || p.url,
      fingerprint: overrides.fingerprint || `fp_${id}`,
      discount: overrides.discount || '30% off',
      category: overrides.category || 'annual',
      offerSubtype: overrides.offerSubtype || 'ANNUAL_DISCOUNT',
      isActive: true,
      isPublic: true,
      status: 'ACTIVE',
      detectedAt: overrides.detectedAt || new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      ...overrides,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // TEST 1 — 20-DAY BASIC
  // Day 1: A B C D E
  // Day 3: F G H I J
  // Day 5: K L M N O
  // Day 7: P Q R S T
  // Day 9: U V W X Y
  // Day 11: A B C D E MUST NOT be selected.
  // ─────────────────────────────────────────────────────────────
  it('TEST 1: 20-Day Basic — Offers sent on Day 1-9 are strictly excluded on Day 11', () => {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z1', 'Z2', 'Z3', 'Z4', 'Z5'];
    const allOffers = letters.map((l, idx) => {
      const p = PROVIDERS[idx % PROVIDERS.length];
      return makeOffer(l, {
        providerId: p.id,
        providerName: p.name,
        sourceUrl: p.url,
        title: `${p.name} Tier ${l}`,
        fingerprint: `fp_${l}`,
      });
    });

    const recentWindowKeys = new Set<string>();
    const canonicalKeyLastSentDate = new Map<string, Date>();
    const baseDate = new Date('2026-09-01T08:00:00Z');

    // Simulate Days 1, 3, 5, 7, 9
    const dayOffsets = [0, 2, 4, 6, 8];
    for (let cycle = 0; cycle < 5; cycle++) {
      const cycleDate = new Date(baseDate.getTime() + dayOffsets[cycle] * 24 * 60 * 60 * 1000);
      const startIdx = cycle * 5;
      const cycleOffers = allOffers.slice(startIdx, startIdx + 5);
      for (const off of cycleOffers) {
        const key = buildCanonicalOfferKey(off);
        recentWindowKeys.add(key);
        canonicalKeyLastSentDate.set(key, cycleDate);
      }
    }

    // Now Day 11 (10 days after Day 1)
    const day11Now = baseDate.getTime() + 10 * 24 * 60 * 60 * 1000;
    vi.setSystemTime(new Date(day11Now));

    const selectedDay11 = selectDailyOffersForUser(allOffers, {
      recentWindowKeys,
      canonicalKeyLastSentDate,
    });

    // Day 1 offers (A, B, C, D, E) must NOT be selected on Day 11
    const selectedKeys = new Set(selectedDay11.map((item) => {
      const matched = allOffers.find((o) => o.title === item.title);
      return buildCanonicalOfferKey(matched);
    }));

    for (let i = 0; i < 25; i++) {
      const key = buildCanonicalOfferKey(allOffers[i]);
      expect(selectedKeys.has(key)).toBe(false);
    }

    // Only offers Z1-Z5 should be selected
    expect(selectedDay11.length).toBe(5);
    for (const item of selectedDay11) {
      expect(item.title).toMatch(/Tier Z/);
    }
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2 — 20-DAY BOUNDARY
  // Delivered: September 1, 08:00 UTC
  // At: September 20, 23:59 UTC -> BLOCKED (19.66 days)
  // At: September 21, 08:00 UTC -> ELIGIBLE (20.00 days)
  // ─────────────────────────────────────────────────────────────
  it('TEST 2: 20-Day Boundary — Exact rolling 20-day time threshold enforcement', () => {
    const offer = makeOffer('boundary_offer', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Team Annual Plan',
    });
    const canonicalKey = buildCanonicalOfferKey(offer);

    const deliveredDate = new Date('2026-09-01T08:00:00.000Z');
    const sentMap = new Map<string, Date>([[canonicalKey, deliveredDate]]);

    // Point A: September 20, 23:59:59 UTC (19 days, 15 hours, 59 mins elapsed)
    const pointA = new Date('2026-09-20T23:59:59.000Z');
    vi.setSystemTime(pointA);
    const selectedA = selectDailyOffersForUser([offer], {
      canonicalKeyLastSentDate: sentMap,
    });
    expect(selectedA.length).toBe(0); // STRICTLY BLOCKED

    // Point B: September 21, 08:00:00 UTC (exact 20 days / 480 hours elapsed)
    const pointB = new Date('2026-09-21T08:00:00.000Z');
    vi.setSystemTime(pointB);
    const selectedB = selectDailyOffersForUser([offer], {
      canonicalKeyLastSentDate: sentMap,
    });
    expect(selectedB.length).toBe(1); // ELIGIBLE AGAIN!
    expect(selectedB[0].isMissed).toBe(true);

    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3 — PRICE CHANGE
  // Day 1: Claude Pro -> ₹20
  // Day 5: Claude Pro -> ₹18
  // EXPECTED: NOT eligible.
  // ─────────────────────────────────────────────────────────────
  it('TEST 3: Price Change — Price drops/changes do NOT bypass 20-day cooldown', () => {
    const offerDay1 = makeOffer('claude_pro_d1', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Pro Annual $20/month',
      discount: '$20/month',
      category: 'annual',
      offerSubtype: 'ANNUAL_DISCOUNT',
    });

    const offerDay5 = makeOffer('claude_pro_d5', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Pro Annual ₹18/month',
      discount: '₹18/month',
      category: 'annual',
      offerSubtype: 'ANNUAL_DISCOUNT',
    });

    const day1Key = buildCanonicalOfferKey(offerDay1);
    const day5Key = buildCanonicalOfferKey(offerDay5);
    expect(day1Key).toBe(day5Key); // Same underlying commercial offer key

    const day1Date = new Date('2026-09-01T08:00:00Z');
    const day5Date = new Date('2026-09-05T08:00:00Z');
    vi.setSystemTime(day5Date);

    const selected = selectDailyOffersForUser([offerDay5], {
      canonicalKeyLastSentDate: new Map([[day1Key, day1Date]]),
    });

    expect(selected.length).toBe(0); // STRICTLY BLOCKED
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4 — DESCRIPTION CHANGE
  // Day 1: Offer A description v1
  // Day 5: Offer A description v2
  // EXPECTED: NOT eligible.
  // ─────────────────────────────────────────────────────────────
  it('TEST 4: Description Change — Marketing copy changes do NOT bypass 20-day cooldown', () => {
    const offerV1 = makeOffer('gemini_desc_1', {
      providerId: 'gemini',
      sourceUrl: 'https://gemini.google.com/pricing',
      title: 'Gemini Advanced 2TB Google One Bundle',
      description: 'Initial description: Get Gemini Advanced with 2TB cloud storage included.',
    });

    const offerV2 = makeOffer('gemini_desc_2', {
      providerId: 'gemini',
      sourceUrl: 'https://gemini.google.com/pricing',
      title: 'Gemini Advanced 2TB Google One Bundle',
      description: 'Brand new updated copy: Unlock Google 2TB One storage and Gemini 1.5 Pro deep research capabilities.',
    });

    const key1 = buildCanonicalOfferKey(offerV1);
    const key2 = buildCanonicalOfferKey(offerV2);
    expect(key1).toBe(key2);

    const sentDate = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000); // Sent 4 days ago
    const selected = selectDailyOffersForUser([offerV2], {
      canonicalKeyLastSentDate: new Map([[key1, sentDate]]),
    });

    expect(selected.length).toBe(0); // STRICTLY BLOCKED
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 5 — FINGERPRINT CHANGE
  // Same canonical offer, different fingerprint.
  // EXPECTED: NOT eligible.
  // ─────────────────────────────────────────────────────────────
  it('TEST 5: Fingerprint Change — Mutable fingerprint change does NOT bypass 20-day cooldown', () => {
    const offerA = makeOffer('chatgpt_fp_1', {
      providerId: 'chatgpt',
      sourceUrl: 'https://openai.com/pricing',
      title: 'ChatGPT Plus Annual Plan',
      fingerprint: 'fp_hash_version_1',
    });

    const offerB = makeOffer('chatgpt_fp_2', {
      providerId: 'chatgpt',
      sourceUrl: 'https://openai.com/pricing',
      title: 'ChatGPT Plus Annual Plan',
      fingerprint: 'fp_hash_version_2_recalculated',
    });

    const keyA = buildCanonicalOfferKey(offerA);
    const keyB = buildCanonicalOfferKey(offerB);
    expect(keyA).toBe(keyB);

    const sentDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // Sent 8 days ago
    const selected = selectDailyOffersForUser([offerB], {
      canonicalKeyLastSentDate: new Map([[keyA, sentDate]]),
    });

    expect(selected.length).toBe(0); // STRICTLY BLOCKED
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6 — GENUINELY NEW OFFER
  // Same provider, different commercial offer with distinct canonical identity.
  // EXPECTED: eligible.
  // ─────────────────────────────────────────────────────────────
  it('TEST 6: Genuinely New Offer — Different commercial plan from same provider remains eligible', () => {
    const proOffer = makeOffer('claude_pro', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Pro Annual',
      category: 'annual',
      offerSubtype: 'ANNUAL_DISCOUNT',
    });

    const eduOffer = makeOffer('claude_edu', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Education Campus Plan',
      category: 'student',
      offerSubtype: 'STUDENT_DISCOUNT',
    });

    const proKey = buildCanonicalOfferKey(proOffer);
    const eduKey = buildCanonicalOfferKey(eduOffer);
    expect(proKey).not.toBe(eduKey);

    // User received proOffer 2 days ago
    const sentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const selected = selectDailyOffersForUser([proOffer, eduOffer], {
      canonicalKeyLastSentDate: new Map([[proKey, sentDate]]),
    });

    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('Claude Education Campus Plan');
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 7 — RECOVERY
  // Offer delivered 7 days ago -> BLOCKED.
  // Offer delivered 19 days ago -> BLOCKED.
  // Offer delivered 20+ days ago -> eligible if still active and verified.
  // ─────────────────────────────────────────────────────────────
  it('TEST 7: Recovery — Resurfacing allowed ONLY after 20 full days (not 7 or 19 days)', () => {
    const offer7d = makeOffer('rec_7d', {
      providerId: 'cursor',
      sourceUrl: 'https://cursor.com/pricing',
      title: 'Cursor Pro Annual Plan',
    });
    const offer19d = makeOffer('rec_19d', {
      providerId: 'perplexity',
      sourceUrl: 'https://perplexity.ai/pricing',
      title: 'Perplexity Pro Annual Plan',
    });
    const offer21d = makeOffer('rec_21d', {
      providerId: 'windsurf',
      sourceUrl: 'https://codeium.com/pricing',
      title: 'Windsurf Pro Annual Plan',
    });

    const key7 = buildCanonicalOfferKey(offer7d);
    const key19 = buildCanonicalOfferKey(offer19d);
    const key21 = buildCanonicalOfferKey(offer21d);

    const now = Date.now();
    const sentMap = new Map<string, Date>([
      [key7, new Date(now - 7 * 24 * 60 * 60 * 1000)],   // 7 days ago
      [key19, new Date(now - 19 * 24 * 60 * 60 * 1000)], // 19 days ago
      [key21, new Date(now - 21 * 24 * 60 * 60 * 1000)], // 21 days ago (>= 20 days)
    ]);

    const selected = selectDailyOffersForUser([offer7d, offer19d, offer21d], {
      canonicalKeyLastSentDate: sentMap,
    });

    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('Windsurf Pro Annual Plan');
    expect(selected[0].isMissed).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 8 — FEWER THAN FIVE
  // Only 2 eligible offers -> send exactly 2.
  // ─────────────────────────────────────────────────────────────
  it('TEST 8: Fewer than 5 — Selects exactly the number of available eligible offers without padding', () => {
    const offers = [
      makeOffer('few_1', { providerId: 'claude', sourceUrl: 'https://claude.com/pricing', title: 'Claude Deal 1' }),
      makeOffer('few_2', { providerId: 'gemini', sourceUrl: 'https://gemini.google.com/pricing', title: 'Gemini Deal 2' }),
    ];

    const selected = selectDailyOffersForUser(offers, {
      recentWindowKeys: new Set(),
      canonicalKeyLastSentDate: new Map(),
    });

    expect(selected.length).toBe(2);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 9 — ZERO ELIGIBLE
  // No eligible offers -> returns empty array (suppresses email).
  // ─────────────────────────────────────────────────────────────
  it('TEST 9: Zero Eligible — Returns empty array when all offers are in 20-day cooldown', () => {
    const offer = makeOffer('only_offer', {
      providerId: 'chatgpt',
      sourceUrl: 'https://openai.com/pricing',
      title: 'ChatGPT Deal',
    });
    const key = buildCanonicalOfferKey(offer);

    const selected = selectDailyOffersForUser([offer], {
      recentWindowKeys: new Set([key]),
      canonicalKeyLastSentDate: new Map([[key, new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)]]),
    });

    expect(selected.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 10 — FAILED SEND
  // Email send fails -> do NOT record selected offers in deliveredOfferHistory.
  // ─────────────────────────────────────────────────────────────
  it('TEST 10: Failed Send — History is NOT updated if Resend email dispatch fails', async () => {
    const mockUser: any = {
      _id: 'user_failed_test_1',
      email: 'premium@example.com',
      name: 'Premium Tester',
      plan: 'PREMIUM',
      deliveredOfferHistory: [],
      recentDailyDigestHistory: [],
      sentOfferFingerprints: [],
      save: vi.fn(),
    };

    const mockOffer = makeOffer('mock_off_1', {
      title: 'Claude Developer Pro Deal',
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
    });

    // Mock Resend failure
    vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValueOnce({
      success: false,
      error: 'Resend API Rate Limit',
    });

    // Mock MongoDB finding public offer and user
    vi.spyOn(NotificationEventModel, 'find').mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve([mockOffer]),
      }),
    } as any);

    vi.spyOn(UserModel, 'updateMany').mockResolvedValue({} as any);
    vi.spyOn(UserModel, 'find').mockResolvedValue([mockUser] as any);
    vi.spyOn(UserModel, 'findOneAndUpdate').mockResolvedValue(mockUser as any);
    const updateSpy = vi.spyOn(UserModel, 'findByIdAndUpdate').mockResolvedValue({} as any);
    vi.spyOn(SubscriptionModel, 'findOne').mockReturnValue({
      sort: () => Promise.resolve({ status: 'active' }),
    } as any);

    const stats = await triggerDailyOfferDigest();

    expect(stats.errors).toBe(1);
    expect(stats.sent).toBe(0);

    // Verify deliveredOfferHistory was NOT updated with delivered items
    const updateCallWithHistory = updateSpy.mock.calls.find((call) => {
      const updateDoc = call[1] as any;
      return updateDoc?.$set?.deliveredOfferHistory && updateDoc.$set.deliveredOfferHistory.length > 0;
    });
    expect(updateCallWithHistory).toBeUndefined();

    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 11 — PER-USER ISOLATION
  // User A received Offer X. User B has not.
  // EXPECTED: User B can receive X.
  // ─────────────────────────────────────────────────────────────
  it('TEST 11: Per-User Isolation — Offer delivery to User A does NOT block User B', () => {
    const offerX = makeOffer('shared_x', {
      providerId: 'gemini',
      sourceUrl: 'https://gemini.google.com/pricing',
      title: 'Gemini Special Deal X',
    });
    const keyX = buildCanonicalOfferKey(offerX);

    const userAHistory = new Set([keyX]);
    const userBHistory = new Set<string>();

    const selectedA = selectDailyOffersForUser([offerX], {
      recentWindowKeys: userAHistory,
      canonicalKeyLastSentDate: new Map([[keyX, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)]]),
    });

    const selectedB = selectDailyOffersForUser([offerX], {
      recentWindowKeys: userBHistory,
      canonicalKeyLastSentDate: new Map(),
    });

    expect(selectedA.length).toBe(0); // User A is blocked
    expect(selectedB.length).toBe(1); // User B is eligible!
    expect(selectedB[0].title).toBe('Gemini Special Deal X');
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 12 — CONCURRENT EXECUTION
  // Two digest triggers run simultaneously.
  // EXPECTED: Concurrency claim guard ensures same user is not processed twice.
  // ─────────────────────────────────────────────────────────────
  it('TEST 12: Concurrent Execution — Concurrency claim lock prevents double processing', async () => {
    const mockUser: any = {
      _id: 'user_concurrent_1',
      email: 'concurrent@example.com',
      name: 'Concurrent Tester',
      plan: 'PREMIUM',
      deliveredOfferHistory: [],
    };

    const mockOffer = makeOffer('conc_off_1', {
      title: 'Claude Enterprise AI Deal',
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
    });

    vi.spyOn(NotificationEventModel, 'find').mockReturnValue({
      sort: () => ({
        lean: () => Promise.resolve([mockOffer]),
      }),
    } as any);

    vi.spyOn(UserModel, 'updateMany').mockResolvedValue({} as any);
    vi.spyOn(UserModel, 'find').mockResolvedValue([mockUser] as any);

    // First findOneAndUpdate succeeds in acquiring lock, second returns null (already claimed)
    let claimCount = 0;
    vi.spyOn(UserModel, 'findOneAndUpdate').mockImplementation(async () => {
      claimCount++;
      if (claimCount === 1) {
        return mockUser;
      }
      return null; // Lock failed
    });

    vi.spyOn(emailService, 'sendOfferDigestEmail').mockResolvedValue({
      success: true,
      messageId: 'msg_conc_1',
    });

    vi.spyOn(UserModel, 'findByIdAndUpdate').mockResolvedValue({} as any);
    vi.spyOn(SubscriptionModel, 'findOne').mockReturnValue({
      sort: () => Promise.resolve({ status: 'active' }),
    } as any);

    const [run1, run2] = await Promise.all([
      triggerDailyOfferDigest(),
      triggerDailyOfferDigest(),
    ]);

    // One run should process and send, the other should skip due to active claim lock
    expect(run1.sent + run2.sent).toBe(1);
    expect(run1.skipped + run2.skipped).toBe(1);

    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 13 — TEN-CYCLE SIMULATION ACROSS 20 DAYS
  // Simulate at least 10 digest cycles across 20 days.
  // EXPECTED: No canonical offer appears twice within any 20-day window.
  // ─────────────────────────────────────────────────────────────
  it('TEST 13: Ten-Cycle Simulation — 10 digest cycles across 20 days with zero duplication', () => {
    const PLAN_NAMES = [
      'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
      'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
      'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron',
      'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
      'Phi', 'Chi', 'Psi', 'Omega', 'Prime',
      'Apex', 'Vertex', 'Nexus', 'Vanguard', 'Pinnacle',
      'Summit', 'Zenith', 'Horizon', 'Frontier', 'Catalyst',
      'Pulse', 'Vector', 'Orbit', 'Nova', 'Cosmos',
      'Matrix', 'Sol', 'Quantum', 'Hyper', 'Flux',
      'Synergy', 'Vortex', 'Starlight', 'Spectra', 'Aurora',
      'Titan', 'Atlas', 'Aero', 'Zephyr', 'Orion',
      'Eclipse', 'Polaris', 'Phoenix', 'Beacon', 'Sovereign'
    ];

    // 10 cycles * 5 offers = 50 distinct offers available
    const pool = Array.from({ length: 60 }, (_, i) => {
      const p = PROVIDERS[i % PROVIDERS.length];
      const planName = PLAN_NAMES[i % PLAN_NAMES.length];
      return makeOffer(`sim_${i}`, {
        providerId: p.id,
        providerName: p.name,
        sourceUrl: p.url,
        title: `${p.name} Commercial Tier ${planName}`,
        category: 'annual',
        offerSubtype: 'ANNUAL_DISCOUNT',
      });
    });

    const deliveredHistory: Array<{ canonicalOfferKey: string; deliveredAt: Date }> = [];
    const baseDate = new Date('2026-09-01T08:00:00Z');

    for (let cycle = 0; cycle < 10; cycle++) {
      const cycleDate = new Date(baseDate.getTime() + cycle * 2 * 24 * 60 * 60 * 1000); // Every 2 days
      vi.setSystemTime(cycleDate);

      const recentWindowKeys = new Set<string>();
      const canonicalKeyLastSentDate = new Map<string, Date>();

      for (const entry of deliveredHistory) {
        const elapsed = cycleDate.getTime() - entry.deliveredAt.getTime();
        if (elapsed < TWENTY_DAYS_MS) {
          recentWindowKeys.add(entry.canonicalOfferKey);
        }
        if (!canonicalKeyLastSentDate.has(entry.canonicalOfferKey) || entry.deliveredAt > canonicalKeyLastSentDate.get(entry.canonicalOfferKey)!) {
          canonicalKeyLastSentDate.set(entry.canonicalOfferKey, entry.deliveredAt);
        }
      }

      const selected = selectDailyOffersForUser(pool, {
        recentWindowKeys,
        canonicalKeyLastSentDate,
      });

      expect(selected.length).toBe(5);

      // Verify that NONE of the selected offers were delivered in the prior 20 days
      for (const item of selected) {
        const matched = pool.find((o) => o.title === item.title)!;
        const key = buildCanonicalOfferKey(matched);
        expect(recentWindowKeys.has(key)).toBe(false);

        deliveredHistory.push({
          canonicalOfferKey: key,
          deliveredAt: cycleDate,
        });
      }
    }

    // Exactly 50 unique offers delivered over 10 cycles (5 each cycle)
    const uniqueKeys = new Set(deliveredHistory.map((d) => d.canonicalOfferKey));
    expect(uniqueKeys.size).toBe(50);
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 14 — POST-20-DAY RESURFACING
  // Offer sent Day 1. At Day 21: EXPECTED: eligible again if active and verified.
  // ─────────────────────────────────────────────────────────────
  it('TEST 14: Post-20-Day Resurfacing — Offer sent Day 1 becomes eligible again at Day 21 with Still Available badge', () => {
    const offer = makeOffer('resurface_day21', {
      providerId: 'claude',
      sourceUrl: 'https://claude.com/pricing',
      title: 'Claude Pro Annual Savings Plan',
    });
    const key = buildCanonicalOfferKey(offer);

    const day1Date = new Date('2026-09-01T08:00:00Z');
    const day21Date = new Date('2026-09-22T08:00:00Z'); // 21 days later

    vi.setSystemTime(day21Date);

    const selected = selectDailyOffersForUser([offer], {
      recentWindowKeys: new Set(), // >20 days so not in rolling window
      longTermSentKeys: new Set([key]),
      canonicalKeyLastSentDate: new Map([[key, day1Date]]),
    });

    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('Claude Pro Annual Savings Plan');
    expect(selected[0].isMissed).toBe(true); // Tagged with "Still available" recovery badge

    vi.useRealTimers();
  });
});
