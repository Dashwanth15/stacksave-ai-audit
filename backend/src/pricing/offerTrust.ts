import { createHash } from 'crypto';
import { getProviderSource } from './sourceRegistry';
import type { NormalizedOffer, SyncStatus } from './types';

export interface OfferTrustContext {
  providerStatus: SyncStatus;
  checkedAt: Date;
  extractorVersion: string;
  verifiedSourceUrls: ReadonlySet<string>;
}

function normalizeClaimText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function commercialClaims(offer: NormalizedOffer): string[] {
  const fields = [
    offer.title,
    offer.description,
    offer.discount,
    offer.duration,
    offer.eligibility,
  ].filter((value): value is string | number => value !== undefined && value !== null);
  const text = fields.join(' ');
  const claims = text.match(/\$\s?[\d,.]+(?:\s*[kKmM])?|¥\s?[\d,.]+|\b\d+(?:\.\d+)?\s*%|\b\d+\s+months?\b|\b\d+\s+days?\b|\b(?:student|startup|educator|teacher|nonprofit|credit|free|trial|annual|batch|cache)\w*/gi);
  return claims ? Array.from(new Set(claims.map(normalizeClaimText))) : [];
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
  const evidence = offer.evidenceText?.trim();
  if (context.providerStatus !== 'VERIFIED') return false;
  if (offer.sourceStatus !== 'VERIFIED') return false;
  if (!evidence || evidence.length < 20) return false;
  if (!isRegisteredOfficialSource(offer.providerId, offer.sourceUrl)) return false;
  if (!context.verifiedSourceUrls.has(offer.sourceUrl)) return false;
  if (!offer.detectedAt || !context.checkedAt || !context.extractorVersion) return false;

  const normalizedEvidence = normalizeClaimText(evidence);
  return commercialClaims(offer).every((claim) => normalizedEvidence.includes(claim));
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
