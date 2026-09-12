import { createHash } from 'crypto';
import { extractRootDomain, isAllowlistedPartnerDomain } from './partnerSourceRegistry';
import { getProviderSource } from './sourceRegistry';
import type { NormalizedOffer, SyncStatus } from './types';

export interface OfferTrustContext {
  providerStatus: SyncStatus;
  // Note: Other fields (checkedAt, extractorVersion, verifiedSourceUrls) are available in context
  // but no longer used for publication-blocking gates. Kept for audit/debugging only.
}

export function isRegisteredOfficialSource(providerId: string, sourceUrl: string): boolean {
  if (!sourceUrl) return false;
  if (isAllowlistedPartnerDomain(sourceUrl)) return true;
  const config = getProviderSource(providerId);
  if (!config) return false;

  const allowedUrls = [
    config.pricingUrl,
    config.offersUrl,
    config.promotionUrl,
    config.educationUrl,
    config.startupUrl,
    config.apiPromotionsUrl,
    config.partnerUrl,
    ...(config.secondaryOfferUrls || []).map((source) => source.url),
  ].filter((url): url is string => Boolean(url));

  const targetHost = extractRootDomain(sourceUrl);
  if (!targetHost) return false;

  for (const allowed of allowedUrls) {
    const allowedHost = extractRootDomain(allowed);
    if (allowedHost && (targetHost === allowedHost || targetHost.endsWith(`.${allowedHost}`))) {
      return true;
    }
  }

  return false;
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

export interface OfferPublicationCheckInput {
  providerId: string;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  providerOfficialUrl?: string | null;
  evidenceText?: string | null;
  detectionMethod?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  isPartnerOffer?: boolean | null;
  partner?: string | null;
  partnerType?: string | null;
  detectedAt?: Date | null;
}

/**
 * Strict Publication Gate for Public Offers & Partner AI Offers.
 *
 * An offer may appear publicly ONLY IF:
 *   1. Official source exists & matches registered provider/partner domain
 *   2. Extracted content contains sufficient evidence (>=20 chars)
 *   3. Offer status is ACTIVE and isActive !== false
 *   4. Commercial Partner Bundle validation passes
 */
export function canPublishOffer(offer: OfferPublicationCheckInput): boolean {
  const sourceUrl = offer.sourceUrl || offer.officialSourceUrl;
  if (!sourceUrl) return false;

  // 1. Official source verification
  const hasOfficialSource = isRegisteredOfficialSource(offer.providerId, sourceUrl);
  if (!hasOfficialSource) return false;

  // 2. Meaningful extracted evidence (>=20 characters)
  const evidence = offer.evidenceText?.trim();
  if (!evidence || evidence.length < 20) return false;

  // 3. Status must be ACTIVE and isActive !== false
  if (offer.status && offer.status !== 'ACTIVE') return false;
  if (offer.isActive === false) return false;

  // 4. Commercial Partner Bundle check if partner is specified
  if (offer.isPartnerOffer === true || Boolean(offer.partner)) {
    if (!offer.partner || offer.partner.trim().length === 0) return false;
  }

  return true;
}

export function isPubliclyVerifiablePartnerOffer(
  offer: OfferPublicationCheckInput
): boolean {
  return canPublishOffer(offer);
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

