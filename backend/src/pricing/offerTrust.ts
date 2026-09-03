import { createHash } from 'crypto';
import { getProviderSource } from './sourceRegistry';
import type { NormalizedOffer, SyncStatus } from './types';

export interface OfferTrustContext {
  providerStatus: SyncStatus;
  // Note: Other fields (checkedAt, extractorVersion, verifiedSourceUrls) are available in context
  // but no longer used for publication-blocking gates. Kept for audit/debugging only.
}

export function isRegisteredOfficialSource(providerId: string, sourceUrl: string): boolean {
  const config = getProviderSource(providerId);
  if (!config || !sourceUrl) return false;
  const allowed = [
    config.pricingUrl,
    config.offersUrl,
    ...(config.secondaryOfferUrls || []).map((source) => source.url),
  ].filter((url): url is string => Boolean(url));
  return allowed.includes(sourceUrl);
}

export function isPubliclyVerifiableOffer(
  offer: NormalizedOffer,
  context: OfferTrustContext
): boolean {
  // SIMPLIFIED ARCHITECTURE:
  // Trust model: configured provider + official URL + successful Playwright extraction = PUBLIC
  // Do NOT require redundant verification ceremonies after successful extraction.

  const evidence = offer.evidenceText?.trim();

  // REQUIRED GATES (cannot be bypassed):
  // 1. Provider must be VERIFIED (configured AI platform exists)
  // 2. Offer must come from registered official source URL
  // 3. Meaningful evidence must be captured (proves extraction succeeded)
  // 4. Offer must have been detected (has timestamp)

  if (context.providerStatus !== 'VERIFIED') return false;
  if (!isRegisteredOfficialSource(offer.providerId, offer.sourceUrl)) return false;
  if (!evidence || evidence.length < 20) return false;
  if (!offer.detectedAt) return false;

  // AUDIT METADATA (stored in MongoDB but not used for publication gates):
  // - sourceStatus, verifiedSourceUrls: extraction run context
  // - checkedAt, extractorVersion: extraction metadata
  // - lastConfirmedAt, sourceFetchedAt, lastSuccessfulCheckAt: lifecycle tracking
  // These are preserved for auditing and debugging but do not block publication.

  return true;
}

export function hashOfferEvidence(evidenceText: string): string {
  return createHash('sha256').update(evidenceText.trim()).digest('hex');
}

export function buildCanonicalOfferFingerprint(offer: NormalizedOffer): string {
  return createHash('sha256').update(JSON.stringify([
    offer.providerId,
    offer.sourceUrl,
    offer.title,
    offer.description,
    offer.discount ?? null,
    offer.duration ?? null,
    offer.eligibility ?? null,
    offer.normalPrice ?? null,
    offer.promotionalPrice ?? null,
  ])).digest('hex').slice(0, 32);
}
