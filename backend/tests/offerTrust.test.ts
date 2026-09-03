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
  checkedAt,
  extractorVersion: 'test-runner',
  verifiedSourceUrls: new Set(['https://openai.com/startups']),
};

describe('offer trust boundary', () => {
  it('rejects missing source status', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceStatus: undefined }), context)).toBe(false);
  });

  it('rejects missing evidence even after an HTTP-successful provider check', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ evidenceText: undefined }), context)).toBe(false);
  });

  it('rejects evidence that does not contain the commercial claim', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ evidenceText: 'OpenAI offers a startup program.' }), context)).toBe(false);
  });

  it('rejects provider/source mismatches', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceUrl: 'https://example.com/openai-startups' }), context)).toBe(false);
  });

  it('rejects an approved provider URL that did not succeed in this sync', () => {
    expect(isPubliclyVerifiableOffer(makeOffer({ sourceUrl: 'https://openai.com/api/pricing' }), context)).toBe(false);
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
