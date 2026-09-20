// ============================================================
// Email Scheduler — StackSave AI Audit
// Production Daily AI Savings Brief & Offer Selection Engine
// Deterministic Multi-Signal Ranking, Per-User Rotation & Anti-Spam
// ============================================================

import {
  UserModel,
  NotificationEventModel,
  SubscriptionModel,
  NotificationEventDocument,
  UserDocument,
} from './dbService';
import { isPremiumUser } from './billingService';
import {
  sendOfferDigestEmail,
  sendPremiumUpgradeEmail,
  getUpgradeEmailIntervalDays,
  PREMIUM_UPGRADE_EMAIL_INTERVALS_DAYS,
  OfferDigestItem,
} from './emailService';
export type { OfferDigestItem } from './emailService';
import { canPublishOffer } from '../pricing/offerTrust';
import { PlatformRankingEngine } from '../audit-engine/services/PlatformRankingEngine';

let schedulerTimeout: NodeJS.Timeout | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

// ── Offer Category Inference Helper ──────────────────────────

export function inferOfferCategory(
  e: any
): 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free' {
  if (e.category && ['partner', 'student', 'annual', 'api', 'trial', 'startup', 'free'].includes(e.category)) {
    return e.category;
  }

  const sub = ((e.offerSubtype || '') as string).toUpperCase();
  if (sub === 'STUDENT_DISCOUNT' || sub === 'ACADEMIC_FREE') return 'student';
  if (sub === 'STARTUP_GRANT') return 'startup';
  if (sub === 'API_DISCOUNT' || sub === 'API_RATE_DISCOUNT' || sub === 'API_CREDIT') return 'api';
  if (sub === 'ANNUAL_DISCOUNT') return 'annual';
  if (sub === 'PARTNER_BUNDLE') return 'partner';
  if (sub === 'FREE_TRIAL') return 'trial';
  if (sub === 'FREE_PLAN' || sub === 'PROMOTIONAL_FREE') return 'free';

  const pType = (e.partnerType || '').toLowerCase();
  const oType = (e.offerType || '').toUpperCase();
  const combined = `${e.title || ''} ${e.description || ''} ${e.eligibility || ''} ${oType}`.toLowerCase();

  // Student / Education
  if (
    pType === 'education' ||
    oType.includes('EDUCATION') ||
    combined.includes('student') ||
    combined.includes('educat') ||
    combined.includes('teacher') ||
    combined.includes('.edu')
  ) {
    return 'student';
  }
  // Startup Grants
  if (
    pType === 'cloud' ||
    oType.includes('STARTUP') ||
    oType === 'CLOUD_BUNDLE' ||
    combined.includes('startup') ||
    combined.includes('founder') ||
    combined.includes('accelerator')
  ) {
    return 'startup';
  }
  // API Discounts & Rate Credits
  if (
    combined.includes('prompt caching') ||
    combined.includes('off-peak') ||
    combined.includes('batch processing') ||
    combined.includes('message batches') ||
    combined.includes('api developer') ||
    combined.includes('api pricing') ||
    (e.title || '').toLowerCase().includes('api')
  ) {
    return 'api';
  }
  // Annual Savings
  if (combined.includes('annual') || combined.includes('billed annually')) {
    return 'annual';
  }
  // Commercial Partner Bundles
  if (
    e.isPartnerOffer ||
    (e.partner && ['telecom', 'devices', 'banking', 'broadband', 'credit_card', 'membership'].includes(pType))
  ) {
    return 'partner';
  }
  if (combined.includes('trial') || combined.includes('preview')) {
    return 'trial';
  }
  return 'free';
}

// ── Deterministic Offer Scoring Engine ────────────────────────

const OFFER_TYPE_WEIGHT: Record<string, number> = {
  partner: 1.00,  // Commercial partner bundles (highest value)
  startup: 0.90,  // Startup cloud credits
  student: 0.85,  // Student / academic perks
  api:     0.80,  // Developer API discounts & token caching
  free:    0.75,  // Promotional free tier upgrades
  annual:  0.70,  // Annual upfront billing savings
  trial:   0.65,  // Time-limited trials
};

const EVIDENCE_CONF: Record<string, number> = {
  PLAYWRIGHT_LIVE: 100,
  PLAYWRIGHT_DOM:  90,
  JSON_LD:         85,
  HTML_TABLE:      80,
  NEXTJS_EMBEDDED: 80,
  STATIC_BASELINE: 60,
};

