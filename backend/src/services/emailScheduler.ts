// ============================================================
// Email Scheduler — StackSave AI Audit
// Scheduled Daily Premium AI Offers Digest
// Production-Hardened with External Cron & Offer-Level Dedup
// ============================================================

import { UserModel, NotificationEventModel, SubscriptionModel } from './dbService';
import { isPremiumUser } from './billingService';
import { sendOfferDigestEmail, OfferDigestItem } from './emailService';

let schedulerTimeout: NodeJS.Timeout | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Calculates milliseconds from now until the target UTC hour:minute.
 * If the target time has already passed today, schedules for tomorrow.
 */
export function getMsUntilNextExecution(targetHourUtc = 9, targetMinuteUtc = 0): number {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    targetHourUtc,
    targetMinuteUtc,
    0,
    0
  ));

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Executes the daily digest dispatch for all eligible Premium users.
 * - Checks authoritative entitlement via isPremiumUser()
 * - Deduplicates offers per-user using persistent fingerprints
 * - Skips sending if no meaningful new or updated offers exist
 * - Updates lastOfferDigestAt ONLY on successful Resend delivery
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
      .limit(30)
      .lean();

    if (!rawOffers || rawOffers.length === 0) {
      console.log('[EmailScheduler] ℹ️ No active verified offers found in database. Skipping digest dispatch.');
      return stats;
    }

    // 2. Query potential candidate Premium users
    const candidateUsers = await UserModel.find({
      plan: 'PREMIUM',
    });

    stats.attempted = candidateUsers.length;
    console.log(`[EmailScheduler] Found ${candidateUsers.length} candidate Premium user(s).`);

    const TWENTY_HOURS_MS = 20 * 60 * 60 * 1000;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const now = Date.now();

    const BATCH_SIZE = Math.max(1, parseInt(process.env.PREMIUM_DIGEST_BATCH_SIZE || '10', 10));

    // Process users in rate-limited batches
    for (let i = 0; i < candidateUsers.length; i += BATCH_SIZE) {
      const batch = candidateUsers.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (user) => {
          try {
            // Check opt-out preference
            if (user.emailPreferences && user.emailPreferences.premiumOfferDigest === false) {
              stats.skipped++;
              return;
            }

            // Check deduplication gap (< 20 hours)
            if (user.lastOfferDigestAt) {
              const timeSinceLast = now - new Date(user.lastOfferDigestAt).getTime();
              if (timeSinceLast < TWENTY_HOURS_MS) {
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

            // Offer-Level Deduplication: Filter out offers already received by this user
            const sentFPs = new Set(user.sentOfferFingerprints || []);
            const userUnreadOffers = rawOffers.filter((o) => o.fingerprint && !sentFPs.has(o.fingerprint));

            // Empty Digest Rule: If there are no meaningful new/updated offers for this user, do not send
            if (userUnreadOffers.length === 0) {
              stats.skipped++;
              return;
            }

            // Select top unread offers (up to 6)
            const topOffers = userUnreadOffers.slice(0, 6);
            const offerItems: OfferDigestItem[] = topOffers.map((o) => {
              const isNew = o.detectedAt ? new Date(o.detectedAt) >= oneDayAgo : false;
              return {
                title: o.title,
                description: o.description,
                discount: o.discount,
                category: o.category,
                provider: o.providerName || o.providerId,
                partner: o.partner,
                url: o.sourceUrl,
                expiresAt: o.expiresAt,
                isNew,
                value: o.value,
              };
            });

            // Dispatch email via Resend
            const result = await sendOfferDigestEmail({
              email: user.email,
              name: user.name,
              userId: user._id.toString(),
              offers: offerItems,
            });

            // Only update DB when delivery was accepted by Resend
            if (result.success) {
              const deliveredFingerprints = topOffers
                .map((o) => o.fingerprint)
                .filter(Boolean) as string[];

              const mergedFingerprints = Array.from(
                new Set([...(user.sentOfferFingerprints || []), ...deliveredFingerprints])
              ).slice(-200); // retain last 200 fingerprints for storage bounds

              await UserModel.findByIdAndUpdate(user._id, {
                lastOfferDigestAt: new Date(),
                sentOfferFingerprints: mergedFingerprints,
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
        await new Promise((resolve) => setTimeout(resolve, 300));
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

/**
 * Starts the in-process timer if enabled.
 */
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
    }, 24 * 60 * 60 * 1000);
  }, msUntilNext);
}

/**
 * Stops any active timer.
 */
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
