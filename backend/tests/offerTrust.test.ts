import { describe, expect, it } from 'vitest';
import {
  buildCanonicalOfferFingerprint,
  isPubliclyVerifiableOffer,
} from '../src/pricing/offerTrust';
import type { NormalizedOffer } from '../src/pricing/types';

const checkedAt = new Date('2026-09-03T10:00:00.000Z');

function makeOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    providerId: 'openai-api',
    title: 'OpenAI Startup Credits',
    description: 'Eligible startups receive $5,000 in API credits.',
    discount: '$5,000 Credits',
    eligibility: 'Eligible Startups',
    fingerprint: 'legacy-fingerprint',
    sourceUrl: 'https://openai.com/startups',
    sourceStatus: 'VERIFIED',
    evidenceText: 'Eligible startups receive $5,000 in API credits.',
    detectedAt: checkedAt,
    ...overrides,
  };
}

const context = {
  providerStatus: 'VERIFIED' as const,
  // Note: checkedAt, extractorVersion, verifiedSourceUrls are no longer used for publication gates
  // They are kept in context for audit/debugging only
};

describe('offer trust boundary', () => {
  it('accepts offer even if source status is missing (audit metadata only)', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceStatus: undefined }), context)).toBe(true);
  });

  it('rejects missing evidence even after an HTTP-successful provider check', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ evidenceText: undefined }), context)).toBe(false);
  });

  it('accepts evidence even without exact commercial claim match (audit metadata only)', () => {
    // Per new architecture: evidence must exist and be meaningful (20+ chars)
    // but does not need to contain every commercial claim extracted from title/description/discount
    expect(isPubliclyVerifiableOffer(makeOffer({ evidenceText: 'OpenAI offers a startup program.' }), context)).toBe(true);
  });

  it('rejects provider/source mismatches', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceUrl: 'https://example.com/openai-startups' }), context)).toBe(false);
  });

  it('accepts an approved provider URL from configured official source', () => {
    // Per new architecture: URL just needs to be in sourceRegistry
    // It does NOT need to be in verifiedSourceUrls (scanned this run)
    // That's audit metadata, not a publication requirement
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceUrl: 'https://openai.com/api/pricing' }), context)).toBe(true);
  });

  it('accepts an explicitly verified offer with matching official evidence', () => {
    expect(isPubliclyVerifiableOffer(makeOffer(), context)).toBe(true);
  });

  it.each([
    ['5,000', '10,000'],
    ['3 months', '1 month'],
    ['students', 'startups'],
    ['$20/month', '$25/month'],
  ])('changes fingerprint when commercial value changes: %s -> %s', (from, to) => {
    const before = makeOffer({
      title: `Offer ${from}`,
      description: `Official offer ${from}`,
      evidenceText: `Official offer ${from}`,
    });
    const after = makeOffer({
      title: `Offer ${to}`,
      description: `Official offer ${to}`,
      evidenceText: `Official offer ${to}`,
    });
    expect(buildCanonicalOfferFingerprint(before)).not.toBe(buildCanonicalOfferFingerprint(after));
  });

  it('does not verify Codex without current commercial evidence', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ providerId: 'codex', sourceUrl: 'https://openai.com/codex', evidenceText: undefined }), context)).toBe(false);
  });

  it('does not verify GitHub Models without current commercial evidence', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ providerId: 'github-models', sourceUrl: 'https://github.com/marketplace/models', evidenceText: undefined }), context)).toBe(false);
  });
});
