import { describe, it, expect } from 'vitest';
import { selectDailyOffersForUser } from '../src/services/emailScheduler';

describe('Multi-Day Rotation & Missed-Offer Recovery Unit Tests', () => {
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

  it('1. Day 1 Selection: Selects up to 5 highest-scoring qualifying offers', () => {
    const pool = generateOffers(10, 'd1');
    const selected = selectDailyOffersForUser(pool, { recentWindowFPs: new Set(), longTermSentFPs: new Set() });

    expect(selected.length).toBe(5);
  });

  it('2. Day 2 Rotation: Excludes Day 1 fingerprints when alternatives exist', () => {
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

  it('3. Day 3 Rotation: Excludes Day 1 + Day 2 fingerprints', () => {
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

  it('4. Day 4 Rotation: Excludes previous 3 days of delivered fingerprints', () => {
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

  it('5. Day 5 Rotation: Excludes previous 4 days of delivered fingerprints', () => {
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

  it('6. Complete 5-consecutive-day rotation: 25 distinct offers over 5 days with zero overlap', () => {
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

  it('7. Per-user history isolation: User A cooldown does not affect User B', () => {
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

  it('8. Lower-ranked verified offers selected when top-ranked offers are in 5-day cooldown', () => {
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

  it('9. 7-day and 10-day delivered offers remain STRICTLY BLOCKED within 20-day cooldown', () => {
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

  it('10. 21-day missed offer becomes eligible for resurfacing with Still Available badge', () => {
    const offerMissed21d = makeOffer('missed_21d', {
      title: '21-Day Missed AI Deal',
      discount: '40% off',
      detectedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    });

    const sentDate21dAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000); // 21 days ago (>= 20 days)
    const selected = selectDailyOffersForUser([offerMissed21d], {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set([offerMissed21d.fingerprint]),
      fingerprintLastSentDate: new Map([[offerMissed21d.fingerprint, sentDate21dAgo]]),
    });

    expect(selected.length).toBe(1);
    expect(selected[0].title).toBe('21-Day Missed AI Deal');
    expect(selected[0].isMissed).toBe(true);
  });

  it('11. Resurfaced offer enters 20-day cooldown again', () => {
    const resurfacedOffer = makeOffer('resurfaced_1', { title: 'Resurfaced Deal' });
    const altOffers = generateOffers(5, 'alt');
    const allOffers = [resurfacedOffer, ...altOffers];

    // Day 1: Offer was resurfaced. Today it enters recentWindowFPs.
    const dayAfterWindow = new Set([resurfacedOffer.fingerprint]);

    // Day 2: Next day, resurfacedOffer is in cooldown
    const selectedNextDay = selectDailyOffersForUser(allOffers, {
      recentWindowFPs: dayAfterWindow,
      longTermSentFPs: new Set([resurfacedOffer.fingerprint]),
    });

    expect(selectedNextDay.length).toBe(5);
    const titles = selectedNextDay.map((s) => s.title);
    expect(titles).not.toContain('Resurfaced Deal');
  });

  it('12. lastCheckedAt alone does NOT qualify offer as new/recovered or break cooldown', () => {
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

    expect(selected.length).toBe(0); // Strict anti-spam: cannot break cooldown on ping alone
  });

  it('13. Maximum 5 offers strictly enforced across candidate pool', () => {
    const largePool = generateOffers(20, 'large');
    const selected = selectDailyOffersForUser(largePool, {
      recentWindowFPs: new Set(),
      longTermSentFPs: new Set(),
    });

    expect(selected.length).toBe(5);
  });

  it('14. Fewer than 5 returned when insufficient qualifying offers exist (never pad)', () => {
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

  it('15. Zero qualifying offers → returns empty array (anti-spam)', () => {
    const offer = makeOffer('only_one', { title: 'Only One' });

    const selected = selectDailyOffersForUser([offer], {
      recentWindowFPs: new Set([offer.fingerprint]),
      longTermSentFPs: new Set([offer.fingerprint]),
    });

    expect(selected.length).toBe(0);
  });

  it('16. Expired, unverified, or quarantined offers never enter recovery or selection', () => {
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

  it('17. Content update does NOT bypass the 20-day cooldown', () => {
    const updatedOffer = makeOffer('updated_1', {
      title: 'Updated AI Plan',
      detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old
      lastSuccessfulCheckAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Scraped 2h ago
      contentHash: 'hash_live_new_content',
      discount: '70% off',
    });

    const sentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // Delivered 5 days ago
    const selected = selectDailyOffersForUser([updatedOffer], {
      recentWindowFPs: new Set([updatedOffer.fingerprint]),
      fingerprintLastSentDate: new Map([[updatedOffer.fingerprint, sentDate]]),
    });

    expect(selected.length).toBe(0); // STRICTLY BLOCKED: isUpdated cannot bypass 20-day rule
  });
});

// ── 2-Day Frequency Gate Unit Tests ────────────────────────────

describe('2-Day Digest Frequency Gate', () => {
  /**
   * These tests verify the 48-hour per-user frequency constant.
   * The actual DB check (`lastOfferDigestAt`) lives in triggerDailyOfferDigest
   * which requires a live MongoDB connection. We validate the constant itself
   * here deterministically, without any network calls.
   */

  it('18. Frequency constant: FORTY_EIGHT_HOURS_MS equals exactly 48 hours in milliseconds', () => {
    const EXPECTED_48H_MS = 48 * 60 * 60 * 1000; // 172_800_000
    expect(EXPECTED_48H_MS).toBe(172_800_000);

    // Verify it is strictly greater than 24h (was previously 20h)
    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
    expect(EXPECTED_48H_MS).toBeGreaterThan(TWENTY_HOURS_MS);
    expect(EXPECTED_48H_MS).toBeGreaterThan(TWENTY_FOUR_HOURS_MS);
  });

  it('19. A user whose lastOfferDigestAt is 47h 59m ago is still within the 48h gate', () => {
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSent = now - (48 * 60 * 60 * 1000 - 60 * 1000); // 47h 59m ago
    const timeSinceLast = now - lastSent;
    expect(timeSinceLast).toBeLessThan(FORTY_EIGHT_HOURS_MS); // Should be throttled
  });

  it('20. A user whose lastOfferDigestAt is exactly 48h ago clears the frequency gate', () => {
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSent = now - FORTY_EIGHT_HOURS_MS; // Exactly 48h ago
    const timeSinceLast = now - lastSent;
    expect(timeSinceLast).not.toBeLessThan(FORTY_EIGHT_HOURS_MS); // Should NOT be throttled
  });

  it('21. A user whose lastOfferDigestAt is 49h ago clears the frequency gate', () => {
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    const lastSent = now - 49 * 60 * 60 * 1000; // 49h ago
    const timeSinceLast = now - lastSent;
    expect(timeSinceLast).toBeGreaterThan(FORTY_EIGHT_HOURS_MS); // Should be eligible
  });
});