const PARTNER_STRENGTH: Record<string, number> = {
  telecom:     100,
  broadband:   100,
  devices:     95,
  banking:     85,
  credit_card: 85,
  membership:  80,
};

/**
 * Computes pure offer opportunity value based on discount magnitude,
 * eligibility scope, partner strength, and verified evidence quality.
 */
export function computeOfferOpportunityScore(offer: any, category: string): number {
  const discountText = `${offer.discount || ''} ${offer.benefit || ''} ${offer.description || ''} ${offer.evidenceText || ''}`.toLowerCase();
  let offerValue = 50; // baseline

  if (
    discountText.includes('100%') ||
    discountText.includes('free for 18') ||
    discountText.includes('18 month') ||
    discountText.includes('free for 1 year') ||
    discountText.includes('12 month')
  ) {
    offerValue = 100;
  } else if (discountText.includes('90%') || discountText.includes('$1,000') || discountText.includes('$500')) {
    offerValue = 95;
  } else if (discountText.includes('75%') || discountText.includes('70%') || discountText.includes('6 month')) {
    offerValue = 90;
  } else if (discountText.includes('50%') || discountText.includes('half price') || discountText.includes('free 3 month')) {
    offerValue = 85;
  } else if (discountText.includes('free')) {
    offerValue = 80;
  } else if (discountText.includes('30%') || discountText.includes('25%')) {
    offerValue = 72;
  } else if (discountText.includes('20%') || discountText.includes('17%') || discountText.includes('15%')) {
    offerValue = 65;
  }

  if (category === 'partner') offerValue = Math.max(offerValue, 88);
  if (category === 'startup') offerValue = Math.max(offerValue, 80);
  if (category === 'student') offerValue = Math.max(offerValue, 75);

  // Freshness decay (3 points per day)
  const confirmedAt = offer.lastConfirmedAt ? new Date(offer.lastConfirmedAt) : new Date(offer.detectedAt || Date.now());
  const daysSince = Math.max(0, (Date.now() - confirmedAt.getTime()) / 86_400_000);
  const freshness = Math.max(0, 100 - Math.round(daysSince * 3));

  // Eligibility score: GLOBAL > Regional > Single Country
  let eligibilityScore = 100;
  if (offer.country && offer.country !== 'GLOBAL' && offer.country !== 'US') {
    eligibilityScore = 60;
  } else if (offer.region) {
    eligibilityScore = 80;
  }

  // Partner strength
  let partnerScore = 0;
  if (offer.partnerType) {
    partnerScore = PARTNER_STRENGTH[offer.partnerType.toLowerCase()] ?? 70;
  }

  // Evidence confidence
  const evidenceConf = EVIDENCE_CONF[offer.detectionMethod || 'PLAYWRIGHT_DOM'] ?? 70;

  const rawScore =
    offerValue * 0.40 +
    freshness * 0.25 +
    eligibilityScore * 0.20 +
    partnerScore * 0.10 +
    evidenceConf * 0.05;

  const typeWeight = OFFER_TYPE_WEIGHT[category] ?? 0.70;
  return Math.min(100, Math.round(rawScore * typeWeight));
}

/**
 * Computes deterministic daily selection score combining:
 * 1. Platform intelligence score (60%)
 * 2. Offer opportunity score (40%)
 * 3. Freshness & genuine update bonus (+15 for new today, +10 for updated today)
 */
export function computeDailyOfferSelectionScore(offer: any): {
  score: number;
  category: 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';
  platformScore: number;
  opportunityScore: number;
  isNew: boolean;
  isUpdated: boolean;
} {
  const category = inferOfferCategory(offer);
  const canonicalId = (offer.aiProvider || offer.providerId || '').toLowerCase().trim();
  const platformScore = PlatformRankingEngine.getScoreForProvider(canonicalId);
  const opportunityScore = computeOfferOpportunityScore(offer, category);

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const detectedAt = offer.detectedAt ? new Date(offer.detectedAt) : new Date();

  // Genuine newly discovered status: offer was first detected within the last 24 hours.
  const isNew = detectedAt >= oneDayAgo;

  // Genuine meaningfully updated status:
  // - The offer was NOT newly discovered today (detectedAt > 24h ago).
  // - Playwright actually re-extracted and re-hashed the content (lastSuccessfulCheckAt set recently
  //   AND contentHash is present, meaning live DOM content was scraped — not just a connectivity ping).
  // - A routine Playwright check that only refreshes lastCheckedAt (without re-extracting content)
  //   MUST NOT make the offer appear updated. lastCheckedAt is explicitly excluded.
  const lastSuccessfulCheckAt = offer.lastSuccessfulCheckAt
    ? new Date(offer.lastSuccessfulCheckAt)
    : null;
  const isUpdated =
    !isNew &&
    lastSuccessfulCheckAt !== null &&
    lastSuccessfulCheckAt >= oneDayAgo &&
    Boolean(offer.contentHash); // contentHash present = Playwright re-extracted actual content

  let score = Math.round(platformScore * 0.60 + opportunityScore * 0.40);

  if (isNew) {
    score += 15; // priority for newly discovered offers
  } else if (isUpdated) {
    score += 10; // priority for meaningfully updated offers
  }

  return {
    score,
    category,
    platformScore,
    opportunityScore,
    isNew,
    isUpdated,
  };
}

// ── Per-User Offer Selection & Diversity Engine ───────────────

export interface UserDigestContext {
  recentWindowFPs?: Set<string>;        // Fingerprints from last 5 daily digests (5-day rolling window)
  longTermSentFPs?: Set<string>;        // All-time sent fingerprints (cap 300)
  fingerprintLastSentDate?: Map<string, Date>; // Fingerprint -> Date when last sent
}

export interface ScoredOfferCandidate {
  offer: any;
  score: number;
  category: 'partner' | 'student' | 'annual' | 'api' | 'trial' | 'startup' | 'free';
  providerId: string;
  isNew: boolean;
  isUpdated: boolean;
  isMissed: boolean;
  tier: number; // 1 = New, 2 = Updated, 3 = Fresh Unread, 4 = Missed Recovery (7-10d), 5 = Other
}

/**
 * Deterministically selects UP TO 5 best offers for a given user using a 5-tier priority pipeline:
 * - Priority 1: Genuine newly discovered offers (last 24h) NOT in 5-day cooldown
 * - Priority 2: Meaningfully updated offers (re-scraped content in last 24h) NOT in 5-day cooldown
 * - Priority 3: Fresh unread verified active offers NOT in 5-day cooldown (score ranked)
 * - Priority 4: Missed-offer recovery (sent >= 7 days ago, NOT in 5-day cooldown, still active)
 * - Priority 5: Other verified active offers NOT in 5-day cooldown
 *
 * Rules:
 * - 5-consecutive-day rolling cooldown: Excludes offers delivered in the user's last 5 digests.
 * - Platform & Category diversity (max 2 per provider, max 2 per category in Pass 1, relaxed in Pass 2).
 * - Maximum 5 offers per email; fewer if insufficient qualifying offers exist; empty if 0 qualifying.
 * - Resurfaced offers get isMissed = true (renders as "Still available").
 */
export function selectDailyOffersForUser(
  candidateOffers: any[],
  contextOrSentFPs?: Set<string> | UserDigestContext
): OfferDigestItem[] {
  let recentWindowFPs = new Set<string>();
  let longTermSentFPs = new Set<string>();
  let fingerprintLastSentDate = new Map<string, Date>();

  if (contextOrSentFPs instanceof Set) {
    // Legacy / simple caller passing Set of sent fingerprints
    recentWindowFPs = contextOrSentFPs;
    longTermSentFPs = contextOrSentFPs;
  } else if (contextOrSentFPs && typeof contextOrSentFPs === 'object') {
    recentWindowFPs = contextOrSentFPs.recentWindowFPs || new Set<string>();
    longTermSentFPs = contextOrSentFPs.longTermSentFPs || new Set<string>();
    fingerprintLastSentDate = contextOrSentFPs.fingerprintLastSentDate || new Map<string, Date>();
  }

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // 1. Score and classify all valid candidate offers
  const candidates: ScoredOfferCandidate[] = [];

  for (const o of candidateOffers) {
    if (!o.fingerprint || !canPublishOffer(o)) {
      continue;
    }

    const fp = o.fingerprint;
    const { score, category, isNew, isUpdated } = computeDailyOfferSelectionScore(o);
    const providerId = (o.aiProvider || o.providerId || '').toLowerCase().trim();

    const in5DayWindow = recentWindowFPs.has(fp);
    const inLongTermSent = longTermSentFPs.has(fp);
    const lastSent = fingerprintLastSentDate.get(fp);

    // 7-10 Day Recovery detection:
    // Offer is eligible for missed-offer recovery if:
    // 1. It is NOT in the 5-consecutive-day cooldown window
    // 2. It is not new and not updated today
    // 3. Either lastSentDate is >= 7 days ago, OR it exists in longTermSentFPs while outside the 5-day window
    let isMissed = false;
    if (!in5DayWindow && !isNew && !isUpdated) {
      if (lastSent) {
        const daysAgoMs = now - lastSent.getTime();
        if (daysAgoMs >= SEVEN_DAYS_MS) {
          isMissed = true;
        }
      } else if (inLongTermSent) {
        isMissed = true;
      }
    }

    // 5-Day Rolling Cooldown:
    // If offer is in the 5-day window AND was NOT meaningfully updated today, it is strictly on cooldown
    if (in5DayWindow && !isNew && !isUpdated) {
      continue;
    }

    // Priority Tier assignment
    let tier = 3;
    if (isNew) {
      tier = 1;
    } else if (isUpdated) {
      tier = 2;
    } else if (isMissed) {
      tier = 4;
    } else {
      tier = 3;
    }

    candidates.push({
      offer: o,
      score,
      category,
      providerId,
      isNew,
      isUpdated,
      isMissed,
      tier,
    });
  }

  // 2. Anti-Spam: If no qualifying candidates exist, return empty
  if (candidates.length === 0) {
    return [];
  }

  // 3. Sort candidates deterministically: Tier ASC -> Score DESC -> Fingerprint ASC
  candidates.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.offer.fingerprint || '').localeCompare(b.offer.fingerprint || '');
  });

  // 4. Select up to 5 offers with Platform & Category Diversity
  const selected: ScoredOfferCandidate[] = [];
  const providerCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const remainingCandidates: ScoredOfferCandidate[] = [];

  // Pass 1: Diverse high-scoring selection (max 2 per provider, max 2 per category)
  for (const candidate of candidates) {
    if (selected.length >= 5) break;

    const pCount = providerCounts.get(candidate.providerId) || 0;
    const cCount = categoryCounts.get(candidate.category) || 0;

    if (pCount < 2 && cCount < 2) {
      selected.push(candidate);
      providerCounts.set(candidate.providerId, pCount + 1);
      categoryCounts.set(candidate.category, cCount + 1);
    } else {
      remainingCandidates.push(candidate);
    }
  }

  // Pass 2: If fewer than 5 selected and more candidates exist, relax diversity constraints
  if (selected.length < 5 && remainingCandidates.length > 0) {
    for (const candidate of remainingCandidates) {
      if (selected.length >= 5) break;
      selected.push(candidate);
    }
  }

  // Map to final OfferDigestItem format
  return selected.map(({ offer: o, isNew, isUpdated, isMissed, category }) => ({
    title: o.title,
    description: o.description,
    discount: o.discount,
    category,
    provider: o.providerName || o.providerId,
    partner: o.partner,
    url: o.sourceUrl,
    expiresAt: o.expiresAt,
    isNew,
    isUpdated,
    isMissed,
    value: o.value,
  }));
}

// ── Daily Digest Execution Routine ────────────────────────────

/**
 * Calculates milliseconds from now until the target UTC hour:minute.
 */
export function getMsUntilNextExecution(targetHourUtc = 9, targetMinuteUtc = 0): number {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      targetHourUtc,
      targetMinuteUtc,
      0,
      0
    )
  );

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Executes the bi-daily digest dispatch for all eligible Premium users.
 * - Fetches verified active offers once
 * - Personalizes selection per Premium user with 5-day rolling window & 7-10d recovery
 * - Enforces 48-hour gap throttling (digest sent at most once every 2 days per user)
 * - Suppresses empty emails when 0 qualifying offers exist
 * - Persists per-user delivery history (recentDailyDigestHistory + sentOfferFingerprints) on Resend success
 */
export async function triggerDailyOfferDigest(): Promise<{
  attempted: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  console.log('[EmailScheduler] 🚀 Starting daily AI offer digest run...');

  const stats = {
    attempted: 0,
    sent: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // 1. Fetch active verified public offers from MongoDB
    const rawOffers = await NotificationEventModel.find({
      eventType: 'NEW_OFFER',
      isActive: { $ne: false },
      isPublic: true,
    })
      .sort({ detectedAt: -1 })
      .lean();

    // Strict publication filter
    const publishableOffers = (rawOffers || []).filter((o) => canPublishOffer(o));

    if (publishableOffers.length === 0) {
      console.log('[EmailScheduler] ℹ️ No active verified offers found in database. Skipping digest dispatch.');
      return stats;
    }

    // 2. Query potential candidate Premium users
    const candidateUsers = await UserModel.find({
      plan: 'PREMIUM',
    });

    stats.attempted = candidateUsers.length;
    console.log(`[EmailScheduler] Found ${candidateUsers.length} candidate Premium user(s).`);

    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000; // Digest sent at most once every 2 days per user
    const now = Date.now();
    const BATCH_SIZE = Math.max(1, parseInt(process.env.PREMIUM_DIGEST_BATCH_SIZE || '10', 10));

    // 3. Process users in rate-limited batches
    for (let i = 0; i < candidateUsers.length; i += BATCH_SIZE) {
      const batch = candidateUsers.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user: UserDocument) => {
          try {
            // Check opt-out preference
            if (user.emailPreferences && user.emailPreferences.premiumOfferDigest === false) {
              stats.skipped++;
              return;
            }

            // Frequency gate: skip if < 48 hours since last digest (once every 2 days per user)
            if (user.lastOfferDigestAt) {
              const timeSinceLast = now - new Date(user.lastOfferDigestAt).getTime();
              if (timeSinceLast < FORTY_EIGHT_HOURS_MS) {
                stats.skipped++;
                return;
              }
            }

            // Authoritative Entitlement Check: Fetch latest subscription
            const sub = await SubscriptionModel.findOne({ userId: user._id }).sort({ createdAt: -1 });
            if (!isPremiumUser(user, sub)) {
              stats.skipped++;
              return;
            }

            // Deterministic per-user offer selection (up to 5 offers) with 5-day rolling window & 7-10d recovery
            const recentHistory = user.recentDailyDigestHistory || [];
            const recentWindowFPs = new Set<string>();
            const fingerprintLastSentDate = new Map<string, Date>();

            // Read last 5 entries from recentDailyDigestHistory
            for (const entry of recentHistory.slice(0, 5)) {
              const entryDate = entry.date ? new Date(entry.date) : new Date();
              for (const fp of entry.fingerprints || []) {
                recentWindowFPs.add(fp);
                if (!fingerprintLastSentDate.has(fp)) {
                  fingerprintLastSentDate.set(fp, entryDate);
                }
              }
            }

            const longTermSentFPs = new Set(user.sentOfferFingerprints || []);

            const selectedOfferItems = selectDailyOffersForUser(publishableOffers, {
              recentWindowFPs,
              longTermSentFPs,
              fingerprintLastSentDate,
            });

            // Anti-Spam: If no qualifying unread offers exist, do not send email
            if (selectedOfferItems.length === 0) {
              stats.skipped++;
              return;
            }

            // Dispatch personalized email via Resend
            const result = await sendOfferDigestEmail({
              email: user.email,
              name: user.name,
              userId: user._id.toString(),
              offers: selectedOfferItems,
            });

            // Only update MongoDB when delivery was accepted by Resend
            if (result.success) {
              // Find delivered offer fingerprints from publishableOffers
              const deliveredTitles = new Set(selectedOfferItems.map((item) => item.title));
              const deliveredFingerprints = publishableOffers
                .filter((o) => deliveredTitles.has(o.title) && o.fingerprint)
                .map((o) => o.fingerprint);

              const todayEntry = {
                date: new Date(),
                fingerprints: deliveredFingerprints,
              };

              const updatedRecentHistory = [
                todayEntry,
                ...(user.recentDailyDigestHistory || []),
              ].slice(0, 5); // Keep rolling window capped at 5 entries

              const mergedFingerprints = Array.from(
                new Set([...(user.sentOfferFingerprints || []), ...deliveredFingerprints])
              ).slice(-300); // Retain last 300 fingerprints for long-term recovery detection

              await UserModel.findByIdAndUpdate(user._id, {
                lastOfferDigestAt: new Date(),
                sentOfferFingerprints: mergedFingerprints,
                recentDailyDigestHistory: updatedRecentHistory,
              });
              stats.sent++;
            } else {
              console.warn(
                `[EmailScheduler] Resend delivery rejected for user ${user._id} (${user.email}): ${result.error || 'Unknown error'}`
              );
              stats.errors++;
            }
          } catch (userErr: unknown) {
            const errMsg = userErr instanceof Error ? userErr.message : String(userErr);
            console.error(`[EmailScheduler] Error processing digest for user ${user._id}: ${errMsg}`);
            stats.errors++;
          }
        })
      );

      // Brief delay between batches to respect rate limits
      if (i + BATCH_SIZE < candidateUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    console.log(
      `[EmailScheduler] ✅ Daily digest complete. Attempted: ${stats.attempted}, Sent: ${stats.sent}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailScheduler] Fatal error during daily offer digest run:', msg);
  }

  return stats;
}

// ── In-Process Scheduler Controls ─────────────────────────────

export function startEmailScheduler(): void {
  const inProcessEnabled = process.env.ENABLE_IN_PROCESS_EMAIL_SCHEDULER === 'true';
  if (!inProcessEnabled) {
    console.log(
      '[EmailScheduler] ℹ️ In-process email timer is dormant (digest is triggered via external cron / GitHub Actions / POST /api/internal/email/premium-digest).'
    );
    return;
  }

  const targetHour = parseInt(process.env.PREMIUM_OFFER_DIGEST_HOUR || '9', 10);
  const targetMinute = parseInt(process.env.PREMIUM_OFFER_DIGEST_MINUTE || '0', 10);

  const msUntilNext = getMsUntilNextExecution(targetHour, targetMinute);
  const nextDate = new Date(Date.now() + msUntilNext);

  console.log(
    `[EmailScheduler] 🕒 In-process scheduler active: Next digest at ${nextDate.toISOString()} (in ${Math.round(msUntilNext / 60000)}m)`
  );

  stopEmailScheduler();

  schedulerTimeout = setTimeout(() => {
    triggerDailyOfferDigest().catch((err) => {
      console.error('[EmailScheduler] Unhandled error in scheduled digest:', err);
    });

    schedulerInterval = setInterval(() => {
      triggerDailyOfferDigest().catch((err) => {
        console.error('[EmailScheduler] Unhandled error in recurring digest:', err);
      });
    }, 48 * 60 * 60 * 1000); // Fire in-process trigger every 48h (the per-user gate enforces 2-day spacing)
  }, msUntilNext);
}

export function stopEmailScheduler(): void {
  if (schedulerTimeout) {
    clearTimeout(schedulerTimeout);
    schedulerTimeout = null;
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// ── Free User Premium Upgrade Campaign ─────────────────────────

export interface UpgradeEligibilityResult {
  eligible: boolean;
  reason?: string;
  sequenceIndex: number;
  requiredIntervalDays: number;
  elapsedDays?: number;
}

/**
 * Pure helper function to determine if a Free user is eligible for an upgrade email
 * based on their per-user milestone sequence and opt-in status.
 */
export function isUserEligibleForUpgradeEmail(
  user: UserDocument | any,
  now: Date = new Date()
): UpgradeEligibilityResult {
  const sequenceIndex = user.premiumUpgradeEmailState?.sequenceIndex ?? 0;
  const requiredIntervalDays = getUpgradeEmailIntervalDays(sequenceIndex);

  // 1. Must be on the FREE plan
  if (user.plan && user.plan !== 'FREE') {
    return {
      eligible: false,
      reason: 'NOT_FREE_PLAN',
      sequenceIndex,
      requiredIntervalDays,
    };
  }

  // 2. Must have a valid registered email (no anonymous/guests)
  if (!user.email || typeof user.email !== 'string' || !user.email.includes('@')) {
    return {
      eligible: false,
      reason: 'INVALID_OR_MISSING_EMAIL',
      sequenceIndex,
      requiredIntervalDays,
    };
  }

  // 3. Must not have opted out of promotional upgrade emails
  if (user.emailPreferences && user.emailPreferences.premiumUpgradeEmails === false) {
    return {
      eligible: false,
      reason: 'OPTED_OUT',
      sequenceIndex,
      requiredIntervalDays,
    };
  }

  // 4. Cadence milestone evaluation
  const nowMs = now.getTime();
  let baseDate: Date;

  if (user.premiumUpgradeEmailState?.lastSentAt) {
    baseDate = new Date(user.premiumUpgradeEmailState.lastSentAt);
  } else if (user.createdAt) {
    baseDate = new Date(user.createdAt);
  } else {
    // If createdAt is missing, default to epoch so first email is eligible
    baseDate = new Date(0);
  }

  const elapsedMs = Math.max(0, nowMs - baseDate.getTime());
  const requiredMs = requiredIntervalDays * 24 * 60 * 60 * 1000;
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

  if (elapsedMs < requiredMs) {
    return {
      eligible: false,
      reason: 'INTERVAL_NOT_ELAPSED',
      sequenceIndex,
      requiredIntervalDays,
      elapsedDays,
    };
  }

  return {
    eligible: true,
    sequenceIndex,
    requiredIntervalDays,
    elapsedDays,
  };
}

export interface PremiumUpgradeCampaignStats {
  attempted: number;
  sent: number;
  skipped: number;
  errors: number;
}

export interface TriggerPremiumUpgradeCampaignOptions {
  now?: Date;
  batchSize?: number;
}

/**
 * Orchestrates the periodic StackSave Premium upgrade lifecycle campaign for Free users.
 * Follows a 10 -> 15 -> 10 day per-user milestone cadence.
 * Idempotent: Campaign state advances strictly upon verified Resend delivery acceptance.
 */
export async function triggerPremiumUpgradeCampaign(
  options: TriggerPremiumUpgradeCampaignOptions = {}
): Promise<PremiumUpgradeCampaignStats> {
  const stats: PremiumUpgradeCampaignStats = { attempted: 0, sent: 0, skipped: 0, errors: 0 };
  const executionTime = options.now || new Date();
  const batchSize = Math.max(1, options.batchSize || parseInt(process.env.PREMIUM_UPGRADE_BATCH_SIZE || '10', 10));

  console.log('[EmailScheduler] 🚀 Starting Premium Upgrade lifecycle email campaign for Free users...');

  try {
    // 1. Query candidate Free users with valid emails
    const candidateUsers = await UserModel.find({
      plan: 'FREE',
      email: { $exists: true, $ne: '' },
    }).sort({ createdAt: 1 });

    stats.attempted = candidateUsers.length;
    console.log(`[EmailScheduler] Found ${candidateUsers.length} candidate Free user(s) for upgrade evaluation.`);

    // 2. Process users in rate-limited batches
    for (let i = 0; i < candidateUsers.length; i += batchSize) {
      const batch = candidateUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user: UserDocument) => {
          try {
            // Check cadence eligibility
            const eligibility = isUserEligibleForUpgradeEmail(user, executionTime);
            if (!eligibility.eligible) {
              stats.skipped++;
              return;
            }

            // Authoritative Entitlement Check: Fetch latest subscription
            const sub = await SubscriptionModel.findOne({ userId: user._id }).sort({ createdAt: -1 });
            if (isPremiumUser(user, sub)) {
              // User has active Premium entitlement (e.g. upgraded recently) - skip immediately
              stats.skipped++;
              return;
            }

            // Dispatch personalized upgrade email
            const result = await sendPremiumUpgradeEmail({
              email: user.email,
              name: user.name,
              userId: user._id.toString(),
              sequenceIndex: eligibility.sequenceIndex,
            });

            // Idempotency: ONLY update campaign state upon confirmed Resend delivery
            if (result.success) {
              const nextSequenceIndex = eligibility.sequenceIndex + 1;
              await UserModel.findByIdAndUpdate(user._id, {
                'premiumUpgradeEmailState.lastSentAt': executionTime,
                'premiumUpgradeEmailState.sequenceIndex': nextSequenceIndex,
              });
              stats.sent++;
            } else {
              console.warn(
                `[EmailScheduler] Upgrade email delivery rejected for user ${user._id} (${user.email}): ${result.error || 'Unknown error'}`
              );
              stats.errors++;
            }
          } catch (userErr: unknown) {
            const errMsg = userErr instanceof Error ? userErr.message : String(userErr);
            console.error(`[EmailScheduler] Error processing upgrade email for user ${user._id}: ${errMsg}`);
            stats.errors++;
          }
        })
      );

      // Brief delay between batches to respect rate limits
      if (i + batchSize < candidateUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    console.log(
      `[EmailScheduler] ✅ Premium upgrade campaign complete. Attempted: ${stats.attempted}, Sent: ${stats.sent}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[EmailScheduler] Fatal error during upgrade campaign run:', msg);
  }

  return stats;
}
